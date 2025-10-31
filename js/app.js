// التطبيق الرئيسي
class App {
    constructor() {
        this.init();
    }

    init() {
        // تهيئة جميع المكونات
        this.setupEventListeners();
        
        // تحميل البيانات الأولية
        this.loadInitialData();
    }

    setupEventListeners() {
        // إعداد مستمعي الأحداث للتعليقات
        document.addEventListener('click', (e) => {
            if (e.target.id === 'submitComment' || e.target.closest('#submitComment')) {
                commentsManager.submitComment();
            }
        });
    }

    async loadInitialData() {
        // تحميل قائمة المانجا
        await mangaManager.loadMangaList();
        
        // تحميل تقييمات المستخدم إذا كان مسجلاً
        if (authManager.getCurrentUser()) {
            await ratingsManager.loadUserRatings();
        }
    }
}

// بدء التطبيق عندما يتم تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new App();
});