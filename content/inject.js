/**
 * Injected script to override HTMLMediaElement.prototype.play
 */
(function() {
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        if (this.dataset.allowPlay === "true") {
            return originalPlay.apply(this, arguments);
        }

        // Block autoplay
        console.log("[Smart Browsing Control] Blocked autoplay attempt.");
        return Promise.reject(new DOMException("Playback was blocked by Smart Browsing Control", "NotAllowedError"));
    };

    // Allow manual play if the user interacts
    window.addEventListener('click', (e) => {
        const video = e.target.closest('video');
        if (video) {
            video.dataset.allowPlay = "true";
            video.play();
        }
    }, true);
})();
