import os
from groq import Groq


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

Give expert analysis with exactly 4 sections:
1. Root Cause: (why this defect occurs in fab)
2. Severity: (impact on wafer and dies)
3. Corrective Action: (what engineer should do now)
4. Batch Decision Reason: (why {decision} is the right call)

Keep each section to 1-2 lines. Be technical and precise."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
