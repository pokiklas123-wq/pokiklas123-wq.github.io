// js/utils.js
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
        existingMessages.forEach(msg => {
            msg.style.animation = 'slideOut 0.3s ease';
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
        messageEl.style.backgroundColor = this.getMessageColor(type);
        
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
        
        return messageEl;
    }
    
    static getMessageColor(type) {
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        return colors[type] || colors.info;
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
            const user = firebase.auth().currentUser;
            if (!user) {
                window.location.href = redirectTo;
                return false;
            }
            return true;
        } catch (error) {
            window.location.href = redirectTo;
            return false;
        }
    }
    
  /*  static loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            return savedTheme;
        } catch (error) {
            console.error('Error loading theme:', error);
            return 'dark';
        }
    }*/
    
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
            // 'light': 'fa-moon',
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
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    
    
    
    // js/utils.js - الدالة المعدلة
static loadTheme() {
    try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // تحديد الثيم النشط في الواجهة
        setTimeout(() => {
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-theme') === savedTheme) {
                    option.classList.add('active');
                }
            });
        }, 100);
        
        return savedTheme;
    } catch (error) {
        console.error('Error loading theme:', error);
        return 'dark';
    }
}

// دالة جديدة لتبديل الثيم
static switchTheme(theme) {
    try {
        this.saveTheme(theme);
        
        // تحديث جميع الصفحات المفتوحة
        if (typeof window.updateTheme === 'function') {
            window.updateTheme(theme);
        }
        
        Utils.showMessage(`تم التبديل إلى الوضع ${theme === 'dark' ? 'الأسود' : 'الأزرق'}`, 'success');
    } catch (error) {
        console.error('Error switching theme:', error);
        Utils.showMessage('حدث خطأ في تبديل الثيم', 'error');
    }
}

/*2'/*********/


// إضافة إلى utils.js - دالة تحميل الثيم المحسن
static initializeTheme() {
    try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        console.log('جاري تحميل الثيم:', savedTheme);
        
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // تحديث الأزرار في الواجهة
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === savedTheme) {
                option.classList.add('active');
                console.log('تم تفعيل ثيم:', savedTheme);
            }
        });
        
        return savedTheme;
    } catch (error) {
        console.error('Error initializing theme:', error);
        document.documentElement.setAttribute('data-theme', 'dark');
        return 'dark';
    }
}

// دالة تبديل الثيم المحسنة
static switchTheme(theme) {
    try {
        console.log('جاري تبديل الثيم إلى:', theme);
        
        // تطبيق الثيم
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // تحديث الواجهة
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            }
        });
        
        // إظهار رسالة نجاح
        const message = theme === 'dark' ? 'تم التبديل إلى الوضع الأسود' : 'تم التبديل إلى الوضع الأزرق';
        this.showMessage(message, 'success');
        
        console.log('تم تبديل الثيم بنجاح:', theme);
    } catch (error) {
        console.error('Error switching theme:', error);
        this.showMessage('حدث خطأ في تبديل الثيم', 'error');
    }
}


}