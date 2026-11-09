"""Local check for "is this a wafer map?".

Used only as a fallback when the vision model cannot answer. Wafer maps are drawn in a handful of
flat colours or tones; photos (faces, X-rays, scenery) have a continuous range of them.
"""
import numpy as np
from PIL import Image as PILImage

SIZE = 128


def _features(img: PILImage.Image) -> dict:
    a = np.asarray(img.convert("RGB").resize((SIZE, SIZE), PILImage.BILINEAR)).astype(np.int16)

    # 1. Palette: wafer maps use few flat colours, photos use many.
    q = (a // 32).reshape(-1, 3)
    codes = q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2]
    counts = np.sort(np.bincount(codes, minlength=512))[::-1]
    top6 = counts[:6].sum() / codes.size

    # 1b. Tonal richness: a wafer map has a few flat tones, a photo has a continuous range of them.
    gray = np.asarray(img.convert("L").resize((SIZE, SIZE), PILImage.NEAREST))
    hist = np.bincount((gray // 4).ravel(), minlength=64) / gray.size
    hist = hist[hist > 0]
    entropy = float(-(hist * np.log2(hist)).sum())

    # 2. Flat background in the four corners.
    k = SIZE // 8
    corners = np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)])
    corner_std = float(corners.std(axis=0).mean())
    bg = np.median(corners, axis=0)

    # 3. Circle: content should sit inside the inscribed circle, not outside it.
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    r = np.hypot(yy - (SIZE - 1) / 2, xx - (SIZE - 1) / 2) / (SIZE / 2)
    content = np.abs(a - bg).sum(axis=2) > 60
    inside = content[r <= 0.95].mean()
    outside = content[r > 1.0].mean() if (r > 1.0).any() else 0.0
    return {"entropy": entropy, "top6": float(top6), "corner_std": corner_std, "inside": float(inside), "outside": float(outside)}


def check_wafer(img: PILImage.Image) -> tuple[str, dict]:
    """Fallback verdict when the vision model is down: "no" | "maybe" | "yes".

    Wafer maps may be round or square, so the shape is not judged. Only the look of the pixels is:
    a map is a few flat colours or tones, a photo is a continuous range of them.
    """
    f = _features(img)
    if f["top6"] < 0.55 or f["entropy"] > 4.2 or f["inside"] < 0.05:
        return "no", f
    if f["top6"] > 0.8 and f["entropy"] < 3.0:
        return "yes", f
    return "maybe", f
