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

	        // مستمع لزر الإشعارات في القائمة الجانبية
	        document.getElementById('drawerNotificationsBtn').addEventListener('click', () => {
	            navigationManager.navigateTo(navigationManager.getNotificationsPath());
	            ui.closeDrawer();
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
	        
	        // التنقل إلى المحتوى ذي الصلة باستخدام نظام التوجيه الجديد
	        if (notification.mangaId && notification.chapterId) {
	            const path = navigationManager.getChapterPath(notification.mangaId, notification.chapterId);
	            
	            // إضافة بيانات التعليق إلى حالة التنقل للتمرير إليه لاحقاً
	            const data = notification.commentId ? { commentId: notification.commentId } : {};
	            
	            navigationManager.navigateTo(path, data);
	            ui.closeDrawer();
	            
	            // ملاحظة: التمرير إلى التعليق سيتم تنفيذه في دالة showChapter بعد تحميل الفصل
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

	    showNotificationsPage() {
	        ui.navigateToPage('notificationsPage');
	        const notificationsContent = document.getElementById('notificationsContent');
	        if (!notificationsContent) return;

	        if (authManager.getCurrentUser()) {
	            // عرض الإشعارات في صفحة الإشعارات
	            const notificationsArray = Object.keys(this.notifications).map(key => {
	                return { id: key, ...this.notifications[key] };
	            });
	            notificationsArray.sort((a, b) => b.timestamp - a.timestamp);

	            notificationsContent.innerHTML = '';
	            if (notificationsArray.length === 0) {
	                notificationsContent.innerHTML = '<p class="status-message status-info">لا توجد إشعارات حالياً.</p>';
	            } else {
	                notificationsArray.forEach(notification => {
	                    const element = this.createNotificationElement(notification);
	                    // إزالة زر الإجراء من الإشعار في صفحة الإشعارات
	                    const actionButton = element.querySelector('.notification-action');
	                    if (actionButton) actionButton.remove();
	                    
	                    // إضافة مستمع النقر لفتح الإشعار
	                    element.addEventListener('click', () => {
	                        this.handleNotificationClick(notification.id, notification);
	                    });

	                    notificationsContent.appendChild(element);
	                });
	            }
	        } else {
	            notificationsContent.innerHTML = '<p class="status-message status-warning">يرجى تسجيل الدخول لعرض الإشعارات.</p>';
	        }
	    }
}

const notificationsManager = new NotificationsManager();
