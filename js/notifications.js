class NotificationsManager {
    constructor() {
        this.notifications = {};
        this.notificationsRef = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.listenForNotifications();
            } else {
                this.clearNotifications();
            }
        });
        
        // مستمع للنقر على الإشعارات في القائمة الجانبية
        document.getElementById('notificationsList').addEventListener('click', (e) => {
            const notificationElement = e.target.closest('.notification');
            if (notificationElement) {
                const notificationId = notificationElement.dataset.notificationId;
                const notification = this.notifications[notificationId];
                if (notification) {
                    this.handleNotificationClick(notificationId, notification);
                }
            }
        });
    }

    listenForNotifications() {
        if (!authManager.getCurrentUser()) {
            this.clearNotifications();
            return;
        }

        // إزالة المستمع القديم لمنع التكرار
        if (this.notificationsRef) {
            this.notificationsRef.off('value');
        }

        const userId = authManager.getCurrentUser().uid;
        this.notificationsRef = database.ref(`notifications/${userId}`);

        // استخدام on('value') لتحديث الإشعارات تلقائياً
        this.notificationsRef.on('value', (snapshot) => {
            this.notifications = snapshot.val() || {};
            this.displayNotifications();
        }, (error) => {
            console.error('Error listening for notifications:', error);
            this.clearNotifications();
        });
    }

    displayNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        notificationsList.innerHTML = '';

        const notificationsArray = Object.keys(this.notifications).map(key => {
            return { id: key, ...this.notifications[key] };
        });

        if (notificationsArray.length === 0) {
            notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
            return;
        }

        // ترتيب الإشعارات من الأحدث إلى الأقدم
        notificationsArray.sort((a, b) => b.timestamp - a.timestamp);

        notificationsArray.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });

        console.log('تم عرض الإشعارات:', notificationsArray.length);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.read ? 'read' : 'unread'}`;
        element.dataset.notificationId = notification.id;
        
        let message = '';
        let icon = '';
        
        switch (notification.type) {
            case 'like':
                message = `أعجب ${notification.fromUser} بتعليقك`;
                icon = 'fas fa-heart';
                break;
            case 'reply':
                message = `رد ${notification.fromUser} على تعليقك في ${notification.mangaTitle} - ${notification.chapterTitle}`;
                icon = 'fas fa-reply';
                break;
            default:
                message = 'إشعار جديد';
                icon = 'fas fa-bell';
        }

        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-text">
                    <p class="notification-message">${message}</p>
                    ${notification.replyText ? `<p class="notification-preview">"${notification.replyText}"</p>` : ''}
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                </div>
            </div>
            <button class="notification-action" data-notification-id="${notification.id}">
                <i class="fas fa-arrow-left"></i>
            </button>
        `;

        return element;
    }

    async handleNotificationClick(notificationId, notification) {
        // وضع الإشعار كمقروء
        await this.markAsRead(notificationId);
        
        // التنقل إلى المحتوى ذي الصلة
        if (notification.mangaId && notification.chapterId) {
            // 1. التأكد من تحميل بيانات المانجا
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            const manga = mangaManager.mangaData[notification.mangaId];
            if (manga && manga.chapters && manga.chapters[notification.chapterId]) {
                
                // 2. الانتقال إلى صفحة الفصل
                // نستخدم showChapter مباشرة لأنه يتضمن navigateTo
                await mangaManager.showChapter(
                    notification.mangaId, 
                    notification.chapterId, 
                    manga.chapters[notification.chapterId]
                );
                
                // 3. إغلاق القائمة الجانبية
                ui.closeDrawer();
                
                // 4. التمرير إلى التعليق المحدد
                if (notification.commentId) {
                    // الانتظار قليلاً لضمان تحميل التعليقات في DOM
                    setTimeout(() => {
                        const commentElement = document.querySelector(`.comment[data-comment-id="${notification.commentId}"]`);
                        if (commentElement) {
                            commentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // يمكن إضافة تأثير بصري هنا لتسليط الضوء على التعليق
                            commentElement.classList.add('highlight');
                            setTimeout(() => {
                                commentElement.classList.remove('highlight');
                            }, 3000);
                        }
                    }, 500); 
                }
            } else {
                console.warn('المانجا أو الفصل غير موجود للإشعار:', notification.mangaId, notification.chapterId);
                ui.showAuthMessage('المانجا أو الفصل غير متاح حالياً', 'error');
            }
        } else {
            console.warn('بيانات الإشعار غير مكتملة:', notification);
        }
    }

    async markAsRead(notificationId) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}`).update({ read: true });
            // التحديث سيتم تلقائياً بفضل on('value')
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return 'منذ وقت';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    clearNotifications() {
        if (this.notificationsRef) {
            this.notificationsRef.off('value');
        }
        this.notifications = {};
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
        }
    }
}

const notificationsManager = new NotificationsManager();
