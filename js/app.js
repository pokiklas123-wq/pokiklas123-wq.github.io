// التطبيق الرئيسي
class MangaApp {
    constructor() {
        this.currentUser = null;
        this.mangaList = [];
        this.currentFilter = 'latest';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadMangaData();
        Utils.loadTheme();
    }
    
    setupEventListeners() {
        // فتح وإغلاق الدراور
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
        
        // تبديل السمة
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // اختيار السمة من الدراور
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });
        
        // تصفية المانجا
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter');
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
        
        // إغلاق نتائج البحث عند النقر خارجها
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            if (!searchContainer.contains(e.target)) {
                this.hideSearchResults();
            }
        });
    }
    
    openDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
    }
    
    closeDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        Utils.saveTheme(theme);
        
        // تحديث الأيقونة في الهيدر
        const icon = document.querySelector('#themeToggle i');
        if (theme === 'dark') {
            icon.className = 'fas fa-sun';
        } else if (theme === 'blue') {
            icon.className = 'fas fa-palette';
        } else {
            icon.className = 'fas fa-moon';
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
    
    async loadMangaData() {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        try {
            const result = await dbManager.getMangaList();
            
            if (result.success) {
                this.mangaList = result.data;
                this.displayManga(this.mangaList);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading manga data:', error);
            mangaGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل البيانات</p>
                    <button class="btn mt-2" onclick="app.loadMangaData()">إعادة المحاولة</button>
                </div>
            `;
        }
    }
    
    displayManga(mangaArray) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        // تطبيق التصفية
        let filteredManga = [...mangaArray];
        
        switch (this.currentFilter) {
            case 'latest':
                // ترتيب حسب الأحدث (افتراضيًا حسب الترتيب في قاعدة البيانات)
                break;
            case 'popular':
                filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'rating':
                filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'oldest':
                // ترتيب حسب الأقدم (عكس الأحدث)
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
            
            // الحصول على آخر فصل (أعلى رقم)
            let latestChapter = null;
            if (manga.chapters) {
                const chapterNumbers = Object.keys(manga.chapters).map(key => {
                    const num = parseInt(key.replace('chapter_', ''));
                    return isNaN(num) ? 0 : num;
                });
                
                if (chapterNumbers.length > 0) {
                    const maxChapter = Math.max(...chapterNumbers);
                    latestChapter = `الفصل ${maxChapter}`;
                }
            }
            
            card.innerHTML = `
                <div style="position: relative;">
                    <img src="${manga.thumbnail}" alt="${manga.name}" class="manga-thumbnail">
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
            this.hideSearchResults();
            return;
        }
        
        results.slice(0, 5).forEach(manga => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            item.innerHTML = `
                <img src="${manga.thumbnail}" alt="${manga.name}">
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
        
        searchResults.style.display = 'block';
    }
    
    hideSearchResults() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
}

// تهيئة التطبيق
let app;

// دالة للاستدعاء من auth.js عند تغيير حالة المصادقة
window.onAuthStateChange = function(user) {
    if (app) {
        app.currentUser = user;
        app.updateUIForAuth(user);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app = new MangaApp();
});