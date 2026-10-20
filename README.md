# DeepThought Cold-Call Companion

A prospect-centered cold-call companion for the DeepThought FDE assessment. The product uses an eight-stage call workflow, structured AI-assisted review, source evidence, and persistent prospect/call history.

## Stack
- Frontend: Next.js (App Router, TypeScript), deployed to Vercel
- Backend: FastAPI, deployed to Render
- Database: Supabase Postgres
- AI/transcription: provider selected after checking current free-tier availability and limits; all secret keys remain on the backend

## Current scaffold status
This repository contains the first foundation: project structure, initial UI shell, FastAPI health endpoint and API contracts, and the initial Supabase schema. It is not deployed yet, and no credentials or URLs are assumed.

## Local setup
### Backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Health check: http://127.0.0.1:8000/health
API docs: http://127.0.0.1:8000/docs

### Frontend
Install a current Node.js LTS release, then:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000.

The frontend shell can run independently during the initial UI work. API integration will be enabled after the backend and database contracts are verified.

## Database
Run `database/schema.sql` in the Supabase SQL Editor. Review the comments on ownership/authentication before production use. Do not use a service-role key in browser code.

## Planned feature coverage
- Prospect search, create, profile, and chronological call history
- Eight-stage active-call flow with early close and per-stage persistence
- Manual notes, audio upload, optional browser recording, transcription
- Structured LLM extraction with evidence, uncertainty, correction and review
- Purpose library with immutable per-call wording snapshots
- Prospect facts, repeated-call comparison, pending next steps
- Health endpoint, deployment, README, six-minute demo checklist

## Security and truthfulness rules
- AI suggestions are not facts until reviewed; preserve the source text.
- Never overwrite prior call records when a new call is made.
- A stage's status is scoped to one call, not copied from previous calls.
- A technical error is not a call-stage result.
- Respect do-not-contact requests; never recommend pressure tactics.
- Audio capture depends on the user's device and routing. A browser microphone does not guarantee both sides of a normal phone call are captured.
