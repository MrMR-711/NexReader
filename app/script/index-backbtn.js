// backbtn.js - Back Button Component
document.addEventListener('DOMContentLoaded', async () => {
    // Import app state
    const appStateModule = await import('./state.js');
    const appState = appStateModule.default;

    // Get back button element
    const backBtn = document.getElementById('back-btn');
    if (!backBtn) {
        console.error('Back button element not found!');
        return;
    }

    // Add click event listener
    backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Reset app state
        appState.reset();
        
        // استفاده از replace تا صفحه فعلی در history نماند
        window.location.replace('index.html');
    });

    // Listen to state changes to show/hide back button
    appState.on('isViewerVisible', (isVisible) => {
        if (backBtn) {
            backBtn.style.display = isVisible ? 'flex' : 'none';
        }
    });

    // Initialize button visibility
    backBtn.style.display = appState.isViewerVisible ? 'flex' : 'none';
});