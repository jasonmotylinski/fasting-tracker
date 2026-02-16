from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.models import Fast, db
from app.services.stats import get_current_streak, get_weekly_summary

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/fast/start', methods=['POST'])
@login_required
def start_fast():
    active = Fast.query.filter_by(user_id=current_user.id, ended_at=None).first()
    if active:
        return jsonify({'error': 'A fast is already active'}), 400

    data = request.get_json(silent=True) or {}
    target_hours = data.get('target_hours', current_user.default_fast_hours)

    fast = Fast(
        user_id=current_user.id,
        target_hours=target_hours,
        started_at=datetime.utcnow(),
    )
    db.session.add(fast)
    db.session.commit()
    return jsonify(fast.to_dict()), 201


@api_bp.route('/fast/stop', methods=['POST'])
@login_required
def stop_fast():
    active = Fast.query.filter_by(user_id=current_user.id, ended_at=None).first()
    if not active:
        return jsonify({'error': 'No active fast'}), 400

    active.ended_at = datetime.utcnow()
    active.completed = active.duration_seconds >= active.target_seconds
    db.session.commit()
    return jsonify(active.to_dict())


@api_bp.route('/fast/active')
@login_required
def active_fast():
    active = Fast.query.filter_by(user_id=current_user.id, ended_at=None).first()
    if not active:
        return jsonify(None)
    return jsonify(active.to_dict())


@api_bp.route('/fast/history')
@login_required
def fast_history():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    pagination = Fast.query.filter(
        Fast.user_id == current_user.id,
        Fast.ended_at.isnot(None),
    ).order_by(Fast.started_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'fasts': [f.to_dict() for f in pagination.items],
        'page': pagination.page,
        'total_pages': pagination.pages,
        'total': pagination.total,
    })


@api_bp.route('/fast/<int:fast_id>', methods=['DELETE'])
@login_required
def delete_fast(fast_id):
    fast = Fast.query.filter_by(id=fast_id, user_id=current_user.id).first()
    if not fast:
        return jsonify({'error': 'Fast not found'}), 404
    if fast.is_active:
        return jsonify({'error': 'Cannot delete an active fast. Stop it first.'}), 400

    db.session.delete(fast)
    db.session.commit()
    return jsonify({'ok': True})


@api_bp.route('/stats/weekly')
@login_required
def weekly_stats():
    date_str = request.args.get('date')
    date = None
    if date_str:
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    summary = get_weekly_summary(current_user.id, date)
    summary['goal'] = current_user.weekly_fast_goal
    summary['streak'] = get_current_streak(current_user.id)
    return jsonify(summary)


@api_bp.route('/user/goals', methods=['PUT'])
@login_required
def update_goals():
    data = request.get_json(silent=True) or {}
    if 'default_fast_hours' in data:
        current_user.default_fast_hours = max(1, min(72, int(data['default_fast_hours'])))
    if 'weekly_fast_goal' in data:
        current_user.weekly_fast_goal = max(1, min(7, int(data['weekly_fast_goal'])))
    db.session.commit()
    return jsonify(current_user.to_dict())
