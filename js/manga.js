// js/manga.js
class MangaPage {
    constructor() {
        this.mangaId = this.getMangaIdFromURL();
        this.mangaData = null;
        this.currentUserRating = 0;
        
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
	        
	        this.auth.onAuthStateChanged(user => {
	            if (user) {
	                this.loadUserRating(user.uid);
	            } else {
	                this.updateRatingMessage('يرجى تسجيل الدخول للتقييم.');
	            }
	        });
	    }
    
	    async loadMangaData() {
	        document.getElementById('mangaDetail').innerHTML = `
	            <div class="loading">
	                <div class="spinner"></div>
	            </div>
	        `;
        try {
            const snapshot = await this.db.ref('manga_list/' + this.mangaId).once('value');
            const mangaData = snapshot.val();
            
            if (!mangaData) {
                throw new Error('المانجا غير موجودة');
            }
            
            this.mangaData = mangaData;
	        this.mangaData.id = this.mangaId;
	        this.displayMangaData();
	        this.setupRatingSystem();
	        
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
	        
	        document.title = this.mangaData.name + ' - مانجا أونلاين';
        
        const chaptersList = this.prepareChaptersList();
        
        mangaDetail.innerHTML = `
	            <div class="manga-header">
	                <div class="manga-poster">
	                    <img src="${this.mangaData.thumbnail}" alt="${this.mangaData.name}">
	                </div>
	                <div class="manga-info-large">
	                    <h1 class="manga-title-large">${this.mangaData.name}</h1>
	                    <div class="manga-meta-large">
	                        <div class="meta-item">
	                            <i class="fas fa-eye"></i>
	                            <span>${this.mangaData.views || 0} مشاهدة</span>
	                        </div>
	                        <div class="meta-item">
	                            <i class="fas fa-star"></i>
	                            <span id="mangaRating">${this.mangaData.rating ? this.mangaData.rating.toFixed(1) : '0.0'}</span>
	                            <span id="ratingCount">(${this.mangaData.ratingCount || 0} تقييم)</span>
	                        </div>
	                        <div class="meta-item">
	                            <i class="fas fa-list"></i>
	                            <span>${Object.keys(this.mangaData.chapters || {}).length} فصل</span>
	                        </div>
	                    </div>
	                    <div class="manga-description">
	                        <p>استمتع بقراءة ${this.mangaData.name} بأفضل جودة. يمكنك قراءة جميع الفصول مجاناً.</p>
	                    </div>
	                </div>
	            </div>
	            
	            <div class="rating-widget">
	                <h3>تقييم المانجا</h3>
	                <p>شاركنا رأيك وقم بتقييم المانجا:</p>
	                <div class="rating-stars" id="ratingStars">
	                    <i class="fas fa-star star" data-value="1"></i>
	                    <i class="fas fa-star star" data-value="2"></i>
	                    <i class="fas fa-star star" data-value="3"></i>
	                    <i class="fas fa-star star" data-value="4"></i>
	                    <i class="fas fa-star star" data-value="5"></i>
	                </div>
	                <p id="ratingMessage"></p>
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
                                <button class="btn read-chapter-btn" onclick="mangaPage.openChapter('${chapter.number}')">
                                    <i class="fas fa-book-open"></i>
                                    اقرأ الآن
                                </button>
                            </div>
                        `).join('') : 
                        '<div class="empty-state"><p>لا توجد فصول متاحة بعد</p></div>'
                    }
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
    
    openChapter(chapterNumber) {
        window.location.href = `chapter.html?manga=${this.mangaId}&chapter=${chapterNumber}`;
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
	    
	    setupRatingSystem() {
	        const stars = document.querySelectorAll('#ratingStars .star');
	        const ratingMessage = document.getElementById('ratingMessage');
	        
	        stars.forEach(star => {
	            star.addEventListener('click', (e) => this.handleRating(e.target.dataset.value));
	            star.addEventListener('mouseover', (e) => this.highlightStars(e.target.dataset.value));
	            star.addEventListener('mouseout', () => this.highlightStars(this.currentUserRating));
	        });
	        
	        this.highlightStars(this.currentUserRating);
	    }
	    
	    highlightStars(rating) {
	        const stars = document.querySelectorAll('#ratingStars .star');
	        stars.forEach(star => {
	            if (star.dataset.value <= rating) {
	                star.classList.add('active');
	            } else {
	                star.classList.remove('active');
	            }
	        });
	    }
	    
	    updateRatingMessage(message, isError = false) {
	        const ratingMessage = document.getElementById('ratingMessage');
	        if (ratingMessage) {
	            ratingMessage.textContent = message;
	            ratingMessage.style.color = isError ? 'var(--accent-color)' : 'var(--primary-color)';
	        }
	    }
	    
	    async loadUserRating(userId) {
	        try {
	            const snapshot = await this.db.ref(`manga_ratings/${this.mangaId}/${userId}`).once('value');
	            const rating = snapshot.val();
	            if (rating) {
	                this.currentUserRating = rating.value;
	                this.highlightStars(this.currentUserRating);
	                this.updateRatingMessage(`لقد قمت بتقييم هذه المانجا بـ ${this.currentUserRating} نجوم.`);
	            } else {
	                this.updateRatingMessage('لم تقم بتقييم هذه المانجا بعد.');
	            }
	        } catch (error) {
	            console.error('Error loading user rating:', error);
	        }
	    }
	    
	    async handleRating(ratingValue) {
	        const user = this.auth.currentUser;
	        if (!user) {
	            this.updateRatingMessage('يرجى تسجيل الدخول للتقييم.', true);
	            return;
	        }
	        
	        const rating = parseInt(ratingValue);
	        const userId = user.uid;
	        
	        try {
	            // 1. Save user's rating
	            await this.db.ref(`manga_ratings/${this.mangaId}/${userId}`).set({
	                value: rating,
	                timestamp: firebase.database.ServerValue.TIMESTAMP
	            });
	            
	            this.currentUserRating = rating;
	            this.highlightStars(rating);
	            this.updateRatingMessage(`شكراً لك! تم تقييم المانجا بـ ${rating} نجوم.`);
	            
	            // 2. Update overall manga rating
	            await this.updateMangaOverallRating();
	            
	        } catch (error) {
	            console.error('Error saving rating:', error);
	            this.updateRatingMessage('حدث خطأ أثناء حفظ التقييم.', true);
	        }
	    }
	    
	    async updateMangaOverallRating() {
	        try {
	            const ratingsRef = this.db.ref(`manga_ratings/${this.mangaId}`);
	            const snapshot = await ratingsRef.once('value');
	            const ratings = snapshot.val();
	            
	            if (!ratings) {
	                await this.db.ref(`manga_list/${this.mangaId}`).update({
	                    rating: 0,
	                    ratingCount: 0
	                });
	                return;
	            }
	            
	            const ratingValues = Object.values(ratings).map(r => r.value);
	            const totalRating = ratingValues.reduce((sum, val) => sum + val, 0);
	            const ratingCount = ratingValues.length;
	            const averageRating = totalRating / ratingCount;
	            
	            await this.db.ref(`manga_list/${this.mangaId}`).update({
	                rating: averageRating,
	                ratingCount: ratingCount
	            });
	            
	            // Update displayed rating
	            document.getElementById('mangaRating').textContent = averageRating.toFixed(1);
	            document.getElementById('ratingCount').textContent = `(${ratingCount} تقييم)`;
	            
	        } catch (error) {
	            console.error('Error updating overall rating:', error);
	        }
	    }
}

let mangaPage;

document.addEventListener('DOMContentLoaded', () => {
    mangaPage = new MangaPage();
});