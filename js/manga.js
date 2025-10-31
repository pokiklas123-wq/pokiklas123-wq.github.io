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

        // بناء واجهة تفاصيل المانجا
        const detailContent = document.getElementById('mangaDetailContent');
        detailContent.innerHTML = this.createMangaDetailHTML(mangaId, manga);

        // تحميل وعرض الفصول
        await this.loadChapters(mangaId, manga.chapters);

        // إعداد نظام التقييم
        this.setupRatingSystem(mangaId);

        ui.hideLoading('loadingDetail');
        ui.showElement('mangaDetailContent');
        ui.navigateToPage('mangaDetailPage');
    }

    createMangaDetailHTML(mangaId, manga) {
        return `
            <div class="manga-detail">
                <div class="manga-detail-thumbnail">
                    <img src="${manga.thumbnail || 'https://via.placeholder.com/320x450/1a1a1a/ffffff?text=صورة+المانجا'}" 
                         alt="${manga.name}" id="detailThumbnail">
                </div>
                <div class="manga-detail-info">
                    <h1 class="manga-detail-title" id="detailTitle">${manga.name}</h1>
                    
                    <div class="manga-detail-meta">
                        <div class="manga-rating">
                            <span id="detailRating">${manga.rating || '0.0'}</span>
                            <div class="stars" id="detailStars">
                                ${this.generateStars(manga.rating || 0)}
                            </div>
                        </div>
                        <div class="manga-views">
                            <i class="fas fa-eye"></i>
                            <span id="detailViews">${manga.views || 0}</span> مشاهدة
                        </div>
                    </div>

                    <div class="rating-section">
                        <h3>قيم المانجا</h3>
                        <div class="rating-stars">
                            <i class="far fa-star rating-star" data-rating="1"></i>
                            <i class="far fa-star rating-star" data-rating="2"></i>
                            <i class="far fa-star rating-star" data-rating="3"></i>
                            <i class="far fa-star rating-star" data-rating="4"></i>
                            <i class="far fa-star rating-star" data-rating="5"></i>
                        </div>
                    </div>

                    <div class="manga-detail-description" id="detailDescription">
                        ${manga.description || 'لا يوجد وصف متاح.'}
                    </div>
                </div>
            </div>
            
            <div class="chapters-list">
                <h3>الفصول</h3>
                <div id="chaptersList"></div>
            </div>
        `;
    }

    setupRatingSystem(mangaId) {
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                if (!authManager.getCurrentUser()) {
                    ui.showAuthMessage('يجب تسجيل الدخول لتقييم المانجا', 'error');
                    ui.toggleAuthModal(true);
                    return;
                }

                const rating = parseInt(star.dataset.rating);
                ratingsManager.rateManga(mangaId, rating);
                
                // تحديث النجوم
                stars.forEach((s, index) => {
                    if (index < rating) {
                        s.classList.remove('far');
                        s.classList.add('fas', 'active');
                    } else {
                        s.classList.remove('fas', 'active');
                        s.classList.add('far');
                    }
                });
            });
        });
    }

    async loadChapters(mangaId, chaptersData) {
        const chaptersList = document.getElementById('chaptersList');
        chaptersList.innerHTML = '';

        if (!chaptersData || Object.keys(chaptersData).length === 0) {
            chaptersList.innerHTML = '<p class="no-chapters">لا توجد فصول متاحة</p>';
            return;
        }

        // تحويل الفصول إلى مصفوفة وترتيبها
        const chaptersArray = Object.keys(chaptersData).map(key => {
            return { id: key, ...chaptersData[key] };
        });

        // ترتيب الفصول تنازلياً (الأحدث أولاً)
        chaptersArray.sort((a, b) => b.id.localeCompare(a.id));

        chaptersArray.forEach(chapter => {
            const chapterItem = this.createChapterItem(mangaId, chapter.id, chapter);
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

        // بناء واجهة الفصل
        const chapterContent = document.getElementById('chapterContent');
        chapterContent.innerHTML = this.createChapterHTML(chapter);

        // عرض صفحات المانجا
        await this.displayChapterPages(chapter);

        // تحميل التعليقات
        commentsManager.loadComments(mangaId, chapterId, chapter.comments);

        // إعداد حدث إرسال التعليق
        document.getElementById('submitComment').addEventListener('click', () => {
            commentsManager.submitComment();
        });

        ui.hideLoading('loadingChapter');
        ui.showElement('chapterContent');
        ui.navigateToPage('chapterPage');
    }

    createChapterHTML(chapter) {
        return `
            <div class="chapter-header">
                <h1 class="chapter-title">${chapter.chapter_name}</h1>
                <p class="chapter-subtitle">${chapter.chapter_title || ''}</p>
            </div>
            
            <div class="manga-pages" id="mangaPages"></div>
            
            <div class="comments-section">
                <h3>التعليقات</h3>
                <div class="comment-form">
                    <textarea class="comment-input" id="commentInput" placeholder="اكتب تعليقك هنا..."></textarea>
                    <button class="btn" id="submitComment">إرسال التعليق</button>
                </div>
                <div class="comments-list" id="commentsList"></div>
            </div>
        `;
    }

    async displayChapterPages(chapter) {
        const mangaPages = document.getElementById('mangaPages');
        mangaPages.innerHTML = '';

        if (chapter.images && Array.isArray(chapter.images)) {
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