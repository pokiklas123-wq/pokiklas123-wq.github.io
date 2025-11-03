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
        
               
        this.initializeFirebase();
        
        this.loadMangaData();
        
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
    
    async setupApp() {
    
      //  await 
        
        //await 
 
        
        this.setupAuth();
        
        
        
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
        // this.setupTheme();
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
        // Initialize NotificationsManager
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
            
            if (userName) userName.textContent = userData?.displayName || user.displayName || 'مستخدم';
            if (userEmail) userEmail.textContent = userData?.email || user.email || '';
            if (userAvatar) {
                userAvatar.src = userData?.profile?.avatar || 
                    user.photoURL || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'مستخدم')}&background=4ECDC4&color=fff&size=150`;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadUserData(userId) {
        try {
            const snapshot = await this.db.ref('users/' + userId).once('value');
            const userData = snapshot.val();
            
            if (userData) {
                this.updateUserInfo({ uid: userId, ...userData });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        // إظهار تأثير التحميل
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
                filteredManga.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
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
    /***/
    
    // دالة لإنشاء بطاقة مانجا
createMangaCard(manga) {
    // إنشاء عنصر div جديد للبطاقة
    const card = document.createElement('div');
    // تعيين كلاس للبطاقة مع وضعية التحميل
    card.className = 'manga-card loading';
    
    // الحصول على أحدث فصل للمانجا
    const latestChapter = this.getLatestChapter(manga);
    
    // بناء محتوى HTML للبطاقة
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
                <!-- تعديل هنا: إضافة أيقونة العين بدلاً من الإيموجي -->
                <span><i class="fas fa-eye"></i> ${Utils.formatNumber(manga.views || 0)}</span>
                <span class="rating">
                    <i class="fas fa-star"></i>
                    <span>${manga.rating || 0}</span>
                </span>
            </div>
        </div>
    `;
    
    // إضافة حدث النقر للبطاقة للانتقال إلى صفحة المانجا
    card.addEventListener('click', () => {
        window.location.href = `manga.html?id=${manga.id}`;
    });
    
    // إرجاع البطاقة المنشأة
    return card;
}

// دالة للحصول على أحدث فصل للمانجا
getLatestChapter(manga) {
    // التحقق من وجود فصول للمانجا
    if (!manga.chapters) return null;
    
    // استخراج أرقام الفصول من المانجا
    const chapterNumbers = Object.keys(manga.chapters)
        // تحويل أسماء الفصول إلى أرقام
        .map(key => parseInt(key.replace('chapter_', '')))
        // تصفية الأرقام غير الصحيحة والأصفار
        .filter(num => !isNaN(num) && num > 0);
    
    // التحقق من وجود فصول صالحة
    if (chapterNumbers.length > 0) {
        // إيجاد أكبر رقم فصل
        const maxChapter = Math.max(...chapterNumbers);
        // إرجاع نص الفصل
        return `الفصل ${maxChapter}`;
    }
    
    // إرجاع null إذا لم توجد فصول
    return null;
}

// دالة لتطبيق الفلتر على المانجا
applyFilter(filter) {
    // حفظ الفلتر الحالي
    this.currentFilter = filter;
    // عرض المانجا بعد التصفية
    this.displayManga(this.mangaList);
    
    // الحصول على جميع أزرار الفلتر
    const filterBtns = document.querySelectorAll('.filter-btn');
    // تحديث حالة الأزرار (نشط/غير نشط)
    filterBtns.forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            // إضافة كلاس active للزر المحدد
            btn.classList.add('active');
        } else {
            // إزالة كلاس active من الأزرار الأخرى
            btn.classList.remove('active');
        }
    });
}

// دالة للتعامل مع عملية البحث
handleSearch(query) {
    // الحصول على عنصر نتائج البحث
    const searchResults = document.querySelector('.search-results');
    // الخروج إذا لم يوجد عنصر نتائج البحث
    if (!searchResults) return;
    
    // التحقق إذا كان نص البحث فارغاً
    if (!query.trim()) {
        // إخفاء نتائج البحث إذا كان البحث فارغاً
        this.hideSearchResults();
        return;
    }
    
    // تصفية قائمة المانجا بناءً على نص البحث
    const results = this.mangaList.filter(manga => 
        // البحث في اسم المانجا (باستخدام حالة الأحرف الصغيرة للمقارنة)
        manga.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // عرض نتائج البحث
    this.displaySearchResults(results);
}

// دالة لعرض نتائج البحث
displaySearchResults(results) {
    // الحصول على عنصر نتائج البحث
    const searchResults = document.querySelector('.search-results');
    // الخروج إذا لم يوجد عنصر نتائج البحث
    if (!searchResults) return;
    
    // تفريغ محتوى نتائج البحث السابقة
    searchResults.innerHTML = '';
    
    // التحقق إذا كانت هناك نتائج
    if (results.length === 0) {
        // عرض رسالة عدم وجود نتائج
        searchResults.innerHTML = '<div class="search-result-item">لا توجد نتائج</div>';
    } else {
        // عرض أول 5 نتائج فقط
        results.slice(0, 5).forEach(manga => {
            // إنشاء عنصر لكل نتيجة بحث
            const item = document.createElement('div');
            // إضافة كلاس لعنصر نتيجة البحث
            item.className = 'search-result-item';
            
            // بناء محتوى HTML لعنصر نتيجة البحث
            item.innerHTML = `
                <img src="${manga.thumbnail}" alt="${manga.name}" 
                     onerror="this.style.display='none'">
                <div>
                    <div class="search-result-title">${manga.name}</div>
                    <div class="search-result-meta">
                        <!-- تعديل هنا: إضافة أيقونة العين بدلاً من الإيموجي -->
                        <span><i class="fas fa-eye"></i> ${Utils.formatNumber(manga.views || 0)}</span>
                    </div>
                </div>
            `;
            
            // إضافة حدث النقر للعنصر للانتقال إلى صفحة المانجا
            item.addEventListener('click', () => {
                window.location.href = `manga.html?id=${manga.id}`;
                // إخفاء نتائج البحث بعد النقر
                this.hideSearchResults();
            });
            
            // إضافة عنصر نتيجة البحث إلى قائمة النتائج
            searchResults.appendChild(item);
        });
    }
    
    // عرض عنصر نتائج البحث
    searchResults.style.display = 'block';
}
    
    
    /*****/
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