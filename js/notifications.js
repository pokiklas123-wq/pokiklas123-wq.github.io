// [file name]: notifications.js
class NotificationsManager {
    constructor() {
        this.notifications = {};
        this.adminNotifications = {};
        this.unreadCount = 0;
        this.adminUnreadCount = 0;
        this.currentTab = 'user';
        this.setupEventListeners();
    }

    setupEventListeners() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.loadNotifications();
                this.loadAdminNotifications();
                this.startRealtimeUpdates();
            } else {
                this.clearNotifications();
                this.stopRealtimeUpdates();
            }
        });

        // تحديث الإشعارات يدوياً
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refreshNotifications' || e.target.closest('#refreshNotifications')) {
                this.loadNotifications();
                if (authManager.isAdmin()) {
                    this.loadAdminNotifications();
                }
                ui.showAlert('تم تحديث الإشعارات', 'success');
            }
        });

        // تبديل التبويبات في صفحة الإشعارات
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn') || e.target.closest('.tab-btn')) {
                const tabBtn = e.target.classList.contains('tab-btn') ? e.target : e.target.closest('.tab-btn');
                const tab = tabBtn.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
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

    async loadAdminNotifications() {
        if (!authManager.getCurrentUser() || !(await authManager.isAdmin())) {
            this.adminNotifications = {};
            this.adminUnreadCount = 0;
            return;
        }

        try {
            const adminNotificationsRef = database.ref('admin_notifications');
            const snapshot = await adminNotificationsRef.once('value');
            this.adminNotifications = snapshot.val() || {};
            this.updateAdminUnreadCount();
            this.displayAdminNotifications();
            
        } catch (error) {
            console.error('Error loading admin notifications:', error);
            this.adminNotifications = {};
            this.adminUnreadCount = 0;
        }
    }

    startRealtimeUpdates() {
        if (!authManager.getCurrentUser()) return;

        // تحديثات إشعارات المستخدم
        this.notificationsRef = database.ref(`notifications/${authManager.getCurrentUser().uid}`);
        this.notificationsRef.on('child_added', (snapshot) => {
            this.onNotificationAdded(snapshot);
        });

        this.notificationsRef.on('child_changed', (snapshot) => {
            this.onNotificationChanged(snapshot);
        });

        // تحديثات إشعارات الأدمن
        if (authManager.isAdmin()) {
            this.adminNotificationsRef = database.ref('admin_notifications');
            this.adminNotificationsRef.on('child_added', (snapshot) => {
                this.onAdminNotificationAdded(snapshot);
            });

            this.adminNotificationsRef.on('child_changed', (snapshot) => {
                this.onAdminNotificationChanged(snapshot);
            });
        }
    }

    stopRealtimeUpdates() {
        if (this.notificationsRef) {
            this.notificationsRef.off();
        }
        if (this.adminNotificationsRef) {
            this.adminNotificationsRef.off();
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

    onAdminNotificationAdded(snapshot) {
        const notification = { id: snapshot.key, ...snapshot.val() };
        this.adminNotifications[snapshot.key] = notification;
        this.updateAdminUnreadCount();
        this.displayAdminNotifications();
        
        // عرض تنبيه للإشعارات الجديدة
        if (!notification.read) {
            this.showAdminNotificationAlert(notification);
        }
    }

    onAdminNotificationChanged(snapshot) {
        this.adminNotifications[snapshot.key] = { id: snapshot.key, ...snapshot.val() };
        this.updateAdminUnreadCount();
        this.displayAdminNotifications();
    }

    showNotificationAlert(notification) {
        if (Notification.permission === 'granted') {
            this.showBrowserNotification(notification, 'user');
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showBrowserNotification(notification, 'user');
                }
            });
        }
        
        // عرض تنبيه داخلي
        this.showInAppNotification(notification, 'user');
    }

    showAdminNotificationAlert(notification) {
        if (Notification.permission === 'granted') {
            this.showBrowserNotification(notification, 'admin');
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showBrowserNotification(notification, 'admin');
                }
            });
        }
        
        // عرض تنبيه داخلي
        this.showInAppNotification(notification, 'admin');
    }

    showBrowserNotification(notification, type) {
        const title = this.getNotificationTitle(notification, type);
        const options = {
            body: this.getNotificationBody(notification, type),
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: type === 'admin' ? 'admin-notification' : 'user-notification'
        };
        
        new Notification(title, options);
    }

    showInAppNotification(notification, type) {
        const notificationToast = document.createElement('div');
        notificationToast.className = 'notification-toast';
        notificationToast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon ${type}">
                    <i class="${this.getNotificationIcon(notification, type)}"></i>
                </div>
                <div class="toast-text">
                    <div class="toast-title">${this.getNotificationTitle(notification, type)}</div>
                    <div class="toast-body">${this.getNotificationBody(notification, type)}</div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notificationToast);
        
        // إضافة أنماط خاصة إذا لم تكن موجودة
        if (!document.querySelector('#notification-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-toast-styles';
            styles.textContent = `
                .notification-toast {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 15px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                    z-index: 10000;
                    max-width: 400px;
                    margin: 0 auto;
                    border-left: 4px solid var(--accent-color);
                    animation: slideInRight 0.3s ease;
                }
                .notification-toast .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .notification-toast .toast-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 1.2rem;
                }
                .notification-toast .toast-icon.user {
                    background: var(--accent-color);
                }
                .notification-toast .toast-icon.admin {
                    background: var(--warning-color);
                }
                .notification-toast .toast-text {
                    flex: 1;
                }
                .notification-toast .toast-title {
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: var(--text-color);
                }
                .notification-toast .toast-body {
                    font-size: 0.9rem;
                    color: #aaa;
                }
                .notification-toast .toast-close {
                    background: none;
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 4px;
                    transition: background-color 0.3s ease;
                }
                .notification-toast .toast-close:hover {
                    background: var(--hover-color);
                }
                @keyframes slideInRight {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

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
            this.handleNotificationClick(notification, type);
            notificationToast.remove();
        });
    }

    getNotificationTitle(notification, type) {
        if (type === 'admin') {
            return 'إشعار نظام';
        }

        switch (notification.type) {
            case 'comment_like':
                return 'إعجاب جديد';
            case 'comment_reply':
                return 'رد جديد';
            case 'chapter_update':
                return 'فصل جديد';
            case 'manga_update':
                return 'تحديث مانجا';
            default:
                return 'إشعار جديد';
        }
    }

    getNotificationBody(notification, type) {
        if (type === 'admin') {
            return notification.message || 'إشعار نظام جديد';
        }

        switch (notification.type) {
            case 'comment_like':
                return `أعجب ${notification.fromUser} بتعليقك`;
            case 'comment_reply':
                return `رد ${notification.fromUser} على تعليقك: "${notification.replyText}"`;
            case 'chapter_update':
                return `تم إضافة فصل جديد في ${notification.mangaName}`;
            case 'manga_update':
                return `تم تحديث ${notification.mangaName}`;
            default:
                return 'لديك إشعار جديد';
        }
    }

    getNotificationIcon(notification, type) {
        if (type === 'admin') {
            return 'fas fa-cog';
        }

        switch (notification.type) {
            case 'comment_like':
                return 'fas fa-heart';
            case 'comment_reply':
                return 'fas fa-reply';
            case 'chapter_update':
                return 'fas fa-book';
            case 'manga_update':
                return 'fas fa-sync';
            default:
                return 'fas fa-bell';
        }
    }

    updateUnreadCount() {
        this.unreadCount = Object.values(this.notifications).filter(notification => !notification.read).length;
        this.updateBadge();
    }

    updateAdminUnreadCount() {
        this.adminUnreadCount = Object.values(this.adminNotifications).filter(notification => !notification.read).length;
        this.updateBadge();
    }

    updateBadge() {
        const badge = document.querySelector('.notification-badge');
        const totalUnread = this.unreadCount + this.adminUnreadCount;
        
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    displayNotifications() {
        this.displayUserNotifications();
        
        // إذا كانت صفحة الإشعارات مفتوحة، قم بتحديث المحتوى
        if (this.currentTab === 'user' && document.getElementById('userNotificationsList')) {
            this.displayUserNotifications();
        }
    }

    displayUserNotifications() {
        const notificationsList = document.getElementById('notificationsList') || document.getElementById('userNotificationsList');
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
            const notificationElement = this.createNotificationElement(notification, 'user');
            notificationsList.appendChild(notificationElement);
        });

        // إضافة زر مسح الكل فقط في القائمة الجانبية
        if (notificationsList.id === 'notificationsList') {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'clear-all-notifications btn';
            clearAllBtn.innerHTML = '<i class="fas fa-trash"></i> مسح الكل';
            clearAllBtn.addEventListener('click', () => {
                this.clearAllNotifications();
            });
            
            notificationsList.appendChild(clearAllBtn);
        }
    }

    displayAdminNotifications() {
        const adminNotificationsList = document.getElementById('adminNotificationsList');
        if (!adminNotificationsList) return;

        adminNotificationsList.innerHTML = '';

        if (!this.adminNotifications || Object.keys(this.adminNotifications).length === 0) {
            adminNotificationsList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-cog"></i>
                    <p>لا توجد إشعارات نظام</p>
                    <p class="no-notifications-subtitle">سيظهر هنا أي إشعارات نظام جديدة</p>
                </div>
            `;
            return;
        }

        const notificationsArray = Object.keys(this.adminNotifications).map(key => {
            return { id: key, ...this.adminNotifications[key] };
        });

        // ترتيب الإشعارات من الأحدث إلى الأقدم
        notificationsArray.sort((a, b) => b.timestamp - a.timestamp);

        notificationsArray.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification, 'admin');
            adminNotificationsList.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification, type) {
        const element = document.createElement('div');
        element.className = `notification ${notification.read ? 'read' : 'unread'}`;
        element.dataset.notificationId = notification.id;
        element.dataset.notificationType = type;
        
        const isAdmin = type === 'admin';
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon ${isAdmin ? 'admin' : notification.type}">
                    <i class="${this.getNotificationIcon(notification, type)}"></i>
                </div>
                <div class="notification-text">
                    <p class="notification-message">${this.getNotificationBody(notification, type)}</p>
                    ${notification.replyText ? `<p class="notification-preview">"${notification.replyText}"</p>` : ''}
                    ${isAdmin && notification.details ? `<p class="notification-details">${notification.details}</p>` : ''}
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
                this.handleNotificationClick(notification, type);
            }
        });

        // زر وضع كمقروء
        const markReadBtn = element.querySelector('.mark-read');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(notification.id, type);
            });
        }

        // زر حذف الإشعار
        const deleteBtn = element.querySelector('.delete-notification');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(notification.id, type);
            });
        }

        return element;
    }

    async handleNotificationClick(notification, type) {
        // وضع الإشعار كمقروء
        await this.markAsRead(notification.id, type);
        
        if (type === 'admin') {
            // التعامل مع إشعارات الأدمن
            if (notification.actionUrl) {
                window.open(notification.actionUrl, '_blank');
            }
            return;
        }

        // التنقل إلى المحتوى ذي الصلة للمستخدم العادي
        if (notification.mangaId && notification.chapterId) {
            // تأكد من تحميل بيانات المانجا أولاً
            if (!mangaManager.mangaData || Object.keys(mangaManager.mangaData).length === 0) {
                await mangaManager.loadMangaList();
            }
            
            const manga = mangaManager.mangaData[notification.mangaId];
            if (manga) {
                // الانتقال إلى صفحة الفصل
                navigationManager.navigateTo('chapterPage', {
                    mangaId: notification.mangaId,
                    chapterId: notification.chapterId
                });
                
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
                ui.showAlert('المانجا غير متاحة حالياً', 'error');
            }
        }
    }

    async markAsRead(notificationId, type = 'user') {
        if (!authManager.getCurrentUser()) return;

        try {
            if (type === 'admin') {
                if (!(await authManager.isAdmin())) return;
                await database.ref(`admin_notifications/${notificationId}/read`).set(true);
                this.adminNotifications[notificationId].read = true;
                this.updateAdminUnreadCount();
                this.displayAdminNotifications();
            } else {
                await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}/read`).set(true);
                this.notifications[notificationId].read = true;
                this.updateUnreadCount();
                this.displayNotifications();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead(type = 'user') {
        if (!authManager.getCurrentUser()) return;

        try {
            if (type === 'admin') {
                if (!(await authManager.isAdmin())) return;
                const updates = {};
                Object.keys(this.adminNotifications).forEach(notificationId => {
                    updates[`${notificationId}/read`] = true;
                });
                
                await database.ref('admin_notifications').update(updates);
                
                // تحديث محلي
                Object.keys(this.adminNotifications).forEach(notificationId => {
                    this.adminNotifications[notificationId].read = true;
                });
                
                this.updateAdminUnreadCount();
                this.displayAdminNotifications();
            } else {
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
            }
            
            ui.showAlert('تم وضع جميع الإشعارات كمقروءة', 'success');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            ui.showAlert('حدث خطأ في وضع الإشعارات كمقروءة', 'error');
        }
    }

    async deleteNotification(notificationId, type = 'user') {
        if (!authManager.getCurrentUser()) return;

        ui.showConfirmation(
            'هل أنت متأكد من حذف هذا الإشعار؟',
            async () => {
                try {
                    if (type === 'admin') {
                        if (!(await authManager.isAdmin())) return;
                        await database.ref(`admin_notifications/${notificationId}`).remove();
                        delete this.adminNotifications[notificationId];
                        this.updateAdminUnreadCount();
                        this.displayAdminNotifications();
                    } else {
                        await database.ref(`notifications/${authManager.getCurrentUser().uid}/${notificationId}`).remove();
                        delete this.notifications[notificationId];
                        this.updateUnreadCount();
                        this.displayNotifications();
                    }
                    
                    ui.showAlert('تم حذف الإشعار بنجاح', 'success');
                } catch (error) {
                    console.error('Error deleting notification:', error);
                    ui.showAlert('حدث خطأ في حذف الإشعار', 'error');
                }
            }
        );
    }

    async clearAllNotifications(type = 'user') {
        if (!authManager.getCurrentUser()) return;

        ui.showConfirmation(
            'هل أنت متأكد من مسح جميع الإشعارات؟',
            async () => {
                try {
                    if (type === 'admin') {
                        if (!(await authManager.isAdmin())) return;
                        await database.ref('admin_notifications').remove();
                        this.adminNotifications = {};
                        this.updateAdminUnreadCount();
                        this.displayAdminNotifications();
                    } else {
                        await database.ref(`notifications/${authManager.getCurrentUser().uid}`).remove();
                        this.notifications = {};
                        this.updateUnreadCount();
                        this.displayNotifications();
                    }
                    
                    ui.showAlert('تم مسح جميع الإشعارات', 'success');
                } catch (error) {
                    console.error('Error clearing all notifications:', error);
                    ui.showAlert('حدث خطأ في مسح الإشعارات', 'error');
                }
            }
        );
    }

    async createAdminNotification(message, details = '', actionUrl = '') {
        if (!authManager.getCurrentUser() || !(await authManager.isAdmin())) {
            console.error('Only admins can create admin notifications');
            return false;
        }

        try {
            const notificationRef = database.ref('admin_notifications').push();
            await notificationRef.set({
                message: message,
                details: details,
                actionUrl: actionUrl,
                timestamp: Date.now(),
                read: false,
                createdBy: authManager.getCurrentUser().uid
            });
            
            return true;
        } catch (error) {
            console.error('Error creating admin notification:', error);
            return false;
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // تحديث أزرار التبويب
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
        
        // تحديث محتوى التبويب
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tab}-notifications`).classList.add('active');
        
        // تحميل المحتوى إذا لزم الأمر
        if (tab === 'admin' && Object.keys(this.adminNotifications).length === 0) {
            this.loadAdminNotifications();
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
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
        
        return date.toLocaleDateString('ar-SA');
    }

    clearNotifications() {
        this.notifications = {};
        this.adminNotifications = {};
        this.unreadCount = 0;
        this.adminUnreadCount = 0;
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
        
        const userNotificationsList = document.getElementById('userNotificationsList');
        if (userNotificationsList) {
            userNotificationsList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
        }
        
        const adminNotificationsList = document.getElementById('adminNotificationsList');
        if (adminNotificationsList) {
            adminNotificationsList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-cog"></i>
                    <p>لا توجد إشعارات نظام</p>
                </div>
            `;
        }
    }

    // دالة للحصول على إحصائيات الإشعارات
    getNotificationStats() {
        const userTotal = Object.keys(this.notifications).length;
        const userUnread = this.unreadCount;
        const userRead = userTotal - userUnread;
        
        const adminTotal = Object.keys(this.adminNotifications).length;
        const adminUnread = this.adminUnreadCount;
        const adminRead = adminTotal - adminUnread;
        
        return {
            user: {
                total: userTotal,
                unread: userUnread,
                read: userRead
            },
            admin: {
                total: adminTotal,
                unread: adminUnread,
                read: adminRead
            },
            total: userTotal + adminTotal,
            totalUnread: userUnread + adminUnread
        };
    }

    // دالة للبحث في الإشعارات
    searchNotifications(searchTerm, type = 'user') {
        const notifications = type === 'admin' ? this.adminNotifications : this.notifications;
        const notificationElements = document.querySelectorAll(`.notification[data-notification-type="${type}"]`);
        let foundCount = 0;
        
        notificationElements.forEach(notification => {
            const notificationText = notification.querySelector('.notification-message').textContent.toLowerCase();
            const notificationId = notification.dataset.notificationId;
            const notificationData = notifications[notificationId];
            
            let matches = notificationText.includes(searchTerm.toLowerCase());
            
            // البحث في التفاصيل الإضافية
            if (notificationData && notificationData.details) {
                matches = matches || notificationData.details.toLowerCase().includes(searchTerm.toLowerCase());
            }
            
            if (matches) {
                notification.style.display = 'flex';
                foundCount++;
            } else {
                notification.style.display = 'none';
            }
        });
        
        return foundCount;
    }

    // دالة للاشتراك في أنواع معينة من الإشعارات
    async subscribeToNotificationTypes(types) {
        if (!authManager.getCurrentUser()) return;

        try {
            await database.ref(`users/${authManager.getCurrentUser().uid}/notificationPreferences`).set(types);
            ui.showAlert('تم حفظ تفضيلات الإشعارات', 'success');
        } catch (error) {
            console.error('Error saving notification preferences:', error);
            ui.showAlert('حدث خطأ في حفظ التفضيلات', 'error');
        }
    }

    // دالة للحصول على تفضيلات الإشعارات
    async getNotificationPreferences() {
        if (!authManager.getCurrentUser()) return {};

        try {
            const snapshot = await database.ref(`users/${authManager.getCurrentUser().uid}/notificationPreferences`).once('value');
            return snapshot.val() || {
                comment_like: true,
                comment_reply: true,
                chapter_update: true,
                manga_update: true
            };
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            return {};
        }
    }
}

const notificationsManager = new NotificationsManager();