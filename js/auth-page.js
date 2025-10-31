// js/auth-page.js - الملف المصحح

class AuthPage {
    constructor() {
        this.currentTab = 'login';
        this.auth = null;
        this.db = null;
        
        this.init();
    }
    
    init() {
        this.initializeFirebase();
        this.setupEventListeners();
        Utils.loadTheme();
        this.checkAuthState();
    }
    
    initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.auth = firebase.auth();
            this.db = firebase.database();
        } catch (error) {
            console.error('Firebase init error:', error);
        }
    }
    
    setupEventListeners() {
        // التبويبات
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // النماذج
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
        
        // الروابط
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showResetPasswordForm();
        });
        
        document.querySelectorAll('.back-to-login').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab('login');
            });
        });
    }
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // تحديث التبويبات
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });
        
        // تحديث النماذج
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tabName}Form`);
        });
        
        // تحديث العناوين
        this.updateAuthHeader(tabName);
        
        // مسح الرسائل
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
        
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            
            // تحديث lastLogin
            await this.db.ref('users/' + result.user.uid).update({
                lastLogin: Date.now()
            });
            
            this.showFormMessage('تم تسجيل الدخول بنجاح!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            this.showFormMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setButtonLoading(loginBtn, false);
        }
    }
    
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const registerBtn = document.getElementById('registerBtn');
        
        if (!this.validateRegisterForm(name, email, password, confirmPassword)) return;
        
        this.setButtonLoading(registerBtn, true);
        
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // تحديث الملف الشخصي
            await result.user.updateProfile({
                displayName: name
            });
            
            // حفظ بيانات المستخدم
            const userData = {
                displayName: name,
                email: email,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                profile: {
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ECDC4&color=fff&size=150`,
                    bio: ''
                },
                preferences: {
                    emailNotifications: false,
                    notifications: true,
                    theme: 'light'
                },
                stats: {
                    commentsCount: 0,
                    joinedDate: new Date().toISOString(),
                    ratingsCount: 0
                }
            };
            
            await this.db.ref('users/' + result.user.uid).set(userData);
            
            this.showFormMessage('تم إنشاء الحساب بنجاح!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            this.showFormMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setButtonLoading(registerBtn, false);
        }
    }
    
    async handleResetPassword() {
        const email = document.getElementById('resetEmail').value;
        const resetBtn = document.getElementById('resetPasswordBtn');
        
        if (!this.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }
        
        this.setButtonLoading(resetBtn, true);
        
        try {
            await this.auth.sendPasswordResetEmail(email);
            this.showFormMessage('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني', 'success');
            
            setTimeout(() => {
                this.switchTab('login');
                document.querySelector('.auth-tabs').style.display = 'flex';
            }, 3000);
            
        } catch (error) {
            this.showFormMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setButtonLoading(resetBtn, false);
        }
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
    
    getAuthErrorMessage(error) {
        const errorMessages = {
            'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
            'auth/user-disabled': 'هذا الحساب معطل',
            'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني',
            'auth/wrong-password': 'كلمة السر غير صحيحة',
            'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
            'auth/weak-password': 'كلمة السر ضعيفة جداً',
            'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت'
        };
        
        return errorMessages[error.code] || error.message || 'حدث خطأ غير متوقع';
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
    }
    
    clearFormMessage() {
        const formMessage = document.getElementById('formMessage');
        formMessage.className = 'form-message';
    }
    
    checkAuthState() {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                window.location.href = 'index.html';
            }
        });
    }
}

let authPage;

document.addEventListener('DOMContentLoaded', () => {
    authPage = new AuthPage();
});