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

        // إصلاح أزرار التصنيف
        document.querySelectorAll('.categories-list li').forEach(item => {
            item.addEventListener('click', (e) => {
                const sortType = e.currentTarget.getAttribute('data-sort');
                if (sortType) {
                    this.sortManga(sortType);
                    ui.toggleDrawer(false);
                }
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
        if (window.location.hash !== `#${hash}`) {
            window.location.hash = hash;
        }

        this.saveState();
        ui.navigateToPage(pageId);

        console.log('التنقل إلى:', pageId, 'hash:', hash);
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

    parseHash(hash) {
        const pathParts = hash.split('/').filter(part => part);
        
        if (pathParts[0] === 'manga' && pathParts[1]) {
            const mangaId = pathParts[1];
            
            if (pathParts[2] === 'chapter' && pathParts[3]) {
                return {
                    page: 'chapterPage',
                    mangaId: mangaId,
                    chapterId: pathParts[3]
                };
            } else {
                return {
                    page: 'mangaDetailPage',
                    mangaId: mangaId
                };
            }
        }
        
        return { page: 'homePage' };
    }

    loadStateFromURL() {
        const hash = window.location.hash.replace('#', '');
        
        if (!hash) {
            // إذا لم يكن هناك hash، تحقق إذا كان هناك حالة محفوظة
            const savedState = localStorage.getItem('navigationState');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.currentState) {
                    this.restoreState(state.currentState);
                    return;
                }
            }
            this.navigateTo('homePage');
            return;
        }

        const route = this.parseHash(hash);
        
        if (route.page === 'homePage') {
            this.navigateTo('homePage');
            return;
        }

        if (route.page === 'mangaDetailPage') {
            this.loadMangaFromURL(route.mangaId);
        } else if (route.page === 'chapterPage') {
            this.loadChapterFromURL(route.mangaId, route.chapterId);
        }
    }

    async loadMangaFromURL(mangaId) {
        try {
            // إذا لم تكن بيانات المانجا محملة، انتظر قليلاً ثم حاول مرة أخرى
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                setTimeout(() => {
                    this.loadMangaFromURL(mangaId);
                }, 500);
                return;
            }
            
            if (mangaManager.mangaData[mangaId]) {
                const manga = mangaManager.mangaData[mangaId];
                this.currentState = { page: 'mangaDetailPage', data: { mangaId: mangaId } };
                this.history = [this.currentState];
                ui.navigateToPage('mangaDetailPage');
                await mangaManager.showMangaDetail(mangaId, manga);
            } else {
                console.warn('المانجا غير موجودة:', mangaId);
                this.navigateTo('homePage');
            }
            
        } catch (error) {
            console.error('Error loading manga from URL:', error);
            this.navigateTo('homePage');
        }
    }

    async loadChapterFromURL(mangaId, chapterId) {
        try {
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                setTimeout(() => {
                    this.loadChapterFromURL(mangaId, chapterId);
                }, 500);
                return;
            }
            
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
                ui.navigateTo('chapterPage');
                await mangaManager.showChapter(mangaId, chapterId, chapter);
            } else {
                console.warn('الفصل غير موجود:', mangaId, chapterId);
                this.navigateTo('homePage');
            }
            
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
        if (!mangaManager.mangaData) {
            console.warn('بيانات المانجا غير محملة بعد');
            return;
        }

        let sortedManga = Object.keys(mangaManager.mangaData).map(key => {
            return { id: key, ...mangaManager.mangaData[key] };
        });

        switch (sortType) {
            case 'newest':
                // استخدام التاريخ إذا كان موجوداً، وإلا استخدام ترتيب الإضافة
                sortedManga.sort((a, b) => {
                    const timeA = a.timestamp || a.createdAt || 0;
                    const timeB = b.timestamp || b.createdAt || 0;
                    return timeB - timeA;
                });
                break;
            case 'popular':
                sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'oldest':
                sortedManga.sort((a, b) => {
                    const timeA = a.timestamp || a.createdAt || 0;
                    const timeB = b.timestamp || b.createdAt || 0;
                    return timeA - timeB;
                });
                break;
            default:
                console.warn('نوع التصنيف غير معروف:', sortType);
                return;
        }

        console.log('تصنيف المانجا حسب:', sortType, sortedManga.length);
        mangaManager.displaySortedManga(sortedManga);
    }

    getCurrentState() {
        return this.currentState;
    }

    canGoBack() {
        return this.history.length > 1;
    }
}

const navigationManager = new NavigationManager();