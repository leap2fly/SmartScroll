/**
 * Security and Storage Utilities
 */

export const STORAGE_KEYS = {
    SETTINGS: 'settings',
    STATS: 'stats',
    RULES: 'rules',
    SCHEDULES: 'schedules',
    AUTH: 'auth',
    WHITELIST: 'whitelist',
    CATEGORIES: 'categories',
    LIMITS: 'limits',
    USAGE: 'usage' // { date: { category: minutes } }
};

export const DEFAULT_SETTINGS = {
    sessionTimeout: 15,
    failedAttempts: 0,
    lockUntil: 0,
    passwordHash: null,
    isFirstRun: true,
    blockAutoplay: true
};

export const DEFAULT_CATEGORIES = {
    'Entertainment': ['netflix.com', 'hulu.com', 'disneyplus.com'],
    'Gaming': ['twitch.tv', 'roblox.com', 'ign.com', 'gamespot.com'],
    'Sports': ['espn.com', 'espncricinfo.com', 'bleacherreport.com'],
    'Social Media': ['facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'reddit.com'],
    'News': ['cnn.com', 'bbc.com', 'nytimes.com'],
    'Shopping': ['amazon.com', 'ebay.com', 'walmart.com'],
    'Education': ['coursera.org', 'udemy.com', 'khanacademy.org'],
    'Technology': ['github.com', 'stackoverflow.com', 'techcrunch.com'],
    'Finance': ['bloomberg.com', 'wsj.com', 'finance.yahoo.com']
};

export const CATEGORY_KEYWORDS = {
    'Entertainment': ['movie', 'series', 'film', 'streaming', 'watch', 'video', 'tv'],
    'Gaming': ['game', 'gaming', 'play', 'xbox', 'playstation', 'nintendo', 'steam', 'esports'],
    'Sports': ['sport', 'football', 'soccer', 'basketball', 'nba', 'nfl', 'score', 'team'],
    'Social Media': ['social', 'community', 'connect', 'friends', 'profile', 'post', 'feed', 'chat'],
    'News': ['news', 'breaking', 'world', 'local', 'politics', 'journalism', 'article', 'press'],
    'Shopping': ['shop', 'store', 'buy', 'cart', 'deal', 'price', 'checkout', 'product'],
    'Education': ['learn', 'course', 'study', 'university', 'college', 'school', 'lesson', 'tutorial'],
    'Technology': ['tech', 'software', 'hardware', 'code', 'programming', 'developer', 'gadget', 'ai'],
    'Finance': ['finance', 'money', 'stock', 'invest', 'bank', 'trading', 'market', 'economy']
};

export const INDUSTRY_STANDARDS = {
    TIME_SAVED_PER_BLOCK_MIN: 5, // 5 minutes saved per block
    DATA_SAVED_PER_VIDEO_MB: 10   // 10MB saved per video block
};

/**
 * SHA-256 Hashing function with salt
 */
export async function hashPassword(password) {
    // Simple static salt for extension environment consistency without needing separate salt storage
    const SALT = "sbc_v2_secure_salt_2024";
    const msgUint8 = new TextEncoder().encode(password + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Storage Helpers
 */
export async function getStorageData(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
        });
    });
}

export async function setStorageData(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve();
        });
    });
}

/**
 * Session Management
 */
export async function isSessionValid() {
    const auth = await getStorageData(STORAGE_KEYS.AUTH) || {};
    if (!auth.sessionExpiresAt) return false;
    return Date.now() < auth.sessionExpiresAt;
}

export async function createSession(timeoutMinutes) {
    const expiresAt = Date.now() + (timeoutMinutes * 60 * 1000);
    await setStorageData(STORAGE_KEYS.AUTH, { sessionExpiresAt: expiresAt });
}

export async function clearSession() {
    await setStorageData(STORAGE_KEYS.AUTH, { sessionExpiresAt: 0 });
}

/**
 * Stats Management
 */
export async function updateStats(metric, value = 1) {
    const stats = await getStorageData(STORAGE_KEYS.STATS) || {
        videosBlocked: 0,
        reelsBlocked: 0,
        timeSavedMinutes: 0,
        dataSavedMB: 0,
        requestsBlocked: 0,
        blockedDomains: {},
        blockedCategories: {},
        dailyUsage: {} // date -> { timeSaved }
    };

    if (metric.includes('.')) {
        const [parent, child] = metric.split('.');
        stats[parent] = stats[parent] || {};
        stats[parent][child] = (stats[parent][child] || 0) + value;
    } else {
        stats[metric] = (stats[metric] || 0) + value;
    }

    // Update daily trend
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyUsage[today]) {
        stats.dailyUsage[today] = { timeSaved: 0 };
    }

    if (metric === 'timeSavedMinutes') {
        stats.dailyUsage[today].timeSaved += value;
    }

    await setStorageData(STORAGE_KEYS.STATS, stats);
}

export async function trackUsage(category) {
    const today = new Date().toISOString().split('T')[0];
    const usage = await getStorageData(STORAGE_KEYS.USAGE) || {};

    if (!usage[today]) usage[today] = {};
    usage[today][category] = (usage[today][category] || 0) + 1; // track in minutes (called every minute)

    await setStorageData(STORAGE_KEYS.USAGE, usage);
}
