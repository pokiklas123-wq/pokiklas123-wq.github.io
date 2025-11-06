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
                
                // في constructor أو حيث تنشئ CommentsManager

window.commentsManager = this.commentsManager; // هذا السطر الجديد
            }
        }, 2000);
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
            deleteTargetInfo.innerHTML = `
                <i class="fas fa-book"></i>
                <strong>من مانجا "${this.mangaData?.name || 'غير معروف'}"</strong>
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
                alert('يجب تسجيل الدخول لحذف التعليق');
                return;
            }
            
            // التحقق من أن المستخدم هو صاحب التعليق
            if (item.userId !== user.uid) {
                alert('لا يمكنك حذف تعليقات الآخرين');
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
            
        } catch (error) {
            console.error('Error deleting:', error);
            alert('حدث خطأ أثناء الحذف');
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