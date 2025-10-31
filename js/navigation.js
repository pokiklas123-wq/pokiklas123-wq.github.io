// [file name]: navigation.js
class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
        this.loadState();
    }

    setupEventListeners() {
        document.getElementById('backToHome')?.addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('backToManga')?.addEventListener('click', () => {
            this.goBack();
        });

        // التنقل في القائمة الجانبية
        this.setupDrawerNavigation();
    }

    setupDrawerNavigation() {
        // زر الرئيسية
        const homeLink = document.getElementById('drawerHomeLink');
        if (homeLink) {
            homeLink.addEventListener('click', () => {
                this.navigateTo('homePage');
                ui.toggleDrawer(false);
            });
        }

        // أزرار التصنيف
        document.querySelectorAll('.categories-list li[data-sort]').forEach(item => {
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
            if (event.state) {
                this.restoreState(event.state);
            } else {
                this.loadStateFromURL();
            }
        });

        // التعامل مع تغييرات الـ hash
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

        const path = this.generatePath(state);
        if (window.location.pathname + window.location.hash !== path) {
            window.history.pushState(state, '', path);
        }

        this.saveState();
        ui.navigateToPage(pageId);

        console.log('التنقل إلى:', pageId, 'data:', data);
    }

    generatePath(state) {
        let path = '/';
        switch (state.page) {
            case 'mangaDetailPage':
                path = `/#manga/${state.data.mangaId}`;
                break;
            case 'chapterPage':
                path = `/#manga/${state.data.mangaId}/chapter/${state.data.chapterId}`;
                if (state.data.commentId) {
                    path += `#comment-${state.data.commentId}`;
                }
                break;
            default:
                path = '/';
                break;
        }
        return path;
    }

    parsePath(path, hash) {
        const pathParts = path.split('/').filter(part => part);
        let commentId = null;

        if (hash.startsWith('#comment-')) {
            commentId = hash.replace('#comment-', '');
        }

        if (pathParts[0] === 'manga' && pathParts[1]) {
            const mangaId = pathParts[1];
            
            if (pathParts[2] === 'chapter' && pathParts[3]) {
                return {
                    page: 'chapterPage',
                    mangaId: mangaId,
                    chapterId: pathParts[3],
                    commentId: commentId
                };
            } else {
                return {
                    page: 'mangaDetailPage',
                    mangaId: mangaId,
                    commentId: commentId
                };
            }
        }
        
        return { page: 'homePage' };
    }

    loadStateFromURL() {
        const path = window.location.hash.replace('#', '');
        const hash = window.location.hash;
        
        const route = this.parsePath(path, hash);
        
        if (route.page === 'homePage') {
            this.navigateTo('homePage');
            return;
        }

        if (route.page === 'mangaDetailPage') {
            this.loadMangaFromURL(route.mangaId);
        } else if (route.page === 'chapterPage') {
            this.loadChapterFromURL(route.mangaId, route.chapterId, route.commentId);
        }
    }

    async loadMangaFromURL(mangaId) {
        try {
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

    async loadChapterFromURL(mangaId, chapterId, commentId = null) {
        try {
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                setTimeout(() => {
                    this.loadChapterFromURL(mangaId, chapterId, commentId);
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
                    data: { mangaId: mangaId, chapterId: chapterId, commentId: commentId } 
                };
                this.history = [this.currentState];
                ui.navigateTo('chapterPage');
                await mangaManager.showChapter(mangaId, chapterId, chapter, commentId);
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

            const path = this.generatePath(previousState);
            window.history.pushState(previousState, '', path);
            
            this.restoreState(previousState);
        } else {
            window.history.pushState({ page: 'homePage' }, '', '/');
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
                    mangaManager.showChapter(state.data.mangaId, state.data.chapterId, chapter, state.data.commentId);
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
            case 'rating':
                sortedManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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

    // دالة للتنقل السريع
    quickNavigate(target) {
        switch (target) {
            case 'home':
                this.navigateTo('homePage');
                break;
            case 'top-rated':
                this.sortManga('rating');
                break;
            case 'most-viewed':
                this.sortManga('popular');
                break;
            case 'latest':
                this.sortManga('newest');
                break;
        }
    }

    // دالة للحصول على تاريخ التنقل
    getNavigationHistory() {
        return this.history.map(entry => ({
            page: entry.page,
            data: entry.data,
            timestamp: new Date(entry.timestamp).toLocaleString('ar-SA')
        }));
    }

    // دالة لمسح تاريخ التنقل
    clearNavigationHistory() {
        this.history = this.history.slice(-1); // الاحتفاظ بالحالة الحالية فقط
        this.saveState();
    }
}

const navigationManager = new NavigationManager();