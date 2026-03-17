/**
 * API.JS - Backend API Client
 */

const API = {
  baseUrl: '',
  
  // Generic fetch wrapper with error handling
  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },
  
  // Start a download
  async startDownload(url, options) {
    return this.fetch('/download', {
      method: 'POST',
      body: JSON.stringify({ url, options }),
    });
  },
  
  // Cancel a download
  async cancelDownload(sessionId) {
    return this.fetch(`/cancel/${sessionId}`, {
      method: 'POST',
    });
  },
  
  // Get download progress
  async getProgress(sessionId) {
    return this.fetch(`/progress/${sessionId}`);
  },
  
  // Get video info for preview
  async getVideoInfo(url) {
    return this.fetch('/video-info', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
  
  // Get playlist metadata
  async getPlaylistMetadata(url) {
    return this.fetch('/playlist-metadata', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },
  
  // Get list of downloaded files
  async getDownloads() {
    return this.fetch('/downloads');
  },
  
  // Download a file
  downloadFile(filename) {
    const url = `${this.baseUrl}/download-file/${encodeURIComponent(filename)}`;
    window.open(url, '_blank');
  },
  
  // Fetch lyrics file content
  async getLyricsContent(filename) {
    const url = `${this.baseUrl}/download-file/${encodeURIComponent(filename)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load lyrics');
    }
    return response.text();
  },
  
  // Get thumbnail via proxy
  getThumbnailUrl(thumbnailUrl) {
    return `${this.baseUrl}/thumbnail-proxy?url=${encodeURIComponent(thumbnailUrl)}`;
  },
  
  // Get current server port from window.location
  getCurrentPort() {
    return window.location.port || (window.location.protocol === 'https:' ? 443 : 80);
  },
  
  // Get current server URL
  getCurrentServerUrl() {
    return `${window.location.protocol}//${window.location.hostname}:${this.getCurrentPort()}`;
  }
};

// Export API
window.API = API;
