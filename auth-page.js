// js/auth-page.js
// هذا الملف مخصص لمعالجة واجهة المستخدم لصفحة المصادقة (auth.html)

import authManager from './auth.js';
import dbManager from './db.js';

class AuthPage {
    constructor() {
        this.currentTab = 'login';
        
        this.init();
    }
    
    init() {
        // يجب أن تكون Firebase مهيأة قبل استخدام هذا الملف
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            // محاولة تهيئة Firebase إذا لم تكن مهيأة
            try {
                firebase.initializeApp(firebaseConfig);
            } catch (e) {
                console.error("Failed to initialize Firebase in AuthPage:", e);
                this.showFormMessage('خطأ في تهيئة النظام', 'error');
                return;
            }
        }
        
        this.setupEventListeners();
        Utils.loadTheme();
        this.checkAuthState();
        this.handleUrlParams();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        document.getElementById('resetPasswordForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResetPassword();
        });
        
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showResetPasswordForm();
        });
        
        document.querySelectorAll('.back-to-login').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab('login');
                document.querySelector('.auth-tabs').style.display = 'flex';
            });
        });
    }
    
    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        if (mode === 'resetPassword') {
            this.showResetPasswordForm();
            this.showFormMessage('يرجى إدخال بريدك الإلكتروني لإعادة تعيين كلمة السر', 'info');
        }
    }
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });
        
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });
        
        this.updateAuthHeader(tabName);
        this.clearFormMessage();
    }
    
    updateAuthHeader(tabName) {
        const titles = {
            'login': 'تسجيل الدخول',
            'register': 'إنشاء حساب',
            'reset': 'إعادة تعيين كلمة السر'
        };
        
        const subtitles = {
            'login': 'أدخل بياناتك للوصول إلى حسابك',
            'register': 'أنشئ حسابك الجديد للبدء',
            'reset': 'أدخل بريدك الإلكتروني لإرسال رابط التعيين'
        };
        
        document.getElementById('authTitle').textContent = titles[tabName];
        document.getElementById('authSubtitle').textContent = subtitles[tabName];
    }
    
    showResetPasswordForm() {
        this.currentTab = 'reset';
        document.querySelector('.auth-tabs').style.display = 'none';
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById('resetPasswordForm').classList.add('active');
        this.updateAuthHeader('reset');
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        
        if (!this.validateLoginForm(email, password)) return;
        
        this.setButtonLoading(loginBtn, true);
        
        const { success } = await authManager.signIn(email, password);
        
        if (success) {
            // تحديث وقت آخر تسجيل دخول
            const user = firebase.auth().currentUser;
            if (user) {
                await dbManager.updateUserData(user.uid, { lastLogin: firebase.database.ServerValue.TIMESTAMP });
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
        
        this.setButtonLoading(loginBtn, false);
    }
    
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const registerBtn = document.getElementById('registerBtn');
        
        if (!this.validateRegisterForm(name, email, password, confirmPassword)) return;
        
        this.setButtonLoading(registerBtn, true);
        
        const { success } = await authManager.register(name, email, password);
        
        if (success) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
        
        this.setButtonLoading(registerBtn, false);
    }
    
    async handleResetPassword() {
        const email = document.getElementById('resetEmail').value;
        const resetBtn = document.getElementById('resetPasswordBtn');
        
        if (!Utils.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }
        
        this.setButtonLoading(resetBtn, true);
        
        const { success } = await authManager.resetPassword(email);
        
        if (success) {
            setTimeout(() => {
                this.switchTab('login');
                document.querySelector('.auth-tabs').style.display = 'flex';
            }, 3000);
        }
        
        this.setButtonLoading(resetBtn, false);
    }
    
    validateLoginForm(email, password) {
        if (!email || !password) {
            this.showFormMessage('يرجى ملء جميع الحقول', 'error');
            return false;
        }
        
        if (!Utils.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return false;
        }
        
        return true;
    }
    
    validateRegisterForm(name, email, password, confirmPassword) {
        if (!name || !email || !password || !confirmPassword) {
            this.showFormMessage('يرجى ملء جميع الحقول', 'error');
            return false;
        }
        
        if (name.length < 2) {
            this.showFormMessage('الاسم يجب أن يكون على الأقل حرفين', 'error');
            return false;
        }
        
        if (!Utils.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return false;
        }
        
        if (password.length < 6) {
            this.showFormMessage('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showFormMessage('كلمتا السر غير متطابقتين', 'error');
            return false;
        }
        
        return true;
    }
    
    setButtonLoading(button, isLoading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        
        if (isLoading) {
            btnText.style.display = 'none';
            if (spinner) spinner.style.display = 'block';
            button.disabled = true;
        } else {
            btnText.style.display = 'block';
            if (spinner) spinner.style.display = 'none';
            button.disabled = false;
        }
    }
    
    showFormMessage(message, type) {
        const formMessage = document.getElementById('formMessage');
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
    }
    
    clearFormMessage() {
        const formMessage = document.getElementById('formMessage');
        formMessage.className = 'form-message';
        formMessage.style.display = 'none';
    }
    
    checkAuthState() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // إذا كان المستخدم مسجلاً الدخول، قم بتحويله إلى الصفحة الرئيسية
                window.location.href = 'index.html';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthPage();
});
