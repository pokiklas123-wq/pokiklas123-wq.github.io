class CommentsManager {
    constructor() {
        this.currentChapterId = null;
    }

    setupEventListeners() {
        // سيتم إعدادها عند تحميل الصفحة
    }

    async submitComment() {
        const commentText = document.getElementById('commentInput').value.trim();
        const mangaId = mangaManager.getCurrentMangaId();
        const chapterId = this.currentChapterId;
        
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

            // إضافة التعليق إلى قاعدة البيانات
            const commentRef = database.ref(`manga_list/${mangaId}/chapters/${chapterId}/comments`).push();
            await commentRef.set(commentData);
            
            document.getElementById('commentInput').value = '';
            ui.showAuthMessage('تم إرسال التعليق بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            const snapshot = await database.ref(`manga_list/${mangaId}/chapters/${chapterId}/comments`).once('value');
            const commentsData = snapshot.val();
            this.loadComments(mangaId, chapterId, commentsData);
            
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

        // تحويل التعليقات إلى مصفوفة وترتيبها
        const commentsArray = Object.keys(commentsData).map(key => {
            return { id: key, ...commentsData[key] };
        });

        commentsArray.sort((a, b) => b.timestamp - a.timestamp);

        commentsArray.forEach(comment => {
            const commentElement = this.createCommentElement(comment.id, comment);
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
                    <i class="fas fa-heart"></i> <span class="like-count">${comment.likes || 0}</span>
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
            const likeCount = document.querySelector(`[data-comment-id="${commentId}"] .like-count`);
            if (likeCount) {
                likeCount.textContent = newLikes;
            }
            
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