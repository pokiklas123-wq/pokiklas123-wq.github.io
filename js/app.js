// التطبيق الرئيسي
class App {
    constructor() {
        this.init();
    }

    init() {
        // تهيئة جميع المكونات
        commentsManager.setupEventListeners();
        
        // تحميل البيانات الأولية
        this.loadInitialData();
        
        // إعداد مستمعي الحالة
        this.setupStateListeners();
    }

    async loadInitialData() {
        // تحميل قائمة المانجا
        await mangaManager.loadMangaList();
        
        // تحميل تقييمات المستخدم إذا كان مسجلاً
        if (authManager.getCurrentUser()) {
            await ratingsManager.loadUserRatings();
        }
    }

    setupStateListeners() {
        // تحديث الواجهة عند تغير حالة المصادقة
        auth.onAuthStateChanged((user) => {
            if (user) {
                ratingsManager.loadUserRatings();
            }
        });
    }
}

// بدء التطبيق عندما يتم تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    new App();
});