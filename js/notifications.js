class NotificationsManager {
    constructor() {
        this.notifications = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // تحميل الإشعارات عند تسجيل الدخول
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.loadNotifications();
            } else {
                this.clearNotifications();
            }
        });
    }

    async loadNotifications() {
        if (!authManager.getCurrentUser()) return;

        try {
            const notificationsRef = database.ref(`notifications/${authManager.getCurrentUser().uid}`);
            const snapshot = await notificationsRef.once('value');
            this.notifications = snapshot.val() || {};
            this.displayNotifications();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    displayNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        notificationsList.innerHTML = '';

        if (Object.keys(this.notifications).length === 0) {
            notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
            return;
        }

        const notificationsArray = Object.keys(this.notifications).map(key => {
            return { id: key, ...this.notifications[key] };
        });

        notificationsArray.sort((a, b) => b.timestamp - a.timestamp);

        notificationsArray.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.read ? 'read' : 'unread'}`;
        
        let message = '';
        switch (notification.type) {
            case 'like':
                message = `${notification.fromUser} أعجب بتعليقك`;
                break;
            case 'reply':
                message = `${notification.fromUser} رد على تعليقك`;
                break;
            default:
                message = 'إشعار جديد';
        }

        element.innerHTML = `
            <div class="notification-content">
                <p>${message}</p>
                <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
            </div>
            <button class="notification-action" data-notification-id="${notification.id}">
                <i class="fas fa-arrow-left"></i>
            </button>
        `;

        element.addEventListener('click', () => {
            this.handleNotificationClick(notification);
        });

        return element;
    }

    async handleNotificationClick(notification) {
        // وضع الإشعار كمقروء
        await this.markAsRead(notification.id);
        
        // التنقل إلى المحتوى ذي الصلة
        if (notification.mangaId && notification.chapterId) {
            const manga = mangaManager.mangaData[notification.mangaId];
            if (manga) {
                app.saveState('chapterPage', notification.mangaId, notification.chapterId);
                mangaManager.showChapter(notification.mangaId, notification.chapterId, manga.chapters[notification.chapterId]);
            }
        }
    }

    async markAsRead(notificationId) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}/read`).set(true);
            await this.loadNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    formatTime(timestamp) {
        // نفس دالة تنسيق الوقت في comments.js
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
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
        }
    }
}

const notificationsManager = new NotificationsManager();
