import { checkAuth } from '../js/auth_guard.js';
import { STORAGE_KEYS, getStorageData } from '../js/utils.js';

async function init() {
    if (!(await checkAuth())) return;
    document.body.classList.remove('hidden');

    const stats = await getStorageData(STORAGE_KEYS.STATS) || {};
    const usage = await getStorageData(STORAGE_KEYS.USAGE) || {};
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('stat-videos').textContent = stats.videosBlocked || 0;
    document.getElementById('stat-reels').textContent = stats.reelsBlocked || 0;
    document.getElementById('stat-data').textContent = `${(stats.dataSavedMB || 0).toLocaleString()} MB`;
    document.getElementById('stat-time').textContent = `${(stats.timeSavedMinutes || 0).toLocaleString()} min`;
    document.getElementById('stat-sessions').textContent = stats.blockedSessions || 0;

    renderTrend(stats.dailyUsage || {});
    renderUsageBars(usage[today] || {});
    renderBlockedBars(stats.blockedCategories || {});
}

function renderTrend(dailyUsage) {
    const svg = document.getElementById('trend-svg');
    const polyline = document.getElementById('trend-line');
    const dates = Object.keys(dailyUsage).sort();
    if (dates.length < 2) return;

    const values = dates.map(d => dailyUsage[d].timeSaved);
    const maxVal = Math.max(...values, 10);
    const width = svg.clientWidth || 400;
    const height = 150;

    const points = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / maxVal) * height;
        return `${x},${y}`;
    }).join(' ');

    polyline.setAttribute('points', points);
}

function renderUsageBars(todayUsage) {
    const container = document.getElementById('category-usage-bars');
    container.innerHTML = '';
    const entries = Object.entries(todayUsage).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    entries.forEach(([cat, val]) => {
        const percent = (val / maxVal) * 100;
        const html = `
            <div class="bar-item">
                <div class="bar-label">${cat}</div>
                <div class="bar-track"><div class="bar-fill" style="width: ${percent}%"></div></div>
                <div class="bar-value">${val}m</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    if (entries.length === 0) {
        container.innerHTML = '<p style="font-size: 0.875rem; color: #9ca3af;">No usage tracked today.</p>';
    }
}

function renderBlockedBars(blockedCategories) {
    const container = document.getElementById('blocked-breakdown');
    container.innerHTML = '';
    const entries = Object.entries(blockedCategories).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    entries.forEach(([cat, val]) => {
        const percent = (val / maxVal) * 100;
        const html = `
            <div class="bar-item">
                <div class="bar-label">${cat}</div>
                <div class="bar-track"><div class="bar-fill" style="width: ${percent}%; background: #ef4444;"></div></div>
                <div class="bar-value">${val}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    if (entries.length === 0) {
        container.innerHTML = '<p style="font-size: 0.875rem; color: #9ca3af;">No blocks recorded yet.</p>';
    }
}

init();
