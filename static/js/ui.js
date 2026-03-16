/**
 * UI.JS - UI Components & Theme Management
 */

const UI = {
  // Theme Management
  theme: {
    init() {
      const savedTheme = Utils.storage.get('theme', 'light');
      this.set(savedTheme);
      
      // Theme toggle button
      const toggle = document.getElementById('themeToggle');
      if (toggle) {
        toggle.addEventListener('click', () => this.toggle());
        this.updateButton(savedTheme);
      }
    },
    
    set(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      Utils.storage.set('theme', theme);
      this.updateButton(theme);
    },
    
    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.set(next);
    },
    
    updateButton(theme) {
      const toggle = document.getElementById('themeToggle');
      if (!toggle) return;
      
      const isDark = theme === 'dark';
      toggle.innerHTML = isDark 
        ? '<i class="fas fa-sun"></i> Light Mode'
        : '<i class="fas fa-moon"></i> Dark Mode';
    }
  },
  
  // Toast Notifications
  toast: {
    container: null,
    
    init() {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 5000) {
      if (!this.container) this.init();
      
      const toast = document.createElement('div');
      toast.className = `glass-card toast-enter`;
      toast.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        min-width: 300px;
        border-left: 4px solid ${this.getColor(type)};
      `;
      
      const icon = this.getIcon(type);
      toast.innerHTML = `
        <i class="fas ${icon}" style="color: ${this.getColor(type)}; font-size: 20px;"></i>
        <span style="flex: 1; font-weight: 500;">${Utils.escapeHtml(message)}</span>
        <button class="toast-close" style="background: none; border: none; cursor: pointer; color: var(--text-secondary);">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      // Close button
      toast.querySelector('.toast-close').addEventListener('click', () => {
        this.hide(toast);
      });
      
      this.container.appendChild(toast);
      
      // Auto remove
      if (duration > 0) {
        setTimeout(() => this.hide(toast), duration);
      }
      
      return toast;
    },
    
    hide(toast) {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    },
    
    getColor(type) {
      const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--info)'
      };
      return colors[type] || colors.info;
    },
    
    getIcon(type) {
      const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
      };
      return icons[type] || icons.info;
    },
    
    success(message, duration) {
      return this.show(message, 'success', duration);
    },
    
    error(message, duration) {
      return this.show(message, 'error', duration);
    },
    
    warning(message, duration) {
      return this.show(message, 'warning', duration);
    },
    
    info(message, duration) {
      return this.show(message, 'info', duration);
    }
  },
  
  // Loading States
  loading: {
    show(element, text = 'Loading...') {
      if (typeof element === 'string') {
        element = document.getElementById(element);
      }
      if (!element) return;
      
      element.dataset.originalContent = element.innerHTML;
      element.innerHTML = `<i class="fas fa-spinner spin"></i> ${Utils.escapeHtml(text)}`;
      element.disabled = true;
    },
    
    hide(element) {
      if (typeof element === 'string') {
        element = document.getElementById(element);
      }
      if (!element) return;
      
      if (element.dataset.originalContent) {
        element.innerHTML = element.dataset.originalContent;
      }
      element.disabled = false;
    }
  },
  
  // Accordion
  accordion: {
    toggle(id) {
      const content = document.getElementById(id);
      const header = content?.previousElementSibling;
      if (!content || !header) return;
      
      const isActive = content.classList.contains('active');
      
      if (isActive) {
        content.classList.remove('active');
        header.classList.remove('active');
        content.style.display = 'none';
      } else {
        content.classList.add('active');
        header.classList.add('active');
        content.style.display = 'block';
      }
    }
  },
  
  // Form Helpers
  form: {
    getValues(formId) {
      const form = document.getElementById(formId);
      if (!form) return {};
      
      const data = {};
      const elements = form.querySelectorAll('input, select, textarea');
      
      elements.forEach(el => {
        if (el.name) {
          if (el.type === 'checkbox') {
            data[el.name] = el.checked;
          } else if (el.type === 'number') {
            data[el.name] = el.value ? parseFloat(el.value) : null;
          } else {
            data[el.name] = el.value;
          }
        }
      });
      
      return data;
    },
    
    reset(formId) {
      const form = document.getElementById(formId);
      if (form) form.reset();
    },
    
    setDisabled(formId, disabled) {
      const form = document.getElementById(formId);
      if (!form) return;
      
      const elements = form.querySelectorAll('input, select, textarea, button');
      elements.forEach(el => el.disabled = disabled);
    }
  },
  
  // Scroll Helpers
  scroll: {
    to(element, behavior = 'smooth') {
      if (typeof element === 'string') {
        element = document.getElementById(element);
      }
      if (element) {
        element.scrollIntoView({ behavior, block: 'start' });
      }
    },
    
    toTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },
  
  // Drag and Drop
  dragDrop: {
    init(elementId, callbacks) {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
        callbacks.onDragOver?.(e);
      });
      
      element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        callbacks.onDragLeave?.(e);
      });
      
      element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        callbacks.onDrop?.(e);
      });
      
      element.addEventListener('click', () => {
        callbacks.onClick?.();
      });
    }
  },
  
  // Initialize all UI components
  init() {
    this.theme.init();
    this.toast.init();
    
    // Request notification permission
    Utils.requestNotificationPermission();
  }
};

// Export UI
window.UI = UI;
