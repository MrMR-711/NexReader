// state.js - State Management
class AppState {
    constructor() {
        this.currentFileType = '';
        this.currentImages = [];
        this.currentPage = 0;
        this.totalPages = 0;
        this.pdfDoc = null;
        this.currentFileName = '';
        this.isViewerVisible = false;
        this.isUploadScreenVisible = true;
        this.isLoaderVisible = false;
        this.loadingMessage = 'لطفاً صبر کنید، در حال پردازش کامیک...';

        this.listeners = {};
        this.init();
    }

    init() {
        // ایجاد event برای اطلاع دادن به کامپوننت‌ها
        document.appState = this;
    }

    // متدهای setter با event dispatch
    setState(key, value) {
        const oldValue = this[key];
        this[key] = value;

        // ارسال event برای اطلاع دادن به listenerها
        if (this.listeners[key]) {
            this.listeners[key].forEach(callback => callback(value, oldValue));
        }

        // ارسال event عمومی
        const event = new CustomEvent('appStateChange', {
            detail: { key, value, oldValue }
        });
        document.dispatchEvent(event);
    }

    setStates(updates) {
        const changedKeys = [];

        for (const key in updates) {
            const oldValue = this[key];
            const newValue = updates[key];
            if (oldValue !== newValue) {
                this[key] = newValue;
                changedKeys.push({ key, value: newValue, oldValue });
            }
        }

        changedKeys.forEach(({ key, value, oldValue }) => {
            if (this.listeners[key]) {
                this.listeners[key].forEach(cb => cb(value, oldValue));
            }
        });

        document.dispatchEvent(new CustomEvent('appStateBatchChange', {
            detail: changedKeys
        }));
    }

    // ثبت listener برای تغییرات
    on(key, callback) {
        if (!this.listeners[key]) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(callback);
        return () => this.off(key, callback);
    }

    // حذف listener
    off(key, callback) {
        if (this.listeners[key]) {
            this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
        }
    }

    // ریست state به حالت اولیه
    reset() {
        this.setStates({
            currentFileType: '',
            currentImages: [],
            currentPage: 0,
            totalPages: 0,
            pdfDoc: null,
            currentFileName: '',
            isViewerVisible: false,
            isUploadScreenVisible: true,
            isLoaderVisible: false
        });
    }

    // متدهای کمکی
    navigate(direction) {
        const newPage = this.currentPage + direction;
        if (newPage >= 0 && newPage < this.totalPages) {
            this.setState('currentPage', newPage);
        }
    }

    goToPage(pageNumber) {
        if (pageNumber >= 1 && pageNumber <= this.totalPages) {
            this.setState('currentPage', pageNumber - 1);
            return true;
        }
        return false;
    }

    // نمایش viewer
    showViewer() {
        this.setState('isViewerVisible', true);
        this.setState('isUploadScreenVisible', false);
        this.setState('isLoaderVisible', false);
    }

    // نمایش upload screen
    showUploadScreen() {
        this.setState('isViewerVisible', false);
        this.setState('isUploadScreenVisible', true);
        this.setState('isLoaderVisible', false);
        this.reset();
    }

    // نمایش loader
    showLoader(message = 'لطفاً صبر کنید، در حال پردازش کامیک...') {
        this.setState('isLoaderVisible', true);
        this.setState('loadingMessage', message);
        this.setState('isUploadScreenVisible', false);
    }

    hideLoader() {
        this.setState('isLoaderVisible', false);
    }
}

// ایجاد instance جهانی
const appState = new AppState();
export default appState;