class NavigationManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // العودة للصفحة الرئيسية
        document.getElementById('backToHome').addEventListener('click', () => {
            ui.navigateToPage('homePage');
        });

        // العودة لصفحة تفاصيل المانجا
        document.getElementById('backToManga').addEventListener('click', () => {
            ui.navigateToPage('mangaDetailPage');
        });

        // التنقل بين التصنيفات
        document.querySelectorAll('.categories-list li').forEach(item => {
            item.addEventListener('click', () => {
                const sortType = item.dataset.sort;
                this.sortManga(sortType);
                ui.toggleDrawer(false);
            });
        });
    }

    sortManga(sortType) {
        // سيتم تطبيق الفرز لاحقاً
        console.log('Sorting by:', sortType);
    }
}

const navigationManager = new NavigationManager();