// js/db.js
// يجب أن يتم استدعاء هذا الملف بعد تحميل Firebase SDKs و firebase-config.js

class DatabaseManager {
    constructor() {
        // التحقق من تهيئة Firebase
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error("Firebase is not initialized. Please ensure firebase-config.js and SDKs are loaded.");
            // محاولة التهيئة إذا لم تكن مهيأة
            try {
                firebase.initializeApp(firebaseConfig);
            } catch (e) {
                console.error("Failed to initialize Firebase in DatabaseManager:", e);
            }
        }
        this.database = firebase.database();
    }
    
    // جلب قائمة المانجا
    async getMangaList() {
        try {
            const snapshot = await this.database.ref('manga_list').once('value');
            const data = snapshot.val();
            const mangaList = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    const manga = data[key];
                    manga.id = key;
                    mangaList.push(manga);
                });
            }
            
            return { success: true, data: mangaList };
        } catch (error) {
            console.error("Error getting manga list:", error);
            return { success: false, error: error.message };
        }
    }
    
    // جلب مانجا محددة
    async getManga(mangaId) {
        try {
            const snapshot = await this.database.ref('manga_list/' + mangaId).once('value');
            const manga = snapshot.val();
            
            if (manga) {
                manga.id = mangaId;
            }
            
            return { success: true, data: manga };
        } catch (error) {
            console.error(`Error getting manga ${mangaId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // جلب بيانات فصل محدد
    async getChapter(mangaId, chapterId) {
        try {
            const snapshot = await this.database.ref(`manga_list/${mangaId}/chapters/${chapterId}`).once('value');
            const chapter = snapshot.val();
            
            if (chapter) {
                chapter.id = chapterId;
            }
            
            return { success: true, data: chapter };
        } catch (error) {
            console.error(`Error getting chapter ${chapterId} for manga ${mangaId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // جلب بيانات المستخدم
    async getUserData(userId) {
        try {
            const snapshot = await this.database.ref('users/' + userId).once('value');
            const userData = snapshot.val();
            
            return { success: true, data: userData };
        } catch (error) {
            console.error(`Error getting user data for ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // تحديث بيانات المستخدم
    async updateUserData(userId, data) {
        try {
            await this.database.ref('users/' + userId).update(data);
            return { success: true };
        } catch (error) {
            console.error(`Error updating user data for ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // زيادة عدد المشاهدات
    async incrementViews(mangaId) {
        try {
            const mangaRef = this.database.ref('manga_list/' + mangaId + '/views');
            // استخدام transaction لضمان التحديث الآمن
            await mangaRef.transaction((currentViews) => {
                return (currentViews || 0) + 1;
            });
            
            return { success: true };
        } catch (error) {
            console.error(`Error incrementing views for ${mangaId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // إضافة إشعار للمستخدم
    async addNotification(userId, notification) {
        try {
            const notificationRef = this.database.ref(`notifications/${userId}`).push();
            const notificationId = notificationRef.key;
            
            const notificationData = {
                id: notificationId,
                title: notification.title,
                message: notification.message,
                type: notification.type || 'info',
                link: notification.link || null,
                read: false,
                timestamp: firebase.database.ServerValue.TIMESTAMP // استخدام قيمة الخادم للوقت
            };
            
            await notificationRef.set(notificationData);
            
            return { success: true, notificationId: notificationId };
        } catch (error) {
            console.error(`Error adding notification for ${userId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // إشعار عند الرد على تعليق
    async notifyCommentReply(commentAuthorId, replyData, chapterLink) {
        // يجب أن يكون commentAuthorId هو uid للمستخدم
        if (!commentAuthorId) return { success: false, error: "Comment author ID is missing." };
        
        try {
            const notification = {
                title: 'رد جديد على تعليقك',
                message: `قام ${replyData.userDisplayName} بالرد على تعليقك في الفصل.`,
                type: 'comment',
                link: chapterLink
            };
            
            return await this.addNotification(commentAuthorId, notification);
        } catch (error) {
            console.error('Error sending comment reply notification:', error);
            return { success: false, error: error.message };
        }
    }
    
    // جلب التعليقات لفصل معين
    async getComments(mangaId, chapterId) {
        try {
            const snapshot = await this.database.ref(`comments/${mangaId}/${chapterId}`).once('value');
            const commentsData = snapshot.val();
            
            const comments = [];
            if (commentsData) {
                Object.keys(commentsData).forEach(key => {
                    comments.push({ id: key, ...commentsData[key] });
                });
            }
            
            // فرز التعليقات حسب الوقت (الأحدث أولاً)
            comments.sort((a, b) => b.timestamp - a.timestamp);
            
            return { success: true, data: comments };
        } catch (error) {
            console.error(`Error getting comments for ${mangaId}/${chapterId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // إضافة تعليق جديد
    async addComment(mangaId, chapterId, userId, displayName, text) {
        try {
            const commentRef = this.database.ref(`comments/${mangaId}/${chapterId}`).push();
            const commentId = commentRef.key;
            
            const commentData = {
                userId: userId,
                displayName: displayName,
                text: Utils.sanitizeInput(text),
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                likes: 0,
                replies: {}
            };
            
            await commentRef.set(commentData);
            
            return { success: true, commentId: commentId, commentData: commentData };
        } catch (error) {
            console.error(`Error adding comment for ${mangaId}/${chapterId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // إضافة رد على تعليق
    async addReply(mangaId, chapterId, commentId, userId, displayName, text) {
        try {
            const replyRef = this.database.ref(`comments/${mangaId}/${chapterId}/${commentId}/replies`).push();
            const replyId = replyRef.key;
            
            const replyData = {
                userId: userId,
                displayName: displayName,
                text: Utils.sanitizeInput(text),
                timestamp: firebase.database.ServerValue.TIMESTAMP,
            };
            
            await replyRef.set(replyData);
            
            return { success: true, replyId: replyId, replyData: replyData };
        } catch (error) {
            console.error(`Error adding reply for ${mangaId}/${chapterId}/${commentId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // إضافة/إزالة إعجاب لتعليق
    async toggleCommentLike(mangaId, chapterId, commentId, userId) {
        try {
            const likesRef = this.database.ref(`comment_likes/${mangaId}/${chapterId}/${commentId}/${userId}`);
            const commentRef = this.database.ref(`comments/${mangaId}/${chapterId}/${commentId}/likes`);
            
            const snapshot = await likesRef.once('value');
            const isLiked = snapshot.val();
            
            if (isLiked) {
                // إزالة الإعجاب
                await likesRef.remove();
                await commentRef.transaction((currentLikes) => (currentLikes || 1) - 1);
                return { success: true, liked: false };
            } else {
                // إضافة الإعجاب
                await likesRef.set(true);
                await commentRef.transaction((currentLikes) => (currentLikes || 0) + 1);
                return { success: true, liked: true };
            }
        } catch (error) {
            console.error(`Error toggling like for comment ${commentId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // التحقق مما إذا كان المستخدم قد أعجب بتعليق معين
    async isCommentLiked(mangaId, chapterId, commentId, userId) {
        try {
            const snapshot = await this.database.ref(`comment_likes/${mangaId}/${chapterId}/${commentId}/${userId}`).once('value');
            return snapshot.val() !== null;
        } catch (error) {
            console.error(`Error checking like status for comment ${commentId}:`, error);
            return false;
        }
    }
    
    // جلب تقييمات المانجا
    async getMangaRatings(mangaId) {
        try {
            const snapshot = await this.database.ref(`ratings/${mangaId}`).once('value');
            const ratingsData = snapshot.val();
            
            let totalRating = 0;
            let count = 0;
            
            if (ratingsData) {
                Object.keys(ratingsData).forEach(userId => {
                    totalRating += ratingsData[userId].rating;
                    count++;
                });
            }
            
            const averageRating = count > 0 ? (totalRating / count) : 0;
            
            return { success: true, average: averageRating.toFixed(1), count: count };
        } catch (error) {
            console.error(`Error getting ratings for ${mangaId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // إضافة/تحديث تقييم المانجا
    async rateManga(mangaId, userId, rating) {
        try {
            if (rating < 1 || rating > 5) {
                return { success: false, error: "Rating must be between 1 and 5." };
            }
            
            await this.database.ref(`ratings/${mangaId}/${userId}`).set({
                rating: rating,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // تحديث متوسط التقييم في بيانات المانجا نفسها
            const { average } = await this.getMangaRatings(mangaId);
            await this.database.ref(`manga_list/${mangaId}`).update({
                rating: parseFloat(average)
            });
            
            return { success: true, newRating: parseFloat(average) };
        } catch (error) {
            console.error(`Error rating manga ${mangaId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    // جلب تقييم المستخدم للمانجا
    async getUserRating(mangaId, userId) {
        try {
            const snapshot = await this.database.ref(`ratings/${mangaId}/${userId}/rating`).once('value');
            return snapshot.val() || 0;
        } catch (error) {
            console.error(`Error getting user rating for ${mangaId}:`, error);
            return 0;
        }
    }
}

// تصدير نسخة واحدة من مدير قاعدة البيانات
const dbManager = new DatabaseManager();
export default dbManager;
