
class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
    }

    setupEventListeners() {
        document.querySelector('.logo').addEventListener('click', () => {
            this.navigateTo('/');
        });

        document.getElementById('backToHome').addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('backToManga').addEventListener('click', () => {
            this.goBack();
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
            this.navigateTo('/');
            ui.closeDrawer();
        });
    }

    setupBrowserBackButton() {
        // الاستماع لحدث popstate لمعالجة زر الرجوع/الأمام في المتصفح
        window.addEventListener('popstate', (event) => {
            // عند استخدام زر الرجوع، يتم استدعاء loadStateFromURL لتحميل الحالة الجديدة من المسار
            this.loadStateFromURL(event.state);
        });
    }

    // الدالة الرئيسية للتنقل
    navigateTo(path, data = {}, replace = false) {
        // تنظيف المسار من الـ hash إذا كان موجوداً
        if (path.startsWith('#')) {
            path = path.substring(1);
        }
        
        // إضافة الـ base URL للمشروع
        const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        const fullPath = path === '/' ? basePath + '/' : basePath + path;

        const state = {
            path: path,
            data: data,
            timestamp: Date.now()
        };

        // تحديث المسار في شريط العنوان بدون hash
        if (replace) {
            history.replaceState(state, '', fullPath);
        } else {
            history.pushState(state, '', fullPath);
        }

        // تحديث الحالة الحالية
        this.currentState = state;
        
        // معالجة المسار والانتقال إلى الصفحة المناسبة
        this.handleRoute(path, state.data);
    }

    // دالة تحليل المسار (Routing)
    parsePath(path) {
        // إزالة الـ base path إذا كان موجوداً
        const basePath = window.location.pathname.replace(/\/[^\/]*$/, '');
        let cleanPath = path;
        
        if (path.startsWith(basePath)) {
            cleanPath = path.substring(basePath.length);
        }
        
        // إذا كان المسار فارغاً أو الجذر، العودة للصفحة الرئيسية
        if (!cleanPath || cleanPath === '/' || cleanPath === '/index.html') {
            return { page: 'homePage', params: {} };
        }

        const pathParts = cleanPath.split('/').filter(part => part);
        
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
        
        // مسار الإشعارات
        if (pathParts[0] === 'notifications') {
            return { page: 'notificationsPage', params: {} };
        }

        // في حالة عدم تطابق أي مسار، العودة إلى الصفحة الرئيسية
        return { page: 'homePage', params: {} };
    }

    // دالة معالجة المسار والانتقال الفعلي
    handleRoute(path, data = {}) {
        const route = this.parsePath(path);
        
        console.log('معالجة المسار:', path, '->', route);
        
        // إظهار شاشة التحميل
        ui.showLoading();

        switch (route.page) {
            case 'homePage':
                ui.navigateToPage('homePage');
                mangaManager.loadMangaList();
                ui.hideLoading();
                break;
            case 'mangaDetailPage':
                mangaManager.loadMangaDetail(route.params.mangaId);
                break;
            case 'chapterPage':
                mangaManager.loadChapter(route.params.mangaId, route.params.chapterId);
                break;
            case 'notificationsPage':
                notificationsManager.showNotificationsPage();
                ui.navigateToPage('notificationsPage');
                ui.hideLoading();
                break;
            default:
                // في حالة عدم وجود الصفحة، الانتقال إلى الرئيسية
                this.navigateTo('/', {}, true);
                break;
        }
    }

    // تحميل الحالة من المسار الحالي عند تحميل الصفحة أو حدث popstate
    loadStateFromURL(state = null) {
        // التحقق أولاً من وجود مسار مخزن في sessionStorage (من 404.html)
        const redirectPath = sessionStorage.getItem('redirectPath');
        if (redirectPath) {
            sessionStorage.removeItem('redirectPath');
            this.navigateTo(redirectPath, {}, true);
            return;
        }

        const path = window.location.pathname + window.location.search;
        
        // إذا كان هناك حالة مخزنة في popstate، استخدمها
        if (state && state.path) {
            this.currentState = state;
            this.handleRoute(state.path, state.data);
            return;
        }

        // إذا لم يكن هناك حالة، قم بتحليل المسار الحالي
        this.handleRoute(path);
    }

    // دالة الرجوع
    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('/');
        }
    }

    // دالة مساعدة لإنشاء مسار المانجا
    getMangaPath(mangaId) {
        return `/manga/${mangaId}`;
    }

    // دالة مساعدة لإنشاء مسار الفصل
    getChapterPath(mangaId, chapterId) {
        return `/manga/${mangaId}/chapter/${chapterId}`;
    }

    // دالة مساعدة لإنشاء مسار الإشعارات
    getNotificationsPath() {
        return '/notifications';
    }

    // دالة مساعدة لفرز المانجا
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
        this.navigateTo('/');
    }

    getCurrentState() {
        return this.currentState;
    }

    // دالة جديدة للتحقق مما إذا كان يمكن العودة للخلف
    canGoBack() {
        return window.history.length > 1;
    }
}

const navigationManager = new NavigationManager();
