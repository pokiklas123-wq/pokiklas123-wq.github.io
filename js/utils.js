// js/utils.js - الملف المصحح
class Utils {
    static formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        try {
            const date = new Date(parseInt(timestamp));
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) {
                return 'الآن';
            } else if (diffMins < 60) {
                return `منذ ${diffMins} دقيقة`;
            } else if (diffHours < 24) {
                return `منذ ${diffHours} ساعة`;
            } else if (diffDays < 7) {
                return `منذ ${diffDays} يوم`;
            } else {
                return date.toLocaleDateString('ar-EG');
            }
        } catch (error) {
            return 'تاريخ غير معروف';
        }
    }
    
    static showMessage(message, type = 'info') {
        // إزالة أي رسائل سابقة
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // إنشاء عنصر الرسالة
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // إضافة الأنماط
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        if (type === 'success') {
            messageEl.style.backgroundColor = '#27ae60';
        } else if (type === 'error') {
            messageEl.style.backgroundColor = '#e74c3c';
        } else if (type === 'warning') {
            messageEl.style.backgroundColor = '#f39c12';
        } else {
            messageEl.style.backgroundColor = '#3498db';
        }
        
        // إضافة الرسالة إلى الصفحة
        document.body.appendChild(messageEl);
        
        // إزالة الرسالة بعد 5 ثوانٍ
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }
        }, 5000);
        
        // إضافة أنيميشن للرسالة
        if (!document.querySelector('#message-styles')) {
            const style = document.createElement('style');
            style.id = 'message-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        return messageEl;
    }
    
    static validateEmail(email) {
        if (!email) return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static requireAuth(redirectTo = 'auth.html') {
        const user = firebase.auth().currentUser;
        if (!user) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }
    
    static loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            return savedTheme;
        } catch (error) {
            console.error('Error loading theme:', error);
            return 'light';
        }
    }
    
    static saveTheme(theme) {
        try {
            localStorage.setItem('theme', theme);
            document.documentElement.setAttribute('data-theme', theme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }
    
    static debug(message, data = null) {
        if (console && console.log) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }
    
    static handleImageError(img) {
        console.warn('Image failed to load:', img.src);
        img.style.opacity = '0.5';
        img.style.background = '#f0f0f0';
    }
}