// Theme Manager
class ThemeManager {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'dark';
    this.initTheme();
    this.setupThemeToggle();
  }

  initTheme() {
    if (this.currentTheme === 'blue') {
      document.body.classList.add('theme-blue');
    }
  }

  toggleTheme() {
    if (this.currentTheme === 'dark') {
      this.currentTheme = 'blue';
      document.body.classList.add('theme-blue');
    } else {
      this.currentTheme = 'dark';
      document.body.classList.remove('theme-blue');
    }
    localStorage.setItem('theme', this.currentTheme);
    this.updateThemeButtons();
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    const darkThemeOption = document.getElementById('dark-theme-option');
    const blueThemeOption = document.getElementById('blue-theme-option');

    if (darkThemeOption) {
      darkThemeOption.addEventListener('click', () => {
        this.currentTheme = 'dark';
        document.body.classList.remove('theme-blue');
        localStorage.setItem('theme', 'dark');
        this.updateThemeButtons();
      });
    }

    if (blueThemeOption) {
      blueThemeOption.addEventListener('click', () => {
        this.currentTheme = 'blue';
        document.body.classList.add('theme-blue');
        localStorage.setItem('theme', 'blue');
        this.updateThemeButtons();
      });
    }
  }

  updateThemeButtons() {
    const darkThemeOption = document.getElementById('dark-theme-option');
    const blueThemeOption = document.getElementById('blue-theme-option');

    if (darkThemeOption) {
      darkThemeOption.classList.toggle('active', this.currentTheme === 'dark');
    }

    if (blueThemeOption) {
      blueThemeOption.classList.toggle('active', this.currentTheme === 'blue');
    }
  }
}

// Drawer Management
class DrawerManager {
  constructor() {
    this.drawer = document.getElementById('drawer');
    this.overlay = document.getElementById('overlay');
    this.setupDrawerToggle();
  }

  setupDrawerToggle() {
    const drawerBtn = document.getElementById('drawer-toggle');
    if (drawerBtn) {
      drawerBtn.addEventListener('click', () => this.toggleDrawer());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.closeDrawer());
    }

    const closeBtn = document.querySelector('.drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }
  }

  toggleDrawer() {
    if (this.drawer.classList.contains('active')) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openDrawer() {
    this.drawer.classList.add('active');
    if (this.overlay) {
      this.overlay.classList.add('active');
    }
  }

  closeDrawer() {
    this.drawer.classList.remove('active');
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
  }
}

// Search Manager
class SearchManager {
  constructor() {
    this.setupSearchToggle();
  }

  setupSearchToggle() {
    const searchToggle = document.getElementById('search-toggle');
    const searchContainer = document.getElementById('search-container');

    if (searchToggle && searchContainer) {
      searchToggle.addEventListener('click', () => {
        searchContainer.classList.add('active');
        const input = document.getElementById('search-input');
        if (input) {
          input.focus();
        }
      });

      const closeBtn = searchContainer.querySelector('.icon-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          searchContainer.classList.remove('active');
        });
      }
    }
  }
}

// Utility Functions
function navigateTo(page) {
  window.location.href = page;
}

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: var(--secondary-dark);
    color: var(--text-primary);
    padding: 1rem 1.5rem;
    border-radius: 8px;
    border-left: 4px solid var(--accent-color);
    z-index: 3000;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Format date from Firebase structure
function formatFirebaseDate(dateString) {
  if (!dateString) return 'تاريخ غير معروف';
  try {
    // Handle format like "2025-09-10-14:35:00"
    const parts = dateString.split('-');
    if (parts.length >= 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2].split(':')[0];
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('ar-EG');
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
}

// Format timestamp to readable time
function formatTimestamp(timestamp) {
  if (!timestamp) return 'وقت غير معروف';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'الآن';
    } else if (diffMins < 60) {
      return `منذ ${diffMins} دقيقة`;
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    } else {
      return date.toLocaleDateString('ar-EG');
    }
  } catch (e) {
    return timestamp;
  }
}

// Additional utility functions for real data structure
function formatFirebaseDate(dateString) {
    if (!dateString) return 'تاريخ غير معروف';
    try {
        // Handle format like "2025-09-10-14:35:00"
        const parts = dateString.split('-');
        if (parts.length >= 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2].split(':')[0];
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('ar-EG');
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'وقت غير معروف';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
            return 'الآن';
        } else if (diffMins < 60) {
            return `منذ ${diffMins} دقيقة`;
        } else if (diffHours < 24) {
            return `منذ ${diffHours} ساعة`;
        } else if (diffDays < 7) {
            return `منذ ${diffDays} أيام`;
        } else {
            return date.toLocaleDateString('ar-EG');
        }
    } catch (e) {
        return timestamp;
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--secondary-dark);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border-left: 4px solid var(--accent-color);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize managers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
  new DrawerManager();
  new SearchManager();
});