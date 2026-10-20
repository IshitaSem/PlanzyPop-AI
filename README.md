# PlanzyPop AI

> **"Your vibe. Your plan. Your party."**

PlanzyPop AI is an all-in-one celebration and event planning application built for **Hack2Skill Challenge 5**. It pairs a responsive React frontend with a secure FastAPI backend integrating Google's official Gemini AI SDK.

---

## Project Structure

```text
PlanzyPop-AI/
├── frontend/                     # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── services/
│   │   │   └── api.ts            # Typed API client connecting to backend
│   │   ├── App.tsx               # Main application and 8 event sections
│   │   ├── main.tsx              # React mounting root
│   │   └── index.css             # Tailwind v4 and design system styles
│   ├── public/                   # Static icons and assets
│   ├── .env.example              # Frontend environment template
│   ├── package.json              # Frontend scripts and dependencies
│   ├── vite.config.ts            # Vite configuration
│   └── README.md                 # Frontend documentation
│
├── backend/                      # FastAPI Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI entrypoint with CORS
│   │   ├── routes/               # API route handlers
│   │   │   ├── health.py         # GET /health
│   │   │   ├── planner.py        # POST /api/plan
│   │   │   └── chat.py           # POST /api/chat
│   │   ├── services/
│   │   │   └── gemini_service.py # Official Google GenAI SDK integration
│   │   ├── schemas/
│   │   │   └── planner.py        # Pydantic request & response validation
│   │   └── core/
│   │       └── config.py         # Environment configuration loader
│   ├── tests/
│   │   └── test_api.py           # Automated Pytest suite
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   └── README.md                 # Backend documentation
│
├── .gitignore                    # Root gitignore for Node, Python, and secrets
└── README.md                     # Root project documentation
```

---

## Getting Started on Windows

### 1. Backend Setup

Open a PowerShell terminal:

```powershell
# Navigate to backend
cd backend

# Create and activate virtual environment
py -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
py -m pip install -r requirements.txt

# Create .env from template
Copy-Item .env.example .env

# (Optional) Open .env and add your Gemini API key:
# GEMINI_API_KEY=your_actual_key_here

# Start the FastAPI server on port 8000
py -m uvicorn app.main:app --reload --port 8000
```

The backend will be live at:
- **API Root**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend Setup

Open a second PowerShell terminal:

```powershell
# Navigate to frontend
cd frontend

# Install dependencies (using pnpm or npm)
pnpm install

# Start the Vite development server
pnpm dev
```

The frontend will be live on your configured Vite port (typically `http://localhost:5173` or `http://localhost:8443`).

---

## Gemini AI Integration & Security

1. **Server-Side Only**: `GEMINI_API_KEY` is loaded exclusively inside the FastAPI backend via `backend/.env`. It is **never** bundled into the client build, committed to Git, or exposed in browser storage.
2. **Automatic Fallback (Curated Demo Mode)**: If no Gemini key is provided, or if the backend is unreachable or encounters an error, the frontend automatically falls back to curated demonstration data. Mock output is clearly labelled as demo mode and never falsely represented as live Gemini output.
3. **Deterministic Financial Math**: All budget calculations, allocations, and expense trackers are calculated with deterministic application arithmetic in Python and TypeScript, preventing AI hallucination in financial totals.

---

## Verification & Testing

### Run Backend Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -v
```

Tests verify:
- Health check and metadata output
- Plan generation with both camelCase and snake_case request validation
- Strict deterministic budget math (sum of category amounts equals budget total)
- Invalid payload rejection (422 status)
- Event assistant chat and contextual advice
- CORS preflight header validation

### Run Frontend Production Build

```powershell
cd frontend
pnpm build
```

Builds the production-ready distribution in `frontend/dist/`.
