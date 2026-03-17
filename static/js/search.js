/**
 * SEARCH.JS - YouTube Search In-App
 */

const Search = {
  isSearching: false,
  debounceTimer: null,
  
  init() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('searchClear');
    
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch();
        }
      });
      input.addEventListener('input', () => {
        const clear = document.getElementById('searchClear');
        if (clear) clear.style.display = input.value ? 'flex' : 'none';
      });
    }
    if (btn) btn.addEventListener('click', () => this.performSearch());
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (input) input.value = '';
        clearBtn.style.display = 'none';
        this.hideResults();
      });
    }
  },
  
  async performSearch() {
    const input = document.getElementById('searchInput');
    const query = input?.value?.trim();
    if (!query || this.isSearching) return;
    
    this.isSearching = true;
    this.showLoading();
    
    try {
      const data = await API.searchYouTube(query, 10);
      this.renderResults(data.results || []);
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.isSearching = false;
    }
  },
  
  showLoading() {
    const container = document.getElementById('searchResults');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="search-loading">
        <div class="spinner"></div>
        <span>Searching YouTube...</span>
      </div>
    `;
  },
  
  showError(msg) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="search-empty">
        <i class="fas fa-exclamation-circle"></i>
        <span>${Utils.escapeHtml(msg)}</span>
      </div>
    `;
  },
  
  hideResults() {
    const container = document.getElementById('searchResults');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  },
  
  renderResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    container.style.display = 'block';
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty">
          <i class="fas fa-search"></i>
          <span>No results found</span>
        </div>
      `;
      return;
    }
    
    container.innerHTML = results.map((item, i) => `
      <div class="search-result-card card-enter" style="animation-delay: ${i * 40}ms" data-url="${Utils.escapeHtml(item.url)}">
        <img class="search-thumb" src="${API.getThumbnailUrl(item.thumbnail)}" alt="" loading="lazy">
        <div class="search-result-info">
          <div class="search-result-title">${Utils.escapeHtml(item.title || 'Unknown')}</div>
          <div class="search-result-meta">
            ${item.channel ? `<span><i class="fas fa-user"></i> ${Utils.escapeHtml(item.channel)}</span>` : ''}
            ${item.duration ? `<span><i class="fas fa-clock"></i> ${Utils.formatDuration(item.duration)}</span>` : ''}
            ${item.view_count ? `<span><i class="fas fa-eye"></i> ${this.formatViews(item.view_count)}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-sm search-select-btn" title="Use this URL">
          <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `).join('');
    
    // Attach click handlers
    container.querySelectorAll('.search-result-card').forEach(card => {
      const url = card.dataset.url;
      const selectBtn = card.querySelector('.search-select-btn');
      
      const selectAction = () => {
        const urlInput = document.getElementById('url');
        if (urlInput) {
          urlInput.value = url;
          urlInput.dispatchEvent(new Event('input'));
          // Trigger preview
          if (typeof App !== 'undefined' && App.fetchVideoPreview) {
            App.fetchVideoPreview(url);
          }
        }
        this.hideResults();
        UI.toast.success('URL loaded from search');
      };
      
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectAction();
      });
      card.addEventListener('click', selectAction);
    });
  },
  
  formatViews(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }
};

window.Search = Search;
