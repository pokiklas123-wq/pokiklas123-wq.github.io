class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
        this.loadStateFromURL();
    }

    setupEventListeners() {
        document.getElementById('backToHome').addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('backToManga').addEventListener('click', () => {
            this.goBack();
        });

        document.querySelectorAll('.categories-list li').forEach(item => {
            item.addEventListener('click', () => {
                const sortType = item.dataset.sort;
                this.sortManga(sortType);
                ui.toggleDrawer(false);
            });
        });
    }

    setupBrowserBackButton() {
        window.addEventListener('popstate', (event) => {
            this.loadStateFromURL();
        });

        window.addEventListener('hashchange', () => {
            this.loadStateFromURL();
        });
    }

    navigateTo(pageId, data = {}) {
        const state = {
            page: pageId,
            data: data,
            timestamp: Date.now()
        };

        this.currentState = state;
        this.history.push(state);

        const hash = this.generateHash(state);
        window.location.hash = hash;

        this.saveState();
        ui.navigateToPage(pageId);

        console.log('التنقل إلى:', pageId, 'التاريخ:', this.history.length);
    }

    generateHash(state) {
        switch (state.page) {
            case 'mangaDetailPage':
                return `manga/${state.data.mangaId}`;
            case 'chapterPage':
                return `manga/${state.data.mangaId}/chapter/${state.data.chapterId}`;
            default:
                return '';
        }
    }

    loadStateFromURL() {
        const hash = window.location.hash.replace('#', '');
        
        if (!hash) {
            this.navigateTo('homePage');
            return;
        }

        const pathParts = hash.split('/').filter(part => part);
        
        if (pathParts[0] === 'manga' && pathParts[1]) {
            const mangaId = pathParts[1];
            
            if (pathParts[2] === 'chapter' && pathParts[3]) {
                const chapterId = pathParts[3];
                this.loadChapterFromURL(mangaId, chapterId);
            } else {
                this.loadMangaFromURL(mangaId);
            }
        } else {
            this.navigateTo('homePage');
        }
    }

    async loadMangaFromURL(mangaId) {
        try {
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            // انتظار قصير إضافي لضمان تحميل البيانات
            setTimeout(async () => {
                if (mangaManager.mangaData[mangaId]) {
                    const manga = mangaManager.mangaData[mangaId];
                    this.currentState = { page: 'mangaDetailPage', data: { mangaId: mangaId } };
                    this.history = [this.currentState];
                    ui.navigateToPage('mangaDetailPage');
                    await mangaManager.showMangaDetail(mangaId, manga);
                } else {
                    this.navigateTo('homePage');
                }
            }, 100);
            
        } catch (error) {
            console.error('Error loading manga from URL:', error);
            this.navigateTo('homePage');
        }
    }

    async loadChapterFromURL(mangaId, chapterId) {
        try {
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            setTimeout(async () => {
                if (mangaManager.mangaData[mangaId] && 
                    mangaManager.mangaData[mangaId].chapters && 
                    mangaManager.mangaData[mangaId].chapters[chapterId]) {
                    
                    const manga = mangaManager.mangaData[mangaId];
                    const chapter = manga.chapters[chapterId];
                    this.currentState = { 
                        page: 'chapterPage', 
                        data: { mangaId: mangaId, chapterId: chapterId } 
                    };
                    this.history = [this.currentState];
                    ui.navigateToPage('chapterPage');
                    await mangaManager.showChapter(mangaId, chapterId, chapter);
                } else {
                    this.navigateTo('homePage');
                }
            }, 100);
            
        } catch (error) {
            console.error('Error loading chapter from URL:', error);
            this.navigateTo('homePage');
        }
    }

    goBack() {
        if (this.history.length > 1) {
            this.history.pop();
            const previousState = this.history[this.history.length - 1];
            this.currentState = previousState;

            const hash = this.generateHash(previousState);
            window.location.hash = hash;
            
            this.restoreState(previousState);
        } else {
            window.location.hash = '';
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
                }
                break;
            case 'chapterPage':
                if (state.data.mangaId && state.data.chapterId && 
                    mangaManager.mangaData[state.data.mangaId] && 
                    mangaManager.mangaData[state.data.mangaId].chapters[state.data.chapterId]) {
                    
                    const manga = mangaManager.mangaData[state.data.mangaId];
                    const chapter = manga.chapters[state.data.chapterId];
                    mangaManager.showChapter(state.data.mangaId, state.data.chapterId, chapter);
                }
                break;
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