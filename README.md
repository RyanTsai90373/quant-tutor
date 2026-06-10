# Quant Tutor

Personal quant research tutor. Web app where you converse with an LLM, it finds relevant strategy papers, teaches the core idea, runs backtests on Taiwan market data, and shows results.

See `STUDY_PLAN.md` for the full plan.

## Setup

1. Copy `.env.example` to `.env` and fill in `ANTHROPIC_API_KEY`.
2. Install backend deps: `cd backend && uv sync`
3. Install frontend deps: `cd frontend && npm install`

## Run (dev)

Two terminals:

```bash
# terminal 1 — backend on :8000
cd backend
uv run uvicorn main:app --reload --port 8000
```

```bash
# terminal 2 — frontend on :5173
cd frontend
npm run dev
```

Open <http://localhost:5173>.
# quant-tutor
