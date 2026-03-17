/**
 * PLAYLIST.JS - Playlist Management
 */

const Playlist = {
  selectedVideos: [],
  videos: [],
  
  // Initialize playlist module
  init() {
    this.setupEventListeners();
  },
  
  // Setup event listeners
  setupEventListeners() {
    const fetchBtn = document.getElementById('fetchPlaylistBtn');
    if (fetchBtn) {
      fetchBtn.addEventListener('click', () => this.fetchPlaylist());
    }
    
    // URL input - auto fetch for playlist URLs
    const urlInput = document.getElementById('url');
    if (urlInput) {
      urlInput.addEventListener('paste', (e) => {
        setTimeout(() => {
          const url = urlInput.value;
          if (Utils.isPlaylistUrl(url)) {
            this.fetchPlaylist();
          }
        }, 100);
      });
    }
  },
  
  // Fetch playlist metadata
  async fetchPlaylist() {
    const url = document.getElementById('url').value;
    const container = document.getElementById('playlistContainer');
    const list = document.getElementById('playlistList');
    const btn = document.getElementById('fetchPlaylistBtn');
    
    if (!url) {
      UI.toast.warning('Please enter a YouTube URL first');
      return;
    }
    
    UI.loading.show('fetchPlaylistBtn', 'Loading...');
    container.classList.add('visible');
    list.innerHTML = '<div class="empty-state"><i class="fas fa-spinner spin"></i><p>Loading playlist...</p></div>';
    
    try {
      const data = await API.getPlaylistMetadata(url);
      
      if (data.videos && data.videos.length > 0) {
        this.videos = data.videos;
        this.selectedVideos = [];
        this.renderPlaylist(data.videos);
        
        // Show warning for radio playlists
        if (data.is_radio || data.warning) {
          UI.toast.warning(data.warning || 'Radio playlist limited to 50 items', 6000);
        } else {
          UI.toast.success(`Loaded ${data.videos.length} videos`);
        }
      } else {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No videos found in playlist</p></div>';
      }
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error: ${error.message}</p></div>`;
      UI.toast.error('Failed to load playlist');
    } finally {
      UI.loading.hide('fetchPlaylistBtn');
    }
  },
  
  // Render playlist
  renderPlaylist(videos) {
    const list = document.getElementById('playlistList');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Add select all/none controls
    const controls = document.createElement('div');
    controls.className = 'playlist-header';
    controls.innerHTML = `
      <div class="playlist-controls">
        <button class="btn btn-sm" onclick="Playlist.selectAll()">
          <i class="fas fa-check-square"></i> All
        </button>
        <button class="btn btn-secondary btn-sm" onclick="Playlist.selectNone()">
          <i class="fas fa-times-circle"></i> None
        </button>
      </div>
    `;
    list.appendChild(controls);
    
    // Render videos
    videos.forEach((video, index) => {
      const item = this.createPlaylistItem(video, index);
      list.appendChild(item);
    });
  },
  
  // Create playlist item element
  createPlaylistItem(video, index) {
    const div = document.createElement('div');
    div.className = 'playlist-item';
    
    const videoIndex = video.index || index + 1;
    
    div.innerHTML = `
      <input type="checkbox" 
             id="video-${video.id || index}" 
             value="${videoIndex}" 
             onchange="Playlist.toggleSelection(${videoIndex}, this.checked)">
      <div class="playlist-item-content">
        <div class="playlist-item-title">
          <span class="playlist-item-index">${videoIndex}.</span>
          ${Utils.escapeHtml(video.title || 'Unknown Title')}
        </div>
        ${video.duration ? `<span class="playlist-item-duration">${Utils.formatDuration(video.duration)}</span>` : ''}
      </div>
    `;
    
    return div;
  },
  
  // Toggle video selection
  toggleSelection(index, checked) {
    if (checked) {
      if (!this.selectedVideos.includes(index)) {
        this.selectedVideos.push(index);
      }
    } else {
      this.selectedVideos = this.selectedVideos.filter(i => i !== index);
    }
    
    this.updatePlaylistItemsInput();
  },
  
  // Select all videos
  selectAll() {
    this.selectedVideos = this.videos.map((v, i) => v.index || i + 1);
    
    const checkboxes = document.querySelectorAll('#playlistList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    
    this.updatePlaylistItemsInput();
    UI.toast.info(`${this.selectedVideos.length} videos selected`);
  },
  
  // Deselect all videos
  selectNone() {
    this.selectedVideos = [];
    
    const checkboxes = document.querySelectorAll('#playlistList input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    this.updatePlaylistItemsInput();
  },
  
  // Update playlist items input field
  updatePlaylistItemsInput() {
    const input = document.getElementById('playlistItems');
    if (!input) return;
    
    if (this.selectedVideos.length > 0) {
      this.selectedVideos.sort((a, b) => a - b);
      input.value = this.selectedVideos.join(',');
    } else {
      input.value = '';
    }
  },
  
  // Clear playlist
  clear() {
    this.videos = [];
    this.selectedVideos = [];
    
    const container = document.getElementById('playlistContainer');
    const list = document.getElementById('playlistList');
    
    if (container) container.classList.remove('visible');
    if (list) list.innerHTML = '';
  }
};

// Export Playlist
window.Playlist = Playlist;
