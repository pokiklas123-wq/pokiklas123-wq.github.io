// js/utils.js
class Utils {
    static formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        try {
            // تحويل التاريخ من timestamp إلى كائن Date
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
                // تنسيق التاريخ ليوم/شهر/سنة
                return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
            }
        } catch (error) {
            console.error("Error formatting timestamp:", error);
            return 'تاريخ غير معروف';
        }
    }
    
    static showMessage(message, type = 'info') {
        // إزالة أي رسائل سابقة
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => {
            // تطبيق animation slideOut
            msg.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (msg.parentNode) {
                    msg.parentNode.removeChild(msg);
                }
            }, 300);
        });
        
        // إنشاء عنصر الرسالة
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // تحديد لون الخلفية بناءً على النوع (للتوافق مع CSS الموحد)
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;
        
        // إضافة الرسالة إلى الصفحة
        document.body.appendChild(messageEl);
        
        // إزالة الرسالة بعد 5 ثوانٍ
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => {
                    if (messageEl.parentNode) {
                        messageEl.parentNode.removeChild(messageEl);
                    }
                }, 300);
            }
        }, 5000);
        
        return messageEl;
    }
    
    static validateEmail(email) {
        if (!email) return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static getAvatarUrl(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'مستخدم')}&background=4ECDC4&color=fff&size=150`;
    }

    static requireAuth(redirectTo = 'auth.html') {
        try {
            // يجب أن يتم استدعاء هذه الدالة بعد تهيئة Firebase
            if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
                window.location.href = redirectTo;
                return false;
            }
            return true;
        } catch (error) {
            // في حال لم يتم تهيئة Firebase بعد
            console.warn("Firebase not initialized when calling requireAuth. Redirecting.");
            window.location.href = redirectTo;
            return false;
        }
    }
    
    static loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme') || 'dark'; // تغيير الافتراضي إلى dark ليتناسب مع main.css
            document.documentElement.setAttribute('data-theme', savedTheme);
            return savedTheme;
        } catch (error) {
            console.error('Error loading theme:', error);
            return 'dark';
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
    
    static getThemeIcon(theme) {
        const icons = {
            'light': 'fa-moon',
            'dark': 'fa-sun',
            'blue': 'fa-palette'
        };
        return icons[theme] || icons.dark;
    }
    
    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static formatNumber(num) {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    static getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
}
