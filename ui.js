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

        // منع إرسال النموذج عند الضغط على إنتر
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.closest('.auth-form')) {
                e.preventDefault();
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
        drawer.classList.remove('open');
        overlay.classList.remove('active');
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