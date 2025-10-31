class RatingsManager {
    constructor() {
        this.userRatings = {};
    }

    async rateManga(mangaId, rating) {
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول لتقييم المانجا', 'error');
            ui.toggleAuthModal(true);
            return;
        }

        try {
            // حفظ تقييم المستخدم
            const userRatingRef = database.ref(`user_ratings/${authManager.getCurrentUser().uid}/${mangaId}`);
            await userRatingRef.set(rating);
            
            this.userRatings[mangaId] = rating;
            
            // تحديث التقييم العام للمانجا
            await this.updateMangaRating(mangaId);
            
            ui.showAuthMessage('تم تقييم المانجا بنجاح', 'success');
            
        } catch (error) {
            ui.showAuthMessage('خطأ في التقييم: ' + error.message, 'error');
        }
    }

    async updateMangaRating(mangaId) {
        try {
            // جلب جميع تقييمات المستخدمين لهذه المانجا
            const ratingsRef = database.ref('user_ratings');
            const snapshot = await ratingsRef.once('value');
            const allRatings = snapshot.val();
            
            let total = 0;
            let count = 0;

            // حساب المتوسط
            Object.values(allRatings || {}).forEach(userRatings => {
                if (userRatings && userRatings[mangaId]) {
                    total += userRatings[mangaId];
                    count++;
                }
            });

            const average = count > 0 ? (total / count).toFixed(1) : 0;
            
            // تحديث تقييم المانجا في قاعدة البيانات
            await database.ref(`manga_list/${mangaId}/rating`).set(parseFloat(average));
            
            // إعادة تحميل قائمة المانجا
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

    getUserRating(mangaId) {
        return this.userRatings[mangaId] || 0;
    }
}

const ratingsManager = new RatingsManager();