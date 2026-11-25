(() => {
 const video = document.getElementById('ate-bg-video');
 if (!video) return;
 const motion = matchMedia('(prefers-reduced-motion: reduce)');
 const stop = () => { video.pause(); document.body.classList.remove('video-active'); };
 const start = () => { if (motion.matches) return stop(); if (!video.getAttribute('src')) video.src = '/assets/background.mp4'; video.muted = true; video.play().catch(stop); };
 video.addEventListener('playing', () => document.body.classList.add('video-active'));
 video.addEventListener('error', stop);
 motion.addEventListener('change', start);
 start();
})();