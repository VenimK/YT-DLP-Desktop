/**
 * APP.JS - Main Application
 */

const App = {
  _videoInfoCache: new Map(),
  _VIDEO_CACHE_MAX: 50,

  // Initialize the application
  init() {
    this.initStorage();
    this.initUI();
    this.initModules();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.loadAdvancedOptionsPreference();
    this.initServerSettings();
    this.renderDownloadHistory();
    
    // Initialize performance optimizations
    LazyLoader.setup();
    
    // Check for yt-dlp updates in background
    this.checkForUpdate();

    console.log('🚀 YT-DLP Desktop initialized');
  },

  // Initialize storage and load saved data
  initStorage() {
    // Load saved preferences
    const prefs = Storage.loadPreferences();
    if (prefs.theme) {
      document.documentElement.setAttribute('data-theme', prefs.theme);
      UI.theme.updateButton(prefs.theme);
    }
    if (prefs.advancedOptions) {
      UI.accordion.show('advancedOptions');
    }
  },
  
  // Initialize UI components
  initUI() {
    UI.init();
  },
  
  // Initialize modules
  initModules() {
    Playlist.init();
    Downloads.init();
    Search.init();
    Presets.init();
    Player.init();
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
    const audioFormatSelect = document.getElementById('audioFormat');
    const audioQualityInput = document.getElementById('audioQuality');
    
    if (extractAudioCheckbox && formatSelect) {
      // Restore saved preferences
      const savedExtractAudio = Utils.storage.get('extractAudio', false);
      const savedVideoFormat = Utils.storage.get('videoFormat', 'bestvideo+bestaudio/best');
      const savedAudioFormat = Utils.storage.get('audioFormat', 'mp3');
      const savedAudioQuality = Utils.storage.get('audioQuality', '5');
      
      extractAudioCheckbox.checked = savedExtractAudio;
      if (audioFormatSelect) audioFormatSelect.value = savedAudioFormat;
      if (audioQualityInput) audioQualityInput.value = savedAudioQuality;
      
      // Apply video format (or audio-only if extract audio is checked)
      formatSelect.disabled = savedExtractAudio;
      if (savedExtractAudio) {
        formatSelect.value = 'bestaudio/best';
        formatSelect.dataset.previousValue = savedVideoFormat;
      } else {
        formatSelect.value = savedVideoFormat;
      }
      
      extractAudioCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        formatSelect.disabled = isChecked;
        
        // Save preference
        Utils.storage.set('extractAudio', isChecked);
        
        if (isChecked) {
          // Save current video format before switching to audio
          Utils.storage.set('videoFormat', formatSelect.value);
          formatSelect.dataset.previousValue = formatSelect.value;
          formatSelect.value = 'bestaudio/best';
        } else {
          // Restore previous video format
          const previousFormat = formatSelect.dataset.previousValue || Utils.storage.get('videoFormat', 'bestvideo+bestaudio/best');
          formatSelect.value = previousFormat;
        }
      });
      
      // Save video format when changed
      formatSelect.addEventListener('change', (e) => {
        if (!extractAudioCheckbox.checked) {
          Utils.storage.set('videoFormat', e.target.value);
        }
      });
    }
    
    // Save audio format preference
    if (audioFormatSelect) {
      audioFormatSelect.addEventListener('change', (e) => {
        Utils.storage.set('audioFormat', e.target.value);
      });
    }
    
    // Save audio quality preference
    if (audioQualityInput) {
      audioQualityInput.addEventListener('change', (e) => {
        Utils.storage.set('audioQuality', e.target.value);
      });
    }
    
    // URL input with debounced preview - works with any supported platform
    const urlInput = document.getElementById('url');
    if (urlInput) {
      urlInput.addEventListener('input', Utils.debounce((e) => {
        const url = e.target.value;
        // Trigger preview for any URL that looks like a video/audio link
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
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
      // Only handle shortcuts when not typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Ctrl/Cmd + K: Focus URL input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('url').focus();
      }
      
      // Ctrl/Cmd + Enter: Start download
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const urlInput = document.getElementById('url');
        if (urlInput.value.trim()) {
          document.getElementById('downloadBtn').click();
        }
      }
      
      // Ctrl/Cmd + D: Toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        UI.theme.toggle();
      }
      
      // Ctrl/Cmd + L: Clear URL input
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        document.getElementById('url').value = '';
        document.getElementById('url').focus();
      }
      
      // Escape: Close modals and clear preview
      if (e.key === 'Escape') {
        this.hideKeyboardShortcuts();
        this.clearPreview();
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
        // Accept any URL that looks like a video/audio link
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
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
          // Accept any URL that looks like a video/audio link
          if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
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

  // ── Format Picker ────────────────────────────────────────────────────────

  async fetchFormats() {
    const url = (document.getElementById('url')?.value || '').trim();
    if (!url) {
      UI.toast.error('Enter a URL first, then click Pick.');
      return;
    }
    const modal   = document.getElementById('formatPickerModal');
    const title   = document.getElementById('formatPickerTitle');
    const content = document.getElementById('formatPickerContent');
    if (!modal) return;

    content.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Fetching formats…</p></div>';
    title.textContent = '';
    modal.style.display = 'block';

    try {
      const res  = await fetch('/fetch-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        content.innerHTML = `<p style="color:var(--danger);"><i class="fas fa-exclamation-circle"></i> ${data.error || 'Failed to fetch formats'}</p>`;
        return;
      }
      if (data.title) title.textContent = data.title;
      this._renderFormatTable(data.formats, content);
    } catch (e) {
      content.innerHTML = `<p style="color:var(--danger);">Network error: ${e.message}</p>`;
    }
  },

  _renderFormatTable(formats, container) {
    const groups = {
      full:  formats.filter(f => f.has_video && f.has_audio),
      video: formats.filter(f => f.has_video && !f.has_audio),
      audio: formats.filter(f => !f.has_video && f.has_audio),
    };
    const fmtSize = b => {
      if (!b) return '?';
      if (b > 1e9) return (b/1e9).toFixed(1) + ' GB';
      if (b > 1e6) return (b/1e6).toFixed(1) + ' MB';
      return (b/1e3).toFixed(0) + ' KB';
    };
    const fmtCodec = v => v && v !== 'none' ? v.split('.')[0] : '—';
    const row = f => `
      <tr style="cursor:pointer;" onclick="App.selectFormat('${f.format_id}')"
          title="Click to use this format">
        <td style="font-family:monospace;font-size:0.85em;">${f.format_id}</td>
        <td>${f.ext}</td>
        <td>${f.resolution || f.format_note || '—'}</td>
        <td>${f.fps ? f.fps + 'fps' : '—'}</td>
        <td>${fmtCodec(f.vcodec)}</td>
        <td>${fmtCodec(f.acodec)}</td>
        <td>${fmtSize(f.filesize)}</td>
      </tr>`;
    const table = (rows, note) => rows.length === 0 ? '' : `
      <p style="margin:16px 0 6px; font-weight:600; color:var(--primary);">${note}</p>
      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.88em;">
        <thead><tr style="text-align:left; color:var(--text-muted); border-bottom:1px solid var(--gray-200);">
          <th style="padding:4px 8px;">ID</th><th style="padding:4px 8px;">Ext</th>
          <th style="padding:4px 8px;">Resolution</th><th style="padding:4px 8px;">FPS</th>
          <th style="padding:4px 8px;">Video codec</th><th style="padding:4px 8px;">Audio codec</th>
          <th style="padding:4px 8px;">Size</th>
        </tr></thead>
        <tbody>${rows.map(row).join('')}</tbody>
      </table></div>`;
    container.innerHTML =
      '<p style="margin:0 0 4px;font-size:0.85em;color:var(--text-muted);">Click a row to use that format ID. Or combine IDs manually, e.g. <code>137+251</code>.</p>' +
      table(groups.full,  '🎬 Video + Audio') +
      table(groups.video, '📹 Video only') +
      table(groups.audio, '🔊 Audio only');
    // Hover highlight
    container.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('mouseenter', () => tr.style.background = 'var(--gray-100)');
      tr.addEventListener('mouseleave', () => tr.style.background = '');
    });
  },

  selectFormat(id) {
    const sel = document.getElementById('format');
    if (!sel) return;
    // Add a custom option if not already present
    let opt = sel.querySelector(`option[value="${id}"]`);
    if (!opt) {
      opt = new Option(`Custom: ${id}`, id);
      sel.appendChild(opt);
    }
    sel.value = id;
    this.closeFormatPicker();
    UI.toast.success(`Format set to ${id}`);
  },

  closeFormatPicker() {
    const modal = document.getElementById('formatPickerModal');
    if (modal) modal.style.display = 'none';
  },

  // ── Subtitle Picker ───────────────────────────────────────────────────────

  _LANG_NAMES: {
    af:'Afrikaans',am:'Amharic',ar:'Arabic',az:'Azerbaijani',be:'Belarusian',
    bg:'Bulgarian',bn:'Bengali',bs:'Bosnian',ca:'Catalan',cs:'Czech',
    cy:'Welsh',da:'Danish',de:'German',el:'Greek',en:'English',
    'en-orig':'English (original)',es:'Spanish',et:'Estonian',eu:'Basque',
    fa:'Persian',fi:'Finnish',fil:'Filipino',fr:'French',gl:'Galician',
    gu:'Gujarati',he:'Hebrew',hi:'Hindi',hr:'Croatian',hu:'Hungarian',
    hy:'Armenian',id:'Indonesian',is:'Icelandic',it:'Italian',ja:'Japanese',
    ka:'Georgian',kk:'Kazakh',km:'Khmer',kn:'Kannada',ko:'Korean',
    lo:'Lao',lt:'Lithuanian',lv:'Latvian',mk:'Macedonian',ml:'Malayalam',
    mn:'Mongolian',mr:'Marathi',ms:'Malay',my:'Burmese',ne:'Nepali',
    nl:'Dutch',no:'Norwegian',pa:'Punjabi',pl:'Polish',pt:'Portuguese',
    ro:'Romanian',ru:'Russian',si:'Sinhala',sk:'Slovak',sl:'Slovenian',
    sq:'Albanian',sr:'Serbian',sv:'Swedish',sw:'Swahili',ta:'Tamil',
    te:'Telugu',th:'Thai',tr:'Turkish',uk:'Ukrainian',ur:'Urdu',
    uz:'Uzbek',vi:'Vietnamese','zh-Hans':'Chinese (Simplified)',
    'zh-Hant':'Chinese (Traditional)',zu:'Zulu',
  },

  _subtitleData: null,

  async fetchSubtitles() {
    const url = (document.getElementById('url')?.value || '').trim();
    if (!url) { UI.toast.error('Enter a URL first, then click Pick.'); return; }

    const modal   = document.getElementById('subtitlePickerModal');
    const titleEl = document.getElementById('subtitlePickerTitle');
    const content = document.getElementById('subtitlePickerContent');
    const search  = document.getElementById('subtitleSearch');
    if (!modal) return;

    content.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading subtitles…</p></div>';
    if (search) search.value = '';
    if (titleEl) titleEl.textContent = '';
    modal.style.display = 'block';

    try {
      const res  = await fetch('/fetch-subtitles', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        content.innerHTML = `<p style="color:var(--danger);"><i class="fas fa-exclamation-circle"></i> ${data.error || 'Failed'}</p>`;
        return;
      }
      if (titleEl && data.title) titleEl.textContent = data.title;
      this._subtitleData = data;
      this._renderSubtitleList(data, content, '');
    } catch (e) {
      content.innerHTML = `<p style="color:var(--danger);">Network error: ${e.message}</p>`;
    }
  },

  _renderSubtitleList(data, container, filter) {
    const q = filter.toLowerCase();
    const nameOf = code => this._LANG_NAMES[code] || code;
    const matches = (code) => !q || code.toLowerCase().includes(q) || nameOf(code).toLowerCase().includes(q);

    const buildRows = (dict, type, badge, badgeColor) =>
      Object.entries(dict)
        .filter(([code]) => matches(code))
        .sort(([a], [b]) => nameOf(a).localeCompare(nameOf(b)))
        .map(([code, exts]) => {
          const name  = nameOf(code);
          const fmts  = exts.join(', ') || '?';
          const alreadySelected = (document.getElementById('subLangs')?.value || '').split(',').map(s=>s.trim()).includes(code);
          return `<tr style="cursor:pointer;${alreadySelected?' background:var(--gray-100);':''}"
                      onclick="App.selectSubtitle('${code}','${type}')"
                      title="Add ${name} (${code}) to subtitle languages">
            <td style="padding:5px 8px; font-weight:600; font-family:monospace; font-size:0.9em;">${code}</td>
            <td style="padding:5px 8px;">${name}</td>
            <td style="padding:5px 8px;"><span style="background:${badgeColor};color:#fff;border-radius:4px;padding:1px 6px;font-size:0.75em;">${badge}</span></td>
            <td style="padding:5px 8px; color:var(--text-muted); font-size:0.8em;">${fmts}</td>
            ${alreadySelected ? '<td style="padding:5px 8px; color:var(--success);"><i class="fas fa-check"></i></td>' : '<td></td>'}
          </tr>`;
        }).join('');

    const manualRows = buildRows(data.manual || {}, 'manual', 'Manual', '#6c757d');
    const autoRows   = buildRows(data.auto   || {}, 'auto',   'Auto',   '#0d6efd');

    if (!manualRows && !autoRows) {
      container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No subtitles found matching your search.</p>';
      return;
    }

    const section = (label, icon, rows) => rows ? `
      <p style="margin:14px 0 6px; font-weight:600; color:var(--primary);">${icon} ${label}</p>
      <div style="overflow-x:auto; max-height:280px; overflow-y:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:0.88em;">
        <thead><tr style="color:var(--text-muted); border-bottom:1px solid var(--gray-200);">
          <th style="padding:4px 8px;">Code</th><th style="padding:4px 8px;">Language</th>
          <th style="padding:4px 8px;">Type</th><th style="padding:4px 8px;">Formats</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '';

    container.innerHTML =
      section('Manually uploaded by creator', '📝', manualRows) +
      section('Auto-generated & translatable', '🤖', autoRows);

    container.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('mouseenter', () => { if(!tr.style.background) tr.style.background='var(--gray-100)'; });
      tr.addEventListener('mouseleave', () => { tr.style.background = tr.querySelector('.fa-check') ? 'var(--gray-100)' : ''; });
    });
  },

  _filterSubtitles(q) {
    if (!this._subtitleData) return;
    const content = document.getElementById('subtitlePickerContent');
    if (content) this._renderSubtitleList(this._subtitleData, content, q);
  },

  selectSubtitle(code, type) {
    const input = document.getElementById('subLangs');
    if (!input) return;
    const current = input.value.split(',').map(s => s.trim()).filter(Boolean);
    if (!current.includes(code)) {
      current.push(code);
      input.value = current.join(',');
    }
    // Auto-check the right download checkbox
    if (type === 'manual') {
      const cb = document.getElementById('writeSubs');
      if (cb) cb.checked = true;
    } else {
      const cb = document.getElementById('writeAutoSubs');
      if (cb) cb.checked = true;
    }
    // Auto-enable embed subtitles (unless audio-only mode is active)
    const audioOnly  = document.getElementById('extractAudio')?.checked;
    const embedSubs  = document.getElementById('embedSubs');
    if (embedSubs && !audioOnly) embedSubs.checked = true;

    // YouTube rate-limits subtitle translation requests (HTTP 429) for unauthenticated sessions.
    // Auto-set Safari cookies if no browser is already selected.
    const cookiesSel = document.getElementById('cookiesFromBrowser');
    let cookieNote = '';
    if (cookiesSel && !cookiesSel.value) {
      cookiesSel.value = 'safari';
      cookieNote = ' • Safari cookies enabled to bypass YouTube rate limits';
    }

    // Refresh the list to show checkmark
    if (this._subtitleData) {
      const content = document.getElementById('subtitlePickerContent');
      const search  = document.getElementById('subtitleSearch');
      if (content) this._renderSubtitleList(this._subtitleData, content, search?.value || '');
    }
    const langName = this._LANG_NAMES[code] || code;
    const embedNote = (!audioOnly && embedSubs) ? ' — will be embedded in MP4' : '';
    UI.toast.success(`Added "${langName}" (${code})${embedNote}${cookieNote}`);
  },

  closeSubtitlePicker() {
    const modal = document.getElementById('subtitlePickerModal');
    if (modal) modal.style.display = 'none';
    this._subtitleData = null;
  },

  // ─────────────────────────────────────────────────────────────────────────

  // Toggle batch URL mode
  toggleBatchMode() {
    const single = document.getElementById('url');
    const batch = document.getElementById('urlBatch');
    const btn = document.getElementById('batchToggleBtn');
    const playlist = document.getElementById('fetchPlaylistBtn');
    if (!single || !batch) return;

    const isBatch = batch.style.display !== 'none';
    single.style.display = isBatch ? '' : 'none';
    single.required = isBatch;
    batch.style.display = isBatch ? 'none' : '';
    if (playlist) playlist.style.display = isBatch ? '' : 'none';
    if (btn) btn.innerHTML = isBatch
      ? '<i class="fas fa-list-ul"></i> Batch'
      : '<i class="fas fa-times"></i> Single';
  },

  // Check for yt-dlp updates via backend
  async checkForUpdate() {
    try {
      const data = await API.fetch('/check-update');
      if (data.checked && data.latest && data.current && data.latest !== data.current) {
        const dismissed = localStorage.getItem('yt-dlp-dismissed-update');
        if (dismissed === data.latest) return;
        const banner = document.getElementById('updateBanner');
        const text = document.getElementById('updateBannerText');
        if (banner) banner.style.display = 'block';
        if (text) text.textContent = `${data.current} → ${data.latest}`;
      }
    } catch (e) {
      // Non-critical; silently ignore
    }
  },

  // Dismiss the update banner and remember this version
  dismissUpdateBanner() {
    const banner = document.getElementById('updateBanner');
    if (banner) banner.style.display = 'none';
    const text = document.getElementById('updateBannerText');
    if (text) {
      const version = (text.textContent || '').split('→').pop().trim();
      if (version) localStorage.setItem('yt-dlp-dismissed-update', version);
    }
  },

  // Trigger yt-dlp self-update
  async updateYtDlp() {
    const btn = document.getElementById('updateYtDlpBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner spin"></i> Updating...'; }
    try {
      const data = await API.fetch('/update-ytdlp', { method: 'POST' });
      UI.toast.success(data.message || 'yt-dlp updated successfully!');
      localStorage.removeItem('yt-dlp-dismissed-update');
      const banner = document.getElementById('updateBanner');
      if (banner) banner.style.display = 'none';
    } catch (e) {
      UI.toast.error('Update failed: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> Update'; }
    }
  },

  // Clear the video preview card
  clearPreview() {
    const previewCard = document.getElementById('videoPreview');
    if (previewCard) previewCard.classList.remove('visible');
    const previewThumbnail = document.getElementById('previewThumbnail');
    if (previewThumbnail) previewThumbnail.src = '';
  },
  
  // Fetch video preview (with in-session cache)
  async fetchVideoPreview(url) {
    if (this._videoInfoCache.has(url)) {
      const cached = this._videoInfoCache.get(url);
      this._applyVideoPreview(url, cached);
      return;
    }
    const previewCard = document.getElementById('videoPreview');
    const previewLoading = document.getElementById('previewLoading');
    const previewContent = document.getElementById('previewContent');
    
    if (!previewCard) return;
    
    // Show card and loading state
    previewCard.classList.add('visible');
    if (previewLoading) previewLoading.style.display = 'flex';
    if (previewContent) previewContent.style.display = 'none';
    
    try {
      const data = await API.getVideoInfo(url);
      this._videoInfoCache.set(url, data);
      if (this._videoInfoCache.size > this._VIDEO_CACHE_MAX) {
        this._videoInfoCache.delete(this._videoInfoCache.keys().next().value);
      }
      this._applyVideoPreview(url, data);
    } catch (error) {
      if (previewLoading) previewLoading.style.display = 'none';
      if (previewContent) previewContent.style.display = 'block';
      this.showPreviewError('Error loading preview');
    }
  },

  // Apply fetched video data to the preview card
  _applyVideoPreview(url, data) {
    const previewCard = document.getElementById('videoPreview');
    const previewLoading = document.getElementById('previewLoading');
    const previewContent = document.getElementById('previewContent');

    if (!previewCard) return;
    previewCard.classList.add('visible');

    if (data.title) {
      if (previewLoading) previewLoading.style.display = 'none';
      if (previewContent) previewContent.style.display = 'block';

      document.getElementById('previewTitle').textContent = data.title;

      const thumbnail = document.getElementById('previewThumbnail');
      if (data.thumbnail) {
        const img = new Image();
        img.onload = () => { thumbnail.src = img.src; thumbnail.classList.add('loaded'); };
        img.onerror = () => { thumbnail.src = this.getPlaceholderImage('No Thumbnail'); };
        img.src = API.getThumbnailUrl(data.thumbnail);
      } else {
        thumbnail.src = this.getPlaceholderImage('No Thumbnail');
      }

      const channelEl = document.getElementById('previewChannel');
      if (data.channel) {
        channelEl.querySelector('span').textContent = data.channel;
        channelEl.style.display = 'inline-flex';
      } else {
        channelEl.style.display = 'none';
      }

      const durationEl = document.getElementById('previewDuration');
      if (data.duration) {
        durationEl.querySelector('span').textContent = Utils.formatDuration(data.duration);
        durationEl.style.display = 'inline-flex';
      } else {
        durationEl.style.display = 'none';
      }

      const viewsEl = document.getElementById('previewViews');
      if (data.view_count) {
        viewsEl.querySelector('span').textContent = this.formatNumber(data.view_count) + ' views';
        viewsEl.style.display = 'inline-flex';
      } else {
        viewsEl.style.display = 'none';
      }

      const likesEl = document.getElementById('previewLikes');
      if (data.like_count) {
        likesEl.querySelector('span').textContent = this.formatNumber(data.like_count) + ' likes';
        likesEl.style.display = 'inline-flex';
      } else {
        likesEl.style.display = 'none';
      }

      const dateEl = document.getElementById('previewDate');
      if (data.upload_date) {
        dateEl.querySelector('span').textContent = data.upload_date;
        dateEl.style.display = 'inline-flex';
      } else {
        dateEl.style.display = 'none';
      }

      const descEl = document.getElementById('previewDescription');
      if (data.description) {
        descEl.textContent = data.description;
        descEl.style.display = 'block';
      } else {
        descEl.style.display = 'none';
      }

      const formatsEl = document.getElementById('previewFormats');
      const formatsListEl = document.getElementById('previewFormatsList');
      if (data.formats && data.formats.length > 0) {
        formatsListEl.innerHTML = data.formats.map(f => {
          let badgeClass = '';
          if (f.height >= 2160) badgeClass = 'uhd';
          else if (f.height >= 1080) badgeClass = 'hd';
          return `<span class="preview-format-badge ${badgeClass}">${f.height}p</span>`;
        }).join('');
        formatsEl.style.display = 'block';
      } else {
        formatsEl.style.display = 'none';
      }
    } else {
      this.showPreviewError(data.error || 'Failed to load preview');
    }
  },
  
  // Show preview error
  showPreviewError(message) {
    const previewLoading = document.getElementById('previewLoading');
    const previewContent = document.getElementById('previewContent');
    
    if (previewLoading) previewLoading.style.display = 'none';
    if (previewContent) previewContent.style.display = 'block';
    
    const thumbnail = document.getElementById('previewThumbnail');
    thumbnail.src = this.getPlaceholderImage('Error', true);
    document.getElementById('previewTitle').textContent = 'Unable to load preview';
    
    const channelEl = document.getElementById('previewChannel');
    channelEl.querySelector('span').textContent = message;
    channelEl.style.display = 'inline-flex';
    
    // Hide other metadata
    ['previewDuration', 'previewViews', 'previewLikes', 'previewDate', 'previewDescription', 'previewFormats'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  },
  
  // Format large numbers (e.g., 1234567 -> 1.2M)
  formatNumber(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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
  
  // Save server settings
  async saveServerSettings() {
    const portInput = document.getElementById('serverPort');
    if (!portInput) return;
    
    const port = parseInt(portInput.value, 10);
    
    // Validate port range
    if (port < 1024 || port > 65535) {
      UI.toast.error('Port must be between 1024 and 65535');
      return;
    }
    
    try {
      // Save to backend config file
      const response = await fetch(`${API.baseUrl}/server-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverPort: port })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Also save to localStorage for display
        Utils.storage.set('serverPort', port);
        
        // Update the displayed URL
        const currentUrlEl = document.getElementById('currentServerUrl');
        if (currentUrlEl) {
          currentUrlEl.textContent = `http://localhost:${port}`;
        }
        
        UI.toast.success(data.message || `Server port saved: ${port}. Restart the server to apply changes.`);
      } else {
        UI.toast.error(data.error || 'Failed to save server settings');
      }
    } catch (error) {
      console.error('Error saving server settings:', error);
      UI.toast.error('Failed to save server settings');
    }
  },
  
  // Initialize server settings from backend/localStorage
  async initServerSettings() {
    const portInput = document.getElementById('serverPort');
    const currentUrlEl = document.getElementById('currentServerUrl');
    
    if (!portInput) return;
    
    // Get actual port from current URL
    const actualPort = API.getCurrentPort();
    
    try {
      // Try to get configured port from backend
      const response = await fetch(`${API.baseUrl}/server-settings`);
      if (response.ok) {
        const data = await response.json();
        const configuredPort = data.serverPort || 8080;
        
        // Show the configured port in the input
        portInput.value = configuredPort;
        
        // Show actual URL with detected port
        if (currentUrlEl) {
          currentUrlEl.textContent = API.getCurrentServerUrl();
        }
        
        // If using a fallback port, show a warning
        if (actualPort !== configuredPort) {
          const warningEl = document.createElement('div');
          warningEl.className = 'port-warning';
          warningEl.style.cssText = 'color: var(--warning); font-size: 0.85em; margin-top: 5px;';
          warningEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Using fallback port ${actualPort} (configured port ${configuredPort} was busy)`;
          
          // Insert after current URL display
          if (currentUrlEl && currentUrlEl.parentElement) {
            currentUrlEl.parentElement.appendChild(warningEl);
          }
        }
        
        // Also save to localStorage
        Utils.storage.set('serverPort', configuredPort);
      } else {
        // Fallback to localStorage
        const savedPort = Utils.storage.get('serverPort', 8080);
        portInput.value = savedPort;
        if (currentUrlEl) {
          currentUrlEl.textContent = API.getCurrentServerUrl();
        }
      }
    } catch (error) {
      // Fallback to localStorage if backend not available
      const savedPort = Utils.storage.get('serverPort', 8080);
      portInput.value = savedPort;
      if (currentUrlEl) {
        currentUrlEl.textContent = API.getCurrentServerUrl();
      }
    }
    
    // Add change listener to update URL display
    portInput.addEventListener('change', () => {
      const port = parseInt(portInput.value, 10);
      if (port >= 1024 && port <= 65535 && currentUrlEl) {
        currentUrlEl.textContent = `http://localhost:${port}`;
      }
    });
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
  },
  
  // Show keyboard shortcuts modal
  showKeyboardShortcuts() {
    const modal = document.getElementById('keyboardShortcutsModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  },
  
  // Hide keyboard shortcuts modal
  hideKeyboardShortcuts() {
    const modal = document.getElementById('keyboardShortcutsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },
  
  // Toggle download history panel
  toggleDownloadHistory() {
    const panel = document.getElementById('downloadHistoryPanel');
    if (panel) {
      const isVisible = panel.style.display === 'block';
      panel.style.display = isVisible ? 'none' : 'block';
    }
  },
  
  // Add to download history
  addToHistory(filename) {
    let history = Storage.loadDownloadHistory();

    // Add new entry
    history.unshift({
      filename,
      timestamp: Date.now()
    });

    // Keep only last 20
    history = history.slice(0, 20);

    Storage.saveDownloadHistory(history);
    this.renderDownloadHistory();
  },

  // Render download history
  renderDownloadHistory() {
    const list = document.getElementById('downloadHistoryList');
    if (!list) return;

    const history = Storage.loadDownloadHistory();
    
    if (history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No recent downloads</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = '';
    
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'download-history-item';
      
      const timeAgo = Utils.timeAgo(item.timestamp);
      
      div.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="history-filename">${Utils.escapeHtml(item.filename)}</span>
        <span class="history-time">${timeAgo}</span>
      `;
      
      list.appendChild(div);
    });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export App
window.App = App;
