# PlanzyPop AI — Backend Service

> **"Your vibe. Your plan. Your party."**

FastAPI backend service powering the **PlanzyPop AI** celebration planning system for Hack2Skill Challenge 5.

## Architecture

- **Framework**: FastAPI (Python 3.11+)
- **Server**: Uvicorn ASGI
- **Validation**: Pydantic v2
- **AI Integration**: Google's official GenAI Python SDK (`google-genai`)
- **Testing**: Pytest & FastAPI TestClient
- **Deterministic Budget Arithmetic**: Financial amounts are deterministically calculated in application logic to ensure zero AI arithmetic hallucination.

## Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check, app metadata, and Gemini configuration status |
| `GET` | `/` | Service root and navigation links |
| `POST` | `/api/plan` | Validates event details and generates structured event roadmap |
| `POST` | `/api/chat` | Contextual event assistant providing advice & tips |
| `GET` | `/docs` | Interactive Swagger / OpenAPI documentation |

## Windows Setup Instructions

Open a PowerShell terminal in the repository root:

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Create the Python virtual environment
py -m venv .venv

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Install backend dependencies
py -m pip install -r requirements.txt

# 5. Create local environment configuration
Copy-Item .env.example .env

# 6. (Optional) Configure your Gemini API key in backend/.env:
# Open .env and set GEMINI_API_KEY=your_actual_key

# 7. Start the backend development server
py -m uvicorn app.main:app --reload --port 8000
```

## Running Automated Tests

```powershell
.\.venv\Scripts\python.exe -m pytest tests -v
```

All 8 API tests cover:
- Health & metadata checks
- Valid event planning (camelCase & snake_case)
- Deterministic budget summation
- Payload validation & rejection (422)
- Assistant chat & fallback handling
- CORS headers
