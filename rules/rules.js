import { checkAuth } from '../js/auth_guard.js';
import { STORAGE_KEYS, getStorageData, setStorageData, DEFAULT_CATEGORIES } from '../js/utils.js';

async function init() {
    if (!(await checkAuth())) return;
    document.body.classList.remove('hidden');

    await renderCategories();
    await renderCategoryDomainManagement();
    await renderRules();
}

async function renderCategories() {
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    const rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    const container = document.getElementById('category-list');
    container.innerHTML = '';

    Object.keys(categories).forEach(cat => {
        const isBlocked = rules.some(r => r.type === 'category' && r.pattern === cat);
        const div = document.createElement('div');
        div.className = 'category-item';
        div.innerHTML = `
            <span>${cat}</span>
            <label class="switch">
                <input type="checkbox" ${isBlocked ? 'checked' : ''} data-category="${cat}">
                <span class="slider"></span>
            </label>
        `;
        div.querySelector('input').addEventListener('change', (e) => toggleCategory(cat, e.target.checked));
        container.appendChild(div);
    });
}

async function toggleCategory(category, block) {
    if (!(await checkAuth())) return;
    let rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    if (block) {
        if (!rules.find(r => r.type === 'category' && r.pattern === category)) {
            rules.push({ type: 'category', pattern: category });
        }
    } else {
        rules = rules.filter(r => !(r.type === 'category' && r.pattern === category));
    }
    await setStorageData(STORAGE_KEYS.RULES, rules);
}

async function renderCategoryDomainManagement() {
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    const select = document.getElementById('cat-select');
    const display = document.getElementById('category-domains-display');

    select.innerHTML = '';
    display.innerHTML = '';

    Object.keys(categories).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);

        const section = document.createElement('div');
        section.className = 'cat-domains-section';
        section.innerHTML = `<strong>${cat}:</strong> ${categories[cat].map((d, i) => `<span>${d} <a href="#" data-cat="${cat}" data-index="${i}" class="remove-domain">×</a></span>`).join(', ')}`;
        display.appendChild(section);
    });

    display.querySelectorAll('.remove-domain').forEach(link => {
        link.onclick = async (e) => {
            e.preventDefault();
            const cat = link.dataset.cat;
            const idx = parseInt(link.dataset.index);
            await removeDomainFromCategory(cat, idx);
        };
    });
}

async function removeDomainFromCategory(category, index) {
    if (!(await checkAuth())) return;
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    categories[category].splice(index, 1);
    await setStorageData(STORAGE_KEYS.CATEGORIES, categories);
    renderCategoryDomainManagement();
}

document.getElementById('add-domain-cat-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!(await checkAuth())) return;
    const cat = document.getElementById('cat-select').value;
    const domain = document.getElementById('cat-domain').value.trim().toLowerCase();

    if (!domain) return;
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    if (!categories[cat].includes(domain)) {
        categories[cat].push(domain);
        await setStorageData(STORAGE_KEYS.CATEGORIES, categories);
        renderCategoryDomainManagement();
    }
    document.getElementById('cat-domain').value = '';
};

async function renderRules() {
    const rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    const tbody = document.getElementById('rules-table-body');
    tbody.innerHTML = '';

    rules.filter(r => r.type === 'domain').forEach((rule, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${rule.pattern}</td><td>${rule.type}</td><td><button class="btn-danger">Delete</button></td>`;
        tr.querySelector('.btn-danger').onclick = () => deleteRule(index);
        tbody.appendChild(tr);
    });
}

async function deleteRule(index) {
    if (!(await checkAuth())) return;
    let rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    const domainRules = rules.filter(r => r.type === 'domain');
    const categoryRules = rules.filter(r => r.type === 'category');
    domainRules.splice(index, 1);
    await setStorageData(STORAGE_KEYS.RULES, [...domainRules, ...categoryRules]);
    renderRules();
}

document.getElementById('add-rule-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!(await checkAuth())) return;
    const pattern = document.getElementById('rule-pattern').value.trim().toLowerCase();
    if (!pattern) return;
    let rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    rules.push({ type: 'domain', pattern });
    await setStorageData(STORAGE_KEYS.RULES, rules);
    document.getElementById('rule-pattern').value = '';
    renderRules();
};

init();
