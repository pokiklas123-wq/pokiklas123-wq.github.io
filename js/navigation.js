class NavigationManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // العودة للصفحة الرئيسية
        document.getElementById('backToHome').addEventListener('click', () => {
            app.saveState('homePage');
            ui.navigateToPage('homePage');
        });

        // العودة لصفحة تفاصيل المانجا
        document.getElementById('backToManga').addEventListener('click', () => {
            const mangaId = mangaManager.getCurrentMangaId();
            app.saveState('mangaDetailPage', mangaId);
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
        if (mangaManager.mangaData) {
            let sortedManga = Object.keys(mangaManager.mangaData).map(key => {
                return { id: key, ...mangaManager.mangaData[key] };
            });

            switch (sortType) {
                case 'newest':
                    sortedManga.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    break;
                case 'popular':
                    sortedManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
                case 'oldest':
                    sortedManga.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    break;
                default:
                    break;
            }

            mangaManager.displaySortedManga(sortedManga);
        }
    }
}

const navigationManager = new NavigationManager();
