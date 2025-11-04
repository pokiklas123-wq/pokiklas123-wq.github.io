// js/ui.js - إدارة واجهة المستخدم والأحداث
class UIManager {
    constructor() {
        this.init();
    }

    init() {
        this.initDrawer();
        this.initSearch();
        this.initThemeSwitcher();
        this.initAuthUI();
        this.initNotifications();
    }

    initDrawer() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawer = document.querySelector('.drawer');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        const drawerClose = document.querySelector('.drawer-close');

        if (drawerToggle) {
            drawerToggle.addEventListener('click', () => {
                drawer.classList.add('open');
                drawerOverlay.classList.add('open');
            });
        }

        if (drawerClose) {
            drawerClose.addEventListener('click', () => {
                drawer.classList.remove('open');
                drawerOverlay.classList.remove('open');
            });
        }

        if (drawerOverlay) {
            drawerOverlay.addEventListener('click', () => {
                drawer.classList.remove('open');
                drawerOverlay.classList.remove('open');
            });
        }
    }

    initSearch() {
        const searchBtn = document.getElementById('searchBtn');
        const searchContainer = document.getElementById('searchContainer');
        const closeSearch = document.getElementById('closeSearch');

        if (searchBtn && searchContainer) {
            searchBtn.addEventListener('click', () => {
                searchContainer.style.display = 'block';
                document.getElementById('searchInput').focus();
            });
        }

        if (closeSearch && searchContainer) {
            closeSearch.addEventListener('click', () => {
                searchContainer.style.display = 'none';
            });
        }
    }

    initThemeSwitcher() {
        console.log('جاري تهيئة محول الثيمات...');
        
        const themeOptions = document.querySelectorAll('.theme-option');
        console.log('عدد خيارات الثيم الموجودة:', themeOptions.length);

        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const theme = option.getAttribute('data-theme');
                console.log('تم النقر على ثيم:', theme);
                
                // إزالة النشط من جميع الخيارات
                themeOptions.forEach(opt => {
                    opt.classList.remove('active');
                });
                
                // إضافة النشط للخيار المحدد
                option.classList.add('active');
                
                // تطبيق الثيم
                this.applyTheme(theme);
                
                // إظهار رسالة تأكيد
                this.showThemeMessage(theme);
            });
        });

        // تحميل الثيم المحفوظ عند البدء
        this.loadSavedTheme();
    }

    applyTheme(theme) {
        console.log('جاري تطبيق الثيم:', theme);
        
        // تغيير سمة الصفحة
        document.documentElement.setAttribute('data-theme', theme);
        
        // حفظ في localStorage
        try {
            localStorage.setItem('theme', theme);
            console.log('تم حفظ الثيم في localStorage:', theme);
        } catch (error) {
            console.error('خطأ في حفظ الثيم:', error);
        }
        
        // تحديث أي عناصر أخرى تحتاج للتغيير
        this.updateThemeDependentElements(theme);
    }

    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            console.log('جاري تحميل الثيم المحفوظ:', savedTheme);
            
            // تطبيق الثيم المحفوظ
            document.documentElement.setAttribute('data-theme', savedTheme);
            
            // تحديث الأزرار في الواجهة
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-theme') === savedTheme) {
                    option.classList.add('active');
                }
            });
            
            console.log('تم تحميل الثيم بنجاح:', savedTheme);
        } catch (error) {
            console.error('خطأ في تحميل الثيم المحفوظ:', error);
            // تطبيق الثيم الافتراضي
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    updateThemeDependentElements(theme) {
        // تحديث أي عناصر خاصة بالثيم هنا
        const themeIcons = document.querySelectorAll('.theme-icon');
        themeIcons.forEach(icon => {
            if (theme === 'dark') {
                icon.className = 'theme-icon fas fa-moon';
            } else if (theme === 'blue') {
                icon.className = 'theme-icon fas fa-palette';
            }
        });
    }

    showThemeMessage(theme) {
        let message = '';
        if (theme === 'dark') {
            message = '✓ تم التبديل إلى الوضع الأسود';
        } else if (theme === 'blue') {
            message = '✓ تم التبديل إلى الوضع الأزرق';
        }
        
        // استخدام دالة showMessage من Utils إذا كانت موجودة
        if (typeof Utils !== 'undefined' && typeof Utils.showMessage === 'function') {
            Utils.showMessage(message, 'success');
        } else {
            // إنشاء رسالة بسيطة
            this.createSimpleMessage(message);
        }
    }

    createSimpleMessage(message) {
        // إزالة الرسائل القديمة
        const oldMessages = document.querySelectorAll('.temp-message');
        oldMessages.forEach(msg => msg.remove());
        
        // إنشاء رسالة جديدة
        const messageEl = document.createElement('div');
        messageEl.className = 'temp-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--success-color, #28a745);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageEl);
        
        // إزالة الرسالة بعد 3 ثوان
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    initAuthUI() {
        const authBtn = document.getElementById('authBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');

        if (authBtn) {
            authBtn.addEventListener('click', () => {
                window.location.href = 'auth.html';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // تحديث واجهة المستخدم بناءً على حالة التسجيل
        this.updateAuthUI();
    }

    updateAuthUI() {
        const authBtn = document.getElementById('authBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');

        try {
            const user = firebase.auth().currentUser;
            if (user) {
                // مستخدم مسجل دخول
                if (authBtn) authBtn.classList.add('hidden');
                if (logoutBtn) logoutBtn.classList.remove('hidden');
                if (userInfo) {
                    userInfo.classList.remove('hidden');
                    userInfo.querySelector('.user-name').textContent = user.displayName || 'مستخدم';
                    userInfo.querySelector('.user-email').textContent = user.email;
                    userInfo.querySelector('.user-avatar').src = user.photoURL || Utils.getAvatarUrl(user.displayName || 'مستخدم');
                }
            } else {
                // مستخدم غير مسجل دخول
                if (authBtn) authBtn.classList.remove('hidden');
                if (logoutBtn) logoutBtn.classList.add('hidden');
                if (userInfo) userInfo.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error updating auth UI:', error);
        }
    }

    async handleLogout() {
        try {
            await firebase.auth().signOut();
            this.updateAuthUI();
            if (typeof Utils !== 'undefined') {
                Utils.showMessage('تم تسجيل الخروج بنجاح', 'success');
            }
        } catch (error) {
            console.error('Error signing out:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showMessage('حدث خطأ في تسجيل الخروج', 'error');
            }
        }
    }

    initNotifications() {
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsDrawerBtn = document.getElementById('notificationsDrawerBtn');

        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                window.location.href = 'notifications.html';
            });
        }

        if (notificationsDrawerBtn) {
            notificationsDrawerBtn.addEventListener('click', () => {
                window.location.href = 'notifications.html';
            });
        }

        // تحديث عدد الإشعارات
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (!badge) return;

        try {
            const user = firebase.auth().currentUser;
            if (user) {
                // هنا يمكنك جلب عدد الإشعارات غير المقروءة من Firebase
                // حالياً نضع رقم عشوائي للعرض
                const unreadCount = Math.floor(Math.random() * 5);
                if (unreadCount > 0) {
                    badge.textContent = unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            } else {
                badge.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error updating notification badge:', error);
            badge.classList.add('hidden');
        }
    }
}

// تهيئة مدير الواجهة عندما تكون الصفحة جاهزة
document.addEventListener('DOMContentLoaded', function() {
    // تحميل الثيم أولاً
    try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        console.log('تم تحميل الثيم الأولي:', savedTheme);
    } catch (error) {
        console.error('خطأ في تحميل الثيم الأولي:', error);
    }

    // ثم تهيئة مدير الواجهة
    window.uiManager = new UIManager();
    console.log('تم تهيئة مدير الواجهة بنجاح');
});

// دالة مساعدة للتصحيح
window.debugThemes = function() {
    console.log('=== تصحيح الثيمات ===');
    console.log('الثيم الحالي:', document.documentElement.getAttribute('data-theme'));
    console.log('الثيم المحفوظ:', localStorage.getItem('theme'));
    console.log('خيارات الثيم:', document.querySelectorAll('.theme-option').length);
    
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach((option, index) => {
        console.log(`خيار ${index + 1}:`, {
            theme: option.getAttribute('data-theme'),
            active: option.classList.contains('active'),
            text: option.textContent
        });
    });
};