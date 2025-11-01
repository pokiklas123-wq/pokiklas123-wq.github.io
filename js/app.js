// js/app.js
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
                document.addEventListener('DOMContentLoaded', () => this.setupApp());
            } else {
                await this.setupApp();
            }
        } catch (error) {
            console.error('App initialization error:', error);
            this.showError('خطأ في تهيئة التطبيق');
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
        console.log('✅ واجهة المستخدم جاهزة');
    }
    
    setupEventListeners() {
        console.log('🔧 جاري إعداد الأحداث...');
        
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
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
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
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            }
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
    
    applyFilter(filter) {
        this.currentFilter = filter;
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.displayManga(this.mangaList);
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
    
    handleSearch(query) {
        const searchResults = document.querySelector('.search-results');
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }
        
        const results = this.mangaList.filter(manga => 
            manga.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
        
        searchResults.innerHTML = '';
        
        if (results.length > 0) {
            results.forEach(manga => {
                const item = document.createElement('a');
                item.href = `manga.html?id=${manga.id}`;
                item.className = 'search-result-item';
                item.innerHTML = `
                    <img src="${manga.thumbnail}" alt="${manga.name}">
                    <div>
                        <div class="search-result-title">${manga.name}</div>
                        <div class="search-result-meta">الفصول: ${Object.keys(manga.chapters || {}).length}</div>
                    </div>
                `;
                searchResults.appendChild(item);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="search-result-item"><div class="search-result-title">لا توجد نتائج</div></div>';
            searchResults.style.display = 'block';
        }
    }
    
    hideSearchResults() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
    
    setupNotifications() {
        // Initialize NotificationsManager
        // Assuming NotificationsManager is defined in notifications.js
        if (typeof NotificationsManager !== 'undefined') {
            this.notificationsManager = new NotificationsManager(this);
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
            
            // تحديث معلومات المستخدم في الدراور
            this.updateUserInfo(user);
        } else {
            if (authBtn) authBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
        }
    }
    
    async updateUserInfo(user) {
        try {
            const snapshot = await this.db.ref('users/' + user.uid).once('value');
            const userData = snapshot.val();
            
            const userName = document.querySelector('.user-name');
            const userEmail = document.querySelector('.user-email');
            const userAvatar = document.querySelector('.user-avatar');
            
            const displayName = userData?.displayName || user.displayName || 'مستخدم';
            const email = userData?.email || user.email || '';
            const avatarUrl = userData?.profile?.avatar || 
                user.photoURL || 
                Utils.getAvatarUrl(displayName);
                
            if (userName) userName.textContent = displayName;
            if (userEmail) userEmail.textContent = email;
            if (userAvatar) userAvatar.src = avatarUrl;
            
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadUserData(userId) {
        // تم دمج هذا المنطق في updateUserInfo لتجنب التكرار
    }
    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = '<div class="loading-indicator"><div class="spinner"></div><p>جاري تحميل المانجا...</p></div>';
        
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
                this.mangaList = [];
            }
            
            this.displayManga(this.mangaList);
            
        } catch (error) {
            console.error('❌ خطأ في تحميل المانجا:', error);
            this.showMangaError('حدث خطأ في تحميل بيانات المانجا');
        }
    }
    
    displayManga(mangaArray) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        let filteredManga = [...mangaArray];
        
        switch (this.currentFilter) {
            case 'latest':
                // افتراض أن البيانات مرتبة حسب الأحدث افتراضياً أو يمكن إضافة حقل timestamp
                // حالياً نعتمد على الترتيب الافتراضي للـ Firebase
                break;
            case 'popular':
                filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'rating':
                filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'oldest':
                // عكس الترتيب الافتراضي
                filteredManga.reverse();
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
        card.href = `manga.html?id=${manga.id}`;
        card.className = 'manga-card';
        
        const latestChapterNumber = this.getLatestChapter(manga.chapters);
        const ratingValue = manga.rating ? manga.rating.toFixed(1) : 'N/A';
        const viewsCount = Utils.formatNumber(manga.views || 0);
        
        card.innerHTML = `
            <div class="manga-image-container">
                <img src="${manga.thumbnail}" alt="${manga.name}" class="manga-thumbnail" loading="lazy">
            </div>
            <div class="manga-info">
                <div>
                    <h3 class="manga-title">${manga.name}</h3>
                    <div class="manga-details">
                        <div class="manga-rating">
                            <i class="fas fa-star"></i>
                            <span>${ratingValue}</span>
                        </div>
                        <div class="manga-views">
                            <i class="fas fa-eye"></i>
                            <span>${viewsCount} مشاهدة</span>
                        </div>
                    </div>
                </div>
                ${latestChapterNumber ? 
                    `<span class="latest-chapter">الفصل ${latestChapterNumber}</span>` : 
                    ''
                }
            </div>
        `;
        return card;
    }
    
    getLatestChapter(chapters) {
        if (!chapters) return null;
        
        const chapterNumbers = Object.keys(chapters)
            .map(key => parseInt(key.replace('chapter_', '')))
            .filter(num => !isNaN(num));
            
        return chapterNumbers.length > 0 ? Math.max(...chapterNumbers) : null;
    }
    
    async signOut() {
        try {
            await this.auth.signOut();
            // لا حاجة لتحديث UI هنا، onAuthStateChanged ستقوم بذلك
            console.log('✅ تم تسجيل الخروج بنجاح');
        } catch (error) {
            console.error('❌ خطأ في تسجيل الخروج:', error);
            Utils.showMessage('حدث خطأ أثناء تسجيل الخروج', 'error');
        }
    }
    
    showError(message) {
        Utils.showMessage(message, 'error');
    }
    
    showMangaError(message) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (mangaGrid) {
            mangaGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

let mangaApp;

document.addEventListener('DOMContentLoaded', () => {
    mangaApp = new MangaApp();
});
