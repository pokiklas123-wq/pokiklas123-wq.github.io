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
    
    // حذف تعليق
	    async deleteComment(mangaId, chapterId, commentId) {
	        try {
	            await this.database.ref(`comments/${mangaId}/${chapterId}/${commentId}`).remove();
	            // يمكن إضافة منطق لحذف الإعجابات المرتبطة بالتعليق لاحقاً
	            return { success: true };
	        } catch (error) {
	            console.error(`Error deleting comment ${commentId}:`, error);
	            return { success: false, error: error.message };
	        }
	    }
	    
	    // حذف رد
	    async deleteReply(mangaId, chapterId, commentId, replyId) {
	        try {
	            await this.database.ref(`comments/${mangaId}/${chapterId}/${commentId}/replies/${replyId}`).remove();
	            return { success: true };
	        } catch (error) {
	            console.error(`Error deleting reply ${replyId}:`, error);
	            return { success: false, error: error.message };
	        }
	    }
	    
	    // إضافة/تحديث تقييم المانجا