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

        // إضافة معالج لزر الرئيسية الجديد
        document.getElementById('drawerHomeLink').addEventListener('click', () => {
            this.navigateTo('homePage');
            ui.toggleDrawer(false);
        });

        // إصلاح أزرار التصنيف
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

        console.log('التنقل إلى:', pageId, 'hash:', hash);
    }

    generatePath(state) {
        let path = '';
        switch (state.page) {
            case 'mangaDetailPage':
                path = `/manga/${state.data.mangaId}`;
                break;
            case 'chapterPage':
                path = `/manga/${state.data.mangaId}/chapter/${state.data.chapterId}`;
                break;
            default:
                path = '/';
                break;
        }
        // إضافة الهاش إذا كان موجوداً في الحالة
        if (state.data.commentId) {
            path += `#comment-${state.data.commentId}`;
        }
        return path;
    }

    parsePath(path, hash) {
        const pathParts = path.split('/').filter(part => part);
        let commentId = null;

        if (hash.startsWith('#comment-')) {
            commentId = hash.replace('#comment-', '');
        }

        // إذا كان المسار هو /manga/manga_id_1/chapter/chapter_1
        if (pathParts[0] === 'manga' && pathParts[1] && pathParts[2] === 'chapter' && pathParts[3]) {
            return {
                page: 'chapterPage',
                mangaId: pathParts[1],
                chapterId: pathParts[3],
                commentId: commentId
            };
        } 
        // إذا كان المسار هو /manga/manga_id_1
        else if (pathParts[0] === 'manga' && pathParts[1]) {
            return {
                page: 'mangaDetailPage',
                mangaId: pathParts[1],
                commentId: commentId
            };
        }
        
        return { page: 'homePage' };
    }
        
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
	        const path = window.location.pathname;
	        const hash = window.location.hash.replace('#', '');
	        
	        const route = this.parsePath(path, hash);
	        
	        if (route.page === 'homePage') {
	            // إذا كان المسار هو '/'، قم بتحميل الحالة المحفوظة إذا كانت موجودة، وإلا انتقل إلى الصفحة الرئيسية
	            const savedState = localStorage.getItem('navigationState');
	            if (savedState) {
	                const state = JSON.parse(savedState);
	                if (state.currentState && state.currentState.page !== 'homePage') {
	                    // استعادة الحالة المحفوظة من localStorage
	                    this.restoreState(state.currentState);
	                    // تحديث URL إلى المسار الصحيح
	                    const correctPath = this.generatePath(state.currentState);
	                    window.history.replaceState(state.currentState, '', correctPath);
	                    return;
	                }
	            }
	            // إذا لم يكن هناك حالة محفوظة أو كانت الصفحة الرئيسية، انتقل إلى الصفحة الرئيسية
	            this.navigateTo('homePage');
	            return;
	        }
        
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

	    async loadChapterFromURL(mangaId, chapterId, commentId = null) {
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
	                this.currentState.data.commentId = commentId; // إضافة commentId إلى الحالة
	                this.history = [this.currentState];
	                ui.navigateToPage('chapterPage');
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
	        // تحميل الحالة عند بدء التشغيل
	        const savedState = localStorage.getItem('navigationState');
	        if (savedState) {
	            const state = JSON.parse(savedState);
	            this.history = state.history || [];
	            this.currentState = state.currentState;
	        }
	        
	        // إذا كان هناك مسار في الـ URL، قم بتحميل الحالة منه
	        if (window.location.pathname !== '/' || window.location.hash) {
	            this.loadStateFromURL();
	        } else {
	            // إذا كان المسار هو '/'، انتقل إلى الصفحة الرئيسية
	            this.navigateTo('homePage');
	        }
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