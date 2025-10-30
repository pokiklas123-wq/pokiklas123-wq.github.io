class UI {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
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

        // تسجيل الدخول من الدراور
        document.getElementById('drawerLoginBtn').addEventListener('click', () => {
            this.toggleAuthModal(true);
            this.toggleDrawer(false);
        });

        // إغلاق نافذة التسجيل
        document.getElementById('closeAuthModal').addEventListener('click', () => {
            this.toggleAuthModal(false);
        });
    }

    switchTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
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
        } else {
            drawer.classList.remove('open');
            overlay.classList.remove('active');
        }
    }

    toggleSearch() {
        const searchContainer = document.getElementById('searchContainer');
        searchContainer.style.display = searchContainer.style.display === 'block' ? 'none' : 'block';
        
        if (searchContainer.style.display === 'block') {
            document.getElementById('searchInput').focus();
        }
    }

    hideSearch() {
        document.getElementById('searchContainer').style.display = 'none';
    }

    toggleAuthModal(show) {
        const authModal = document.getElementById('authModal');
        if (show) {
            authModal.classList.add('active');
        } else {
            authModal.classList.remove('active');
            this.clearAuthForm();
        }
    }

    clearAuthForm() {
        document.getElementById('displayName').style.display = 'none';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('displayName').value = '';
        this.hideAuthMessage();
    }

    showAuthMessage(message, type) {
        const authMessage = document.getElementById('authMessage');
        authMessage.textContent = message;
        authMessage.className = 'auth-message ' + type;
    }

    hideAuthMessage() {
        const authMessage = document.getElementById('authMessage');
        authMessage.style.display = 'none';
        authMessage.className = 'auth-message';
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
        document.getElementById(pageId).classList.add('active');
        
        // إخفاء البحث
        this.hideSearch();
    }
}

const ui = new UI();