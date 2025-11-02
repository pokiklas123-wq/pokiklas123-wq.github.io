class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
        this.loadState(); 
    }

    setupEventListeners() {
        document.querySelector('.logo').addEventListener('click', () => {
            this.navigateTo('homePage');
        });

	        document.getElementById('backToHome').addEventListener('click', () => {
	            navigationManager.navigateTo('homePage'); // تغيير goBack() إلى navigateTo('homePage')
	        });
	
	        document.getElementById('backToManga').addEventListener('click', () => {
	            navigationManager.goBack();
	        });

        document.querySelectorAll('.categories-list li').forEach(item => {
            item.addEventListener('click', (e) => {
                const sortType = e.currentTarget.getAttribute('data-sort');
                if (sortType) {
                    this.sortManga(sortType);
                    ui.closeDrawer();
                }
            });
        });

	        document.getElementById('drawerHomeBtn').addEventListener('click', () => {
	            this.navigateTo('homePage');
	            ui.closeDrawer();
	        });
	        
	        // إضافة مستمعي الأحداث لصفحات الميزات الجديدة
	        document.getElementById('drawerRatingsBtn').addEventListener('click', () => {
	            this.navigateTo('ratingsPage');
	            ui.closeDrawer();
	        });
	        
	        document.getElementById('drawerCommentsBtn').addEventListener('click', () => {
	            this.navigateTo('commentsPage');
	            ui.closeDrawer();
	        });
	        
	        document.getElementById('drawerNotificationsBtn').addEventListener('click', () => {
	            this.navigateTo('notificationsPage');
	            ui.closeDrawer();
	        });
    }

    setupBrowserBackButton() {
	        window.addEventListener('popstate', (event) => {
	            const state = event.state;
	            if (state && state.page) {
	                this.currentState = state;
	                this.restoreState(state);
	            } else {
	                // إذا لم يكن هناك حالة في popstate، فربما تم التنقل إلى رابط خارجي أو تم تحديث الصفحة
	                // في هذه الحالة، نعتمد على loadStateFromURL لتحليل الهاش الحالي
	        // لا تقم باستدعاء loadStateFromURL هنا، بل في App.init() بعد تحميل البيانات
	        // هذا يضمن أن البيانات (مثل mangaManager.mangaData) متاحة عند محاولة تحليل الروابط
	        // this.loadStateFromURL();
	            }
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

	        const newHash = this.generateHash(state);
	        const currentHash = window.location.hash.replace('#', '');
	
	        // إذا كان الهاش الجديد هو نفسه الهاش الحالي، لا تقم بإضافة حالة جديدة إلى history
	        if (newHash === currentHash) {
	            this.currentState = state;
	            // تحديث الحالة الحالية في history إذا كانت موجودة
	            if (this.history.length > 0) {
	                this.history[this.history.length - 1] = state;
	            } else {
	                this.history.push(state);
	            }
	            this.saveState();
	            ui.navigateToPage(pageId);
	            return;
	        }
	
	        // منع الانتقال إذا كانت الصفحة والبيانات هي نفسها
	        if (this.currentState && this.currentState.page === pageId && JSON.stringify(this.currentState.data) === JSON.stringify(data)) {
	            return;
	        }
	
	        this.currentState = state;
	        this.history.push(state);
	
	        // تحديث الـ URL أولاً باستخدام pushState
	        history.pushState(state, '', `#${newHash}`);
	        
	        // ثم الانتقال إلى الصفحة
	        ui.navigateToPage(pageId);
	        this.saveState();
    }

    generateHash(state) {
        switch (state.page) {
            case 'mangaDetailPage':
                return `manga/${state.data.mangaId}`;
            case 'chapterPage':
                return `manga/${state.data.mangaId}/chapter/${state.data.chapterId}`;
            case 'ratingsPage':
                return 'ratings';
            case 'commentsPage':
                return 'comments';
            case 'notificationsPage':
                return 'notifications';
            case 'homePage':
                return '';
            default:
                return '';
        }
    }

    parseHash(hash) {
	        const pathParts = hash.split('/').filter(part => part);
	        
	        if (pathParts[0] === 'ratings') {
	            return { page: 'ratingsPage' };
	        }
	        
	        if (pathParts[0] === 'comments') {
	            return { page: 'commentsPage' };
	        }
	        
	        if (pathParts[0] === 'notifications') {
	            return { page: 'notificationsPage' };
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
        const hash = window.location.hash.replace('#', '');
        
	        if (!hash) {
	            // إذا لم يكن هناك هاش، انتقل إلى الصفحة الرئيسية
	            if (this.currentState?.page !== 'homePage') {
	                this.navigateTo('homePage');
	            }
	            return;
	        }

        const route = this.parseHash(hash);
        
	        if (route.page === 'homePage') {
	            this.navigateTo('homePage');
	            return;
	        }
	        
	        // معالجة صفحات الميزات الجديدة
	        if (route.page === 'ratingsPage') {
	            this.navigateTo('ratingsPage');
	            return;
	        }
	        
	        if (route.page === 'commentsPage') {
	            this.navigateTo('commentsPage');
	            return;
	        }
	        
	        if (route.page === 'notificationsPage') {
	            this.navigateTo('notificationsPage');
	            return;
	        }

        if (this.currentState && this.currentState.page === route.page) {
            if (route.page === 'mangaDetailPage' && this.currentState.data.mangaId === route.mangaId) return;
            if (route.page === 'chapterPage' && this.currentState.data.mangaId === route.mangaId && this.currentState.data.chapterId === route.chapterId) return;
        }

        if (route.page === 'mangaDetailPage') {
            this.loadMangaFromURL(route.mangaId);
        } else if (route.page === 'chapterPage') {
            this.loadChapterFromURL(route.mangaId, route.chapterId);
        }
    }

    async loadMangaFromURL(mangaId) {
        try {
            // الانتظار حتى تحميل بيانات المانجا
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                setTimeout(() => {
                    this.loadMangaFromURL(mangaId);
                }, 100);
                return;
            }
            
            if (mangaManager.mangaData[mangaId]) {
                const manga = mangaManager.mangaData[mangaId];
                
                this.currentState = { page: 'mangaDetailPage', data: { mangaId: mangaId } };
                if (this.history.length === 0) {
                    this.history.push(this.currentState);
                } else {
                    this.history[this.history.length - 1] = this.currentState;
                }
                this.saveState();
                
                // الانتقال الفوري إلى صفحة التفاصيل
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
                }, 100);
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
                if (this.history.length === 0) {
                    this.history.push(this.currentState);
                } else {
                    this.history[this.history.length - 1] = this.currentState;
                }
                this.saveState();

                // الانتقال الفوري إلى صفحة الفصل
                ui.navigateToPage('chapterPage');
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
	            // لا نحتاج إلى pop() هنا لأن window.history.back() سيقوم بتشغيل popstate
	            // و popstate سيتولى تحديث currentState و history.
	            window.history.back();
	        } else {
	            // إذا كنا في الصفحة الأولى، ننتقل إلى الصفحة الرئيسية
	            this.navigateTo('homePage');
	        }
	    }

    restoreState(state) {
        if (!state) return;

        switch (state.page) {
	            case 'homePage':
	                ui.navigateToPage('homePage');
	                mangaManager.loadMangaList();
	                break;
	            case 'ratingsPage':
	                ui.navigateToPage('ratingsPage');
	                ratingsManager.loadUserRatings();
	                break;
	            case 'commentsPage':
	                ui.navigateToPage('commentsPage');
	                commentsManager.loadComments();
	                break;
	            case 'notificationsPage':
	                ui.navigateToPage('notificationsPage');
	                notificationsManager.loadNotifications();
	                break;
            case 'mangaDetailPage':
                if (state.data.mangaId && mangaManager.mangaData[state.data.mangaId]) {
                    const manga = mangaManager.mangaData[state.data.mangaId];
                    ui.navigateToPage('mangaDetailPage');
                    // لا نحتاج لاستدعاء showMangaDetail هنا لأن loadStateFromURL سيتكفل بذلك
                }
                break;
            case 'chapterPage':
                if (state.data.mangaId && state.data.chapterId && 
                    mangaManager.mangaData[state.data.mangaId] && 
                    mangaManager.mangaData[state.data.mangaId].chapters[state.data.chapterId]) {
                    
                    const manga = mangaManager.mangaData[state.data.mangaId];
                    const chapter = manga.chapters[state.data.chapterId];
                    ui.navigateToPage('chapterPage');
                    // لا نحتاج لاستدعاء showChapter هنا لأن loadStateFromURL سيتكفل بذلك
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
	        
	        // تم نقل loadStateFromURL إلى app.js ليتم استدعاؤه بعد تحميل البيانات
	        // this.loadStateFromURL();
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
                    const timeA = a.updatedAt || a.createdAt || 0;
                    const timeB = b.updatedAt || b.createdAt || 0;
                    return timeB - timeA;
                });
                break;
            case 'popular':
                sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'oldest':
                sortedManga.sort((a, b) => {
                    const timeA = a.createdAt || 0;
                    const timeB = b.createdAt || 0;
                    return timeA - timeB;
                });
                break;
            default:
                console.warn('نوع التصنيف غير معروف:', sortType);
                return;
        }

        mangaManager.displaySortedManga(sortedManga);
        this.navigateTo('homePage');
    }

    getCurrentState() {
        return this.currentState;
    }

    canGoBack() {
        return this.history.length > 1;
    }
}

const navigationManager = new NavigationManager();