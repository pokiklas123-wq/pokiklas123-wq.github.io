// js/comments.js

class CommentsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.auth = app.auth;
        this.commentsRef = null;
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentForm = document.getElementById('commentForm');
        this.mangaId = this.getMangaIdFromUrl();
        this.chapterId = this.getChapterIdFromUrl();

        if (this.commentsContainer && this.commentForm && this.mangaId && this.chapterId) {
            this.commentsRef = this.db.ref(`manga_comments/${this.mangaId}/${this.chapterId}`);
            this.setupEventListeners();
            this.loadComments();
        } else {
            console.error('CommentsManager: Missing required elements or IDs.');
        }
    }

    getMangaIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('mangaId');
    }

    getChapterIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('chapterId');
    }

    setupEventListeners() {
        this.commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        this.commentsContainer.addEventListener('click', (e) => this.handleCommentActions(e));
    }

    async handleCommentSubmit(e) {
        e.preventDefault();
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول للتعليق.', 'warning');
            return;
        }

        const commentInput = document.getElementById('commentInput');
        const commentText = commentInput.value.trim();
        if (!commentText) return;

        try {
            const newComment = {
                userId: this.auth.currentUser.uid,
                userName: this.auth.currentUser.displayName || 'مستخدم',
                userAvatar: this.auth.currentUser.photoURL || Utils.getAvatarUrl(this.auth.currentUser.displayName || 'مستخدم'),
                text: commentText,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                replies: {} // Nested replies structure
            };

            await this.commentsRef.push(newComment);
            commentInput.value = '';
            Utils.showMessage('تم إضافة التعليق بنجاح.', 'success');
        } catch (error) {
            console.error('Error adding comment:', error);
            Utils.showMessage('حدث خطأ أثناء إضافة التعليق.', 'error');
        }
    }

    loadComments() {
        this.commentsRef.on('value', (snapshot) => {
            const commentsData = snapshot.val();
            this.renderComments(commentsData);
        });
    }

    renderComments(commentsData) {
        this.commentsContainer.innerHTML = '';
        if (!commentsData) {
            this.commentsContainer.innerHTML = '<p class="empty-state">لا توجد تعليقات بعد. كن أول من يعلق!</p>';
            return;
        }

        const commentsArray = Object.keys(commentsData).map(key => ({
            id: key,
            ...commentsData[key]
        })).sort((a, b) => a.timestamp - b.timestamp);

        commentsArray.forEach(comment => {
            this.commentsContainer.appendChild(this.createCommentElement(comment));
        });
        
        // Scroll to specific comment if hash is present
        const commentId = window.location.hash.substring(1);
        if (commentId) {
            const targetComment = document.getElementById(commentId);
            if (targetComment) {
                targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetComment.classList.add('highlight');
                setTimeout(() => targetComment.classList.remove('highlight'), 3000);
            }
        }
    }

    createCommentElement(comment, isReply = false) {
        const commentEl = document.createElement('div');
        commentEl.className = `comment-item ${isReply ? 'reply-item' : ''}`;
        commentEl.id = comment.id;
        
        const isOwner = this.auth.currentUser && this.auth.currentUser.uid === comment.userId;
        const timestamp = Utils.formatTimestamp(comment.timestamp);

        commentEl.innerHTML = `
            <div class="comment-header">
                <img src="${comment.userAvatar}" alt="${comment.userName}" class="comment-avatar">
                <div class="comment-meta">
                    <span class="comment-user">${comment.userName}</span>
                    <span class="comment-time">${timestamp}</span>
                </div>
                <div class="comment-actions">
                    ${isOwner ? `<button class="btn-icon edit-comment" data-id="${comment.id}" data-text="${comment.text}"><i class="fas fa-edit"></i></button>` : ''}
                    ${isOwner ? `<button class="btn-icon delete-comment" data-id="${comment.id}"><i class="fas fa-trash"></i></button>` : ''}
                    <button class="btn-icon reply-comment" data-id="${comment.id}" data-user="${comment.userName}"><i class="fas fa-reply"></i> رد</button>
                </div>
            </div>
            <div class="comment-body">
                <p class="comment-text">${comment.text}</p>
            </div>
            <div class="replies-container">
                ${this.renderReplies(comment.replies, comment.id)}
            </div>
            <div class="reply-form-container" data-id="${comment.id}" style="display:none;">
                ${this.createReplyForm(comment.id, comment.userName)}
            </div>
        `;
        return commentEl;
    }

    renderReplies(replies, parentId) {
        if (!replies) return '';
        
        const repliesArray = Object.keys(replies).map(key => ({
            id: key,
            ...replies[key]
        })).sort((a, b) => a.timestamp - b.timestamp);

        let html = '';
        repliesArray.forEach(reply => {
            // Replies are nested under the parent comment ID
            reply.id = `${parentId}-${reply.id}`; 
            html += this.createReplyElement(reply, parentId);
        });
        return html;
    }

    createReplyElement(reply, parentId) {
        const isOwner = this.auth.currentUser && this.auth.currentUser.uid === reply.userId;
        const timestamp = Utils.formatTimestamp(reply.timestamp);
        const replyId = reply.id.split('-')[1]; // Get the actual reply ID

        return `
            <div class="comment-item reply-item" id="${reply.id}">
                <div class="comment-header">
                    <img src="${reply.userAvatar}" alt="${reply.userName}" class="comment-avatar">
                    <div class="comment-meta">
                        <span class="comment-user">${reply.userName}</span>
                        <span class="comment-time">${timestamp}</span>
                    </div>
                    <div class="comment-actions">
                        ${isOwner ? `<button class="btn-icon edit-reply" data-parent-id="${parentId}" data-id="${replyId}" data-text="${reply.text}"><i class="fas fa-edit"></i></button>` : ''}
                        ${isOwner ? `<button class="btn-icon delete-reply" data-parent-id="${parentId}" data-id="${replyId}"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
                <div class="comment-body">
                    <p class="comment-text">
                        <span class="replying-to">@${reply.replyingTo}</span> ${reply.text}
                    </p>
                </div>
            </div>
        `;
    }

    createReplyForm(parentId, replyingTo) {
        return `
            <form class="reply-form" data-parent-id="${parentId}">
                <textarea class="reply-input" placeholder="الرد على ${replyingTo}..." required></textarea>
                <div class="reply-form-actions">
                    <button type="submit" class="btn btn-sm">إرسال الرد</button>
                    <button type="button" class="btn btn-sm btn-outline cancel-reply">إلغاء</button>
                </div>
            </form>
        `;
    }

    handleCommentActions(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const commentId = target.getAttribute('data-id');
        const parentId = target.getAttribute('data-parent-id');

        if (target.classList.contains('reply-comment')) {
            this.toggleReplyForm(commentId, target.getAttribute('data-user'));
        } else if (target.classList.contains('delete-comment')) {
            this.deleteComment(commentId);
        } else if (target.classList.contains('edit-comment')) {
            this.editComment(commentId, target.getAttribute('data-text'));
        } else if (target.classList.contains('delete-reply')) {
            this.deleteReply(parentId, commentId);
        } else if (target.classList.contains('edit-reply')) {
            this.editReply(parentId, commentId, target.getAttribute('data-text'));
        } else if (target.classList.contains('cancel-reply')) {
            this.hideAllReplyForms();
        } else if (target.closest('.reply-form')) {
            const form = target.closest('.reply-form');
            if (target.type === 'submit') {
                e.preventDefault();
                this.handleReplySubmit(form);
            }
        }
    }

    toggleReplyForm(commentId, replyingTo) {
        this.hideAllReplyForms();
        const formContainer = document.querySelector(`.reply-form-container[data-id="${commentId}"]`);
        if (formContainer) {
            formContainer.style.display = 'block';
            const replyInput = formContainer.querySelector('.reply-input');
            if (replyInput) {
                replyInput.focus();
            }
        }
    }

    hideAllReplyForms() {
        document.querySelectorAll('.reply-form-container').forEach(container => {
            container.style.display = 'none';
        });
    }

    async handleReplySubmit(form) {
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول للرد.', 'warning');
            return;
        }

        const parentId = form.getAttribute('data-parent-id');
        const replyInput = form.querySelector('.reply-input');
        const replyText = replyInput.value.trim();
        if (!replyText) return;

        try {
            const parentCommentEl = document.getElementById(parentId);
            const replyingTo = parentCommentEl.querySelector('.comment-user').textContent;

            const newReply = {
                userId: this.auth.currentUser.uid,
                userName: this.auth.currentUser.displayName || 'مستخدم',
                userAvatar: this.auth.currentUser.photoURL || Utils.getAvatarUrl(this.auth.currentUser.displayName || 'مستخدم'),
                text: replyText,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                replyingTo: replyingTo // Store who they are replying to
            };

            const replyRef = this.commentsRef.child(parentId).child('replies').push();
            await replyRef.set(newReply);
            
            // Send notification to the parent comment owner
            this.sendReplyNotification(parentId, replyRef.key);

            replyInput.value = '';
            this.hideAllReplyForms();
            Utils.showMessage('تم إرسال الرد بنجاح.', 'success');
        } catch (error) {
            console.error('Error adding reply:', error);
            Utils.showMessage('حدث خطأ أثناء إرسال الرد.', 'error');
        }
    }

    async deleteComment(commentId) {
        if (!confirm('هل أنت متأكد من حذف هذا التعليق وكل الردود عليه؟')) return;
        try {
            await this.commentsRef.child(commentId).remove();
            Utils.showMessage('تم حذف التعليق بنجاح.', 'success');
        } catch (error) {
            console.error('Error deleting comment:', error);
            Utils.showMessage('حدث خطأ أثناء حذف التعليق.', 'error');
        }
    }

    async deleteReply(parentId, replyId) {
        if (!confirm('هل أنت متأكد من حذف هذا الرد؟')) return;
        try {
            await this.commentsRef.child(parentId).child('replies').child(replyId).remove();
            Utils.showMessage('تم حذف الرد بنجاح.', 'success');
        } catch (error) {
            console.error('Error deleting reply:', error);
            Utils.showMessage('حدث خطأ أثناء حذف الرد.', 'error');
        }
    }

    editComment(commentId, currentText) {
        const newText = prompt('تعديل التعليق:', currentText);
        if (newText && newText.trim() !== currentText) {
            try {
                this.commentsRef.child(commentId).update({ text: newText.trim() });
                Utils.showMessage('تم تعديل التعليق بنجاح.', 'success');
            } catch (error) {
                console.error('Error editing comment:', error);
                Utils.showMessage('حدث خطأ أثناء تعديل التعليق.', 'error');
            }
        }
    }

    editReply(parentId, replyId, currentText) {
        const newText = prompt('تعديل الرد:', currentText);
        if (newText && newText.trim() !== currentText) {
            try {
                this.commentsRef.child(parentId).child('replies').child(replyId).update({ text: newText.trim() });
                Utils.showMessage('تم تعديل الرد بنجاح.', 'success');
            } catch (error) {
                console.error('Error editing reply:', error);
                Utils.showMessage('حدث خطأ أثناء تعديل الرد.', 'error');
            }
        }
    }
    
    async sendReplyNotification(parentId, replyId) {
        try {
            const parentSnapshot = await this.commentsRef.child(parentId).once('value');
            const parentComment = parentSnapshot.val();
            
            if (!parentComment || parentComment.userId === this.auth.currentUser.uid) {
                return; // Don't notify if replying to self
            }
            
            const notificationRef = this.db.ref(`notifications/${parentComment.userId}`).push();
            
            const notification = {
                type: 'reply',
                senderId: this.auth.currentUser.uid,
                senderName: this.auth.currentUser.displayName || 'مستخدم',
                mangaId: this.mangaId,
                chapterId: this.chapterId,
                commentId: parentId,
                replyId: replyId,
                text: `رد عليك ${this.auth.currentUser.displayName || 'مستخدم'} على تعليقك.`,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                read: false
            };
            
            await notificationRef.set(notification);
            console.log('Notification sent successfully.');
            
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }
}

// يتم تهيئة المدير في chapter.js بعد تهيئة التطبيق
// new CommentsManager(appInstance);
