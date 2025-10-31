// [file name]: auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // معالجة تسجيل الدخول
        document.getElementById('loginSubmit').addEventListener('click', () => {
            this.handleLogin();
        });

        // معالجة إنشاء حساب
        document.getElementById('signupSubmit').addEventListener('click', () => {
            this.handleSignup();
        });

        // إغلاق النافذة عند الضغط خارجها
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target.id === 'authModal') {
                ui.toggleAuthModal(false);
            }
        });

        // تفعيل زر إنشاء حساب عند إظهار حقل اسم المستخدم
        document.getElementById('displayName')?.addEventListener('input', (e) => {
            this.toggleSignupButton();
        });

        // تفعيل الأزرار عند إدخال البيانات
        document.getElementById('loginEmail')?.addEventListener('input', () => {
            this.toggleAuthButtons();
        });

        document.getElementById('loginPassword')?.addEventListener('input', () => {
            this.toggleAuthButtons();
        });
    }

    toggleAuthButtons() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const displayName = document.getElementById('displayName').value;
        
        const loginBtn = document.getElementById('loginSubmit');
        const signupBtn = document.getElementById('signupSubmit');
        
        const hasLoginData = email && password;
        const hasSignupData = email && password && displayName;
        
        if (loginBtn) loginBtn.disabled = !hasLoginData;
        if (signupBtn) signupBtn.disabled = !hasSignupData;
    }

    toggleSignupButton() {
        const displayName = document.getElementById('displayName').value;
        const signupBtn = document.getElementById('signupSubmit');
        
        if (signupBtn) {
            signupBtn.disabled = !displayName;
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            ui.showAuthMessage('يرجى ملء جميع الحقول', 'error');
            return;
        }

        try {
            ui.showAuthMessage('جاري تسجيل الدخول...', 'success');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            ui.showAuthMessage('تم تسجيل الدخول بنجاح', 'success');
            
            setTimeout(() => {
                ui.toggleAuthModal(false);
                this.updateUI();
                // إعادة تحميل البيانات بعد تسجيل الدخول
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
                notificationsManager.loadNotifications();
            }, 1500);
            
        } catch (error) {
            console.error('Error logging in:', error);
            let errorMessage = 'خطأ في تسجيل الدخول';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'المستخدم غير موجود';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'تم تعطيل هذا الحساب';
                    break;
                default:
                    errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
            }
            
            ui.showAuthMessage(errorMessage, 'error');
        }
    }

    async handleSignup() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const displayName = document.getElementById('displayName').value;
        
        if (!email || !password || !displayName) {
            ui.showAuthMessage('يرجى ملء جميع الحقول', 'error');
            return;
        }

        if (password.length < 6) {
            ui.showAuthMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return;
        }

        if (displayName.length < 2) {
            ui.showAuthMessage('اسم المستخدم يجب أن يكون حرفين على الأقل', 'error');
            return;
        }

        try {
            ui.showAuthMessage('جاري إنشاء الحساب...', 'success');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // تحديث الملف الشخصي
            await userCredential.user.updateProfile({
                displayName: displayName
            });

            // حفظ بيانات إضافية للمستخدم
            await database.ref('users/' + userCredential.user.uid).set({
                displayName: displayName,
                email: email,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                preferences: {
                    theme: 'dark',
                    notifications: true
                }
            });

            this.currentUser = userCredential.user;
            ui.showAuthMessage('تم إنشاء الحساب بنجاح', 'success');
            
            setTimeout(() => {
                ui.toggleAuthModal(false);
                this.updateUI();
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
                notificationsManager.loadNotifications();
            }, 1500);
            
        } catch (error) {
            console.error('Error signing up:', error);
            let errorMessage = 'خطأ في إنشاء الحساب';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'عملية التسجيل غير مسموحة';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'كلمة المرور ضعيفة جداً';
                    break;
                default:
                    errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
            }
            
            ui.showAuthMessage(errorMessage, 'error');
        }
    }

    checkAuthState() {
        auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            this.updateUI();
            
            if (user) {
                // تحديث آخر دخول
                await database.ref('users/' + user.uid + '/lastLogin').set(Date.now());
                
                // تحميل بيانات المستخدم
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
                notificationsManager.loadNotifications();
                
                console.log('User logged in:', user.displayName);
            } else {
                console.log('User logged out');
                // إعادة تحميل المانجا للزوار
                mangaManager.loadMangaList();
            }
        });
    }

    updateUI() {
        const userSection = document.getElementById('userSection');
        if (!userSection) return;
        
        if (this.currentUser) {
            userSection.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <p class="user-name">${this.currentUser.displayName || this.currentUser.email}</p>
                        <p class="user-email">${this.currentUser.email}</p>
                    </div>
                    <button class="btn logout-btn" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        تسجيل الخروج
                    </button>
                </div>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
            
        } else {
            userSection.innerHTML = `
                <button class="btn drawer-login-btn" id="drawerLoginBtn">
                    <i class="fas fa-sign-in-alt"></i>
                    تسجيل الدخول
                </button>
            `;
            
            // إعادة إضافة المستمع للزر الجديد
            const loginBtn = document.getElementById('drawerLoginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => {
                    ui.toggleAuthModal(true);
                    ui.toggleDrawer(false);
                });
            }
        }
    }

    async logout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.updateUI();
            ui.navigateToPage('homePage');
            ui.showAuthMessage('تم تسجيل الخروج بنجاح', 'success');
            
            // إعادة تحميل المانجا بعد تسجيل الخروج
            setTimeout(() => {
                mangaManager.loadMangaList();
            }, 1000);
            
        } catch (error) {
            console.error('Error logging out:', error);
            ui.showAuthMessage('حدث خطأ أثناء تسجيل الخروج', 'error');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // دالة للتحقق من صلاحيات المسؤول
    async isAdmin() {
        if (!this.currentUser) return false;
        
        try {
            const userRef = database.ref('users/' + this.currentUser.uid + '/isAdmin');
            const snapshot = await userRef.once('value');
            return snapshot.val() === true;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    // دالة لتحديث الملف الشخصي
    async updateProfile(updates) {
        if (!this.currentUser) {
            ui.showAuthMessage('يجب تسجيل الدخول أولاً', 'error');
            return false;
        }

        try {
            // تحديث في Authentication
            if (updates.displayName) {
                await this.currentUser.updateProfile({
                    displayName: updates.displayName
                });
            }

            // تحديث في Database
            await database.ref('users/' + this.currentUser.uid).update(updates);
            
            ui.showAuthMessage('تم تحديث الملف الشخصي بنجاح', 'success');
            this.updateUI();
            return true;
            
        } catch (error) {
            console.error('Error updating profile:', error);
            ui.showAuthMessage('حدث خطأ في تحديث الملف الشخصي', 'error');
            return false;
        }
    }

    // دالة لإعادة تعيين كلمة المرور
    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            ui.showAuthMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
            return true;
        } catch (error) {
            console.error('Error resetting password:', error);
            ui.showAuthMessage('حدث خطأ في إرسال رابط إعادة التعيين', 'error');
            return false;
        }
    }

    // دالة للتحقق مما إذا كان التفاعل يتطلب تسجيل دخول
    requireAuth(action = 'هذا الإجراء') {
        if (!this.currentUser) {
            ui.showAuthMessage(`يجب تسجيل الدخول لـ ${action}`, 'error');
            ui.toggleAuthModal(true);
            return false;
        }
        return true;
    }
}

const authManager = new AuthManager();