# Spanish Sentence Trainer (MVP)

Full-stack MVP for a Spanish sentence translation trainer. Backend: Django + DRF + token auth + email verification/optional 2FA. Frontend: React (Vite). Uses Google Gemini (gemini-2.0-flash default) when `GOOGLE_API_KEY` is provided; otherwise falls back to deterministic offline behavior.

## Quick start (backend)
1) Create/activate venv (already at `.venv` if you use `python -m venv .venv`).
2) Install deps:
```
C:/Users/User/OneDrive/Рабочий стол/spanishLearningSystemVSCODE/.venv/Scripts/python.exe -m pip install -r requirements.txt
```
3) Run migrations:
```
C:/Users/User/OneDrive/Рабочий стол/spanishLearningSystemVSCODE/.venv/Scripts/python.exe manage.py migrate
```
4) Start API:
```
C:/Users/User/OneDrive/Рабочий стол/spanishLearningSystemVSCODE/.venv/Scripts/python.exe manage.py runserver
```

### Auth & email
- Registration requires email + password. A 6-digit code is emailed; verification activates the account and issues a token.
- Login sends 2FA code only if enabled in profile (off by default).
- Environment for SMTP (Gmail-friendly):
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=you@example.com
```

### API endpoints
- `POST /api/words/` CRUD (ModelViewSet) for user words (demo user fallback).
- `POST /api/generate/` body: `level`, `length`, `num_sentences (5-10)` → sentences + session info, enforces no >3 same word in a row; keeps last 10 words.
- `POST /api/check/` body: `sentence`, `translation` → correctness + fixed translation + explanation.
- Auth routes: `/api/auth/register/`, `/api/auth/verify-registration/`, `/api/auth/login/`, `/api/auth/verify-2fa/`, `/api/auth/me/`, `/api/auth/logout/`, `/api/auth/toggle-2fa/`.

## Quick start (frontend)
```
cd frontend
npm install
npm run dev
```
Vite dev server proxies `/api` → `http://127.0.0.1:8000`.

## Environment
- `GOOGLE_API_KEY` (required for live LLM). If absent, backend uses deterministic offline fallbacks.
- `GENAI_MODEL_NAME` (default `gemini-2.0-flash`).
- SMTP variables above for sending codes.

## Notes
- Per-user data: words/exercises tied to the authenticated user; token auth is used by the frontend.
- Exercises are stored and linked to sessions; `last_words_used` tracks recent IDs to prevent >3 repeats and keeps a rolling 10 history.
- Frontend enforces 5–10 sentences to match backend.
