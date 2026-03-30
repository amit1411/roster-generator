# Badminton Roster Generator

A web app for generating balanced badminton doubles rosters with constraint-based scheduling.

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
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5433/badminton_roster"
uvicorn app:app --reload --port 8000
```

If you prefer, copy `backend/.env.example` and export the same value from your shell before starting the backend.

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

- Add/remove players and define fixed pairs
- Configure courts, rounds, consecutive game limits, pair settings
- Fixed pairs only play together after a configurable start round (default: round 5)
- Balanced rest distribution across all players
- Download generated roster as CSV
- Constraint violation reporting
