// js/manga.js
class MangaPage {
    constructor() {
        this.mangaId = this.getMangaIdFromURL();
        this.mangaData = null;
        
        if (this.mangaId) {
            this.init();
        } else {
            this.showError('معرف المانجا غير موجود في الرابط');
        }
    }
    
    init() {
        this.initializeFirebase();
        this.setupEventListeners();
        this.loadMangaData();
        Utils.loadTheme();
        this.updateThemeIcon(); // إضافة تحديث أيقونة المظهر
    }
    
    initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.auth = firebase.auth();
            this.db = firebase.database();
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }
    
    getMangaIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }
    
    setupEventListeners() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
        
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
    
    async loadMangaData() {
        try {
            const snapshot = await this.db.ref('manga_list/' + this.mangaId).once('value');
            const mangaData = snapshot.val();
            
            if (!mangaData) {
                throw new Error('المانجا غير موجودة');
            }
            
            this.mangaData = mangaData;
            this.mangaData.id = this.mangaId;
            this.displayMangaData();
            
            await this.incrementViews();
            
        } catch (error) {
            console.error('Error loading manga:', error);
            this.showError('حدث خطأ في تحميل بيانات المانجا');
        }
    }
    
    async incrementViews() {
        try {
            const currentViews = this.mangaData.views || 0;
            await this.db.ref('manga_list/' + this.mangaId).update({
                views: currentViews + 1
            });
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    }
    
    displayMangaData() {
        const mangaDetail = document.getElementById('mangaDetail');
        
        if (!this.mangaData) {
            mangaDetail.innerHTML = '<div class="empty-state"><p>المانجا غير موجودة</p></div>';
            return;
        }
        
        const chaptersList = this.prepareChaptersList();
        const ratingValue = this.mangaData.rating ? this.mangaData.rating.toFixed(1) : 'N/A';
        const viewsCount = Utils.formatNumber(this.mangaData.views || 0);
        
        mangaDetail.innerHTML = `
            <div class="manga-detail-container">
                <div class="manga-header-detail">
                    <div class="manga-poster-detail">
                        <img src="${this.mangaData.thumbnail}" alt="${this.mangaData.name}">
                    </div>
                    <div class="manga-info-detail">
                        <h1 class="manga-title-detail">${this.mangaData.name}</h1>
                        <div class="manga-meta-detail">
                            <div class="meta-item">
                                <i class="fas fa-eye"></i>
                                <span>${viewsCount} مشاهدة</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-star"></i>
                                <span>${ratingValue} تقييم</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-list"></i>
                                <span>${Object.keys(this.mangaData.chapters || {}).length} فصل</span>
                            </div>
                        </div>
                        <div class="manga-description">
                            <p>${this.mangaData.description || 'لا يوجد وصف متاح لهذه المانجا.'}</p>
                        </div>
                        <button class="btn read-chapter-btn" onclick="window.location.href='chapter.html?manga=${this.mangaId}&chapter=${chaptersList[0]?.number || 1}'">
                            <i class="fas fa-book-open"></i>
                            ابدأ القراءة
                        </button>
                    </div>
                </div>
                
                <div class="chapters-section">
                    <h2>الفصول</h2>
                    <div class="chapters-list">
                        ${chaptersList.length > 0 ? 
                            chaptersList.map(chapter => `
                                <div class="chapter-item">
                                    <div class="chapter-info">
                                        <span class="chapter-number">الفصل ${chapter.number}</span>
                                    </div>
                                    <a href="chapter.html?manga=${this.mangaId}&chapter=${chapter.number}" class="btn read-chapter-btn">
                                        <i class="fas fa-book-open"></i>
                                        اقرأ الآن
                                    </a>
                                </div>
                            `).join('') : 
                            '<div class="empty-state"><p>لا توجد فصول متاحة بعد</p></div>'
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    prepareChaptersList() {
        if (!this.mangaData.chapters) return [];
        
        return Object.keys(this.mangaData.chapters)
            .map(key => {
                const chapterNum = key.replace('chapter_', '');
                return {
                    number: chapterNum,
                    key: key
                };
            })
            .sort((a, b) => parseInt(b.number) - parseInt(a.number));
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
        this.updateThemeIcon(theme);
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            }
        });
    }
    
    updateThemeIcon(theme = Utils.loadTheme()) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(theme)}`;
        }
    }
    
    showError(message) {
        const mangaDetail = document.getElementById('mangaDetail');
        if (mangaDetail) {
            mangaDetail.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <a href="index.html" class="btn mt-2">العودة للصفحة الرئيسية</a>
                </div>
            `;
        }
    }
}

let mangaPage;

document.addEventListener('DOMContentLoaded', () => {
    mangaPage = new MangaPage();
});
