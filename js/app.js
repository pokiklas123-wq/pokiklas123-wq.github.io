// [file name]: app.js
class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupServiceWorker();
            this.setupAnalytics();
            
            // تحميل حالة التنقل أولاً
            navigationManager.loadState();
            
            // ثم تحميل البيانات
            await this.loadInitialData();
            
            this.setupPerformanceMonitoring();
            this.setupErrorHandling();
            
            console.log('التطبيق بدأ بنجاح');
        } catch (error) {
            console.error('خطأ في بدء التطبيق:', error);
            this.handleInitializationError(error);
        }
    }

    setupEventListeners() {
        // إدارة حالة الاتصال
        window.addEventListener('online', () => {
            this.handleOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.handleOfflineStatus();
        });

        // إدارة رؤية الصفحة
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // منع الإجراءات الافتراضية
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
            }
        });

        // تحسين أداء التحميل
        window.addEventListener('load', () => {
            this.handlePageLoad();
        });
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker مسجل بنجاح:', registration);
                })
                .catch((error) => {
                    console.log('فشل تسجيل Service Worker:', error);
                });
        }
    }

    setupAnalytics() {
        // يمكن إضافة Google Analytics أو أي نظام تحليلات هنا
        console.log('تم إعداد النظام التحليلي');
    }

    setupPerformanceMonitoring() {
        // مراقبة أداء التطبيق
        if ('performance' in window) {
            const navigationTiming = performance.getEntriesByType('navigation')[0];
            if (navigationTiming) {
                console.log('أداء التحميل:', {
                    DOMContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart,
                    Load: navigationTiming.loadEventEnd - navigationTiming.navigationStart
                });
            }
        }
    }

    setupErrorHandling() {
        // معالجة الأخطاء العامة
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
        });
    }

    async loadInitialData() {
        try {
            await mangaManager.loadMangaList();
            
            if (authManager.getCurrentUser()) {
                await Promise.all([
                    ratingsManager.loadUserRatings(),
                    notificationsManager.loadNotifications()
                ]);
            }

            this.hideSplashScreen();
            
        } catch (error) {
            console.error('خطأ في تحميل البيانات الأولية:', error);
            this.showDataLoadError();
        }
    }

    hideSplashScreen() {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) {
            splashScreen.style.display = 'none';
        }
    }

    showDataLoadError() {
        ui.showAuthMessage('حدث خطأ في تحميل البيانات. يرجى تحديث الصفحة.', 'error');
    }

    handleOnlineStatus() {
        console.log('الاتصال عاد');
        ui.showAlert('الاتصال عاد', 'success');
        
        // إعادة تحميل البيانات عند عودة الاتصال
        setTimeout(() => {
            mangaManager.loadMangaList();
            if (authManager.getCurrentUser()) {
                notificationsManager.loadNotifications();
            }
        }, 1000);
    }

    handleOfflineStatus() {
        console.log('فقدان الاتصال');
        ui.showAlert('أنت غير متصل بالإنترنت', 'warning');
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.handlePageHidden();
        } else {
            this.handlePageVisible();
        }
    }

    handlePageHidden() {
        // حفظ الحالة عند مغادرة الصفحة
        navigationManager.saveState();
    }

    handlePageVisible() {
        // تحديث البيانات عند العودة للصفحة
        if (authManager.getCurrentUser()) {
            notificationsManager.loadNotifications();
        }
    }

    handlePageLoad() {
        // إخفاء شاشة التحميل
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(element => {
            element.style.display = 'none';
        });

        // تحسين الأداء بعد التحميل
        this.optimizePerformance();
    }

    optimizePerformance() {
        // تحسين الصور
        this.lazyLoadImages();
        
        // تنظيف الذاكرة
        if (window.gc) {
            window.gc();
        }
    }

    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    handleGlobalError(error) {
        console.error('خطأ عام:', error);
        
        // تجاهل بعض الأخطاء الشائعة
        if (error.message.includes('Loading chunk') || error.message.includes('Failed to fetch')) {
            return;
        }
        
        ui.showAlert('حدث خطأ غير متوقع. يرجى تحديث الصفحة.', 'error');
    }

    handlePromiseRejection(reason) {
        console.error('رفض Promise:', reason);
    }

    handleInitializationError(error) {
        ui.showAuthMessage('فشل بدء التطبيق. يرجى التحقق من اتصال الإنترنت وتحديث الصفحة.', 'error');
        
        // محاولة إعادة التحميل بعد 5 ثواني
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    }

    setupMobileBackButton() {
        if (window.innerWidth <= 768) {
            this.createMobileBackButton();
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.createMobileBackButton();
            } else {
                this.removeMobileBackButton();
            }
        });
    }

    createMobileBackButton() {
        if (document.getElementById('mobileBackBtn')) return;

        const backButton = document.createElement('button');
        backButton.id = 'mobileBackBtn';
        backButton.className = 'mobile-back-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
        backButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--accent-color);
            color: white;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
            transition: all 0.3s ease;
        `;
        
        backButton.addEventListener('click', () => {
            navigationManager.goBack();
        });

        document.body.appendChild(backButton);

        // تحديث حالة الزر
        setInterval(() => {
            backButton.style.display = navigationManager.canGoBack() ? 'block' : 'none';
        }, 100);
    }

    removeMobileBackButton() {
        const backButton = document.getElementById('mobileBackBtn');
        if (backButton) {
            backButton.remove();
        }
    }

    // دالة للحصول على إحصائيات التطبيق
    getAppStats() {
        const mangaCount = mangaManager.mangaData ? Object.keys(mangaManager.mangaData).length : 0;
        const user = authManager.getCurrentUser();
        
        return {
            mangaCount: mangaCount,
            user: user ? {
                name: user.displayName,
                email: user.email,
                joined: new Date(user.metadata.creationTime).toLocaleDateString('ar-SA')
            } : null,
            online: navigator.onLine,
            theme: ui.currentTheme
        };
    }

    // دالة لإعادة تعيين التطبيق
    resetApp() {
        ui.showConfirmation(
            'هل أنت متأكد من إعادة تعيين التطبيق؟ سيتم مسح جميع الإعدادات المحلية.',
            () => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
            }
        );
    }

    // دولة للتحديث اليدوي
    async manualRefresh() {
        try {
            ui.showAuthMessage('جاري تحديث البيانات...', 'success');
            
            await Promise.all([
                mangaManager.loadMangaList(),
                authManager.getCurrentUser() ? ratingsManager.loadUserRatings() : Promise.resolve(),
                authManager.getCurrentUser() ? notificationsManager.loadNotifications() : Promise.resolve()
            ]);
            
            ui.showAuthMessage('تم تحديث البيانات بنجاح', 'success');
            
        } catch (error) {
            console.error('Error in manual refresh:', error);
            ui.showAuthMessage('حدث خطأ أثناء تحديث البيانات', 'error');
        }
    }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

// إدارة حالة التطبيق
window.app = {
    version: '1.0.0',
    debugMode: localStorage.getItem('debugMode') === 'true',
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        localStorage.setItem('debugMode', this.debugMode);
        console.log('وضع التصحيح:', this.debugMode ? 'مفعل' : 'معطل');
    },
    
    getState() {
        return {
            navigation: navigationManager.getCurrentState(),
            user: authManager.getCurrentUser(),
            theme: ui.currentTheme,
            online: navigator.onLine
        };
    }
};