/**
 * APP.JS - Main Application
 */

const App = {
  // Initialize the application
  init() {
    this.initUI();
    this.initModules();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.loadAdvancedOptionsPreference();
    
    console.log('🚀 YT-DLP Desktop initialized');
  },
  
  // Initialize UI components
  initUI() {
    UI.init();
  },
  
  // Initialize modules
  initModules() {
    Playlist.init();
    Downloads.init();
    this.initVideoPreview();
    this.initDragDrop();
  },
  
  // Setup global event listeners
  setupEventListeners() {
    // Advanced options accordion
    const accordionHeader = document.querySelector('.accordion-header');
    if (accordionHeader) {
      accordionHeader.addEventListener('click', () => {
        UI.accordion.toggle('advancedOptions');
      });
    }
    
    // Extract audio toggle - disable/enable video format
    const extractAudioCheckbox = document.getElementById('extractAudio');
    const formatSelect = document.getElementById('format');
    if (extractAudioCheckbox && formatSelect) {
      extractAudioCheckbox.addEventListener('change', (e) => {
        formatSelect.disabled = e.target.checked;
        if (e.target.checked) {
          formatSelect.dataset.previousValue = formatSelect.value;
          formatSelect.value = 'bestaudio/best';
        } else {
          formatSelect.value = formatSelect.dataset.previousValue || 'bestvideo+bestaudio/best';
        }
      });
    }
    
    // URL input with debounced preview
    const urlInput = document.getElementById('url');
    if (urlInput) {
      urlInput.addEventListener('input', Utils.debounce((e) => {
        const url = e.target.value;
        if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
          this.fetchVideoPreview(url);
        }
      }, 500));
    }
    
    // Close lyrics button
    const closeLyricsBtn = document.getElementById('closeLyricsBtn');
    if (closeLyricsBtn) {
      closeLyricsBtn.addEventListener('click', () => Lyrics.close());
    }
  },
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+D: Focus URL input
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const urlInput = document.getElementById('url');
        if (urlInput) urlInput.focus();
      }
      
      // Ctrl+Q: Clear form
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        this.clearForm();
      }
      
      // Ctrl+Enter: Submit form
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const form = document.getElementById('downloadForm');
        if (form) form.dispatchEvent(new Event('submit'));
      }
      
      // Escape: Close lyrics
      if (e.key === 'Escape') {
        Lyrics.close();
      }
    });
  },
  
  // Initialize drag and drop
  initDragDrop() {
    UI.dragDrop.init('dropZone', {
      onDragOver: (e) => {
        const dropZone = document.getElementById('dropZone');
        if (dropZone) dropZone.classList.add('drag-over');
      },
      onDragLeave: (e) => {
        const dropZone = document.getElementById('dropZone');
        if (dropZone) dropZone.classList.remove('drag-over');
      },
      onDrop: (e) => {
        const text = e.dataTransfer.getData('text');
        if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
          const urlInput = document.getElementById('url');
          if (urlInput) {
            urlInput.value = text;
            this.fetchVideoPreview(text);
          }
        }
      },
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
            const urlInput = document.getElementById('url');
            if (urlInput) {
              urlInput.value = text;
              this.fetchVideoPreview(text);
            }
          }
        } catch (err) {
          console.log('Clipboard access denied');
        }
      }
    });
  },
  
  // Initialize video preview
  initVideoPreview() {
    // Preview is loaded on URL input
  },
  
  // Fetch video preview
  async fetchVideoPreview(url) {
    const previewCard = document.getElementById('videoPreview');
    if (!previewCard) return;
    
    previewCard.classList.add('visible');
    
    // Show loading state
    document.getElementById('previewThumbnail').src = '';
    document.getElementById('previewTitle').textContent = 'Loading...';
    document.getElementById('previewChannel').querySelector('span').textContent = 'Fetching video info...';
    document.getElementById('previewDuration').querySelector('span').textContent = '';
    
    try {
      const data = await API.getVideoInfo(url);
      
      if (data.title) {
        // Set thumbnail
        const thumbnail = document.getElementById('previewThumbnail');
        if (data.thumbnail) {
          thumbnail.src = API.getThumbnailUrl(data.thumbnail);
          thumbnail.onerror = () => {
            thumbnail.src = this.getPlaceholderImage('No Thumbnail');
          };
        } else {
          thumbnail.src = this.getPlaceholderImage('No Thumbnail');
        }
        
        // Set info
        document.getElementById('previewTitle').textContent = data.title;
        document.getElementById('previewChannel').querySelector('span').textContent = data.channel || 'Unknown Channel';
        document.getElementById('previewDuration').querySelector('span').textContent = data.duration ? Utils.formatDuration(data.duration) : '';
      } else {
        this.showPreviewError(data.error || 'Failed to load preview');
      }
    } catch (error) {
      this.showPreviewError('Error loading preview');
    }
  },
  
  // Show preview error
  showPreviewError(message) {
    const thumbnail = document.getElementById('previewThumbnail');
    thumbnail.src = this.getPlaceholderImage('Error', true);
    document.getElementById('previewTitle').textContent = 'Unable to load preview';
    document.getElementById('previewChannel').querySelector('span').textContent = message;
    document.getElementById('previewDuration').querySelector('span').textContent = '';
  },
  
  // Get placeholder SVG image
  getPlaceholderImage(text, isError = false) {
    const bgColor = isError ? '%23fee2e2' : '%23e2e8f0';
    const textColor = isError ? '%23dc2626' : '%23647569';
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" fill="${bgColor}"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-family="Arial" font-size="16"%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
  },
  
  // Load advanced options visibility preference
  loadAdvancedOptionsPreference() {
    const showByDefault = Utils.storage.get('showAdvancedByDefault', true);
    const checkbox = document.getElementById('showAdvancedByDefault');
    const accordionHeader = document.querySelector('.accordion-header');
    const accordionContent = document.getElementById('advancedOptions');
    
    if (checkbox) checkbox.checked = showByDefault;
    
    if (!showByDefault && accordionHeader && accordionContent) {
      accordionHeader.classList.remove('active');
      accordionContent.classList.remove('active');
      accordionContent.style.display = 'none';
    }
  },
  
  // Toggle advanced options default visibility
  toggleAdvancedDefault(checked) {
    Utils.storage.set('showAdvancedByDefault', checked);
    
    const accordionHeader = document.querySelector('.accordion-header');
    const accordionContent = document.getElementById('advancedOptions');
    
    if (checked) {
      // Show advanced options
      accordionHeader.classList.add('active');
      accordionContent.classList.add('active');
      accordionContent.style.display = 'block';
    } else {
      // Hide advanced options
      accordionHeader.classList.remove('active');
      accordionContent.classList.remove('active');
      accordionContent.style.display = 'none';
    }
    
    UI.toast.info(checked ? 'Advanced options will always be shown' : 'Advanced options will be hidden by default');
  },
  
  // Clear form
  clearForm() {
    const form = document.getElementById('downloadForm');
    if (form) form.reset();
    
    // Hide preview
    const preview = document.getElementById('videoPreview');
    if (preview) preview.classList.remove('visible');
    
    // Clear playlist
    Playlist.clear();
    
    // Close lyrics
    Lyrics.close();
    
    UI.toast.info('Form cleared');
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export App
window.App = App;
