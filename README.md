# Badminton Roster Generator

A web app for generating balanced badminton doubles rosters with constraint-based scheduling.

## Quick Start

### Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Features

- Add/remove players and define fixed pairs
- Configure courts, rounds, consecutive game limits, pair settings
- Fixed pairs only play together after a configurable start round (default: round 5)
- Balanced rest distribution across all players
- Download generated roster as CSV
- Constraint violation reporting
