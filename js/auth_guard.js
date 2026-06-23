import { isSessionValid } from '../js/utils.js';

export async function checkAuth() {
    if (!(await isSessionValid())) {
        const currentPath = window.location.pathname;
        window.location.href = `../auth/password.html?redirect=${encodeURIComponent(currentPath)}`;
        return false;
    }
    return true;
}

// Add visibility change listener
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        await checkAuth();
    }
});
