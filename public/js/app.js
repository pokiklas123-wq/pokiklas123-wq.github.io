// js/app.js
class MangaApp {
    constructor() {
        this.currentUser = null;
        this.mangaList = [];
        this.currentFilter = 'oldest';
        this.isInitialized = false;
        
        this.init();
    }
    
    async init() {
        try {
            await this.initializeFirebase();
            await this.loadMangaData();
            Utils.loadTheme();
            this.setupUI();
            
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
    
    async setupApp() {
        this.setupAuth();
        this.setupNotifications();
        this.isInitialized = true;
        console.log('✅ التطبيق جاهز للاستخدام');
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
    
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.closest('.theme-option').getAttribute('data-theme');
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
        this.notificationsManager = new NotificationsManager(this);
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
    this.auth.onAuthStateChanged(async (user) => {
        console.log('🔐 تغيير حالة المصادقة:', user ? `مسجل الدخول: ${user.uid}` : 'غير مسجل');
        
        this.currentUser = user;
        
        // تحديث الواجهة فوراً
        this.updateAuthUI(user);
        
        if (user) {
            // حفظ وتحميل البيانات مع معالجة محسنة
            await this.saveUserData(user);
            await this.loadUserData(user.uid);
            
            // محاولة إضافية بعد ثانيتين للتأكد
            setTimeout(async () => {
                console.log('🔄 إعادة تحميل البيانات للتأكد...');
                await this.loadUserData(user.uid);
            }, 2000);

            // محاولة ثالثة بعد 5 ثوانٍ
            setTimeout(async () => {
                console.log('🔄 محاولة أخيرة لتحميل البيانات...');
                await this.loadUserData(user.uid);
            }, 5000);
        }
    });
}
    
    async saveUserData(user) {
        try {
            const snapshot = await this.db.ref('users/' + user.uid).once('value');
            
            if (!snapshot.exists()) {
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'مستخدم',
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    profile: {
                        avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'مستخدم')}&background=4ECDC4&color=fff&size=150`,
                        bio: ''
                    }
                };
                
                await this.db.ref('users/' + user.uid).set(userData);
                console.log('✅ تم حفظ بيانات المستخدم في Firebase');
            } else {
                await this.db.ref('users/' + user.uid).update({
                    lastLogin: Date.now()
                });
            }
        } catch (error) {
            console.error('❌ خطأ في حفظ بيانات المستخدم:', error);
        }
    }
    
    updateAuthUI(user) {
        const authBtn = document.getElementById('authBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        
        if (user) {
            if (authBtn) authBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) {
                userInfo.classList.remove('hidden');
                this.updateUserInfo(user);
            }
        } else {
            if (authBtn) authBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
        }
    }
    
    async updateUserInfo(user) {
    try {
        console.log('🔄 جاري تحميل بيانات المستخدم...', user.uid);
        
        // الطريقة 1: جلب البيانات مباشرة من المسار الصحيح
        const snapshot = await this.db.ref('users/' + user.uid).once('value');
        let userData = snapshot.val();
        
        console.log('📊 بيانات المستخدم من Firebase:', userData);

        // إذا لم توجد البيانات في المسار الرئيسي، ابحث في جميع المستخدمين
        if (!userData) {
            console.log('🔍 البحث عن البيانات في جميع المستخدمين...');
            const allUsersSnapshot = await this.db.ref('users').once('value');
            const allUsers = allUsersSnapshot.val();
            
            if (allUsers) {
                // البحث عن المستخدم بواسطة البريد الإلكتروني
                for (const [key, userDataItem] of Object.entries(allUsers)) {
                    if (userDataItem && userDataItem.email === user.email) {
                        console.log('✅ تم العثور على البيانات باستخدام البريد:', key);
                        userData = userDataItem;
                        
                        // نقل البيانات إلى المسار الصحيح
                        await this.db.ref('users/' + user.uid).set(userData);
                        await this.db.ref('users/' + key).remove();
                        break;
                    }
                }
            }
        }

        // البحث عن عناصر الـ DOM في جميع الصفحات
        const userNames = document.querySelectorAll('.user-name');
        const userEmails = document.querySelectorAll('.user-email');
        const userAvatars = document.querySelectorAll('.user-avatar');
        
        const displayName = userData?.displayName || user.displayName || 'مستخدم';
        const email = userData?.email || user.email || '';
        const avatarUrl = userData?.profile?.avatar || 
                         user.photoURL || 
                         `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4ECDC4&color=fff&size=150`;

        console.log('🎯 البيانات النهائية:', { displayName, email, avatarUrl });

        // تحديث جميع عناصر الاسم في الصفحة
        userNames.forEach(userName => {
            if (userName) {
                userName.textContent = displayName;
                console.log('✅ تم تحديث الاسم في العنصر:', userName);
            }
        });

        // تحديث جميع عناصر البريد في الصفحة
        userEmails.forEach(userEmail => {
            if (userEmail) {
                userEmail.textContent = email;
                console.log('✅ تم تحديث البريد في العنصر:', userEmail);
            }
        });

        // تحديث جميع عناصر الصورة في الصفحة
        userAvatars.forEach(userAvatar => {
            if (userAvatar) {
                userAvatar.src = avatarUrl;
                userAvatar.alt = displayName;
                userAvatar.onerror = function() {
                    this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4ECDC4&color=fff&size=150`;
                };
                console.log('✅ تم تحديث الصورة في العنصر:', userAvatar);
            }
        });

        // إظهار عنصر userInfo إذا كان مخفياً
        const userInfoElements = document.querySelectorAll('.user-info');
        userInfoElements.forEach(userInfo => {
            if (userInfo) {
                userInfo.classList.remove('hidden');
                console.log('✅ تم إظهار عنصر userInfo');
            }
        });
        
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
    }
}
    
    async loadUserData(userId) {
    try {
        console.log('🔍 جاري تحميل بيانات المستخدم من Firebase...', userId);
        
        const snapshot = await this.db.ref('users/' + userId).once('value');
        const userData = snapshot.val();
        
        console.log('📋 البيانات المحملة:', userData);
        
        if (userData) {
            await this.updateUserInfo({ 
                uid: userId, 
                ...userData
            });
        } else {
            console.log('⚠️ لا توجد بيانات للمستخدم في المسار الرئيسي');
            
            // إذا لم توجد البيانات، ابحث عنها باستخدام البريد الإلكتروني
            const user = this.auth.currentUser;
            if (user && user.email) {
                console.log('🔍 البحث عن البيانات باستخدام البريد الإلكتروني...');
                const foundUser = await this.findUserDataByEmail(user);
                if (foundUser) {
                    console.log('✅ تم العثور على البيانات، جاري نقلها...');
                    // نقل البيانات إلى المسار الصحيح
                    await this.db.ref('users/' + userId).set(foundUser.userData);
                    // حذف البيانات القديمة
                    await this.db.ref('users/' + foundUser.userId).remove();
                    // إعادة تحميل البيانات
                    await this.updateUserInfo({ 
                        uid: userId, 
                        ...foundUser.userData
                    });
                }
            }
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
    }
}
// دالة مساعدة للبحث عن بيانات المستخدم في جميع السجلات
async findUserDataByEmail(user) {
    try {
        console.log('🔍 البحث عن بيانات المستخدم بالبريد:', user.email);
        
        const allUsersSnapshot = await this.db.ref('users').once('value');
        const allUsers = allUsersSnapshot.val();
        
        if (!allUsers) {
            console.log('⚠️ لا توجد مستخدمين في قاعدة البيانات');
            return null;
        }

        // البحث في جميع المستخدمين
        for (const [userId, userData] of Object.entries(allUsers)) {
            if (userData && userData.email === user.email) {
                console.log('✅ تم العثور على المستخدم:', userId, userData);
                return { userId, userData };
            }
        }
        
        console.log('❌ لم يتم العثور على المستخدم بالبريد:', user.email);
        return null;
    } catch (error) {
        console.error('❌ خطأ في البحث عن المستخدم:', error);
        return null;
    }
}

    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = this.createLoadingCards();
        
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

    createLoadingCards() {
        let loadingHTML = '';
        for (let i = 0; i < 6; i++) {
            loadingHTML += `
                <div class="manga-card loading">
                    <div class="shimmer-container"></div>
                    <div class="manga-thumbnail-container">
                        <img class="manga-thumbnail" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDE4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE4MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiMyMjMzNDQiLz48L3N2Zz4=">
                    </div>
                    <div class="manga-info">
                        <div class="manga-title">جاري التحميل...</div>
                        <div class="manga-meta">
                            <span>0 مشاهدة</span>
                            <span class="rating">
                                <i class="fas fa-star"></i>
                                <span>0</span>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
        return loadingHTML;
    }
    
    displayManga(mangaArray) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        let filteredManga = [...mangaArray];
        
        switch (this.currentFilter) {
            case 'latest':
                break;
            case 'popular':
                filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'rating':
                filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'oldest':
                filteredManga = [...mangaArray].reverse();
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
        const card = document.createElement('div');
        card.className = 'manga-card loading';
        
        const latestChapter = this.getLatestChapter(manga);
        
        card.innerHTML = `
            <div class="shimmer-container"></div>
            <div class="manga-thumbnail-container">
                <img src="${manga.thumbnail}" alt="${manga.name}" class="manga-thumbnail"
                     onload="this.parentElement.parentElement.classList.remove('loading')"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDE4MCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE4MCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiMyMjMzNDQiLz48dGV4dCB4PSI5MCIgeT0iMTI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIj5NYW5nYTwvdGV4dD48L3N2Zz4='">
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
            .map(key => parseInt(key.replace('chapter_', '')))
            .filter(num => !isNaN(num) && num > 0);
        
        if (chapterNumbers.length > 0) {
            const maxChapter = Math.max(...chapterNumbers);
            return `الفصل ${maxChapter}`;
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
        Utils.saveTheme(theme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
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
        Utils.showMessage(message, 'error');
    }
}

let app;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تحميل التطبيق...');
    app = new MangaApp();
});