class CommentsManager {
    constructor() {
        this.currentChapterId = null;
        this.currentMangaId = null;
        this.comments = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        // استخدام event delegation لمنع التكرار
        document.addEventListener('click', (e) => {
            if (e.target.id === 'submitComment' || e.target.closest('#submitComment')) {
                this.submitComment();
            }
            
            if (e.target.classList.contains('like-btn') || e.target.closest('.like-btn')) {
                const commentId = e.target.closest('.like-btn').dataset.commentId;
                if (commentId) this.likeComment(commentId);
            }
            
            if (e.target.classList.contains('edit-comment') || e.target.closest('.edit-comment')) {
                const commentId = e.target.closest('.edit-comment').dataset.commentId;
                if (commentId) this.editComment(commentId);
            }
            
            if (e.target.classList.contains('delete-comment') || e.target.closest('.delete-comment')) {
                const commentId = e.target.closest('.delete-comment').dataset.commentId;
                if (commentId) this.deleteComment(commentId);
            }
            
            if (e.target.classList.contains('reply-comment') || e.target.closest('.reply-comment')) {
                const commentId = e.target.closest('.reply-comment').dataset.commentId;
                if (commentId) this.showReplyForm(commentId);
            }
            
            if (e.target.classList.contains('submit-reply') || e.target.closest('.submit-reply')) {
                const commentId = e.target.closest('.submit-reply').dataset.commentId;
                if (commentId) this.submitReply(commentId);
            }
            
            if (e.target.classList.contains('cancel-reply') || e.target.closest('.cancel-reply')) {
                this.hideAllReplyForms();
            }
            
            if (e.target.classList.contains('toggle-replies') || e.target.closest('.toggle-replies')) {
                const commentId = e.target.closest('.toggle-replies').dataset.commentId;
                if (commentId) this.toggleReplies(commentId);
            }
        });
    }

    async submitComment() {
        const commentInput = document.getElementById('commentInput');
        const commentText = commentInput.value.trim();
        
        if (!commentText) {
            ui.showAuthMessage('يرجى كتابة تعليق قبل الإرسال', 'error');
            return;
        }
        
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول لإضافة تعليق', 'error');
            ui.toggleAuthModal(true);
            return;
        }

        // منع الإرسال المزدوج
        const submitBtn = document.getElementById('submitComment');
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإرسال...';

        try {
            const commentData = {
                user: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email.split('@')[0],
                text: commentText,
                likes: 0,
                likedBy: {},
                timestamp: Date.now(),
                userId: authManager.getCurrentUser().uid,
                replies: {}
            };

            const commentRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments`).push();
            await commentRef.set(commentData);
            
            commentInput.value = '';
            ui.showAuthMessage('تم إرسال التعليق بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            
        } catch (error) {
            ui.showAuthMessage('حدث خطأ في إرسال التعليق: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'إرسال التعليق';
        }
    }

    async loadComments(mangaId, chapterId) {
        this.currentMangaId = mangaId;
        this.currentChapterId = chapterId;

        try {
            const snapshot = await database.ref(`manga_list/${mangaId}/chapters/${chapterId}/comments`).once('value');
            const commentsData = snapshot.val();

            this.comments = commentsData || {};
            this.displayComments();
            
        } catch (error) {
            console.error('Error loading comments:', error);
            this.comments = {};
            this.displayComments();
        }
    }

    displayComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        
        commentsList.innerHTML = '';

        if (!this.comments || Object.keys(this.comments).length === 0) {
            commentsList.innerHTML = '<p class="no-comments">لا توجد تعليقات بعد. كن أول من يعلق!</p>';
            return;
        }

        // تحويل التعليقات إلى مصفوفة وترتيبها
        const commentsArray = Object.keys(this.comments).map(key => {
            return { id: key, ...this.comments[key] };
        });

        commentsArray.sort((a, b) => b.timestamp - a.timestamp);

        commentsArray.forEach(comment => {
            const commentElement = this.createCommentElement(comment.id, comment);
            commentsList.appendChild(commentElement);
        });
    }

    createCommentElement(commentId, comment) {
        const hasReplies = comment.replies && Object.keys(comment.replies).length > 0;
        const element = document.createElement('div');
        element.className = 'comment';
        element.innerHTML = `
            <div class="comment-header">
                <span class="comment-user">${comment.user}</span>
                <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
            <div class="comment-actions">
                <button class="comment-action like-btn ${this.hasUserLiked(comment) ? 'liked' : ''}" 
                        data-comment-id="${commentId}">
                    <i class="fas fa-heart"></i> 
                    <span class="like-count">${comment.likes || 0}</span>
                </button>
                <button class="comment-action reply-comment" data-comment-id="${commentId}">
                    <i class="fas fa-reply"></i> رد
                </button>
                ${hasReplies ? `
                    <button class="comment-action toggle-replies" data-comment-id="${commentId}">
                        <i class="fas fa-comments"></i> الردود
                    </button>
                ` : ''}
                ${this.canEditComment(comment) ? `
                    <button class="comment-action edit-comment" data-comment-id="${commentId}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="comment-action delete-comment" data-comment-id="${commentId}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                ` : ''}
            </div>
            ${hasReplies ? `
                <div class="comment-replies" id="replies-${commentId}" style="display: none;">
                    ${this.renderReplies(comment.replies)}
                </div>
            ` : ''}
            <div class="reply-form" id="reply-form-${commentId}" style="display: none;">
                <textarea class="reply-input" placeholder="اكتب ردك..."></textarea>
                <div class="reply-buttons">
                    <button class="btn submit-reply" data-comment-id="${commentId}">إرسال الرد</button>
                    <button class="btn cancel-reply">إلغاء</button>
                </div>
            </div>
        `;

        return element;
    }

    renderReplies(replies) {
        if (!replies || Object.keys(replies).length === 0) return '';
        
        const repliesArray = Object.keys(replies).map(key => ({ id: key, ...replies[key] }));
        repliesArray.sort((a, b) => a.timestamp - b.timestamp);
        
        return repliesArray.map(reply => `
            <div class="reply">
                <div class="reply-header">
                    <span class="reply-user">${reply.user}</span>
                    <span class="reply-time">${this.formatTime(reply.timestamp)}</span>
                </div>
                <div class="reply-text">${reply.text}</div>
            </div>
        `).join('');
    }

    hasUserLiked(comment) {
        if (!authManager.getCurrentUser() || !comment.likedBy) return false;
        return comment.likedBy[authManager.getCurrentUser().uid];
    }

    canEditComment(comment) {
        return authManager.getCurrentUser() && comment.userId === authManager.getCurrentUser().uid;
    }

    async likeComment(commentId) {
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول للإعجاب بالتعليق', 'error');
            return;
        }

        const commentRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`);
        
        try {
            const snapshot = await commentRef.once('value');
            const comment = snapshot.val();
            const userId = authManager.getCurrentUser().uid;
            const likedBy = comment.likedBy || {};
            let newLikes = comment.likes || 0;

            if (likedBy[userId]) {
                // إزالة الإعجاب
                newLikes--;
                delete likedBy[userId];
            } else {
                // إضافة الإعجاب
                newLikes++;
                likedBy[userId] = true;
                
                // إرسال إشعار للمستخدم
                this.sendLikeNotification(comment.userId, commentId);
            }

            await commentRef.update({ 
                likes: newLikes,
                likedBy: likedBy
            });
            
            // تحديث الواجهة
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    }

    async editComment(commentId) {
        const comment = this.comments[commentId];
        const newText = prompt('عدل تعليقك:', comment.text);
        
        if (newText && newText !== comment.text) {
            try {
                await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`).update({
                    text: newText,
                    edited: true,
                    editTimestamp: Date.now()
                });
                
                await this.loadComments(this.currentMangaId, this.currentChapterId);
                ui.showAuthMessage('تم تعديل التعليق بنجاح', 'success');
            } catch (error) {
                ui.showAuthMessage('خطأ في تعديل التعليق', 'error');
            }
        }
    }

    async deleteComment(commentId) {
        if (confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
            try {
                await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`).remove();
                await this.loadComments(this.currentMangaId, this.currentChapterId);
                ui.showAuthMessage('تم حذف التعليق بنجاح', 'success');
            } catch (error) {
                ui.showAuthMessage('خطأ في حذف التعليق', 'error');
            }
        }
    }

    showReplyForm(commentId) {
        // إخفاء جميع نماذج الردود الأخرى
        this.hideAllReplyForms();
        
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.style.display = 'block';
        }
    }

    hideAllReplyForms() {
        document.querySelectorAll('.reply-form').forEach(form => {
            form.style.display = 'none';
        });
    }
    
    toggleReplies(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        if (repliesContainer) {
            repliesContainer.style.display = repliesContainer.style.display === 'none' ? 'block' : 'none';
        }
    }

    async submitReply(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        const replyInput = replyForm.querySelector('.reply-input');
        const replyText = replyInput.value.trim();
        
        if (!replyText) {
            ui.showAuthMessage('يرجى كتابة رد قبل الإرسال', 'error');
            return;
        }
        
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول لإضافة رد', 'error');
            ui.toggleAuthModal(true);
            return;
        }

        try {
            const replyData = {
                user: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email.split('@')[0],
                text: replyText,
                timestamp: Date.now(),
                userId: authManager.getCurrentUser().uid
            };

            const replyRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}/replies`).push();
            await replyRef.set(replyData);
            
            replyInput.value = '';
            this.hideAllReplyForms();
            ui.showAuthMessage('تم إرسال الرد بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            
        } catch (error) {
            ui.showAuthMessage('حدث خطأ في إرسال الرد: ' + error.message, 'error');
        }
    }

    async sendLikeNotification(targetUserId, commentId) {
        if (targetUserId === authManager.getCurrentUser().uid) return;
        
        try {
            const notificationRef = database.ref(`notifications/${targetUserId}`).push();
            await notificationRef.set({
                type: 'like',
                fromUser: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email,
                fromUserId: authManager.getCurrentUser().uid,
                commentId: commentId,
                mangaId: this.currentMangaId,
                chapterId: this.currentChapterId,
                timestamp: Date.now(),
                read: false
            });
        } catch (error) {
            console.error('Error sending notification:', error);
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