class RatingsManager {
    constructor() {
        this.userRatings = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        // نظام التقييم بالنجوم
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('rating-star')) {
                this.handleStarClick(e.target);
            }
        });

        // تأثيرات التمرير على النجوم
        document.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('rating-star')) {
                this.highlightStars(parseInt(e.target.dataset.rating));
            }
        });

        document.addEventListener('mouseout', () => {
            const mangaId = mangaManager.getCurrentMangaId();
            const userRating = this.userRatings[mangaId] || 0;
            this.highlightStars(userRating);
        });
    }

    handleStarClick(star) {
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول لتقييم المانجا', 'error');
            ui.toggleAuthModal(true);
            return;
        }

        const rating = parseInt(star.dataset.rating);
        const mangaId = mangaManager.getCurrentMangaId();
        
        this.rateManga(mangaId, rating);
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('active');
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    async rateManga(mangaId, rating) {
        if (!authManager.getCurrentUser()) return;

        try {
            const userRatingRef = database.ref(`user_ratings/${authManager.getCurrentUser().uid}/${mangaId}`);
            await userRatingRef.set(rating);
            
            this.userRatings[mangaId] = rating;
            await this.updateMangaRating(mangaId);
            
            ui.showAuthMessage('تم تقييم المانجا بنجاح', 'success');
            
        } catch (error) {
            ui.showAuthMessage('خطأ في التقييم: ' + error.message, 'error');
        }
    }

    async updateMangaRating(mangaId) {
        try {
            const ratingsRef = database.ref('user_ratings');
            const snapshot = await ratingsRef.once('value');
            const allRatings = snapshot.val();
            
            let total = 0;
            let count = 0;

            Object.values(allRatings || {}).forEach(userRatings => {
                if (userRatings && userRatings[mangaId]) {
                    total += userRatings[mangaId];
                    count++;
                }
            });

            const average = count > 0 ? (total / count).toFixed(1) : 0;
            
            // تحديث تقييم المانجا في قاعدة البيانات
            await database.ref(`manga_list/${mangaId}/rating`).set(parseFloat(average));
            
            // إعادة تحميل بيانات المانجا
            mangaManager.loadMangaList();
            
        } catch (error) {
            console.error('Error updating manga rating:', error);
        }
    }

    async loadUserRatings() {
        if (!authManager.getCurrentUser()) return;

        try {
            const userRatingsRef = database.ref(`user_ratings/${authManager.getCurrentUser().uid}`);
            const snapshot = await userRatingsRef.once('value');
            this.userRatings = snapshot.val() || {};
            
        } catch (error) {
            console.error('Error loading user ratings:', error);
        }
    }
}

const ratingsManager = new RatingsManager();