// js/chapter.js
import dbManager from './db.js';
import CommentsManager from './comments.js';

class ChapterPage {
    constructor() {
        this.mangaId = Utils.getQueryParam('manga');
        this.chapterNumber = Utils.getQueryParam('chapter');
        this.mangaData = null;
        this.chapterData = null;
        this.commentsManager = null;
        
        if (this.mangaId && this.chapterNumber) {
            this.init();
        } else {
            this.showError('معرف المانجا أو الفصل غير موجود في الرابط');
        }
    }
    
    init() {
        // يجب أن تكون Firebase مهيأة قبل استخدام هذا الملف
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            try {
                firebase.initializeApp(firebaseConfig);
            } catch (e) {
                console.error("Failed to initialize Firebase in ChapterPage:", e);
                this.showError('خطأ في تهيئة النظام');
                return;
            }
        }
        
        this.auth = firebase.auth();
        
        this.setupEventListeners();
        this.loadChapterData();
        Utils.loadTheme();
    }
    
    setupEventListeners() {
        // إعداد أزرار الدرج والثيم (مكرر من manga.js لضمان عملها في هذه الصفحة)
        this.setupDrawer();
        this.setupTheme();
    }
    
    setupDrawer() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
    }
    
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });
        
        // تحديث أيقونة الثيم عند التحميل
        const currentTheme = Utils.loadTheme();
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(currentTheme)}`;
        }
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
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : (currentTheme === 'light' ? 'blue' : 'dark');
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        Utils.saveTheme(theme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(theme)}`;
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    async loadChapterData() {
        const chapterContent = document.getElementById('chapterContent');
        if (!chapterContent) return;
        
        chapterContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري تحميل الفصل...</p></div>';
        
        try {
            // جلب بيانات المانجا
            const { success: mangaSuccess, data: mangaData, error: mangaError } = await dbManager.getManga(this.mangaId);
            if (!mangaSuccess || !mangaData) {
                throw new Error(mangaError || 'المانجا غير موجودة');
            }
            this.mangaData = mangaData;
            
            // جلب بيانات الفصل
            const chapterKey = `chapter_${this.chapterNumber}`;
            this.chapterData = this.mangaData.chapters?.[chapterKey];
            
            if (!this.chapterData) {
                throw new Error('الفصل غير موجود');
            }
            
            this.displayChapterData();
            
            // تهيئة مدير التعليقات بعد تحميل البيانات
            this.commentsManager = new CommentsManager(this.mangaId, this.chapterNumber);
            
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.showError('حدث خطأ في تحميل بيانات الفصل: ' + error.message);
        }
    }
    
    displayChapterData() {
        const chapterContent = document.getElementById('chapterContent');
        if (!chapterContent) return;
        
        const { prevChapter, nextChapter } = this.getAdjacentChapters();
        
        const chapterTitle = this.chapterData.title || `الفصل ${this.chapterNumber}`;
        
        chapterContent.innerHTML = `
            <div class="chapter-header">
                <h1 class="chapter-title">${this.mangaData.name} - ${chapterTitle}</h1>
                <div class="chapter-subtitle">
                    <span>عدد الصور: ${this.chapterData.images?.length || 0}</span>
                </div>
            </div>
            
            <div class="chapter-nav">
                ${prevChapter ? 
                    `<a href="chapter.html?manga=${this.mangaId}&chapter=${prevChapter}" class="btn btn-outline">
                        <i class="fas fa-arrow-right"></i>
                        الفصل السابق
                    </a>` : 
                    '<button class="btn btn-outline" disabled><i class="fas fa-arrow-right"></i> الفصل السابق</button>'
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
                    '<button class="btn btn-outline" disabled>الفصل التالي <i class="fas fa-arrow-left"></i></button>'
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
            
            <div class="chapter-nav">
                ${prevChapter ? 
                    `<a href="chapter.html?manga=${this.mangaId}&chapter=${prevChapter}" class="btn btn-outline">
                        <i class="fas fa-arrow-right"></i>
                        الفصل السابق
                    </a>` : 
                    '<button class="btn btn-outline" disabled><i class="fas fa-arrow-right"></i> الفصل السابق</button>'
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
                    '<button class="btn btn-outline" disabled>الفصل التالي <i class="fas fa-arrow-left"></i></button>'
                }
            </div>
        `;
    }
    
    getAdjacentChapters() {
        if (!this.mangaData.chapters) return { prevChapter: null, nextChapter: null };
        
        const chapters = Object.keys(this.mangaData.chapters)
            .map(key => parseFloat(key.replace('chapter_', '')))
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);
        
        const currentChapter = parseFloat(this.chapterNumber);
        const currentIndex = chapters.indexOf(currentChapter);
        
        return {
            prevChapter: currentIndex > 0 ? chapters[currentIndex - 1] : null,
            nextChapter: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null
        };
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

document.addEventListener('DOMContentLoaded', () => {
    new ChapterPage();
});
