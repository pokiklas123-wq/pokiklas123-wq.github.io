// js/chapter.js
class ChapterPage {
    constructor() {
        this.mangaId = this.getURLParam('manga');
        this.chapterNumber = this.getURLParam('chapter');
        this.mangaData = null;
        this.chapterData = null;
        
        console.log('ChapterPage params:', { mangaId: this.mangaId, chapterNumber: this.chapterNumber });
        
        if (this.mangaId && this.chapterNumber) {
            this.init();
        } else {
            this.showError('معرف المانجا أو الفصل غير موجود في الرابط');
        }
    }
    
    init() {
        this.initializeFirebase();
        this.setupEventListeners();
        this.loadChapterData();
    }
    
    initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.auth = firebase.auth();
            this.db = firebase.database();
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }
    
    getURLParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    setupEventListeners() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
        
        // تهيئة نظام التعليقات بعد تحميل البيانات
        setTimeout(() => {
            if (typeof CommentsManager !== 'undefined') {
                this.commentsManager = new CommentsManager(this);
                window.commentsManager = this.commentsManager;
            }
        }, 2000);
    }
    
    // دالة جديدة لعرض نافذة التعديل
    showEditModal(type, item, parentComment = null) {
        // إنشاء نافذة التعديل ديناميكياً إذا لم تكن موجودة
        let editModal = document.getElementById('editModal');
        if (!editModal) {
            editModal = this.createEditModal();
        }
        
        const editModalTitle = document.getElementById('editModalTitle');
        const editModalTextarea = document.getElementById('editModalTextarea');
        const editModalInfo = document.getElementById('editModalInfo');
        const confirmEdit = document.getElementById('confirmEdit');
        const cancelEdit = document.getElementById('cancelEdit');
        const closeEditModal = document.getElementById('closeEditModal');
        
        const isReply = type === 'reply';
        const userName = this.truncateText(item.userName || 'مستخدم', 15);
        
        if (isReply) {
            editModalTitle.textContent = 'تعديل الرد';
            editModalInfo.innerHTML = `
                <i class="fas fa-user"></i>
                <strong>رد "${userName}"</strong>
            `;
        } else {
            editModalTitle.textContent = 'تعديل التعليق';
            // استخدام اسم المانجا من البيانات المحملة أو الحصول عليه من جديد
            const mangaName = this.getMangaName();
            editModalInfo.innerHTML = `
                <i class="fas fa-book"></i>
                <strong>على مانجا "${mangaName}"</strong>
            `;
        }
        
        // تعيين النص الحالي في textarea
        editModalTextarea.value = item.text;
        
        // إزالة المستمعين السابقين
        confirmEdit.replaceWith(confirmEdit.cloneNode(true));
        cancelEdit.replaceWith(cancelEdit.cloneNode(true));
        closeEditModal.replaceWith(closeEditModal.cloneNode(true));
        
        // إضافة مستمعين جدد
        document.getElementById('confirmEdit').addEventListener('click', () => {
            this.executeEdit(type, item, parentComment, editModalTextarea.value);
        });
        
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.hideEditModal();
        });
        
        document.getElementById('closeEditModal').addEventListener('click', () => {
            this.hideEditModal();
        });
        
        // إغلاق النافذة عند النقر خارج المحتوى
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                this.hideEditModal();
            }
        });
        
        editModal.classList.remove('hidden');
        editModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        // التركيز على textarea
        setTimeout(() => {
            editModalTextarea.focus();
            editModalTextarea.select();
        }, 300);
    }

    // دالة مساعدة للحصول على اسم المانجا
    getMangaName() {
        if (this.mangaData && this.mangaData.name) {
            return this.mangaData.name;
        }
        
        // إذا لم تكن البيانات محملة، نحاول الحصول عليها من localStorage أو من العنوان
        const pageTitle = document.querySelector('.chapter-title');
        if (pageTitle) {
            const titleText = pageTitle.textContent;
            const parts = titleText.split(' - الفصل ');
            if (parts.length > 0 && parts[0] !== 'undefined') {
                return parts[0];
            }
        }
        
        return 'غير معروف';
    }
    
    createEditModal() {
        const modalHTML = `
            <div id="editModal" class="edit-modal hidden">
                <div class="edit-modal-content">
                    <div class="edit-modal-header">
                        <h3 id="editModalTitle">تعديل التعليق</h3>
                        <button class="edit-modal-close" id="closeEditModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="edit-modal-body">
                        <textarea id="editModalTextarea" class="edit-modal-textarea" placeholder="اكتب النص المعدل هنا..." rows="4"></textarea>
                        <div class="edit-info">
                            <div id="editModalInfo"></div>
                        </div>
                    </div>
                    <div class="edit-modal-actions">
                        <button id="confirmEdit" class="btn btn-primary">حفظ التعديلات</button>
                        <button id="cancelEdit" class="btn btn-outline">إلغاء</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // إضافة CSS للنافذة الجديدة
        this.addEditModalStyles();
        
        return document.getElementById('editModal');
    }
    
    addEditModalStyles() {
        if (document.getElementById('editModalStyles')) return;
        
        const styles = `
            <style id="editModalStyles">
                .edit-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1001;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(5px);
                }

                .edit-modal.open {
                    opacity: 1;
                    visibility: visible;
                }

                .edit-modal-content {
                    background: var(--card-bg);
                    border-radius: var(--border-radius);
                    width: 90%;
                    max-width: 500px;
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow);
                    transform: translateY(-20px);
                    transition: transform 0.3s ease;
                }

                .edit-modal.open .edit-modal-content {
                    transform: translateY(0);
                }

                .edit-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }

                .edit-modal-header h3 {
                    margin: 0;
                    color: var(--text-color);
                    font-size: 1.25rem;
                }

                .edit-modal-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    font-size: 1.25rem;
                    padding: 0.25rem;
                    border-radius: 4px;
                    transition: var(--transition);
                }

                .edit-modal-close:hover {
                    background: var(--hover-color);
                    color: var(--text-color);
                }

                .edit-modal-body {
                    padding: 1.5rem;
                }

                .edit-modal-textarea {
                    width: 100%;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    background: var(--bg-color);
                    color: var(--text-color);
                    resize: vertical;
                    min-height: 120px;
                    font-family: inherit;
                    margin-bottom: 1rem;
                }

                .edit-modal-textarea:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
                }

                .edit-info {
                    background: var(--bg-color);
                    padding: 1rem;
                    border-radius: var(--border-radius);
                    border: 1px solid var(--border-color);
                    font-size: 0.9rem;
                    color: var(--text-muted);
                }

                .edit-modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--border-color);
                }

                @media (max-width: 768px) {
                    .edit-modal-content {
                        width: 95%;
                        margin: 1rem;
                    }
                    .edit-modal-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    hideEditModal() {
        const editModal = document.getElementById('editModal');
        if (editModal) {
            editModal.classList.remove('open');
            editModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    async executeEdit(type, item, parentComment, newText) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                Utils.showMessage('يجب تسجيل الدخول لتعديل التعليق.', 'warning');
                return;
            }
            
            // التحقق من أن المستخدم هو صاحب التعليق
            if (item.userId !== user.uid) {
                Utils.showMessage('لا يمكنك تعديل تعليقات الآخرين.', 'warning');
                this.hideEditModal();
                return;
            }
            
            if (!newText.trim()) {
                Utils.showMessage('يرجى كتابة نص للتعليق.', 'warning');
                return;
            }
            
            if (type === 'comment') {
                await this.updateComment(item.id, newText.trim());
            } else if (type === 'reply') {
                await this.updateReply(parentComment.id, item.id, newText.trim());
            }
            
            this.hideEditModal();
            
            // إعادة تحميل التعليقات
            if (this.commentsManager) {
                this.commentsManager.loadComments();
            }
            
            Utils.showMessage('تم تعديل التعليق بنجاح.', 'success');
            
        } catch (error) {
            console.error('Error editing:', error);
            Utils.showMessage('حدث خطأ أثناء التعديل.', 'error');
        }
    }
    
    async updateComment(commentId, newText) {
        const commentRef = this.db.ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}`);
        await commentRef.update({
            text: newText,
            edited: true,
            editTimestamp: Date.now()
        });
    }
    
    async updateReply(commentId, replyId, newText) {
        const replyRef = this.db.ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}/replies/${replyId}`);
        await replyRef.update({
            text: newText,
            edited: true,
            editTimestamp: Date.now()
        });
    }
    
    showDeleteModal(type, item, parentComment = null) {
        const deleteModal = document.getElementById('deleteModal');
        const deleteModalTitle = document.getElementById('deleteModalTitle');
        const deleteModalMessage = document.getElementById('deleteModalMessage');
        const deleteTargetInfo = document.getElementById('deleteTargetInfo');
        const deleteTimeInfo = document.getElementById('deleteTimeInfo');
        const confirmDelete = document.getElementById('confirmDelete');
        const cancelDelete = document.getElementById('cancelDelete');
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        
        const isReply = type === 'reply';
        const itemText = this.truncateText(item.text, 50);
        const userName = this.truncateText(item.userName || 'مستخدم', 15);
        const timeAgo = item.timestamp ? this.getTimeAgo(item.timestamp) : 'وقت غير معروف';
        
        if (isReply) {
            deleteModalTitle.textContent = 'حذف الرد';
            deleteModalMessage.textContent = `هل تريد حذف الرد "${itemText}"`;
            deleteTargetInfo.innerHTML = `
                <i class="fas fa-user"></i>
                <strong>على "${userName}"</strong>
            `;
        } else {
            deleteModalTitle.textContent = 'حذف التعليق';
            deleteModalMessage.textContent = `هل تريد حذف التعليق "${itemText}"`;
            // استخدام اسم المانجا من البيانات المحملة
            const mangaName = this.getMangaName();
            deleteTargetInfo.innerHTML = `
                <i class="fas fa-book"></i>
                <strong>من مانجا "${mangaName}"</strong>
            `;
        }
        
        deleteTimeInfo.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>تم ${isReply ? 'الرد' : 'الإرسال'} منذ ${timeAgo}</span>
        `;
        
        // إزالة المستمعين السابقين
        confirmDelete.replaceWith(confirmDelete.cloneNode(true));
        cancelDelete.replaceWith(cancelDelete.cloneNode(true));
        closeDeleteModal.replaceWith(closeDeleteModal.cloneNode(true));
        
        // إضافة مستمعين جدد
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.executeDelete(type, item, parentComment);
        });
        
        document.getElementById('cancelDelete').addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        document.getElementById('closeDeleteModal').addEventListener('click', () => {
            this.hideDeleteModal();
        });
        
        // إغلاق النافذة عند النقر خارج المحتوى
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                this.hideDeleteModal();
            }
        });
        
        deleteModal.classList.remove('hidden');
        deleteModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    
    hideDeleteModal() {
        const deleteModal = document.getElementById('deleteModal');
        deleteModal.classList.remove('open');
        deleteModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    async executeDelete(type, item, parentComment = null) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                Utils.showMessage('يجب تسجيل الدخول لحذف التعليق.', 'warning');
                return;
            }
            
            // التحقق من أن المستخدم هو صاحب التعليق
            if (item.userId !== user.uid) {
                Utils.showMessage('لا يمكنك حذف تعليقات الآخرين.', 'warning');
                this.hideDeleteModal();
                return;
            }
            
            if (type === 'comment') {
                await this.deleteComment(item.id);
            } else if (type === 'reply') {
                await this.deleteReply(parentComment.id, item.id);
            }
            
            this.hideDeleteModal();
            
            // إعادة تحميل التعليقات
            if (this.commentsManager) {
                this.commentsManager.loadComments();
            }
            
            Utils.showMessage('تم الحذف بنجاح.', 'success');
            
        } catch (error) {
            console.error('Error deleting:', error);
            Utils.showMessage('حدث خطأ أثناء الحذف.', 'error');
        }
    }
    
    async deleteComment(commentId) {
        const commentRef = this.db.ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}`);
        await commentRef.remove();
    }
    
    async deleteReply(commentId, replyId) {
        const replyRef = this.db.ref(`comments/${this.mangaId}/${this.chapterNumber}/${commentId}/replies/${replyId}`);
        await replyRef.remove();
    }
    
    truncateText(text, maxLength) {
        if (!text) return '...';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    getTimeAgo(timestamp) {
        const now = new Date().getTime();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'لحظات';
        if (minutes < 60) return `${minutes} دقيقة`;
        if (hours < 24) return `${hours} ساعة`;
        if (days < 7) return `${days} يوم`;
        if (days < 30) return `${Math.floor(days / 7)} أسبوع`;
        return `${Math.floor(days / 30)} شهر`;
    }
    
    async loadChapterData() {
        try {
            console.log('Loading chapter data for:', this.mangaId, this.chapterNumber);
            
            const mangaSnapshot = await this.db.ref('manga_list/' + this.mangaId).once('value');
            const mangaData = mangaSnapshot.val();
            
            if (!mangaData) {
                throw new Error('المانجا غير موجودة');
            }
            
            this.mangaData = mangaData;
            this.mangaData.id = this.mangaId;
            
            const chapterKey = `chapter_${this.chapterNumber}`;
            console.log('Looking for chapter key:', chapterKey);
            console.log('Available chapters:', Object.keys(mangaData.chapters || {}));
            
            this.chapterData = this.mangaData.chapters?.[chapterKey];
            
            if (!this.chapterData) {
                throw new Error('الفصل غير موجود');
            }
            
            this.displayChapterData();
            
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.showError('حدث خطأ في تحميل بيانات الفصل: ' + error.message);
        }
    }
    
    displayChapterData() {
        const chapterContent = document.getElementById('chapterContent');
        
        if (!this.chapterData) {
            chapterContent.innerHTML = '<div class="empty-state"><p>الفصل غير موجود</p></div>';
            return;
        }
        
        const { prevChapter, nextChapter } = this.getAdjacentChapters();
        
        // التأكد من أن mangaData.name موجود
        const mangaName = this.mangaData && this.mangaData.name ? this.mangaData.name : 'مانجا غير معروفة';
        
        chapterContent.innerHTML = `
            <div class="chapter-header">
                <h1 class="chapter-title">${mangaName}</h1>
               
                
                 
               <h2 class="chapter-card-title">
                    الفصل ${this.chapterNumber || 0}
                    </h2>
                    
                    
                <div class="chapter-meta">
    <div class="chapter-card">
        <h3 class="chapter-card-title">الوصف</h3>
        
        <p class="chapter-card-text">
            ${this.chapterData.chapter_description || 'لا يوجد وصف متاح.'}
        </p>
        
        <h3 class="chapter-card-title">  تم النشر: ${Utils.formatTimestamp(this.mangaData.updatedAt) || 'لا يوجد وقت متاح.'}</h3>
      
    </div>
</div>

            </div>
            
        
            
            <div class="chapter-images" id="chapterImages">
                ${this.chapterData.images ? 
                    this.chapterData.images.map((img, index) => 
                        `<img src="${img}" alt="صفحة ${index + 1}" class="chapter-image" loading="lazy">`
                    ).join('') : 
                    '<div class="empty-state"><p>لا توجد صور متاحة لهذا الفصل</p></div>'
                }
                
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
            
            <!-- الدعم -->
            
            <div class="chapter-meta">
    <div class="chapter-card">
        <h3 class="chapter-card-title">دعم العاملين علا الفصل 🌟🌟</h3>
        
        <a class="chapter-card-text" href="financial_support.html?id=${this.mangaData.name}>
            ${this.mangaData.name || 'لم يتم تضمين الرابط.'}
        </a>
        
        <h3 class="chapter-card-title">توجه إلى رابط الدعم</h3>
      
    </div>
</div>
            
            
        `;
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
    
    openDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.classList.add('open');
        if (drawerOverlay) drawerOverlay.classList.add('open');
    }
    
    closeDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (drawerOverlay) drawerOverlay.classList.remove('open');
    }
    
    showError(message) {
        const chapterContent = document.getElementById('chapterContent');
        if (chapterContent) {
            chapterContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <a href="index.html" class="btn mt-2">العودة للصفحة الرئيسية</a>
                </div>
            `;
        }
    }
}

let chapterPage;

document.addEventListener('DOMContentLoaded', () => {
    chapterPage = new ChapterPage();
});