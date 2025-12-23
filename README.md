# LinguaBoost (Spanish Sentence Trainer)

Full-stack Spanish sentence translation trainer.

- Backend: Django + Django REST Framework (token auth) + email verification + optional email-based 2FA.
- Frontend: React (Vite) with an `/api` proxy to the backend.
- AI: Uses OpenAI when `OPENAI_API_KEY` is set; otherwise falls back to deterministic offline behavior.

## Features

- Dictionary (per-user words)
- AI sentence generation (configurable level/topic/tense/sentence type)
- Translation checking (with explanation)
- Tutor chat
- Progress + Statistics (accuracy, attempts, streaks)

## Run with Docker (recommended)

From the repo root:

```bash
docker-compose up --build
```

Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/

## Run locally (without Docker)

### Backend

```bash
python -m venv .venv
.
\.venv\Scripts\python.exe -m pip install -r requirements.txt
\.venv\Scripts\python.exe manage.py migrate
\.venv\Scripts\python.exe manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend.

## Environment variables

Create a local `.env` file (do NOT commit it).

### OpenAI

- `OPENAI_API_KEY` (optional)
	- If missing/empty, the backend uses offline fallbacks for generation/checking.
- `OPENAI_MODEL_NAME` (optional, default: `gpt-4o-mini`)

### Email (verification codes + optional 2FA)

```text
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=you@example.com
```

## UI: Statistics meaning

The avatar dropdown (top-right) includes **Statistics**.

- **Attempts**: counted when you submit a non-empty answer and press **Check**.
- **Correct / Wrong**: how many attempts were marked correct/incorrect.
- **Accuracy**: `Correct / Attempts`.
- **Sessions / Days practiced / Streaks**: based on days you generated a session (generated sentences).

## API endpoints (high-level)

- Words:
	- `GET /api/words/`
	- `POST /api/words/`
	- `PUT /api/words/{id}/`
	- `DELETE /api/words/{id}/`
- Trainer:
	- `POST /api/generate/`
	- `POST /api/check/`
	- `POST /api/chat/`
	- `GET /api/progress/`
- Auth:
	- `POST /api/auth/register/`
	- `POST /api/auth/verify-registration/`
	- `POST /api/auth/login/`
	- `POST /api/auth/verify-2fa/`
	- `POST /api/auth/toggle-2fa/`
	- `GET /api/auth/me/`
	- `POST /api/auth/logout/`

## Security notes

- Never commit `.env` or API keys. If a key was committed at any point, rotate it.
