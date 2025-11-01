// js/notifications.js
class NotificationsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.auth = app.auth;
        this.notificationsContainer = document.getElementById('notificationsList');
        this.unreadCountElement = document.getElementById('unreadNotificationsCount');
        this.userId = null;
        this.notificationsRef = null;
        
        this.setupAuthListener();
    }

    setupAuthListener() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.userId = user.uid;
                this.notificationsRef = this.db.ref(`notifications/${this.userId}`);
                this.listenForNotifications();
            } else {
                this.userId = null;
                this.notificationsRef = null;
                this.clearNotifications();
            }
        });
    }

    listenForNotifications() {
        if (!this.notificationsRef) return;

        // تحديث عدد الإشعارات غير المقروءة
        this.notificationsRef.orderByChild('read').equalTo(false).on('value', snapshot => {
            const count = snapshot.numChildren();
            this.updateUnreadCount(count);
        });

        if (this.notificationsContainer) {
            this.notificationsRef.orderByChild('timestamp').on('value', snapshot => {
                const notificationsData = snapshot.val();
                this.renderNotifications(notificationsData);
            });
        }
    }

    updateUnreadCount(count) {
        // تحديث العداد في الهيدر
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
        
        // تحديث العداد في صفحة الإشعارات
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
            this.notificationsContainer.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
        }
        this.updateUnreadCount(0);
    }

    renderNotifications(notificationsData) {
        if (!this.notificationsContainer) return;
        
        this.notificationsContainer.innerHTML = '';
        
        if (!notificationsData) {
            this.clearNotifications();
            return;
        }

        const notificationsArray = Object.keys(notificationsData).map(key => ({
            id: key,
            ...notificationsData[key]
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (notificationsArray.length === 0) {
            this.clearNotifications();
            return;
        }

        notificationsArray.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            this.notificationsContainer.appendChild(notificationElement);
        });
    }

    createNotificationElement(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        notificationEl.setAttribute('data-id', notification.id);
        notificationEl.setAttribute('data-manga-id', notification.mangaId || '');
        notificationEl.setAttribute('data-chapter-id', notification.chapterId || '');
        notificationEl.setAttribute('data-comment-id', notification.commentId || '');
        notificationEl.setAttribute('data-reply-id', notification.replyId || '');
        
        const icon = this.getNotificationIcon(notification.type);
        const time = notification.timestamp ? Utils.formatTimestamp(notification.timestamp) : 'غير معروف';
        
        notificationEl.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <i class="${icon}"></i>
                    ${this.getNotificationTitle(notification.type)}
                </div>
                <div class="notification-date">${time}</div>
            </div>
            <div class="notification-content">
                ${notification.text || 'إشعار جديد'}
            </div>
            <div class="notification-actions">
                ${!notification.read ? `
                    <button class="action-btn mark-as-read" data-id="${notification.id}">
                        <i class="fas fa-check"></i> تعيين كمقروء
                    </button>
                ` : ''}
                <button class="action-btn delete-notification" data-id="${notification.id}">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        `;
        
        // جعل الإشعار قابلاً للنقر
        notificationEl.style.cursor = 'pointer';
        notificationEl.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                this.handleNotificationClick(notification);
            }
        });

        // إضافة event listeners للأزرار
        const markAsReadBtn = notificationEl.querySelector('.mark-as-read');
        const deleteBtn = notificationEl.querySelector('.delete-notification');
        
        if (markAsReadBtn) {
            markAsReadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAsRead(notification.id);
            });
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotification(notification.id);
            });
        }
        
        return notificationEl;
    }

    getNotificationIcon(type) {
        const icons = {
            'reply': 'fas fa-reply',
            'comment': 'fas fa-comment',
            'system': 'fas fa-info-circle',
            'update': 'fas fa-sync'
        };
        return icons[type] || 'fas fa-bell';
    }

    getNotificationTitle(type) {
        const titles = {
            'reply': 'رد جديد',
            'comment': 'تعليق جديد',
            'system': 'إشعار نظام',
            'update': 'تحديث'
        };
        return titles[type] || 'إشعار';
    }

    handleNotificationClick(notification) {
        if (notification.type === 'reply' && notification.mangaId && notification.chapterId) {
            // الانتقال إلى الفصل مع التركيز على التعليق والرد
            let hash = `comment-${notification.commentId}`;
            if (notification.replyId) {
                hash = `reply-${notification.commentId}-${notification.replyId}`;
            }
            
            window.location.href = `chapter.html?manga=${notification.mangaId}&chapter=${notification.chapterId}#${hash}`;
        }
        
        // وضع علامة كمقروء عند النقر
        this.markAsRead(notification.id);
    }

    async markAsRead(id) {
        if (!this.notificationsRef || !this.userId) return;
        
        try {
            await this.notificationsRef.child(id).update({ read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            Utils.showMessage('حدث خطأ أثناء تعيين الإشعار كمقروء', 'error');
        }
    }

    async deleteNotification(id) {
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
        
        try {
            await this.notificationsRef.child(id).remove();
            Utils.showMessage('تم حذف الإشعار بنجاح', 'success');
        } catch (error) {
            console.error('Error deleting notification:', error);
            Utils.showMessage('حدث خطأ أثناء حذف الإشعار', 'error');
        }
    }
    
    async markAllAsRead() {
        if (!this.userId || !this.notificationsRef) return;
        
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

// جعل الدالة متاحة globally للاستدعاء من الزر
window.notificationsManager = {
    markAllAsRead: function() {
        if (window.app && window.app.notificationsManager) {
            window.app.notificationsManager.markAllAsRead();
        } else if (window.appInstance && window.appInstance.notificationsManager) {
            window.appInstance.notificationsManager.markAllAsRead();
        }
    }
};