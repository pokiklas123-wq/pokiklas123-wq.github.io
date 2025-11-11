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

    async getUserData(userId) {
        try {
            const snapshot = await this.db.ref(`users/${userId}`).once('value');
            const userData = snapshot.val();
            
            if (userData) {
                return {
                    displayName: userData.displayName || 'مستخدم',
                    avatar: userData.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'مستخدم')}&size=150`
                };
            }
            
            const user = this.auth.currentUser;
            return {
                displayName: user?.displayName || 'مستخدم',
                avatar: user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'مستخدم')}&size=150`
            };
        } catch (error) {
            console.error('❌ خطأ في جلب بيانات المستخدم:', error);
            const user = this.auth.currentUser;
            return {
                displayName: user?.displayName || 'مستخدم',
                avatar: user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'مستخدم')}&size=150`
            };
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
            const userData = await this.getUserData(user.uid);
            
            const newComment = {
                userId: user.uid,
                userName: userData.displayName,
                userAvatar: userData.avatar,
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

        // العودة إلى استخدام value مع حفظ الحالة
        this.commentsRef.on('value', (snapshot) => {
            const commentsData = snapshot.val();
            this.renderComments(commentsData);
        }, (error) => {
            console.error('Error loading comments:', error);
            Utils.showMessage('حدث خطأ في تحميل التعليقات.', 'error');
        });
    }

    async renderComments(commentsData) {
        if (!this.commentsContainer) return;
        
        // حفظ حالة الردود المفتوحة قبل التحديث
        const openReplies = this.getOpenRepliesState();
        
        this.commentsContainer.innerHTML = '';
        
        if (!commentsData) {
            this.commentsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>لا توجد تعليقات بعد. كن أول من يعلق!</p></div>';
            return;
        }

        const commentsArray = Object.keys(commentsData).map(key => ({
            id: key,
            ...commentsData[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // إنشاء التعليقات
        for (const comment of commentsArray) {
            const enhancedComment = await this.enhanceCommentUserData(comment);
            const commentElement = await this.createCommentElement(enhancedComment, openReplies);
            this.commentsContainer.appendChild(commentElement);
        }

        // لا نحتاج لاستعادة الحالة لأننا نمررها أثناء الإنشاء
    }

    // دالة بسيطة لحفظ الحالة الحالية
    getOpenRepliesState() {
        const openReplies = new Set();
        const openContainers = this.commentsContainer.querySelectorAll('.replies-container[style*="display: block"]');
        
        openContainers.forEach(container => {
            const commentId = container.id.replace('replies-container-', '');
            openReplies.add(commentId);
        });
        
        return openReplies;
    }

    async enhanceCommentUserData(comment) {
        try {
            if ((comment.userName === 'مستخدم' || !comment.userName || comment.userName === 'undefined') && comment.userId) {
                const userData = await this.getUserData(comment.userId);
                return {
                    ...comment,
                    userName: userData.displayName,
                    userAvatar: userData.avatar
                };
            }
            return comment;
        } catch (error) {
            console.error('Error enhancing comment data:', error);
            return comment;
        }
    }

    async createCommentElement(comment, openReplies = new Set()) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.id = `comment-${comment.id}`;
        
        const isOwner = this.auth.currentUser && this.auth.currentUser.uid === comment.userId;
        const timestamp = comment.timestamp ? Utils.formatTimestamp(comment.timestamp) : 'غير معروف';
        const editedBadge = comment.edited ? '<span class="edited-badge">(تم التعديل)</span>' : '';

        const repliesHTML = await this.renderReplies(comment.replies, comment.id);
        const repliesCount = comment.replies ? Object.keys(comment.replies).length : 0;

        // التحقق إذا كان هذا التعليق مفتوحاً
        const isOpen = openReplies.has(comment.id);
        const repliesDisplay = isOpen ? 'block' : 'none';
        const toggleIcon = isOpen ? 'fa-chevron-up' : 'fa-chevron-down';
        const toggleText = isOpen ? 'إخفاء' : 'عرض';

        commentEl.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">
                    <img src="${comment.userAvatar}" alt="${comment.userName}" class="user-avatar-small" 
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&size=32'">
                    <span class="user-name chapter-card-text">${comment.userName}</span>
                </div>
                <div class="comment-date">${timestamp} ${editedBadge}</div>
            </div>
            <div class="comment-content">${comment.text}</div>
            <div class="comment-actions">
                ${isOwner ? `
                    <button class="action-btn edit-comment" data-id="${comment.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="action-btn delete-btn delete-comment" data-id="${comment.id}">
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
            ${repliesCount > 0 ? `
                <button class="replies-toggle-btn ${isOpen ? 'active' : ''}" data-id="${comment.id}" data-count="${repliesCount}" id="replies-btn-${comment.id}">
                    <i class="fas ${toggleIcon}"></i>
                    ${toggleText} ${repliesCount} ${repliesCount === 1 ? 'رد' : 'ردود'}
                </button>
            ` : ''}
            <div class="replies-container" id="replies-container-${comment.id}" style="display: ${repliesDisplay};">
                <div class="replies" id="replies-${comment.id}">
                    ${repliesHTML}
                </div>
            </div>
        `;

        return commentEl;
    }

    async renderReplies(replies, parentId) {
        if (!replies) return '';
        
        const repliesArray = Object.keys(replies).map(key => ({
            id: key,
            ...replies[key]
        })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        let html = '';
        
        for (const reply of repliesArray) {
            const enhancedReply = await this.enhanceCommentUserData(reply);
            
            const isOwner = this.auth.currentUser && this.auth.currentUser.uid === enhancedReply.userId;
            const timestamp = enhancedReply.timestamp ? Utils.formatTimestamp(enhancedReply.timestamp) : 'غير معروف';
            const editedBadge = enhancedReply.edited ? '<span class="edited-badge">(تم التعديل)</span>' : '';
            
            html += `
                <div class="comment reply" id="reply-${enhancedReply.id}">
                    <div class="comment-header">
                        <div class="comment-user">
                            <img src="${enhancedReply.userAvatar}" alt="${enhancedReply.userName}" class="user-avatar-small"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(enhancedReply.userName)}&size=32'">
                            <span class="user-name chapter-card-text">${enhancedReply.userName}</span>
                        </div>
                        <div class="comment-date">${timestamp} ${editedBadge}</div>
                    </div>
                    <div class="comment-content">
                        ${enhancedReply.text}
                    </div>
                    ${isOwner ? `
                        <div class="comment-actions">
                            <button class="action-btn edit-reply" data-parent-id="${parentId}" data-id="${enhancedReply.id}">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button class="action-btn delete-btn delete-reply" data-parent-id="${parentId}" data-id="${enhancedReply.id}">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
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
            this.showDeleteCommentModal(commentId);
        } else if (target.classList.contains('delete-reply')) {
            this.showDeleteReplyModal(parentId, commentId);
        } else if (target.classList.contains('edit-comment')) {
            this.showEditCommentModal(commentId);
        } else if (target.classList.contains('edit-reply')) {
            this.showEditReplyModal(parentId, commentId);
        } else if (target.classList.contains('replies-toggle-btn')) {
            this.toggleReplies(commentId);
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

            const userData = await this.getUserData(user.uid);

            const newReply = {
                userId: user.uid,
                userName: userData.displayName,
                userAvatar: userData.avatar,
                text: replyText,
                timestamp: Date.now()
            };

            const replyRef = parentCommentRef.child('replies').push();
            await replyRef.set(newReply);
            
            input.value = '';
            this.toggleReplyForm(commentId, false);
            Utils.showMessage('تم إرسال الرد بنجاح.', 'success');

            // تحديث العداد بعد إضافة الرد
            this.updateRepliesToggle(commentId, 1);

            // إرسال إشعار لصاحب التعليق الأصلي
            if (parentComment.userId !== user.uid) {
                this.sendReplyNotification(parentComment.userId, commentId, replyRef.key, newReply);
            }

        } catch (error) {
            console.error('Error adding reply:', error);
            Utils.showMessage('حدث خطأ أثناء إرسال الرد.', 'error');
        }
    }

    showEditCommentModal(commentId) {
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لتعديل التعليق.', 'warning');
            return;
        }

        const commentRef = this.commentsRef.child(commentId);
        commentRef.once('value').then((snapshot) => {
            const comment = snapshot.val();
            if (comment && comment.userId === this.auth.currentUser.uid) {
                const commentData = {
                    id: commentId,
                    text: comment.text,
                    userName: comment.userName,
                    timestamp: comment.timestamp,
                    userId: comment.userId
                };
                
                if (this.chapterPage.mangaData) {
                    this.chapterPage.showEditModal('comment', commentData);
                } else {
                    Utils.showMessage('بيانات الصفحة غير جاهزة بعد. يرجى المحاولة مرة أخرى.', 'warning');
                }
            } else {
                Utils.showMessage('لا يمكنك تعديل تعليقات الآخرين.', 'warning');
            }
        });
    }

    showEditReplyModal(parentId, replyId) {
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لتعديل الرد.', 'warning');
            return;
        }

        const replyRef = this.commentsRef.child(parentId).child('replies').child(replyId);
        replyRef.once('value').then((snapshot) => {
            const reply = snapshot.val();
            if (reply && reply.userId === this.auth.currentUser.uid) {
                const replyData = {
                    id: replyId,
                    text: reply.text,
                    userName: reply.userName,
                    timestamp: reply.timestamp,
                    userId: reply.userId
                };
                
                this.chapterPage.showEditModal('reply', replyData, { id: parentId });
            } else {
                Utils.showMessage('لا يمكنك تعديل ردود الآخرين.', 'warning');
            }
        });
    }

    showDeleteCommentModal(commentId) {
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لحذف التعليق.', 'warning');
            return;
        }

        const commentRef = this.commentsRef.child(commentId);
        commentRef.once('value').then((snapshot) => {
            const comment = snapshot.val();
            if (comment && comment.userId === this.auth.currentUser.uid) {
                const commentData = {
                    id: commentId,
                    text: comment.text,
                    userName: comment.userName,
                    timestamp: comment.timestamp,
                    userId: comment.userId
                };
                
                this.chapterPage.showDeleteModal('comment', commentData);
            } else {
                Utils.showMessage('لا يمكنك حذف تعليقات الآخرين.', 'warning');
            }
        });
    }

    showDeleteReplyModal(parentId, replyId) {
        if (!this.auth.currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لحذف الرد.', 'warning');
            return;
        }

        const replyRef = this.commentsRef.child(parentId).child('replies').child(replyId);
        replyRef.once('value').then((snapshot) => {
            const reply = snapshot.val();
            if (reply && reply.userId === this.auth.currentUser.uid) {
                const replyData = {
                    id: replyId,
                    text: reply.text,
                    userName: reply.userName,
                    timestamp: reply.timestamp,
                    userId: reply.userId
                };
                
                this.chapterPage.showDeleteModal('reply', replyData, { id: parentId });
            } else {
                Utils.showMessage('لا يمكنك حذف ردود الآخرين.', 'warning');
            }
        });
    }

    updateRepliesToggle(commentId, change) {
        const toggleBtn = document.getElementById(`replies-btn-${commentId}`);
        if (toggleBtn) {
            let count = parseInt(toggleBtn.getAttribute('data-count')) + change;
            toggleBtn.setAttribute('data-count', count);
            
            const container = document.getElementById(`replies-container-${commentId}`);
            const isOpen = container && container.style.display === 'block';
            const toggleIcon = isOpen ? 'fa-chevron-up' : 'fa-chevron-down';
            const toggleText = isOpen ? 'إخفاء' : 'عرض';
            
            toggleBtn.innerHTML = `<i class="fas ${toggleIcon}"></i> ${toggleText} ${count} ${count === 1 ? 'رد' : 'ردود'}`;
            
            if (count <= 0) {
                toggleBtn.style.display = 'none';
                if (container) container.style.display = 'none';
            } else {
                toggleBtn.style.display = 'block';
            }
        }
    }

    toggleReplies(commentId) {
        const container = document.getElementById(`replies-container-${commentId}`);
        const toggleBtn = document.getElementById(`replies-btn-${commentId}`);
        if (container && toggleBtn) {
            const isHidden = container.style.display === 'none';
            container.style.display = isHidden ? 'block' : 'none';
            
            const count = parseInt(toggleBtn.getAttribute('data-count'));
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            }
            
            toggleBtn.innerHTML = `<i class="fas ${isHidden ? 'fa-chevron-up' : 'fa-chevron-down'}"></i> ${isHidden ? 'إخفاء' : 'عرض'} ${count} ${count === 1 ? 'رد' : 'ردود'}`;
            toggleBtn.classList.toggle('active', isHidden);
        }
    }

    async sendReplyNotification(parentCommentUserId, commentId, replyId, replyData) {
        try {
            const notificationRef = this.db.ref(`notifications/${parentCommentUserId}`).push();
            
            const userData = await this.getUserData(this.auth.currentUser.uid);
            
            const notification = {
                type: 'reply',
                senderId: this.auth.currentUser.uid,
                senderName: userData.displayName,
                mangaId: this.mangaId,
                chapterId: this.chapterNumber,
                commentId: commentId,
                replyId: replyId,
                text: `رد ${userData.displayName} على تعليقك: "${replyData.text.substring(0, 100)}${replyData.text.length > 100 ? '...' : ''}"`,
                timestamp: Date.now(),
                read: false
            };
            
            await notificationRef.set(notification);
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }
}