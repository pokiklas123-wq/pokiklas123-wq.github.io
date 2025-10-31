// js/notifications.js

class NotificationsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.auth = app.auth;
        this.notificationsContainer = document.getElementById('notificationsList');
        this.unreadCountElement = document.getElementById('unreadNotificationsCount');
        
        this.setupAuthListener();
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.userId = user.uid;
                this.notificationsRef = this.db.ref(`notifications/${this.userId}`);
                this.listenForNotifications();
            } else {
                this.clearNotifications();
            }
        });
    }

    listenForNotifications() {
        // Listen for unread count changes
        this.notificationsRef.orderByChild('read').equalTo(false).on('value', snapshot => {
            const count = snapshot.numChildren();
            this.updateUnreadCount(count);
        });

        if (this.notificationsContainer) {
            // Listen for all notifications to render the list
            this.notificationsRef.orderByChild('timestamp').on('value', snapshot => {
                const notificationsData = snapshot.val();
                this.renderNotifications(notificationsData);
            });
            
            this.notificationsContainer.addEventListener('click', (e) => this.handleNotificationClick(e));
        }
    }

    updateUnreadCount(count) {
        // Update header button count
        const headerBtn = document.getElementById('notificationsBtn');
        if (headerBtn) {
            let badge = headerBtn.querySelector('.notification-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                headerBtn.appendChild(badge);
            }
            
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // Update dedicated notifications page count
        if (this.unreadCountElement) {
            if (count > 0) {
                this.unreadCountElement.textContent = `(${count} غير مقروءة)`;
            } else {
                this.unreadCountElement.textContent = '';
            }
        }
    }

    clearNotifications() {
        if (this.notificationsContainer) {
            this.notificationsContainer.innerHTML = '<p class="empty-state">لا توجد إشعارات.</p>';
        }
        this.updateUnreadCount(0);
    }

    renderNotifications(notificationsData) {
        this.notificationsContainer.innerHTML = '';
        if (!notificationsData) {
            this.notificationsContainer.innerHTML = '<p class="empty-state">لا توجد إشعارات.</p>';
            return;
        }

        const notificationsArray = Object.keys(notificationsData).map(key => ({
            id: key,
            ...notificationsData[key]
        })).sort((a, b) => b.timestamp - a.timestamp); // Newest first

        notificationsArray.forEach(notification => {
            this.notificationsContainer.appendChild(this.createNotificationElement(notification));
        });
    }

    createNotificationElement(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        notificationEl.setAttribute('data-id', notification.id);
        
        const icon = notification.type === 'reply' ? 'fas fa-reply' : 'fas fa-bell';
        const time = Utils.formatTimestamp(notification.timestamp);
        
        notificationEl.innerHTML = `
            <i class="${icon} notification-icon"></i>
            <div class="notification-content">
                <p class="notification-text">${notification.text}</p>
                <span class="notification-time">${time}</span>
            </div>
            <div class="notification-actions">
                ${!notification.read ? `
                    <button class="btn-icon mark-read-btn" data-id="${notification.id}" title="وضع علامة كمقروء">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        return notificationEl;
    }

    handleNotificationClick(e) {
        const item = e.target.closest('.notification-item');
        const markReadBtn = e.target.closest('.mark-read-btn');
        
        if (markReadBtn) {
            const id = markReadBtn.getAttribute('data-id');
            this.markAsRead(id);
            return;
        }
        
        if (item) {
            const id = item.getAttribute('data-id');
            // Fetch the full notification data to ensure we have all redirection info
            this.notificationsRef.child(id).once('value').then(snapshot => {
                const notification = snapshot.val();
                if (notification) {
                    this.markAsRead(id);
                    this.redirectToTarget(notification);
                }
            }).catch(error => {
                console.error('Error fetching notification data:', error);
            });
        }
    }

    async markAsRead(id) {
        try {
            await this.notificationsRef.child(id).update({ read: true });
            // The listener will handle the UI update
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    redirectToTarget(notification) {
        if (notification.type === 'reply' && notification.mangaId && notification.chapterId && notification.commentId) {
            // Construct the URL to the chapter page and scroll to the comment/reply
            const targetId = notification.replyId ? `${notification.commentId}-${notification.replyId}` : notification.commentId;
            const url = `chapter.html?mangaId=${notification.mangaId}&chapter=${notification.chapterId}#${targetId}`;
            window.location.href = url;
        } else {
            // Default redirection for other types
            window.location.href = 'notifications.html';
        }
    }
    
    async markAllAsRead() {
        if (!this.userId) return;
        
        try {
            const snapshot = await this.notificationsRef.orderByChild('read').equalTo(false).once('value');
            const updates = {};
            snapshot.forEach(childSnapshot => {
                updates[childSnapshot.key + '/read'] = true;
            });
            
            if (Object.keys(updates).length > 0) {
                await this.notificationsRef.update(updates);
                Utils.showMessage('تم تعيين جميع الإشعارات كمقروء', 'success');
            } else {
                Utils.showMessage('جميع الإشعارات مقروءة مسبقاً', 'info');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            Utils.showMessage('حدث خطأ أثناء تعيين الإشعارات كمقروء', 'error');
        }
    }
}

// يتم تهيئة المدير في app.js (لإدارة العدد في الهيدر) و notifications.html (لإدارة القائمة)
