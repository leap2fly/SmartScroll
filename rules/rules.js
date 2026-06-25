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

        const span = document.createElement('span');
        span.textContent = cat;
        div.appendChild(span);

        const label = document.createElement('label');
        label.className = 'switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = isBlocked;
        input.dataset.category = cat;
        input.addEventListener('change', (e) => toggleCategory(cat, e.target.checked));
        const slider = document.createElement('span');
        slider.className = 'slider';
        label.appendChild(input);
        label.appendChild(slider);
        div.appendChild(label);

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
        const strong = document.createElement('strong');
        strong.textContent = `${cat}: `;
        section.appendChild(strong);

        categories[cat].forEach((d, i) => {
            const span = document.createElement('span');
            span.textContent = d + ' ';
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = '×';
            a.className = 'remove-domain';
            a.dataset.cat = cat;
            a.dataset.index = i;
            a.onclick = async (e) => {
                e.preventDefault();
                await removeDomainFromCategory(cat, i);
            };
            span.appendChild(a);
            section.appendChild(span);
            if (i < categories[cat].length - 1) {
                section.appendChild(document.createTextNode(', '));
            }
        });
        display.appendChild(section);
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

        const tdPattern = document.createElement('td');
        tdPattern.textContent = rule.pattern;
        tr.appendChild(tdPattern);

        const tdType = document.createElement('td');
        tdType.textContent = rule.type;
        tr.appendChild(tdType);

        const tdActions = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn-danger';
        btn.textContent = 'Delete';
        btn.onclick = () => deleteRule(index);
        tdActions.appendChild(btn);
        tr.appendChild(tdActions);

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

// Refresh UI when storage changes (e.g. auto-categorization)
chrome.storage.onChanged.addListener(async (changes) => {
    if (changes[STORAGE_KEYS.CATEGORIES]) {
        await renderCategoryDomainManagement();
    }
});

init();
