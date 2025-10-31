// [file name]: ui.js
class UI {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupSearch();
        this.setupDrawerNavigation();
    }

    setupEventListeners() {
        // تبديل السمات
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.switchTheme(theme);
            });
        });

        // القائمة الجانبية
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.toggleDrawer(true);
        });

        document.getElementById('closeDrawer').addEventListener('click', () => {
            this.toggleDrawer(false);
        });

        document.getElementById('overlay').addEventListener('click', () => {
            this.toggleDrawer(false);
            this.hideSearch();
        });

        // البحث
        document.getElementById('searchBtn').addEventListener('click', () => {
            this.toggleSearch();
        });

        document.getElementById('closeSearch').addEventListener('click', () => {
            this.hideSearch();
        });

        // إغلاق نافذة التسجيل
        document.getElementById('closeAuthModal').addEventListener('click', () => {
            this.toggleAuthModal(false);
        });

        // زر تحديث الإشعارات
        document.getElementById('refreshNotifications')?.addEventListener('click', () => {
            notificationsManager.loadNotifications();
        });

        // زر مسح الذاكرة المؤقتة
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
            this.clearCache();
        });

        // منع إرسال النموذج عند الضغط على إنتر
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.closest('.auth-form')) {
                e.preventDefault();
            }
        });

        // إغلاق النافذة عند الضغط على ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleAuthModal(false);
                this.toggleDrawer(false);
                this.hideSearch();
            }
        });
    }

    setupDrawerNavigation() {
        // زر الرئيسية في القائمة الجانبية
        const homeLink = document.getElementById('drawerHomeLink');
        if (homeLink) {
            homeLink.addEventListener('click', () => {
                navigationManager.navigateTo('homePage');
                this.toggleDrawer(false);
            });
        }

        // أزرار التصنيفات
        document.querySelectorAll('.categories-list li[data-sort]').forEach(item => {
            item.addEventListener('click', (e) => {
                const sortType = e.currentTarget.getAttribute('data-sort');
                if (sortType) {
                    navigationManager.sortManga(sortType);
                    this.toggleDrawer(false);
                }
            });
        });

        // زر تسجيل الدخول في القائمة
        document.addEventListener('click', (e) => {
            if (e.target.id === 'drawerLoginBtn' || e.target.closest('#drawerLoginBtn')) {
                this.toggleAuthModal(true);
                this.toggleDrawer(false);
            }
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const closeSearch = document.getElementById('closeSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });

            // البحث عند الضغط على Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(e.target.value);
                }
            });
        }
        
        if (closeSearch) {
            closeSearch.addEventListener('click', () => {
                this.hideSearch();
                if (searchInput) searchInput.value = '';
                this.handleSearch('');
            });
        }
    }

    handleSearch(searchTerm) {
        const mangaCards = document.querySelectorAll('.manga-card');
        let visibleCount = 0;
        
        mangaCards.forEach(card => {
            const titleElement = card.querySelector('.manga-title');
            if (titleElement) {
                const title = titleElement.textContent.toLowerCase();
                if (title.includes(searchTerm.toLowerCase()) || searchTerm === '') {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        });

        const noResults = document.getElementById('noMangaMessage');
        if (noResults) {
            if (visibleCount === 0 && searchTerm !== '') {
                noResults.textContent = 'لا توجد نتائج للبحث';
                noResults.style.display = 'block';
            } else {
                noResults.style.display = 'none';
            }
        }
    }

    switchTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // تحديث تفضيلات المستخدم إذا كان مسجل الدخول
        if (authManager.getCurrentUser()) {
            database.ref('users/' + authManager.getCurrentUser().uid + '/preferences/theme').set(theme);
        }
        
        // تحديد الزر النشط
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });
    }

    toggleDrawer(show) {
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('overlay');
        
        if (show) {
            drawer.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // تحميل الإشعارات عند فتح الدراور
            if (authManager.getCurrentUser()) {
                notificationsManager.loadNotifications();
            }
        } else {
            drawer.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    toggleSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.style.display = searchContainer.style.display === 'block' ? 'none' : 'block';
            
            if (searchContainer.style.display === 'block') {
                document.getElementById('searchInput').focus();
            }
        }
    }

    hideSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.style.display = 'none';
        }
    }

    toggleAuthModal(show) {
        const authModal = document.getElementById('authModal');
        if (show) {
            authModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            authModal.classList.remove('active');
            document.body.style.overflow = '';
            this.clearAuthForm();
        }
    }

    clearAuthForm() {
        const displayName = document.getElementById('displayName');
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        
        if (displayName) displayName.value = '';
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        this.hideAuthMessage();
    }

    showAuthMessage(message, type) {
        const authMessage = document.getElementById('authMessage');
        if (authMessage) {
            authMessage.textContent = message;
            authMessage.className = 'auth-message ' + type;
            authMessage.style.display = 'block';
            
            // إخفاء الرسالة تلقائياً بعد 5 ثواني
            setTimeout(() => {
                this.hideAuthMessage();
            }, 5000);
        }
    }

    hideAuthMessage() {
        const authMessage = document.getElementById('authMessage');
        if (authMessage) {
            authMessage.style.display = 'none';
            authMessage.className = 'auth-message';
        }
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'flex';
        }
    }

    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }

    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }

    navigateToPage(pageId) {
        // إخفاء جميع الصفحات
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // إظهار الصفحة المطلوبة
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // إخفاء البحث والدراور
        this.hideSearch();
        this.toggleDrawer(false);
        
        // التمرير للأعلى
        window.scrollTo(0, 0);
        
        // إخفاء رسائل المصادقة
        this.hideAuthMessage();
    }

    // دالة لعرض رسالة تأكيد باستخدام dialog
    showConfirmation(message, confirmCallback, cancelCallback = null) {
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog-overlay';
        dialog.innerHTML = `
            <div class="confirmation-dialog">
                <div class="dialog-header">
                    <h3>تأكيد</h3>
                    <button class="dialog-close">&times;</button>
                </div>
                <div class="dialog-body">
                    <p>${message}</p>
                </div>
                <div class="dialog-footer">
                    <button class="btn btn-secondary dialog-cancel">إلغاء</button>
                    <button class="btn dialog-confirm">تأكيد</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);

        // إضافة الأنماط إذا لم تكن موجودة
        if (!document.querySelector('#confirmation-dialog-styles')) {
            const styles = document.createElement('style');
            styles.id = 'confirmation-dialog-styles';
            styles.textContent = `
                .confirmation-dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    backdrop-filter: blur(5px);
                }
                .confirmation-dialog {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 20px;
                    max-width: 400px;
                    width: 90%;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }
                .dialog-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--border-color);
                }
                .dialog-header h3 {
                    color: var(--accent-color);
                    margin: 0;
                }
                .dialog-close {
                    background: none;
                    border: none;
                    color: var(--text-color);
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .dialog-body {
                    margin-bottom: 20px;
                }
                .dialog-body p {
                    margin: 0;
                    line-height: 1.5;
                }
                .dialog-footer {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                .dialog-footer .btn {
                    min-width: 80px;
                }
            `;
            document.head.appendChild(styles);
        }

        // إضافة مستمعي الأحداث
        const closeBtn = dialog.querySelector('.dialog-close');
        const cancelBtn = dialog.querySelector('.dialog-cancel');
        const confirmBtn = dialog.querySelector('.dialog-confirm');

        const closeDialog = () => {
            document.body.removeChild(dialog);
        };

        closeBtn.addEventListener('click', closeDialog);
        
        cancelBtn.addEventListener('click', () => {
            closeDialog();
            if (cancelCallback) cancelCallback();
        });
        
        confirmBtn.addEventListener('click', () => {
            closeDialog();
            if (confirmCallback) confirmCallback();
        });

        // إغلاق بالنقر خارج الـ dialog
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
                if (cancelCallback) cancelCallback();
            }
        });
    }

    // دالة لعرض تنبيه
    showAlert(message, type = 'info', duration = 3000) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas fa-${this.getAlertIcon(type)}"></i>
                <span>${message}</span>
                <button class="alert-close">&times;</button>
            </div>
        `;
        
        // إضافة الأنماط إذا لم تكن موجودة
        if (!document.querySelector('#alert-styles')) {
            const styles = document.createElement('style');
            styles.id = 'alert-styles';
            styles.textContent = `
                .alert {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    max-width: 400px;
                    margin: 0 auto;
                    background: var(--card-bg);
                    border-radius: 8px;
                    padding: 15px;
                    border-left: 4px solid;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                }
                .alert-success {
                    border-left-color: var(--success-color);
                }
                .alert-error {
                    border-left-color: var(--error-color);
                }
                .alert-warning {
                    border-left-color: var(--warning-color);
                }
                .alert-info {
                    border-left-color: var(--accent-color);
                }
                .alert-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .alert-content i {
                    font-size: 1.2rem;
                }
                .alert-success i { color: var(--success-color); }
                .alert-error i { color: var(--error-color); }
                .alert-warning i { color: var(--warning-color); }
                .alert-info i { color: var(--accent-color); }
                .alert-content span {
                    flex: 1;
                }
                .alert-close {
                    background: none;
                    border: none;
                    color: var(--text-color);
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 25px;
                    height: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @keyframes slideIn {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(alert);

        // إغلاق التنبيه
        const closeBtn = alert.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alert.remove();
        });

        // إغلاق تلقائي بعد المدة المحددة
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // دالة لمسح الذاكرة المؤقتة
    clearCache() {
        this.showConfirmation(
            'هل أنت متأكد من مسح الذاكرة المؤقتة؟ هذا سيحذف جميع البيانات المحلية.',
            () => {
                localStorage.clear();
                sessionStorage.clear();
                this.showAlert('تم مسح الذاكرة المؤقتة بنجاح', 'success');
                
                // إعادة تحميل الصفحة بعد ثانية
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        );
    }

    // دالة لتحميل تفضيلات المستخدم
    async loadUserPreferences() {
        if (!authManager.getCurrentUser()) return;

        try {
            const snapshot = await database.ref('users/' + authManager.getCurrentUser().uid + '/preferences').once('value');
            const preferences = snapshot.val();
            
            if (preferences && preferences.theme) {
                this.switchTheme(preferences.theme);
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    }

    // دالة للحصول على إحصائيات الواجهة
    getUIStats() {
        const elements = {
            mangaCards: document.querySelectorAll('.manga-card').length,
            comments: document.querySelectorAll('.comment').length,
            notifications: document.querySelectorAll('.notification').length
        };
        
        return {
            elements: elements,
            theme: this.currentTheme,
            searchActive: document.getElementById('searchContainer')?.style.display === 'block',
            drawerOpen: document.getElementById('drawer')?.classList.contains('open')
        };
    }

    // دالة لتحسين أداء الصور
    setupImageOptimization() {
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

    // دالة لإدارة حالة الاتصال
    setupConnectionStatus() {
        window.addEventListener('online', () => {
            this.showAlert('الاتصال عاد', 'success', 2000);
        });

        window.addEventListener('offline', () => {
            this.showAlert('أنت غير متصل بالإنترنت', 'warning', 5000);
        });
    }

    // دالة لتحسين إمكانية الوصول
    setupAccessibility() {
        // إضافة اختصارات لوحة المفاتيح
        document.addEventListener('keydown', (e) => {
            // Ctrl + S للبحث
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.toggleSearch();
            }
            
            // Ctrl + M للقائمة
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                this.toggleDrawer(true);
            }
            
            // Escape للإغلاق
            if (e.key === 'Escape') {
                this.toggleDrawer(false);
                this.toggleAuthModal(false);
                this.hideSearch();
            }
        });

        // تحسين التنقل بالتبويب
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.documentElement.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.documentElement.classList.remove('keyboard-navigation');
        });
    }

    // دالة لإعداد تحسينات الأداء
    setupPerformanceOptimizations() {
        // تحميل الكسول للصور
        this.setupImageOptimization();
        
        // إدارة حالة الاتصال
        this.setupConnectionStatus();
        
        // تحسين إمكانية الوصول
        this.setupAccessibility();
        
        // تنظيف الذاكرة الدورية
        setInterval(() => {
            if (window.gc) {
                window.gc();
            }
        }, 60000); // كل دقيقة
    }

    // دالة لعرض صفحة الإشعارات
    showNotificationsPage() {
        // إنشاء محتوى صفحة الإشعارات إذا لم يكن موجوداً
        if (!document.getElementById('notificationsPage')) {
            this.createNotificationsPage();
        }
        
        navigationManager.navigateTo('notificationsPage');
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
                    ${authManager.isAdmin() ? `<button class="tab-btn" data-tab="admin">إشعارات النظام</button>` : ''}
                </div>
                <div class="tab-content">
                    <div class="tab-pane active" id="user-notifications">
                        <div class="notifications-list" id="userNotificationsList"></div>
                    </div>
                    ${authManager.isAdmin() ? `
                    <div class="tab-pane" id="admin-notifications">
                        <div class="notifications-list" id="adminNotificationsList"></div>
                    </div>
                    ` : ''}
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
}

const ui = new UI();