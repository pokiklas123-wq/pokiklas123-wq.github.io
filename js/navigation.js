class NavigationManager {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.currentState = null;
    }

    init() {
        this.setupEventListeners();
        this.setupBrowserBackButton();
        this.loadStateFromURL();
    }

    setupEventListeners() {
        // إعداد مستمعي الأحداث بشكل آمن
        setTimeout(() => {
            const logo = document.querySelector('.logo');
            const backToHome = document.getElementById('backToHome');
            const backToManga = document.getElementById('backToManga');
            const drawerHomeBtn = document.getElementById('drawerHomeBtn');
            
            if (logo) {
                logo.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo('/');
                });
            }
            
            if (backToHome) {
                backToHome.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.goBack();
                });
            }
            
            if (backToManga) {
                backToManga.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.goBack();
                });
            }
            
            if (drawerHomeBtn) {
                drawerHomeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo('/');
                    if (this.app && this.app.closeDrawer) {
                        this.app.closeDrawer();
                    }
                });
            }

            // إعداد تصنيفات المانجا إذا كانت موجودة
            const categoryItems = document.querySelectorAll('.categories-list li');
            categoryItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const sortType = e.currentTarget.getAttribute('data-sort');
                    if (sortType) {
                        this.sortManga(sortType);
                        if (this.app && this.app.closeDrawer) {
                            this.app.closeDrawer();
                        }
                    }
                });
            });
        }, 100);
    }

    setupBrowserBackButton() {
        window.addEventListener('popstate', (event) => {
            this.loadStateFromURL(event.state);
        });
    }

    navigateTo(path, data = {}, replace = false) {
        console.log('🔄 التنقل إلى:', path);
        
        // تنظيف المسار من الـ hash إذا كان موجوداً
        if (path.startsWith('#')) {
            path = path.substring(1);
        }
        
        // إذا كان المسار يحتوي على .html، استخدمه مباشرة
        if (path.includes('.html')) {
            window.location.href = path;
            return;
        }

        const state = {
            path: path,
            data: data,
            timestamp: Date.now()
        };

        if (replace) {
            history.replaceState(state, '', path);
        } else {
            history.pushState(state, '', path);
        }

        this.currentState = state;
        this.handleRoute(path, data);
    }

    parsePath(path) {
        console.log('🔍 تحليل المسار:', path);
        
        // تجاهل الملفات الثابتة والاستعلامات
        if (path.includes('.html') || path.includes('.css') || path.includes('.js') || path.includes('?')) {
            const urlParams = new URLSearchParams(window.location.search);
            const mangaId = urlParams.get('id') || urlParams.get('manga');
            const chapterId = urlParams.get('chapter');
            
            if (path.includes('manga.html') && mangaId) {
                return {
                    page: 'mangaDetailPage',
                    params: { mangaId: mangaId }
                };
            } else if (path.includes('chapter.html') && mangaId && chapterId) {
                return {
                    page: 'chapterPage',
                    params: { mangaId: mangaId, chapterId: chapterId }
                };
            }
            
            return { page: 'homePage', params: {} };
        }

        const pathParts = path.split('/').filter(part => part);
        
        if (pathParts[0] === 'manga' && pathParts[1]) {
            const mangaId = pathParts[1];
            
            if (pathParts[2] === 'chapter' && pathParts[3]) {
                return {
                    page: 'chapterPage',
                    params: { mangaId: mangaId, chapterId: pathParts[3] }
                };
            } else {
                return {
                    page: 'mangaDetailPage',
                    params: { mangaId: mangaId }
                };
            }
        }
        
        if (pathParts[0] === 'notifications') {
            return { page: 'notificationsPage', params: {} };
        }

        return { page: 'homePage', params: {} };
    }

    handleRoute(path, data = {}) {
        const route = this.parsePath(path);
        console.log('🎯 معالجة المسار:', route);
        
        switch (route.page) {
            case 'homePage':
                if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
                    window.location.href = '/index.html';
                }
                break;
            case 'mangaDetailPage':
                if (!window.location.search.includes(`id=${route.params.mangaId}`)) {
                    window.location.href = `/manga.html?id=${route.params.mangaId}`;
                }
                break;
            case 'chapterPage':
                const currentParams = new URLSearchParams(window.location.search);
                if (!currentParams.get('manga') || currentParams.get('manga') !== route.params.mangaId || 
                    !currentParams.get('chapter') || currentParams.get('chapter') !== route.params.chapterId) {
                    window.location.href = `/chapter.html?manga=${route.params.mangaId}&chapter=${route.params.chapterId}`;
                }
                break;
            case 'notificationsPage':
                if (!window.location.pathname.includes('notifications.html')) {
                    window.location.href = '/notifications.html';
                }
                break;
            default:
                if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
                    window.location.href = '/';
                }
                break;
        }
    }

    loadStateFromURL(state = null) {
        const path = window.location.pathname + window.location.search;
        console.log('📖 تحميل المسار من URL:', path);
        
        if (state && state.path) {
            this.currentState = state;
            this.handleRoute(state.path, state.data);
        } else {
            this.handleRoute(path);
        }
    }

    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('/');
        }
    }

    getMangaPath(mangaId) {
        return `/manga/${mangaId}`;
    }

    getChapterPath(mangaId, chapterId) {
        return `/manga/${mangaId}/chapter/${chapterId}`;
    }

    getNotificationsPath() {
        return '/notifications';
    }

    sortManga(sortType) {
        if (this.app && this.app.mangaList) {
            let sortedManga = [...this.app.mangaList];
            
            switch (sortType) {
                case 'latest':
                    // افترض أن لديك حقل تاريخ
                    sortedManga.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    break;
                case 'popular':
                    sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
                case 'rating':
                    sortedManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                case 'oldest':
                    sortedManga = [...this.app.mangaList].reverse();
                    break;
                default:
                    console.warn('نوع التصنيف غير معروف:', sortType);
                    return;
            }
            
            this.app.displayManga(sortedManga);
            this.navigateTo('/');
        } else {
            console.warn('بيانات المانجا غير محملة بعد');
        }
    }

    getCurrentState() {
        return this.currentState;
    }

    canGoBack() {
        return window.history.length > 1;
    }
}