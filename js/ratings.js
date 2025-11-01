// js/ratings.js
// هذا الملف يدير منطق التقييمات والإعجابات

import dbManager from './db.js';

class RatingsManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        // يجب أن تكون Firebase مهيأة قبل استخدام هذا الملف
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error("Firebase is not initialized. RatingsManager cannot function.");
            return;
        }
        
        firebase.auth().onAuthStateChanged(user => {
            this.currentUser = user;
        });
    }

    async rateManga(mangaId, rating) {
        if (!this.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لتقييم المانجا', 'warning');
            // يمكن إضافة منطق لتحويل المستخدم إلى صفحة تسجيل الدخول
            return { success: false, error: 'User not logged in' };
        }

        const { success, newRating, error } = await dbManager.rateManga(mangaId, rating, this.currentUser.uid);
        
        if (success) {
            Utils.showMessage(`تم تقييم المانجا بنجاح. التقييم الجديد: ${newRating}`, 'success');
        } else {
            Utils.showMessage('خطأ في التقييم: ' + error, 'error');
        }
        
        return { success, newRating, error };
    }
    
    async getUserRating(mangaId) {
        if (!this.currentUser) return 0;
        return dbManager.getUserRating(mangaId, this.currentUser.uid);
    }
    
    async getMangaRatings(mangaId) {
        return dbManager.getMangaRatings(mangaId);
    }
    
    // منطق الإعجاب بالتعليقات (تم نقله إلى dbManager، ولكن يمكن إضافة واجهة هنا)
    async toggleCommentLike(mangaId, chapterId, commentId) {
        if (!this.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول للإعجاب بالتعليقات', 'warning');
            return { success: false, error: 'User not logged in' };
        }
        
        const { success, liked, error } = await dbManager.toggleCommentLike(mangaId, chapterId, commentId, this.currentUser.uid);
        
        if (success) {
            Utils.showMessage(liked ? 'تم الإعجاب بالتعليق' : 'تم إزالة الإعجاب', 'info');
        } else {
            Utils.showMessage('خطأ في الإعجاب: ' + error, 'error');
        }
        
        return { success, liked, error };
    }
    
    async isCommentLiked(mangaId, chapterId, commentId) {
        if (!this.currentUser) return false;
        return dbManager.isCommentLiked(mangaId, chapterId, commentId, this.currentUser.uid);
    }
}

const ratingsManager = new RatingsManager();
export default ratingsManager;
