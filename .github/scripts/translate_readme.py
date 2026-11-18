"""Translate README.md into several languages with an LLM (Groq) and write the
results to docs/translations/README.<code>.md.

Run by .github/workflows/translate-readme.yml whenever README.md changes.

Environment:
  GROQ_API_KEY         required (exits quietly when missing so forks do not fail)
  GROQ_MODEL           optional, default openai/gpt-oss-120b
  REPO_ROOT            optional, defaults to the repository root
  TRANSLATE_DRY_RUN=1  skip the API and return the text unchanged (for testing)
"""
import os
import pathlib
import re
import sys
import time

import requests

ROOT = pathlib.Path(os.getenv("REPO_ROOT") or pathlib.Path(__file__).resolve().parents[2])
SRC = ROOT / "README.md"
OUT = ROOT / "docs" / "translations"
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
KEY = os.getenv("GROQ_API_KEY", "")
DRY = os.getenv("TRANSLATE_DRY_RUN") == "1"

# (file code, English name used in the prompt, native name shown in the switcher)
LANGS = [
    ("ta", "Tamil", "தமிழ்"),
    ("hi", "Hindi", "हिन्दी"),
    ("te", "Telugu", "తెలుగు"),
    ("ml", "Malayalam", "മലയാളം"),
    ("kn", "Kannada", "ಕನ್ನಡ"),
    ("bn", "Bengali", "বাংলা"),
    ("es", "Spanish", "Español"),
    ("fr", "French", "Français"),
    ("de", "German", "Deutsch"),
    ("pt-BR", "Brazilian Portuguese", "Português"),
    ("ja", "Japanese", "日本語"),
    ("zh-CN", "Simplified Chinese", "简体中文"),
    ("ar", "Arabic", "العربية"),
]

MARK_START, MARK_END = "<!-- translations:start -->", "<!-- translations:end -->"
BLOCK_RE = re.compile(re.escape(MARK_START) + r".*?" + re.escape(MARK_END), re.S)
CODE_RE = re.compile(r"```.*?```", re.S)

SYSTEM = (
    "You are a professional technical translator. Translate the GitHub README you are given "
    "from English into {name}, in a formal, precise register.\n"
    "Rules:\n"
    "- Keep the Markdown and HTML structure exactly as it is: same headings, lists, tables, "
    "blockquotes, HTML tags and attributes.\n"
    "- Never change URLs, link targets, image paths or badge URLs. Translate link text, "
    "image alt text and table content.\n"
    "- Keep inline code in backticks, file names, environment variable names and endpoints unchanged.\n"
    "- Keep product and technology names in English: Waferscope, EfficientNet-B3, WM-811K, PyTorch, "
    "FastAPI, React, Vite, Vercel, Hugging Face, Groq, Gemini, GitHub, Docker, Uvicorn, SQLAlchemy, Murphy.\n"
    "- Tokens that look like @@CODE0@@ are placeholders. Keep each one exactly as written, "
    "on its own line where it was.\n"
    "- Output only the translated README. No commentary and no wrapping code fence."
)


def protect_code(text):
    blocks = []

    def sub(m):
        blocks.append(m.group(0))
        return f"@@CODE{len(blocks) - 1}@@"

    return CODE_RE.sub(sub, text), blocks


def restore_code(text, blocks):
    for i, b in enumerate(blocks):
        text = text.replace(f"@@CODE{i}@@", b)
    return text


def rebase_links(text):
    """README links are relative to the repo root; translations live two folders deeper."""
    text = re.sub(r"(\]\()(?!https?://|#|mailto:|/|@@)([^)\s]+)", r"\1../../\2", text)
    text = re.sub(r'((?:src|href)=")(?!https?://|#|mailto:|/)([^"]+)', r"\1../../\2", text)
    return text


def switcher(current, from_root):
    prefix = "docs/translations/" if from_root else ""
    items = []
    if not from_root:
        items.append('<a href="../../README.md">English</a>')
    for code, _, native in LANGS:
        if code == current:
            items.append(f"<b>{native}</b>")
        else:
            items.append(f'<a href="{prefix}README.{code}.md">{native}</a>')
    return '<p align="center"><sub>' + " · ".join(items) + "</sub></p>"


def call_llm(name, text):
    if DRY:
        return text
    body = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM.format(name=name)},
            {"role": "user", "content": text},
        ],
        "temperature": 0.2,
        "max_tokens": 8000,
    }
    if MODEL.startswith("openai/gpt-oss"):
        body["reasoning_effort"] = "low"
    for attempt in range(1, 7):
        r = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {KEY}"},
            json=body,
            timeout=180,
        )
        if r.status_code == 429 or r.status_code >= 500:
            wait = float(r.headers.get("retry-after") or 30 * attempt)
            print(f"  {r.status_code}, retrying in {wait:.0f}s (attempt {attempt})")
            time.sleep(min(wait, 120))
            continue
        r.raise_for_status()
        out = (r.json()["choices"][0]["message"].get("content") or "").strip()
        out = re.sub(r"^```(?:markdown|md)?\s*\n|\n```\s*$", "", out)
        return out
    raise RuntimeError("rate limited too many times")


def valid(src, out, n_blocks):
    if len(out) < 0.4 * len(src):
        return "output too short"
    for i in range(n_blocks):
        if out.count(f"@@CODE{i}@@") != 1:
            return f"placeholder {i} missing or duplicated"
    return None


def main():
    if not DRY and not KEY:
        print("GROQ_API_KEY is not set; skipping translation.")
        return 0
    readme = SRC.read_text(encoding="utf-8")
    base = BLOCK_RE.sub("", readme)  # translate the README without its language switcher
    protected, blocks = protect_code(base)
    protected = rebase_links(protected)
    OUT.mkdir(parents=True, exist_ok=True)

    done, failed = [], []
    for idx, (code, name, native) in enumerate(LANGS):
        print(f"Translating to {name} ({code})")
        problem, out = "unknown", ""
        for attempt in range(2):
            try:
                out = call_llm(name, protected)
            except Exception as e:  # noqa: BLE001
                problem = f"API error: {e}"
                continue
            problem = valid(protected, out, len(blocks))
            if not problem:
                break
        if problem:
            print(f"  skipped: {problem}")
            failed.append(code)
            continue
        body = restore_code(out, blocks)
        note = (
            "<!-- Automatically generated from README.md by "
            ".github/workflows/translate-readme.yml. Do not edit by hand. -->\n"
        )
        (OUT / f"README.{code}.md").write_text(
            note + switcher(code, from_root=False) + "\n\n" + body.strip() + "\n", encoding="utf-8"
        )
        done.append(code)
        if not DRY and idx < len(LANGS) - 1:
            time.sleep(20)  # stay under the free-tier tokens-per-minute limit

    # Keep the switcher in the English README in sync with the files that exist.
    existing = [c for c, _, _ in LANGS if (OUT / f"README.{c}.md").exists()]
    if existing:
        links = " · ".join(
            f'<a href="docs/translations/README.{c}.md">{n}</a>' for c, _, n in LANGS if c in existing
        )
        block = f'{MARK_START}\n<p align="center"><sub>Also available in: {links}</sub></p>\n{MARK_END}'
        if BLOCK_RE.search(readme):
            new = BLOCK_RE.sub(lambda _: block, readme)
            if new != readme:
                SRC.write_text(new, encoding="utf-8")

    print(f"Done: {len(done)} translated, {len(failed)} skipped {failed if failed else ''}")
    return 0 if done or DRY else 1


if __name__ == "__main__":
    sys.exit(main())
