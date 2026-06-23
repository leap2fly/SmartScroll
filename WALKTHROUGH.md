# Smart Browsing Control V2 - Implementation Walkthrough

## Project Overview
Smart Browsing Control is a production-ready Chrome Extension (Manifest V3) designed to eliminate distractions, reduce unwanted content, and enforce focus rules.

## Core Features
1.  **Multi-Layered Autoplay Blocking**:
    *   **Layer 1**: Overrides `HTMLMediaElement.prototype.play` via an injected script to block programmatic autoplay attempts.
    *   **Layer 2**: Scans existing video elements to disable autoplay, pause playback, and set `preload="none"`.
    *   **Layer 3**: Uses a `MutationObserver` to catch and neutralize dynamically injected videos (ads, lazy-loaded content).
2.  **Centralized Rule Engine**:
    *   Uses `chrome.declarativeNetRequest` for performant network-level blocking.
    *   Supports dynamic rules based on Whitelists, Categories, Custom Domains, and Schedules.
3.  **YouTube-Specific Optimization**:
    *   Redirects YouTube Shorts to standard Watch pages.
    *   Hides distracting elements: Recommendations sidebar, Shorts shelves, and end-screen suggestions.
4.  **Time & Duration Management**:
    *   **Schedules**: Block specific categories during set times (e.g., "Social Media" from 9 AM to 5 PM).
    *   **Duration Limits**: Set daily time quotas for categories (e.g., "Entertainment" limited to 30 mins/day).
5.  **Security & Authentication**:
    *   Master password protection for all settings.
    *   SHA-256 password hashing.
    *   Configurable session timeouts (5, 15, 30, 60 minutes).
    *   Lockout protection after 5 failed login attempts.
6.  **Analytics Dashboard**:
    *   KPIs: Videos Blocked, Reels Blocked, Data Saved (15MB/video), Time Saved (5min/block).
    *   Visualizations: Daily Trend (Time Saved) and Category-wise usage/blocking breakdown.

## Folder Structure
- `manifest.json`: Extension configuration (MV3).
- `background.js`: Service worker handling rule logic, usage tracking, and redirection.
- `js/`: Shared utilities (`utils.js`) and authentication guards (`auth_guard.js`).
- `content/`: Content scripts for DOM-level blocking and video neutralization.
- `auth/`: Password setup and login pages.
- `dashboard/`: Analytics and performance tracking UI.
- `rules/`: Category and domain management.
- `schedules/`: Time schedules and duration limits configuration.
- `settings/`: General settings, whitelist management, and password changes.
- `popup/`: Lightweight status UI.
- `assets/`: Extension icons.

## Security Model
Protected pages (`settings`, `rules`, `schedules`, `dashboard`) use an `auth_guard` that checks for a valid session before rendering any UI. If the session is invalid or expired, the user is redirected to the `auth/password.html` page.

## Implementation Details
- **No external frameworks**: Built with pure HTML5, CSS3, and modern JavaScript.
- **DNR Integration**: Dynamically updates rulesets based on user configuration changes.
- **Performance**: Throttled `MutationObserver` and efficient storage usage via `chrome.storage.local`.
