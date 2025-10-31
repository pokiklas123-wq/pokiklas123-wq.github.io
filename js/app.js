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
            this.setupMobileBackButton();
            
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

        // زر المشاركة في الدراور
        document.getElementById('shareDrawerBtn')?.addEventListener('click', () => {
            this.shareApp();
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
        ui.showAlert('حدث خطأ في تحميل البيانات. يرجى تحديث الصفحة.', 'error');
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
        ui.showAlert('فشل بدء التطبيق. يرجى التحقق من اتصال الإنترنت وتحديث الصفحة.', 'error');
        
        // محاولة إعادة التحميل بعد 5 ثواني
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    }

    async shareApp() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'مانجا - manus',
                    text: 'اكتشف أفضل المانجا العربية على موقع manus',
                    url: window.location.href
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // نسخ الرابط إذا لم يكن المشاركة مدعومة
            navigator.clipboard.writeText(window.location.href).then(() => {
                ui.showAlert('تم نسخ الرابط', 'success');
            }).catch(() => {
                // طريقة بديلة لنسخ الرابط
                const textArea = document.createElement('textarea');
                textArea.value = window.location.href;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                ui.showAlert('تم نسخ الرابط', 'success');
            });
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
            theme: ui.currentTheme,
            notifications: notificationsManager.getNotificationStats()
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

    // دالة للتحديث اليدوي
    async manualRefresh() {
        try {
            ui.showAlert('جاري تحديث البيانات...', 'success');
            
            await Promise.all([
                mangaManager.loadMangaList(),
                authManager.getCurrentUser() ? ratingsManager.loadUserRatings() : Promise.resolve(),
                authManager.getCurrentUser() ? notificationsManager.loadNotifications() : Promise.resolve()
            ]);
            
            ui.showAlert('تم تحديث البيانات بنجاح', 'success');
            
        } catch (error) {
            console.error('Error in manual refresh:', error);
            ui.showAlert('حدث خطأ أثناء تحديث البيانات', 'error');
        }
    }

    // دالة لإدارة حالة التطبيق
    getAppState() {
        return {
            navigation: navigationManager.getCurrentState(),
            user: authManager.getCurrentUser(),
            theme: ui.currentTheme,
            online: navigator.onLine,
            page: document.querySelector('.page.active')?.id
        };
    }

    // دالة لتحسين تجربة المستخدم
    setupUXImprovements() {
        // إضافة تأثيرات تحميل للصور
        document.addEventListener('DOMContentLoaded', () => {
            this.setupImageLoadingStates();
        });

        // تحسين التنقل باللوحة المفاتيح
        this.setupKeyboardNavigation();
    }

    setupImageLoadingStates() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('load', function() {
                this.style.opacity = '1';
            });
            img.addEventListener('error', function() {
                this.style.opacity = '1';
            });
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // التنقل بين العناصر باستخدام Tab
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    // دالة لإنشاء صفحة الإشعارات
    createNotificationsPage() {
        const notificationsPage = document.createElement('div');
        notificationsPage.id = 'notificationsPage';
        notificationsPage.className = 'page';
        notificationsPage.innerHTML = `
            <div class="page-header">
                <button class="btn back-btn" id="backFromNotifications">
                    <i class="fas fa-arrow-right"></i> العودة
                </button>
                <h2 class="page-title">الإشعارات</h2>
            </div>
            <div class="notifications-page-content">
                <div class="notifications-tabs">
                    <button class="tab-btn active" data-tab="user">إشعارات المستخدم</button>
                    <button class="tab-btn" data-tab="admin">إشعارات النظام</button>
                </div>
                <div class="tab-content">
                    <div class="tab-pane active" id="user-notifications">
                        <div class="notifications-list" id="userNotificationsList"></div>
                    </div>
                    <div class="tab-pane" id="admin-notifications">
                        <div class="notifications-list" id="adminNotificationsList"></div>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('.container').appendChild(notificationsPage);

        // إضافة مستمعي الأحداث
        document.getElementById('backFromNotifications').addEventListener('click', () => {
            navigationManager.goBack();
        });

        // إضافة أنماط صفحة الإشعارات
        if (!document.querySelector('#notifications-page-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notifications-page-styles';
            styles.textContent = `
                .notifications-page-content {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .notifications-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--border-color);
                }
                .tab-btn {
                    background: none;
                    border: none;
                    padding: 10px 20px;
                    color: var(--text-color);
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.3s ease;
                }
                .tab-btn.active {
                    color: var(--accent-color);
                    border-bottom-color: var(--accent-color);
                }
                .tab-pane {
                    display: none;
                }
                .tab-pane.active {
                    display: block;
                }
                .page-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 25px;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    // دالة لعرض صفحة الإشعارات
    showNotificationsPage() {
        // إنشاء محتوى صفحة الإشعارات إذا لم يكن موجوداً
        if (!document.getElementById('notificationsPage')) {
            this.createNotificationsPage();
        }
        
        navigationManager.navigateTo('notificationsPage');
    }
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// إدارة حالة التطبيق
window.appManager = {
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
            online: navigator.onLine,
            performance: {
                memory: performance.memory,
                navigation: performance.getEntriesByType('navigation')[0]
            }
        };
    },

    // دالة لتصدير بيانات التطبيق
    exportData() {
        const data = {
            user: authManager.getCurrentUser(),
            preferences: {
                theme: ui.currentTheme
            },
            navigation: navigationManager.getNavigationHistory(),
            stats: window.app?.getAppStats()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manga-app-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // دالة لاستيراد بيانات التطبيق
    importData(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.preferences && data.preferences.theme) {
                    ui.switchTheme(data.preferences.theme);
                }
                ui.showAlert('تم استيراد البيانات بنجاح', 'success');
            } catch (error) {
                ui.showAlert('خطأ في استيراد البيانات', 'error');
            }
        };
        reader.readAsText(file);
    }
};