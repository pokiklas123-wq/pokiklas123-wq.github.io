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
                this.navigateToPage('homePage');
                this.toggleDrawer(false);
            });
        }

        // أزرار التصنيفات
        document.querySelectorAll('.categories-list li[data-sort]').forEach(item => {
            item.addEventListener('click', (e) => {
                const sortType = e.currentTarget.getAttribute('data-sort');
                if (sortType) {
                    this.sortManga(sortType);
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

    sortManga(sortType) {
        if (!mangaManager.mangaData) {
            console.warn('بيانات المانجا غير محملة بعد');
            return;
        }

        let sortedManga = Object.keys(mangaManager.mangaData).map(key => {
            return { id: key, ...mangaManager.mangaData[key] };
        });

        switch (sortType) {
            case 'newest':
                sortedManga.sort((a, b) => {
                    const timeA = a.timestamp || a.createdAt || 0;
                    const timeB = b.timestamp || b.createdAt || 0;
                    return timeB - timeA;
                });
                break;
            case 'popular':
                sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'oldest':
                sortedManga.sort((a, b) => {
                    const timeA = a.timestamp || a.createdAt || 0;
                    const timeB = b.timestamp || b.createdAt || 0;
                    return timeA - timeB;
                });
                break;
            default:
                console.warn('نوع التصنيف غير معروف:', sortType);
                return;
        }

        console.log('تصنيف المانجا حسب:', sortType, sortedManga.length);
        mangaManager.displaySortedManga(sortedManga);
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
            document.body.style.overflow = 'hidden';
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

    // دالة لعرض رسالة تأكيد
    showConfirmation(message, confirmCallback, cancelCallback) {
        const confirmation = document.createElement('div');
        confirmation.className = 'confirmation-modal';
        confirmation.innerHTML = `
            <div class="confirmation-content">
                <p>${message}</p>
                <div class="confirmation-buttons">
                    <button class="btn confirm-btn">نعم</button>
                    <button class="btn cancel-btn">لا</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        
        const confirmBtn = confirmation.querySelector('.confirm-btn');
        const cancelBtn = confirmation.querySelector('.cancel-btn');
        
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(confirmation);
            if (confirmCallback) confirmCallback();
        });
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(confirmation);
            if (cancelCallback) cancelCallback();
        });
    }

    // دالة لعرض تنبيه
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentNode) {
                document.body.removeChild(alert);
            }
        }, 3000);
    }
}

const ui = new UI();