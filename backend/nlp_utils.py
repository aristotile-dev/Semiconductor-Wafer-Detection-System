import os
import io
import base64
from groq import Groq


GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
WAFER_QUESTION = """You are a semiconductor inspection expert.
Does this image show a semiconductor wafer map, a wafer defect map, a wafer inspection image or a die map?
These can be round or square, colour heatmaps, black and white defect maps, or grids of dies with failed dies marked.
Photos of people, animals, objects, scenery, documents, screenshots and medical scans such as X-rays are NOT wafer maps.
Reply with only YES or NO."""


def is_wafer_image_gemini(image_pil, api_key=None):
    """Ask Gemini whether the image is a wafer map. Raises if the call fails so the caller can fall back."""
    import httpx
    api_key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")
    buf = io.BytesIO()
    image_pil.convert("RGB").save(buf, format="JPEG", quality=85)
    body = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(buf.getvalue()).decode()}},
            {"text": WAFER_QUESTION},
        ]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 8},
    }
    r = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        headers={"x-goog-api-key": api_key}, json=body, timeout=20,
    )
    r.raise_for_status()
    parts = r.json()["candidates"][0]["content"]["parts"]
    answer = "".join(p.get("text", "") for p in parts).strip().upper()
    if not answer:
        raise ValueError("empty answer from Gemini")
    return answer.startswith("YES")


def is_wafer_image(image_pil, api_key=None):
    api_key = api_key or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    buffered = io.BytesIO()
    image_pil.save(buffered, format="JPEG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens=10,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                    },
                    {
                        "type": "text",
                        "text": """You are a semiconductor inspection expert.
Wafer images appear in many forms: colorful heatmaps (green/red/blue circular patterns on dark background), binary black-and-white defect maps, grayscale wafer scans, or circular wafer pattern images with defect clusters.
Does this image show ANY of the following: a semiconductor wafer map, wafer defect heatmap, wafer inspection image, circular wafer pattern, or defect density map?
Reply with only YES or NO."""
                    }
                ]
            }
        ]
    )
    answer = response.choices[0].message.content.strip().upper()
    return answer.startswith("YES")


def get_explanation(defect_type, confidence, yield_pct, decision, api_key=None):
    api_key = api_key or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    client = Groq(api_key=api_key)
    prompt = f"""You are a semiconductor manufacturing expert.

A wafer inspection system detected:
- Defect Type: {defect_type}
- Confidence: {confidence:.1f}%
- Murphy Yield: {yield_pct}%
- Decision: {decision}

Give expert analysis with exactly 4 sections using this exact format (no ##, no **, no markdown):

Step 1: Root Cause
[1-2 lines about why this defect occurs in fab]

Step 2: Severity
[1-2 lines about impact on wafer and dies]

Step 3: Corrective Action
[1-2 lines about what engineer should do now]

Step 4: Batch Decision Reason
[1-2 lines about why {decision} is the right call]

Be technical and precise. No markdown symbols."""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def wafer_chat(message, context, history, api_key=None):
    api_key = api_key or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    client = Groq(api_key=api_key)

    system_prompt = f"""You are an expert semiconductor manufacturing engineer and wafer defect analyst.
You are currently analyzing a wafer with the following results:
- Defect Type: {context['defect_type']}
- Confidence: {context['confidence']:.1f}%
- Murphy Yield: {context['yield_pct']}%
- Decision: {context['decision']}

Answer ONLY wafer and semiconductor related questions (defect types, yield analysis, fab processes, corrective actions, lithography, etc).
If asked anything unrelated, respond: "I can only assist with wafer and semiconductor related questions."
Be concise, technical, and precise. No markdown formatting."""

    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        max_tokens=300,
        messages=messages
    )
    return response.choices[0].message.content
