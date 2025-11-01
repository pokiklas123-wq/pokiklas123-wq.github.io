// js/auth.js
// هذا الملف مخصص لمعالجة منطق المصادقة (تسجيل الدخول، التسجيل، إعادة تعيين كلمة السر)
// ويجب استخدامه في صفحة auth.html

import dbManager from './db.js';

class AuthManager {
    constructor() {
        // يجب أن تكون Firebase مهيأة قبل استخدام هذا المدير
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error("Firebase is not initialized. AuthManager cannot function.");
            return;
        }
        this.auth = firebase.auth();
        this.dbManager = dbManager;
    }
    
    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            Utils.showMessage('تم تسجيل الدخول بنجاح', 'success');
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign In Error:', error);
            Utils.showMessage('خطأ في تسجيل الدخول: ' + this.getErrorMessage(error.code), 'error');
            return { success: false, error: error.message };
        }
    }
    
    async register(name, email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // تحديث اسم العرض للمستخدم
            await user.updateProfile({
                displayName: name,
                photoURL: Utils.getAvatarUrl(name)
            });
            
            // حفظ بيانات المستخدم في قاعدة البيانات
            await this.dbManager.updateUserData(user.uid, {
                displayName: name,
                email: email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                photoURL: Utils.getAvatarUrl(name)
            });
            
            Utils.showMessage('تم إنشاء الحساب بنجاح. مرحباً بك!', 'success');
            return { success: true, user: user };
        } catch (error) {
            console.error('Registration Error:', error);
            Utils.showMessage('خطأ في إنشاء الحساب: ' + this.getErrorMessage(error.code), 'error');
            return { success: false, error: error.message };
        }
    }
    
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            Utils.showMessage('تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني', 'success');
            return { success: true };
        } catch (error) {
            console.error('Reset Password Error:', error);
            Utils.showMessage('خطأ في إعادة تعيين كلمة السر: ' + this.getErrorMessage(error.code), 'error');
            return { success: false, error: error.message };
        }
    }
    
    getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/invalid-email':
                return 'صيغة البريد الإلكتروني غير صحيحة.';
            case 'auth/user-disabled':
                return 'تم تعطيل هذا الحساب.';
            case 'auth/user-not-found':
                return 'لا يوجد مستخدم بهذا البريد الإلكتروني.';
            case 'auth/wrong-password':
                return 'كلمة السر غير صحيحة.';
            case 'auth/email-already-in-use':
                return 'هذا البريد الإلكتروني مستخدم بالفعل.';
            case 'auth/weak-password':
                return 'كلمة السر ضعيفة جداً، يجب أن تكون 6 أحرف على الأقل.';
            default:
                return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        }
    }
}

// تهيئة مدير المصادقة
const authManager = new AuthManager();
export default authManager;
