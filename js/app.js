class App {
    constructor() {
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            
            // تحميل البيانات الأولية أولاً
            await this.loadInitialData();
            
            // ثم تحميل حالة التنقل من المسار (URL)
            navigationManager.loadStateFromURL();
            
            console.log('التطبيق بدأ بنجاح');
        } catch (error) {
            console.error('خطأ في بدء التطبيق:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('backToHome').addEventListener('click', () => {
            navigationManager.goBack();
        });

        document.getElementById('backToManga').addEventListener('click', () => {
            navigationManager.goBack();
        });

        this.setupMobileBackButton();
    }

    setupMobileBackButton() {
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

        // يجب تحديث هذه الدالة لتعمل مع History API
        // حالياً لا يوجد دالة canGoBack في navigationManager الجديد
        // يمكننا إزالتها مؤقتاً أو تعديلها لاحقاً
        // setInterval(() => {
        //     backButton.style.display = navigationManager.canGoBack() ? 'block' : 'none';
        // }, 100);
    }

    async loadInitialData() {
        try {
            // تحميل بيانات المانجا أولاً
            await mangaManager.loadMangaList();
            
            // إزالة منطق الهاش القديم
            // setTimeout(() => {
            //     if (window.location.hash && window.location.hash !== '#') {
            //         navigationManager.loadStateFromURL();
            //     }
            // }, 500);
            
            if (authManager.getCurrentUser()) {
                await ratingsManager.loadUserRatings();
                await notificationsManager.loadNotifications();
            }
        } catch (error) {
            console.error('خطأ في تحميل البيانات الأولية:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
