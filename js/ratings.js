// [file name]: ratings.js
class RatingsManager {
    constructor() {
        this.userRatings = {};
        this.userLikes = {};
        this.init();
    }
    
    init() {
        this.loadUserRatings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // تحديث التقييمات عند تغيير حالة المستخدم
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.loadUserRatings();
            } else {
                this.userRatings = {};
                this.userLikes = {};
            }
        });
    }

    async rateManga(mangaId, rating) {
        if (!authManager.requireAuth('تقييم المانجا')) {
            return;
        }

        try {
            // حفظ تقييم المستخدم
            const userRatingRef = database.ref(`user_ratings/${authManager.getCurrentUser().uid}/${mangaId}`);
            await userRatingRef.set({
                rating: rating,
                timestamp: Date.now()
            });
            
            this.userRatings[mangaId] = rating;
            
            // تحديث التقييم العام للمانجا
            await this.updateMangaRating(mangaId);
            
            ui.showAuthMessage('تم تقييم المانجا بنجاح', 'success');
            
        } catch (error) {
            console.error('Error rating manga:', error);
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
                    total += userRatings[mangaId].rating;
                    count++;
                }
            });

            const average = count > 0 ? (total / count).toFixed(1) : 0;
            
            // تحديث تقييم المانجا في قاعدة البيانات
            await database.ref(`manga_list/${mangaId}/rating`).set(parseFloat(average));
            
            // تحديث عدد التقييمات
            await database.ref(`manga_list/${mangaId}/ratingCount`).set(count);
            
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
            const ratingsData = snapshot.val() || {};
            
            // استخراج التقييمات فقط
            this.userRatings = {};
            Object.keys(ratingsData).forEach(mangaId => {
                this.userRatings[mangaId] = ratingsData[mangaId].rating;
            });
            
        } catch (error) {
            console.error('Error loading user ratings:', error);
        }
    }

    getUserRating(mangaId) {
        return this.userRatings[mangaId] || 0;
    }

    // نظام الإعجابات للفصول
    async likeChapter(mangaId, chapterId) {
        if (!authManager.requireAuth('الإعجاب بالفصل')) {
            return;
        }

        try {
            const chapterRef = database.ref(`manga_list/${mangaId}/chapters/${chapterId}`);
            const snapshot = await chapterRef.once('value');
            const chapter = snapshot.val();
            
            const likedBy = chapter.likedBy || {};
            let newLikes = chapter.chapter_like || 0;

            if (likedBy[authManager.getCurrentUser().uid]) {
                // إزالة الإعجاب
                newLikes--;
                delete likedBy[authManager.getCurrentUser().uid];
            } else {
                // إضافة الإعجاب
                newLikes++;
                likedBy[authManager.getCurrentUser().uid] = true;
            }

            await chapterRef.update({ 
                chapter_like: newLikes,
                likedBy: likedBy
            });

            // تحديث الواجهة
            mangaManager.loadMangaList();
            
        } catch (error) {
            console.error('Error liking chapter:', error);
            ui.showAuthMessage('حدث خطأ في الإعجاب', 'error');
        }
    }

    hasUserLikedChapter(mangaId, chapterId) {
        if (!authManager.getCurrentUser()) return false;
        
        // هذا سيتطلب تحمين بيانات الإعجابات أولاً
        // يمكن تنفيذه لاحقاً عند الحاجة
        return false;
    }

    // دالة للحصول على إحصائيات التقييمات
    async getRatingStats(mangaId) {
        try {
            const ratingsRef = database.ref('user_ratings');
            const snapshot = await ratingsRef.once('value');
            const allRatings = snapshot.val();
            
            let total = 0;
            let count = 0;
            const distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

            Object.values(allRatings || {}).forEach(userRatings => {
                if (userRatings && userRatings[mangaId]) {
                    const rating = userRatings[mangaId].rating;
                    total += rating;
                    count++;
                    distribution[rating]++;
                }
            });

            const average = count > 0 ? (total / count).toFixed(1) : 0;
            
            return {
                average: parseFloat(average),
                count: count,
                distribution: distribution
            };
            
        } catch (error) {
            console.error('Error getting rating stats:', error);
            return { average: 0, count: 0, distribution: {1:0, 2:0, 3:0, 4:0, 5:0} };
        }
    }

    // دالة لحذف التقييم
    async removeRating(mangaId) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`user_ratings/${authManager.getCurrentUser().uid}/${mangaId}`).remove();
            delete this.userRatings[mangaId];
            
            // تحديث التقييم العام للمانجا
            await this.updateMangaRating(mangaId);
            
            ui.showAuthMessage('تم إزالة التقييم', 'success');
            
        } catch (error) {
            console.error('Error removing rating:', error);
            ui.showAuthMessage('حدث خطأ في إزالة التقييم', 'error');
        }
    }

    // دالة للحصول على أعلى المانجا تقييماً
    async getTopRatedManga(limit = 10) {
        try {
            const snapshot = await database.ref('manga_list').once('value');
            const mangaData = snapshot.val();
            
            if (!mangaData) return [];
            
            const mangaArray = Object.keys(mangaData).map(key => {
                return { id: key, ...mangaData[key] };
            });
            
            // ترتيب حسب التقييم ثم عدد المشاهدات
            mangaArray.sort((a, b) => {
                const ratingDiff = (b.rating || 0) - (a.rating || 0);
                if (ratingDiff !== 0) return ratingDiff;
                return (b.views || 0) - (a.views || 0);
            });
            
            return mangaArray.slice(0, limit);
            
        } catch (error) {
            console.error('Error getting top rated manga:', error);
            return [];
        }
    }

    // دالة للحصول على تاريخ التقييمات
    async getRatingHistory() {
        if (!authManager.getCurrentUser()) return [];

        try {
            const userRatingsRef = database.ref(`user_ratings/${authManager.getCurrentUser().uid}`);
            const snapshot = await userRatingsRef.once('value');
            const ratingsData = snapshot.val() || {};
            
            const ratingHistory = [];
            Object.keys(ratingsData).forEach(mangaId => {
                ratingHistory.push({
                    mangaId: mangaId,
                    rating: ratingsData[mangaId].rating,
                    timestamp: ratingsData[mangaId].timestamp
                });
            });
            
            // ترتيب حسب التاريخ
            ratingHistory.sort((a, b) => b.timestamp - a.timestamp);
            
            return ratingHistory;
            
        } catch (error) {
            console.error('Error getting rating history:', error);
            return [];
        }
    }
}

const ratingsManager = new RatingsManager();