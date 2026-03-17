/**
 * PRESETS.JS - Download Presets / Profiles
 */

const Presets = {
  STORAGE_KEY: 'downloadPresets',
  
  // Built-in presets
  builtIn: [
    {
      name: 'Best Audio MP3',
      icon: 'fa-music',
      settings: {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: '0',
        format: 'bestaudio/best',
        embedThumbnail: true,
        embedMetadata: true
      }
    },
    {
      name: 'Best Video',
      icon: 'fa-video',
      settings: {
        extractAudio: false,
        format: 'bestvideo+bestaudio/best',
        embedMetadata: true
      }
    },
    {
      name: 'Audio + Lyrics',
      icon: 'fa-closed-captioning',
      settings: {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: '0',
        format: 'bestaudio/best',
        embedThumbnail: true,
        embedMetadata: true,
        writeAutoSubs: true,
        subLangs: 'en'
      }
    },
    {
      name: 'No Sponsors MP3',
      icon: 'fa-cut',
      settings: {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: '0',
        format: 'bestaudio/best',
        embedThumbnail: true,
        embedMetadata: true,
        sponsorblock: true
      }
    }
  ],
  
  init() {
    this.render();
  },
  
  // Get user-saved presets
  getUserPresets() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch { return []; }
  },
  
  // Save user presets
  saveUserPresets(presets) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(presets));
  },
  
  // Get all presets (built-in + user)
  getAll() {
    return [...this.builtIn, ...this.getUserPresets()];
  },
  
  // Render preset buttons
  render() {
    const container = document.getElementById('presetsContainer');
    if (!container) return;
    
    const all = this.getAll();
    container.innerHTML = all.map((preset, i) => {
      const isBuiltIn = i < this.builtIn.length;
      return `
        <button type="button" class="preset-btn" data-index="${i}" title="${Utils.escapeHtml(preset.name)}">
          <i class="fas ${preset.icon || 'fa-sliders-h'}"></i>
          <span>${Utils.escapeHtml(preset.name)}</span>
          ${!isBuiltIn ? '<i class="fas fa-times preset-delete" data-index="' + i + '"></i>' : ''}
        </button>
      `;
    }).join('') + `
      <button type="button" class="preset-btn preset-save-btn" id="savePresetBtn" title="Save current settings as preset">
        <i class="fas fa-plus"></i>
        <span>Save Preset</span>
      </button>
    `;
    
    // Click handlers
    container.querySelectorAll('.preset-btn[data-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-delete')) return;
        const idx = parseInt(btn.dataset.index);
        this.apply(this.getAll()[idx]);
      });
    });
    
    container.querySelectorAll('.preset-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        this.deletePreset(idx);
      });
    });
    
    const saveBtn = document.getElementById('savePresetBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveCurrentAsPreset());
  },
  
  // Apply a preset to the form
  apply(preset) {
    if (!preset || !preset.settings) return;
    const s = preset.settings;
    
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    
    setCheck('extractAudio', s.extractAudio);
    if (s.audioFormat) setVal('audioFormat', s.audioFormat);
    if (s.audioQuality) setVal('audioQuality', s.audioQuality);
    if (s.format) setVal('format', s.format);
    setCheck('embedThumbnail', s.embedThumbnail);
    setCheck('embedMetadata', s.embedMetadata);
    setCheck('writeThumbnail', s.writeThumbnail);
    setCheck('writeSubs', s.writeSubs);
    setCheck('writeAutoSubs', s.writeAutoSubs);
    if (s.subLangs) setVal('subLangs', s.subLangs);
    setCheck('sponsorblock', s.sponsorblock);
    setCheck('splitChapters', s.splitChapters);
    setCheck('normalizeAudio', s.normalizeAudio);
    
    // Update UI state (disable video format if audio only)
    const formatSelect = document.getElementById('format');
    if (formatSelect) formatSelect.disabled = !!s.extractAudio;
    
    UI.toast.success(`Preset "${preset.name}" applied`);
  },
  
  // Read current form settings
  readCurrentSettings() {
    const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
    const getCheck = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
    
    return {
      extractAudio: getCheck('extractAudio'),
      audioFormat: getVal('audioFormat'),
      audioQuality: getVal('audioQuality'),
      format: getVal('format'),
      embedThumbnail: getCheck('embedThumbnail'),
      embedMetadata: getCheck('embedMetadata'),
      writeThumbnail: getCheck('writeThumbnail'),
      writeSubs: getCheck('writeSubs'),
      writeAutoSubs: getCheck('writeAutoSubs'),
      subLangs: getVal('subLangs'),
      sponsorblock: getCheck('sponsorblock'),
      splitChapters: getCheck('splitChapters'),
      normalizeAudio: getCheck('normalizeAudio')
    };
  },
  
  // Save current settings as a new preset
  saveCurrentAsPreset() {
    const name = prompt('Preset name:');
    if (!name || !name.trim()) return;
    
    const userPresets = this.getUserPresets();
    userPresets.push({
      name: name.trim(),
      icon: 'fa-bookmark',
      settings: this.readCurrentSettings()
    });
    this.saveUserPresets(userPresets);
    this.render();
    UI.toast.success(`Preset "${name.trim()}" saved`);
  },
  
  // Delete a user preset
  deletePreset(globalIndex) {
    const userIndex = globalIndex - this.builtIn.length;
    if (userIndex < 0) return;
    
    const userPresets = this.getUserPresets();
    const name = userPresets[userIndex]?.name;
    if (!confirm(`Delete preset "${name}"?`)) return;
    
    userPresets.splice(userIndex, 1);
    this.saveUserPresets(userPresets);
    this.render();
    UI.toast.success(`Preset "${name}" deleted`);
  }
};

window.Presets = Presets;
