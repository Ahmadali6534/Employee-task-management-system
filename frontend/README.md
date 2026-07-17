# Employee Task Management System — Frontend

React + TypeScript + Vite frontend for the Employee Task Management System, built against the FastAPI backend.

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router v6
- Axios (with JWT interceptor)
- Context API (auth state)
- Session Storage (token persistence)
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
├── api/axios.ts            Axios instance, JWT interceptor, session storage helpers
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
- The JWT is stored in `sessionStorage` (cleared on tab close and on logout), per the SRS requirement.
- A 401 response from any API call automatically clears the session and redirects to `/login`.
