"""Local check for "is this a wafer map?".

Used only as a fallback when the vision model cannot answer.
"""
import numpy as np
from PIL import Image as PILImage

SIZE = 128


def _features(img: PILImage.Image) -> dict:
    rgb = np.asarray(img.convert("RGB").resize((SIZE, SIZE), PILImage.BILINEAR)).astype(np.int16)

    # Flat background in the four corners (wafer maps sit on one flat colour, photos do not).
    k = SIZE // 8
    corners = np.concatenate([rgb[:k, :k].reshape(-1, 3), rgb[:k, -k:].reshape(-1, 3), rgb[-k:, :k].reshape(-1, 3), rgb[-k:, -k:].reshape(-1, 3)])
    corner_std = float(corners.std(axis=0).mean())
    bg = np.median(corners, axis=0)

    # Colourfulness: wafer maps are drawn in saturated colours, X-rays and most scans are grey.
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0.0)
    colourful = float((sat > 0.5).mean())

    # Palette: share of the picture covered by the six most common coarse colours.
    q = (rgb // 32).reshape(-1, 3)
    codes = q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2]
    top6 = float(np.sort(np.bincount(codes, minlength=512))[::-1][:6].sum() / codes.size)

    # Content inside the inscribed circle (is anything drawn at all?).
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    r = np.hypot(yy - (SIZE - 1) / 2, xx - (SIZE - 1) / 2) / (SIZE / 2)
    content = np.abs(rgb - bg).sum(axis=2) > 60
    inside = float(content[r <= 0.95].mean())

    # Tone spread of the grey image: grey scans and photos use the whole range smoothly.
    gray = np.asarray(img.convert("L").resize((SIZE, SIZE), PILImage.NEAREST))
    hist = np.bincount((gray // 4).ravel(), minlength=64) / gray.size
    hist = hist[hist > 0]
    entropy = float(-(hist * np.log2(hist)).sum())
    return {"colourful": colourful, "corner_std": corner_std, "top6": top6, "inside": inside, "entropy": entropy}


def check_wafer(img: PILImage.Image) -> tuple[str, dict]:
    """Fallback verdict when the vision model is down: "no" | "maybe" | "yes".

    Wafer maps can be round or square and in many colour schemes, so the shape is not judged. What gives a
    map away is a flat background plus saturated colour. Grey scans (X-rays) and busy photos are refused.
    """
    f = _features(img)
    grey_scan = f["colourful"] < 0.15 and f["entropy"] > 3.0   # smooth grey tones, not a two-tone map
    busy_photo = f["corner_std"] > 30 and f["top6"] < 0.7                          # no flat background, many colours
    if grey_scan or busy_photo or f["inside"] < 0.05:
        return "no", f
    if f["corner_std"] < 15 and f["colourful"] > 0.4:
        return "yes", f
    return "maybe", f
