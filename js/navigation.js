class NavigationManager {
    constructor() {
        this.history = [];
        this.currentState = null;
        this.setupEventListeners();
        this.setupBrowserBackButton();
        // لا نعتمد على loadStateFromURL() هنا، بل نعتمد على loadState()
        this.loadState(); 
    }

    setupEventListeners() {
        // حدث النقر على الشعار للعودة للرئيسية
        document.querySelector('.logo').addEventListener('click', () => {
            this.navigateTo('homePage');
        });

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
                    ui.closeDrawer(); // إغلاق القائمة الجانبية بعد التصنيف
                }
            });
        });

        // حدث النقر على زر "الرئيسية" الجديد في القائمة الجانبية
        document.getElementById('drawerHomeBtn').addEventListener('click', () => {
            this.navigateTo('homePage');
            ui.closeDrawer();
        });
    }

    setupBrowserBackButton() {
        window.addEventListener('popstate', (event) => {
            // عند استخدام زر الرجوع في المتصفح، لا نحتاج إلى loadStateFromURL
            // لأن المتصفح يقوم بتحديث الـ hash تلقائياً
            // نحتاج فقط إلى استعادة الحالة من الـ history
            const state = event.state;
            if (state && state.page) {
                this.currentState = state;
                this.restoreState(state);
            } else {
                // إذا لم تكن هناك حالة في popstate (مثل أول تحميل)
                this.loadStateFromURL();
            }
        });

        window.addEventListener('hashchange', () => {
            // hashchange يحدث عند تغيير الـ hash يدوياً أو عبر window.location.hash = ...
            // إذا كان التغيير ناتجاً عن navigateTo، فلا تفعل شيئاً
            // إذا كان التغيير ناتجاً عن زر الرجوع، فسيتم التعامل معه بواسطة popstate
            // لذا، نستخدم loadStateFromURL فقط للتأكد من مزامنة الحالة عند التغيير الخارجي للـ hash
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

        // منع التكرار في history المتصفح
        if (newHash === currentHash) {
            // إذا كان الـ hash هو نفسه، قم فقط بتحديث الحالة الداخلية
            this.currentState = state;
            this.history[this.history.length - 1] = state; // تحديث آخر حالة في history
            this.saveState();
            ui.navigateToPage(pageId);
            console.log('تحديث الحالة الداخلية فقط:', pageId, 'hash:', newHash);
            return;
        }

        // منع إضافة نفس الحالة مرتين متتاليتين في history التطبيق
        if (this.currentState && this.currentState.page === pageId && JSON.stringify(this.currentState.data) === JSON.stringify(data)) {
             // إذا كانت الحالة مكررة، لا تفعل شيئاً
            return;
        }

        this.currentState = state;
        this.history.push(state);

        // تحديث الـ hash، وهذا سيؤدي إلى حدث hashchange و popstate
        // نستخدم replaceState إذا كنا نريد منع إضافة إدخال جديد في تاريخ المتصفح
        // ولكننا نريد إضافة إدخال جديد لتشغيل زر الرجوع، لذا نستخدم pushState
        history.pushState(state, '', `#${newHash}`);

        this.saveState();
        ui.navigateToPage(pageId);

        console.log('التنقل إلى:', pageId, 'hash:', newHash);
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
            this.navigateTo('homePage');
            return;
        }

        const route = this.parseHash(hash);
        
        if (route.page === 'homePage') {
            this.navigateTo('homePage');
            return;
        }

        // منع التكرار في navigateTo
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
            // إذا لم تكن بيانات المانجا محملة، انتظر قليلاً ثم حاول مرة أخرى
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                setTimeout(() => {
                    this.loadMangaFromURL(mangaId);
                }, 500);
                return;
            }
            
            if (mangaManager.mangaData[mangaId]) {
                const manga = mangaManager.mangaData[mangaId];
                
                // تحديث الحالة الداخلية فقط دون تغيير الـ hash
                this.currentState = { page: 'mangaDetailPage', data: { mangaId: mangaId } };
                this.history.push(this.currentState);
                this.saveState();
                
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
                
                // تحديث الحالة الداخلية فقط دون تغيير الـ hash
                this.currentState = { 
                    page: 'chapterPage', 
                    data: { mangaId: mangaId, chapterId: chapterId } 
                };
                this.history.push(this.currentState);
                this.saveState();

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
            this.history.pop();
            const previousState = this.history[this.history.length - 1];
            this.currentState = previousState;

            const hash = this.generateHash(previousState);
            // استخدام history.back() بدلاً من تغيير الـ hash يدوياً
            window.history.back();
            
            // لا حاجة لـ restoreState هنا، popstate سيتولى الأمر
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
                mangaManager.loadMangaList(); // استخدام loadMangaList لضمان التحديث
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
        
        // عند تحميل التطبيق، يجب أن نعتمد على الـ URL الحالي
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
                // الأحدث: حسب تاريخ الإنشاء أو التحديث
                sortedManga.sort((a, b) => {
                    const timeA = a.updatedAt || a.createdAt || 0;
                    const timeB = b.updatedAt || b.createdAt || 0;
                    return timeB - timeA;
                });
                break;
            case 'popular':
                // الأكثر شعبية: حسب عدد المشاهدات
                sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'oldest':
                // الأقدم: حسب تاريخ الإنشاء
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

        // تحديث الواجهة لعرض المانجا المصنفة
        mangaManager.displaySortedManga(sortedManga);
        
        // التأكد من أننا في الصفحة الرئيسية
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
