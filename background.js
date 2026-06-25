import { STORAGE_KEYS, DEFAULT_SETTINGS, DEFAULT_CATEGORIES, CATEGORY_KEYWORDS, INDUSTRY_STANDARDS, getStorageData, setStorageData, updateStats, trackUsage } from './js/utils.js';

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        await setStorageData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        await setStorageData(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
        await setStorageData(STORAGE_KEYS.RULES, []);
        await setStorageData(STORAGE_KEYS.SCHEDULES, []);
        await setStorageData(STORAGE_KEYS.WHITELIST, []);
        await setStorageData(STORAGE_KEYS.LIMITS, []);
        await setStorageData(STORAGE_KEYS.USAGE, {});
        await setStorageData(STORAGE_KEYS.STATS, {
            videosBlocked: 0,
            reelsBlocked: 0,
            timeSavedMinutes: 0,
            dataSavedMB: 0,
            requestsBlocked: 0,
            blockedDomains: {},
            blockedCategories: {},
            dailyUsage: {},
            blockedSessions: 0
        });
    }
    await refreshBlockingRules();
});

// Refresh rules when storage changes
chrome.storage.onChanged.addListener(async (changes) => {
    if (changes[STORAGE_KEYS.RULES] || changes[STORAGE_KEYS.WHITELIST] || changes[STORAGE_KEYS.SCHEDULES] || changes[STORAGE_KEYS.CATEGORIES] || changes[STORAGE_KEYS.LIMITS]) {
        await refreshBlockingRules();
    }
});

/**
 * Dynamic Rule Engine for declarativeNetRequest
 */
async function refreshBlockingRules() {
    const rules = await getStorageData(STORAGE_KEYS.RULES) || [];
    const whitelist = await getStorageData(STORAGE_KEYS.WHITELIST) || [];
    const schedules = await getStorageData(STORAGE_KEYS.SCHEDULES) || [];
    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    const limits = await getStorageData(STORAGE_KEYS.LIMITS) || [];
    const usage = await getStorageData(STORAGE_KEYS.USAGE) || {};
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = usage[today] || {};

    const dynamicRules = [];
    let ruleId = 1;

    // 1. Whitelist (Allow)
    whitelist.forEach(item => {
        dynamicRules.push({
            id: ruleId++,
            priority: 100,
            action: { type: 'allow' },
            condition: {
                urlFilter: item.pattern,
                resourceTypes: ['main_frame', 'sub_frame']
            }
        });
    });

    const activeBlockedCategories = new Set();
    const activeBlockedDomains = new Set();

    // 2. Check schedules
    const now = new Date();
    const day = now.getDay();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    schedules.forEach(schedule => {
        if (schedule.days.includes(day)) {
            if (currentTimeStr >= schedule.start && currentTimeStr <= schedule.end) {
                activeBlockedCategories.add(schedule.category);
            }
        }
    });

    // 3. Check Duration Limits
    limits.forEach(limit => {
        const consumed = todayUsage[limit.category] || 0;
        if (consumed >= limit.dailyLimit) {
            activeBlockedCategories.add(limit.category);
        }
    });

    // 4. Check static rules
    rules.forEach(rule => {
        if (rule.type === 'domain') {
            activeBlockedDomains.add(rule.pattern);
        } else if (rule.type === 'category') {
            activeBlockedCategories.add(rule.pattern);
        }
    });

    // Build netRequest rules for domains
    activeBlockedDomains.forEach(domain => {
        dynamicRules.push({
            id: ruleId++,
            priority: 50,
            action: { type: 'block' },
            condition: {
                urlFilter: domain,
                resourceTypes: ['main_frame', 'sub_frame']
            }
        });
    });

    // Build netRequest rules for categories
    activeBlockedCategories.forEach(catName => {
        const domains = categories[catName] || [];
        domains.forEach(domain => {
            dynamicRules.push({
                id: ruleId++,
                priority: 40,
                action: { type: 'block' },
                condition: {
                    urlFilter: domain,
                    resourceTypes: ['main_frame', 'sub_frame']
                }
            });
        });
    });

    // 5. YouTube Shorts Redirect (DNR)
    dynamicRules.push({
        id: 9999, // Static-ish ID for redirect
        priority: 100,
        action: {
            type: 'redirect',
            redirect: {
                regexSubstitution: 'https://www.youtube.com/watch?v=\\1'
            }
        },
        condition: {
            regexFilter: '^https?://(?:www\\.)?youtube\\.com/shorts/([^/?#]+)',
            resourceTypes: ['main_frame']
        }
    });

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: dynamicRules
    });
}


/**
 * Track blocked events for stats
 */
chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId !== 0) return;
    // Check if we just navigated to a blocked page (redirected or blocked by DNR)
    // In MV3, DNR blocks usually result in a failed navigation or a "blocked" page.
    // We can't easily detect DNR matches directly in production, but we can detect active blocking.
});

/**
 * Usage Tracking Alarm
 */
chrome.alarms.create('trackUsage', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'trackUsage') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0 && tabs[0].url) {
            try {
                const url = new URL(tabs[0].url);
                const domain = url.hostname;
                const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;

                for (const [cat, domains] of Object.entries(categories)) {
                    if (domains.some(d => domain.includes(d))) {
                        await trackUsage(cat);
                        break;
                    }
                }
            } catch (e) {}
        }
        await refreshBlockingRules();
    }
});

/**
 * Message Listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'VIDEO_BLOCKED') {
        updateStats('videosBlocked');
        updateStats('dataSavedMB', INDUSTRY_STANDARDS.DATA_SAVED_PER_VIDEO_MB);
        updateStats('timeSavedMinutes', INDUSTRY_STANDARDS.TIME_SAVED_PER_BLOCK_MIN);
        if (sender.tab && sender.tab.url) {
            detectCategoryAndStats(sender.tab.url);
        }
    } else if (message.type === 'REEL_BLOCKED') {
        updateStats('reelsBlocked');
        updateStats('timeSavedMinutes', INDUSTRY_STANDARDS.TIME_SAVED_PER_BLOCK_MIN);
        if (sender.tab && sender.tab.url) {
            detectCategoryAndStats(sender.tab.url);
        }
    } else if (message.type === 'IDENTIFY_CATEGORY') {
        handleAutoCategorization(message.data, sender.tab);
    }
});

async function handleAutoCategorization(data, tab) {
    if (!tab || !tab.id) return;
    const { title, description, keywords } = data;
    const domain = data.domain.toLowerCase();
    const combinedText = `${title} ${description} ${keywords}`.toLowerCase();

    const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
    const rules = await getStorageData(STORAGE_KEYS.RULES) || [];

    // Skip if already categorized (check subdomains)
    for (const catDomains of Object.values(categories)) {
        if (catDomains.some(d => domain === d || domain.endsWith('.' + d))) return;
    }

    let detectedCategory = null;
    for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
        if (words.some(word => combinedText.includes(word.toLowerCase()))) {
            detectedCategory = category;
            break;
        }
    }

    if (detectedCategory) {
        console.log(`[SBC] Auto-categorized ${domain} as ${detectedCategory}`);
        categories[detectedCategory].push(domain);
        await setStorageData(STORAGE_KEYS.CATEGORIES, categories);

        // Check if this category is currently blocked
        const isBlocked = rules.some(r => r.type === 'category' && r.pattern === detectedCategory);
        if (isBlocked) {
            chrome.tabs.remove(tab.id);
            updateStats('blockedSessions');
        }

        await refreshBlockingRules();
    }
}

async function detectCategoryAndStats(urlStr) {
    try {
        const url = new URL(urlStr);
        const domain = url.hostname;
        const categories = await getStorageData(STORAGE_KEYS.CATEGORIES) || DEFAULT_CATEGORIES;
        for (const [cat, domains] of Object.entries(categories)) {
            if (domains.some(d => domain.includes(d))) {
                updateStats(`blockedCategories.${cat}`);
                break;
            }
        }
        updateStats(`blockedDomains.${domain}`);
    } catch(e) {}
}
