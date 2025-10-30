class MangaManager {
    constructor() {
        this.currentMangaId = null;
        this.mangaData = {};
    }

    async loadMangaList() {
        try {
            ui.showLoading('loadingHome');
            ui.hideElement('mangaGrid');
            ui.hideElement('noMangaMessage');

            const snapshot = await database.ref('manga_list').once('value');
            this.mangaData = snapshot.val();

            if (this.mangaData && Object.keys(this.mangaData).length > 0) {
                this.displayMangaList(this.mangaData);
                ui.hideLoading('loadingHome');
                ui.showElement('mangaGrid');
            } else {
                ui.hideLoading('loadingHome');
                ui.showElement('noMangaMessage');
            }
        } catch (error) {
            console.error('Error loading manga:', error);
            ui.hideLoading('loadingHome');
            ui.showElement('noMangaMessage');
        }
    }

    displayMangaList(mangaData) {
        const mangaGrid = document.getElementById('mangaGrid');
        mangaGrid.innerHTML = '';

        Object.keys(mangaData).forEach(mangaId => {
            const manga = mangaData[mangaId];
            const mangaCard = this.createMangaCard(mangaId, manga);
            mangaGrid.appendChild(mangaCard);
        });
    }

    createMangaCard(mangaId, manga) {
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.innerHTML = `
            <img src="${manga.thumbnail || 'https://via.placeholder.com/300x400/1a1a1a/1a73e8?text=صورة+المانجا'}" 
                 alt="${manga.name}" class="manga-thumbnail">
            <div class="manga-info">
                <h3 class="manga-title">${manga.name}</h3>
                <div class="manga-rating">
                    <span>${manga.rating || '0.0'}</span>
                    <div class="stars">
                        ${this.generateStars(manga.rating || 0)}
                    </div>
                </div>
                <div class="manga-views">
                    <i class="fas fa-eye"></i>
                    ${manga.views || 0} مشاهدة
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            this.showMangaDetail(mangaId, manga);
        });

        return card;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let starsHTML = '';
        
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        if (halfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return starsHTML;
    }

    async showMangaDetail(mangaId, manga) {
        this.currentMangaId = mangaId;
        
        ui.showLoading('loadingDetail');
        ui.hideElement('mangaDetailContent');

        // تحديث واجهة التفاصيل
        document.getElementById('detailThumbnail').src = manga.thumbnail || 'https://via.placeholder.com/320x450/1a1a1a/ffffff?text=صورة+المانجا';
        document.getElementById('detailTitle').textContent = manga.name;
        document.getElementById('detailRating').textContent = manga.rating || '0.0';
        document.getElementById('detailViews').textContent = manga.views || 0;
        document.getElementById('detailDescription').textContent = manga.description || 'لا يوجد وصف متاح.';

        // تحديث النجوم
        const starsContainer = document.getElementById('detailStars');
        starsContainer.innerHTML = this.generateStars(manga.rating || 0);

        // تحميل وعرض الفصول
        await this.loadChapters(mangaId, manga.chapters);

        ui.hideLoading('loadingDetail');
        ui.showElement('mangaDetailContent');
        ui.navigateToPage('mangaDetailPage');
    }

    async loadChapters(mangaId, chaptersData) {
        const chaptersList = document.getElementById('chaptersList');
        chaptersList.innerHTML = '';

        if (!chaptersData || Object.keys(chaptersData).length === 0) {
            chaptersList.innerHTML = '<p class="no-chapters">لا توجد فصول متاحة</p>';
            return;
        }

        Object.keys(chaptersData).forEach(chapterId => {
            const chapter = chaptersData[chapterId];
            const chapterItem = this.createChapterItem(mangaId, chapterId, chapter);
            chaptersList.appendChild(chapterItem);
        });
    }

    createChapterItem(mangaId, chapterId, chapter) {
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.innerHTML = `
            <span>${chapter.chapter_name}</span>
            <i class="fas fa-arrow-left"></i>
        `;

        item.addEventListener('click', () => {
            this.showChapter(mangaId, chapterId, chapter);
        });

        return item;
    }

    async showChapter(mangaId, chapterId, chapter) {
        ui.showLoading('loadingChapter');
        ui.hideElement('chapterContent');

        // تحديث واجهة الفصل
        document.getElementById('chapterTitle').textContent = chapter.chapter_name;

        // عرض صفحات المانجا
        await this.displayChapterPages(chapter);

        // تحميل التعليقات
        commentsManager.loadComments(mangaId, chapterId, chapter.comments);

        ui.hideLoading('loadingChapter');
        ui.showElement('chapterContent');
        ui.navigateToPage('chapterPage');
    }

    async displayChapterPages(chapter) {
        const mangaPages = document.getElementById('mangaPages');
        mangaPages.innerHTML = '';

        if (chapter.images && chapter.images.length > 0) {
            chapter.images.forEach((imageUrl, index) => {
                const pageImg = document.createElement('img');
                pageImg.src = imageUrl;
                pageImg.alt = `صفحة ${index + 1}`;
                pageImg.className = 'manga-page';
                pageImg.loading = 'lazy';
                mangaPages.appendChild(pageImg);
            });
        } else {
            mangaPages.innerHTML = '<p class="no-pages">لا توجد صفحات متاحة</p>';
        }
    }

    getCurrentMangaId() {
        return this.currentMangaId;
    }
}

const mangaManager = new MangaManager();