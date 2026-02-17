const container = document.getElementById('image-container');
let scale = 1;
let lastScale = 1;
let startDist = 0;

container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        startDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
    }
});

container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault(); // جلوگیری از اسکرول صفحه
        const dist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        
        scale = Math.min(Math.max(1, lastScale * (dist / startDist)), 4); // محدودیت زوم بین 1 تا 4 برابر
        container.style.transform = `scale(${scale})`;
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        lastScale = scale;
    }
});

// ریست کردن زوم وقتی صفحه عوض می‌شود
appState.on('currentPage', () => {
    scale = 1;
    lastScale = 1;
    container.style.transform = `scale(1)`;
});