from datetime import datetime, timedelta

from app.models import Fast


def get_week_bounds(date=None):
    """Get Monday-Sunday bounds for the week containing the given date."""
    if date is None:
        date = datetime.utcnow().date()
    monday = date - timedelta(days=date.weekday())
    sunday = monday + timedelta(days=6)
    start = datetime(monday.year, monday.month, monday.day)
    end = datetime(sunday.year, sunday.month, sunday.day, 23, 59, 59)
    return start, end


def get_weekly_summary(user_id, date=None):
    """Return weekly fasting stats for the week containing the given date."""
    start, end = get_week_bounds(date)

    fasts = Fast.query.filter(
        Fast.user_id == user_id,
        Fast.started_at >= start,
        Fast.started_at <= end,
        Fast.ended_at.isnot(None),
    ).all()

    completed = [f for f in fasts if f.completed]
    total_hours = sum(f.duration_seconds / 3600 for f in fasts)

    return {
        'week_start': start.date().isoformat(),
        'completed': len(completed),
        'total': len(fasts),
        'total_hours': round(total_hours, 1),
    }


def get_current_streak(user_id):
    """Count consecutive days (going backwards from today) with a completed fast."""
    today = datetime.utcnow().date()
    streak = 0
    day = today

    while True:
        day_start = datetime(day.year, day.month, day.day)
        day_end = day_start + timedelta(days=1)

        has_completed = Fast.query.filter(
            Fast.user_id == user_id,
            Fast.started_at >= day_start,
            Fast.started_at < day_end,
            Fast.completed == True,
        ).first()

        if has_completed:
            streak += 1
            day -= timedelta(days=1)
        else:
            break

    return streak
