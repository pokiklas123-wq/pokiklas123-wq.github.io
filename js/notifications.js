// [file name]: notifications.js
class NotificationsManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.loadNotifications();
                this.startRealtimeUpdates();
            } else {
                this.clearNotifications();
                this.stopRealtimeUpdates();
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
            this.updateUnreadCount();
            this.displayNotifications();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.clearNotifications();
        }
    }

    startRealtimeUpdates() {
        if (!authManager.getCurrentUser()) return;

        this.notificationsRef = database.ref(`notifications/${authManager.getCurrentUser().uid}`);
        this.notificationsRef.on('child_added', (snapshot) => {
            this.onNotificationAdded(snapshot);
        });

        this.notificationsRef.on('child_changed', (snapshot) => {
            this.onNotificationChanged(snapshot);
        });
    }

    stopRealtimeUpdates() {
        if (this.notificationsRef) {
            this.notificationsRef.off();
        }
    }

    onNotificationAdded(snapshot) {
        const notification = { id: snapshot.key, ...snapshot.val() };
        this.notifications[snapshot.key] = notification;
        this.updateUnreadCount();
        this.displayNotifications();
        
        // عرض تنبيه للاشعارات الجديدة
        if (!notification.read) {
            this.showNotificationAlert(notification);
        }
    }

    onNotificationChanged(snapshot) {
        this.notifications[snapshot.key] = { id: snapshot.key, ...snapshot.val() };
        this.updateUnreadCount();
        this.displayNotifications();
    }

    showNotificationAlert(notification) {
        if (Notification.permission === 'granted') {
            this.showBrowserNotification(notification);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showBrowserNotification(notification);
                }
            });
        }
        
        // عرض تنبيه داخلي
        this.showInAppNotification(notification);
    }

    showBrowserNotification(notification) {
        const title = this.getNotificationTitle(notification);
        const options = {
            body: this.getNotificationBody(notification),
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        };
        
        new Notification(title, options);
    }

    showInAppNotification(notification) {
        const notificationToast = document.createElement('div');
        notificationToast.className = 'notification-toast';
        notificationToast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${this.getNotificationIcon(notification)}"></i>
                </div>
                <div class="toast-text">
                    <div class="toast-title">${this.getNotificationTitle(notification)}</div>
                    <div class="toast-body">${this.getNotificationBody(notification)}</div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notificationToast);
        
        // إغلاق التنبيه تلقائياً بعد 5 ثواني
        setTimeout(() => {
            if (notificationToast.parentNode) {
                notificationToast.remove();
            }
        }, 5000);
        
        // إغلاق التنبيه يدوياً
        notificationToast.querySelector('.toast-close').addEventListener('click', () => {
            notificationToast.remove();
        });
        
        // النقر على التنبيه للذهاب إلى المحتوى
        notificationToast.addEventListener('click', () => {
            this.handleNotificationClick(notification);
            notificationToast.remove();
        });
    }

    getNotificationTitle(notification) {
        switch (notification.type) {
            case 'like':
                return 'إعجاب جديد';
            case 'reply':
                return 'رد جديد';
            default:
                return 'إشعار جديد';
        }
    }

    getNotificationBody(notification) {
        switch (notification.type) {
            case 'like':
                return `أعجب ${notification.fromUser} بتعليقك`;
            case 'reply':
                return `رد ${notification.fromUser} على تعليقك: "${notification.replyText}"`;
            default:
                return 'لديك إشعار جديد';
        }
    }

    getNotificationIcon(notification) {
        switch (notification.type) {
            case 'like':
                return 'fas fa-heart';
            case 'reply':
                return 'fas fa-reply';
            default:
                return 'fas fa-bell';
        }
    }

    updateUnreadCount() {
        this.unreadCount = Object.values(this.notifications).filter(notification => !notification.read).length;
        this.updateBadge();
    }

    updateBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    displayNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        notificationsList.innerHTML = '';

        if (!this.notifications || Object.keys(this.notifications).length === 0) {
            notificationsList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                    <p class="no-notifications-subtitle">سيظهر هنا أي إشعارات جديدة</p>
                </div>
            `;
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

        // إضافة زر مسح الكل
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'clear-all-notifications';
        clearAllBtn.innerHTML = '<i class="fas fa-trash"></i> مسح الكل';
        clearAllBtn.addEventListener('click', () => {
            this.clearAllNotifications();
        });
        
        notificationsList.appendChild(clearAllBtn);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.read ? 'read' : 'unread'}`;
        element.dataset.notificationId = notification.id;
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon ${notification.type}">
                    <i class="${this.getNotificationIcon(notification)}"></i>
                </div>
                <div class="notification-text">
                    <p class="notification-message">${this.getNotificationBody(notification)}</p>
                    ${notification.replyText ? `<p class="notification-preview">"${notification.replyText}"</p>` : ''}
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                    <button class="notification-action mark-read" title="وضع كمقروء">
                        <i class="fas fa-check"></i>
                    </button>
                    ` : ''}
                    <button class="notification-action delete-notification" title="حذف الإشعار">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        element.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-actions')) {
                this.handleNotificationClick(notification);
            }
        });

        // زر وضع كمقروء
        const markReadBtn = element.querySelector('.mark-read');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(notification.id);
            });
        }

        // زر حذف الإشعار
        const deleteBtn = element.querySelector('.delete-notification');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(notification.id);
            });
        }

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
                // الانتقال إلى صفحة الفصل
                ui.navigateToPage('chapterPage');
                
                // عرض الفصل
                setTimeout(() => {
                    mangaManager.showChapter(notification.mangaId, notification.chapterId, manga.chapters[notification.chapterId]);
                    
                    // التمرير إلى التعليق إذا كان هناك commentId
                    if (notification.commentId) {
                        setTimeout(() => {
                            const commentElement = document.getElementById(`comment-${notification.commentId}`);
                            if (commentElement) {
                                commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                commentElement.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
                                setTimeout(() => {
                                    commentElement.style.backgroundColor = '';
                                }, 3000);
                            }
                        }, 1000);
                    }
                }, 500);
            } else {
                console.warn('المانجا غير موجودة للإشعار:', notification.mangaId);
                ui.showAuthMessage('المانجا غير متاحة حالياً', 'error');
            }
        }
    }

    async markAsRead(notificationId) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}/read`).set(true);
            // تحديث القائمة فوراً
            this.notifications[notificationId].read = true;
            this.updateUnreadCount();
            this.displayNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        if (!authManager.getCurrentUser()) return;

        try {
            const updates = {};
            Object.keys(this.notifications).forEach(notificationId => {
                updates[`${notificationId}/read`] = true;
            });
            
            await database.ref(`notifications/${authManager.getCurrentUser().uid}`).update(updates);
            
            // تحديث محلي
            Object.keys(this.notifications).forEach(notificationId => {
                this.notifications[notificationId].read = true;
            });
            
            this.updateUnreadCount();
            this.displayNotifications();
            ui.showAuthMessage('تم وضع جميع الإشعارات كمقروءة', 'success');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            ui.showAuthMessage('حدث خطأ في وضع الإشعارات كمقروءة', 'error');
        }
    }

    async deleteNotification(notificationId) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}`).remove();
            delete this.notifications[notificationId];
            this.updateUnreadCount();
            this.displayNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
            ui.showAuthMessage('حدث خطأ في حذف الإشعار', 'error');
        }
    }

    async clearAllNotifications() {
        if (!authManager.getCurrentUser()) return;

        ui.showConfirmation(
            'هل أنت متأكد من مسح جميع الإشعارات؟',
            async () => {
                try {
                    await database.ref(`notifications/${authManager.getCurrentUser().uid}`).remove();
                    this.notifications = {};
                    this.updateUnreadCount();
                    this.displayNotifications();
                    ui.showAuthMessage('تم مسح جميع الإشعارات', 'success');
                } catch (error) {
                    console.error('Error clearing all notifications:', error);
                    ui.showAuthMessage('حدث خطأ في مسح الإشعارات', 'error');
                }
            }
        );
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
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
        
        return date.toLocaleDateString('ar-SA');
    }

    clearNotifications() {
        this.notifications = [];
        this.unreadCount = 0;
        this.updateBadge();
        
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                    <p class="no-notifications-subtitle">سجل الدخول لعرض الإشعارات</p>
                </div>
            `;
        }
    }

    // دالة للحصول على إحصائيات الإشعارات
    getNotificationStats() {
        const total = Object.keys(this.notifications).length;
        const unread = this.unreadCount;
        const read = total - unread;
        
        return {
            total,
            unread,
            read
        };
    }

    // دالة للبحث في الإشعارات
    searchNotifications(searchTerm) {
        const notificationElements = document.querySelectorAll('.notification');
        let foundCount = 0;
        
        notificationElements.forEach(notification => {
            const notificationText = notification.querySelector('.notification-message').textContent.toLowerCase();
            
            if (notificationText.includes(searchTerm.toLowerCase())) {
                notification.style.display = 'flex';
                foundCount++;
            } else {
                notification.style.display = 'none';
            }
        });
        
        return foundCount;
    }
}

const notificationsManager = new NotificationsManager();