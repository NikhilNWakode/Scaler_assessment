# Zoom Clone — Video Conferencing Platform

A functional video conferencing web application that replicates Zoom's design, user
experience, and core meeting workflows: instant meetings, joining by ID or invite link,
scheduled meetings, a live meeting room with real audio/video (WebRTC), in-meeting chat,
and host controls.

## Tech Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | Next.js 15 (App Router, SPA-style client components), TypeScript, Tailwind CSS, lucide-react |
| Backend   | Python, FastAPI, WebSockets (starlette)                            |
| Database  | SQLite via SQLAlchemy 2.0 ORM                                      |
| Real-time | Native WebRTC (mesh) with the FastAPI WebSocket as signaling server |

## Features

### Core
- **Landing dashboard** — Zoom-style home with navbar (profile/settings placeholders),
  live clock card, the four action tiles (New Meeting / Join / Schedule / Share Screen),
  and **Upcoming** & **Recent** meeting sections with copy-invitation and start/rejoin actions.
- **Instant meetings** — one click creates a meeting with a unique Zoom-style 11-digit
  meeting ID + passcode + shareable invite link, and drops the host into the room.
- **Join meeting** — join via meeting ID *or* pasted invite link; meeting existence is
  validated against the backend before navigating; every participant enters a display
  name on a Zoom-style pre-join screen (with camera preview and mic/cam toggles).
- **Schedule meetings** — title, description, date & time picker, duration; stored in
  SQLite, auto-generated meeting link shown on success, appears under Upcoming
  (with delete/cancel support).

### Bonus
- **Real video & audio** between participants (WebRTC mesh, perfect-negotiation signaling
  over the backend WebSocket). Open the invite link in a second tab/device to try it.
- **Host controls** — Mute All, mute a single participant, remove a participant,
  End Meeting for everyone.
- **In-meeting chat** with unread badge, **screen sharing**, participants panel,
  live mute/camera state on video tiles, meeting timer.
- **Responsive design** — dashboard and meeting room adapt from mobile to desktop.
- Graceful fallbacks: no camera/mic → avatar tiles, join-only mode still works.

## Project Structure

```
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI app, CORS, router wiring, DB init + seeding
│       ├── database.py      # SQLite engine / session
│       ├── models.py        # SQLAlchemy models (User, Meeting, Participant)
│       ├── schemas.py       # Pydantic request/response schemas
│       ├── seed.py          # sample data (default user + upcoming/recent meetings)
│       ├── ws.py            # WebSocket rooms: presence, WebRTC signaling, chat, host controls
│       └── routers/
│           ├── meetings.py  # create / schedule / join / list / end endpoints
│           └── users.py     # default logged-in user
└── frontend/
    ├── app/
    │   ├── page.tsx              # dashboard
    │   └── meeting/[code]/page.tsx  # pre-join → meeting room flow
    ├── components/               # navbar, tiles, modals, meeting room UI
    └── lib/
        ├── api.ts                # typed API client
        └── useMeetingRoom.ts     # WebSocket + WebRTC mesh hook
```

## Database Schema

```
users                      meetings                        participants
─────                      ────────                        ────────────
id            PK           id               PK             id           PK
name                       meeting_code     UNIQUE (11-digit)  meeting_id   FK → meetings.id
email         UNIQUE       title                           user_id      FK → users.id (null = guest)
avatar_color               description                     display_name
created_at                 passcode                        is_host
                           host_id          FK → users.id  is_muted
                           meeting_type     instant|scheduled  joined_at
                           status           waiting|active|ended  left_at
                           scheduled_at
                           duration_minutes
                           created_at / started_at / ended_at
```

Relationships: a **user** hosts many **meetings**; a **meeting** has many
**participants**; a participant may reference a user or be a guest (name only).
Meeting lifecycle: `waiting → active → ended` (scheduled meetings flip to `active`
when the first person joins).

## Running Locally

### 1. Backend (port 8000)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows   (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The SQLite database (`zoom_clone.db`) is created and **seeded automatically** on first
start (default user + sample upcoming/recent meetings). API docs: http://localhost:8000/docs

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The frontend defaults to `http://localhost:8000` for the
API; override with `NEXT_PUBLIC_API_URL` (see `frontend/.env.example`).

### Trying multi-participant video
Start a meeting, copy the invite link (info icon in the top bar), and open it in a
second browser tab or another device on the same network. Grant camera/mic permissions
in both — the tiles connect peer-to-peer.

## Deployment

- **Backend → Render**: repo contains `render.yaml` (root dir `backend`, start command
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Set `FRONTEND_URL` to your
  Vercel URL for CORS.
- **Frontend → Vercel**: import the repo, set **Root Directory** to `frontend`, and add
  env var `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`.

## Assumptions

- **No authentication** (per the brief): a default user ("Nikhil Wakode") is treated as
  logged in; whoever opens the dashboard acts as that user. Joining via a link is a
  guest flow — only a display name is required.
- Host identity in a room is derived from starting the meeting from the dashboard
  (`?host=1`), since there is no login to verify against.
- Passcodes are generated and shown in invitations (like Zoom) but not enforced on join,
  to keep the demo flow frictionless.
- Video uses a **WebRTC mesh** (every peer connects to every peer), which is ideal for
  small demo meetings; a production system would use an SFU (e.g. LiveKit/mediasoup).
- A free STUN server is used; on restrictive corporate NATs a TURN server would be
  needed for media to flow.
- SQLite on Render's free tier is ephemeral — the DB resets (and re-seeds) on redeploy.

## AI Tools

Development was assisted by Claude (Anthropic). I understand and can explain every part
of the implementation — schema design, REST/WebSocket API, and the WebRTC negotiation flow.
