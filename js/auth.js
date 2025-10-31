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

        // إرسال النموذج بالضغط على Enter
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.closest('.auth-form')) {
                e.preventDefault();
                if (document.getElementById('displayName').value) {
                    this.handleSignup();
                } else {
                    this.handleLogin();
                }
            }
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
                ui.loadUserPreferences();
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
                case 'auth/too-many-requests':
                    errorMessage = 'تم إجراء محاولات كثيرة، يرجى المحاولة لاحقاً';
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

        if (displayName.length > 20) {
            ui.showAuthMessage('اسم المستخدم يجب أن لا يتجاوز 20 حرفاً', 'error');
            return;
        }

        // التحقق من صحة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            ui.showAuthMessage('البريد الإلكتروني غير صالح', 'error');
            return;
        }

        try {
            ui.showAuthMessage('جاري إنشاء الحساب...', 'success');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // تحديث الملف الشخصي
            await userCredential.user.updateProfile({
                displayName: displayName,
                photoURL: this.generateUserAvatar(displayName)
            });

            // إنشاء بيانات المستخدم في قاعدة البيانات
            const userData = {
                displayName: displayName,
                email: email,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    emailNotifications: false
                },
                profile: {
                    bio: '',
                    avatar: this.generateUserAvatar(displayName)
                },
                stats: {
                    commentsCount: 0,
                    ratingsCount: 0,
                    joinedDate: new Date().toISOString()
                }
            };

            await database.ref('users/' + userCredential.user.uid).set(userData);

            this.currentUser = userCredential.user;
            ui.showAuthMessage('تم إنشاء الحساب بنجاح', 'success');
            
            setTimeout(() => {
                ui.toggleAuthModal(false);
                this.updateUI();
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
                notificationsManager.loadNotifications();
                ui.loadUserPreferences();
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
                case 'auth/network-request-failed':
                    errorMessage = 'خطأ في الاتصال بالشبكة';
                    break;
                default:
                    errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
            }
            
            ui.showAuthMessage(errorMessage, 'error');
        }
    }

    generateUserAvatar(name) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const color = colors[name.length % colors.length];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.replace('#', '')}&color=fff&size=150`;
    }

    checkAuthState() {
        auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            this.updateUI();
            
            if (user) {
                // تحديث آخر دخول
                await database.ref('users/' + user.uid + '/lastLogin').set(Date.now());
                
                // تحميل بيانات المستخدم
                await this.loadUserData();
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
                notificationsManager.loadNotifications();
                ui.loadUserPreferences();
                
                console.log('User logged in:', user.displayName);
            } else {
                console.log('User logged out');
                // إعادة تحميل المانجا للزوار
                mangaManager.loadMangaList();
            }
        });
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const snapshot = await database.ref('users/' + this.currentUser.uid).once('value');
            const userData = snapshot.val();
            
            if (userData) {
                // تحديث صورة المستخدم إذا لم تكن موجودة
                if (!this.currentUser.photoURL && userData.profile?.avatar) {
                    await this.currentUser.updateProfile({
                        photoURL: userData.profile.avatar
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUI() {
        const userSection = document.getElementById('userSection');
        if (!userSection) return;
        
        if (this.currentUser) {
            const userEmail = this.currentUser.email;
            const displayName = this.currentUser.displayName || userEmail.split('@')[0];
            const avatar = this.currentUser.photoURL || this.generateUserAvatar(displayName);
            
            userSection.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar-container">
                        <img src="${avatar}" 
                             alt="${displayName}" 
                             class="user-avatar-large"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=666&color=fff&size=150'">
                    </div>
                    <div class="user-details">
                        <h4 class="user-name">${displayName}</h4>
                        <p class="user-email">${userEmail}</p>
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
            navigationManager.navigateTo('homePage');
            ui.showAlert('تم تسجيل الخروج بنجاح', 'success');
            
            // إعادة تحميل المانجا بعد تسجيل الخروج
            setTimeout(() => {
                mangaManager.loadMangaList();
            }, 1000);
            
        } catch (error) {
            console.error('Error logging out:', error);
            ui.showAlert('حدث خطأ أثناء تسجيل الخروج', 'error');
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
            ui.showAlert('يجب تسجيل الدخول أولاً', 'error');
            return false;
        }

        try {
            // تحديث في Authentication
            if (updates.displayName) {
                await this.currentUser.updateProfile({
                    displayName: updates.displayName,
                    photoURL: updates.photoURL || this.currentUser.photoURL
                });
            }

            // تحديث في Database
            const userUpdates = {};
            if (updates.displayName) userUpdates['displayName'] = updates.displayName;
            if (updates.bio) userUpdates['profile/bio'] = updates.bio;
            if (updates.avatar) userUpdates['profile/avatar'] = updates.avatar;
            
            await database.ref('users/' + this.currentUser.uid).update(userUpdates);
            
            this.updateUI();
            ui.showAlert('تم تحديث الملف الشخصي بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('Error updating profile:', error);
            ui.showAlert('حدث خطأ في تحديث الملف الشخصي', 'error');
            return false;
        }
    }

    // دالة لإعادة تعيين كلمة المرور
    async resetPassword(email) {
        if (!email) {
            ui.showAlert('يرجى إدخال البريد الإلكتروني', 'error');
            return false;
        }

        try {
            await auth.sendPasswordResetEmail(email);
            ui.showAlert('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
            return true;
        } catch (error) {
            console.error('Error resetting password:', error);
            let errorMessage = 'حدث خطأ في إرسال رابط إعادة التعيين';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'البريد الإلكتروني غير مسجل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'تم إجراء محاولات كثيرة، يرجى المحاولة لاحقاً';
                    break;
            }
            
            ui.showAlert(errorMessage, 'error');
            return false;
        }
    }

    // دالة للتحقق مما إذا كان التفاعل يتطلب تسجيل دخول
    requireAuth(action = 'هذا الإجراء') {
        if (!this.currentUser) {
            ui.showAlert(`يجب تسجيل الدخول لـ ${action}`, 'error');
            ui.toggleAuthModal(true);
            return false;
        }
        return true;
    }

    // دالة للحصول على بيانات المستخدم الكاملة
    async getUserProfile() {
        if (!this.currentUser) return null;

        try {
            const snapshot = await database.ref('users/' + this.currentUser.uid).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    // دالة لتحديث إحصائيات المستخدم
    async updateUserStats(statType, increment = 1) {
        if (!this.currentUser) return;

        try {
            const statRef = database.ref(`users/${this.currentUser.uid}/stats/${statType}`);
            const snapshot = await statRef.once('value');
            const currentValue = snapshot.val() || 0;
            await statRef.set(currentValue + increment);
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    // دالة لحذف الحساب
    async deleteAccount() {
        if (!this.currentUser) return false;

        const confirmation = await new Promise((resolve) => {
            ui.showConfirmation(
                'حذف الحساب نهائياً',
                'هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع بياناتك.',
                (confirmed) => {
                    resolve(confirmed);
                }
            );
        });

        if (!confirmation) return false;

        try {
            // حذف بيانات المستخدم من قاعدة البيانات
            await database.ref('users/' + this.currentUser.uid).remove();
            
            // حذف إشعارات المستخدم
            await database.ref('notifications/' + this.currentUser.uid).remove();
            
            // حذف تقييمات المستخدم
            await database.ref('user_ratings/' + this.currentUser.uid).remove();
            
            // حذف الحساب من Authentication
            await this.currentUser.delete();
            
            ui.showAlert('تم حذف الحساب بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('Error deleting account:', error);
            
            let errorMessage = 'حدث خطأ في حذف الحساب';
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'يجب تسجيل الدخول حديثاً لحذف الحساب. يرجى تسجيل الخروج ثم الدخول مرة أخرى.';
            }
            
            ui.showAlert(errorMessage, 'error');
            return false;
        }
    }

    // دالة للتحقق من صحة كلمة المرور
    async verifyPassword(password) {
        if (!this.currentUser || !this.currentUser.email) return false;

        try {
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                password
            );
            await this.currentUser.reauthenticateWithCredential(credential);
            return true;
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    // دالة لتغيير كلمة المرور
    async changePassword(newPassword, currentPassword = null) {
        if (!this.currentUser) return false;

        try {
            // إذا تم تقديم كلمة المرور الحالية، قم بالمصادقة أولاً
            if (currentPassword) {
                const isValid = await this.verifyPassword(currentPassword);
                if (!isValid) {
                    ui.showAlert('كلمة المرور الحالية غير صحيحة', 'error');
                    return false;
                }
            }

            await this.currentUser.updatePassword(newPassword);
            ui.showAlert('تم تغيير كلمة المرور بنجاح', 'success');
            return true;
        } catch (error) {
            console.error('Error changing password:', error);
            
            let errorMessage = 'حدث خطأ في تغيير كلمة المرور';
            if (error.code === 'auth/weak-password') {
                errorMessage = 'كلمة المرور الجديدة ضعيفة جداً';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'يجب تسجيل الدخول حديثاً لتغيير كلمة المرور';
            }
            
            ui.showAlert(errorMessage, 'error');
            return false;
        }
    }

    // دالة لتغيير البريد الإلكتروني
    async changeEmail(newEmail, password) {
        if (!this.currentUser) return false;

        try {
            // التحقق من كلمة المرور أولاً
            const isValid = await this.verifyPassword(password);
            if (!isValid) {
                ui.showAlert('كلمة المرور غير صحيحة', 'error');
                return false;
            }

            await this.currentUser.verifyBeforeUpdateEmail(newEmail);
            
            // تحديث البريد الإلكتروني في قاعدة البيانات
            await database.ref('users/' + this.currentUser.uid + '/email').set(newEmail);
            
            ui.showAlert('تم إرسال رابط التحقق إلى بريدك الإلكتروني الجديد', 'success');
            return true;
        } catch (error) {
            console.error('Error changing email:', error);
            
            let errorMessage = 'حدث خطأ في تغيير البريد الإلكتروني';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'البريد الإلكتروني الجديد مستخدم بالفعل';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'البريد الإلكتروني غير صالح';
            }
            
            ui.showAlert(errorMessage, 'error');
            return false;
        }
    }

    // دالة للحصول على تاريخ إنشاء الحساب
    getAccountCreationDate() {
        if (!this.currentUser || !this.currentUser.metadata) return null;
        return new Date(this.currentUser.metadata.creationTime);
    }

    // دالة للحصول على آخر مرة تم فيها تسجيل الدخول
    getLastSignInTime() {
        if (!this.currentUser || !this.currentUser.metadata) return null;
        return new Date(this.currentUser.metadata.lastSignInTime);
    }

    // دالة للتحقق مما إذا كان البريد الإلكتروني مفعل
    isEmailVerified() {
        return this.currentUser ? this.currentUser.emailVerified : false;
    }

    // دالة لإرسال رسالة التحقق
    async sendEmailVerification() {
        if (!this.currentUser) return false;

        try {
            await this.currentUser.sendEmailVerification();
            ui.showAlert('تم إرسال رسالة التحقق إلى بريدك الإلكتروني', 'success');
            return true;
        } catch (error) {
            console.error('Error sending email verification:', error);
            ui.showAlert('حدث خطأ في إرسال رسالة التحقق', 'error');
            return false;
        }
    }

    // دالة لتسجيل الدخول باستخدام مزود خدمة
    async signInWithProvider(provider) {
        try {
            let authProvider;
            
            switch (provider) {
                case 'google':
                    authProvider = new firebase.auth.GoogleAuthProvider();
                    break;
                case 'facebook':
                    authProvider = new firebase.auth.FacebookAuthProvider();
                    break;
                case 'twitter':
                    authProvider = new firebase.auth.TwitterAuthProvider();
                    break;
                default:
                    throw new Error('مزود الخدمة غير معروف');
            }

            const result = await auth.signInWithPopup(authProvider);
            this.currentUser = result.user;
            
            // حفظ بيانات المستخدم إذا كان أول دخول
            if (result.additionalUserInfo?.isNewUser) {
                const userData = {
                    displayName: this.currentUser.displayName,
                    email: this.currentUser.email,
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    preferences: {
                        theme: 'dark',
                        notifications: true
                    },
                    profile: {
                        bio: '',
                        avatar: this.currentUser.photoURL
                    }
                };
                
                await database.ref('users/' + this.currentUser.uid).set(userData);
            }
            
            ui.toggleAuthModal(false);
            this.updateUI();
            ui.showAlert('تم تسجيل الدخول بنجاح', 'success');
            
            return true;
        } catch (error) {
            console.error('Error signing in with provider:', error);
            ui.showAlert('حدث خطأ في تسجيل الدخول', 'error');
            return false;
        }
    }
}

const authManager = new AuthManager();