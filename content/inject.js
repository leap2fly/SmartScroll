/**
 * Injected script to override HTMLMediaElement.prototype.play
 */
(function() {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        // Allow if user explicitly allowed, if it's a whitelisted site, or if there is active user activation
        const isWhitelisted = document.documentElement.dataset.sbcWhitelisted === "true";
        const hasUserActivation = navigator.userActivation && navigator.userActivation.isActive;

        if (this.dataset.allowPlay === "true" || isWhitelisted || hasUserActivation) {
            return originalPlay.apply(this, arguments);
        }

        // Block autoplay
        // We return a silent rejection to avoid triggering "Uncaught in promise" errors in the host application
        const blockError = new DOMException("Playback was blocked by Smart Browsing Control", "NotAllowedError");
        const silentPromise = Promise.reject(blockError);
        silentPromise.catch(() => {}); // Prevent global uncaught rejection

        console.log("[Smart Browsing Control] Blocked autoplay attempt.");
        return silentPromise;
    };

    // Allow manual play if the user interacts
    window.addEventListener('click', (e) => {
        const video = e.target.closest('video');
        if (video) {
            video.dataset.allowPlay = "true";
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn("[Smart Browsing Control] Manual play attempt failed:", err);
                });
            }
        }
    }, true);
})();
