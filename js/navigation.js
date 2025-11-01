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
        const state = {
            path: path,
            data: data,
            timestamp: Date.now()
        };

        // تحديث المسار في شريط العنوان
        if (replace) {
            history.replaceState(state, '', path);
        } else {
            history.pushState(state, '', path);
        }

        // تحديث الحالة الحالية
        this.currentState = state;
        
        // معالجة المسار والانتقال إلى الصفحة المناسبة
        this.handleRoute(path, state.data);
    }

    // دالة تحليل المسار (Routing)
    parsePath(path) {
        const pathParts = path.split('/').filter(part => part);
        
        if (pathParts.length === 0 || pathParts[0] === 'index.html') {
            return { page: 'homePage', params: {} };
        }

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
        
        // مسار الإشعارات (افتراضي)
        if (pathParts[0] === 'notifications') {
            return { page: 'notificationsPage', params: {} };
        }

        // في حالة عدم تطابق أي مسار، العودة إلى الصفحة الرئيسية
        return { page: 'homePage', params: {} };
    }

    // دالة معالجة المسار والانتقال الفعلي
    handleRoute(path, data = {}) {
        const route = this.parsePath(path);
        
        // إظهار شاشة التحميل
        ui.showLoading();

        switch (route.page) {
            case 'homePage':
                ui.navigateToPage('homePage');
                mangaManager.loadMangaList(); // التأكد من تحميل القائمة
                ui.hideLoading();
                break;
            case 'mangaDetailPage':
                mangaManager.loadMangaDetail(route.params.mangaId);
                break;
            case 'chapterPage':
                mangaManager.loadChapter(route.params.mangaId, route.params.chapterId);
                break;
            case 'notificationsPage':
                // افتراض وجود دالة لعرض الإشعارات
                notificationsManager.showNotificationsPage();
                ui.navigateToPage('notificationsPage'); // يجب إضافة هذه الصفحة في index.html
                ui.hideLoading();
                break;
            default:
                // في حالة عدم وجود الصفحة، الانتقال إلى 404 أو الرئيسية
                this.navigateTo('/', {}, true);
                break;
        }
    }

    // تحميل الحالة من المسار الحالي عند تحميل الصفحة أو حدث popstate
    loadStateFromURL(state = null) {
        const path = window.location.pathname;
        
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
        window.history.back();
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

    // دالة مساعدة لفرز المانجا (تم نقلها من الدالة الأصلية)
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
}

const navigationManager = new NavigationManager();
