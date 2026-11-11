import io
import math
import base64
import torch
import torch.nn as nn
import numpy as np
import cv2
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image as PILImage
from huggingface_hub import hf_hub_download

CLASSES = ['Center', 'Donut', 'Edge-Loc', 'Edge-Ring', 'Loc', 'Near-full', 'Random', 'Scratch', 'none']

HF_REPO    = "totz07/wafer-defect-classifier"
MODEL_FILE = "best_wafer_model.pth"

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


def load_model():
    model = models.efficientnet_b3(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(model.classifier[1].in_features, 512),
        nn.ReLU(),
        nn.BatchNorm1d(512),
        nn.Dropout(p=0.3),
        nn.Linear(512, len(CLASSES))
    )
    path = hf_hub_download(repo_id=HF_REPO, filename=MODEL_FILE)
    checkpoint = torch.load(path, map_location=device)
    model.load_state_dict(checkpoint['model_state'])
    model = model.to(device)
    model.eval()
    return model


def get_defect_density(image):
    img = np.array(image.convert('L'))
    img_resized = cv2.resize(img, (256, 256))
    _, binary = cv2.threshold(img_resized, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    mask = img_resized > 10
    binary = binary * mask
    defect_pixels = np.sum(binary > 0)
    wafer_pixels  = np.sum(mask)
    defect_ratio  = defect_pixels / wafer_pixels if wafer_pixels > 0 else 0
    return round(defect_ratio, 4)


def murphy_yield(defect_ratio, die_area_cm2=0.5, wafer_area_cm2=706.86):
    """Murphy yield model.

    The defect ratio is the share of the wafer that is bad. Murphy's model wants defects per die, so the share is
    turned into a Poisson defect density, AD = -ln(1 - share), for the reference 0.5 cm2 die. A larger die collects
    proportionally more of that damage. Small defects keep a high yield, and a wafer that is mostly dead can reach SCRAP.
    """
    share = min(max(defect_ratio, 0.0), 0.999)
    if share <= 0:
        return 100.0
    AD = -math.log(1 - share) * (die_area_cm2 / 0.5)
    if AD > 10:
        return 0.0
    yield_val = ((1 - math.exp(-AD)) / AD) ** 2
    return round(yield_val * 100, 2)


def generate_gradcam(image: PILImage.Image, model, pred_class: int) -> str:
    """
    Generate Grad-CAM heatmap for the predicted class.
    Returns base64 encoded PNG of the heatmap overlaid on the original image.
    """
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
    img_tensor = transform(image).unsqueeze(0).to(device)

    # Storage for gradients and activations
    gradients = []
    activations = []

    # Hook the last conv layer of EfficientNet-B3 (features[-1])
    def forward_hook(module, input, output):
        activations.append(output)

    def backward_hook(module, grad_input, grad_output):
        gradients.append(grad_output[0])

    # EfficientNet-B3 last conv block
    target_layer = model.features[-1]
    fwd_handle = target_layer.register_forward_hook(forward_hook)
    bwd_handle = target_layer.register_full_backward_hook(backward_hook)

    # Forward pass with gradients
    model.eval()
    output = model(img_tensor)
    model.zero_grad()

    # Backprop for predicted class
    score = output[0, pred_class]
    score.backward()

    fwd_handle.remove()
    bwd_handle.remove()

    # Compute Grad-CAM
    grads   = gradients[0].cpu().detach().numpy()[0]   # (C, H, W)
    acts    = activations[0].cpu().detach().numpy()[0]  # (C, H, W)
    weights = np.mean(grads, axis=(1, 2))               # (C,)

    cam = np.zeros(acts.shape[1:], dtype=np.float32)
    for i, w in enumerate(weights):
        cam += w * acts[i]

    cam = np.maximum(cam, 0)
    if cam.max() > 0:
        cam = cam / cam.max()

    # Resize to original image size
    orig_w, orig_h = image.size
    cam_resized = cv2.resize(cam, (orig_w, orig_h))

    # Apply colormap
    heatmap = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

    # Overlay on original image
    orig_np = np.array(image.resize((orig_w, orig_h)).convert("RGB"))
    overlay = cv2.addWeighted(orig_np, 0.5, heatmap, 0.5, 0)
    overlay_img = PILImage.fromarray(overlay)

    # Encode to base64
    buf = io.BytesIO()
    overlay_img.save(buf, format="PNG")
    buf.seek(0)
    return "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")


def predict(image: PILImage.Image, model, die_area_cm2=0.5):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                             [0.229, 0.224, 0.225])
    ])
    img_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(img_tensor)
        probs   = torch.softmax(outputs, dim=1)[0]
        pred    = probs.argmax().item()

    defect_type  = CLASSES[pred]
    confidence   = probs[pred].item() * 100
    all_probs    = {cls: round(probs[i].item() * 100, 2) for i, cls in enumerate(CLASSES)}
    defect_ratio = get_defect_density(image)
    yield_pct    = murphy_yield(defect_ratio, die_area_cm2)

    if yield_pct >= 70:
        decision = "SAVE"
    elif yield_pct >= 40:
        decision = "REVIEW"
    else:
        decision = "SCRAP"
    # A systematic pattern points at a process problem, so even a high yield is held for review.
    if decision == "SAVE" and defect_type in ("Center", "Donut", "Edge-Ring", "Scratch"):
        decision = "REVIEW"

    # Generate Grad-CAM
    try:
        gradcam_b64 = generate_gradcam(image, model, pred)
    except Exception as e:
        print(f"[Grad-CAM] failed: {e}")
        gradcam_b64 = None

    return {
        "defect_type":  defect_type,
        "confidence":   confidence,
        "all_probs":    all_probs,
        "yield_pct":    yield_pct,
        "decision":     decision,
        "defect_ratio": defect_ratio,
        "gradcam":      gradcam_b64
    }
