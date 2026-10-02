import io
import os
import base64
from typing import Optional

import cv2
import numpy as np
from PIL import Image as PILImage
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model_utils import load_model, predict, murphy_yield, CLASSES
from nlp_utils import get_explanation

# ── App setup ──────────────────────────────────────────────────
app = FastAPI(
    title="Wafer Defect Detection API",
    version="1.0.0",
    description="EfficientNet-B3 wafer defect classifier + Murphy yield model + LLM expert analysis"
)

# CORS — adjust in production to your frontend origin
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lazy-load model on first request ──────────────────────────
_model = None


def get_model():
    global _model
    if _model is None:
        _model = load_model()
    return _model


@app.on_event("startup")
def startup_event():
    # Warm up the model so the first /predict doesn't pay the HF download cost
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


# ── Routes ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/classes")
def classes():
    return {"classes": CLASSES}


@app.post("/predict")
async def predict_endpoint(
    file: UploadFile = File(...),
    die_area: float = Form(0.5)
):
    try:
        image = _image_from_upload(file)
        result = predict(image, get_model(), die_area)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-draw")
async def predict_draw_endpoint(payload: DrawRequest):
    try:
        image  = _image_from_base64(payload.image_base64)
        image  = _apply_wafer_mask(image)
        result = predict(image, get_model(), payload.die_area)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/explain")
async def explain_endpoint(req: ExplainRequest):
    try:
        text = get_explanation(req.defect_type, req.confidence, req.yield_pct, req.decision)
        return {"explanation": text}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/yield-curve")
async def yield_curve(req: YieldCurveRequest):
    die_areas = req.die_areas or list(np.linspace(0.1, 2.0, 50))
    points = []
    for da in die_areas:
        y = murphy_yield(req.defect_ratio, da)
        points.append({"die_area": round(da, 3), "yield_pct": y})
    return {"points": points}
