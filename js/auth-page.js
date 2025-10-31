// إدارة صفحة المصادقة
class AuthPage {
    constructor() {
        this.currentTab = 'login';
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        Utils.loadTheme();
        
        // التحقق إذا كان المستخدم مسجلاً بالفعل
        this.checkAuthState();
    }
    
    setupEventListeners() {
        // تبديل التبويبات
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // نموذج تسجيل الدخول
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // نموذج إنشاء حساب
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // نموذج إعادة تعيين كلمة السر
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleResetPassword();
            });
        }
        
        // رابط نسيت كلمة السر
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showResetPasswordForm();
            });
        }
        
        // العودة لتسجيل الدخول من صفحة إعادة التعيين
        document.querySelectorAll('.back-to-login').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab('login');
            });
        });
    }
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // تحديث التبويبات النشطة
        document.querySelectorAll('.auth-tab').forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // تحديث النماذج النشطة
        document.querySelectorAll('.auth-form').forEach(form => {
            if (form.id === `${tabName}Form`) {
                form.classList.add('active');
            } else {
                form.classList.remove('active');
            }
        });
        
        // تحديث العنوان والوصف
        this.updateAuthHeader(tabName);
        
        // مسح الرسائل
        this.clearFormMessage();
    }
    
    updateAuthHeader(tabName) {
        const authTitle = document.getElementById('authTitle');
        const authSubtitle = document.getElementById('authSubtitle');
        
        switch (tabName) {
            case 'login':
                authTitle.textContent = 'تسجيل الدخول';
                authSubtitle.textContent = 'أدخل بياناتك للوصول إلى حسابك';
                break;
            case 'register':
                authTitle.textContent = 'إنشاء حساب';
                authSubtitle.textContent = 'أنشئ حسابك الجديد للبدء';
                break;
            case 'reset':
                authTitle.textContent = 'إعادة تعيين كلمة السر';
                authSubtitle.textContent = 'أدخل بريدك الإلكتروني لإرسال رابط التعيين';
                break;
        }
    }
    
    showResetPasswordForm() {
        this.currentTab = 'reset';
        
        // إخفاء جميع النماذج
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        // إظهار نموذج إعادة التعيين
        document.getElementById('resetPasswordForm').classList.add('active');
        
        // تحديث العنوان
        this.updateAuthHeader('reset');
        
        // إخفاء التبويبات
        document.querySelector('.auth-tabs').style.display = 'none';
    }
    
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const loginBtn = document.getElementById('loginBtn');
        
        // التحقق من صحة البيانات
        if (!email || !password) {
            this.showFormMessage('يرجى ملء جميع الحقول', 'error');
            return;
        }
        
        if (!Utils.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }
        
        // عرض حالة التحميل
        this.setButtonLoading(loginBtn, true);
        
        try {
            const result = await authManager.signIn(email, password);
            
            if (result.success) {
                this.showFormMessage('تم تسجيل الدخول بنجاح!', 'success');
                
                // الانتقال إلى الصفحة الرئيسية بعد ثانيتين
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                
            } else {
                this.showFormMessage(result.error, 'error');
            }
            
        } catch (error) {
            this.showFormMessage('حدث خطأ غير متوقع', 'error');
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
        
        // التحقق من صحة البيانات
        if (!name || !email || !password || !confirmPassword) {
            this.showFormMessage('يرجى ملء جميع الحقول', 'error');
            return;
        }
        
        if (!Utils.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showFormMessage('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showFormMessage('كلمتا السر غير متطابقتين', 'error');
            return;
        }
        
        // عرض حالة التحميل
        this.setButtonLoading(registerBtn, true);
        
        try {
            const result = await authManager.signUp(email, password, name);
            
            if (result.success) {
                this.showFormMessage('تم إنشاء الحساب بنجاح!', 'success');
                
                // الانتقال إلى الصفحة الرئيسية بعد ثانيتين
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                
            } else {
                this.showFormMessage(result.error, 'error');
            }
            
        } catch (error) {
            this.showFormMessage('حدث خطأ غير متوقع', 'error');
        } finally {
            this.setButtonLoading(registerBtn, false);
        }
    }
    
    async handleResetPassword() {
        const email = document.getElementById('resetEmail').value;
        const resetBtn = document.getElementById('resetPasswordBtn');
        
        // التحقق من صحة البيانات
        if (!email) {
            this.showFormMessage('يرجى إدخال البريد الإلكتروني', 'error');
            return;
        }
        
        if (!Utils.validateEmail(email)) {
            this.showFormMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
            return;
        }
        
        // عرض حالة التحميل
        this.setButtonLoading(resetBtn, true);
        
        try {
            const result = await authManager.resetPassword(email);
            
            if (result.success) {
                this.showFormMessage('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني', 'success');
                
                // العودة إلى تسجيل الدخول بعد 3 ثوانٍ
                setTimeout(() => {
                    this.switchTab('login');
                    document.querySelector('.auth-tabs').style.display = 'flex';
                }, 3000);
                
            } else {
                this.showFormMessage(result.error, 'error');
            }
            
        } catch (error) {
            this.showFormMessage('حدث خطأ غير متوقع', 'error');
        } finally {
            this.setButtonLoading(resetBtn, false);
        }
    }
    
    setButtonLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.spinner');
        
        if (isLoading) {
            btnText.style.display = 'none';
            spinner.style.display = 'block';
            button.disabled = true;
        } else {
            btnText.style.display = 'block';
            spinner.style.display = 'none';
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
        formMessage.style.display = 'none';
    }
    
    checkAuthState() {
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // إذا كان المستخدم مسجلاً بالفعل، انتقل إلى الصفحة الرئيسية
                window.location.href = 'index.html';
            }
        });
    }
}

// تهيئة صفحة المصادقة
let authPage;

document.addEventListener('DOMContentLoaded', () => {
    authPage = new AuthPage();
});