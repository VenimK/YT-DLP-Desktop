/**
 * DOWNLOADS.JS - Download Management
 */

const Downloads = {
  activeDownloads: new Map(),
  pollInterval: null,
  
  // Initialize downloads module
  init() {
    this.setupEventListeners();
    this.loadDownloads();
  },
  
  // Setup event listeners
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshDownloads');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadDownloads());
    }
    
    // Form submission
    const form = document.getElementById('downloadForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  },
  
  // Handle form submission
  async handleSubmit(e) {
    e.preventDefault();
    
    const url = document.getElementById('url').value;
    if (!url) {
      UI.toast.error('Please enter a YouTube URL');
      return;
    }
    
    // Gather options
    const options = {
      format: document.getElementById('format').value,
      output_template: document.getElementById('outputTemplate').value,
      extract_audio: document.getElementById('extractAudio').checked,
      audio_format: document.getElementById('audioFormat').value,
      audio_quality: document.getElementById('audioQuality').value,
      playlist_items: Playlist.selectedVideos.length > 0 
        ? Playlist.selectedVideos.join(',') 
        : document.getElementById('playlistItems').value,
      max_downloads: document.getElementById('maxDownloads').value,
      flat_playlist: document.getElementById('flatPlaylist').checked,
      playlist_random: document.getElementById('playlistRandom').checked,
      write_playlist_meta: document.getElementById('writePlaylistMeta').checked,
      no_playlist: document.getElementById('noPlaylist').checked,
      embed_thumbnail: document.getElementById('embedThumbnail').checked,
      embed_metadata: document.getElementById('embedMetadata').checked,
      write_thumbnail: document.getElementById('writeThumbnail').checked,
      write_subs: document.getElementById('writeSubs').checked,
      write_auto_subs: document.getElementById('writeAutoSubs').checked,
      sub_langs: document.getElementById('subLangs').value,
      limit_rate: document.getElementById('limitRate').value,
      retries: document.getElementById('retries').value,
      concurrent_fragments: document.getElementById('concurrentFragments').value,
      age_limit: document.getElementById('ageLimit').value,
      sponsorblock: document.getElementById('sponsorblock')?.checked || false,
      split_chapters: document.getElementById('splitChapters')?.checked || false,
      normalize_audio: document.getElementById('normalizeAudio')?.checked || false
    };
    
    UI.loading.show('downloadBtn', 'Starting...');
    
    try {
      const result = await API.startDownload(url, options);
      
      if (result.success) {
        UI.toast.success('Download started!');
        this.addActiveDownload(result.session_id);
        this.startProgressPolling();
      } else {
        UI.toast.error(result.error || 'Failed to start download');
      }
    } catch (error) {
      UI.toast.error(error.message);
    } finally {
      UI.loading.hide('downloadBtn');
    }
  },
  
  // Add active download to tracking
  addActiveDownload(sessionId) {
    this.activeDownloads.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      progress: 0,
      status: 'starting'
    });
    this.renderActiveDownloads();
  },
  
  // Remove active download
  removeActiveDownload(sessionId) {
    this.activeDownloads.delete(sessionId);
    this.renderActiveDownloads();
  },
  
  // Cancel download
  async cancelDownload(sessionId) {
    try {
      await API.cancelDownload(sessionId);
      this.removeActiveDownload(sessionId);
      UI.toast.info('Download cancelled');
    } catch (error) {
      UI.toast.error('Failed to cancel download');
    }
  },
  
  // Start progress polling
  startProgressPolling() {
    if (this.pollInterval) return;
    
    this.pollInterval = setInterval(() => {
      this.pollAllProgress();
    }, 1000);
  },
  
  // Stop progress polling if no active downloads
  stopProgressPolling() {
    if (this.activeDownloads.size === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },
  
  // Poll progress for all active downloads
  async pollAllProgress() {
    if (this.activeDownloads.size === 0) {
      this.stopProgressPolling();
      return;
    }
    
    const promises = Array.from(this.activeDownloads.keys()).map(id => 
      this.pollProgress(id)
    );
    
    await Promise.allSettled(promises);
  },
  
  // Poll progress for a single download
  async pollProgress(sessionId) {
    try {
      const data = await API.getProgress(sessionId);
      const download = this.activeDownloads.get(sessionId);
      
      if (!download) return;
      
      // Update download data
      download.progress = data.progress || 0;
      download.status = data.status;
      download.filename = data.filename;
      download.speed = data.speed;
      download.eta = data.eta;
      
      // Update UI
      this.updateDownloadCard(sessionId, data);
      
      // Handle completion or error
      if (data.status === 'completed') {
        this.handleComplete(sessionId, data);
      } else if (data.status === 'error') {
        this.handleError(sessionId, data);
      }
    } catch (error) {
      console.error(`Progress poll error for ${sessionId}:`, error);
    }
  },
  
  // Handle download completion
  handleComplete(sessionId, data) {
    const download = this.activeDownloads.get(sessionId);
    if (!download || download.completed) return;
    
    download.completed = true;
    download.status = 'completed';
    download.progress = 100;
    
    // Show notification
    UI.toast.success(`Download complete: ${data.filename || 'File'}`, 8000);
    Utils.playSound('complete');
    Utils.showNotification('Download Complete', {
      body: data.filename || 'Your download has finished',
    });
    
    // Add to download history
    if (data.filename) {
      App.addToHistory(data.filename);
    }
    
    // Refresh downloads list
    this.loadDownloads();
    
    // Remove from active after delay
    setTimeout(() => {
      this.removeActiveDownload(sessionId);
    }, 5000);
  },
  
  // Handle download error
  handleError(sessionId, data) {
    const download = this.activeDownloads.get(sessionId);
    if (!download || download.errorShown) return;
    
    download.errorShown = true;
    download.status = 'error';
    
    UI.toast.error(`Download failed: ${data.error || 'Unknown error'}`, 8000);
    Utils.playSound('error');
    
    // Remove from active after delay
    setTimeout(() => {
      this.removeActiveDownload(sessionId);
    }, 10000);
  },
  
  // Cancel all downloads
  async cancelAllDownloads() {
    if (this.activeDownloads.size === 0) {
      UI.toast.info('No active downloads to cancel');
      return;
    }
    
    const count = this.activeDownloads.size;
    
    // Cancel all downloads
    const promises = Array.from(this.activeDownloads.keys()).map(sessionId => 
      API.cancelDownload(sessionId).catch(() => null)
    );
    
    await Promise.allSettled(promises);
    
    // Clear all downloads
    this.activeDownloads.clear();
    this.renderActiveDownloads();
    
    UI.toast.info(`Cancelled ${count} download${count !== 1 ? 's' : ''}`);
  },
  
  // Render active downloads queue
  renderActiveDownloads() {
    const container = document.getElementById('activeDownloads');
    const list = document.getElementById('activeDownloadsList');
    if (!container || !list) return;
    
    if (this.activeDownloads.size === 0) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'block';
    list.innerHTML = '';
    
    this.activeDownloads.forEach((download, sessionId) => {
      const card = this.createDownloadCard(sessionId, download);
      list.appendChild(card);
    });
  },
  
  // Create download card element
  createDownloadCard(sessionId, download) {
    const div = document.createElement('div');
    div.id = `download-${sessionId}`;
    div.className = 'glass-card';
    div.style.cssText = `
      padding: 20px;
      margin-bottom: 16px;
      border-left: 4px solid var(--primary);
    `;
    
    const isActive = download.status === 'downloading' || download.status === 'starting' || download.status === 'running';
    
    div.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="flex: 1; min-width: 0;">
          <div class="download-filename" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${Utils.escapeHtml(download.filename || 'Preparing...')}
          </div>
          <div class="download-stats" style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">
            ${isActive ? '<i class="fas fa-spinner spin"></i> Downloading...' : 'Starting...'}
          </div>
        </div>
        ${isActive ? `
          <button class="btn btn-danger btn-sm" style="margin-left: 12px;" onclick="Downloads.cancelDownload('${sessionId}')">
            <i class="fas fa-times"></i> Cancel
          </button>
        ` : ''}
      </div>
      <div style="background: var(--gray-200); border-radius: 8px; height: 8px; overflow: hidden;">
        <div class="progress-bar-shimmer" style="
          background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
          height: 100%;
          width: ${download.progress || 0}%;
          border-radius: 8px;
          transition: width 0.3s ease;
        "></div>
      </div>
      <div class="progress-text" style="text-align: right; font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
        ${download.progress?.toFixed(1) || 0}%
      </div>
    `;
    
    return div;
  },
  
  // Update download card
  updateDownloadCard(sessionId, data) {
    const card = document.getElementById(`download-${sessionId}`);
    if (!card) return;
    
    // Update filename
    const filenameEl = card.querySelector('.download-filename');
    if (filenameEl && data.filename) {
      filenameEl.textContent = data.filename;
    }
    
    // Update stats
    const statsEl = card.querySelector('.download-stats');
    if (statsEl) {
      let statsText = '';
      if (data.downloaded_bytes && data.total_bytes) {
        statsText += `${Utils.formatFileSize(data.downloaded_bytes)} / ${Utils.formatFileSize(data.total_bytes)}`;
      } else if (data.total_bytes) {
        statsText += Utils.formatFileSize(data.total_bytes);
      }
      if (data.speed) {
        statsText += (statsText ? ' • ' : '') + data.speed;
      }
      if (data.eta) {
        statsText += (statsText ? ' • ' : '') + `${data.eta} remaining`;
      }
      statsEl.textContent = statsText || (data.status === 'completed' ? 'Complete' : 'Processing...');
    }
    
    // Update progress bar
    const progressBar = card.querySelector('.progress-bar-shimmer');
    if (progressBar) {
      progressBar.style.width = `${data.progress || 0}%`;
    }
    
    // Update progress text
    const progressText = card.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `${data.progress?.toFixed(1) || 0}%`;
    }
    
    // Update border color based on status
    if (data.status === 'completed') {
      card.style.borderLeftColor = 'var(--success)';
    } else if (data.status === 'error') {
      card.style.borderLeftColor = 'var(--danger)';
    }
  },
  
  // Load and display downloaded files
  async loadDownloads() {
    const container = document.getElementById('downloadsList');
    if (!container) return;
    
    UI.loading.show('refreshDownloads', 'Loading...');
    
    try {
      const data = await API.getDownloads();
      this.renderDownloadsList(data.files || []);
    } catch (error) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading files</p>
        </div>
      `;
    } finally {
      UI.loading.hide('refreshDownloads');
    }
  },
  
  // Render downloads list
  renderDownloadsList(files) {
    const container = document.getElementById('downloadsList');
    if (!container) return;
    
    if (files.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No downloads yet</p>
        </div>
      `;
      return;
    }
    
    // Sort by modified date (newest first)
    files.sort((a, b) => b.modified - a.modified);
    
    container.innerHTML = '';
    
    files.forEach((file, index) => {
      const fileEl = this.createFileElement(file, index);
      container.appendChild(fileEl);
    });
  },
  
  // Create file element
  createFileElement(file, index) {
    const div = document.createElement('div');
    div.className = 'playlist-item card-enter';
    div.style.animationDelay = `${index * 50}ms`;
    
    const isLyrics = file.name.endsWith('.vtt') || file.name.endsWith('.srt') || file.name.endsWith('.lrc');
    const isAudio = file.name.endsWith('.mp3') || file.name.endsWith('.m4a') || file.name.endsWith('.opus') || file.name.endsWith('.flac') || file.name.endsWith('.wav');
    const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mkv');
    
    let icon = 'fa-file';
    if (isLyrics) icon = 'fa-closed-captioning';
    else if (isAudio) icon = 'fa-music';
    else if (isVideo) icon = 'fa-video';
    
    let actionButtons = '';
    if (isLyrics) {
      actionButtons = `<button class="btn btn-success btn-sm action-view">
        <i class="fas fa-eye"></i> View
      </button>`;
    } else if (isAudio) {
      actionButtons = `<button class="btn btn-sm action-play" title="Play in built-in player">
        <i class="fas fa-play"></i>
      </button>
      <button class="btn btn-sm action-download">
        <i class="fas fa-download"></i>
      </button>`;
    } else {
      actionButtons = `<button class="btn btn-sm action-download">
        <i class="fas fa-download"></i> Download
      </button>`;
    }
    
    actionButtons += `<button class="btn-delete btn-sm action-delete">
      <i class="fas fa-trash"></i>
    </button>`;
    
    div.innerHTML = `
      <i class="fas ${icon}" style="color: var(--primary); font-size: 18px;"></i>
      <div class="playlist-item-content">
        <div class="playlist-item-title">${Utils.escapeHtml(file.name)}</div>
        <div style="font-size: 12px; color: var(--text-secondary);">
          ${Utils.formatFileSize(file.size)} • ${new Date(file.modified * 1000).toLocaleString()}
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        ${actionButtons}
      </div>
    `;
    
    // Attach event listeners after innerHTML is set
    const deleteBtn = div.querySelector('.action-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteDownloadedFile(file.name));
    }
    
    const viewBtn = div.querySelector('.action-view');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => Lyrics.view(file.name));
    }
    
    const downloadBtn = div.querySelector('.action-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => API.downloadFile(file.name));
    }
    
    const playBtn = div.querySelector('.action-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => Player.play(file.name));
    }
    
    return div;
  },
  
  // Delete a downloaded file
  async deleteDownloadedFile(filename) {
    if (!confirm(`Delete "${filename}"?`)) return;
    
    try {
      await API.deleteFile(filename);
      UI.toast.success(`File "${filename}" deleted`);
      this.loadDownloads(); // Refresh list
    } catch (error) {
      UI.toast.error(`Failed to delete "${filename}"`);
    }
  }
};

// Export Downloads
window.Downloads = Downloads;
