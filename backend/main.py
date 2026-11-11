import io
import os
import base64
from datetime import datetime
from typing import Optional

import cv2
import numpy as np
from PIL import Image as PILImage
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
import re
import secrets
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from model_utils import load_model, predict, murphy_yield, CLASSES
from nlp_utils import get_explanation, is_wafer_image_gemini, wafer_chat
from wafer_check import check_wafer
from database import get_db, init_db, User, PredictionHistory, AccessRequest
from mailer import send_mail, esc
import mail_templates as tpl
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_admin_user, create_action_token, read_action_token
)

app = FastAPI(title="Wafer Defect Detection API", version="2.0.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None

def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model

@app.on_event("startup")
def startup_event():
    init_db()
    try:
        get_model()
    except Exception as e:
        print(f"[startup] model preload failed: {e}")


# ── Schemas ────────────────────────────────────────────────────
class ExplainRequest(BaseModel):
    defect_type: str
    confidence:  float
    yield_pct:   float
    decision:    str

class DrawRequest(BaseModel):
    image_base64: str
    die_area:     float = 0.5

class YieldCurveRequest(BaseModel):
    defect_ratio: float
    die_areas:    Optional[list[float]] = None

class ChatMessage(BaseModel):
    role:    str
    content: str

class ChatRequest(BaseModel):
    message: str
    context: dict
    history: list[ChatMessage] = []

class SaveHistoryRequest(BaseModel):
    wafer_id:     str
    defect_type:  str
    confidence:   float
    yield_pct:    float
    decision:     str
    defect_ratio: float

class CreateUserRequest(BaseModel):
    email:    str
    name:     str
    password: str
    role:     str = "user"

class UpdateUserRequest(BaseModel):
    name:      Optional[str]  = None
    password:  Optional[str]  = None
    is_active: Optional[bool] = None
    role:      Optional[str]  = None


# ── Helpers ────────────────────────────────────────────────────
def _image_from_upload(file: UploadFile) -> PILImage.Image:
    raw = file.file.read()
    return PILImage.open(io.BytesIO(raw)).convert("RGB")

def _image_from_base64(b64: str) -> PILImage.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    return PILImage.open(io.BytesIO(raw)).convert("RGB")

def _apply_wafer_mask(img: PILImage.Image) -> PILImage.Image:
    arr = np.array(img)
    h, w = arr.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, (w // 2, h // 2), min(w, h) // 2 - 5, 255, -1)
    out = np.where(mask[:, :, None] > 0, arr, 0)
    return PILImage.fromarray(out.astype(np.uint8))


NOT_WAFER = "Invalid input: Please upload a valid semiconductor wafer image."


def _verify_wafer(image: PILImage.Image) -> None:
    """Reject anything that is not a wafer map. Gemini decides; the local pixel check only covers for it when it fails."""
    try:
        ok = is_wafer_image_gemini(image)
    except Exception as e:
        print(f"[wafer-check] Gemini unavailable, using the local check: {e}")
        verdict, _ = check_wafer(image)
        ok = verdict != "no"
    if not ok:
        raise HTTPException(status_code=400, detail=NOT_WAFER)


def _scan(image: PILImage.Image, die_area: float):
    """Run the wafer check and the model side by side (the check is a network call, the model is CPU work),
    so a valid wafer costs the slower of the two instead of their sum."""
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=1) as pool:
        job = pool.submit(predict, image, get_model(), die_area)
        _verify_wafer(image)  # raises 400 for a non-wafer; the model result is then simply dropped
        return job.result()


_hits: dict[str, list[float]] = {}


def _client_ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()


def _rate_limit(request: Request, bucket: str, limit: int, window: int, message: str) -> None:
    import time
    key = f"{bucket}:{_client_ip(request)}"
    now = time.time()
    hits = [t for t in _hits.get(key, []) if now - t < window]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail=message)
    hits.append(now)
    _hits[key] = hits
    if len(_hits) > 5000:
        _hits.clear()


def _guest_limit(request: Request) -> None:
    _rate_limit(request, "guest", 10, 60, "Too many guest scans. Wait a minute or request an account.")


# ── Auth ────────────────────────────────────────────────────────
@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    token = create_access_token({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}
    }

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name, "role": current_user.role}


# ── Access requests ─────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
API_PUBLIC_URL = os.getenv("API_PUBLIC_URL", "https://totz07-wafer-defect-api.hf.space").rstrip("/")
ADMIN_NOTIFY_EMAIL = os.getenv("ADMIN_NOTIFY_EMAIL", "")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AccessRequestBody(BaseModel):
    name:   str
    email:  str
    reason: str = ""


def _page(title: str, body: str, form: str = "") -> HTMLResponse:
    return HTMLResponse(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
        f"<title>{esc(title)}</title>"
        '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0f;color:#f4f4ef;font-family:system-ui,sans-serif">'
        '<main style="max-width:420px;padding:28px;border:2px solid #f4f4ef;border-radius:10px;box-shadow:8px 8px 0 #c6ff3d">'
        f'<h1 style="margin:0 0 10px;font-size:26px">{esc(title)}</h1>'
        f'<p style="color:#b9b9c6;line-height:1.5">{body}</p>{form}</main></body>'
    )


def _decide_request(db: Session, req: AccessRequest, action: str) -> str:
    """Approve or reject a pending request. Returns a short outcome line."""
    if req.status != "pending":
        return f"This request was already {req.status}."
    req.status = "approved" if action == "approve" else "rejected"
    req.decided_at = datetime.utcnow()
    if action == "approve":
        if not db.query(User).filter(User.email == req.email).first():
            temp = secrets.token_urlsafe(9)
            db.add(User(email=req.email, name=req.name, password=hash_password(temp), role="user"))
            db.commit()
            subject, html = tpl.welcome_to_user(req.name, req.email, temp, f"{FRONTEND_URL}/login")
            send_mail(req.email, subject, html)
            return f"Approved. {req.email} has been emailed their sign-in details."
        db.commit()
        return "Approved. That email already had an account."
    db.commit()
    subject, html = tpl.rejection_to_user(req.name, f"{FRONTEND_URL}/scan")
    send_mail(req.email, subject, html)
    return f"Rejected. {req.email} has been told."


@app.post("/auth/request", status_code=201)
def request_access(body: AccessRequestBody, request: Request, db: Session = Depends(get_db)):
    _rate_limit(request, "request", 5, 3600, "Too many requests from this network. Try again later.")
    name, email, reason = body.name.strip(), body.email.strip().lower(), body.reason.strip()
    if not (2 <= len(name) <= 80):
        raise HTTPException(status_code=422, detail="Enter your name.")
    if not EMAIL_RE.match(email) or len(email) > 200:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if len(reason) > 500:
        raise HTTPException(status_code=422, detail="Keep the reason under 500 characters.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="That email already has an account. Sign in instead.")
    if db.query(AccessRequest).filter(AccessRequest.email == email, AccessRequest.status == "pending").first():
        raise HTTPException(status_code=409, detail="A request for this email is already waiting.")
    row = AccessRequest(name=name, email=email, reason=reason)
    db.add(row)
    db.commit()
    db.refresh(row)
    if ADMIN_NOTIFY_EMAIL:
        ok_link = f"{API_PUBLIC_URL}/admin/requests/{row.id}/approve?t={create_action_token(row.id, 'approve')}"
        no_link = f"{API_PUBLIC_URL}/admin/requests/{row.id}/reject?t={create_action_token(row.id, 'reject')}"
        subject, html = tpl.request_to_admin(name, email, reason, ok_link, no_link)
        send_mail(ADMIN_NOTIFY_EMAIL, subject, html)
    return {"status": "pending"}


@app.get("/admin/requests")
def list_requests(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    rows = db.query(AccessRequest).filter(AccessRequest.status == "pending").order_by(AccessRequest.created_at).all()
    return [{"id": r.id, "email": r.email, "name": r.name, "reason": r.reason or "", "created_at": r.created_at.isoformat()} for r in rows]


@app.post("/admin/requests/{request_id}/{action}")
def decide_request(request_id: int, action: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=404, detail="Unknown action")
    row = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    message = _decide_request(db, row, action)
    return {"status": row.status, "message": message}


@app.get("/admin/requests/{request_id}/{action}", response_class=HTMLResponse)
def decide_link_confirm(request_id: int, action: str, t: str = "", db: Session = Depends(get_db)):
    """Opened from the email. It only asks for confirmation, so mail scanners that prefetch links decide nothing."""
    rid, act = read_action_token(t)
    if rid != request_id or act != action:
        raise HTTPException(status_code=400, detail="This link is invalid or has expired.")
    row = db.query(AccessRequest).filter(AccessRequest.id == rid).first()
    if not row:
        return _page("Not found", "That request no longer exists.")
    if row.status != "pending":
        return _page("Already decided", f"This request was already {esc(row.status)}.")
    verb = "Approve" if act == "approve" else "Reject"
    colour = "#c6ff3d" if act == "approve" else "#ff2e93"
    form = (
        f'<form method="post" action="{esc(API_PUBLIC_URL)}/admin/requests/{rid}/{act}/confirm">'
        f'<input type="hidden" name="t" value="{esc(t)}">'
        f'<button style="margin-top:14px;padding:12px 18px;border:2px solid #f4f4ef;border-radius:4px;background:{colour};'
        f'color:#0a0a0f;font-weight:800;cursor:pointer">{verb} {esc(row.name)}</button></form>'
    )
    return _page(f"{verb} access?", f"{esc(row.name)} &lt;{esc(row.email)}&gt;<br>{esc(row.reason or 'No reason given.')}", form)


@app.post("/admin/requests/{request_id}/{action}/confirm", response_class=HTMLResponse)
def decide_link_do(request_id: int, action: str, t: str = Form(""), db: Session = Depends(get_db)):
    rid, act = read_action_token(t)
    if rid != request_id or act != action:
        raise HTTPException(status_code=400, detail="This link is invalid or has expired.")
    row = db.query(AccessRequest).filter(AccessRequest.id == rid).first()
    if not row:
        return _page("Not found", "That request no longer exists.")
    return _page("Done", esc(_decide_request(db, row, act)))

# ── Admin: User Management ──────────────────────────────────────
@app.get("/admin/users")
def list_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return [
        {
            "id": u.id, "email": u.email, "name": u.name,
            "role": u.role, "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
            "total_predictions": len(u.predictions)
        }
        for u in db.query(User).all()
    ]

@app.post("/admin/users")
def create_user(req: CreateUserRequest, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(email=req.email, name=req.name, password=hash_password(req.password), role=req.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created", "id": user.id}

@app.put("/admin/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.name is not None:      user.name      = req.name
    if req.password is not None:  user.password  = hash_password(req.password)
    if req.is_active is not None: user.is_active  = req.is_active
    if req.role is not None:      user.role       = req.role
    db.commit()
    return {"message": "User updated"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@app.get("/admin/users/{user_id}/history")
def get_user_history(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [
        {
            "id": p.id, "wafer_id": p.wafer_id, "defect_type": p.defect_type,
            "confidence": p.confidence, "yield_pct": p.yield_pct,
            "decision": p.decision, "defect_ratio": p.defect_ratio,
            "timestamp": p.timestamp.isoformat()
        }
        for p in user.predictions
    ]


# ── History ─────────────────────────────────────────────────────
@app.post("/history/save")
def save_history(req: SaveHistoryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = PredictionHistory(
        user_id=current_user.id, wafer_id=req.wafer_id,
        defect_type=req.defect_type, confidence=req.confidence,
        yield_pct=req.yield_pct, decision=req.decision, defect_ratio=req.defect_ratio
    )
    db.add(entry)
    db.commit()
    return {"message": "Saved"}

@app.get("/history/me")
def get_my_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    predictions = db.query(PredictionHistory).filter(
        PredictionHistory.user_id == current_user.id
    ).order_by(PredictionHistory.timestamp.desc()).all()
    return [
        {
            "id": p.id, "wafer_id": p.wafer_id, "defect_type": p.defect_type,
            "confidence": p.confidence, "yield_pct": p.yield_pct,
            "decision": p.decision, "defect_ratio": p.defect_ratio,
            "timestamp": p.timestamp.isoformat()
        }
        for p in predictions
    ]

@app.delete("/history/{entry_id}")
def delete_history_entry(entry_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(PredictionHistory).filter(
        PredictionHistory.id == entry_id,
        PredictionHistory.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Deleted"}


# ── Core ML ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}

@app.get("/classes")
def classes():
    return {"classes": CLASSES}

@app.post("/predict")
async def predict_endpoint(
    file: UploadFile = File(...),
    die_area: float = Form(0.5),
    current_user: User = Depends(get_current_user)
):
    try:
        image = _image_from_upload(file)
        return _scan(image, die_area)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-guest")
async def predict_guest_endpoint(request: Request, file: UploadFile = File(...)):
    """Public scan with no account. Same wafer check as /predict, rate limited per IP."""
    _guest_limit(request)
    try:
        image = _image_from_upload(file)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid input: that file is not an image.")
    try:
        return _scan(image, 0.5)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-draw")
async def predict_draw_endpoint(payload: DrawRequest, current_user: User = Depends(get_current_user)):
    try:
        try:
            image = _image_from_base64(payload.image_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid input: the drawing could not be read.")
        image  = _apply_wafer_mask(image)
        result = predict(image, get_model(), payload.die_area)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain")
async def explain_endpoint(req: ExplainRequest, current_user: User = Depends(get_current_user)):
    try:
        text = get_explanation(req.defect_type, req.confidence, req.yield_pct, req.decision)
        return {"explanation": text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        history = [{"role": m.role, "content": m.content} for m in req.history]
        reply = wafer_chat(req.message, req.context, history)
        return {"reply": reply}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/yield-curve")
async def yield_curve(req: YieldCurveRequest, current_user: User = Depends(get_current_user)):
    die_areas = req.die_areas or list(np.linspace(0.1, 2.0, 50))
    points = [{"die_area": round(da, 3), "yield_pct": murphy_yield(req.defect_ratio, da)} for da in die_areas]
    return {"points": points}
