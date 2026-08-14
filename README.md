# Signal Clone

## NOTE:-

The submitted url is changed.
The correct url of deployment is -> https://secure-messaging-platform-t3ku-sigma.vercel.app

## Overview

Signal Clone is a Signal-inspired messaging application implemented as a full-stack example project. It provides a React/Next.js frontend and a FastAPI backend to demonstrate user authentication, one-to-one and group conversations, real-time messaging, presence updates, and UI features such as stories, calls, and settings with a light/dark theme.

## Features

- User authentication (register/login/logout)
- One-to-one (direct) conversations
- Group conversations (create group, add/remove members)
- Real-time messaging over WebSocket
- Online / offline presence updates
- Messages (send, receive, delivery/read status updates)
- Attachments (upload/serve static files)
- Stories (frontend UI present)
- Calls UI (frontend view for calls)
- Settings UI with theme and chat color persistence

> Only features implemented in the repository are listed above.

## Tech Stack

- Frontend: Next.js (App Router) with React and TypeScript
- Backend: FastAPI (Python)
- Database: SQLAlchemy (default: SQLite) — configured via `DATABASE_URL`
- Real-time communication: WebSocket endpoint provided by FastAPI (`/ws`)
- Other tooling: Uvicorn (ASGI server), python-dotenv, PyJWT

## Project Structure

Top-level layout:

- `frontend/` — Next.js application (React + TypeScript)
  - `package.json` — npm scripts (`dev`, `build`, `start`)
  - `app/` — Next.js app routes and global styles (`globals.css`)
  - `components/` — UI components (chats, settings, navigation, etc.)
  - `lib/` — client helpers (API wrapper, auth storage, presence helpers)

- `backend/` — FastAPI application
  - `app/main.py` — application entrypoint (routers, middleware, static file mount)
  - `app/config.py` — environment-driven settings and defaults
  - `app/routers/` — API routes (`auth`, `users`, `conversations`, `messages`, `attachments`, `ws`, etc.)
  - `requirements.txt` / `requirements-dev.txt` — Python dependencies

- `static/` — uploads placeholder used by backend static mount
- `scripts/` — assorted utility scripts used during development

## Prerequisites

- Node.js (recommended v18+ or compatible with Next.js 15)
- npm (bundled with Node.js)
- Python 3.10+ (compatible with the listed Python dependencies)
- pip for Python package installation

Optional (for running tests / development):
- `virtualenv` or other Python environment manager

## Installation & Setup

1. Clone the repository

```bash
git clone <repository-url>
cd SignalClone
```

2. Install frontend dependencies

```bash
cd frontend
npm install
```

3. Install backend dependencies

```bash
cd ../backend
python -m venv .venv     # optional, recommended
source .venv/bin/activate  # on Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

4. Configure environment variables

The backend supports a `.env` file (via `python-dotenv`). Common variables:

- `DATABASE_URL` — SQLAlchemy database URL (default: `sqlite:///./signal_clone.db`)
- `CORS_ORIGINS` — comma-separated list of allowed origins (default includes `http://localhost:3000`)
- `AUTH_SECRET_KEY` — JWT secret (default is a development-only value)
- `DEV_OTP` — development OTP value used during registration flows
- `ACCESS_TOKEN_EXPIRE_MINUTES` — token expiry in minutes

Create a `.env` file in `backend/` if you need to override defaults. Do NOT commit secrets to version control.

5. Start the backend (development)

From the `backend/` directory run:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

By default the server will be available at `http://127.0.0.1:8000` and the WebSocket endpoint at `ws://127.0.0.1:8000/ws`.

6. Start the frontend (development)

From the `frontend/` directory run:

```bash
npm run dev
```

The Next.js app runs on `http://localhost:3000` by default. To point the frontend to a different backend URL, set the environment variable `NEXT_PUBLIC_API_URL` before starting the dev server.

## Demo Credentials

### Demo Login

Username:
`yousra`

Password:
`demo-password`

These credentials are provided for demonstration/testing purposes only.

## Running the Application

- Backend API: `http://127.0.0.1:8000`
- Frontend UI: `http://localhost:3000`

The frontend expects the backend API at `http://localhost:8000` by default (`NEXT_PUBLIC_API_URL` can override this).

## UI

The frontend UI is inspired by Signal Desktop and includes:

- Chats (conversation list and thread)
- Stories (UI present in the app routes)
- Calls (UI screens for initiating/mentioning calls)
- A left navigation rail and settings area with light/dark theme support and chat color persistence

## Notes

- The backend ships with safe local defaults (SQLite DB and development JWT secret). For production use, change `AUTH_SECRET_KEY` and configure a production database via `DATABASE_URL`.
- The project serves uploaded files from the `backend/static` directory at `/static`.
- WebSocket real-time features are implemented in the backend at `/ws`; the frontend connects using the configured `NEXT_PUBLIC_API_URL`.
- Tests: backend development/test dependencies are listed in `requirements-dev.txt`. Run Python tests with `pytest` from the `backend/` directory after installing dev dependencies.

## License

License information has not been specified.
