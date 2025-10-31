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
        // تبديل بين تسجيل الدخول وإنشاء حساب
        document.getElementById('signupSubmit').addEventListener('click', () => {
            document.getElementById('displayName').style.display = 'block';
        });

        document.getElementById('loginSubmit').addEventListener('click', () => {
            document.getElementById('displayName').style.display = 'none';
        });

        // معالجة تسجيل الدخول
        document.getElementById('loginSubmit').addEventListener('click', () => {
            this.handleLogin();
        });

        // معالجة إنشاء حساب
        document.getElementById('signupSubmit').addEventListener('click', () => {
            this.handleSignup();
        });
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
            ui.toggleAuthModal(false);
            this.updateUI();
            
            // تحميل بيانات المستخدم
            setTimeout(() => {
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
            }, 1000);
            
        } catch (error) {
            ui.showAuthMessage('خطأ في تسجيل الدخول: ' + error.message, 'error');
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
                createdAt: Date.now()
            });

            this.currentUser = userCredential.user;
            ui.showAuthMessage('تم إنشاء الحساب بنجاح', 'success');
            ui.toggleAuthModal(false);
            this.updateUI();
            
        } catch (error) {
            ui.showAuthMessage('خطأ في إنشاء الحساب: ' + error.message, 'error');
        }
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI();
            
            if (user) {
                // تحميل البيانات بعد تسجيل الدخول
                mangaManager.loadMangaList();
                ratingsManager.loadUserRatings();
            }
        });
    }

    updateUI() {
        const userSection = document.getElementById('userSection');
        const drawerLoginBtn = document.getElementById('drawerLoginBtn');
        
        if (this.currentUser) {
            userSection.innerHTML = `
                <div class="user-info">
                    <p>مرحباً، ${this.currentUser.displayName || this.currentUser.email}</p>
                    <button class="btn logout-btn" id="logoutBtn">تسجيل الخروج</button>
                </div>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
            
        } else {
            userSection.innerHTML = `
                <button class="btn drawer-login-btn" id="drawerLoginBtn">تسجيل الدخول</button>
            `;
            
            document.getElementById('drawerLoginBtn').addEventListener('click', () => {
                ui.toggleAuthModal(true);
                ui.toggleDrawer(false);
            });
        }
    }

    async logout() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.updateUI();
            navigationManager.navigateTo('homePage');
            mangaManager.loadMangaList();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

const authManager = new AuthManager();