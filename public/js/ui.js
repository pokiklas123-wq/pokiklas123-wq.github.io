class UI {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupSearch();
    }

    setupEventListeners() {
        // البحث - الإصلاح الرئيسي هنا
        const searchBtn = document.getElementById('searchBtn');
        const closeSearch = document.getElementById('closeSearch');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.toggleSearch();
            });
        }
        
        if (closeSearch) {
            closeSearch.addEventListener('click', () => {
                this.hideSearch();
            });
        }

        // إغلاق البحث بالزر ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSearch();
            }
        });

        // البحث أثناء الكتابة
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // بقية المستمعين للأحداث...
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.toggleDrawer(true);
            });
        }

        const closeDrawer = document.getElementById('closeDrawer');
        if (closeDrawer) {
            closeDrawer.addEventListener('click', () => {
                this.toggleDrawer(false);
            });
        }

        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.toggleDrawer(false);
                this.hideSearch();
            });
        }

        // تبديل السمات
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.switchTheme(theme);
            });
        });

        // إغلاق نافذة التسجيل
        const closeAuthModal = document.getElementById('closeAuthModal');
        if (closeAuthModal) {
            closeAuthModal.addEventListener('click', () => {
                this.toggleAuthModal(false);
            });
        }

        // منع إرسال النموذج عند الضغط على إنتر
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.closest('.auth-form')) {
                e.preventDefault();
            }
        });
    }

    setupSearch() {
        // تم نقل المنطق إلى setupEventListeners
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

        // إظهار رسالة إذا لم توجد نتائج
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

    toggleSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.classList.toggle('active');
            if (searchContainer.classList.contains('active')) {
                document.getElementById('searchInput').focus();
            }
        }
    }

    hideSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.classList.remove('active');
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            this.handleSearch('');
        }
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

    closeDrawer() {
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    toggleDrawer(show) {
        const drawer = document.getElementById('drawer');
        const overlay = document.getElementById('overlay');
        
        if (show) {
            if (drawer) drawer.classList.add('open');
            if (overlay) overlay.classList.add('active');
        } else {
            if (drawer) drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        }
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
        const displayName = document.getElementById('displayName');
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        
        if (displayName) displayName.style.display = 'none';
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        if (displayName) displayName.value = '';
        this.hideAuthMessage();
    }

    showAuthMessage(message, type) {
        const authMessage = document.getElementById('authMessage');
        if (authMessage) {
            authMessage.textContent = message;
            authMessage.className = 'auth-message ' + type;
            authMessage.style.display = 'block';
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
    }
}

const ui = new UI();