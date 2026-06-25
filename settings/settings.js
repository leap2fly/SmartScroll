import { checkAuth } from '../js/auth_guard.js';
import { STORAGE_KEYS, getStorageData, setStorageData, hashPassword } from '../js/utils.js';

async function init() {
    if (!(await checkAuth())) return;
    document.body.classList.remove('hidden');

    const settings = await getStorageData(STORAGE_KEYS.SETTINGS);
    document.getElementById('session-timeout').value = settings.sessionTimeout || 15;

    await renderWhitelist();
}

document.getElementById('session-timeout').addEventListener('change', async (e) => {
    if (!(await checkAuth())) return;
    const settings = await getStorageData(STORAGE_KEYS.SETTINGS);
    settings.sessionTimeout = parseInt(e.target.value);
    await setStorageData(STORAGE_KEYS.SETTINGS, settings);
});

async function renderWhitelist() {
    const whitelist = await getStorageData(STORAGE_KEYS.WHITELIST) || [];
    const tbody = document.getElementById('whitelist-table-body');
    tbody.innerHTML = '';

    whitelist.forEach((item, index) => {
        const tr = document.createElement('tr');

        const tdPattern = document.createElement('td');
        tdPattern.textContent = item.pattern;
        tr.appendChild(tdPattern);

        const tdScope = document.createElement('td');
        tdScope.textContent = item.scope;
        tr.appendChild(tdScope);

        const tdActions = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn-danger';
        btn.textContent = 'Delete';
        btn.onclick = () => deleteWhitelist(index);
        tdActions.appendChild(btn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

async function deleteWhitelist(index) {
    if (!(await checkAuth())) return;
    const whitelist = await getStorageData(STORAGE_KEYS.WHITELIST) || [];
    whitelist.splice(index, 1);
    await setStorageData(STORAGE_KEYS.WHITELIST, whitelist);
    renderWhitelist();
}

document.getElementById('whitelist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await checkAuth())) return;
    const pattern = document.getElementById('whitelist-pattern').value.trim();
    const scope = document.getElementById('whitelist-scope').value;

    const whitelist = await getStorageData(STORAGE_KEYS.WHITELIST) || [];
    whitelist.push({ pattern, scope });
    await setStorageData(STORAGE_KEYS.WHITELIST, whitelist);

    document.getElementById('whitelist-pattern').value = '';
    renderWhitelist();
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(await checkAuth())) return;

    const current = document.getElementById('current-password').value;
    const n1 = document.getElementById('new-password').value;
    const n2 = document.getElementById('confirm-password').value;

    const settings = await getStorageData(STORAGE_KEYS.SETTINGS);
    const currentHash = await hashPassword(current);

    if (currentHash !== settings.passwordHash) {
        alert("Current password incorrect.");
        return;
    }

    if (n1 !== n2) {
        alert("New passwords do not match.");
        return;
    }

    settings.passwordHash = await hashPassword(n1);
    await setStorageData(STORAGE_KEYS.SETTINGS, settings);
    alert("Password updated successfully.");
    document.getElementById('change-password-form').reset();
});

init();
