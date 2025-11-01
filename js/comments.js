class CommentsManager {
    constructor() {
        this.currentChapterId = null;
        this.currentMangaId = null;
        this.comments = {};
        this.isSubmitting = false; // منع الإرسال المزدوج
        this.setupEventListeners();
    }

    setupEventListeners() {
        // إعداد حدث الإرسال مرة واحدة فقط
        document.addEventListener('click', (e) => {
            if ((e.target.id === 'submitComment' || e.target.closest('#submitComment')) && !this.isSubmitting) {
                this.submitComment();
            }
            
            if (e.target.classList.contains('like-btn') || e.target.closest('.like-btn')) {
                const commentId = e.target.closest('.like-btn').dataset.commentId;
                if (commentId) this.likeComment(commentId);
            }
            
            // تعديل التعليق الأصلي
            if (e.target.classList.contains('edit-comment') || e.target.closest('.edit-comment')) {
                const commentId = e.target.closest('.edit-comment').dataset.commentId;
                if (commentId) this.editComment(commentId);
            }
            
            // حذف التعليق الأصلي
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
            
            // إظهار/إخفاء الردود
            if (e.target.classList.contains('toggle-replies') || e.target.closest('.toggle-replies')) {
                const commentId = e.target.closest('.toggle-replies').dataset.commentId;
                if (commentId) this.toggleReplies(commentId);
            }

            // تعديل الرد (جديد)
            if (e.target.classList.contains('edit-reply') || e.target.closest('.edit-reply')) {
                const { commentId, replyId } = e.target.closest('.edit-reply').dataset;
                if (commentId && replyId) this.editReply(commentId, replyId);
            }
            
            // حذف الرد (جديد)
            if (e.target.classList.contains('delete-reply') || e.target.closest('.delete-reply')) {
                const { commentId, replyId } = e.target.closest('.delete-reply').dataset;
                if (commentId && replyId) this.deleteReply(commentId, replyId);
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
            const user = authManager.getCurrentUser();
            const commentData = {
                user: user.displayName || user.email.split('@')[0],
                text: commentText,
                likes: 0,
                likedBy: {},
                timestamp: Date.now(),
                userId: user.uid,
                replies: {}
            };

            const commentRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments`).push();
            await commentRef.set(commentData);
            
            commentInput.value = '';
            ui.showAuthMessage('تم إرسال التعليق بنجاح', 'success');
            
            // لا حاجة لإعادة تحميل كل التعليقات بعد الإرسال، سنقوم بتحديث الواجهة بشكل أبسط
            // ولكن لإبقاء الكود متوافقاً مع المنطق الحالي، سنبقيها مؤقتاً
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

    async loadComments(mangaId, chapterId) {
        this.currentMangaId = mangaId;
        this.currentChapterId = chapterId;

        // إزالة المستمعين القدامى قبل إضافة مستمع جديد لمنع التكرار
        if (this.commentsRef) {
            this.commentsRef.off('value');
        }

        this.commentsRef = database.ref(`manga_list/${mangaId}/chapters/${chapterId}/comments`);

        // استخدام on('value') بدلاً من once('value') لتحديث التعليقات تلقائياً
        this.commentsRef.on('value', (snapshot) => {
            const commentsData = snapshot.val();
            this.comments = commentsData || {};
            this.displayComments();
        }, (error) => {
            console.error('Error loading comments:', error);
            this.comments = {};
            this.displayComments();
        });
    }

    displayComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        
        commentsList.innerHTML = '';

        if (!this.comments || Object.keys(this.comments).length === 0) {
            commentsList.innerHTML = '<p class="no-comments">لا توجد تعليقات بعد. كن أول من يعلق!</p>';
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
	        const element = document.createElement('div');
	        element.className = 'comment';
	        element.setAttribute('data-comment-id', commentId); // إضافة معرف التعليق
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
                        <i class="fas fa-comments"></i> الردود (${Object.keys(comment.replies).length})
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
                    ${this.renderReplies(commentId, comment.replies)}
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

    renderReplies(commentId, replies) {
        if (!replies || Object.keys(replies).length === 0) return '';
        
        const repliesArray = Object.keys(replies).map(key => ({ id: key, ...replies[key] }));
        repliesArray.sort((a, b) => a.timestamp - b.timestamp);
        
        return repliesArray.map(reply => {
            const canEdit = authManager.getCurrentUser() && reply.userId === authManager.getCurrentUser().uid;
            return `
                <div class="reply" data-reply-id="${reply.id}">
                    <div class="reply-header">
                        <span class="reply-user">${reply.user}</span>
                        <span class="reply-time">${this.formatTime(reply.timestamp)}</span>
                    </div>
                    <div class="reply-text">${reply.text}</div>
                    ${canEdit ? `
                        <div class="reply-actions">
                            <button class="reply-action edit-reply" data-comment-id="${commentId}" data-reply-id="${reply.id}">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button class="reply-action delete-reply" data-comment-id="${commentId}" data-reply-id="${reply.id}">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
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
            let isLiked = likedBy[userId];

            if (isLiked) {
                newLikes--;
                delete likedBy[userId];
            } else {
                newLikes++;
                likedBy[userId] = true;
                
                // إرسال إشعار للمستخدم صاحب التعليق
                if (comment.userId && comment.userId !== userId) {
                    // لا حاجة للانتظار هنا
                    this.sendLikeNotification(comment.userId, commentId);
                }
            }

            await commentRef.update({ 
                likes: newLikes,
                likedBy: likedBy
            });
            
            // التحديث سيتم تلقائياً بفضل on('value') في loadComments
            
        } catch (error) {
            console.error('Error liking comment:', error);
        }
    }

    async editComment(commentId) {
        const comment = this.comments[commentId];
        if (!comment || !this.canEditComment(comment)) {
            ui.showAuthMessage('لا يمكنك تعديل هذا التعليق', 'error');
            return;
        }

        const newText = prompt('عدل تعليقك:', comment.text);
        
        if (newText && newText.trim() !== comment.text) {
            try {
                await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`).update({
                    text: newText.trim(),
                    edited: true,
                    editTimestamp: Date.now()
                });
                
                ui.showAuthMessage('تم تعديل التعليق بنجاح', 'success');
            } catch (error) {
                ui.showAuthMessage('خطأ في تعديل التعليق', 'error');
            }
        }
    }

    async deleteComment(commentId) {
        const comment = this.comments[commentId];
        if (!comment || !this.canEditComment(comment)) {
            ui.showAuthMessage('لا يمكنك حذف هذا التعليق', 'error');
            return;
        }

        if (confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
            try {
                await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`).remove();
                ui.showAuthMessage('تم حذف التعليق بنجاح', 'success');
            } catch (error) {
                ui.showAuthMessage('خطأ في حذف التعليق', 'error');
            }
        }
    }

    // وظيفة جديدة لتعديل الرد
    async editReply(commentId, replyId) {
        const comment = this.comments[commentId];
        const reply = comment?.replies?.[replyId];
        
        if (!reply || !authManager.getCurrentUser() || reply.userId !== authManager.getCurrentUser().uid) {
            ui.showAuthMessage('لا يمكنك تعديل هذا الرد', 'error');
            return;
        }

        const newText = prompt('عدل ردك:', reply.text);
        
        if (newText && newText.trim() !== reply.text) {
            try {
                await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}/replies/${replyId}`).update({
                    text: newText.trim(),
                    edited: true,
                    editTimestamp: Date.now()
                });
                
                ui.showAuthMessage('تم تعديل الرد بنجاح', 'success');
            } catch (error) {
                ui.showAuthMessage('خطأ في تعديل الرد', 'error');
            }
        }
    }

    // وظيفة جديدة لحذف الرد
    async deleteReply(commentId, replyId) {
        const comment = this.comments[commentId];
        const reply = comment?.replies?.[replyId];
        
        if (!reply || !authManager.getCurrentUser() || reply.userId !== authManager.getCurrentUser().uid) {
            ui.showAuthMessage('لا يمكنك حذف هذا الرد', 'error');
            return;
        }

        if (confirm('هل أنت متأكد من حذف هذا الرد؟')) {
            try {
                await database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}/replies/${replyId}`).remove();
                ui.showAuthMessage('تم حذف الرد بنجاح', 'success');
            } catch (error) {
                ui.showAuthMessage('خطأ في حذف الرد', 'error');
            }
        }
    }

    showReplyForm(commentId) {
        if (!authManager.getCurrentUser()) {
            ui.showAuthMessage('يجب تسجيل الدخول للرد على تعليق', 'error');
            ui.toggleAuthModal(true);
            return;
        }

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
        if (this.isSubmitting) return;
        
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        const replyInput = replyForm.querySelector('.reply-input');
        const replyText = replyInput.value.trim();
        
        if (!replyText) {
            ui.showAuthMessage('يرجى كتابة رد قبل الإرسال', 'error');
            return;
        }
        
        if (!authManager.getCurrentUser()) {
            // هذا الشرط يجب أن يكون قد تم التحقق منه في showReplyForm، ولكن للتأكد
            ui.showAuthMessage('يجب تسجيل الدخول لإضافة رد', 'error');
            ui.toggleAuthModal(true);
            return;
        }

        this.isSubmitting = true;
        const submitBtn = replyForm.querySelector('.submit-reply');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري الإرسال...';

        try {
            const user = authManager.getCurrentUser();
            const replyData = {
                user: user.displayName || user.email.split('@')[0],
                text: replyText,
                timestamp: Date.now(),
                userId: user.uid
            };

            const replyRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}/replies`).push();
            await replyRef.set(replyData);
            
            // إرسال إشعار للمستخدم صاحب التعليق الأصلي
            const originalComment = this.comments[commentId];
            if (originalComment && originalComment.userId && originalComment.userId !== user.uid) {
                // لا حاجة للانتظار هنا
                this.sendReplyNotification(originalComment.userId, commentId, replyText);
            }
            
            replyInput.value = '';
            this.hideAllReplyForms();
            ui.showAuthMessage('تم إرسال الرد بنجاح', 'success');
            
            // التحديث سيتم تلقائياً بفضل on('value') في loadComments
            
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
            console.log('تم إرسال إشعار إعجاب إلى:', targetUserId);
        } catch (error) {
            console.error('Error sending like notification:', error);
        }
    }

    async sendReplyNotification(targetUserId, commentId, replyText) {
        if (!targetUserId || targetUserId === authManager.getCurrentUser().uid) return;
        
        try {
            // نحتاج إلى جلب تفاصيل التعليق الأصلي لتضمينها في الإشعار
            const commentRef = database.ref(`manga_list/${this.currentMangaId}/chapters/${this.currentChapterId}/comments/${commentId}`);
            const commentSnapshot = await commentRef.once('value');
            const comment = commentSnapshot.val();
            
            if (!comment) return; // التعليق الأصلي غير موجود

            const notificationRef = database.ref(`notifications/${targetUserId}`).push();
            await notificationRef.set({
                type: 'reply',
                fromUser: authManager.getCurrentUser().displayName || authManager.getCurrentUser().email,
                fromUserId: authManager.getCurrentUser().uid,
                commentId: commentId,
                mangaId: this.currentMangaId,
                chapterId: this.currentChapterId,
                replyText: replyText.substring(0, 100),
                mangaTitle: mangaManager.currentManga?.title || 'مانجا غير معروفة', // نحتاج إلى جلب اسم المانجا
                chapterTitle: mangaManager.currentChapter?.title || 'فصل غير معروف', // نحتاج إلى جلب اسم الفصل
                timestamp: Date.now(),
                read: false
            });
            console.log('تم إرسال إشعار رد إلى:', targetUserId);
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
        
        return date.toLocaleDateString('ar-SA');
    }
}

const commentsManager = new CommentsManager();
