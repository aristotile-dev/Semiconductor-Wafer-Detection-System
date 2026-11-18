<!-- Automatically generated from README.md by .github/workflows/translate-readme.yml. Do not edit by hand. -->
<p align="center"><sub><a href="../../README.md">English</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.ml.md">മലയാളം</a> · <b>ಕನ್ನಡ</b> · <a href="README.bn.md">বাংলা</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ar.md">العربية</a></sub></p>

<p align="center">
  <a href="https://waferscope-two.vercel.app">
    <img src="../../assets/hero.png" alt="Waferscope: find the defect before it ships" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://waferscope-two.vercel.app"><b>Live demo</b></a>
  &nbsp;·&nbsp;
  <a href="#how-it-works">How it works</a>
  &nbsp;·&nbsp;
  <a href="#run-it-yourself">Run it yourself</a>
</p>

<p align="center">
  <img alt="Model" src="https://img.shields.io/badge/model-EfficientNet--B3-c6ff3d?style=flat-square&labelColor=0a0a0f">
  <img alt="Dataset" src="https://img.shields.io/badge/trained%20on-WM--811K-ff2e93?style=flat-square&labelColor=0a0a0f">
  <img alt="Frontend" src="https://img.shields.io/badge/UI-React%20%2B%20Vite-61dafb?style=flat-square&logo=react&logoColor=white&labelColor=0a0a0f">
  <img alt="Backend" src="https://img.shields.io/badge/API-FastAPI%20%2B%20PyTorch-009688?style=flat-square&logo=fastapi&logoColor=white&labelColor=0a0a0f">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square&labelColor=0a0a0f">
</p>



Waferscope ಒಂದು ಸೆಮಿಕಂಡಕ್ಟರ್ ವೆಫರ್ ಮ್ಯಾಪ್ ಅನ್ನು ಓದಿ ನಿಮಗೆ ಮೂರು ವಿಷಯಗಳನ್ನು ಹೇಳುತ್ತದೆ: **ಒಂಬತ್ತು ದೋಷ ಮಾದರಿಗಳಲ್ಲಿ ಯಾವುದು, ನಿರೀಕ್ಷಿಸಬಹುದಾದ ಉತ್ಪಾದನೆ, ಮತ್ತು ವೆಫರ್ ಅನ್ನು ಉಳಿಸಬೇಕಾ, ಪರಿಶೀಲಿಸಬೇಕಾ ಅಥವಾ ತ್ಯಜಿಸಬೇಕಾ.** ಇದು ಫಲಿತಾಂಶದ ನಿಪುಣ ವಿವರಣೆಯನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಸೇರಿಸುತ್ತದೆ ಮತ್ತು ಸ್ಕ್ಯಾನ್ ಅನ್ನು ತಿಳಿದಿರುವ ಚಾಟ್ ಅನ್ನು ಒದಗಿಸುತ್ತದೆ.

ಯಾರಾದರೂ ಖಾತೆ ಇಲ್ಲದೆ ಪ್ರಯತ್ನಿಸಬಹುದು: [ಸ್ಕ್ಯಾನ್ ಪುಟ](https://waferscope-two.vercel.app/scan) ನಲ್ಲಿ ಮಾದರಿ ವೆಫರ್ ಅನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ, ಅಥವಾ ನಿಮ್ಮ ಸ್ವಂತ ಮ್ಯಾಪ್ ಅನ್ನು ಬಿಡಿ. ಪೂರ್ಣ ಕಾರ್ಯಸ್ಥಳ (ಬ್ಯಾಚ್ ಸ್ಕ್ಯಾನ್‌ಗಳು, ಚಿತ್ರಣ, ಇತಿಹಾಸ, ವರದಿಗಳು, ನಿಪುಣ ಬಾಟ್) ಅನುಮೋದಿತ ಖಾತೆಗಳಿಗೆ ಮಾತ್ರ.

<p align="center">
  <img src="../../assets/scan.png" alt="The guest scan page showing a Donut wafer with its yield, verdict and facts" width="100%">
</p>

## Features

* **Pattern, yield and verdict.** WM-811K ಮೇಲೆ ತರಬೇತಿ ಪಡೆದ ವರ್ಗೀಕರಣಕಾರವು ಒಂಬತ್ತು ಮಾದರಿಗಳಲ್ಲಿ ಒಂದನ್ನು (`Center`, `Donut`, `Edge-Loc`, `Edge-Ring`, `Loc`, `Near-full`, `Random`, `Scratch`, `none`) ಅದರ ವಿಶ್ವಾಸದೊಂದಿಗೆ ಹೆಸರಿಸುತ್ತದೆ. ಕೆಟ್ಟ ಡೈಗಳ ಹಂಚಿಕೆ ಉತ್ಪಾದನೆಗೆ ಪರಿವರ್ತಿಸಲಾಗುತ್ತದೆ ಮತ್ತು **SAVE**, **REVIEW** ಅಥವಾ **SCRAP** ಎಂದು ಕರೆಯಲಾಗುತ್ತದೆ.
* **ಇತರ ಎಲ್ಲಕ್ಕಿಂತ ಮೊದಲು ವೆಫರ್ ಪರಿಶೀಲನೆ.** ಅಪ್‌ಲೋಡ್‌ಗಳು ಮೊದಲು ವೆಫರ್ ಮ್ಯಾಪ್ ಆಗಿವೆ ಎಂದು ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ (Gemini ದೃಷ್ಟಿ, ಸ್ಥಳೀಯ ಬಣ್ಣ‑ಮತ್ತು‑ಟೆಕ್ಸ್ಚರ್ ಫಾಲ್‌ಬ್ಯಾಕ್‌ ಜೊತೆ), ಆದ್ದರಿಂದ ಸೆಲ್ಫಿ ಅಥವಾ ಎಕ್ಸ್‑ರೇ ಅನ್ನು ವರ್ಗೀಕರಣದ ಬದಲು ನಿರಾಕರಿಸಲಾಗುತ್ತದೆ.
* **ನಿಪುಣ ಓದು ಮತ್ತು ಚಾಟ್.** ಭಾಷಾ ಮಾದರಿ (Groq) ಸಾಧ್ಯವಾದ ಕಾರಣ ಮತ್ತು ಮುಂದಿನ ಹಂತವನ್ನು ವಿವರಿಸುತ್ತದೆ, ಮತ್ತು ಆ ಸ್ಕ್ಯಾನ್‌ನ ಸಂಧರ್ಭದಲ್ಲಿ ಅನುಸರಿಸುವ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುತ್ತದೆ. ವೆಫರ್‌ಗಳ ಬಗ್ಗೆ ಅಲ್ಲದ ಯಾವುದೇ ವಿಷಯವನ್ನು ನಿರಾಕರಿಸುತ್ತದೆ.
* **ಬ್ಯಾಚ್ ಸ್ಕ್ಯಾನ್‌ಗಳು.** ಒಂದೇ ಸಮಯದಲ್ಲಿ ಹತ್ತು ವೆಫರ್‌ಗಳವರೆಗೆ, ಪ್ರತಿ ಫೈಲ್‌ಗೆ ನಿರ್ಣಯ ಮತ್ತು ಸಂಕ್ಷಿಪ್ತ ವರದಿಯೊಂದಿಗೆ.
* **ಡ್ರಾ ಮೋಡ್.** ಖಾಲಿ ವೆಫರ್‌ನಲ್ಲಿ ದೋಷವನ್ನು ಚಿತ್ರಿಸಿ ಮತ್ತು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.
* **ಉತ್ಪಾದನೆ ವಿಶ್ಲೇಷಣೆ, ಇತಿಹಾಸ ಮತ್ತು ವರದಿಗಳು.** ಯಾವುದೇ ಡೈ ಪ್ರದೇಶಕ್ಕೆ ಉತ್ಪಾದನೆ ವಕ್ರ, ಪ್ರತಿ ಸ್ಕ್ಯಾನ್‌ನ ಫಿಲ್ಟರ್ ಮಾಡಬಹುದಾದ ಇತಿಹಾಸ, ಮತ್ತು ಮುದ್ರಿಸಬಹುದಾದ ವರದಿ.
* **ಪ್ರವೇಶ ವಿನಂತಿ ಪ್ರಕ್ರಿಯೆ.** ಖಾತೆಗಳನ್ನು ಕೈಯಿಂದ ಅನುಮೋದಿಸಲಾಗುತ್ತದೆ. ವಿನಂತಿ ಆಡ್ಮಿನ್‌ಗೆ ಇಮೇಲ್ ಆಗುತ್ತದೆ, ಅವರು ಒಂದೇ ಸಹಿ ಲಿಂಕ್ ಮೂಲಕ ಅನುಮೋದನೆ ಅಥವಾ ನಿರಾಕರಣೆ ಮಾಡುತ್ತಾರೆ; ಅನುಮೋದಿತ ಬಳಕೆದಾರರು ತಮ್ಮ ಸೈನ್‑ಇನ್ ವಿವರಗಳನ್ನು ಇಮೇಲ್ ಮೂಲಕ ಪಡೆಯುತ್ತಾರೆ.

<p align="center">
  <img src="../../assets/app.png" alt="The signed-in scan page with a Scratch result, 92.9 percent yield and a REVIEW verdict" width="100%">
</p>

## How it works

The path of a wafer map through the system:

```mermaid
flowchart TD
    A["Wafer map<br/>PNG or JPG"] --> B{"Is it a wafer map?<br/>Gemini vision, local fallback"}
    B -->|No| X["Rejected with a reason"]
    B -->|Yes| C["EfficientNet-B3<br/>9 pattern classes"]
    B -->|Yes| D["Defect share<br/>of the dies"]
    C --> E["Pattern and confidence"]
    D --> F["Poisson-Murphy yield"]
    F --> G{"Verdict"}
    E --> G
    G --> H["SAVE · REVIEW · SCRAP"]
    E --> I["Groq: expert read and chat"]
    F --> I
```

### Yield and verdict

The share of bad dies, `s`, becomes a Poisson defect density for the reference 0.5 cm² die, `AD = -ln(1 - s) × (die area / 0.5)`, and Murphy's model turns that into a yield:

```
yield = ((1 - e^(-AD)) / AD)²
```

A larger die catches proportionally more of the damage, which is why the die-area slider moves the number. The verdict follows the yield (70 and above is **SAVE**, 40 to 70 is **REVIEW**, below 40 is **SCRAP**), with one rule on top: a *systematic* pattern (`Edge-Ring`, `Donut`, `Scratch`, `Center`) points at a process problem rather than a stray particle, so even a high yield is held for **REVIEW**.

> The sample wafers on the public pages use their drawn die map for "dies affected" and yield, so the numbers agree with what you see. For an uploaded image the backend estimates the defect share from pixels, which is an approximation.

### Architecture

```mermaid
flowchart LR
    U["Browser"] --> V["React UI<br/>Vercel"]
    V -->|"REST + JWT"| A["FastAPI + PyTorch<br/>Hugging Face Space"]
    A -->|"first start"| M[("EfficientNet weights<br/>Hugging Face Hub")]
    A --> P[("Postgres<br/>Neon")]
    A --> G["Gemini<br/>wafer check"]
    A --> L["Groq<br/>expert read, chat"]
    A -->|"approval mail"| R["Apps Script relay<br/>Gmail"]
```

The API exposes:

| Area | Endpoints |
|---|---|
| Scanning | `POST /predict-guest` (rate limited, no account), `POST /predict`, `POST /predict-draw`, `POST /yield-curve`, `GET /classes`, `GET /health` |
| Expert | `POST /explain`, `POST /chat` |
| Accounts | `POST /auth/login`, `GET /auth/me`, `POST /auth/request` |
| Admin | `GET /admin/requests`, `POST /admin/requests/{id}/{approve or reject}`, `GET`/`POST /admin/users`, `PUT`/`DELETE /admin/users/{id}` |
| History | `POST /history/save`, `GET /history/me`, `DELETE /history/{id}` |

### On a phone

The wafer on the request page becomes a dot-matrix padlock: each finished field fills it, and at 3/3 a key turns and the lock opens.

<p align="center">
  <img src="../../assets/request-phone.png" alt="The request access page on a phone with the padlock open" width="320">
</p>

## Tech stack

| | |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router, Framer Motion, Recharts, three.js, Axios. Hosted on Vercel. |
| **Backend** | FastAPI, PyTorch and torchvision (EfficientNet-B3), OpenCV, SQLAlchemy, JWT, bcrypt. Docker, hosted on a Hugging Face Space. |
| **Data** | Postgres on Neon (a local SQLite file when `DATABASE_URL` is not set). |
| **AI** | Gemini for the wafer check, Groq for the expert read and chat. Model weights: [`totz07/wafer-defect-classifier`](https://huggingface.co/totz07/wafer-defect-classifier). |
| **Mail** | A small Google Apps Script relay ([`backend/apps_script_mail_relay.gs`](../../backend/apps_script_mail_relay.gs)). |

The classifier is trained on [WM-811K](https://www.kaggle.com/datasets/qingyi/wm811k-wafer-map), a public set of 811,457 wafer maps.

<a id="run-it-yourself"></a>

## Run it yourself

```bash
git clone https://github.com/aristotile-dev/Semiconductor-Wafer-Detection-System.git
cd Semiconductor-Wafer-Detection-System
npm install
```

**Just the interface, no backend.** The mock mode answers every request in the browser:

```bash
npm run dev:mock
```

Open `http://localhost:5173` and sign in with `admin@waferscope.test` / `demo-admin` or `demo@waferscope.test` / `demo-user`. Results in this mode come from a mock, not the real model.

**The full stack.**

```bash
# backend (Python 3.11)
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in the values, see the comments inside
uvicorn main:app --reload --port 7860

# frontend, in a second terminal
echo "VITE_API_BASE_URL=http://localhost:7860" > .env
npm run dev
```

`backend/.env.example` explains every variable. Without `DATABASE_URL` the API uses a local SQLite file, and without the mail relay it simply skips the approval emails.

### Docker

```bash
cd backend
docker build -t waferscope-api .
docker run -p 7860:7860 --env-file .env waferscope-api
```

## Project layout

```
Semiconductor-Wafer-Detection-System
│
├── src/                          React + TypeScript frontend
│   ├── pages/
│   │   ├── Landing.tsx           public home: the nine patterns, one-tap sample
│   │   ├── Scan.tsx              public guest scan, no account needed
│   │   ├── Login.tsx · RequestAccess.tsx
│   │   └── Prediction · BatchPrediction · DrawMode · YieldAnalysis
│   │       History · Reports · UserManagement      signed-in workspace
│   ├── components/
│   │   ├── DieMap · DieStage     the wafer drawings (canvas)
│   │   ├── ResultPanel.tsx       verdict, odds, expert read, chat drawer
│   │   ├── LockBox · FillWafer   the request-access animations
│   │   ├── WaferScene.tsx        three.js wafer for live uploads
│   │   └── AppShell · TopNav     navigation and the bottom dock
│   ├── lib/
│   │   ├── patterns.ts           nine patterns, Poisson-Murphy yield, verdict rule
│   │   └── sampleResults.json    live-model results for the bundled samples
│   ├── api/
│   │   ├── client.ts             Axios client
│   │   └── mock.ts               in-browser mock for `npm run dev:mock`
│   └── styles/                   global, landing, public, app
│
├── public/samples/               one real WM-811K map per pattern
│
├── backend/                      FastAPI + PyTorch API
│   ├── main.py                   endpoints, auth, request and approval flow, rate limits
│   ├── model_utils.py            EfficientNet-B3, Grad-CAM, yield, verdict
│   ├── wafer_check.py            local wafer check, used when Gemini is unavailable
│   ├── nlp_utils.py              Gemini wafer check, Groq expert read and chat
│   ├── auth.py · database.py     JWT, passwords, SQLAlchemy models
│   ├── mailer.py · mail_templates.py · apps_script_mail_relay.gs
│   ├── Dockerfile                image used by the Hugging Face Space
│   └── .env.example              every setting, explained
│
├── assets/                       README screenshots
└── vercel.json                   single-page-app rewrite for Vercel
```

## License

MIT. See [LICENSE](../../LICENSE).
