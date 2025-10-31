// التطبيق الرئيسي
class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // تهيئة جميع المكونات
            this.setupEventListeners();
            
            // تحميل حالة التنقل من URL
            navigationManager.loadState();
            
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

        // إعداد الأزرار الأساسية - استخدام نظام التنقل الجديد
        document.getElementById('backToHome').addEventListener('click', () => {
            navigationManager.goBack();
        });

        document.getElementById('backToManga').addEventListener('click', () => {
            navigationManager.goBack();
        });

        // إضافة زر رجوع افتراضي للهواتف
        this.setupMobileBackButton();
    }

    setupMobileBackButton() {
        // إضافة زر رجوع للهواتف إذا لزم الأمر
        if (window.innerWidth <= 768) {
            this.createMobileBackButton();
        }
    }

    createMobileBackButton() {
        const backButton = document.createElement('button');
        backButton.className = 'mobile-back-btn';
        backButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
        backButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--accent-color);
            color: white;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
        `;
        
        backButton.addEventListener('click', () => {
            navigationManager.goBack();
        });

        document.body.appendChild(backButton);

        // إظهار الزر فقط عندما يمكن العودة للخلف
        setInterval(() => {
            backButton.style.display = navigationManager.canGoBack() ? 'block' : 'none';
        }, 100);
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