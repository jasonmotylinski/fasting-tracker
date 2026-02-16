# Fasting Tracker

A mobile-first intermittent fasting app built with Flask and SQLite. Inspired by the Zero iOS app.

## Features

- **Live Timer** - Real-time countdown with animated SVG progress ring
- **Duration Presets** - Quick-select common fasting windows (12h, 14h, 16h, 18h, 20h, 24h)
- **Weekly Goals** - Set and track how many fasts you want to complete per week
- **Progress Ring** - Visual circle fills as your fast progresses, changes color on completion
- **History** - Browse past fasts with completion badges, delete any entry
- **Streak Tracking** - See your current streak of consecutive fasting days
- **Goal Setting** - Configurable default fast duration and weekly target

## Setup

### Requirements
- Python 3.10+
- pip

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your SECRET_KEY

# Initialize database
export FLASK_APP=run.py
flask db upgrade

# Run development server
python run.py
```

The app will be available at `http://localhost:5003`

## Usage

1. **Register** an account
2. **Set Goals** - Configure default fast duration and weekly target in Settings
3. **Pick Duration** - Select a fasting window from the preset grid
4. **Start Fast** - Hit the start button and watch the ring fill
5. **End Fast** - Stop when you're ready; the app tracks whether you hit your target
6. **Review History** - See all past fasts with completion status

## Tech Stack

- **Backend** - Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-Login
- **Database** - SQLite (Postgres-ready)
- **Frontend** - Jinja2 templates, vanilla JavaScript, custom CSS
- **Theme** - Midnight Calm (dark navy/slate with cool blue accents)
- **Auth** - Werkzeug password hashing, session-based login

## Development

Start with debug mode:
```bash
python run.py
```

## Production

```bash
gunicorn -w 2 -b 0.0.0.0:5003 run:app
```

Or use the provided scripts:
```bash
scripts/prod/server.sh    # Run via gunicorn with unix socket
scripts/prod/deploy.sh    # Pull, install deps, migrate, restart
```
