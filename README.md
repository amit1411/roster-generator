# Badminton Session Planner

A web app for planning badminton doubles sessions, running live scoring, and reviewing completed-session history and player stats.

## Project Docs

- `AI_CONTEXT.md` for future AI chats/agents
- `DATABASE_MODEL.md` for current persistence design
- `TESTING.md` for build and Playwright notes
- `NEW-FEATURES.md` for backlog and feature status

## Quick Start

### Postgres (Shared Sessions)

Start the local Postgres database:

```bash
docker compose up -d postgres
```

The default local connection string is:

```bash
postgresql+psycopg://postgres:postgres@localhost:5433/badminton_roster
```

### Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

If you prefer, copy `backend/.env.example`. The backend now loads `backend/.env` automatically for local development.

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Stop Postgres

```bash
docker compose down
```

To remove the local database volume too:

```bash
docker compose down -v
```

## Features

- Player directory with stable IDs, editable names, and soft-delete/restore behavior
- Planner wizard with player selection from the directory and tap-to-pair UX
- Organizer-token-gated session creation
- Active Sessions page for ongoing sessions
- History page for completed sessions only
- Player Stats page with completed-session analytics
- Round-robin and league+knockout session formats
- Live scoring, standings, bracket, and final results
- Session rename, share links, and view-only/scorer access separation
- Optional backend caching with memory or Redis
- Playwright E2E coverage for desktop, mobile, and opt-in staging runs
