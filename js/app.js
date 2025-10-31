// js/app.js - الملف المصحح
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
            // الانتظار حتى تحميل DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupApp();
                });
            } else {
                this.setupApp();
            }
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }
    
    async setupApp() {
        await this.setupFirebase();
        this.setupEventListeners();
        await this.loadMangaData();
        this.setupAuthListener();
        this.loadTheme();
        
        this.isInitialized = true;
        console.log('Manga app initialized successfully');
    }
    
    async setupFirebase() {
        try {
            // التحقق من أن Firebase جاهز
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not loaded');
            }
            
            // إعادة التهيئة إذا لزم الأمر
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.auth = firebase.auth();
            this.database = firebase.database();
            
        } catch (error) {
            console.error('Firebase setup error:', error);
            this.showError('خطأ في تهيئة قاعدة البيانات');
        }
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // فتح وإغلاق الدراور
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) {
            drawerToggle.addEventListener('click', () => this.openDrawer());
        } else {
            console.error('Drawer toggle button not found');
        }
        
        if (drawerClose) {
            drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        
        if (drawerOverlay) {
            drawerOverlay.addEventListener('click', () => this.closeDrawer());
        }
        
        // تبديل السمة
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // اختيار السمة من الدراور
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });
        
        // تصفية المانجا
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.applyFilter(filter);
            });
        });
        
        // البحث عن المانجا
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
        
        // زر تسجيل الدخول
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.addEventListener('click', () => {
                window.location.href = 'auth.html';
            });
        } else {
            console.error('Auth button not found');
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
        
        console.log('Event listeners setup completed');
    }
    
    setupAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUIForAuth(user);
        });
    }
    
    updateUIForAuth(user) {
        const authBtn = document.getElementById('authBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.querySelector('.user-name');
        const userEmail = document.querySelector('.user-email');
        const userAvatar = document.querySelector('.user-avatar');
        
        if (user) {
            // المستخدم مسجل الدخول
            if (authBtn) authBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
            
            // تحميل بيانات المستخدم
            this.loadUserData(user.uid);
            
        } else {
            // المستخدم غير مسجل
            if (authBtn) authBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
        }
    }
    
    async loadUserData(userId) {
        try {
            const snapshot = await this.database.ref('users/' + userId).once('value');
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
    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) {
            console.error('mangaGrid element not found');
            return;
        }
        
        mangaGrid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        try {
            const snapshot = await this.database.ref('manga_list').once('value');
            const data = snapshot.val();
            
            this.mangaList = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    const manga = data[key];
                    manga.id = key;
                    this.mangaList.push(manga);
                });
                console.log('Loaded manga:', this.mangaList.length);
            } else {
                console.log('No manga data found');
            }
            
            this.displayManga(this.mangaList);
            
        } catch (error) {
            console.error('Error loading manga data:', error);
            this.showMangaError('حدث خطأ في تحميل البيانات: ' + error.message);
        }
    }
    
    displayManga(mangaArray) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        // تطبيق التصفية
        let filteredManga = [...mangaArray];
        
        switch (this.currentFilter) {
            case 'latest':
                // الأحدث أولاً (بناءً على الترتيب في قاعدة البيانات)
                break;
            case 'popular':
                filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'rating':
                filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'oldest':
                filteredManga.reverse();
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
            const card = document.createElement('div');
            card.className = 'manga-card';
            
            // الحصول على آخر فصل
            let latestChapter = null;
            if (manga.chapters) {
                const chapterNumbers = Object.keys(manga.chapters)
                    .map(key => {
                        const num = parseInt(key.replace('chapter_', ''));
                        return isNaN(num) ? 0 : num;
                    })
                    .filter(num => num > 0);
                
                if (chapterNumbers.length > 0) {
                    const maxChapter = Math.max(...chapterNumbers);
                    latestChapter = `الفصل ${maxChapter}`;
                }
            }
            
            card.innerHTML = `
                <div style="position: relative;">
                    <img src="${manga.thumbnail}" alt="${manga.name}" class="manga-thumbnail" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjNGE5MGUyIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4Ij4kTUFOR0FfTkFNRTwvdGV4dD4KPC9zdmc+'">
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
            `.replace('$MANGA_NAME', manga.name);
            
            card.addEventListener('click', () => {
                window.location.href = `manga.html?id=${manga.id}`;
            });
            
            mangaGrid.appendChild(card);
        });
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
                        <div>${manga.name}</div>
                        <div class="manga-meta">
                            <span>${manga.views || 0} مشاهدة</span>
                            <span class="rating">
                                <i class="fas fa-star"></i>
                                <span>${manga.rating || 0}</span>
                            </span>
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
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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
        // يمكن إضافة رسالة خطأ عامة هنا
    }
}

// جعل التطبيق متاحاً globally
let app;

// بدء التطبيق عندما يصبح DOM جاهزاً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new MangaApp();
    });
} else {
    app = new MangaApp();
}