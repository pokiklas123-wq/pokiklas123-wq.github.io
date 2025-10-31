class UI {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupSearch();
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const closeSearch = document.getElementById('closeSearch');
        
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
        
        closeSearch.addEventListener('click', () => {
            this.hideSearch();
            searchInput.value = '';
            this.handleSearch('');
        });
    }

    handleSearch(searchTerm) {
        const mangaCards = document.querySelectorAll('.manga-card');
        let visibleCount = 0;
        
        mangaCards.forEach(card => {
            const title = card.querySelector('.manga-title').textContent.toLowerCase();
            if (title.includes(searchTerm.toLowerCase()) || searchTerm === '') {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // إظهار رسالة إذا لم توجد نتائج
        const noResults = document.getElementById('noMangaMessage');
        if (visibleCount === 0 && searchTerm !== '') {
            noResults.textContent = 'لا توجد نتائج للبحث';
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
    }

    // ... باقي الدوال كما هي
}