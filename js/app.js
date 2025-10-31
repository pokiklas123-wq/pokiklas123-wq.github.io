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
            
            console.log('التطبيق بدأ بنجاح');
        } catch (error) {
            console.error('خطأ في بدء التطبيق:', error);
        }
    }

    setupEventListeners() {
        // إعداد مستمعي الأحداث للتعليقات
        document.addEventListener('click', (e) => {
            if (e.target.id === 'submitComment' || e.target.closest('#submitComment')) {
                commentsManager.submitComment();
            }
        });

        // إعداد الأزرار الأساسية
        document.getElementById('backToHome').addEventListener('click', () => {
            ui.navigateToPage('homePage');
        });

        document.getElementById('backToManga').addEventListener('click', () => {
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
}

// بدء التطبيق عندما يتم تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new App();
});