// js/manga.js
import dbManager from './db.js';
import ratingsManager from './ratings.js';

class MangaPage {
    constructor() {
        this.mangaId = Utils.getQueryParam('id');
        this.mangaData = null;
        this.auth = firebase.auth();
        
        if (this.mangaId) {
            this.init();
        } else {
            this.showError('معرف المانجا غير موجود في الرابط');
        }
    }
    
    init() {
        // يجب أن تكون Firebase مهيأة قبل استخدام هذا الملف
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            try {
                firebase.initializeApp(firebaseConfig);
            } catch (e) {
                console.error("Failed to initialize Firebase in MangaPage:", e);
                this.showError('خطأ في تهيئة النظام');
                return;
            }
        }
        
        this.setupEventListeners();
        this.loadMangaData();
        Utils.loadTheme();
    }
    
    setupEventListeners() {
        // إعداد أزرار الدرج والثيم (تم نقلها إلى app.js، لكن يجب إبقاؤها هنا إذا لم يتم استدعاء app.js)
        // بما أن app.js سيتم استدعاؤه في index.html فقط، يجب تكرار منطق الدرج والثيم هنا لصفحات التفاصيل
        this.setupDrawer();
        this.setupTheme();
    }
    
    setupDrawer() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
	        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
	        
	        const sortNewest = document.getElementById('sortNewest');
	        const sortOldest = document.getElementById('sortOldest');
	        
	        if (sortNewest) sortNewest.addEventListener('click', (e) => this.handleSort(e.target));
	        if (sortOldest) sortOldest.addEventListener('click', (e) => this.handleSort(e.target));
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
    
    async loadMangaData() {
        const mangaDetailContainer = document.getElementById('mangaDetailContainer');
        if (!mangaDetailContainer) return;
        
        mangaDetailContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل بيانات المانجا...</p></div>';
        
        try {
            const { success, data: mangaData, error } = await dbManager.getManga(this.mangaId);
            
            if (!success || !mangaData) {
                throw new Error(error || 'المانجا غير موجودة');
            }
            
            this.mangaData = mangaData;
            
            // زيادة عدد المشاهدات
            await dbManager.incrementViews(this.mangaId);
            
            // جلب التقييمات
            const { average: avgRating, count: ratingCount } = await dbManager.getMangaRatings(this.mangaId);
            this.mangaData.rating = avgRating;
            this.mangaData.ratingCount = ratingCount;
            
            // جلب تقييم المستخدم
            this.mangaData.userRating = await ratingsManager.getUserRating(this.mangaId);
            
            this.displayMangaData();
            this.setupRatingListeners();
            
        } catch (error) {
            console.error('Error loading manga:', error);
            this.showError('حدث خطأ في تحميل بيانات المانجا: ' + error.message);
        }
    }
    
    displayMangaData() {
        const mangaDetailContainer = document.getElementById('mangaDetailContainer');
        if (!mangaDetailContainer) return;
        
        const chaptersListHTML = this.prepareChaptersList();
        
        mangaDetailContainer.innerHTML = `
            <div class="manga-detail">
                <div class="manga-poster">
                    <img src="${this.mangaData.thumbnail}" alt="${this.mangaData.name}"
                         onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDMwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxRTI5M0IiLz48dGV4dCB4PSIxNTAiIHk9IjIwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0UyNEY0MiIgZm9udC1mYW1pbHk9IlRhamF3YWwiIGZvbnQtc2l6ZT0iMjQiPuKxq+CxhOCxjOCxhOCxjPC90ZXh0Pjwvc3ZnPg=='">
                </div>
                <div class="manga-info-large">
                    <h1 class="manga-title-large">${this.mangaData.name}</h1>
                    <div class="manga-meta-large">
                        <div class="meta-item">
                            <i class="fas fa-eye"></i>
                            <span>${Utils.formatNumber(this.mangaData.views || 0)} مشاهدة</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-star"></i>
                            <span id="mangaRating">${this.mangaData.rating || '0.0'}</span>
                            <span class="text-secondary">(${this.mangaData.ratingCount || 0})</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-list"></i>
                            <span>${Object.keys(this.mangaData.chapters || {}).length} فصل</span>
                        </div>
                    </div>
                    
                    <div class="rating-section mb-3">
                        <h3 class="text-secondary mb-1">تقييمك:</h3>
                        <div class="stars" id="userRatingStars">
                            ${this.renderStars(this.mangaData.userRating)}
                        </div>
                    </div>
                    
<div class="manga-description">
	                        <p>${this.mangaData.description || 'لا يوجد وصف متاح لهذه المانجا.'}</p>
	                    </div>
	                    
	                    <div class="chapter-description-section" id="chapterDescriptionSection" style="display: none;">
	                        <h3 class="text-secondary mb-1">وصف الفصل الأخير:</h3>
	                        <p id="chapterDescriptionText"></p>
	                    </div>
                </div>
            </div>
            
<div class="chapters-section">
	                <div class="chapters-header">
	                    <h2>الفصول</h2>
	                    <div class="sort-options">
	                        <button id="sortNewest" class="btn btn-sm active" data-sort="desc">الأحدث</button>
	                        <button id="sortOldest" class="btn btn-sm" data-sort="asc">الأقدم</button>
	                    </div>
	                </div>
	                <div class="chapters-list" id="chaptersList">
	                    ${chaptersListHTML}
	                </div>
	            </div>
        `;
    }
    
    renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            const starClass = i <= rating ? 'fas fa-star' : 'far fa-star';
            html += `<i class="${starClass}" data-rating="${i}" style="color: var(--warning-color); cursor: pointer; font-size: 1.5rem; margin-left: 0.2rem;"></i>`;
        }
        return html;
    }
    
    setupRatingListeners() {
        const starsContainer = document.getElementById('userRatingStars');
        if (!starsContainer) return;
        
        starsContainer.addEventListener('click', async (e) => {
            const target = e.target.closest('i');
            if (target && target.hasAttribute('data-rating')) {
                const rating = parseInt(target.getAttribute('data-rating'));
                
                if (!this.auth.currentUser) {
                    Utils.showMessage('يرجى تسجيل الدخول للتقييم', 'warning');
                    return;
                }
                
                const { success, newRating } = await ratingsManager.rateManga(this.mangaId, rating);
                
                if (success) {
                    // تحديث النجوم محلياً
                    this.updateStarsUI(rating);
                    // تحديث التقييم العام
                    const mangaRatingEl = document.getElementById('mangaRating');
                    if (mangaRatingEl) mangaRatingEl.textContent = newRating;
                }
            }
        });
    }
    
    updateStarsUI(rating) {
        const starsContainer = document.getElementById('userRatingStars');
        if (!starsContainer) return;
        
        starsContainer.innerHTML = this.renderStars(rating);
    }
    
	    renderChapters(chaptersArray) {
	        if (chaptersArray.length === 0) return '<div class="empty-state"><p>لا توجد فصول متاحة بعد</p></div>';
	        
	        return chaptersArray.map(chapter => `
	            <a href="chapter.html?manga=${this.mangaId}&chapter=${chapter.number}" class="chapter-item">
	                <div class="chapter-info">
	                    <span class="chapter-number">${chapter.title}</span>
	                </div>
	                <span class="btn btn-outline">
	                    <i class="fas fa-book-open"></i>
	                    اقرأ الآن
	                </span>
	            </a>
	        `).join('');
	    }
	    
	    prepareChaptersList() {
	        if (!this.mangaData.chapters) return '<div class="empty-state"><p>لا توجد فصول متاحة بعد</p></div>';
	        
	        const chaptersArray = Object.keys(this.mangaData.chapters)
	            .map(key => {
	                const chapterNum = key.replace('chapter_', '');
	                return {
	                    number: chapterNum,
	                    key: key,
	                    title: this.mangaData.chapters[key].title || `الفصل ${chapterNum}`,
	                    chapter_description: this.mangaData.chapters[key].chapter_description || '' // إضافة الوصف
	                };
	            })
	            .sort((a, b) => parseFloat(b.number) - parseFloat(a.number)); // فرز تنازلي (افتراضي)
	            
	        // عرض وصف الفصل الأخير (الأول في القائمة المفرزة)
	        if (chaptersArray.length > 0) {
	            const latestChapter = chaptersArray[0];
	            const description = latestChapter.chapter_description || 'لا يوجد وصف لهذا الفصل.';
	            
	            const descSection = document.getElementById('chapterDescriptionSection');
	            const descText = document.getElementById('chapterDescriptionText');
	            
	            if (descSection && descText) {
	                descText.textContent = description;
	                descSection.style.display = 'block';
	            }
	        }
	        
	        this.chaptersArray = chaptersArray; // حفظ القائمة للفرز
	        return this.renderChapters(chaptersArray);
	    }
	    
	    handleSort(button) {
	        const sortType = button.getAttribute('data-sort');
	        const chaptersListEl = document.getElementById('chaptersList');
	        
	        if (!this.chaptersArray || !chaptersListEl) return;
	        
	        // تحديث حالة الأزرار
	        document.getElementById('sortNewest').classList.remove('active');
	        document.getElementById('sortOldest').classList.remove('active');
	        button.classList.add('active');
	        
	        let sortedArray = [...this.chaptersArray];
	        
	        if (sortType === 'desc') {
	            // الأحدث (رقم الفصل تنازلي)
	            sortedArray.sort((a, b) => parseFloat(b.number) - parseFloat(a.number));
	        } else if (sortType === 'asc') {
	            // الأقدم (رقم الفصل تصاعدي)
	            sortedArray.sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
	        }
	        
	        chaptersListEl.innerHTML = this.renderChapters(sortedArray);
	    }
    
    showError(message) {
        const mangaDetailContainer = document.getElementById('mangaDetailContainer');
        if (mangaDetailContainer) {
            mangaDetailContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <a href="index.html" class="btn mt-2">العودة للصفحة الرئيسية</a>
                </div>
            `;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MangaPage();
});
