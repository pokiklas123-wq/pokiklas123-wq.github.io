// js/manga.js
class MangaPage {
    constructor() {
        this.mangaId = this.getMangaIdFromURL();
        this.mangaData = null;
        this.userRatings = {};
        
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
        this.loadTheme(); // تحميل الثيم عند التهيئة
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
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
    }
    
    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeUI(theme);
    }
    
    updateThemeUI(theme) {
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
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        this.saveTheme(theme);
        this.applyTheme(theme);
    }
    
    // ... باقي الدوال تبقى كما هي بدون تغيير
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
                            <span>${this.mangaData.rating || 0} تقييم</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-list"></i>
                            <span>${Object.keys(this.mangaData.chapters || {}).length} فصل</span>
                        </div>
                    </div>
                    <div class="manga-description">
                        <p>استمتع بقراءة ${this.mangaData.name} بأفضل جودة. يمكنك قراءة جميع الفصول مجاناً.</p>
                    </div>
                    
                    <!-- نظام التقييم بالنجوم -->
                    <div class="rating-section">
                        <h3>قيم المانجا</h3>
                        <div class="star-rating">
                            <i class="far fa-star" data-rating="1"></i>
                            <i class="far fa-star" data-rating="2"></i>
                            <i class="far fa-star" data-rating="3"></i>
                            <i class="far fa-star" data-rating="4"></i>
                            <i class="far fa-star" data-rating="5"></i>
                        </div>
                        <div class="rating-text">تقييمك: <span id="userRatingValue">0</span>/5</div>
                        <div class="average-rating">
                            <i class="fas fa-star"></i>
                            <span id="averageRatingValue">${this.mangaData.rating || 0}</span> تقييم عام
                        </div>
                    </div>
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
        `;
        
        // تهيئة نظام النجوم بعد عرض البيانات
        this.setupStarRating();
    }
    
    setupStarRating() {
        const stars = document.querySelectorAll('.star-rating i');
        const userRatingValue = document.getElementById('userRatingValue');
        
        // تحميل تقييم المستخدم الحالي إذا كان موجوداً
        this.loadUserRating();
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                this.rateManga(rating);
            });
            
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                this.highlightStars(rating);
            });
            
            star.addEventListener('mouseout', () => {
                const currentRating = this.userRatings[this.mangaId] || 0;
                this.updateStars(currentRating);
            });
        });
    }
    
    highlightStars(rating) {
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            if (starRating <= rating) {
                star.classList.add('fas', 'active');
                star.classList.remove('far');
            } else {
                star.classList.add('far');
                star.classList.remove('fas', 'active');
            }
        });
    }
    
    updateStars(rating) {
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach(star => {
            const starRating = parseInt(star.getAttribute('data-rating'));
            if (starRating <= rating) {
                star.classList.add('fas', 'active');
                star.classList.remove('far');
            } else {
                star.classList.add('far');
                star.classList.remove('fas', 'active');
            }
        });
    }
    
    async loadUserRating() {
        if (!this.auth.currentUser) return;
        
        try {
            const snapshot = await this.db.ref(`user_ratings/${this.auth.currentUser.uid}/${this.mangaId}`).once('value');
            const userRating = snapshot.val();
            
            if (userRating) {
                this.userRatings[this.mangaId] = userRating;
                this.updateStars(userRating);
                document.getElementById('userRatingValue').textContent = userRating;
            }
        } catch (error) {
            console.error('Error loading user rating:', error);
        }
    }
    
    async rateManga(rating) {
        if (!this.auth.currentUser) {
            this.showAuthMessage('يجب تسجيل الدخول لتقييم المانجا');
            return;
        }
        
        try {
            // حفظ تقييم المستخدم
            await this.db.ref(`user_ratings/${this.auth.currentUser.uid}/${this.mangaId}`).set(rating);
            
            // تحديث النجوم في الواجهة
            this.updateStars(rating);
            document.getElementById('userRatingValue').textContent = rating;
            
            // تحديث التقييم العام للمانجا
            await this.updateMangaRating(rating);
            
            this.showMessage('تم تقييم المانجا بنجاح', 'success');
            
        } catch (error) {
            console.error('Error rating manga:', error);
            this.showMessage('حدث خطأ في التقييم', 'error');
        }
    }
    
    async updateMangaRating(newRating) {
        try {
            // جلب جميع تقييمات المستخدمين
            const snapshot = await this.db.ref('user_ratings').once('value');
            const allRatings = snapshot.val();
            
            let total = 0;
            let count = 0;

            // حساب المتوسط
            Object.values(allRatings || {}).forEach(userRatings => {
                if (userRatings && userRatings[this.mangaId]) {
                    total += userRatings[this.mangaId];
                    count++;
                }
            });

            const average = count > 0 ? (total / count).toFixed(1) : newRating;
            
            // تحديث تقييم المانجا
            await this.db.ref(`manga_list/${this.mangaId}/rating`).set(parseFloat(average));
            
            // تحديث العرض
            document.getElementById('averageRatingValue').textContent = average;
            
        } catch (error) {
            console.error('Error updating manga rating:', error);
        }
    }
    
    showAuthMessage(message) {
        alert(message);
    }
    
    showMessage(message, type = 'info') {
        alert(message);
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