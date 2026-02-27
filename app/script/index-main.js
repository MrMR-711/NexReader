// main.js - Main Application Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Import the getUnarchiver factory function which is more robust.
    const { getUnarchiver } = await import('./bitjs-1.2.4/archive/decompress.js');

    // Import app state
    const appStateModule = await import('./state.js');
    const appState = appStateModule.default;

    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadScreen = document.getElementById('home-page');
    const viewer = document.getElementById('viewer');
    const imageContainer = document.getElementById('image-container');
    const loader = document.getElementById('loader');
    const loadingText = document.getElementById('loading-text');
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInput = document.getElementById('page-input');
    const totalPagesDisplay = document.getElementById('total-pages');
    const fileNameDisplay = document.getElementById('file-name');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const pageSlider = document.getElementById('page-slider');
    const bottomNav = document.querySelector('.bottom-nav');

    let currentErrorModal = null;

    let isRendering = false;
    let renderToken = 0;

    let currentScale = 1;
    let touchStartX = 0;
    let touchStartY = 0;
    let isPanning = false;

    // Listen to state changes and update UI
    const setupStateListeners = () => {
        // Update loader visibility
        appState.on('isLoaderVisible', (isVisible) => {
            if (loader) {
                loader.style.display = isVisible ? 'flex' : 'none';
                progressBar.style.display = isVisible ? 'block' : 'none';
                if (!isVisible) progress.style.width = '0%';
            }
        });

        // Update loading message
        appState.on('loadingMessage', (message) => {
            if (loadingText) {
                loadingText.textContent = message;
            }
        });

        // Update viewer visibility
        appState.on('isViewerVisible', (isVisible) => {
            if (viewer) {
                viewer.style.display = isVisible ? 'block' : 'none';
            }
            if (uploadScreen) {
                uploadScreen.style.display = isVisible ? 'none' : 'flex';
            }
        });

        // Update current page
        appState.on('currentPage', (page) => {
            updatePagination();
            // تاخیر کوچک برای اطمینان از رندر شدن DOM
            setTimeout(() => showCurrentPage(), 10);
        });

        // Update total pages
        appState.on('totalPages', (total) => {
            updatePagination();
        });

        // Update current file name
        appState.on('currentFileName', (fileName) => {
            if (fileNameDisplay) {
                fileNameDisplay.textContent = fileName;
                setDirection(fileName);
            }
        });
    };

    // Initialize state listeners
    setupStateListeners();

    // تابع جدید برای نمایش صحیح صفحات
    const displayPage = async () => {
        if (!imageContainer) return;

        // پاک‌سازی container
        imageContainer.innerHTML = '';

        if (appState.currentFileType === 'pdf') {
            if (!appState.pdfDoc) return;

            const page = await appState.pdfDoc.getPage(appState.currentPage + 1);
            const scale = window.innerWidth > 768 ? 1.5 : (window.innerWidth / 600);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            imageContainer.appendChild(canvas);
            page.cleanup();
        } else {
            if (appState.currentImages.length === 0 || appState.currentPage >= appState.currentImages.length) return;

            const img = document.createElement('img');
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '0 auto';

            const currentImage = appState.currentImages[appState.currentPage];
            const blob = new Blob([currentImage.fileData], { type: currentImage.type });
            const objectUrl = URL.createObjectURL(blob);

            // استفاده از Promise برای اطمینان از لود شدن تصویر
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    URL.revokeObjectURL(objectUrl);
                    resolve();
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('Failed to load image'));
                };
                img.src = objectUrl;
            });

            imageContainer.appendChild(img);
        }

        // ریست کردن زوم
        currentScale = 1;
        imageContainer.style.transform = 'scale(1)';
        imageContainer.style.transformOrigin = 'center';

        // اسکرول به بالا
        if (viewer) viewer.scrollTo(0, 0);
    };

    const showCurrentPage = async () => {
        const token = ++renderToken;

        if (isRendering) return;
        isRendering = true;

        if (loader) {
            loader.style.display = 'flex';
            if (loadingText) {
                loadingText.textContent =
                    `در حال بارگیری صفحه ${appState.currentPage + 1} از ${appState.totalPages}...`;
            }
        }

        try {
            await displayPage();

            // اگر وسط کار render جدید شروع شده، این render رو بی‌اثر کن
            if (token !== renderToken) return;

        } catch (error) {
            console.error('Error loading page:', error);
        } finally {
            isRendering = false;
            if (loader) loader.style.display = 'none';
        }
    };

    const updatePagination = () => {
        // آپدیت اینپوت عددی
        if (pageInput) {
            pageInput.value = appState.currentPage + 1;
        }

        // آپدیت متن کل صفحات
        if (totalPagesDisplay) {
            totalPagesDisplay.textContent = appState.totalPages;
        }

        // آپدیت اسلایدر
        if (pageSlider) {
            pageSlider.max = appState.totalPages;
            pageSlider.value = appState.currentPage + 1;
        }

        // غیرفعال کردن دکمه‌ها در ابتدا و انتها
        if (prevBtn) {
            prevBtn.disabled = appState.currentPage === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = appState.currentPage === appState.totalPages - 1;
        }
    };

    function isRar5File(buffer) {
        const signature1 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00]);
        const signature2 = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00]);
        const header = new Uint8Array(buffer, 0, 8);

        let isRar5 = true;
        for (let i = 0; i < signature1.length; i++) {
            if (header[i] !== signature1[i]) {
                isRar5 = false;
                break;
            }
        }

        if (isRar5) return true;

        for (let i = 0; i < signature2.length; i++) {
            if (header[i] !== signature2[i]) {
                return false;
            }
        }
        return true;
    }

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // حذف مدال خطای قبلی اگر وجود داشته باشد
        if (currentErrorModal) {
            document.body.removeChild(currentErrorModal);
            currentErrorModal = null;
        }

        appState.reset();
        appState.setState('currentFileName', file.name);
        appState.showLoader();

        try {
            const fileType = file.name.split('.').pop().toLowerCase();
            appState.setState('currentFileType', fileType);

            const arrayBuffer = await file.arrayBuffer();

            if (["rar", "cbr"].includes(fileType) && isRar5File(arrayBuffer)) {
                throw {
                    isRar5Error: true,
                    message: 'فایل RAR5/CBR5 پشتیبانی نمی‌شود'
                };
            }

            const updateProgress = (percent) => {
                if (progress) {
                    progress.style.width = `${percent}%`;
                }
            };

            const updateLoadingText = (text) => {
                if (loadingText) {
                    loadingText.innerHTML = text;
                }
            };

            if (["zip", "cbz", "rar", "cbr"].includes(fileType)) {
                updateLoadingText(`در حال پردازش فایل ${fileType.toUpperCase()}...`);
                const images = await processArchive(arrayBuffer, updateProgress, updateLoadingText);
                appState.setState('currentImages', images);
                appState.setState('totalPages', images.length);
                appState.setState('currentPage', 0);
            } else if (fileType === 'pdf') {
                updateLoadingText('در حال بارگیری PDF...');
                const pdfResult = await initPdf(arrayBuffer, updateProgress);
                appState.setState('pdfDoc', pdfResult.pdfDoc);
                appState.setState('totalPages', pdfResult.totalPages);
            } else {
                throw new Error('فرمت فایل پشتیبانی نمی‌شود.');
            }

            if (appState.totalPages === 0) {
                throw new Error('هیچ تصویر قابل نمایشی در این فایل پیدا نشد.');
            }

            // نمایش viewer با تاخیر مناسب
            setTimeout(() => {
                appState.showViewer();
                appState.hideLoader();

                // مخفی کردن ناوبری پایین
                if (bottomNav) {
                    bottomNav.style.display = 'none';
                }

                // نمایش صفحه اول - این خط مهم است
                setTimeout(() => {
                    showCurrentPage();
                }, 50);
            }, 500);

        } catch (error) {
            console.error('خطا در پردازش فایل:', error);

            if (error.isRar5Error) {
                appState.hideLoader();
                showRar5ErrorModal();
            } else {
                alert(`خطا: ${error.message}`);
                appState.showUploadScreen();
            }
        }
    });

    function processArchive(buffer, progressCallback, textCallback) {
        return new Promise((resolve, reject) => {
            const files = [];
            const options = {
                pathToBitJS: './bitjs-1.2.4/'
            };

            const unarchiver = getUnarchiver(buffer, options);
            if (!unarchiver) {
                return reject(new Error('فرمت فایل آرشیو ناشناخته است یا پشتیبانی نمی‌شود.'));
            }

            unarchiver.addEventListener('progress', e => {
                let percent;
                if (e.detail && e.detail.percent !== undefined) {
                    percent = e.detail.percent;
                } else if (e.percent !== undefined) {
                    percent = e.percent;
                } else if (e.total && e.total > 0) {
                    const loaded = e.loaded || e.totalCompressedBytesRead || 0;
                    percent = (loaded / e.total) * 100;
                }

                if (percent !== undefined) {
                    progressCallback(Math.min(percent, 100));
                }
            });

            unarchiver.addEventListener('extract', e => {
                let unarchivedFile;

                if (e.detail && e.detail.unarchivedFile) {
                    unarchivedFile = e.detail.unarchivedFile;
                } else if (e.unarchivedFile) {
                    unarchivedFile = e.unarchivedFile;
                } else {
                    unarchivedFile = e.detail || e;
                }

                if (unarchivedFile && unarchivedFile.filename && unarchivedFile.fileData) {
                    const { filename, fileData } = unarchivedFile;
                    if (!filename.endsWith('/') &&
                        !filename.includes('__MACOSX/') &&
                        !filename.includes('.DS_Store') &&
                        /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(filename)) {
                        files.push({
                            name: filename,
                            fileData,
                            type: getMimeType(filename)
                        });
                        textCallback(`فایل یافت شد: ${filename}`);
                    }
                }
            });

            unarchiver.addEventListener('finish', () => {
                files.sort((a, b) => {
                    return a.name.localeCompare(b.name, undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    });
                });

                progressCallback(100);

                if (files.length === 0) {
                    reject(new Error('هیچ تصویر قابل نمایشی در این فایل پیدا نشد.'));
                } else {
                    resolve(files);
                }
            });

            unarchiver.addEventListener('error', e => {
                const detail = e.detail || e;
                console.error("خطا در unarchiver:", detail);

                let errorMessage = 'خطا در پردازش فایل آرشیو.';
                if (detail.message) {
                    errorMessage = detail.message;
                }

                reject(new Error(errorMessage));
            });

            unarchiver.start();
        });
    }

    async function initPdf(buffer, progressCallback) {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';

        try {
            const loadingTask = pdfjsLib.getDocument({ data: buffer });

            loadingTask.onProgress = (data) => {
                if (data.total > 0) {
                    progressCallback((data.loaded / data.total) * 100);
                }
            };

            const pdfDoc = await loadingTask.promise;
            progressCallback(100);
            return { pdfDoc, totalPages: pdfDoc.numPages };

        } catch (err) {
            console.error("خطا در پردازش فایل PDF:", err);
            throw err;
        }
    }

    const getMimeType = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'bmp': return 'image/bmp';
            case 'svg': return 'image/svg';
            default: return 'application/octet-stream';
        }
    };

    async function navigate(direction) {
        appState.navigate(direction);
    }

    // تابع تنظیم زوم
    function setZoom(scale) {
        currentScale = scale;
        imageContainer.style.transform = `scale(${scale})`;
    }

    // Event Listeners
    if (prevBtn) {
        prevBtn.addEventListener('click', async () => await navigate(-1));
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => await navigate(1));
    }

    if (pageInput) {
        pageInput.addEventListener('change', () => {
            let inputVal = parseInt(pageInput.value);

            if (!isNaN(inputVal) && inputVal >= 1 && inputVal <= appState.totalPages) {
                appState.goToPage(inputVal);
                pageInput.blur();
            } else {
                pageInput.value = appState.currentPage + 1;
                if (navigator.vibrate) navigator.vibrate(200);
            }
        });

        pageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                pageInput.blur();
            }
        });
    }

    if (pageSlider) {
        pageSlider.addEventListener('input', () => {
            const selectedPage = parseInt(pageSlider.value) - 1;

            if (pageInput) {
                pageInput.value = pageSlider.value;
            }

            if (selectedPage !== appState.currentPage) {
                appState.setState('currentPage', selectedPage);
            }
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (appState.isViewerVisible) {
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') navigate(1);
            else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') navigate(-1);
        }
    });

    // Touch navigation
    if (viewer) {
        // Touchstart event
        viewer.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isPanning = false;
        }, { passive: true });

        // Touchmove event
        viewer.addEventListener('touchmove', (e) => {
            if (e.touches.length !== 1) return;

            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;

            // اگر زوم شده → pan
            if (currentScale > 1) {
                isPanning = true;
                return;
            }

            // حرکت عمودی → swipe نیست
            if (Math.abs(dy) > Math.abs(dx)) {
                isPanning = true;
            }
        }, { passive: true });

        // Touchend event
        viewer.addEventListener('touchend', (e) => {
            if (currentScale > 1) return;
            if (isPanning) return;

            const diffX = e.changedTouches[0].clientX - touchStartX;

            if (Math.abs(diffX) > 60) {
                if (diffX < 0) navigate(-1);
                else navigate(1);
            }
        }, { passive: true });
    }

    // UI toggle
    let uiVisible = true;

    if (viewer) {
        viewer.addEventListener('click', (e) => {
            const elementsToToggle = [
                pagination,
                document.getElementById('back-btn'),
                fileNameDisplay
            ];

            const isClickOnUI = elementsToToggle.some(el => el && el.contains(e.target));

            if (isClickOnUI) {
                return;
            }

            uiVisible = !uiVisible;

            elementsToToggle.forEach(el => {
                if (el) el.style.display = uiVisible ? 'flex' : 'none';
            });
        });
    }

    // Text direction
    function setDirection(text) {
        if (fileNameDisplay) {
            const isPersian = /[\u0600-\u06FF]/.test(text);
            fileNameDisplay.style.direction = isPersian ? 'rtl' : 'ltr';
        }
    }

    // Error modal
    function showRar5ErrorModal() {
        if (currentErrorModal) {
            document.body.removeChild(currentErrorModal);
        }

        currentErrorModal = document.createElement('div');
        currentErrorModal.className = 'error-container';
        currentErrorModal.innerHTML = `
            <div class="error-box">
                <p class="error-title">خطا: فایل RAR5/CBR5 پشتیبانی نمی‌شود</p>
                <p class="error-desc">برنامه کامیک ریدر قادر به خواندن فایل‌های RAR5/CBR5 نیست</p>
                <a class="error-link" href="tutorials.html#convert-format" target="_blank">
                    آموزش تبدیل RAR5/CBR5 به ZIP
                </a>
                <button id="back-from-error" class="error-button">
                    بازگشت به صفحه اصلی
                </button>
            </div>
        `;

        document.body.appendChild(currentErrorModal);

        document.getElementById('back-from-error').addEventListener('click', () => {
            document.body.removeChild(currentErrorModal);
            currentErrorModal = null;
            appState.showUploadScreen();
            if (fileInput) fileInput.value = '';
        });
    }
});