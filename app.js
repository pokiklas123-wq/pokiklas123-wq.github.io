// js/app.js
import dbManager from './db.js';
import { NotificationsManager } from './notifications.js'; // افتراض وجود تصدير في notifications.js

class MangaApp {
    constructor() {
        this.currentUser = null;
        this.mangaList = [];
        this.currentFilter = 'latest';
        this.isInitialized = false;
        
        // التأكد من أن app هو متغير عام يمكن الوصول إليه
        window.app = this;
        
        this.init();
    }
    
    async init() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupApp());
            } else {
                await this.setupApp();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            Utils.showMessage('خطأ في تهيئة التطبيق', 'error');
        }
    }
    
    async setupApp() {
        await this.initializeFirebase();
        this.setupUI();
        await this.loadMangaData();
        this.setupAuth();
        Utils.loadTheme();
        this.setupNotifications();
        this.isInitialized = true;
        console.log('✅ التطبيق جاهز للاستخدام');
    }
    
    async initializeFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase لم يتم تحميله');
            }
            
            // تهيئة Firebase إذا لم تكن مهيأة
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.auth = firebase.auth();
            this.db = firebase.database();
            
            console.log('✅ Firebase تم تهيئته بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firebase:', error);
            Utils.showMessage('خطأ في تهيئة Firebase. تحقق من firebase-config.js', 'error');
            throw error;
        }
    }
    
    setupUI() {
        this.setupEventListeners();
        console.log('🔧 جاري إعداد واجهة المستخدم...');
    }
    
    setupEventListeners() {
        this.setupDrawer();
        this.setupTheme();
        this.setupFilters();
        this.setupSearch();
        this.setupAuthButtons();
    }
    
    setupDrawer() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
    }
    
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });
        
        // تحديث أيقونة الثيم عند التحميل
        const currentTheme = Utils.loadTheme();
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(currentTheme)}`;
        }
    }
    
    setupFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.applyFilter(filter);
            });
        });
    }
    
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((query) => {
                this.handleSearch(query);
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
            
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    this.hideSearchResults();
                }
            });
        }
    }
    
    setupNotifications() {
        // تهيئة NotificationsManager
        this.notificationsManager = new NotificationsManager(this);
        
        // تحديث عدد الإشعارات غير المقروءة
        if (this.currentUser) {
            this.notificationsManager.updateUnreadCount();
        }
    }

    setupAuthButtons() {
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                window.location.href = 'auth.html';
            });
        }
        
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    window.location.href = 'notifications.html';
                } else {
                    Utils.showMessage('يرجى تسجيل الدخول لعرض الإشعارات', 'warning');
                    window.location.href = 'auth.html';
                }
            });
        }
        
        const notificationsDrawerBtn = document.getElementById('notificationsDrawerBtn');
        if (notificationsDrawerBtn) {
            notificationsDrawerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.currentUser) {
                    window.location.href = 'notifications.html';
                } else {
                    Utils.showMessage('يرجى تسجيل الدخول لعرض الإشعارات', 'warning');
                    window.location.href = 'auth.html';
                }
                this.closeDrawer();
            });
        }
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.signOut();
            });
        }
    }
    
    setupAuth() {
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateAuthUI(user);
            
            if (user) {
                this.loadUserData(user.uid);
                this.notificationsManager.startListening(user.uid);
            } else {
                this.notificationsManager.stopListening();
            }
        });
    }
    
    updateAuthUI(user) {
        const authBtn = document.getElementById('authBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        
        if (authBtn) {
            authBtn.querySelector('span').textContent = user ? 'الملف الشخصي' : 'تسجيل الدخول';
            if (user) {
                authBtn.removeEventListener('click', () => { window.location.href = 'auth.html'; });
                authBtn.addEventListener('click', () => { window.location.href = 'profile.html'; }); // افتراض وجود صفحة ملف شخصي
            } else {
                authBtn.removeEventListener('click', () => { window.location.href = 'profile.html'; });
                authBtn.addEventListener('click', () => { window.location.href = 'auth.html'; });
            }
        }
        
        if (user) {
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
            this.updateUserInfo(user);
        } else {
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
        }
    }
    
    async updateUserInfo(user) {
        try {
            const { data: userData } = await dbManager.getUserData(user.uid);
            
            const userNameEl = document.querySelector('.user-name');
            const userEmailEl = document.querySelector('.user-email');
            const userAvatarEl = document.querySelector('.user-avatar');
            
            const displayName = userData?.displayName || user.displayName || 'مستخدم';
            const email = userData?.email || user.email || '';
            const photoURL = userData?.photoURL || user.photoURL || Utils.getAvatarUrl(displayName);
            
            if (userNameEl) userNameEl.textContent = displayName;
            if (userEmailEl) userEmailEl.textContent = email;
            if (userAvatarEl) userAvatarEl.src = photoURL;
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadUserData(userId) {
        // تم دمجها في updateUserInfo
    }
    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل المانجا...</p></div>';
        
        const { success, data, error } = await dbManager.getMangaList();
        
        if (success) {
            this.mangaList = data;
            console.log(`✅ تم تحميل ${this.mangaList.length} مانجا`);
            this.displayManga(this.mangaList);
        } else {
            console.error('❌ خطأ في تحميل المانجا:', error);
            this.showMangaError('حدث خطأ في تحميل بيانات المانجا: ' + error);
        }
    }
    
    displayManga(mangaArray) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        let filteredManga = [...mangaArray];
        
        switch (this.currentFilter) {
            case 'latest':
                // افتراض أن المانجا مرتبة حسب وقت الإضافة أو التحديث
                filteredManga.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
                break;
            case 'popular':
                filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'rating':
                filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'oldest':
                filteredManga.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
                break;
        }
        
        mangaGrid.innerHTML = '';
        
        if (filteredManga.length === 0) {
            mangaGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <p>لا توجد مانجا متاحة</p>
                </div>
            `;
            return;
        }
        
        filteredManga.forEach(manga => {
            const card = this.createMangaCard(manga);
            mangaGrid.appendChild(card);
        });
    }
    
    createMangaCard(manga) {
        const card = document.createElement('a');

	        const latestChapter = this.getLatestChapter(manga);
	        const latestChapterNumber = latestChapter ? latestChapter.replace('الفصل ', '') : null;
        card.href = latestChapterNumber ? `chapter.html?manga=${manga.id}&chapter=${latestChapterNumber}` : `manga.html?id=${manga.id}`;
        card.className = 'manga-card';
        

        
        card.innerHTML = `
            <div class="manga-image-container">
                <img src="${manga.thumbnail}" alt="${manga.name}" class="manga-thumbnail"
                     onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI0NSIgdmlld0JveD0iMCAwIDE4MCAyNDUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE4MCIgaGVpZ2h0PSIyNDUiIGZpbGw9IiMxRTI5M0IiLz48dGV4dCB4PSI5MCIgeT0iMTI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRTI4RjQyIiBmb250LWZhbWlseT0iVGFqYXdhbCIgZm9udC1zaXplPSIxNiI+4LGr4LGE4LGM4LGE4LGM8L3RleHQ+PC9zdmc+'">
            </div>
            <div class="manga-info">
                <div class="manga-title">${manga.name}</div>
                <div class="latest-chapter">${latestChapter || 'لا توجد فصول'}</div>
            </div>
        `;
        
        return card;
    }
    
    getLatestChapter(manga) {
        if (!manga.chapters) return null;
        
        const chapterKeys = Object.keys(manga.chapters);
        
        if (chapterKeys.length > 0) {
            // استخراج أرقام الفصول وفرزها
            const chapterNumbers = chapterKeys
                .map(key => parseFloat(key.replace('chapter_', '')))
                .filter(num => !isNaN(num) && num > 0);
            
            if (chapterNumbers.length > 0) {
                const maxChapter = Math.max(...chapterNumbers);
                return `الفصل ${maxChapter}`;
            }
        }
        
        return null;
    }
    
    applyFilter(filter) {
        this.currentFilter = filter;
        this.displayManga(this.mangaList);
        
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    handleSearch(query) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;
        
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }
        
        const results = this.mangaList.filter(manga => 
            manga.name.toLowerCase().includes(query.toLowerCase())
        );
        
        this.displaySearchResults(results);
    }
    
    displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;
        
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">لا توجد نتائج</div>';
        } else {
            results.slice(0, 5).forEach(manga => {
                const item = document.createElement('a');
                item.href = `manga.html?id=${manga.id}`;
                item.className = 'search-result-item';
                
                item.innerHTML = `
                    <img src="${manga.thumbnail}" alt="${manga.name}" 
                         onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA0MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNTAiIGZpbGw9IiMxRTI5M0IiLz48dGV4dCB4PSIyMCIgeT0iMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNFMjRGNDIiIGZvbnQtc2l6ZT0iOCI+TWFuZ2E8L3RleHQ+PC9zdmc+'">
                    <div>
                        <div class="search-result-title">${manga.name}</div>
                        <div class="search-result-meta">
                            <span>${Utils.formatNumber(manga.views || 0)} مشاهدة</span>
                        </div>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    this.hideSearchResults();
                });
                
                searchResults.appendChild(item);
            });
        }
        
        searchResults.style.display = 'block';
    }
    
    hideSearchResults() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
    
    openDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.classList.add('open');
        if (drawerOverlay) drawerOverlay.classList.add('open');
    }
    
    closeDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (drawerOverlay) drawerOverlay.classList.remove('open');
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : (currentTheme === 'light' ? 'blue' : 'dark');
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        Utils.saveTheme(theme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(theme)}`;
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    async signOut() {
        try {
            await this.auth.signOut();
            this.closeDrawer();
            Utils.showMessage('تم تسجيل الخروج بنجاح', 'success');
            // إعادة تحميل الصفحة الرئيسية بعد تسجيل الخروج
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                this.loadMangaData(); // إعادة تحميل بيانات المانجا
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Error signing out:', error);
            Utils.showMessage('حدث خطأ في تسجيل الخروج', 'error');
        }
    }
    
    showMangaError(message) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (mangaGrid) {
            mangaGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button class="btn mt-2" onclick="app.loadMangaData()">إعادة المحاولة</button>
                </div>
            `;
        }
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل التطبيق...');
    // التأكد من أن app يتم تهيئته مرة واحدة فقط
    if (typeof window.app === 'undefined') {
        new MangaApp();
    }
});
