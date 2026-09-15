# CivicPulse — Frontend ↔ Backend Integration

The React (Vite) frontend now talks to the FastAPI backend over a shared API layer.

## How it's wired

- **API base URL** comes from `VITE_API_BASE_URL` (see `.env`). It defaults to `/api`,
  which the Vite dev server proxies to the backend.
- **Dev proxy** (`vite.config.js`) forwards `/api` and `/uploads` to
  `VITE_BACKEND_ORIGIN` (default `http://localhost:8000`), so there's no CORS friction locally.
- **API client** (`src/lib/apiClient.js`) attaches the JWT as `Authorization: Bearer <token>`,
  sends JSON or `FormData`, and normalizes errors into `ApiError`.
- **Service layer** (`src/lib/services.js`) maps each backend endpoint to a function,
  grouped by router: `authService`, `complaintService`, `adminService`,
  `analyticsService`, `mapService`.
- **Auth** (`src/context/AuthContext.jsx`) stores the token in `localStorage`
  (key `civicpulse.token`), restores the session via `/api/auth/me`, and exposes
  `login`, `register`, `logout`, `user`, `isStaff`.
- **Route guards** (`src/routes/ProtectedRoute.jsx`) protect all `/admin/*` routes
  and require an `officer`/`admin` role.

## Wired pages

- **Login** (`/auth/login`) — real `POST /api/auth/login`, with demo-account quick fill.
- **Report Issue** (`/citizen/report`) — live AI analysis (`/api/complaints/analyze`),
  geolocation capture, and multipart submission (`POST /api/complaints`).
- **Complaint Tracking** (`/citizen/complaints/:id`) — loads the complaint, comments,
  and audit trail; resolve/reopen and commenting for signed-in users.
- **Admin Dashboard** (`/admin`) — KPIs, "Needs Attention" queue, and issue distribution
  from `/api/admin/dashboard/*` and `/api/admin/analytics/distribution`.
- **Complaint Queue** (`/admin/complaints`) — server-side filtering, search, and pagination
  via `/api/admin/complaints`, bulk assign, and CSV export.
- **Complaint Operations** (`/admin/complaints/:id`) — full detail view with status
  transitions, assign, dispatch, escalate, internal notes, citizen notify, and audit export.
- **Analytics** (`/admin/analytics`) — KPIs, trajectory, SLA ring, distribution, aging,
  department performance, and AI insight signals across a selectable period.
- **Civic Intelligence Map** (`/admin/map`) — real complaint coordinates projected onto the
  GIS canvas, with live clusters, fleet telemetry, layer toggles, and a click-through inspector.

> The map projects lat/lng onto the existing hand-drawn SVG via bounding-box normalization
> rather than a tile-based map library, preserving the original visual design.

## Running locally

1. **Backend** (from `backend/`):
   ```
   pip install -r requirements.txt
   python seed.py          # creates demo accounts + sample complaints
   uvicorn app.main:app --reload   # serves on http://localhost:8000
   ```

2. **Frontend** (from `frontend/`):
   ```
   npm install
   npm run dev             # serves on http://localhost:5173
   ```

3. Sign in with a demo account:
   - Admin: `admin@civicpulse.gov` / `admin123`
   - Officer: `officer@civicpulse.gov` / `officer123`
   - Citizen: `citizen@civicpulse.gov` / `citizen123`

## Production build

Set `VITE_API_BASE_URL` to the absolute API URL (e.g. `https://api.example.com/api`)
before `npm run build`, since the dev proxy is not used in a static build.
