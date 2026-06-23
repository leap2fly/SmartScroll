import { STORAGE_KEYS, getStorageData, DEFAULT_CATEGORIES } from '../js/utils.js';

async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const url = new URL(tab.url);
    const domain = url.hostname;
    document.getElementById('current-domain').textContent = domain;

    const rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    const whitelist = await getStorageData(STORAGE_KEYS.WHITELIST) || [];
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;

    let status = 'Allowed';
    let badgeClass = 'badge-success';

    // Check Whitelist
    if (whitelist.some(w => domain.includes(w.pattern) || tab.url.includes(w.pattern))) {
        status = 'Whitelisted';
        badgeClass = 'badge-info';
    }
    // Check direct domain block
    else if (rules.some(r => r.type === 'domain' && domain.includes(r.pattern))) {
        status = 'Blocked';
        badgeClass = 'badge-danger';
    }
    // Check category block
    else {
        const activeCategories = rules.filter(r => r.type === 'category').map(r => r.pattern);
        for (const cat of activeCategories) {
            if (categories[cat] && categories[cat].some(d => domain.includes(d))) {
                status = 'Blocked (Category)';
                badgeClass = 'badge-danger';
                break;
            }
        }
    }

    const badge = document.getElementById('status-badge');
    badge.textContent = status;
    badge.className = `badge ${badgeClass}`;
}

document.getElementById('go-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
});

document.getElementById('go-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
});

init();
