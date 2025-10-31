// js/notifications.js
class NotificationsPage {
    constructor() {
        this.notifications = [];
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        this.currentUser = firebase.auth().currentUser;
        
        if (!this.currentUser) {
            this.showLoginRequired();
            return;
        }
        
        this.initializeFirebase();
        this.setupEventListeners();
        this.loadNotifications();
        Utils.loadTheme();
    }
    
    initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.db = firebase.database();
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }
    
    setupEventListeners() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
        
        const markAllReadBtn = document.getElementById('markAllRead');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }
    }
    
    async loadNotifications() {
        try {
            const snapshot = await this.db.ref(`notifications/${this.currentUser.uid}`).once('value');
            const notificationsData = snapshot.val();
            
            this.notifications = [];
            
            if (notificationsData) {
                Object.keys(notificationsData).forEach(key => {
                    const notification = notificationsData[key];
                    notification.id = key;
                    this.notifications.push(notification);
                });
                
                this.notifications.sort((a, b) => b.timestamp - a.timestamp);
            }
            
            this.displayNotifications();
            
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.displayNotificationsError();
        }
    }
    
    displayNotifications() {
        const notificationsList = document.getElementById('notificationsList');
        
        if (!notificationsList) return;
        
        if (this.notifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <h3>لا توجد إشعارات</h3>
                    <p>سيظهر هنا أي إشعارات جديدة تتلقاها</p>
                </div>
            `;
            return;
        }
        
        notificationsList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" data-notification-id="${notification.id}">
                <div class="notification-header">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-date">${Utils.formatTimestamp(notification.timestamp)}</div>
                </div>
                <div class="notification-content">${notification.message}</div>
                <div class="notification-actions">
                    ${!notification.read ? `
                        <button class="action-btn mark-read-btn" data-notification-id="${notification.id}">
                            <i class="fas fa-check"></i>
                            تعيين كمقروء
                        </button>
                    ` : ''}
                    
                    ${notification.link ? `
                        <button class="action-btn view-btn" data-notification-id="${notification.id}">
                            <i class="fas fa-external-link-alt"></i>
                            عرض
                        </button>
                    ` : ''}
                    
                    <button class="action-btn delete-btn" data-notification-id="${notification.id}">
                        <i class="fas fa-trash"></i>
                        حذف
                    </button>
                </div>
            </div>
        `).join('');
        
        this.setupNotificationInteractions();
    }
    
    setupNotificationInteractions() {
        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = e.target.getAttribute('data-notification-id');
                this.markAsRead(notificationId);
            });
        });
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = e.target.getAttribute('data-notification-id');
                this.viewNotification(notificationId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = e.target.getAttribute('data-notification-id');
                this.deleteNotification(notificationId);
            });
        });
        
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('action-btn')) {
                    const notificationId = item.getAttribute('data-notification-id');
                    this.handleNotificationClick(notificationId);
                }
            });
        });
    }
    
    async markAsRead(notificationId) {
        try {
            await this.db.ref(`notifications/${this.currentUser.uid}/${notificationId}`).update({
                read: true
            });
            
            const notificationItem = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationItem) {
                notificationItem.classList.remove('unread');
                const markReadBtn = notificationItem.querySelector('.mark-read-btn');
                if (markReadBtn) markReadBtn.remove();
            }
            
            Utils.showMessage('تم تعيين الإشعار كمقروء', 'success');
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في تحديث الإشعار', 'error');
        }
    }
    
    async markAllAsRead() {
        if (this.notifications.length === 0) return;
        
        try {
            const updates = {};
            this.notifications.forEach(notification => {
                if (!notification.read) {
                    updates[`notifications/${this.currentUser.uid}/${notification.id}/read`] = true;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                await this.db.ref().update(updates);
                this.loadNotifications();
                Utils.showMessage('تم تعيين جميع الإشعارات كمقروء', 'success');
            } else {
                Utils.showMessage('جميع الإشعارات مقروءة مسبقاً', 'info');
            }
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في تعيين الإشعارات كمقروء', 'error');
        }
    }
    
    async deleteNotification(notificationId) {
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
        
        try {
            await this.db.ref(`notifications/${this.currentUser.uid}/${notificationId}`).remove();
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            this.displayNotifications();
            Utils.showMessage('تم حذف الإشعار بنجاح', 'success');
            
        } catch (error) {
            Utils.showMessage('حدث خطأ في حذف الإشعار', 'error');
        }
    }
    
    viewNotification(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && notification.link) {
            window.location.href = notification.link;
            if (!notification.read) {
                this.markAsRead(notificationId);
            }
        }
    }
    
    handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification.read) {
            this.markAsRead(notificationId);
        }
        if (notification.link) {
            window.location.href = notification.link;
        }
    }
    
    displayNotificationsError() {
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>حدث خطأ في تحميل الإشعارات</p>
                    <button class="btn mt-2" onclick="notificationsPage.loadNotifications()">إعادة المحاولة</button>
                </div>
            `;
        }
    }
    
    showLoginRequired() {
        const container = document.querySelector('.notifications-container');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-lock"></i>
                    <h3>يجب تسجيل الدخول</h3>
                    <p>يجب تسجيل الدخول لعرض الإشعارات</p>
                    <a href="auth.html" class="btn mt-2">تسجيل الدخول</a>
                </div>
            `;
        }
    }
    
    openDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.classList.add('open');
        if (drawerOverlay) drawerOverlay.classList.add('open');
    }
    
    closeDrawer() {
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (drawerOverlay) drawerOverlay.classList.remove('open');
    }
}

let notificationsPage;

document.addEventListener('DOMContentLoaded', () => {
    notificationsPage = new NotificationsPage();
});