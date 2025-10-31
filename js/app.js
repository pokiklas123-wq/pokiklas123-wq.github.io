// التطبيق الرئيسي
class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // تهيئة جميع المكونات
            this.setupEventListeners();
            
            // تحميل البيانات الأولية
            await this.loadInitialData();
            
            // استعادة الحالة السابقة
            this.restorePreviousState();
            
            console.log('التطبيق بدأ بنجاح');
        } catch (error) {
            console.error('خطأ في بدء التطبيق:', error);
        }
    }

    setupEventListeners() {
        // إعداد الأزرار الأساسية
        document.getElementById('backToHome').addEventListener('click', () => {
            this.saveState('homePage');
            ui.navigateToPage('homePage');
        });

        document.getElementById('backToManga').addEventListener('click', () => {
            const mangaId = mangaManager.getCurrentMangaId();
            this.saveState('mangaDetailPage', mangaId);
            ui.navigateToPage('mangaDetailPage');
        });
    }

    async loadInitialData() {
        try {
            // تحميل قائمة المانجا
            await mangaManager.loadMangaList();
            
            // تحميل تقييمات المستخدم إذا كان مسجلاً
            if (authManager.getCurrentUser()) {
                await ratingsManager.loadUserRatings();
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات الأولية:', error);
        }
    }

    saveState(page, mangaId = null, chapterId = null) {
        const state = {
            page: page,
            mangaId: mangaId,
            chapterId: chapterId,
            timestamp: Date.now()
        };
        localStorage.setItem('appState', JSON.stringify(state));
    }

    restorePreviousState() {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            const state = JSON.parse(savedState);
            const now = Date.now();
            const oneHour = 60 * 60 * 1000;
            
            // استعادة الحالة فقط إذا كانت أقل من ساعة
            if (now - state.timestamp < oneHour) {
                if (state.page === 'mangaDetailPage' && state.mangaId) {
                    // تحميل تفاصيل المانجا
                    const manga = mangaManager.mangaData[state.mangaId];
                    if (manga) {
                        mangaManager.showMangaDetail(state.mangaId, manga);
                    }
                } else if (state.page === 'chapterPage' && state.mangaId && state.chapterId) {
                    // تحميل الفصل
                    const manga = mangaManager.mangaData[state.mangaId];
                    if (manga && manga.chapters && manga.chapters[state.chapterId]) {
                        mangaManager.showChapter(state.mangaId, state.chapterId, manga.chapters[state.chapterId]);
                    }
                } else {
                    ui.navigateToPage(state.page);
                }
                return;
            }
        }
        ui.navigateToPage('homePage');
    }
}

// بدء التطبيق عندما يتم تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
