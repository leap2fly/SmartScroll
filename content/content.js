/**
 * Content Script for Smart Browsing Control
 */

// --- Layer 1: Override HTMLMediaElement.prototype.play ---
// Since we cannot access the page context directly in MV3 content scripts without ES modules/isolation issues,
// we inject a script into the page.

const injectScript = async () => {
    // Check whitelist status to inform the injected script
    try {
        const domain = window.location.hostname;
        chrome.storage.local.get(['whitelist'], (result) => {
            const whitelist = result.whitelist || [];
            const isWhitelisted = whitelist.some(w => domain.includes(w.pattern));
            if (isWhitelisted) {
                document.documentElement.dataset.sbcWhitelisted = "true";
            }

            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('content/inject.js');
            (document.head || document.documentElement).appendChild(script);
            script.onload = () => script.remove();
        });
    } catch (e) {
        // Fallback for isolated worlds where storage might be inaccessible
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('content/inject.js');
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => script.remove();
    }
};

injectScript();

// --- Layer 2 & 3: DOM Processing and MutationObserver ---

const processVideo = (video) => {
    if (video.dataset.sbProcessed) return;

    // Check if it's already marked as allowed (e.g., user clicked play)
    if (video.dataset.allowPlay === "true") return;

    // Apply blocking measures
    video.autoplay = false;
    video.pause();
    video.muted = true;
    video.setAttribute('preload', 'none');

    // If it was already playing, force pause
    if (!video.paused) {
        video.pause();
    }

    video.dataset.sbProcessed = "true";
    chrome.runtime.sendMessage({ type: 'VIDEO_BLOCKED' });
};

const handleMutations = (mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeName === 'VIDEO') {
                processVideo(node);
            } else if (node.querySelectorAll) {
                const videos = node.querySelectorAll('video');
                videos.forEach(processVideo);
            }

            // YouTube Specific Hiding
            if (window.location.hostname.includes('youtube.com')) {
                hideYouTubeElements();
            }

            // Global Reels/Shorts Detection
            detectAndHideReels();
        }
    }
};

const observer = new MutationObserver(debounce((mutations) => {
    handleMutations(mutations);
}, 120));

observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
});

// Initial scan
document.querySelectorAll('video').forEach(processVideo);

// --- YouTube Specific Rules ---
function hideYouTubeElements() {
    const selectors = [
        '#related',
        'ytd-watch-next-secondary-results-renderer',
        'ytd-reel-shelf-renderer', // Shorts shelf
        'ytd-rich-shelf-renderer', // Shorts in home
        '#items.ytd-guide-section-renderer > ytd-guide-entry-renderer:has(a[href="/shorts/"])', // Shorts in sidebar
        '.ytd-video-masthead-ad-v3-renderer',
        'ytd-ad-slot-renderer'
    ];

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.style.display !== 'none') {
                el.style.display = 'none';
            }
        });
    });
}

// --- Reels & Shorts Blocking ---
function detectAndHideReels() {
    // Look for links containing 'reels' or 'shorts'
    const selectors = [
        'a[href*="/reels/"]',
        'a[href*="/shorts/"]',
        '[aria-label*="Reels"]',
        '[aria-label*="Shorts"]'
    ];

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Find parent that looks like a container
            const container = el.closest('div, li, section') || el;
            if (container.style.display !== 'none') {
                container.style.display = 'none';
                chrome.runtime.sendMessage({ type: 'REEL_BLOCKED' });
            }
        });
    });
}

// Helper: Debounce
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Run immediately
if (window.location.hostname.includes('youtube.com')) {
    hideYouTubeElements();
}
detectAndHideReels();

// --- Automatic Categorization ---
const identifyCategory = () => {
    const metadata = {
        title: document.title || '',
        description: '',
        keywords: '',
        domain: window.location.hostname
    };

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metadata.description = metaDescription.content;

    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) metadata.keywords = metaKeywords.content;

    chrome.runtime.sendMessage({
        type: 'IDENTIFY_CATEGORY',
        data: metadata
    });
};

// Delay identification slightly to ensure title/meta are populated
setTimeout(identifyCategory, 2000);
