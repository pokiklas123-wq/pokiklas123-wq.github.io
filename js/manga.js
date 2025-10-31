// إدارة صفحة المانجا
class MangaPage {
    constructor() {
        this.mangaId = this.getMangaIdFromURL();
        this.mangaData = null;
        this.currentUserRating = 0;
        
        this.init();
    }
    
    init() {
        if (this.mangaId) {
            this.loadMangaData();
            this.setupEventListeners();
        } else {
            this.showError('معرف المانجا غير موجود في الرابط');
        }
        
        Utils.loadTheme();
    }
    
    getMangaIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
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
        
        // البحث عن المانجا
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // سيتم تنفيذ البحث في app.js
            });
        }
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
    
    async loadMangaData() {
        try {
            const result = await dbManager.getManga(this.mangaId);
            
            if (result.success && result.data) {
                this.mangaData = result.data;
                this.displayMangaData();
                
                // زيادة عدد المشاهدات
                await dbManager.incrementViews(this.mangaId);
                
                // تحميل تقييم المستخدم إذا كان مسجلاً
                await this.loadUserRating();
            } else {
                throw new Error('المانجا غير موجودة');
            }
        } catch (error) {
            this.showError('حدث خطأ في تحميل بيانات المانجا: ' + error.message);
        }
    }
    
    displayMangaData() {
        const mangaDetail = document.getElementById('mangaDetail');
        
        if (!this.mangaData) {
            mangaDetail.innerHTML = '<div class="empty-state"><p>المانجا غير موجودة</p></div>';
            return;
        }
        
        // تجهيز قائمة الفصول
        const chaptersList = this.prepareChaptersList();
        
        mangaDetail.innerHTML = `
            <div class="manga-header">
                <div class="manga-poster">
                    <img src="${this.mangaData.thumbnail}" alt="${this.mangaData.name}">
                </div>
                <div class="manga-info">
                    <h1 class="manga-title">${this.mangaData.name}</h1>
                    <div class="manga-meta">
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
                </div>
            </div>
            
            <div class="rating-widget">
                <h3>قيم هذه المانجا</h3>
                <div class="rating-stars" id="ratingStars">
                    ${Array.from({length: 5}, (_, i) => 
                        `<i class="fas fa-star star" data-rating="${i + 1}"></i>`
                    ).join('')}
                </div>
                <div id="ratingMessage"></div>
            </div>
            
            <div class="chapters-section">
                <h2>الفصول</h2>
                <div class="chapters-list">
                    ${chaptersList.length > 0 ? 
                        chaptersList.map(chapter => `
                            <div class="chapter-item" data-chapter="${chapter.number}">
                                <div class="chapter-info">
                                    <span class="chapter-number">الفصل ${chapter.number}</span>
                                    <span class="chapter-date">${chapter.date}</span>
                                </div>
                                <button class="btn btn-outline read-chapter-btn" data-chapter="${chapter.number}">
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
        
        // إضافة event listeners للنجوم
        this.setupRatingStars();
        
        // إضافة event listeners لأزرار القراءة
        this.setupChapterButtons();
    }
    
    prepareChaptersList() {
        if (!this.mangaData.chapters) return [];
        
        return Object.keys(this.mangaData.chapters)
            .map(key => {
                const chapterNum = key.replace('chapter_', '');
                return {
                    number: chapterNum,
                    date: 'غير محدد',
                    key: key
                };
            })
            .sort((a, b) => parseInt(b.number) - parseInt(a.number)); // ترتيب تنازلي
    }
    
    setupRatingStars() {
        const stars = document.querySelectorAll('.star');
        const ratingMessage = document.getElementById('ratingMessage');
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                this.rateManga(rating);
            });
            
            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.getAttribute('data-rating'));
                this.highlightStars(rating);
            });
        });
        
        document.getElementById('ratingStars').addEventListener('mouseleave', () => {
            this.highlightStars(this.currentUserRating);
        });
    }
    
    highlightStars(rating) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
    
    async rateManga(rating) {
        if (!firebase.auth().currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لتقييم المانجا', 'warning');
            return;
        }
        
        try {
            const user = firebase.auth().currentUser;
            const userRatingRef = firebase.database().ref(`user_ratings/${user.uid}/${this.mangaId}`);
            
            await userRatingRef.set({
                rating: rating,
                timestamp: Date.now()
            });
            
            this.currentUserRating = rating;
            this.highlightStars(rating);
            Utils.showMessage('تم تقييم المانجا بنجاح', 'success');
            
            // تحديث التقييم العام للمانجا
            await this.updateMangaRating();
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في التقييم: ' + error.message, 'error');
        }
    }
    
    async loadUserRating() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        try {
            const userRatingRef = firebase.database().ref(`user_ratings/${user.uid}/${this.mangaId}`);
            const snapshot = await userRatingRef.once('value');
            const ratingData = snapshot.val();
            
            if (ratingData && ratingData.rating) {
                this.currentUserRating = ratingData.rating;
                this.highlightStars(this.currentUserRating);
            }
        } catch (error) {
            console.error('Error loading user rating:', error);
        }
    }
    
    async updateMangaRating() {
        // هذا يحتاج إلى حساب متوسط التقييمات من جميع المستخدمين
        // سنقوم بتنفيذ بسيط لهذه الوظيفة
        try {
            const ratingsRef = firebase.database().ref(`user_ratings`);
            const snapshot = await ratingsRef.once('value');
            const allRatings = snapshot.val();
            
            let totalRating = 0;
            let ratingCount = 0;
            
            Object.keys(allRatings || {}).forEach(userId => {
                const userRatings = allRatings[userId];
                if (userRatings[this.mangaId]) {
                    totalRating += userRatings[this.mangaId].rating;
                    ratingCount++;
                }
            });
            
            if (ratingCount > 0) {
                const averageRating = totalRating / ratingCount;
                await firebase.database().ref(`manga_list/${this.mangaId}`).update({
                    rating: averageRating.toFixed(1),
                    ratingCount: ratingCount
                });
            }
        } catch (error) {
            console.error('Error updating manga rating:', error);
        }
    }
    
    setupChapterButtons() {
        const readButtons = document.querySelectorAll('.read-chapter-btn');
        readButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const chapterNumber = button.getAttribute('data-chapter');
                this.openChapter(chapterNumber);
            });
        });
        
        const chapterItems = document.querySelectorAll('.chapter-item');
        chapterItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('read-chapter-btn')) {
                    const chapterNumber = item.getAttribute('data-chapter');
                    this.openChapter(chapterNumber);
                }
            });
        });
    }
    
    openChapter(chapterNumber) {
        window.location.href = `chapter.html?manga=${this.mangaId}&chapter=${chapterNumber}`;
    }
    
    showError(message) {
        const mangaDetail = document.getElementById('mangaDetail');
        mangaDetail.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <a href="index.html" class="btn mt-2">العودة للصفحة الرئيسية</a>
            </div>
        `;
    }
}

// تهيئة صفحة المانجا
let mangaPage;

document.addEventListener('DOMContentLoaded', () => {
    mangaPage = new MangaPage();
});