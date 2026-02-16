/* ========================================
   FASTING TRACKER — Main JS
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Auto-dismiss flash messages
    document.querySelectorAll('.flash').forEach(flash => {
        setTimeout(() => {
            flash.style.opacity = '0';
            flash.style.transform = 'translateY(-8px)';
            setTimeout(() => flash.remove(), 300);
        }, 3000);
    });

    // Dashboard timer
    initDashboard();

    // History page
    initHistory();
});

/* ---- Dashboard ---- */

const CIRCUMFERENCE = 2 * Math.PI * 90; // matches SVG r=90

let timerInterval = null;
let activeFast = null;
let selectedHours = 16;

function initDashboard() {
    const section = document.getElementById('timer-section');
    if (!section) return;

    // Preset buttons
    document.querySelectorAll('.preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedHours = parseInt(btn.dataset.hours);
        });
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', startFast);

    // Stop button
    document.getElementById('stop-btn').addEventListener('click', stopFast);

    // Check for active fast
    fetchActiveFast();

    // Load weekly stats
    fetchWeeklyStats();
}

async function fetchActiveFast() {
    try {
        const res = await fetch('/api/fast/active');
        const data = await res.json();
        if (data && data.id) {
            activeFast = data;
            showActiveState();
            startTimer();
        }
    } catch (e) {
        console.error('Failed to fetch active fast:', e);
    }
}

async function startFast() {
    try {
        const res = await fetch('/api/fast/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_hours: selectedHours }),
        });
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'Failed to start fast');
            return;
        }
        activeFast = await res.json();
        showActiveState();
        startTimer();
    } catch (e) {
        console.error('Failed to start fast:', e);
    }
}

async function stopFast() {
    if (!confirm('End your current fast?')) return;

    try {
        const res = await fetch('/api/fast/stop', { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'Failed to stop fast');
            return;
        }
        clearInterval(timerInterval);
        activeFast = null;
        showIdleState();
        fetchWeeklyStats();
    } catch (e) {
        console.error('Failed to stop fast:', e);
    }
}

function showActiveState() {
    document.getElementById('timer-idle').classList.add('hidden');
    document.getElementById('timer-active').classList.remove('hidden');
    document.getElementById('stop-btn').classList.remove('hidden');
    document.getElementById('presets').classList.add('hidden');
    document.getElementById('timer-target').textContent = `of ${activeFast.target_hours}h`;
}

function showIdleState() {
    document.getElementById('timer-idle').classList.remove('hidden');
    document.getElementById('timer-active').classList.add('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
    document.getElementById('presets').classList.remove('hidden');
    updateRing(0);
    document.getElementById('progress-ring').classList.remove('completed');
    document.getElementById('timer-pct').classList.remove('completed');
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    if (!activeFast) return;

    const startedAt = new Date(activeFast.started_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000);
    const target = activeFast.target_hours * 3600;
    const progress = Math.min(1, elapsed / target);
    const pct = Math.round(progress * 100);

    // Update time display
    document.getElementById('timer-elapsed').textContent = formatDuration(elapsed);
    document.getElementById('timer-pct').textContent = `${pct}%`;

    // Update ring
    updateRing(progress);

    // Completed state
    const ring = document.getElementById('progress-ring');
    const pctEl = document.getElementById('timer-pct');
    if (elapsed >= target) {
        ring.classList.add('completed');
        pctEl.classList.add('completed');
    } else {
        ring.classList.remove('completed');
        pctEl.classList.remove('completed');
    }
}

function updateRing(progress) {
    const offset = CIRCUMFERENCE * (1 - progress);
    document.getElementById('progress-ring').style.strokeDashoffset = offset;
}

function formatDuration(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function fetchWeeklyStats() {
    try {
        const res = await fetch('/api/stats/weekly');
        const data = await res.json();
        document.getElementById('weekly-completed').textContent = `${data.completed}/${data.goal}`;
        document.getElementById('weekly-goal').textContent = data.goal;
        document.getElementById('weekly-hours').textContent = data.total_hours;
        document.getElementById('weekly-streak').textContent = data.streak;
    } catch (e) {
        console.error('Failed to fetch weekly stats:', e);
    }
}

/* ---- History ---- */

let historyPage = 1;
let historyTotalPages = 1;

function initHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;

    fetchHistory();

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            historyPage++;
            fetchHistory(true);
        });
    }
}

async function fetchHistory(append = false) {
    const loading = document.getElementById('history-loading');
    const emptyState = document.getElementById('history-empty');
    const pagination = document.getElementById('history-pagination');

    if (!append && loading) loading.classList.remove('hidden');

    try {
        const res = await fetch(`/api/fast/history?page=${historyPage}`);
        const data = await res.json();

        if (loading) loading.classList.add('hidden');

        historyTotalPages = data.total_pages;

        if (data.fasts.length === 0 && !append) {
            emptyState.classList.remove('hidden');
            return;
        }

        const list = document.getElementById('history-list');
        data.fasts.forEach(fast => {
            list.appendChild(createHistoryCard(fast));
        });

        if (historyPage < historyTotalPages) {
            pagination.classList.remove('hidden');
        } else {
            pagination.classList.add('hidden');
        }
    } catch (e) {
        console.error('Failed to fetch history:', e);
        if (loading) loading.classList.add('hidden');
    }
}

function createHistoryCard(fast) {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.dataset.id = fast.id;

    const date = new Date(fast.started_at);
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit'
    });

    const hours = Math.floor(fast.duration_seconds / 3600);
    const minutes = Math.floor((fast.duration_seconds % 3600) / 60);
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const checkIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    const xIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    card.innerHTML = `
        <div class="history-status ${fast.completed ? 'success' : 'incomplete'}">
            ${fast.completed ? checkIcon : xIcon}
        </div>
        <div class="history-details">
            <div class="history-date">${dateStr} at ${timeStr}</div>
            <div class="history-meta">${durationStr} / ${fast.target_hours}h target</div>
        </div>
        <button class="history-delete" title="Delete" data-id="${fast.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
    `;

    card.querySelector('.history-delete').addEventListener('click', () => deleteFast(fast.id, card));

    return card;
}

async function deleteFast(id, card) {
    if (!confirm('Delete this fast? This cannot be undone.')) return;

    try {
        const res = await fetch(`/api/fast/${id}`, { method: 'DELETE' });
        if (res.ok) {
            card.style.opacity = '0';
            card.style.transform = 'translateX(20px)';
            card.style.transition = 'all 0.3s';
            setTimeout(() => card.remove(), 300);
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to delete');
        }
    } catch (e) {
        console.error('Failed to delete fast:', e);
    }
}
