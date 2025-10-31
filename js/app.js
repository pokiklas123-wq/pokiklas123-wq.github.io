// js/app.js - الملف المصحح بالكامل

class MangaApp {
    constructor() {
        this.currentUser = null;
        this.mangaList = [];
        this.currentFilter = 'latest';
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupApp();
                });
            } else {
                await this.setupApp();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            this.showError('خطأ في تهيئة التطبيق');
        }
    }
    
    async setupApp() {
        // تهيئة Firebase أولاً
        await this.initializeFirebase();
        
        // إعداد واجهة المستخدم
        this.setupUI();
        
        // تحميل البيانات
        await this.loadMangaData();
        
        // إعداد المستخدم
        this.setupAuth();
        
        this.isInitialized = true;
        console.log('✅ التطبيق جاهز للاستخدام');
    }
    
    async initializeFirebase() {
        try {
            // التحقق من تحميل Firebase
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase لم يتم تحميله');
            }
            
            // التهيئة إذا لم تكن موجودة
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.auth = firebase.auth();
            this.db = firebase.database();
            
            console.log('✅ Firebase تم تهيئته بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firebase:', error);
            throw error;
        }
    }
    
    setupUI() {
        this.setupEventListeners();
        this.loadTheme();
        console.log('✅ واجهة المستخدم جاهزة');
    }
    
    setupEventListeners() {
        console.log('🔧 جاري إعداد الأحداث...');
        
        // الدراور
        this.setupDrawer();
        
        // السمات
        this.setupTheme();
        
        // التصفية
        this.setupFilters();
        
        // البحث
        this.setupSearch();
        
        // المصادقة
        this.setupAuthButtons();
    }
    
    setupDrawer() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) {
            drawerToggle.addEventListener('click', () => this.openDrawer());
        }
        
        if (drawerClose) {
            drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        
        if (drawerOverlay) {
            drawerOverlay.addEventListener('click', () => this.closeDrawer());
        }
    }
    
    setupTheme() {
        // زر تبديل السمة في الهيدر
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // خيارات السمة في الدراور
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });
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
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            // إغلاق نتائج البحث عند النقر خارجها
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    this.hideSearchResults();
                }
            });
        }
    }
    
    setupAuthButtons() {
        // زر تسجيل الدخول
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                window.location.href = 'auth.html';
            });
        }
        
        // زر الإشعارات
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                if (this.currentUser) {
                    window.location.href = 'notifications.html';
                } else {
                    window.location.href = 'auth.html';
                }
            });
        }
        
        // زر الإشعارات في الدراور
        const notificationsDrawerBtn = document.getElementById('notificationsDrawerBtn');
        if (notificationsDrawerBtn) {
            notificationsDrawerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.currentUser) {
                    window.location.href = 'notifications.html';
                } else {
                    window.location.href = 'auth.html';
                }
                this.closeDrawer();
            });
        }
        
        // زر تسجيل الخروج
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
            }
        });
    }
    
    updateAuthUI(user) {
        const authBtn = document.getElementById('authBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        
        if (user) {
            if (authBtn) authBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
        } else {
            if (authBtn) authBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
        }
    }
    
    async loadUserData(userId) {
        try {
            const snapshot = await this.db.ref('users/' + userId).once('value');
            const userData = snapshot.val();
            
            if (userData) {
                const userName = document.querySelector('.user-name');
                const userEmail = document.querySelector('.user-email');
                const userAvatar = document.querySelector('.user-avatar');
                
                if (userName) userName.textContent = userData.displayName || 'مستخدم';
                if (userEmail) userEmail.textContent = userData.email || '';
                if (userAvatar) {
                    userAvatar.src = userData.profile?.avatar || 
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'مستخدم')}&background=4ECDC4&color=fff&size=150`;
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل المانجا...</p></div>';
        
        try {
            const snapshot = await this.db.ref('manga_list').once('value');
            const data = snapshot.val();
            
            this.mangaList = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    const manga = data[key];
                    manga.id = key;
                    this.mangaList.push(manga);
                });
                console.log(`✅ تم تحميل ${this.mangaList.length} مانجا`);
            } else {
                console.log('⚠️ لا توجد بيانات مانجا');
            }
            
            this.displayManga(this.mangaList);
            
        } catch (error) {
            console.error('❌ خطأ في تحميل المانجا:', error);
            this.showMangaError('حدث خطأ في تحميل بيانات المانجا: ' + error.message);
        }
    }
    
    displayManga(mangaArray) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        // تطبيق التصفية
        let filteredManga = [...mangaArray];
        
        switch (this.currentFilter) {
            case 'latest':
                // الأحدث أولاً (حسب الإضافة)
                break;
            case 'popular':
                filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'rating':
                filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'oldest':
                // الأقدم أولاً (عكس الأحدث)
                filteredManga = [...mangaArray].reverse();
                break;
        }
        
        // عرض المانجا
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
        const card = document.createElement('div');
        card.className = 'manga-card';
        
        // الحصول على آخر فصل
        const latestChapter = this.getLatestChapter(manga);
        
        card.innerHTML = `
            <div class="manga-thumbnail-container">
                <img src="${manga.thumbnail}" alt="${manga.name}" class="manga-thumbnail"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgODAgMTIwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4MCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiM0YTkwZTIiLz48dGV4dCB4PSI0MCIgeT0iNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPk1hbmdhPC90ZXh0Pjwvc3ZnPg=='">
                ${latestChapter ? `<div class="chapter-badge">${latestChapter}</div>` : ''}
            </div>
            <div class="manga-info">
                <div class="manga-title">${manga.name}</div>
                <div class="manga-meta">
                    <span>${manga.views || 0} مشاهدة</span>
                    <span class="rating">
                        <i class="fas fa-star"></i>
                        <span>${manga.rating || 0}</span>
                    </span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            window.location.href = `manga.html?id=${manga.id}`;
        });
        
        return card;
    }
    
    getLatestChapter(manga) {
        if (!manga.chapters) return null;
        
        const chapterNumbers = Object.keys(manga.chapters)
            .map(key => {
                const num = parseInt(key.replace('chapter_', ''));
                return isNaN(num) ? 0 : num;
            })
            .filter(num => num > 0);
        
        if (chapterNumbers.length > 0) {
            const maxChapter = Math.max(...chapterNumbers);
            return `الفصل ${maxChapter}`;
        }
        
        return null;
    }
    
    applyFilter(filter) {
        this.currentFilter = filter;
        this.displayManga(this.mangaList);
        
        // تحديث أزرار التصفية
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
        
        if (query.length === 0) {
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
                const item = document.createElement('div');
                item.className = 'search-result-item';
                
                item.innerHTML = `
                    <img src="${manga.thumbnail}" alt="${manga.name}" 
                         onerror="this.style.display='none'">
                    <div>
                        <div class="search-result-title">${manga.name}</div>
                        <div class="search-result-meta">
                            <span>${manga.views || 0} مشاهدة</span>
                        </div>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    window.location.href = `manga.html?id=${manga.id}`;
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
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // تحديث الأيقونة
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            if (theme === 'dark') {
                icon.className = 'fas fa-sun';
            } else if (theme === 'blue') {
                icon.className = 'fas fa-palette';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
        
        // تحديث الأزرار في الدراور
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.changeTheme(savedTheme);
    }
    
    async signOut() {
        try {
            await this.auth.signOut();
            this.closeDrawer();
            Utils.showMessage('تم تسجيل الخروج بنجاح', 'success');
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
    
    showError(message) {
        console.error('App Error:', message);
    }
}

// تهيئة التطبيق
let app;

// بدء التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل التطبيق...');
    app = new MangaApp();
});