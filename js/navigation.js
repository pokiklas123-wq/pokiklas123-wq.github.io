class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
    }

    setupEventListeners() {
        // العودة للصفحة الرئيسية
        document.getElementById('backToHome').addEventListener('click', () => {
            this.goBack();
        });

        // العودة لصفحة تفاصيل المانجا
        document.getElementById('backToManga').addEventListener('click', () => {
            this.goBack();
        });

        // التنقل بين التصنيفات
        document.querySelectorAll('.categories-list li').forEach(item => {
            item.addEventListener('click', () => {
                const sortType = item.dataset.sort;
                this.sortManga(sortType);
                ui.toggleDrawer(false);
            });
        });
    }

    setupBrowserBackButton() {
        // التعامل مع زر الرجوع في المتصفح
        window.addEventListener('popstate', (event) => {
            if (this.history.length > 1) {
                this.goBack();
            } else {
                this.showExitConfirmation();
            }
        });

        // منع الخروج المباشر
        this.preventAccidentalExit();
    }

    preventAccidentalExit() {
        window.addEventListener('beforeunload', (event) => {
            if (this.history.length > 1) {
                event.preventDefault();
                event.returnValue = 'هل تريد حقاً مغادرة التطبيق؟ قد تفقد التقدم غير المحفوظ.';
                return event.returnValue;
            }
        });
    }

    showExitConfirmation() {
        if (confirm('هل تريد مغادرة التطبيق؟')) {
            window.close();
        } else {
            // إعادة إضافة الحالة الحالية للتاريخ
            if (this.currentState) {
                window.history.pushState(this.currentState, '', window.location.href);
            }
        }
    }

    navigateTo(pageId, data = {}) {
        const state = {
            page: pageId,
            data: data,
            timestamp: Date.now()
        };

        // إضافة للحالة الحالية
        this.currentState = state;
        this.history.push(state);

        // تحديث عنوان URL وإضافة حالة جديدة للتاريخ
        const url = this.generateURL(state);
        window.history.pushState(state, '', url);

        // حفظ الحالة في localStorage
        this.saveState();

        // التنقل للصفحة المطلوبة
        ui.navigateToPage(pageId);

        console.log('التنقل إلى:', pageId, 'التاريخ:', this.history.length);
    }

    generateURL(state) {
        const baseURL = window.location.origin + window.location.pathname;
        
        switch (state.page) {
            case 'mangaDetailPage':
                return `${baseURL}?manga=${state.data.mangaId}`;
            case 'chapterPage':
                return `${baseURL}?manga=${state.data.mangaId}&chapter=${state.data.chapterId}`;
            default:
                return baseURL;
        }
    }

    goBack() {
        if (this.history.length > 1) {
            // إزالة الحالة الحالية
            this.history.pop();
            const previousState = this.history[this.history.length - 1];
            
            // تحديث الحالة الحالية
            this.currentState = previousState;
            
            // تحديث الـ URL
            window.history.back();
            
            // استعادة الحالة
            this.restoreState(previousState);
            
            console.log('العودة إلى:', previousState.page, 'التاريخ المتبقي:', this.history.length);
        } else {
            this.showExitConfirmation();
        }
    }

    restoreState(state) {
        if (!state) return;

        switch (state.page) {
            case 'homePage':
                ui.navigateToPage('homePage');
                break;
                
            case 'mangaDetailPage':
                if (state.data.mangaId && mangaManager.mangaData[state.data.mangaId]) {
                    const manga = mangaManager.mangaData[state.data.mangaId];
                    mangaManager.showMangaDetail(state.data.mangaId, manga, true);
                } else {
                    this.navigateTo('homePage');
                }
                break;
                
            case 'chapterPage':
                if (state.data.mangaId && state.data.chapterId && 
                    mangaManager.mangaData[state.data.mangaId] && 
                    mangaManager.mangaData[state.data.mangaId].chapters[state.data.chapterId]) {
                    
                    const manga = mangaManager.mangaData[state.data.mangaId];
                    const chapter = manga.chapters[state.data.chapterId];
                    mangaManager.showChapter(state.data.mangaId, state.data.chapterId, chapter, true);
                } else {
                    this.navigateTo('homePage');
                }
                break;
                
            default:
                this.navigateTo('homePage');
        }
    }

    saveState() {
        const state = {
            history: this.history,
            currentState: this.currentState
        };
        localStorage.setItem('navigationState', JSON.stringify(state));
    }

    loadState() {
        const savedState = localStorage.getItem('navigationState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.history = state.history || [];
            this.currentState = state.currentState;
            
            // استعادة الحالة الأخيرة إذا كانت موجودة
            if (this.currentState) {
                this.restoreState(this.currentState);
            }
        } else {
            // الحالة الافتراضية - الصفحة الرئيسية
            this.navigateTo('homePage');
        }
    }

    sortManga(sortType) {
        if (mangaManager.mangaData) {
            let sortedManga = Object.keys(mangaManager.mangaData).map(key => {
                return { id: key, ...mangaManager.mangaData[key] };
            });

            switch (sortType) {
                case 'newest':
                    sortedManga.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    break;
                case 'popular':
                    sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
                case 'oldest':
                    sortedManga.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    break;
                default:
                    break;
            }

            mangaManager.displaySortedManga(sortedManga);
        }
    }

    // دالة مساعدة للحصول على الحالة الحالية
    getCurrentState() {
        return this.currentState;
    }

    // دالة مساعدة لمعرفة إذا كان يمكن العودة للخلف
    canGoBack() {
        return this.history.length > 1;
    }
}

const navigationManager = new NavigationManager();