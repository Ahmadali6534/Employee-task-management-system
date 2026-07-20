# Employee Task Management System — Frontend

React + TypeScript + Vite frontend for the Employee Task Management System, built against the FastAPI backend.

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router v6
- Axios (`withCredentials`, session cookie based)
- Context API (auth state)
- httpOnly session cookie (token persistence)
- Tailwind CSS

## Prerequisites

- Node.js 18+
- Backend API running (see `backend/README.md`), by default at `http://127.0.0.1:8000`

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` if your backend runs on a different URL:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Run (development)

```bash
npm run dev
```

App runs at `http://localhost:5173`. The backend's CORS config must allow this origin (already configured in `backend/app/main.py`).

## Build (production)

```bash
npm run build
npm run preview
```

Output is generated in `dist/`.

## Project Structure

```
src/
├── api/axios.ts            Axios instance (withCredentials), 401 handling
├── components/
│   ├── AppLayout.tsx        Sidebar/topbar shell for authenticated pages
│   └── ProtectedRoute.tsx   Auth + admin-only route guard
├── context/AuthContext.tsx  Login/logout, current user, auth state
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Users.tsx            Admin-only user management
│   ├── Tasks.tsx            Task list, search/filter/sort/pagination
│   ├── TaskDetail.tsx       Task edit, status update, file attachments
│   └── Profile.tsx          Account info, password change
├── types/index.ts           Shared TypeScript interfaces
├── App.tsx                  Route definitions
└── main.tsx                 App entry point
```

## Roles

- **Admin** — full access: manage users, create/edit/delete tasks, assign tasks, manage attachments.
- **Employee** — view tasks assigned to them (`/tasks/my-tasks`) and update task status only.

## Notes

- Login calls `POST /auth/login` with a form-urlencoded body (`OAuth2PasswordRequestForm` on the backend), not JSON.
- The session token is stored in an **httpOnly cookie** set by the backend on `/auth/login` — client-side JavaScript cannot read it, so an XSS bug in this app can no longer exfiltrate a live session. The frontend never sees or stores the token directly; every request just relies on `withCredentials: true` to attach the cookie automatically.
- On load, the app calls `GET /auth/me` to check whether a valid session cookie exists, since there's no local flag to check anymore.
- Logout calls `POST /auth/logout`, which clears the cookie server-side.
- A 401 response from any API call automatically clears local auth state and redirects to `/login`.