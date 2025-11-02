// js/comments.js
class CommentsManager {
    constructor(chapterPage) {
        this.chapterPage = chapterPage;
        this.db = chapterPage.db;
        this.auth = chapterPage.auth;
        this.commentsRef = null;
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentForm = document.getElementById('commentForm');
        this.mangaId = chapterPage.mangaId;
        this.chapterNumber = chapterPage.chapterNumber;

        console.log('CommentsManager initialized:', { 
            mangaId: this.mangaId, 
            chapterNumber: this.chapterNumber 
        });

        if (this.commentsContainer && this.commentForm && this.mangaId && this.chapterNumber) {
            this.commentsRef = this.db.ref(`comments/${this.mangaId}/${this.chapterNumber}`);
            this.setupEventListeners();
            this.loadComments();
        } else {
            console.error('CommentsManager: Missing required elements or IDs');
        }
    }

    setupEventListeners() {
        if (this.commentForm) {
            this.commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        }
        
        if (this.commentsContainer) {
            this.commentsContainer.addEventListener('click', (e) => this.handleCommentActions(e));
        }
    }

    async handleCommentSubmit(e) {
        e.preventDefault();
        
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول للتعليق.', 'warning');
            window.location.href = 'auth.html';
            return;
        }

        const commentInput = document.getElementById('commentInput');
        const commentText = commentInput.value.trim();
        
        if (!commentText) {
            Utils.showMessage('يرجى كتابة تعليق.', 'warning');
            return;
        }

        try {
            const user = this.auth.currentUser;
            const newComment = {
                userId: user.uid,
                userName: user.displayName || 'مستخدم',
                userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'مستخدم')}&size=150`,
                text: commentText,
                timestamp: Date.now(),
                replies: {}
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
        if (!this.commentsRef) return;

        this.commentsRef.on('value', (snapshot) => {
            const commentsData = snapshot.val();
            this.renderComments(commentsData);
        }, (error) => {
            console.error('Error loading comments:', error);
            Utils.showMessage('حدث خطأ في تحميل التعليقات.', 'error');
        });
    }

    renderComments(commentsData) {
        if (!this.commentsContainer) return;
        
        this.commentsContainer.innerHTML = '';
        
        if (!commentsData) {
            this.commentsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>لا توجد تعليقات بعد. كن أول من يعلق!</p></div>';
            return;
        }

        const commentsArray = Object.keys(commentsData).map(key => ({
            id: key,
            ...commentsData[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        commentsArray.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            this.commentsContainer.appendChild(commentElement);
        });

        // التمرير إلى تعليق محدد إذا كان هناك hash في الرابط
        const commentId = window.location.hash.substring(1);
        if (commentId) {
            const targetComment = document.getElementById(commentId);
            if (targetComment) {
                setTimeout(() => {
                    targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetComment.classList.add('highlight');
                }, 500);
            }
        }
    }

    createCommentElement(comment) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.id = `comment-${comment.id}`;
        
        const isOwner = this.auth.currentUser && this.auth.currentUser.uid === comment.userId;
        const timestamp = comment.timestamp ? Utils.formatTimestamp(comment.timestamp) : 'غير معروف';

        commentEl.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">
                    <img src="${comment.userAvatar}" alt="${comment.userName}" class="user-avatar-small" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&size=32'">
                    <span class="user-name">${comment.userName}</span>
                </div>
                <div class="comment-date">${timestamp}</div>
            </div>
            <div class="comment-content">${comment.text}</div>
            <div class="comment-actions">
                ${isOwner ? `
                    <button class="action-btn edit-comment" data-id="${comment.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="action-btn delete-comment" data-id="${comment.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                ` : ''}
                <button class="action-btn reply-comment" data-id="${comment.id}">
                    <i class="fas fa-reply"></i> رد
                </button>
            </div>
            <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                <textarea class="comment-input" placeholder="اكتب ردك هنا..." id="reply-input-${comment.id}"></textarea>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button type="button" class="btn btn-sm submit-reply" data-id="${comment.id}">إرسال الرد</button>
                    <button type="button" class="btn btn-outline btn-sm cancel-reply" data-id="${comment.id}">إلغاء</button>
                </div>
            </div>
            <div class="replies" id="replies-${comment.id}">
                ${this.renderReplies(comment.replies, comment.id)}
            </div>
        `;

        return commentEl;
    }

    renderReplies(replies, parentId) {
        if (!replies) return '';
        
        const repliesArray = Object.keys(replies).map(key => ({
            id: key,
            ...replies[key]
        })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        let html = '';
        repliesArray.forEach(reply => {
            const isOwner = this.auth.currentUser && this.auth.currentUser.uid === reply.userId;
            const timestamp = reply.timestamp ? Utils.formatTimestamp(reply.timestamp) : 'غير معروف';
            
            html += `
                <div class="comment reply" id="reply-${parentId}-${reply.id}">
                    <div class="comment-header">
                        <div class="comment-user">
                            <img src="${reply.userAvatar}" alt="${reply.userName}" class="user-avatar-small"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userName)}&size=32'">
                            <span class="user-name">${reply.userName}</span>
                        </div>
                        <div class="comment-date">${timestamp}</div>
                    </div>
                    <div class="comment-content">
                        ${reply.replyingTo ? `<span class="replying-to">@${reply.replyingTo}</span> ` : ''}
                        ${reply.text}
                    </div>
                    ${isOwner ? `
                        <div class="comment-actions">
                            <button class="action-btn delete-reply" data-parent-id="${parentId}" data-id="${reply.id}">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        return html;
    }

    handleCommentActions(e) {
        const target = e.target.closest('button');
        if (!target) return;

        const commentId = target.getAttribute('data-id');
        const parentId = target.getAttribute('data-parent-id');

        if (target.classList.contains('reply-comment')) {
            this.toggleReplyForm(commentId);
        } else if (target.classList.contains('submit-reply')) {
            this.handleReplySubmit(commentId);
        } else if (target.classList.contains('cancel-reply')) {
            this.toggleReplyForm(commentId, false);
        } else if (target.classList.contains('delete-comment')) {
            this.deleteComment(commentId);
        } else if (target.classList.contains('delete-reply')) {
            this.deleteReply(parentId, commentId);
        } else if (target.classList.contains('edit-comment')) {
            this.editComment(commentId);
        }
    }

    toggleReplyForm(commentId, show = true) {
        const form = document.getElementById(`reply-form-${commentId}`);
        if (form) {
            form.style.display = show ? 'block' : 'none';
            if (show) {
                const input = document.getElementById(`reply-input-${commentId}`);
                if (input) input.focus();
            }
        }
    }

    async handleReplySubmit(commentId) {
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول للرد.', 'warning');
            return;
        }

        const input = document.getElementById(`reply-input-${commentId}`);
        const replyText = input?.value.trim();
        
        if (!replyText) {
            Utils.showMessage('يرجى كتابة رد.', 'warning');
            return;
        }

        try {
            const user = this.auth.currentUser;
            const parentCommentRef = this.commentsRef.child(commentId);
            const parentSnapshot = await parentCommentRef.once('value');
            const parentComment = parentSnapshot.val();

            const newReply = {
                userId: user.uid,
                userName: user.displayName || 'مستخدم',
                userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'مستخدم')}&size=150`,
                text: replyText,
                replyingTo: parentComment.userName,
                timestamp: Date.now()
            };

            const replyRef = parentCommentRef.child('replies').push();
            await replyRef.set(newReply);
            
            input.value = '';
            this.toggleReplyForm(commentId, false);
            Utils.showMessage('تم إرسال الرد بنجاح.', 'success');

            // إرسال إشعار لصاحب التعليق الأصلي
            if (parentComment.userId !== user.uid) {
                await this.sendReplyNotification(parentComment.userId, commentId, replyRef.key, newReply);
            }

        } catch (error) {
            console.error('Error adding reply:', error);
            Utils.showMessage('حدث خطأ أثناء إرسال الرد.', 'error');
        }
    }

    async deleteComment(commentId) {
        if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
        
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

    editComment(commentId) {
        const commentElement = document.getElementById(`comment-${commentId}`);
        const contentElement = commentElement.querySelector('.comment-content');
        const currentText = contentElement.textContent;
        
        const newText = prompt('تعديل التعليق:', currentText);
        if (newText && newText !== currentText) {
            this.commentsRef.child(commentId).update({ 
                text: newText,
                edited: true,
                editTimestamp: Date.now()
            });
        }
    }

    async sendReplyNotification(parentCommentUserId, commentId, replyId, replyData) {
        try {
            const notificationRef = this.db.ref(`notifications/${parentCommentUserId}`).push();
            
            const notification = {
                type: 'reply',
                senderId: this.auth.currentUser.uid,
                senderName: this.auth.currentUser.displayName || 'مستخدم',
                mangaId: this.mangaId,
                chapterId: this.chapterNumber,
                commentId: commentId,
                replyId: replyId,
                text: `رد ${this.auth.currentUser.displayName || 'مستخدم'} على تعليقك: "${replyData.text.substring(0, 100)}${replyData.text.length > 100 ? '...' : ''}"`,
                timestamp: Date.now(),
                read: false
            };
            
            await notificationRef.set(notification);
            console.log('تم إرسال الإشعار بنجاح إلى:', parentCommentUserId);
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }
}