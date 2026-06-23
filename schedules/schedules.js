import { checkAuth } from '../js/auth_guard.js';
import { STORAGE_KEYS, getStorageData, setStorageData, DEFAULT_CATEGORIES } from '../js/utils.js';

let selectedDays = [];

async function init() {
    if (!(await checkAuth())) return;
    document.body.classList.remove('hidden');

    await populateCategories();
    await renderSchedules();
    await renderLimits();
}

async function populateCategories() {
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    const catList = Object.keys(categories);

    ['sched-category', 'limit-category'].forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        catList.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
    });
}

// --- Schedules Logic ---
document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.day);
        if (selectedDays.includes(day)) {
            selectedDays = selectedDays.filter(d => d !== day);
            btn.classList.remove('active');
        } else {
            selectedDays.push(day);
            btn.classList.add('active');
        }
    });
});

document.getElementById('schedule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await checkAuth())) return;
    if (selectedDays.length === 0) {
        alert("Please select at least one day.");
        return;
    }

    const schedule = {
        category: document.getElementById('sched-category').value,
        start: document.getElementById('sched-start').value,
        end: document.getElementById('sched-end').value,
        days: [...selectedDays]
    };

    const schedules = await getStorageData(STORAGE_KEYS.SCHEDULES) || [];
    schedules.push(schedule);
    await setStorageData(STORAGE_KEYS.SCHEDULES, schedules);

    selectedDays = [];
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('schedule-form').reset();
    renderSchedules();
});

async function renderSchedules() {
    const schedules = await getStorageData(STORAGE_KEYS.SCHEDULES) || [];
    const tbody = document.getElementById('schedules-table-body');
    tbody.innerHTML = '';
    const dayMap = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat', 0:'Sun' };

    schedules.forEach((s, index) => {
        const tr = document.createElement('tr');
        const daysStr = s.days.map(d => dayMap[d]).join(', ');

        const tdCat = document.createElement('td');
        tdCat.textContent = s.category;
        tr.appendChild(tdCat);

        const tdTime = document.createElement('td');
        tdTime.textContent = `${s.start} - ${s.end}`;
        tr.appendChild(tdTime);

        const tdDays = document.createElement('td');
        tdDays.textContent = daysStr;
        tr.appendChild(tdDays);

        const tdActions = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn-danger';
        btn.textContent = 'Delete';
        btn.onclick = () => deleteSchedule(index);
        tdActions.appendChild(btn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

async function deleteSchedule(index) {
    if (!(await checkAuth())) return;
    const schedules = await getStorageData(STORAGE_KEYS.SCHEDULES) || [];
    schedules.splice(index, 1);
    await setStorageData(STORAGE_KEYS.SCHEDULES, schedules);
    renderSchedules();
}

// --- Limits Logic ---
document.getElementById('limit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await checkAuth())) return;
    const category = document.getElementById('limit-category').value;
    const dailyLimit = parseInt(document.getElementById('limit-minutes').value);

    const limits = await getStorageData(STORAGE_KEYS.LIMITS) || [];
    const existing = limits.findIndex(l => l.category === category);
    if (existing > -1) {
        limits[existing].dailyLimit = dailyLimit;
    } else {
        limits.push({ category, dailyLimit });
    }

    await setStorageData(STORAGE_KEYS.LIMITS, limits);
    document.getElementById('limit-form').reset();
    renderLimits();
});

async function renderLimits() {
    const limits = await getStorageData(STORAGE_KEYS.LIMITS) || [];
    const tbody = document.getElementById('limits-table-body');
    tbody.innerHTML = '';

    limits.forEach((l, index) => {
        const tr = document.createElement('tr');

        const tdCat = document.createElement('td');
        tdCat.textContent = l.category;
        tr.appendChild(tdCat);

        const tdLimit = document.createElement('td');
        tdLimit.textContent = l.dailyLimit;
        tr.appendChild(tdLimit);

        const tdActions = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn-danger';
        btn.textContent = 'Delete';
        btn.onclick = () => deleteLimit(index);
        tdActions.appendChild(btn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

async function deleteLimit(index) {
    if (!(await checkAuth())) return;
    const limits = await getStorageData(STORAGE_KEYS.LIMITS) || [];
    limits.splice(index, 1);
    await setStorageData(STORAGE_KEYS.LIMITS, limits);
    renderLimits();
}

init();
