class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
        this.loadStateFromURL(); // تحميل الحالة من URL عند البدء
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
            if (event.state) {
                this.restoreState(event.state);
            } else if (this.history.length > 1) {
                this.goBack();
            } else {
                this.navigateTo('homePage');
            }
        });
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
                return `${baseURL}manga/${state.data.mangaId}/`;
            case 'chapterPage':
                return `${baseURL}manga/${state.data.mangaId}/chapter/${state.data.chapterId}/`;
            default:
                return baseURL;
        }
    }

    loadStateFromURL() {
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(part => part);
        
        if (pathParts.length === 0) {
            // الصفحة الرئيسية
            this.navigateTo('homePage');
            return;
        }

        if (pathParts[0] === 'manga' && pathParts[1]) {
            const mangaId = pathParts[1];
            
            if (pathParts[2] === 'chapter' && pathParts[3]) {
                // صفحة الفصل
                const chapterId = pathParts[3];
                this.loadChapterFromURL(mangaId, chapterId);
            } else {
                // صفحة تفاصيل المانجا
                this.loadMangaFromURL(mangaId);
            }
        } else {
            this.navigateTo('homePage');
        }
    }

    async loadMangaFromURL(mangaId) {
        try {
            // الانتظار حتى يتم تحميل بيانات المانجا
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            if (mangaManager.mangaData[mangaId]) {
                const manga = mangaManager.mangaData[mangaId];
                this.navigateTo('mangaDetailPage', { mangaId: mangaId });
                mangaManager.showMangaDetail(mangaId, manga);
            } else {
                this.navigateTo('homePage');
            }
        } catch (error) {
            console.error('Error loading manga from URL:', error);
            this.navigateTo('homePage');
        }
    }

    async loadChapterFromURL(mangaId, chapterId) {
        try {
            // الانتظار حتى يتم تحميل بيانات المانجا
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            if (mangaManager.mangaData[mangaId] && 
                mangaManager.mangaData[mangaId].chapters && 
                mangaManager.mangaData[mangaId].chapters[chapterId]) {
                
                const manga = mangaManager.mangaData[mangaId];
                const chapter = manga.chapters[chapterId];
                this.navigateTo('chapterPage', { 
                    mangaId: mangaId, 
                    chapterId: chapterId 
                });
                mangaManager.showChapter(mangaId, chapterId, chapter);
            } else {
                this.navigateTo('homePage');
            }
        } catch (error) {
            console.error('Error loading chapter from URL:', error);
            this.navigateTo('homePage');
        }
    }

    goBack() {
        if (this.history.length > 1) {
            // إزالة الحالة الحالية
            this.history.pop();
            const previousState = this.history[this.history.length - 1];
            
            // تحديث الحالة الحالية
            this.currentState = previousState;
            
            // تحديث الـ URL باستخدام replaceState للحفاظ على التاريخ
            const url = this.generateURL(previousState);
            window.history.replaceState(previousState, '', url);
            
            // استعادة الحالة
            this.restoreState(previousState);
            
            console.log('العودة إلى:', previousState.page, 'التاريخ المتبقي:', this.history.length);
        } else {
            // إذا لم يكن هناك تاريخ، انتقل للصفحة الرئيسية
            this.navigateTo('homePage');
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
                    mangaManager.showMangaDetail(state.data.mangaId, manga);
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
                    mangaManager.showChapter(state.data.mangaId, state.data.chapterId, chapter);
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
        }
        
        // تحميل من URL بأولوية أعلى
        this.loadStateFromURL();
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

    getCurrentState() {
        return this.currentState;
    }

    canGoBack() {
        return this.history.length > 1;
    }
}

const navigationManager = new NavigationManager();