class NotificationsManager {
    constructor() {
        this.notifications = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.loadNotifications();
            } else {
                this.clearNotifications();
            }
        });
    }

    async loadNotifications() {
        if (!authManager.getCurrentUser()) {
            this.clearNotifications();
            return;
        }

        try {
            const notificationsRef = database.ref(`notifications/${authManager.getCurrentUser().uid}`);
            const snapshot = await notificationsRef.once('value');
            this.notifications = snapshot.val() || {};
            this.displayNotifications();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.clearNotifications();
        }
    }

    displayNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        notificationsList.innerHTML = '';

        if (!this.notifications || Object.keys(this.notifications).length === 0) {
            notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
            return;
        }

        const notificationsArray = Object.keys(this.notifications).map(key => {
            return { id: key, ...this.notifications[key] };
        });

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
        
        let message = '';
        let icon = '';
        let actionText = '';
        
        switch (notification.type) {
            case 'like':
                message = `أعجب ${notification.fromUser} بتعليقك`;
                icon = 'fas fa-heart';
                actionText = 'عرض التعليق';
                break;
            case 'reply':
                message = `رد ${notification.fromUser} على تعليقك`;
                icon = 'fas fa-reply';
                actionText = 'عرض الرد';
                break;
            default:
                message = 'إشعار جديد';
                icon = 'fas fa-bell';
                actionText = 'عرض';
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

        element.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-action')) {
                this.handleNotificationClick(notification);
            }
        });

        // زر الإجراء
        const actionBtn = element.querySelector('.notification-action');
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleNotificationClick(notification);
        });

        return element;
    }

    async handleNotificationClick(notification) {
        // وضع الإشعار كمقروء
        await this.markAsRead(notification.id);
        
        // التنقل إلى المحتوى ذي الصلة
        if (notification.mangaId && notification.chapterId) {
            // تأكد من تحميل بيانات المانجا أولاً
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            const manga = mangaManager.mangaData[notification.mangaId];
	            if (manga) {
	                // التنقل إلى صفحة الفصل مع تمرير commentId للانتقال إليه مباشرةً
	                navigationManager.navigateTo('chapterPage', {
	                    mangaId: notification.mangaId,
	                    chapterId: notification.chapterId,
	                    commentId: notification.commentId // تمرير commentId
	                });
	                
	                // ملاحظة: لا نحتاج لاستدعاء showChapter يدوياً هنا، لأن navigateTo ستفعل ذلك
	                // عبر loadStateFromURL و restoreState.
	            } else {
                console.warn('المانجا غير موجودة للإشعار:', notification.mangaId);
                ui.showAuthMessage('المانجا غير متاحة حالياً', 'error');
            }
        } else {
            console.warn('بيانات الإشعار غير مكتملة:', notification);
        }
    }

    async markAsRead(notificationId) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}/read`).set(true);
            // تحديث القائمة فوراً
            this.notifications[notificationId].read = true;
            this.displayNotifications();
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
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = '<p class="no-notifications">لا توجد إشعارات</p>';
        }
    }

    // دالة مساعدة لإضافة إشعار تجريبي (للتطوير)
    async addTestNotification(userId, type = 'like') {
        try {
            const notificationRef = database.ref(`notifications/${userId}`).push();
            await notificationRef.set({
                type: type,
                fromUser: 'مستخدم تجريبي',
                fromUserId: 'test_user',
                commentId: 'test_comment',
                mangaId: 'test_manga',
                chapterId: 'test_chapter',
                replyText: type === 'reply' ? 'هذا رد تجريبي على تعليقك' : '',
                timestamp: Date.now(),
                read: false
            });
            console.log('تم إضافة إشعار تجريبي');
        } catch (error) {
            console.error('Error adding test notification:', error);
        }
    }
}

const notificationsManager = new NotificationsManager();