// [file name]: comments.js
class CommentsManager {
    constructor() {
        this.comments = {};
        this.userLikes = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // معالجة إرسال التعليق
        document.addEventListener('click', (e) => {
            if (e.target.id === 'submitComment' || e.target.closest('#submitComment')) {
                this.submitComment();
            }
        });

        // معالجة الضغط على Enter في حقل التعليق
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && e.target.id === 'commentInput') {
                this.submitComment();
            }
        });
    }

    async submitComment() {
        if (!authManager.requireAuth('إضافة تعليق')) {
            return;
        }

        const commentInput = document.getElementById('commentInput');
        if (!commentInput) return;

        const commentText = commentInput.value.trim();
        if (!commentText) {
            ui.showAlert('يرجى كتابة تعليق', 'error');
            return;
        }

        if (commentText.length > 1000) {
            ui.showAlert('التعليق طويل جداً. الحد الأقصى 1000 حرف', 'error');
            return;
        }

        const mangaId = mangaManager.getCurrentMangaId();
        const chapterId = mangaManager.getCurrentChapterId();

        if (!mangaId || !chapterId) {
            ui.showAlert('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
            return;
        }

        try {
            const commentRef = database.ref(`comments/${mangaId}/${chapterId}`).push();
            const commentData = {
                text: commentText,
                userId: authManager.getCurrentUser().uid,
                userName: authManager.getCurrentUser().displayName || 'مستخدم',
                userAvatar: authManager.getCurrentUser().photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authManager.getCurrentUser().displayName || 'User')}&background=666&color=fff&size=150`,
                timestamp: Date.now(),
                likes: 0,
                likedBy: {},
                replies: {}
            };

            await commentRef.set(commentData);

            commentInput.value = '';
            ui.showAlert('تم إضافة التعليق بنجاح', 'success');

            // إعادة تحميل التعليقات
            await this.loadComments(mangaId, chapterId);

            // تحديث إحصائيات المستخدم
            authManager.updateUserStats('commentsCount');

        } catch (error) {
            console.error('Error submitting comment:', error);
            ui.showAlert('حدث خطأ في إضافة التعليق', 'error');
        }
    }

    async loadComments(mangaId, chapterId) {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        try {
            const commentsRef = database.ref(`comments/${mangaId}/${chapterId}`);
            const snapshot = await commentsRef.once('value');
            this.comments = snapshot.val() || {};

            this.displayComments();

        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = '<p class="no-comments">حدث خطأ في تحميل التعليقات</p>';
        }
    }

    displayComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        commentsList.innerHTML = '';

        if (!this.comments || Object.keys(this.comments).length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments">
                    <p>لا توجد تعليقات بعد</p>
                    <p class="no-comments-subtitle">كن أول من يعلق على هذا الفصل!</p>
                </div>
            `;
            return;
        }

        const commentsArray = Object.keys(this.comments).map(key => {
            return { id: key, ...this.comments[key] };
        });

        // ترتيب التعليقات من الأحدث إلى الأقدم
        commentsArray.sort((a, b) => b.timestamp - a.timestamp);

        commentsArray.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            commentsList.appendChild(commentElement);
        });
    }

    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        commentDiv.id = `comment-${comment.id}`;

        const isOwner = authManager.getCurrentUser() && comment.userId === authManager.getCurrentUser().uid;
        const isLiked = comment.likedBy && authManager.getCurrentUser() && comment.likedBy[authManager.getCurrentUser().uid];

        commentDiv.innerHTML = `
            <div class="comment-header">
                <div class="user-info">
                    <img src="${comment.userAvatar}" alt="${comment.userName}" class="user-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=666&color=fff&size=150'">
                    <div class="user-details">
                        <span class="comment-user">${comment.userName}</span>
                        <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
                    </div>
                </div>
                ${isOwner ? `
                <div class="comment-actions-menu">
                    <button class="comment-menu-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="comment-menu" id="menu-${comment.id}">
                        <button class="menu-item edit-comment" data-comment-id="${comment.id}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="menu-item delete-comment" data-comment-id="${comment.id}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="comment-text" id="comment-text-${comment.id}">${this.escapeHtml(comment.text)}</div>
            <div class="comment-actions">
                <button class="comment-action like-comment ${isLiked ? 'liked' : ''}" data-comment-id="${comment.id}">
                    <i class="fas fa-heart"></i>
                    <span class="like-count">${comment.likes || 0}</span>
                </button>
                <button class="comment-action reply-comment" data-comment-id="${comment.id}">
                    <i class="fas fa-reply"></i> رد
                </button>
                ${comment.replies && Object.keys(comment.replies).length > 0 ? `
                <button class="comment-action toggle-replies" data-comment-id="${comment.id}">
                    <i class="fas fa-chevron-down toggle-icon"></i>
                    عرض الردود (${Object.keys(comment.replies).length})
                </button>
                ` : ''}
            </div>
            ${comment.replies && Object.keys(comment.replies).length > 0 ? `
            <div class="comment-replies" id="replies-${comment.id}">
                ${this.createRepliesHTML(comment.replies)}
            </div>
            ` : ''}
            <div class="reply-form" id="reply-form-${comment.id}">
                <textarea class="reply-input" placeholder="اكتب ردك هنا..." maxlength="500"></textarea>
                <div class="reply-footer">
                    <span class="char-count">0/500</span>
                    <div class="reply-buttons">
                        <button class="btn cancel-reply" data-comment-id="${comment.id}">إلغاء</button>
                        <button class="btn submit-reply" data-comment-id="${comment.id}">إرسال</button>
                    </div>
                </div>
            </div>
        `;

        // إضافة مستمعي الأحداث
        this.attachCommentListeners(commentDiv, comment);

        return commentDiv;
    }

    createRepliesHTML(replies) {
        if (!replies) return '';

        const repliesArray = Object.keys(replies).map(key => {
            return { id: key, ...replies[key] };
        });

        repliesArray.sort((a, b) => a.timestamp - b.timestamp);

        return repliesArray.map(reply => `
            <div class="reply">
                <div class="reply-header">
                    <div class="user-info">
                        <img src="${reply.userAvatar}" alt="${reply.userName}" class="user-avatar small" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userName)}&background=666&color=fff&size=150'">
                        <span class="reply-user">${reply.userName}</span>
                    </div>
                    <span class="reply-time">${this.formatTime(reply.timestamp)}</span>
                </div>
                <div class="reply-text">${this.escapeHtml(reply.text)}</div>
            </div>
        `).join('');
    }

    attachCommentListeners(commentDiv, comment) {
        // زر الإعجاب
        const likeBtn = commentDiv.querySelector('.like-comment');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                this.likeComment(comment.id);
            });
        }

        // زر الرد
        const replyBtn = commentDiv.querySelector('.reply-comment');
        if (replyBtn) {
            replyBtn.addEventListener('click', () => {
                this.toggleReplyForm(comment.id);
            });
        }

        // زر عرض الردود
        const toggleRepliesBtn = commentDiv.querySelector('.toggle-replies');
        if (toggleRepliesBtn) {
            toggleRepliesBtn.addEventListener('click', () => {
                this.toggleReplies(comment.id);
            });
        }

        // قائمة الخيارات
        const menuBtn = commentDiv.querySelector('.comment-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCommentMenu(comment.id);
            });
        }

        // زر تعديل التعليق
        const editBtn = commentDiv.querySelector('.edit-comment');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.editComment(comment.id);
            });
        }

        // زر حذف التعليق
        const deleteBtn = commentDiv.querySelector('.delete-comment');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteComment(comment.id);
            });
        }

        // أزرار الرد
        const submitReplyBtn = commentDiv.querySelector('.submit-reply');
        if (submitReplyBtn) {
            submitReplyBtn.addEventListener('click', () => {
                this.submitReply(comment.id);
            });
        }

        const cancelReplyBtn = commentDiv.querySelector('.cancel-reply');
        if (cancelReplyBtn) {
            cancelReplyBtn.addEventListener('click', () => {
                this.toggleReplyForm(comment.id);
            });
        }

        // عداد الأحرف
        const replyInput = commentDiv.querySelector('.reply-input');
        const charCount = commentDiv.querySelector('.char-count');
        if (replyInput && charCount) {
            replyInput.addEventListener('input', () => {
                charCount.textContent = `${replyInput.value.length}/500`;
            });
        }
    }

    toggleReplyForm(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            if (replyForm.style.display === 'block') {
                replyForm.style.display = 'none';
            } else {
                // إخفاء جميع نماذج الرد الأخرى
                document.querySelectorAll('.reply-form').forEach(form => {
                    form.style.display = 'none';
                });
                replyForm.style.display = 'block';
                replyForm.querySelector('.reply-input').focus();
            }
        }
    }

    toggleReplies(commentId) {
        const repliesDiv = document.getElementById(`replies-${commentId}`);
        const toggleBtn = document.querySelector(`[data-comment-id="${commentId}"].toggle-replies`);
        const icon = toggleBtn?.querySelector('.toggle-icon');

        if (repliesDiv) {
            if (repliesDiv.classList.contains('show')) {
                repliesDiv.classList.remove('show');
                if (icon) icon.style.transform = 'rotate(0deg)';
            } else {
                repliesDiv.classList.add('show');
                if (icon) icon.style.transform = 'rotate(180deg)';
            }
        }
    }

    toggleCommentMenu(commentId) {
        const menu = document.getElementById(`menu-${commentId}`);
        if (menu) {
            // إغلاق جميع القوائم الأخرى
            document.querySelectorAll('.comment-menu').forEach(m => {
                if (m.id !== `menu-${commentId}`) {
                    m.classList.remove('show');
                }
            });

            menu.classList.toggle('show');
        }
    }

    async likeComment(commentId) {
        if (!authManager.requireAuth('الإعجاب بالتعليق')) {
            return;
        }

        const mangaId = mangaManager.getCurrentMangaId();
        const chapterId = mangaManager.getCurrentChapterId();

        try {
            const commentRef = database.ref(`comments/${mangaId}/${chapterId}/${commentId}`);
            const snapshot = await commentRef.once('value');
            const comment = snapshot.val();

            const likedBy = comment.likedBy || {};
            let newLikes = comment.likes || 0;

            if (likedBy[authManager.getCurrentUser().uid]) {
                // إزالة الإعجاب
                newLikes--;
                delete likedBy[authManager.getCurrentUser().uid];
            } else {
                // إضافة الإعجاب
                newLikes++;
                likedBy[authManager.getCurrentUser().uid] = true;

                // إرسال إشعار لصاحب التعليق
                if (comment.userId !== authManager.getCurrentUser().uid) {
                    await this.sendLikeNotification(comment.userId, mangaId, chapterId, commentId);
                }
            }

            await commentRef.update({
                likes: newLikes,
                likedBy: likedBy
            });

            // إعادة تحميل التعليقات
            await this.loadComments(mangaId, chapterId);

        } catch (error) {
            console.error('Error liking comment:', error);
            ui.showAlert('حدث خطأ في الإعجاب', 'error');
        }
    }

    async submitReply(commentId) {
        if (!authManager.requireAuth('إضافة رد')) {
            return;
        }

        const replyForm = document.getElementById(`reply-form-${commentId}`);
        const replyInput = replyForm?.querySelector('.reply-input');

        if (!replyInput) return;

        const replyText = replyInput.value.trim();
        if (!replyText) {
            ui.showAlert('يرجى كتابة رد', 'error');
            return;
        }

        const mangaId = mangaManager.getCurrentMangaId();
        const chapterId = mangaManager.getCurrentChapterId();

        try {
            const replyRef = database.ref(`comments/${mangaId}/${chapterId}/${commentId}/replies`).push();
            const replyData = {
                text: replyText,
                userId: authManager.getCurrentUser().uid,
                userName: authManager.getCurrentUser().displayName || 'مستخدم',
                userAvatar: authManager.getCurrentUser().photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authManager.getCurrentUser().displayName || 'User')}&background=666&color=fff&size=150`,
                timestamp: Date.now()
            };

            await replyRef.set(replyData);

            replyInput.value = '';
            replyForm.style.display = 'none';

            ui.showAlert('تم إضافة الرد بنجاح', 'success');

            // إرسال إشعار لصاحب التعليق
            const commentSnapshot = await database.ref(`comments/${mangaId}/${chapterId}/${commentId}`).once('value');
            const comment = commentSnapshot.val();

            if (comment && comment.userId !== authManager.getCurrentUser().uid) {
                await this.sendReplyNotification(comment.userId, mangaId, chapterId, commentId, replyText);
            }

            // إعادة تحميل التعليقات
            await this.loadComments(mangaId, chapterId);

        } catch (error) {
            console.error('Error submitting reply:', error);
            ui.showAlert('حدث خطأ في إضافة الرد', 'error');
        }
    }

    async editComment(commentId) {
        const commentTextDiv = document.getElementById(`comment-text-${commentId}`);
        if (!commentTextDiv) return;

        const currentText = commentTextDiv.textContent;

        commentTextDiv.innerHTML = `
            <textarea class="edit-comment-input">${currentText}</textarea>
            <div class="edit-controls">
                <span class="edit-char-count">${currentText.length}/1000</span>
                <div class="edit-buttons">
                    <button class="btn btn-secondary cancel-edit" data-comment-id="${commentId}">إلغاء</button>
                    <button class="btn save-edit" data-comment-id="${commentId}">حفظ</button>
                </div>
            </div>
        `;

        const editInput = commentTextDiv.querySelector('.edit-comment-input');
        const charCount = commentTextDiv.querySelector('.edit-char-count');

        editInput.focus();

        editInput.addEventListener('input', () => {
            charCount.textContent = `${editInput.value.length}/1000`;
        });

        // زر الحفظ
        const saveBtn = commentTextDiv.querySelector('.save-edit');
        saveBtn.addEventListener('click', async () => {
            const newText = editInput.value.trim();

            if (!newText) {
                ui.showAlert('التعليق لا يمكن أن يكون فارغاً', 'error');
                return;
            }

            if (newText.length > 1000) {
                ui.showAlert('التعليق طويل جداً', 'error');
                return;
            }

            const mangaId = mangaManager.getCurrentMangaId();
            const chapterId = mangaManager.getCurrentChapterId();

            try {
                await database.ref(`comments/${mangaId}/${chapterId}/${commentId}/text`).set(newText);
                await database.ref(`comments/${mangaId}/${chapterId}/${commentId}/edited`).set(true);
                await database.ref(`comments/${mangaId}/${chapterId}/${commentId}/editedAt`).set(Date.now());

                ui.showAlert('تم تعديل التعليق بنجاح', 'success');
                await this.loadComments(mangaId, chapterId);

            } catch (error) {
                console.error('Error editing comment:', error);
                ui.showAlert('حدث خطأ في تعديل التعليق', 'error');
            }
        });

        // زر الإلغاء
        const cancelBtn = commentTextDiv.querySelector('.cancel-edit');
        cancelBtn.addEventListener('click', async () => {
            const mangaId = mangaManager.getCurrentMangaId();
            const chapterId = mangaManager.getCurrentChapterId();
            await this.loadComments(mangaId, chapterId);
        });
    }

    async deleteComment(commentId) {
        ui.showConfirmation(
            'هل أنت متأكد من حذف هذا التعليق؟',
            async () => {
                const mangaId = mangaManager.getCurrentMangaId();
                const chapterId = mangaManager.getCurrentChapterId();

                try {
                    await database.ref(`comments/${mangaId}/${chapterId}/${commentId}`).remove();

                    ui.showAlert('تم حذف التعليق بنجاح', 'success');
                    await this.loadComments(mangaId, chapterId);

                    // تحديث إحصائيات المستخدم
                    authManager.updateUserStats('commentsCount', -1);

                } catch (error) {
                    console.error('Error deleting comment:', error);
                    ui.showAlert('حدث خطأ في حذف التعليق', 'error');
                }
            }
        );
    }

    async sendLikeNotification(userId, mangaId, chapterId, commentId) {
        try {
            const notificationRef = database.ref(`notifications/${userId}`).push();
            await notificationRef.set({
                type: 'comment_like',
                fromUser: authManager.getCurrentUser().displayName || 'مستخدم',
                mangaId: mangaId,
                chapterId: chapterId,
                commentId: commentId,
                timestamp: Date.now(),
                read: false
            });
        } catch (error) {
            console.error('Error sending like notification:', error);
        }
    }

    async sendReplyNotification(userId, mangaId, chapterId, commentId, replyText) {
        try {
            const notificationRef = database.ref(`notifications/${userId}`).push();
            await notificationRef.set({
                type: 'comment_reply',
                fromUser: authManager.getCurrentUser().displayName || 'مستخدم',
                replyText: replyText.substring(0, 100) + (replyText.length > 100 ? '...' : ''),
                mangaId: mangaId,
                chapterId: chapterId,
                commentId: commentId,
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const commentsManager = new CommentsManager();

// إغلاق القوائم عند النقر خارجها
document.addEventListener('click', (e) => {
    if (!e.target.closest('.comment-actions-menu')) {
        document.querySelectorAll('.comment-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});
