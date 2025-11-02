// js/comments.js
import dbManager from './db.js';
import ratingsManager from './ratings.js';

class CommentsManager {
    constructor(mangaId, chapterId) {
        this.mangaId = mangaId;
        this.chapterId = chapterId;
        this.auth = firebase.auth();
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentForm = document.getElementById('commentForm');
        
        if (!this.mangaId || !this.chapterId) {
            console.error('CommentsManager: Missing mangaId or chapterId');
            return;
        }
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadComments();
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
        
        const user = this.auth.currentUser;
        if (!user) {
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
            const { success, error } = await dbManager.addComment(
                this.mangaId, 
                this.chapterId, 
                user.uid, 
                user.displayName || 'مستخدم', 
                commentText
            );
            
            if (success) {
                commentInput.value = '';
                Utils.showMessage('تم إضافة التعليق بنجاح.', 'success');
            } else {
                Utils.showMessage('حدث خطأ أثناء إضافة التعليق: ' + error, 'error');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            Utils.showMessage('حدث خطأ أثناء إضافة التعليق.', 'error');
        }
    }
    
    async loadComments() {
        if (!this.commentsContainer) return;
        
        this.commentsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل التعليقات...</p></div>';
        
        const { success, data: comments, error } = await dbManager.getComments(this.mangaId, this.chapterId);
        
        if (success) {
            this.renderComments(comments);
        } else {
            console.error('Error loading comments:', error);
            this.commentsContainer.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>حدث خطأ في تحميل التعليقات: ${error}</p></div>`;
        }
    }
    
    async renderComments(comments) {
        if (!this.commentsContainer) return;
        
        this.commentsContainer.innerHTML = '';
        
        if (!comments || comments.length === 0) {
            this.commentsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>لا توجد تعليقات بعد. كن أول من يعلق!</p></div>';
            return;
        }
        
        for (const comment of comments) {
            const commentElement = await this.createCommentElement(comment);
            this.commentsContainer.appendChild(commentElement);
        }
        
        // التمرير إلى تعليق محدد إذا كان هناك hash في الرابط
        const hash = Utils.getQueryParam('comment');
        if (hash) {
            const targetComment = document.getElementById(`comment-${hash}`);
            if (targetComment) {
                setTimeout(() => {
                    targetComment.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetComment.classList.add('highlight');
                }, 500);
            }
        }
    }
    
    async createCommentElement(comment) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment';
        commentEl.id = `comment-${comment.id}`;
        
        const user = this.auth.currentUser;
        const isOwner = user && user.uid === comment.userId;
        const isLiked = user ? await dbManager.isCommentLiked(this.mangaId, this.chapterId, comment.id, user.uid) : false;
        const timestamp = comment.timestamp ? Utils.formatTimestamp(comment.timestamp) : 'غير معروف';
        const displayName = comment.displayName || 'مستخدم';
        const avatarUrl = Utils.getAvatarUrl(displayName);
        
        commentEl.innerHTML = `
            <div class="comment-header">
                <div class="comment-user">
                    <img src="${avatarUrl}" alt="${displayName}" class="user-avatar-small">
                    <span class="user-name">${displayName}</span>
                </div>
                <div class="comment-date">${timestamp}</div>
            </div>
            <div class="comment-content">${comment.text}</div>
            <div class="comment-actions">
                <button class="action-btn like-comment ${isLiked ? 'liked' : ''}" data-id="${comment.id}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> إعجاب (${comment.likes || 0})
                </button>
                <button class="action-btn reply-comment" data-id="${comment.id}">
                    <i class="fas fa-reply"></i> رد
                </button>
                ${isOwner ? `
                    <button class="action-btn delete-comment" data-id="${comment.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                ` : ''}
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
            const user = this.auth.currentUser;
            const isOwner = user && user.uid === reply.userId;
            const timestamp = reply.timestamp ? Utils.formatTimestamp(reply.timestamp) : 'غير معروف';
            const displayName = reply.displayName || 'مستخدم';
            const avatarUrl = Utils.getAvatarUrl(displayName);
            
            html += `
                <div class="comment reply" id="reply-${parentId}-${reply.id}">
                    <div class="comment-header">
                        <div class="comment-user">
                            <img src="${avatarUrl}" alt="${displayName}" class="user-avatar-small">
                            <span class="user-name">${displayName}</span>
                        </div>
                        <div class="comment-date">${timestamp}</div>
                    </div>
                    <div class="comment-content">
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
        } else if (target.classList.contains('like-comment')) {
            this.handleLikeComment(commentId, target);
        } else if (target.classList.contains('delete-comment')) {
            // منطق حذف التعليق
        } else if (target.classList.contains('delete-reply')) {
            // منطق حذف الرد
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
        const user = this.auth.currentUser;
        if (!user) {
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
            const { success, replyData, error } = await dbManager.addReply(
                this.mangaId, 
                this.chapterId, 
                commentId, 
                user.uid, 
                user.displayName || 'مستخدم', 
                replyText
            );
            
            if (success) {
                input.value = '';
                this.toggleReplyForm(commentId, false);
                Utils.showMessage('تم إرسال الرد بنجاح.', 'success');
                
                // إعادة تحميل التعليقات لعرض الرد الجديد
                this.loadComments();
                
                // إرسال إشعار لصاحب التعليق الأصلي
                // يجب جلب بيانات التعليق الأصلي لمعرفة صاحبه
                const { data: comment } = await dbManager.getComment(this.mangaId, this.chapterId, commentId);
                if (comment && comment.userId !== user.uid) {
                    const chapterLink = `chapter.html?manga=${this.mangaId}&chapter=${this.chapterId}#comment-${commentId}`;
                    await dbManager.notifyCommentReply(comment.userId, replyData, chapterLink);
                }
                
            } else {
                Utils.showMessage('حدث خطأ أثناء إرسال الرد: ' + error, 'error');
            }
        } catch (error) {
            console.error('Error adding reply:', error);
            Utils.showMessage('حدث خطأ أثناء إرسال الرد.', 'error');
        }
    }
    
    async handleLikeComment(commentId, button) {
        const user = this.auth.currentUser;
        if (!user) {
            Utils.showMessage('يجب تسجيل الدخول للإعجاب.', 'warning');
            return;
        }
        
        const { success, liked, error } = await ratingsManager.toggleCommentLike(this.mangaId, this.chapterId, commentId);
        
        if (success) {
            // تحديث الواجهة
            const currentLikes = parseInt(button.textContent.match(/\d+/)[0] || 0);
            const newLikes = liked ? currentLikes + 1 : currentLikes - 1;
            
            button.classList.toggle('liked', liked);
            button.querySelector('i').className = liked ? 'fas fa-heart' : 'far fa-heart';
            button.innerHTML = `<i class="${liked ? 'fas' : 'far'} fa-heart"></i> إعجاب (${newLikes})`;
        } else {
            Utils.showMessage('خطأ في الإعجاب: ' + error, 'error');
        }
    }
}

// تصدير الكلاس لاستخدامه في chapter.js
export default CommentsManager;
