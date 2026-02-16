# Fasting Tracker — CLAUDE.md

## Commands

```bash
# Run dev server
cd fasting-tracker && source venv/bin/activate
python run.py                          # http://localhost:5003

# Database migrations
export FLASK_APP=run.py
flask db migrate -m "description"
flask db upgrade

# Production
gunicorn -w 2 -b 0.0.0.0:5003 run:app
```

## Architecture

Flask app factory in `app/__init__.py` → `create_app()`. Port 5003.

### Blueprints

| Blueprint | File | Prefix | Purpose |
|-----------|------|--------|---------|
| auth | `app/auth.py` | `/` | Login, register, logout |
| main | `app/main.py` | `/` | Dashboard, history, settings |
| api | `app/api.py` | `/api` | JSON API (all CRUD) |

### Models (`app/models.py`)

- **User** — Auth, default_fast_hours, weekly_fast_goal
- **Fast** — Fasting sessions with start/end times, target, completion status

### Services (`app/services/`)

- **stats.py** — Weekly summary, streak calculations

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fast/start` | Start a new fast |
| POST | `/api/fast/stop` | End the active fast |
| GET | `/api/fast/active` | Get current active fast |
| GET | `/api/fast/history?page=` | Paginated past fasts |
| DELETE | `/api/fast/<id>` | Delete a historical fast |
| GET | `/api/stats/weekly?date=` | Weekly summary + streak |
| PUT | `/api/user/goals` | Update fasting goals |

## Config & Environment

- `.env` — `SECRET_KEY`, `FLASK_ENV`

## Frontend

- Vanilla JS, Jinja2 templates, custom CSS
- Mobile-first responsive design
- Color palette: Midnight Calm — dark navy/slate surfaces, cool blue accents, amber for completion
- Fonts: Outfit (display) + DM Sans (body)
- Timer: client-side countdown with SVG ring animation
