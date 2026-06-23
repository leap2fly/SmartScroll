import { STORAGE_KEYS, getStorageData, setStorageData, hashPassword, createSession } from '../js/utils.js';

const setupSection = document.getElementById('setup-section');
const loginSection = document.getElementById('login-section');
const lockoutSection = document.getElementById('lockout-section');
const errorMsg = document.getElementById('error-msg');
const lockoutTimer = document.getElementById('lockout-timer');

const urlParams = new URLSearchParams(window.location.search);
const redirectUrl = urlParams.get('redirect') || '../dashboard/dashboard.html';

async function init() {
    const settings = await getStorageData(STORAGE_KEYS.SETTINGS);

    // Check for lockout
    if (settings.lockUntil && Date.now() < settings.lockUntil) {
        showLockout(settings.lockUntil);
        return;
    }

    if (!settings.passwordHash) {
        setupSection.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
    }
}

function showLockout(lockUntil) {
    lockoutSection.classList.remove('hidden');
    loginSection.classList.add('hidden');
    setupSection.classList.add('hidden');

    const updateTimer = () => {
        const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
        if (remaining <= 0) {
            window.location.reload();
            return;
        }
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        lockoutTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        setTimeout(updateTimer, 1000);
    };
    updateTimer();
}

document.getElementById('setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('new-password').value;
    const p2 = document.getElementById('confirm-password').value;

    if (p1 !== p2) {
        alert("Passwords do not match!");
        return;
    }

    const hash = await hashPassword(p1);
    const settings = await getStorageData(STORAGE_KEYS.SETTINGS);
    settings.passwordHash = hash;
    settings.isFirstRun = false;
    await setStorageData(STORAGE_KEYS.SETTINGS, settings);

    await createSession(settings.sessionTimeout || 15);
    window.location.href = redirectUrl;
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const hash = await hashPassword(password);
    const settings = await getStorageData(STORAGE_KEYS.SETTINGS);

    if (hash === settings.passwordHash) {
        // Success
        settings.failedAttempts = 0;
        await setStorageData(STORAGE_KEYS.SETTINGS, settings);
        await createSession(settings.sessionTimeout || 15);
        window.location.href = redirectUrl;
    } else {
        // Failure
        settings.failedAttempts = (settings.failedAttempts || 0) + 1;
        if (settings.failedAttempts >= 5) {
            settings.lockUntil = Date.now() + (5 * 60 * 1000);
            await setStorageData(STORAGE_KEYS.SETTINGS, settings);
            showLockout(settings.lockUntil);
        } else {
            await setStorageData(STORAGE_KEYS.SETTINGS, settings);
            errorMsg.textContent = `Invalid password. ${5 - settings.failedAttempts} attempts remaining.`;
        }
    }
});

init();
