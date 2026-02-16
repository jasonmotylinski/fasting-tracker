# Fasting Tracker

We are building a fasting tracking app to track fasting progress. This app should be a basic version of the Zero iOS app.

## Technical Requirements

- Simple. Concise.
- Built in Python (Flask, following habitz platform conventions)
- Needs to be built for the web and mobile web. UI needs to be responsive
- Needs a database backend
- API-first development
- Must use gunicorn for production
- Uses SQLite but can switch to Postgres
- Requires user account creation and login
- Implementation should be in the fasting-tracker folder, not the root folder of this project

## Functional Requirements

- User-friendly
- Should be able to set a target time frame.
- See an overview of how many successful fasts completed for the week.
- Should indicate percentage towards goal
- Starting a fast should start a timer that counts down until the fasting is complete.
- Using a circle to indicate progress is helpful, like in the Zero app.
- The app should allow me to delete historical fasts.

---

## Implementation Plan

### Phase 1: Project Scaffolding

Set up the project structure following habitz conventions (matching calorie-tracker/meal-planner patterns).

```
fasting-tracker/
├── app/
│   ├── __init__.py          # App factory: create_app()
│   ├── models.py            # SQLAlchemy models
│   ├── auth.py              # Auth blueprint (register, login, logout)
│   ├── main.py              # Main blueprint (dashboard, settings)
│   ├── api.py               # API blueprint (all CRUD endpoints)
│   ├── forms.py             # WTForms (login, register, fast settings)
│   ├── services/
│   │   └── stats.py         # Weekly summaries, streak calculations
│   ├── static/
│   │   ├── css/
│   │   │   ├── base.css     # Variables, reset, navbar, forms, buttons
│   │   │   ├── components.css # Timer ring, fast cards, stats widgets
│   │   │   └── pages.css    # Page-specific styles
│   │   ├── js/
│   │   │   └── main.js      # Timer countdown, circle animation, API calls
│   │   └── images/
│   └── templates/
│       ├── base.html        # Layout with navbar
│       ├── home.html        # Landing page (unauthenticated)
│       ├── dashboard.html   # Main timer / active fast view
│       ├── history.html     # Past fasts list
│       ├── settings.html    # Goal configuration
│       └── auth/
│           ├── login.html
│           └── register.html
├── migrations/              # Flask-Migrate
├── config.py                # Config loading from .env
├── run.py                   # Entry point
├── requirements.txt
├── .env                     # SECRET_KEY, FLASK_ENV
└── CLAUDE.md                # Component-specific docs
```

**Port**: 5003

**Dependencies** (`requirements.txt`):
- Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-Login, Flask-WTF
- python-dotenv, gunicorn

### Phase 2: Database Models

#### User
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| username | String(80) | Unique |
| email | String(120) | Unique |
| password_hash | String(256) | Werkzeug hashed |
| default_fast_hours | Integer | Default target duration (default: 16) |
| weekly_fast_goal | Integer | Fasts per week target (default: 5) |
| created_at | DateTime | |

#### Fast
| Column | Type | Notes |
|--------|------|-------|
| id | Integer | PK |
| user_id | Integer | FK → User |
| started_at | DateTime | When the fast began (UTC) |
| target_hours | Integer | Goal duration in hours |
| ended_at | DateTime | Nullable — null means fast is active |
| completed | Boolean | True if ended_at - started_at >= target_hours |
| note | String(200) | Optional note |
| created_at | DateTime | |

Key constraints:
- A user can only have one active fast at a time (ended_at IS NULL)
- `completed` is computed on end: `(ended_at - started_at) >= target_hours`

### Phase 3: API Endpoints

All endpoints return JSON. Auth-protected except where noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fast/start` | Start a new fast (body: `{target_hours}`) |
| POST | `/api/fast/stop` | End the active fast |
| GET | `/api/fast/active` | Get current active fast (or null) |
| GET | `/api/fast/history?page=` | Paginated past fasts (newest first) |
| DELETE | `/api/fast/<id>` | Delete a historical fast |
| GET | `/api/stats/weekly?date=` | Weekly summary (completed count, total hours, streak) |
| PUT | `/api/user/goals` | Update default_fast_hours & weekly_fast_goal |

#### API response shapes

**Active fast** (`GET /api/fast/active`):
```json
{
  "id": 42,
  "started_at": "2026-02-16T20:00:00Z",
  "target_hours": 16,
  "elapsed_seconds": 28800,
  "remaining_seconds": 28800,
  "progress_pct": 50.0
}
```

**Weekly stats** (`GET /api/stats/weekly`):
```json
{
  "week_start": "2026-02-10",
  "completed": 3,
  "goal": 5,
  "total_hours": 48.5,
  "current_streak": 3
}
```

### Phase 4: Authentication

Follow the exact same pattern as calorie-tracker:
- Flask-Login for session management
- Registration with username, email, password
- Login by email + password
- Logout clears session
- `@login_required` on all routes except landing, login, register

### Phase 5: Frontend — Pages & UI

#### 5a. Landing Page (`home.html`)
- Hero section with app branding
- CTA buttons: "Get Started" / "Log In"
- Feature highlights (timer, weekly goals, history)
- Same warm botanical aesthetic as calorie-tracker
- Full-viewport layout that breaks out of `.main-content` max-width

#### 5b. Dashboard (`dashboard.html`) — Core screen
This is the main screen. Two states:

**No active fast:**
- Large circle outline (empty ring) with a "Start Fast" button in the center
- Preset duration selector (12h, 14h, 16h, 18h, 20h, custom)
- Weekly progress summary below (e.g., "3 of 5 fasts this week")

**Active fast:**
- Animated circular progress ring (SVG `stroke-dashoffset`) showing % complete
- Inside the ring: elapsed time (HH:MM:SS), target duration, and progress %
- Real-time countdown powered by `setInterval` in JS (no server polling)
- "End Fast" button below the ring
- Ring color transitions: green when on track, accent color when target reached

#### 5c. History (`history.html`)
- List of past fasts grouped by week
- Each entry shows: date, duration, target, completed/incomplete badge
- Delete button on each entry (confirm before deleting)
- Pagination or infinite scroll

#### 5d. Settings (`settings.html`)
- Default fasting duration (hours)
- Weekly fast goal (number of fasts per week)
- Account info (username, email — read-only)

### Phase 6: Timer & Circle Animation (JS)

The timer is purely client-side:
- On page load, fetch `/api/fast/active` to check for an active fast
- If active: calculate elapsed from `started_at` vs. current time, start `setInterval(1s)`
- Update the SVG ring's `stroke-dashoffset` each tick based on progress %
- Update the digital timer display (HH:MM:SS remaining or elapsed)
- When the target is reached, change ring to "complete" state (full ring, color change)
- The fast continues counting beyond the target (user decides when to stop)

SVG circle approach:
```
circumference = 2 * PI * radius
dashoffset = circumference * (1 - progress)
```

### Phase 7: Stats Service

`app/services/stats.py`:
- `get_weekly_summary(user_id, date)` — count completed fasts, total fasted hours, goal progress for the week containing `date`
- `get_current_streak(user_id)` — consecutive days with a completed fast
- Week boundary: Monday through Sunday

---

## Build Order

1. **Scaffolding** — project structure, config, venv, requirements, `create_app()`, `run.py`
2. **Models + migrations** — User, Fast tables, initial migration
3. **Auth** — register, login, logout (forms, routes, templates)
4. **API endpoints** — start/stop/active/history/delete/stats/goals
5. **Dashboard UI** — timer ring, start/stop flow, weekly summary
6. **History page** — past fasts list with delete
7. **Settings page** — goals form
8. **Landing page** — public hero page
9. **Polish** — responsive tweaks, animations, error handling
