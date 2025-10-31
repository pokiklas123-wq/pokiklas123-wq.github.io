class MangaManager {
    constructor() {
        this.currentMangaId = null;
        this.mangaData = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        // البحث في الوقت الحقيقي
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterManga(e.target.value);
            });
        }
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
                
                // بعد تحميل البيانات، تحقق إذا كان هناك URL يحتاج معالجة
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    setTimeout(() => {
                        navigationManager.loadStateFromURL();
                    }, 100);
                }
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
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = '';

        Object.keys(mangaData).forEach(mangaId => {
            const manga = mangaData[mangaId];
            const mangaCard = this.createMangaCard(mangaId, manga);
            mangaGrid.appendChild(mangaCard);
        });
    }

    displaySortedManga(sortedManga) {
        const mangaGrid = document.getElementById('mangaGrid');
        if (!mangaGrid) return;
        
        mangaGrid.innerHTML = '';

        sortedManga.forEach(manga => {
            const mangaCard = this.createMangaCard(manga.id, manga);
            mangaGrid.appendChild(mangaCard);
        });
    }

    createMangaCard(mangaId, manga) {
        const card = document.createElement('div');
        card.className = 'manga-card';
        
        // استخدام صورة افتراضية إذا لم توجد صورة
        const thumbnail = manga.thumbnail || 'https://via.placeholder.com/300x400/1a1a1a/1a73e8?text=No+Image';
        
        card.innerHTML = `
            <img src="${thumbnail}" 
                 alt="${manga.name}" 
                 class="manga-thumbnail"
                 onerror="this.src='https://via.placeholder.com/300x400/1a1a1a/1a73e8?text=Error+Loading'">
            <div class="manga-info">
                <h3 class="manga-title">${manga.name || 'No Name'}</h3>
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

    filterManga(searchTerm) {
        const mangaCards = document.querySelectorAll('.manga-card');
        let visibleCount = 0;
        
        mangaCards.forEach(card => {
            const titleElement = card.querySelector('.manga-title');
            if (titleElement) {
                const title = titleElement.textContent.toLowerCase();
                if (title.includes(searchTerm.toLowerCase()) || searchTerm === '') {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        });

        const noResults = document.getElementById('noMangaMessage');
        if (noResults) {
            if (visibleCount === 0 && searchTerm !== '') {
                noResults.textContent = 'لا توجد نتائج للبحث';
                noResults.style.display = 'block';
            } else {
                noResults.style.display = 'none';
            }
        }
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
        
        // في دالة showMangaDetail، تأكد من هذا السطر:
navigationManager.navigateTo('mangaDetailPage', { mangaId: mangaId });


        ui.showLoading('loadingDetail');
        ui.hideElement('mangaDetailContent');

        try {
            // بناء واجهة تفاصيل المانجا
            const detailContent = document.getElementById('mangaDetailContent');
            detailContent.innerHTML = this.createMangaDetailHTML(mangaId, manga);

            // تحميل وعرض الفصول
            await this.loadChapters(mangaId, manga.chapters);

            // إعداد نظام التقييم
            this.setupRatingSystem(mangaId);

            ui.hideLoading('loadingDetail');
            ui.showElement('mangaDetailContent');
            navigationManager.navigateTo('mangaDetailPage', { mangaId: mangaId });
            
        } catch (error) {
            console.error('Error showing manga detail:', error);
            ui.hideLoading('loadingDetail');
        }
    }

    createMangaDetailHTML(mangaId, manga) {
        const thumbnail = manga.thumbnail || 'https://via.placeholder.com/320x450/1a1a1a/ffffff?text=No+Image';
        
        return `
            <div class="manga-detail">
                <div class="manga-detail-thumbnail">
                    <img src="${thumbnail}" 
                         alt="${manga.name}" 
                         id="detailThumbnail"
                         onerror="this.src='https://via.placeholder.com/320x450/1a1a1a/ffffff?text=Error+Loading'">
                </div>
                <div class="manga-detail-info">
                    <h1 class="manga-detail-title" id="detailTitle">${manga.name || 'No Name'}</h1>
                    
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
                            ${this.generateRatingStars()}
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

    generateRatingStars() {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<i class="far fa-star rating-star" data-rating="${i}"></i>`;
        }
        return starsHTML;
    }

    setupRatingSystem(mangaId) {
        const stars = document.querySelectorAll('.rating-star');
        if (!stars.length) return;

        // عرض تقييم المستخدم الحالي إذا كان موجوداً
        const userRating = ratingsManager.getUserRating(mangaId);
        if (userRating > 0) {
            this.highlightStars(userRating);
        }

        stars.forEach(star => {
            star.addEventListener('mouseover', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.highlightStars(rating);
            });

            star.addEventListener('mouseout', () => {
                const userRating = ratingsManager.getUserRating(mangaId);
                this.highlightStars(userRating);
            });

            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                ratingsManager.rateManga(mangaId, rating);
                this.highlightStars(rating);
            });
        });
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('active');
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    async loadChapters(mangaId, chaptersData) {
        const chaptersList = document.getElementById('chaptersList');
        if (!chaptersList) return;
        
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
        chaptersArray.sort((a, b) => {
            const numA = parseInt(a.chapter_name?.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.chapter_name?.replace(/[^0-9]/g, '')) || 0;
            return numB - numA;
        });

        chaptersArray.forEach(chapter => {
            const chapterItem = this.createChapterItem(mangaId, chapter.id, chapter);
            chaptersList.appendChild(chapterItem);
        });
    }

    createChapterItem(mangaId, chapterId, chapter) {
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.innerHTML = `
            <span>${chapter.chapter_name || 'الفصل غير معروف'}</span>
            <div>
                <span class="chapter-likes">
                    <i class="fas fa-heart"></i> ${chapter.chapter_like || 0}
                </span>
                <i class="fas fa-arrow-left"></i>
            </div>
        `;

        item.addEventListener('click', () => {
            this.showChapter(mangaId, chapterId, chapter);
        });

        return item;
    }

    async showChapter(mangaId, chapterId, chapter) {
        ui.showLoading('loadingChapter');
        ui.hideElement('chapterContent');
        
       

// في دالة showChapter، تأكد من هذا السطر:  
navigationManager.navigateTo('chapterPage', { 
    mangaId: mangaId, 
    chapterId: chapterId 
});



        try {
            // بناء واجهة الفصل
            const chapterContent = document.getElementById('chapterContent');
            chapterContent.innerHTML = this.createChapterHTML(chapter);

            // عرض صفحات المانجا
            await this.displayChapterPages(chapter);

            // تحميل التعليقات
            commentsManager.loadComments(mangaId, chapterId, chapter.comments);

            ui.hideLoading('loadingChapter');
            ui.showElement('chapterContent');
            navigationManager.navigateTo('chapterPage', { 
                mangaId: mangaId, 
                chapterId: chapterId 
            });
            
        } catch (error) {
            console.error('Error showing chapter:', error);
            ui.hideLoading('loadingChapter');
        }
    }

    createChapterHTML(chapter) {
        return `
            <div class="chapter-header">
                <h1 class="chapter-title">${chapter.chapter_name || 'الفصل غير معروف'}</h1>
                <p class="chapter-subtitle">${chapter.chapter_title || ''}</p>
                <p class="chapter-description">${chapter.description || ''}</p>
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
        if (!mangaPages) return;
        
        mangaPages.innerHTML = '';

        if (chapter.images && Array.isArray(chapter.images)) {
            chapter.images.forEach((imageUrl, index) => {
                const pageImg = document.createElement('img');
                pageImg.src = imageUrl;
                pageImg.alt = `صفحة ${index + 1}`;
                pageImg.className = 'manga-page';
                pageImg.loading = 'lazy';
                pageImg.onerror = function() {
                    this.src = 'https://via.placeholder.com/800x1200/1a1a1a/ffffff?text=Error+Loading+Page';
                };
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