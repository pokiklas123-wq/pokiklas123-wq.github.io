// إدارة صفحة الفصل
class ChapterPage {
    constructor() {
        this.mangaId = this.getURLParam('manga');
        this.chapterNumber = this.getURLParam('chapter');
        this.mangaData = null;
        this.chapterData = null;
        this.comments = [];
        
        this.init();
    }
    
    init() {
        if (this.mangaId && this.chapterNumber) {
            this.loadChapterData();
            this.setupEventListeners();
        } else {
            this.showError('معرف المانجا أو الفصل غير موجود في الرابط');
        }
        
        Utils.loadTheme();
    }
    
    getURLParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    setupEventListeners() {
        // فتح وإغلاق الدراور
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) {
            drawerToggle.addEventListener('click', () => this.openDrawer());
        }
        
        if (drawerClose) {
            drawerClose.addEventListener('click', () => this.closeDrawer());
        }
        
        if (drawerOverlay) {
            drawerOverlay.addEventListener('click', () => this.closeDrawer());
        }
    }
    
    openDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        drawer.classList.add('open');
        drawerOverlay.classList.add('open');
    }
    
    closeDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        drawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }
    
    async loadChapterData() {
        try {
            // جلب بيانات المانجا
            const mangaResult = await dbManager.getManga(this.mangaId);
            
            if (!mangaResult.success || !mangaResult.data) {
                throw new Error('المانجا غير موجودة');
            }
            
            this.mangaData = mangaResult.data;
            
            // جلب بيانات الفصل
            const chapterKey = `chapter_${this.chapterNumber}`;
            this.chapterData = this.mangaData.chapters?.[chapterKey];
            
            if (!this.chapterData) {
                throw new Error('الفصل غير موجود');
            }
            
            this.displayChapterData();
            this.loadComments();
            
        } catch (error) {
            this.showError('حدث خطأ في تحميل بيانات الفصل: ' + error.message);
        }
    }
    
    displayChapterData() {
        const chapterContent = document.getElementById('chapterContent');
        
        if (!this.chapterData) {
            chapterContent.innerHTML = '<div class="empty-state"><p>الفصل غير موجود</p></div>';
            return;
        }
        
        // الحصول على الفصول المجاورة
        const { prevChapter, nextChapter } = this.getAdjacentChapters();
        
        chapterContent.innerHTML = `
            <div class="chapter-header">
                <h1 class="chapter-title">${this.mangaData.name} - الفصل ${this.chapterNumber}</h1>
                <div class="chapter-meta">
                    <span>عدد الصور: ${this.chapterData.images?.length || 0}</span>
                </div>
            </div>
            
            <div class="chapter-nav">
                ${prevChapter ? 
                    `<a href="chapter.html?manga=${this.mangaId}&chapter=${prevChapter}" class="btn btn-outline">
                        <i class="fas fa-arrow-right"></i>
                        الفصل السابق
                    </a>` : 
                    '<div></div>'
                }
                
                <a href="manga.html?id=${this.mangaId}" class="btn btn-outline">
                    <i class="fas fa-list"></i>
                    جميع الفصول
                </a>
                
                ${nextChapter ? 
                    `<a href="chapter.html?manga=${this.mangaId}&chapter=${nextChapter}" class="btn btn-outline">
                        الفصل التالي
                        <i class="fas fa-arrow-left"></i>
                    </a>` : 
                    '<div></div>'
                }
            </div>
            
            <div class="chapter-images" id="chapterImages">
                ${this.chapterData.images ? 
                    this.chapterData.images.map((img, index) => 
                        `<img src="${img}" alt="صفحة ${index + 1}" class="chapter-image" loading="lazy">`
                    ).join('') : 
                    '<div class="empty-state"><p>لا توجد صور متاحة لهذا الفصل</p></div>'
                }
            </div>
            
            <div class="comments-section">
                <h3 class="comments-title">التعليقات</h3>
                
                <div class="comment-form" id="commentForm">
                    <textarea class="comment-input" placeholder="اكتب تعليقك هنا..." id="commentText"></textarea>
                    <button class="btn" id="submitComment">إرسال التعليق</button>
                </div>
                
                <div class="comments-list" id="commentsList">
                    <div class="loading">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;
        
        // إضافة event listeners لنموذج التعليق
        this.setupCommentForm();
    }
    
    getAdjacentChapters() {
        if (!this.mangaData.chapters) return { prevChapter: null, nextChapter: null };
        
        const chapters = Object.keys(this.mangaData.chapters)
            .map(key => parseInt(key.replace('chapter_', '')))
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);
        
        const currentChapter = parseInt(this.chapterNumber);
        const currentIndex = chapters.indexOf(currentChapter);
        
        return {
            prevChapter: currentIndex > 0 ? chapters[currentIndex - 1] : null,
            nextChapter: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null
        };
    }
    
    setupCommentForm() {
        const submitBtn = document.getElementById('submitComment');
        const commentText = document.getElementById('commentText');
        const commentForm = document.getElementById('commentForm');
        
        if (!submitBtn || !commentText) return;
        
        // إخفاء نموذج التعليق إذا لم يكن المستخدم مسجلاً
        if (!firebase.auth().currentUser) {
            commentForm.innerHTML = `
                <p class="text-center">يجب <a href="auth.html">تسجيل الدخول</a> لإضافة تعليق</p>
            `;
            return;
        }
        
        submitBtn.addEventListener('click', () => {
            this.submitComment(commentText.value);
        });
        
        commentText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitComment(commentText.value);
            }
        });
    }
    
    async submitComment(text) {
        if (!text.trim()) {
            Utils.showMessage('يرجى كتابة تعليق', 'warning');
            return;
        }
        
        if (!firebase.auth().currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لإضافة تعليق', 'warning');
            return;
        }
        
        try {
            const user = firebase.auth().currentUser;
            const commentId = Date.now().toString();
            const commentRef = firebase.database().ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}`);
            
            await commentRef.set({
                id: commentId,
                userId: user.uid,
                userDisplayName: user.displayName || 'مستخدم',
                userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'مستخدم')}&background=4ECDC4&color=fff&size=150`,
                text: text.trim(),
                timestamp: Date.now(),
                replies: {}
            });
            
            // مسح حقل النص
            document.getElementById('commentText').value = '';
            
            Utils.showMessage('تم إضافة التعليق بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            this.loadComments();
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في إضافة التعليق: ' + error.message, 'error');
        }
    }
    
    async loadComments() {
        try {
            const commentsRef = firebase.database().ref(`comments/${this.mangaId}/${this.chapterNumber}`);
            const snapshot = await commentsRef.once('value');
            const commentsData = snapshot.val();
            
            this.comments = [];
            
            if (commentsData) {
                Object.keys(commentsData).forEach(key => {
                    this.comments.push(commentsData[key]);
                });
                
                // ترتيب التعليقات من الأحدث إلى الأقدم
                this.comments.sort((a, b) => b.timestamp - a.timestamp);
            }
            
            this.displayComments();
            
        } catch (error) {
            console.error('Error loading comments:', error);
            this.displayCommentsError();
        }
    }
    
    displayComments() {
        const commentsList = document.getElementById('commentsList');
        
        if (!commentsList) return;
        
        if (this.comments.length === 0) {
            commentsList.innerHTML = '<div class="empty-state"><p>لا توجد تعليقات بعد</p></div>';
            return;
        }
        
        commentsList.innerHTML = this.comments.map(comment => `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-user">
                        <img src="${comment.userAvatar}" alt="${comment.userDisplayName}" class="user-avatar-small">
                        <span class="user-name">${comment.userDisplayName}</span>
                    </div>
                    <div class="comment-date">${Utils.formatTimestamp(comment.timestamp)}</div>
                </div>
                <div class="comment-content">${comment.text}</div>
                <div class="comment-actions">
                    <button class="action-btn reply-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-reply"></i>
                        رد
                    </button>
                    ${this.canEditComment(comment) ? `
                        <button class="action-btn edit-btn" data-comment-id="${comment.id}">
                            <i class="fas fa-edit"></i>
                            تعديل
                        </button>
                        <button class="action-btn delete-btn" data-comment-id="${comment.id}">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    ` : ''}
                </div>
                
                <div class="reply-form" id="replyForm-${comment.id}">
                    <textarea class="comment-input" placeholder="اكتب ردك هنا..." id="replyText-${comment.id}"></textarea>
                    <button class="btn submit-reply" data-comment-id="${comment.id}">إرسال الرد</button>
                </div>
                
                ${Object.keys(comment.replies || {}).length > 0 ? `
                    <button class="show-replies-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-chevron-down"></i>
                        إظهار الردود (${Object.keys(comment.replies || {}).length})
                    </button>
                    <div class="replies" id="replies-${comment.id}" style="display: none;">
                        ${Object.keys(comment.replies).map(replyId => {
                            const reply = comment.replies[replyId];
                            return `
                                <div class="comment">
                                    <div class="comment-header">
                                        <div class="comment-user">
                                            <img src="${reply.userAvatar}" alt="${reply.userDisplayName}" class="user-avatar-small">
                                            <span class="user-name">${reply.userDisplayName}</span>
                                        </div>
                                        <div class="comment-date">${Utils.formatTimestamp(reply.timestamp)}</div>
                                    </div>
                                    <div class="comment-content">${reply.text}</div>
                                    ${this.canEditComment(reply) ? `
                                        <div class="comment-actions">
                                            <button class="action-btn edit-reply-btn" data-comment-id="${comment.id}" data-reply-id="${replyId}">
                                                <i class="fas fa-edit"></i>
                                                تعديل
                                            </button>
                                            <button class="action-btn delete-reply-btn" data-comment-id="${comment.id}" data-reply-id="${replyId}">
                                                <i class="fas fa-trash"></i>
                                                حذف
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // إضافة event listeners للتعليقات
        this.setupCommentsInteractions();
    }
    
    setupCommentsInteractions() {
        // أزرار الرد
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                const replyForm = document.getElementById(`replyForm-${commentId}`);
                replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
            });
        });
        
        // إرسال الرد
        document.querySelectorAll('.submit-reply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                const replyText = document.getElementById(`replyText-${commentId}`).value;
                this.submitReply(commentId, replyText);
            });
        });
        
        // إظهار/إخفاء الردود
        document.querySelectorAll('.show-replies-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                const replies = document.getElementById(`replies-${commentId}`);
                const isVisible = replies.style.display !== 'none';
                
                replies.style.display = isVisible ? 'none' : 'block';
                e.target.innerHTML = isVisible ? 
                    `<i class="fas fa-chevron-down"></i> إظهار الردود (${Object.keys(this.comments.find(c => c.id === commentId).replies || {}).length})` :
                    `<i class="fas fa-chevron-up"></i> إخفاء الردود`;
            });
        });
        
        // حذف التعليق
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-comment-id');
                this.deleteComment(commentId);
            });
        });
    }
    
    canEditComment(comment) {
        const user = firebase.auth().currentUser;
        return user && (user.uid === comment.userId || user.uid === 'YOUR_ADMIN_UID'); // استبدل YOUR_ADMIN_UID بمعرفك
    }
    
    async submitReply(commentId, text) {
        if (!text.trim()) {
            Utils.showMessage('يرجى كتابة رد', 'warning');
            return;
        }
        
        if (!firebase.auth().currentUser) {
            Utils.showMessage('يجب تسجيل الدخول لإضافة رد', 'warning');
            return;
        }
        
        try {
            const user = firebase.auth().currentUser;
            const replyId = Date.now().toString();
            const replyRef = firebase.database().ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}/replies/${replyId}`);
            
            await replyRef.set({
                id: replyId,
                userId: user.uid,
                userDisplayName: user.displayName || 'مستخدم',
                userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'مستخدم')}&background=4ECDC4&color=fff&size=150`,
                text: text.trim(),
                timestamp: Date.now()
            });
            
            // مسح حقل النص وإخفاء النموذج
            document.getElementById(`replyText-${commentId}`).value = '';
            document.getElementById(`replyForm-${commentId}`).style.display = 'none';
            
            Utils.showMessage('تم إضافة الرد بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            this.loadComments();
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في إضافة الرد: ' + error.message, 'error');
        }
    }
    
    async deleteComment(commentId) {
        if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
            return;
        }
        
        try {
            const commentRef = firebase.database().ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}`);
            await commentRef.remove();
            
            Utils.showMessage('تم حذف التعليق بنجاح', 'success');
            
            // إعادة تحميل التعليقات
            this.loadComments();
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في حذف التعليق: ' + error.message, 'error');
        }
    }
    
    displayCommentsError() {
        const commentsList = document.getElementById('commentsList');
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل التعليقات</p>
                    <button class="btn mt-2" onclick="chapterPage.loadComments()">إعادة المحاولة</button>
                </div>
            `;
        }
    }
    
    showError(message) {
        const chapterContent = document.getElementById('chapterContent');
        chapterContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <a href="index.html" class="btn mt-2">العودة للصفحة الرئيسية</a>
            </div>
        `;
    }
}

// تهيئة صفحة الفصل
let chapterPage;

document.addEventListener('DOMContentLoaded', () => {
    chapterPage = new ChapterPage();
});