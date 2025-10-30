class CommentsManager {
    constructor() {
        this.currentChapterId = null;
    }

    setupEventListeners() {
        document.getElementById('submitComment').addEventListener('click', () => {
            this.submitComment();
        });
    }

    async submitComment() {
        const commentText = document.getElementById('commentInput').value.trim();
        const mangaId = mangaManager.getCurrentMangaId();
        
        if (!commentText) {
            ui.showAuthMessage('يرجى كتابة تعليق قبل الإرسال', 'error');
            return;
        }
        
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول لإضافة تعليق', 'error');
            ui.toggleAuthModal(true);
            return;
        }

        try {
            const commentData = {
                user: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email.split('@')[0],
                text: commentText,
                likes: 0,
                timestamp: Date.now(),
                userId: authManager.getCurrentUser().uid
            };

            const commentRef = database.ref(`manga_list/${mangaId}/chapters/${this.currentChapterId}/comments`).push();
            await commentRef.set(commentData);
            
            document.getElementById('commentInput').value = '';
            ui.showAuthMessage('تم إرسال التعليق بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            this.loadComments(mangaId, this.currentChapterId);
            
        } catch (error) {
            ui.showAuthMessage('حدث خطأ في إرسال التعليق: ' + error.message, 'error');
        }
    }

    loadComments(mangaId, chapterId, commentsData) {
        this.currentChapterId = chapterId;
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';

        if (!commentsData || Object.keys(commentsData).length === 0) {
            commentsList.innerHTML = '<p class="no-comments">لا توجد تعليقات بعد. كن أول من يعلق!</p>';
            return;
        }

        Object.keys(commentsData).forEach(commentId => {
            const comment = commentsData[commentId];
            const commentElement = this.createCommentElement(commentId, comment);
            commentsList.appendChild(commentElement);
        });
    }

    createCommentElement(commentId, comment) {
        const element = document.createElement('div');
        element.className = 'comment';
        element.innerHTML = `
            <div class="comment-header">
                <span class="comment-user">${comment.user}</span>
                <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-actions">
                <button class="comment-action like-btn" data-comment-id="${commentId}">
                    <i class="fas fa-heart"></i> ${comment.likes || 0}
                </button>
                <button class="comment-action reply-btn">
                    <i class="fas fa-reply"></i> رد
                </button>
            </div>
        `;

        // إضافة حدث الإعجاب
        const likeBtn = element.querySelector('.like-btn');
        likeBtn.addEventListener('click', () => {
            this.likeComment(commentId);
        });

        return element;
    }

    async likeComment(commentId) {
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول للإعجاب بالتعليق', 'error');
            return;
        }

        const mangaId = mangaManager.getCurrentMangaId();
        const commentRef = database.ref(`manga_list/${mangaId}/chapters/${this.currentChapterId}/comments/${commentId}`);
        
        try {
            const snapshot = await commentRef.once('value');
            const comment = snapshot.val();
            const newLikes = (comment.likes || 0) + 1;
            
            await commentRef.update({ likes: newLikes });
            
            // تحديث الواجهة
            this.loadComments(mangaId, this.currentChapterId);
            
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return 'منذ وقت';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }
}

const commentsManager = new CommentsManager();