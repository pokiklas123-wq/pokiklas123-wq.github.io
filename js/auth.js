// إدارة المصادقة
class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.database = firebase.database();
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        // الاستماع لتغييرات حالة المستخدم
        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this.onAuthStateChange(user);
        });
    }
    
    onAuthStateChange(user) {
        // سيتم تنفيذ هذا في app.js
        if (typeof window.onAuthStateChange === 'function') {
            window.onAuthStateChange(user);
        }
    }
    
    // تسجيل الدخول بالبريد الإلكتروني وكلمة السر
    async signIn(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            
            // تحديث lastLogin
            await this.database.ref('users/' + result.user.uid).update({
                lastLogin: Date.now()
            });
            
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // إنشاء حساب جديد
    async signUp(email, password, displayName) {
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // تحديث profile
            await result.user.updateProfile({
                displayName: displayName
            });
            
            // حفظ بيانات المستخدم في قاعدة البيانات
            const userData = {
                displayName: displayName,
                email: email,
                createdAt: Date.now(),
                lastLogin: Date.now(),
                profile: {
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4ECDC4&color=fff&size=150`,
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
            
            await this.database.ref('users/' + result.user.uid).set(userData);
            
            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // إعادة تعيين كلمة السر
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // تسجيل الخروج
    async signOut() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// تهيئة مدير المصادقة
let authManager;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});