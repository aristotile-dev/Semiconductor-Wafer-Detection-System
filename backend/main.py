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
from sqlalchemy.orm import Session

from model_utils import load_model, predict, murphy_yield, CLASSES
from nlp_utils import get_explanation, is_wafer_image, wafer_chat
from wafer_check import check_wafer
from database import get_db, init_db, User, PredictionHistory
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_admin_user
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
    """Reject anything that is not a wafer map. Cheap local check first, then the vision model."""
    verdict, _ = check_wafer(image)
    if verdict == "no":
        raise HTTPException(status_code=400, detail=NOT_WAFER)
    try:
        ok = is_wafer_image(image)
    except Exception as e:
        print(f"[wafer-check] vision model unavailable: {e}")
        ok = verdict == "yes"  # without the vision model, only accept clear wafer maps
    if not ok:
        raise HTTPException(status_code=400, detail=NOT_WAFER)


_guest_hits: dict[str, list[float]] = {}


def _guest_limit(request: Request, per_minute: int = 10) -> None:
    import time
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    now = time.time()
    hits = [t for t in _guest_hits.get(ip, []) if now - t < 60]
    if len(hits) >= per_minute:
        raise HTTPException(status_code=429, detail="Too many guest scans. Wait a minute or request an account.")
    hits.append(now)
    _guest_hits[ip] = hits
    if len(_guest_hits) > 5000:
        _guest_hits.clear()


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
        _verify_wafer(image)
        result = predict(image, get_model(), die_area)
        return result
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
        _verify_wafer(image)
        return predict(image, get_model(), 0.5)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-draw")
async def predict_draw_endpoint(payload: DrawRequest, current_user: User = Depends(get_current_user)):
    try:
        image  = _image_from_base64(payload.image_base64)
        image  = _apply_wafer_mask(image)
        result = predict(image, get_model(), payload.die_area)
        return result
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
