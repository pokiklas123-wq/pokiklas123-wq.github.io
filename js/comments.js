// [file name]: comments.js
class CommentsManager {
    constructor() {
        this.currentChapterId = null;
        this.currentMangaId = null;
        this.comments = {};
        this.isSubmitting = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // إرسال تعليق جديد
            if ((e.target.id === 'submitComment' || e.target.closest('#submitComment')) && !this.isSubmitting) {
                this.submitComment();
            }
            
            // الإعجاب بالتعليق
            if (e.target.classList.contains('like-btn') || e.target.closest('.like-btn')) {
                const commentId = e.target.closest('.like-btn').dataset.commentId;
                if (commentId) this.likeComment(commentId);
            }
            
            // تعديل التعليق
            if (e.target.classList.contains('edit-comment') || e.target.closest('.edit-comment')) {
                const commentId = e.target.closest('.edit-comment').dataset.commentId;
                if (commentId) this.editComment(commentId);
            }
            
            // حذف التعليق
            if (e.target.classList.contains('delete-comment') || e.target.closest('.delete-comment')) {
                const commentId = e.target.closest('.delete-comment').dataset.commentId;
                if (commentId) this.deleteComment(commentId);
            }
            
            // الرد على التعليق
            if (e.target.classList.contains('reply-comment') || e.target.closest('.reply-comment')) {
                const commentId = e.target.closest('.reply-comment').dataset.commentId;
                if (commentId) this.showReplyForm(commentId);
            }
            
            // إرسال الرد
            if (e.target.classList.contains('submit-reply') || e.target.closest('.submit-reply')) {
                const commentId = e.target.closest('.submit-reply').dataset.commentId;
                if (commentId && !this.isSubmitting) this.submitReply(commentId);
            }
            
            // إلغاء الرد
            if (e.target.classList.contains('cancel-reply') || e.target.closest('.cancel-reply')) {
                this.hideAllReplyForms();
            }
            
            // عرض/إخفاء الردود
            if (e.target.classList.contains('toggle-replies') || e.target.closest('.toggle-replies')) {
                const commentId = e.target.closest('.toggle-replies').dataset.commentId;
                if (commentId) this.toggleReplies(commentId);
            }

            // حفظ التعديل
            if (e.target.classList.contains('save-edit-btn') || e.target.closest('.save-edit-btn')) {
                const commentId = e.target.closest('.save-edit-btn').dataset.commentId;
                if (commentId) this.saveEdit(commentId);
            }

            // إلغاء التعديل
            if (e.target.classList.contains('cancel-edit-btn') || e.target.closest('.cancel-edit-btn')) {
                const commentId = e.target.closest('.cancel-edit-btn').dataset.commentId;
                if (commentId) this.cancelEdit(commentId);
            }
        });

        // إرسال التعليق بالضغط على Enter مع Ctrl
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                const commentInput = document.getElementById('commentInput');
                if (commentInput && document.activeElement === commentInput) {
                    this.submitComment();
                }
            }
        });
    }

    async submitComment() {
        if (this.isSubmitting) return;
        
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

        this.isSubmitting = true;
        const submitBtn = document.getElementById('submitComment');
        const originalText = submitBtn.textContent;
        
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
                replies: {},
                userAvatar: this.generateUserAvatar(authManager.getCurrentUser().displayName || authManager.getCurrentUser().email)
            };

            const commentRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments`).push();
            await commentRef.set(commentData);
            
            commentInput.value = '';
            ui.showAuthMessage('تم إرسال التعليق بنجاح', 'success');
            
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            
        } catch (error) {
            console.error('Error submitting comment:', error);
            ui.showAuthMessage('حدث خطأ في إرسال التعليق: ' + error.message, 'error');
        } finally {
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    generateUserAvatar(name) {
        // إنشاء صورة رمزية بسيطة بناء على اسم المستخدم
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const color = colors[name.length % colors.length];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.replace('#', '')}&color=fff&size=64`;
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
            commentsList.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comments"></i>
                    <p>لا توجد تعليقات بعد.</p>
                    <p class="no-comments-subtitle">كن أول من يعلق!</p>
                </div>
            `;
            return;
        }

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
        const isEdited = comment.edited;
        const element = document.createElement('div');
        element.className = 'comment';
        element.id = `comment-${commentId}`;
        
        element.innerHTML = `
            <div class="comment-header">
                <div class="user-info">
                    <img src="${comment.userAvatar || this.generateUserAvatar(comment.user)}" 
                         alt="${comment.user}" 
                         class="user-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=U&background=666&color=fff&size=64'">
                    <div class="user-details">
                        <span class="comment-user">${comment.user}</span>
                        <span class="comment-time">${this.formatTime(comment.timestamp)} ${isEdited ? '(معدل)' : ''}</span>
                    </div>
                </div>
                ${this.canEditComment(comment) ? `
                <div class="comment-actions-menu">
                    <button class="comment-menu-btn">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="comment-menu">
                        <button class="menu-item edit-comment" data-comment-id="${commentId}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="menu-item delete-comment" data-comment-id="${commentId}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="comment-text">${this.escapeHtml(comment.text)}</div>
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
                        <i class="fas fa-comments"></i> 
                        <span class="replies-count">${Object.keys(comment.replies).length}</span> ردود
                    </button>
                ` : ''}
            </div>
            ${hasReplies ? `
                <div class="comment-replies" id="replies-${commentId}">
                    ${this.renderReplies(comment.replies)}
                </div>
            ` : ''}
            <div class="reply-form" id="reply-form-${commentId}">
                <textarea class="reply-input" placeholder="اكتب ردك..." maxlength="500"></textarea>
                <div class="reply-footer">
                    <span class="char-count">0/500</span>
                    <div class="reply-buttons">
                        <button class="btn btn-secondary cancel-reply">إلغاء</button>
                        <button class="btn submit-reply" data-comment-id="${commentId}">إرسال الرد</button>
                    </div>
                </div>
            </div>
        `;

        // إضافة مستمعين للأحداث
        this.setupCommentEventListeners(element, commentId);

        return element;
    }

    setupCommentEventListeners(element, commentId) {
        // قائمة الإجراءات
        const menuBtn = element.querySelector('.comment-menu-btn');
        const menu = element.querySelector('.comment-menu');
        
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('show');
            });

            // إغلاق القائمة عند النقر خارجها
            document.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        }

        // عداد الأحرف للردود
        const replyInput = element.querySelector('.reply-input');
        const charCount = element.querySelector('.char-count');
        
        if (replyInput && charCount) {
            replyInput.addEventListener('input', (e) => {
                charCount.textContent = `${e.target.value.length}/500`;
            });
        }
    }

    renderReplies(replies) {
        if (!replies || Object.keys(replies).length === 0) return '';
        
        const repliesArray = Object.keys(replies).map(key => ({ id: key, ...replies[key] }));
        repliesArray.sort((a, b) => a.timestamp - b.timestamp);
        
        return repliesArray.map(reply => `
            <div class="reply" id="reply-${reply.id}">
                <div class="reply-header">
                    <div class="user-info">
                        <img src="${reply.userAvatar || this.generateUserAvatar(reply.user)}" 
                             alt="${reply.user}" 
                             class="user-avatar small"
                             onerror="this.src='https://ui-avatars.com/api/?name=U&background=666&color=fff&size=64'">
                        <div class="user-details">
                            <span class="reply-user">${reply.user}</span>
                            <span class="reply-time">${this.formatTime(reply.timestamp)}</span>
                        </div>
                    </div>
                </div>
                <div class="reply-text">${this.escapeHtml(reply.text)}</div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hasUserLiked(comment) {
        if (!authManager.getCurrentUser() || !comment.likedBy) return false;
        return comment.likedBy[authManager.getCurrentUser().uid];
    }

    canEditComment(comment) {
        return authManager.getCurrentUser() && comment.userId === authManager.getCurrentUser().uid;
    }

    async likeComment(commentId) {
        if (!authManager.requireAuth('الإعجاب بالتعليق')) {
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
                newLikes--;
                delete likedBy[userId];
            } else {
                newLikes++;
                likedBy[userId] = true;
                
                // إرسال إشعار للمستخدم صاحب التعليق
                if (comment.userId && comment.userId !== authManager.getCurrentUser().uid) {
                    await this.sendLikeNotification(comment.userId, commentId);
                }
            }

            await commentRef.update({ 
                likes: newLikes,
                likedBy: likedBy
            });
            
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            
        } catch (error) {
            console.error('Error liking comment:', error);
            ui.showAuthMessage('حدث خطأ في الإعجاب بالتعليق', 'error');
        }
    }

    editComment(commentId) {
        const commentElement = document.getElementById(`comment-${commentId}`);
        const commentTextElement = commentElement.querySelector('.comment-text');
        const originalText = commentTextElement.textContent;
        
        commentTextElement.innerHTML = `
            <textarea class="edit-comment-input" maxlength="1000">${originalText}</textarea>
            <div class="edit-controls">
                <span class="edit-char-count">${originalText.length}/1000</span>
                <div class="edit-buttons">
                    <button class="btn btn-secondary cancel-edit-btn" data-comment-id="${commentId}">إلغاء</button>
                    <button class="btn save-edit-btn" data-comment-id="${commentId}">حفظ</button>
                </div>
            </div>
        `;

        const textarea = commentTextElement.querySelector('.edit-comment-input');
        const charCount = commentTextElement.querySelector('.edit-char-count');
        
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        
        textarea.addEventListener('input', (e) => {
            charCount.textContent = `${e.target.value.length}/1000`;
        });
    }

    async saveEdit(commentId) {
        const commentElement = document.getElementById(`comment-${commentId}`);
        const textarea = commentElement.querySelector('.edit-comment-input');
        const newText = textarea.value.trim();
        
        if (!newText) {
            ui.showAuthMessage('لا يمكن ترك التعليق فارغاً', 'error');
            return;
        }

        try {
            await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`).update({
                text: newText,
                edited: true,
                editTimestamp: Date.now()
            });
            
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            ui.showAuthMessage('تم تعديل التعليق بنجاح', 'success');
            
        } catch (error) {
            console.error('Error editing comment:', error);
            ui.showAuthMessage('حدث خطأ في تعديل التعليق', 'error');
        }
    }

    cancelEdit(commentId) {
        this.loadComments(this.currentMangaId, this.currentChapterId);
    }

    async deleteComment(commentId) {
        if (!authManager.requireAuth('حذف التعليق')) {
            return;
        }

        ui.showConfirmation(
            'هل أنت متأكد من حذف هذا التعليق؟',
            async () => {
                try {
                    await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`).remove();
                    await this.loadComments(this.currentMangaId, this.currentChapterId);
                    ui.showAuthMessage('تم حذف التعليق بنجاح', 'success');
                } catch (error) {
                    console.error('Error deleting comment:', error);
                    ui.showAuthMessage('حدث خطأ في حذف التعليق', 'error');
                }
            }
        );
    }

    showReplyForm(commentId) {
        this.hideAllReplyForms();
        
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.style.display = 'block';
            const textarea = replyForm.querySelector('.reply-input');
            textarea.focus();
        }
    }

    hideAllReplyForms() {
        document.querySelectorAll('.reply-form').forEach(form => {
            form.style.display = 'none';
            const textarea = form.querySelector('.reply-input');
            if (textarea) textarea.value = '';
            const charCount = form.querySelector('.char-count');
            if (charCount) charCount.textContent = '0/500';
        });
    }
    
    toggleReplies(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        if (repliesContainer) {
            repliesContainer.style.display = repliesContainer.style.display === 'none' ? 'block' : 'none';
            
            const toggleBtn = document.querySelector(`.toggle-replies[data-comment-id="${commentId}"]`);
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (repliesContainer.style.display === 'none') {
                    icon.className = 'fas fa-chevron-down';
                } else {
                    icon.className = 'fas fa-chevron-up';
                }
            }
        }
    }

    async submitReply(commentId) {
        if (this.isSubmitting) return;
        
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        const replyInput = replyForm.querySelector('.reply-input');
        const replyText = replyInput.value.trim();
        
        if (!replyText) {
            ui.showAuthMessage('يرجى كتابة رد قبل الإرسال', 'error');
            return;
        }
        
        if (!authManager.requireAuth('إضافة رد')) {
            return;
        }

        this.isSubmitting = true;
        const submitBtn = replyForm.querySelector('.submit-reply');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإرسال...';

        try {
            const replyData = {
                user: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email.split('@')[0],
                text: replyText,
                timestamp: Date.now(),
                userId: authManager.getCurrentUser().uid,
                userAvatar: this.generateUserAvatar(authManager.getCurrentUser().displayName || authManager.getCurrentUser().email)
            };

            const replyRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}/replies`).push();
            await replyRef.set(replyData);
            
            // إرسال إشعار للمستخدم صاحب التعليق الأصلي
            const originalComment = this.comments[commentId];
            if (originalComment && originalComment.userId && originalComment.userId !== authManager.getCurrentUser().uid) {
                await this.sendReplyNotification(originalComment.userId, commentId, replyText);
            }
            
            this.hideAllReplyForms();
            ui.showAuthMessage('تم إرسال الرد بنجاح', 'success');
            
            await this.loadComments(this.currentMangaId, this.currentChapterId);
            
        } catch (error) {
            console.error('Error submitting reply:', error);
            ui.showAuthMessage('حدث خطأ في إرسال الرد: ' + error.message, 'error');
        } finally {
            this.isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async sendLikeNotification(targetUserId, commentId) {
        if (!targetUserId || targetUserId === authManager.getCurrentUser().uid) return;
        
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
            console.error('Error sending like notification:', error);
        }
    }

    async sendReplyNotification(targetUserId, commentId, replyText) {
        if (!targetUserId || targetUserId === authManager.getCurrentUser().uid) return;
        
        try {
            const notificationRef = database.ref(`notifications/${targetUserId}`).push();
            await notificationRef.set({
                type: 'reply',
                fromUser: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email,
                fromUserId: authManager.getCurrentUser().uid,
                commentId: commentId,
                mangaId: this.currentMangaId,
                chapterId: this.currentChapterId,
                replyText: replyText.substring(0, 100),
                timestamp: Date.now(),
                read: false
            });
        } catch (error) {
            console.error('Error sending reply notification:', error);
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
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
        
        return date.toLocaleDateString('ar-SA');
    }

    // دالة للبحث في التعليقات
    searchComments(searchTerm) {
        const commentElements = document.querySelectorAll('.comment');
        let foundCount = 0;
        
        commentElements.forEach(comment => {
            const commentText = comment.querySelector('.comment-text').textContent.toLowerCase();
            const userName = comment.querySelector('.comment-user').textContent.toLowerCase();
            
            if (commentText.includes(searchTerm.toLowerCase()) || userName.includes(searchTerm.toLowerCase())) {
                comment.style.display = 'block';
                comment.style.backgroundColor = 'rgba(255, 255, 0, 0.1)';
                foundCount++;
            } else {
                comment.style.display = 'none';
            }
        });
        
        return foundCount;
    }

    // دالة للحصول على إحصائيات التعليقات
    getCommentStats() {
        const totalComments = Object.keys(this.comments).length;
        let totalReplies = 0;
        let totalLikes = 0;
        
        Object.values(this.comments).forEach(comment => {
            totalLikes += comment.likes || 0;
            if (comment.replies) {
                totalReplies += Object.keys(comment.replies).length;
            }
        });
        
        return {
            totalComments,
            totalReplies,
            totalLikes
        };
    }
}

const commentsManager = new CommentsManager();