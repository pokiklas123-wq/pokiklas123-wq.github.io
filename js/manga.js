// [file name]: manga.js
class MangaManager {
    constructor() {
        this.currentMangaId = null;
        this.currentChapterId = null;
        this.mangaData = {};
        this.setupEventListeners();
        this.init();
    }

    init() {
        this.loadMangaList();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterManga(e.target.value);
            });
        }

        document.getElementById('backToHome')?.addEventListener('click', () => {
            this.goBack();
        });

        document.getElementById('backToManga')?.addEventListener('click', () => {
            this.goBack();
        });
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
                
                setTimeout(() => {
                    this.handleInitialNavigation();
                }, 500);
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

    handleInitialNavigation() {
        const hash = window.location.hash;
        if (hash) {
            const path = hash.replace('#', '');
            const parts = path.split('/');
            
            if (parts[0] === 'manga' && parts[1]) {
                const mangaId = parts[1];
                if (parts[2] === 'chapter' && parts[3]) {
                    const chapterId = parts[3];
                    this.loadChapterFromURL(mangaId, chapterId);
                } else {
                    this.loadMangaFromURL(mangaId);
                }
            }
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

        if (sortedManga.length === 0) {
            mangaGrid.innerHTML = '<p class="no-manga">لا توجد مانجا متاحة</p>';
            return;
        }

        sortedManga.forEach(manga => {
            const mangaCard = this.createMangaCard(manga.id, manga);
            mangaGrid.appendChild(mangaCard);
        });
    }

    createMangaCard(mangaId, manga) {
        const card = document.createElement('div');
        card.className = 'manga-card';
        
        const thumbnail = manga.thumbnail || 'https://via.placeholder.com/300x400/1a1a1a/1a73e8?text=No+Image';
        const rating = manga.rating || 0;
        const views = manga.views || 0;
        
        card.innerHTML = `
            <img src="${thumbnail}" 
                 alt="${manga.name}" 
                 class="manga-thumbnail"
                 onerror="this.src='https://via.placeholder.com/300x400/1a1a1a/1a73e8?text=Error+Loading'">
            <div class="manga-info">
                <h3 class="manga-title">${manga.name || 'No Name'}</h3>
                <div class="manga-rating">
                    <span class="rating-value">${rating.toFixed(1)}</span>
                    <div class="stars">
                        ${this.generateStars(rating)}
                    </div>
                </div>
                <div class="manga-views">
                    <i class="fas fa-eye"></i>
                    ${views} مشاهدة
                </div>
                ${manga.status ? `<div class="manga-status ${manga.status}">${this.getStatusText(manga.status)}</div>` : ''}
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

    getStatusText(status) {
        const statusMap = {
            'ongoing': 'مستمرة',
            'completed': 'مكتملة',
            'hiatus': 'متوقفة'
        };
        return statusMap[status] || status;
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

    async showMangaDetail(mangaId, manga) {
        this.currentMangaId = mangaId;
        
        ui.showLoading('loadingDetail');
        ui.hideElement('mangaDetailContent');

        try {
            const detailContent = document.getElementById('mangaDetailContent');
            detailContent.innerHTML = this.createMangaDetailHTML(mangaId, manga);

            await this.loadChapters(mangaId, manga.chapters);
            this.setupRatingSystem(mangaId);
            await this.incrementViews(mangaId);

            ui.hideLoading('loadingDetail');
            ui.showElement('mangaDetailContent');
            ui.navigateToPage('mangaDetailPage');
            
            // تحديث الـ URL
            window.history.pushState({}, '', `#manga/${mangaId}`);
            
        } catch (error) {
            console.error('Error showing manga detail:', error);
            ui.hideLoading('loadingDetail');
            ui.showAuthMessage('حدث خطأ في تحميل التفاصيل', 'error');
        }
    }

    createMangaDetailHTML(mangaId, manga) {
        const thumbnail = manga.thumbnail || 'https://via.placeholder.com/320x450/1a1a1a/ffffff?text=No+Image';
        const rating = manga.rating || 0;
        const views = manga.views || 0;
        
        return `
            <div class="manga-detail">
                <div class="manga-detail-thumbnail">
                    <img src="${thumbnail}" 
                         alt="${manga.name}" 
                         onerror="this.src='https://via.placeholder.com/320x450/1a1a1a/ffffff?text=Error+Loading'">
                </div>
                <div class="manga-detail-info">
                    <h1 class="manga-detail-title">${manga.name || 'No Name'}</h1>
                    
                    <div class="manga-detail-meta">
                        <div class="meta-item">
                            <span class="meta-label">التقييم:</span>
                            <span class="meta-value">
                                <span class="rating-value">${rating.toFixed(1)}</span>
                                <div class="stars">${this.generateStars(rating)}</div>
                            </span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">المشاهدات:</span>
                            <span class="meta-value">
                                <i class="fas fa-eye"></i> ${views}
                            </span>
                        </div>
                        ${manga.status ? `
                        <div class="meta-item">
                            <span class="meta-label">الحالة:</span>
                            <span class="meta-value status ${manga.status}">${this.getStatusText(manga.status)}</span>
                        </div>
                        ` : ''}
                        ${manga.author ? `
                        <div class="meta-item">
                            <span class="meta-label">المؤلف:</span>
                            <span class="meta-value">${manga.author}</span>
                        </div>
                        ` : ''}
                        ${manga.genres ? `
                        <div class="meta-item">
                            <span class="meta-label">التصنيفات:</span>
                            <span class="meta-value">${manga.genres.join('، ')}</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="rating-section">
                        <h3>قيم المانجا</h3>
                        <div class="rating-stars">
                            ${this.generateRatingStars()}
                        </div>
                    </div>

                    <div class="manga-detail-description">
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

        const chaptersArray = Object.keys(chaptersData).map(key => {
            return { id: key, ...chaptersData[key] };
        });

        chaptersArray.sort((a, b) => {
            const numA = parseInt(a.chapter_number) || parseInt(a.chapter_name?.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.chapter_number) || parseInt(b.chapter_name?.replace(/[^0-9]/g, '')) || 0;
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
        const chapterNumber = chapter.chapter_number || chapter.chapter_name?.replace(/[^0-9]/g, '') || '؟';
        
        item.innerHTML = `
            <div class="chapter-info">
                <span class="chapter-name">${chapter.chapter_name || `الفصل ${chapterNumber}`}</span>
                ${chapter.chapter_title ? `<span class="chapter-subtitle">${chapter.chapter_title}</span>` : ''}
            </div>
            <div class="chapter-meta">
                <span class="chapter-likes">
                    <i class="fas fa-heart"></i> ${chapter.chapter_like || 0}
                </span>
                <span class="chapter-date">${this.formatDate(chapter.timestamp)}</span>
                <i class="fas fa-arrow-left chapter-arrow"></i>
            </div>
        `;

        item.addEventListener('click', () => {
            this.showChapter(mangaId, chapterId, chapter);
        });

        return item;
    }

    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('ar-SA');
    }

    async showChapter(mangaId, chapterId, chapter) {
        this.currentMangaId = mangaId;
        this.currentChapterId = chapterId;
        
        ui.showLoading('loadingChapter');
        ui.hideElement('chapterContent');

        try {
            const chapterContent = document.getElementById('chapterContent');
            chapterContent.innerHTML = this.createChapterHTML(mangaId, chapterId, chapter);

            await this.displayChapterPages(chapter);
            await commentsManager.loadComments(mangaId, chapterId);

            ui.hideLoading('loadingChapter');
            ui.showElement('chapterContent');
            ui.navigateToPage('chapterPage');
            
            // تحديث الـ URL
            window.history.pushState({}, '', `#manga/${mangaId}/chapter/${chapterId}`);
            
        } catch (error) {
            console.error('Error showing chapter:', error);
            ui.hideLoading('loadingChapter');
            ui.showAuthMessage('حدث خطأ في تحميل الفصل', 'error');
        }
    }

    createChapterHTML(mangaId, chapterId, chapter) {
        const chapterNumber = chapter.chapter_number || chapter.chapter_name?.replace(/[^0-9]/g, '') || '؟';
        
        return `
            <div class="chapter-header">
                <div class="chapter-title-section">
                    <h1 class="chapter-title">${chapter.chapter_name || `الفصل ${chapterNumber}`}</h1>
                    ${chapter.chapter_title ? `<p class="chapter-subtitle">${chapter.chapter_title}</p>` : ''}
                    ${chapter.description ? `<p class="chapter-description">${chapter.description}</p>` : ''}
                </div>
                <div class="chapter-actions">
                    <button class="btn like-chapter-btn" data-manga-id="${mangaId}" data-chapter-id="${chapterId}">
                        <i class="fas fa-heart"></i>
                        <span class="like-count">${chapter.chapter_like || 0}</span>
                    </button>
                    <button class="btn share-btn">
                        <i class="fas fa-share"></i> مشاركة
                    </button>
                </div>
            </div>
            
            <div class="chapter-navigation">
                <button class="btn prev-chapter" id="prevChapter">الفصل السابق</button>
                <button class="btn next-chapter" id="nextChapter">الفصل التالي</button>
            </div>
            
            <div class="manga-pages" id="mangaPages"></div>
            
            <div class="comments-section">
                <h3>التعليقات (${this.getCommentsCount(chapter)})</h3>
                <div class="comment-form">
                    <textarea class="comment-input" id="commentInput" placeholder="اكتب تعليقك هنا..."></textarea>
                    <button class="btn submit-comment-btn" id="submitComment">إرسال التعليق</button>
                </div>
                <div class="comments-list" id="commentsList"></div>
            </div>
        `;
    }

    getCommentsCount(chapter) {
        if (!chapter.comments) return 0;
        return Object.keys(chapter.comments).length;
    }

    async displayChapterPages(chapter) {
        const mangaPages = document.getElementById('mangaPages');
        if (!mangaPages) return;
        
        mangaPages.innerHTML = '';

        if (chapter.images && Array.isArray(chapter.images)) {
            chapter.images.forEach((imageUrl, index) => {
                const pageContainer = document.createElement('div');
                pageContainer.className = 'page-container';
                
                const pageImg = document.createElement('img');
                pageImg.src = imageUrl;
                pageImg.alt = `صفحة ${index + 1}`;
                pageImg.className = 'manga-page';
                pageImg.loading = 'lazy';
                pageImg.onerror = function() {
                    this.src = 'https://via.placeholder.com/800x1200/1a1a1a/ffffff?text=Error+Loading+Page';
                };
                
                const pageNumber = document.createElement('div');
                pageNumber.className = 'page-number';
                pageNumber.textContent = `صفحة ${index + 1}`;
                
                pageContainer.appendChild(pageImg);
                pageContainer.appendChild(pageNumber);
                mangaPages.appendChild(pageContainer);
            });
        } else {
            mangaPages.innerHTML = '<p class="no-pages">لا توجد صفحات متاحة</p>';
        }
    }

    async incrementViews(mangaId) {
        try {
            const mangaRef = database.ref(`manga_list/${mangaId}`);
            const snapshot = await mangaRef.once('value');
            const manga = snapshot.val();
            
            const currentViews = manga.views || 0;
            await mangaRef.update({ views: currentViews + 1 });
            
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    }

    async loadMangaFromURL(mangaId) {
        if (this.mangaData[mangaId]) {
            const manga = this.mangaData[mangaId];
            this.showMangaDetail(mangaId, manga);
        }
    }

    async loadChapterFromURL(mangaId, chapterId) {
        if (this.mangaData[mangaId] && this.mangaData[mangaId].chapters && this.mangaData[mangaId].chapters[chapterId]) {
            const manga = this.mangaData[mangaId];
            const chapter = manga.chapters[chapterId];
            this.showChapter(mangaId, chapterId, chapter);
        }
    }

    goBack() {
        const currentPage = document.querySelector('.page.active').id;
        
        if (currentPage === 'chapterPage') {
            ui.navigateToPage('mangaDetailPage');
            window.history.pushState({}, '', `#manga/${this.currentMangaId}`);
        } else if (currentPage === 'mangaDetailPage') {
            ui.navigateToPage('homePage');
            window.history.pushState({}, '', '#');
        } else {
            ui.navigateToPage('homePage');
        }
    }

    // دالة للبحث المتقدم
    advancedSearch(filters) {
        const { genre, status, sortBy } = filters;
        let filteredManga = Object.keys(this.mangaData).map(key => {
            return { id: key, ...this.mangaData[key] };
        });

        if (genre && genre !== 'all') {
            filteredManga = filteredManga.filter(manga => 
                manga.genres && manga.genres.includes(genre)
            );
        }

        if (status && status !== 'all') {
            filteredManga = filteredManga.filter(manga => 
                manga.status === status
            );
        }

        if (sortBy) {
            switch (sortBy) {
                case 'views':
                    filteredManga.sort((a, b) => (b.views || 0) - (a.views || 0));
                    break;
                case 'rating':
                    filteredManga.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                case 'newest':
                    filteredManga.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    break;
                case 'oldest':
                    filteredManga.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    break;
            }
        }

        this.displaySortedManga(filteredManga);
    }

    getCurrentMangaId() {
        return this.currentMangaId;
    }

    getCurrentChapterId() {
        return this.currentChapterId;
    }
}

const mangaManager = new MangaManager();