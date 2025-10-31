// js/chapter.js
class ChapterPage {
    constructor() {
        this.mangaId = this.getURLParam('manga');
        this.chapterNumber = this.getURLParam('chapter');
        this.mangaData = null;
        this.chapterData = null;
        
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
        Utils.loadTheme();
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
    }
    
    async loadChapterData() {
        try {
            const mangaSnapshot = await this.db.ref('manga_list/' + this.mangaId).once('value');
            const mangaData = mangaSnapshot.val();
            
            if (!mangaData) {
                throw new Error('المانجا غير موجودة');
            }
            
            this.mangaData = mangaData;
            
            const chapterKey = `chapter_${this.chapterNumber}`;
            this.chapterData = this.mangaData.chapters?.[chapterKey];
            
            if (!this.chapterData) {
                throw new Error('الفصل غير موجود');
            }
            
            this.displayChapterData();
            
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.showError('حدث خطأ في تحميل بيانات الفصل');
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
                    <span>${this.chapterData.date || ''}</span>
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