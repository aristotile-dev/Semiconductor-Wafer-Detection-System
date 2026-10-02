# 🔬 Semiconductor Wafer Defect Detection System

A full-stack AI-powered web application for detecting and analyzing defects in semiconductor wafer images using deep learning, yield modeling, and LLM-based expert analysis.

---

## 🌐 Live Demo

- **Frontend:** [wafer-detection-app.vercel.app](https://wafer-detection-app.vercel.app)
- **Backend API:** [Hugging Face Spaces](https://huggingface.co/spaces/totz07/wafer-defect-api)

---

## 📸 Screenshots

> Prediction Page · Batch Prediction · Expert Chat · History

---

## 🚀 What It Does

This application allows semiconductor engineers and researchers to:

- **Upload a wafer image** and instantly detect the type of defect present
- **Validate inputs** — non-wafer images are automatically rejected using Groq vision AI
- **Get expert analysis** powered by LLaMA 3.3 70B via Groq, covering root cause, severity, corrective actions, and batch decisions
- **Chat with an AI wafer expert** to ask follow-up questions about the defect
- **Run batch predictions** — upload up to 10 images at once, processed one by one with invalid image detection per file
- **Analyze yield** using the Murphy Yield Model to estimate die yield percentage
- **Draw wafer patterns** manually and run prediction on hand-drawn maps
- **Track history** of all predictions across single and batch sessions

---

## 🧠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React + TypeScript | UI framework |
| Vite | Build tool |
| React Router | Page navigation |
| Recharts | Class probability bar charts |
| Framer Motion | Animations and transitions |
| Axios | API communication |
| Vercel | Deployment and hosting |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| PyTorch | Deep learning inference |
| EfficientNet-B3 | Wafer defect classification model |
| torchvision | Image transforms and pretrained models |
| OpenCV | Image processing and wafer masking |
| Pillow | Image loading and conversion |
| Groq API | LLM inference (LLaMA 3.3 70B + LLaMA 4 Scout vision) |
| Hugging Face Hub | Model weights hosting and download |
| Docker | Containerized deployment |
| Hugging Face Spaces | Backend hosting |

---

## 🤖 AI Models Used

### 1. EfficientNet-B3 — Defect Classifier
- Custom trained on the **WM-811K Wafer Map Dataset**
- Classifies wafer images into **9 defect categories**:
  - `Center` `Donut` `Edge-Loc` `Edge-Ring` `Loc` `Near-full` `Random` `Scratch` `none`
- Hosted on Hugging Face: [`totz07/wafer-defect-classifier`](https://huggingface.co/totz07/wafer-defect-classifier)

### 2. LLaMA 3.3 70B (via Groq) — Expert Analysis & Chat
- Generates structured expert analysis for each prediction
- Powers the **Know More** chat feature — answers wafer and semiconductor-related questions only
- Fast inference via Groq's LPU hardware

### 3. LLaMA 4 Scout 17B Vision (via Groq) — Wafer Validation
- Vision model that checks whether an uploaded image is a valid wafer map
- Rejects non-wafer images before running the classifier
- Handles all wafer image types: heatmaps, binary maps, grayscale scans, circular defect patterns

---

## 📐 Murphy Yield Model

The app uses the **Murphy Yield Model** to estimate wafer die yield:

```
Yield = ((1 - e^(-A·D)) / (A·D))²
```

Where:
- `A` = Die area (cm²)
- `D` = Defects per unit area (derived from defect density analysis)

Yield thresholds determine the batch decision:
- `≥ 70%` → **SAVE** ✅
- `40% – 69%` → **REVIEW** ⚠️
- `< 40%` → **SCRAP** ❌

---

## 🗂️ Project Structure

```
Wafer-Detection-App/          # Frontend (React + TypeScript)
├── src/
│   ├── api/
│   │   └── client.ts          # Axios API calls (predict, explain, chat, batch)
│   ├── components/
│   │   ├── Sidebar.tsx         # Navigation + wafer config + session stats
│   │   ├── ResultPanel.tsx     # Prediction results + expert analysis + chat
│   │   └── PageHeader.tsx      # Page banner component
│   ├── context/
│   │   └── HistoryContext.tsx  # Global prediction history (localStorage)
│   ├── pages/
│   │   ├── Prediction.tsx      # Single image prediction page
│   │   ├── BatchPrediction.tsx # Multi-image batch prediction page
│   │   ├── DrawMode.tsx        # Hand-draw wafer map + predict
│   │   ├── YieldAnalysis.tsx   # Yield curve visualization
│   │   └── History.tsx         # Full prediction history table
│   └── styles/
│       └── global.css          # App-wide CSS variables and components

Wafer-Defect-API/             # Backend (FastAPI + Python)
├── main.py                    # FastAPI app, all endpoints
├── model_utils.py             # EfficientNet model, prediction, Murphy yield
├── nlp_utils.py               # Groq LLM: validation, explanation, chat
├── requirements.txt           # Python dependencies
└── Dockerfile                 # Container setup for HF Spaces
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check + model status |
| `GET` | `/classes` | List of 9 defect classes |
| `POST` | `/predict` | Single image defect prediction |
| `POST` | `/predict-draw` | Predict from base64 drawn image |
| `POST` | `/explain` | LLM expert analysis for a result |
| `POST` | `/chat` | Wafer expert chat (multi-turn) |
| `POST` | `/yield-curve` | Murphy yield curve data points |

---

## ⚙️ Features Breakdown

### 🔍 Single Prediction
- Upload PNG/JPG/JPEG wafer image
- Groq vision validates if it's a real wafer image
- EfficientNet-B3 classifies the defect type
- Murphy Yield Model calculates die yield percentage
- Batch decision: SAVE / REVIEW / SCRAP
- Clear Image button on success or invalid error

### 📦 Batch Prediction
- Upload up to 10 wafer images at once
- Each image processed one by one automatically
- Invalid images flagged individually — rest continue processing
- Batch summary: total, success count, invalid count, average yield
- All successful predictions saved to history as `BATCH-001`, `BATCH-002`, etc.

### 💬 Know More — Expert Chat
- Appears after expert analysis loads
- Context-aware: AI already knows the defect type, yield, and decision
- Answers only wafer and semiconductor-related questions
- Powered by LLaMA 3.3 70B on Groq

### 🎨 Draw Mode
- HTML5 canvas to draw wafer defect patterns manually
- Circular wafer mask applied automatically
- Predict on hand-drawn maps

### 📈 Yield Analysis
- Interactive yield curve based on Murphy model
- Adjust defect ratio and die area parameters

### 📋 History
- Full prediction log stored in localStorage
- Shows wafer ID, defect type, confidence, yield, decision, timestamp
- Includes both single and batch predictions

---

## 🛠️ Local Development

### Frontend
```bash
cd Wafer-Detection-App
npm install
cp .env.example .env        # Set VITE_API_BASE_URL
npm run dev
```

### Backend
```bash
pip install -r requirements.txt
cp .env.example .env        # Set GROQ_API_KEY
uvicorn main:app --reload --port 7860
```

### Environment Variables

**Frontend `.env`**
```
VITE_API_BASE_URL=http://localhost:7860
```

**Backend `.env`**
```
GROQ_API_KEY=your_groq_api_key_here
ALLOWED_ORIGINS=http://localhost:5173
```

---

## 🐳 Docker (Backend)

```bash
docker build -t wafer-defect-api .
docker run -p 7860:7860 -e GROQ_API_KEY=your_key wafer-defect-api
```

---

## 📊 Dataset

Model trained on the **WM-811K Wafer Map Dataset** — a publicly available semiconductor wafer map dataset containing 811,457 wafer maps across 9 defect pattern classes.

---

## 👩‍💻 Author

**TOTZ** — Built with Ego (using React, FastAPI, PyTorch, and Groq)

---

## 📄 License

This project is licensed under the MIT License.
