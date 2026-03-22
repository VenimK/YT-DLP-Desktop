/**
 * UTILS.JS - Utility Functions
 */

// Debounce function
function debounce(func, wait) {
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

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Format duration from seconds
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Lazy loading for images
const LazyLoader = {
  // Initialize lazy loading
  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
    }
  },

  // Observe an image for lazy loading
  observe(img) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img);
    }
  },

  // Load the actual image
  loadImage(img) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.classList.remove('lazy');
      img.classList.add('loaded');
      if (this.observer) {
        this.observer.unobserve(img);
      }
    }
  },

  // Setup lazy loading for all images with data-src
  setup() {
    this.init();
    document.querySelectorAll('img[data-src]').forEach(img => {
      this.observe(img);
    });
  }
};

// Image optimization utilities
const ImageOptimizer = {
  // Convert to WebP if supported
  getOptimizedUrl(originalUrl, width = null, height = null) {
    if (!originalUrl) return '';
    
    // Check WebP support
    const supportsWebP = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    // For YouTube thumbnails, we can optimize
    if (originalUrl.includes('ytimg.com')) {
      let optimizedUrl = originalUrl;
      
      // Add size parameters
      if (width || height) {
        const size = width || height;
        optimizedUrl = optimizedUrl.replace('/default.', `/${size}.`);
      }
      
      // Use WebP if supported
      if (supportsWebP) {
        optimizedUrl = optimizedUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      }
      
      return optimizedUrl;
    }
    
    return originalUrl;
  },

  // Create responsive image markup
  createResponsiveImage(src, alt, className = '') {
    const webpSrc = this.getOptimizedUrl(src);
    const regularSrc = this.getOptimizedUrl(src, 320);
    
    return `
      <picture>
        ${webpSrc !== src ? `<source srcset="${webpSrc}" type="image/webp">` : ''}
        <img 
          src="${regularSrc}" 
          data-src="${src}"
          alt="${alt}" 
          class="${className} lazy" 
          loading="lazy"
        />
      </picture>
    `;
  }
};
const Storage = {
  // Save download history
  saveDownloadHistory(downloads) {
    try {
      localStorage.setItem('yt-dlp-download-history', JSON.stringify(downloads));
    } catch (e) {
      console.warn('Failed to save download history:', e);
    }
  },

  // Load download history
  loadDownloadHistory() {
    try {
      const saved = localStorage.getItem('yt-dlp-download-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to load download history:', e);
      return [];
    }
  },

  // Save user preferences
  savePreferences(prefs) {
    try {
      localStorage.setItem('yt-dlp-preferences', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save preferences:', e);
    }
  },

  // Load user preferences
  loadPreferences() {
    try {
      const saved = localStorage.getItem('yt-dlp-preferences');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Failed to load preferences:', e);
      return {};
    }
  },

  // Clear all storage
  clear() {
    try {
      localStorage.removeItem('yt-dlp-download-history');
      localStorage.removeItem('yt-dlp-preferences');
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  }
};
function formatSpeed(speedStr) {
  if (!speedStr) return '0 KB/s';
  return speedStr;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format time ago (e.g., "2 minutes ago")
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return '1 day ago';
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Parse YouTube URL to extract video ID
function parseYoutubeUrl(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Check if URL is a playlist
function isPlaylistUrl(url) {
  return url && (url.includes('playlist') || url.includes('list='));
}

// Generate unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Local storage helpers
const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

// Wait for a specified time
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry an async function
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Show browser notification
function showNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  new Notification(title, {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'yt-dlp-desktop',
    ...options
  });
}

// Play sound notification
function playSound(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => osc.stop(), 200);
    } else if (type === 'error') {
      osc.frequency.value = 300;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => osc.stop(), 300);
    } else if (type === 'complete') {
      // Two-tone completion sound
      osc.frequency.value = 600;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => {
        osc.frequency.value = 800;
      }, 150);
      setTimeout(() => osc.stop(), 400);
    }
  } catch (e) {
    console.error('Audio error:', e);
  }
}

// Intersection Observer helper
function observeElement(element, callback, options = {}) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    ...options
  });
  
  observer.observe(element);
  return observer;
}

// Export utilities
window.Utils = {
  debounce,
  throttle,
  formatDuration,
  formatFileSize,
  formatSpeed,
  escapeHtml,
  timeAgo,
  parseYoutubeUrl,
  isPlaylistUrl,
  generateId,
  storage,
  sleep,
  retry,
  copyToClipboard,
  requestNotificationPermission,
  showNotification,
  playSound,
  observeElement
};
