// js/notifications-page.js
// هذا الملف مخصص لمعالجة واجهة المستخدم لصفحة الإشعارات (notifications.html)

import { NotificationsManager } from './notifications.js';

class NotificationsPage {
    constructor() {
        this.notificationsManager = null;
        this.auth = null;
        
        this.init();
    }
    
    init() {
        // يجب أن تكون Firebase مهيأة قبل استخدام هذا الملف
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            try {
                firebase.initializeApp(firebaseConfig);
            } catch (e) {
                console.error("Failed to initialize Firebase in NotificationsPage:", e);
                return;
            }
        }
        
        this.auth = firebase.auth();
        this.notificationsManager = new NotificationsManager(this);
        
        this.setupAuthListener();
        this.setupEventListeners();
        Utils.loadTheme();
    }
    
    setupAuthListener() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.notificationsManager.startListening(user.uid);
            } else {
                // إذا لم يكن المستخدم مسجلاً الدخول، قم بتحويله إلى صفحة المصادقة
                Utils.requireAuth('auth.html');
            }
        });
    }
    
    setupEventListeners() {
        // إعداد أزرار الدرج والثيم (مكرر من manga.js لضمان عملها في هذه الصفحة)
        this.setupDrawer();
        this.setupTheme();
        
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.notificationsManager.markAllAsRead();
            });
        }
    }
    
    setupDrawer() {
        const drawerToggle = document.getElementById('drawerToggle');
        const drawerClose = document.querySelector('.drawer-close');
        const drawerOverlay = document.querySelector('.drawer-overlay');
        
        if (drawerToggle) drawerToggle.addEventListener('click', () => this.openDrawer());
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
    }
    
    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });
        
        // تحديث أيقونة الثيم عند التحميل
        const currentTheme = Utils.loadTheme();
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(currentTheme)}`;
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
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : (currentTheme === 'light' ? 'blue' : 'dark');
        this.changeTheme(newTheme);
    }
    
    changeTheme(theme) {
        Utils.saveTheme(theme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = `fas ${Utils.getThemeIcon(theme)}`;
        }
        
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NotificationsPage();
});
