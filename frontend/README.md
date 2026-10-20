# PlanzyPop AI

> **Your vibe. Your plan. Your party.**

A responsive celebration-planning frontend for Hack2Skill Challenge 5. The app includes events, a demo AI planning wizard, deterministic budget calculations, checklists, vendor organization, inspiration favorites, settings, JSON export, and browser-local persistence.

## Run locally

```bash
# 1. Install dependencies
pnpm install

# 2. (Optional) Copy environment template to configure backend API base URL
cp .env.example .env

# 3. Start development server
pnpm dev
```

Use `pnpm build` for a production build. To connect to the FastAPI backend, ensure `VITE_API_BASE_URL=http://127.0.0.1:8000` is set in `frontend/.env`.

## AI and API status

The current planner is clearly labelled **Demo mode** and returns a curated sample plan. No API key is used or stored in the browser. `src/services/api.ts` provides typed integration points for:

- `GET /health`
- `POST /api/plan`
- `POST /api/chat`

Connect these routes to the Python backend for real Gemini responses. Keep the Gemini API key on the server only.

## Data

Demo data is saved to `localStorage`. Settings includes JSON export and a confirmed reset action. Financial totals are calculated locally and never delegated to AI.

## Images

Inspiration photography is served from Unsplash and credited in the interface.
