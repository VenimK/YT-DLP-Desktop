/**
 * LYRICS.JS - Lyrics Viewer
 */

const Lyrics = {
  currentFilename: null,
  
  // View lyrics file
  async view(filename) {
    this.currentFilename = filename;
    const section = document.getElementById('lyricsSection');
    const display = document.getElementById('lyricsDisplay');
    
    if (!section || !display) return;
    
    section.classList.add('visible');
    display.innerHTML = '<div class="empty-state"><i class="fas fa-spinner spin"></i><p>Loading lyrics...</p></div>';
    
    UI.scroll.to('lyricsSection');
    
    try {
      const content = await API.getLyricsContent(filename);
      const parsed = this.parse(content, filename);
      
      if (parsed) {
        display.innerHTML = parsed;
      } else {
        display.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not parse lyrics file</p></div>';
      }
    } catch (error) {
      console.error('Lyrics error:', error);
      display.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error: ${Utils.escapeHtml(error.message)}</p></div>`;
    }
  },
  
  // Close lyrics viewer
  close() {
    const section = document.getElementById('lyricsSection');
    if (section) {
      section.classList.remove('visible');
    }
    this.currentFilename = null;
  },
  
  // Parse lyrics based on file extension
  parse(content, filename) {
    if (!content) return null;
    
    if (filename.endsWith('.vtt')) {
      return this.parseVTT(content);
    } else if (filename.endsWith('.srt')) {
      return this.parseSRT(content);
    } else if (filename.endsWith('.lrc')) {
      return this.parseLRC(content);
    }
    
    // Plain text
    return this.formatPlainText(content);
  },
  
  // Parse VTT (Web Video Text Tracks)
  parseVTT(text) {
    const lines = text.split('\n');
    const lyrics = [];
    let isHeader = true;
    
    for (const line of lines) {
      if (isHeader) {
        if (line.includes('-->')) isHeader = false;
        continue;
      }
      
      // Skip timestamp lines and empty lines
      if (line.includes('-->') || line.trim() === '') continue;
      
      // Skip cue settings (like position:10%)
      if (line.match(/^\d+:\d{2}:\d{2}\.\d{3}/)) continue;
      
      // Clean up the line
      const cleanLine = line.replace(/<[^>]*>/g, '').trim();
      if (cleanLine) {
        lyrics.push(cleanLine);
      }
    }
    
    return lyrics.length > 0 
      ? this.formatLyrics(lyrics)
      : '<div class="empty-state"><i class="fas fa-inbox"></i><p>No lyrics found in file</p></div>';
  },
  
  // Parse SRT (SubRip Subtitle)
  parseSRT(text) {
    const lines = text.split('\n');
    const lyrics = [];
    
    for (const line of lines) {
      // Skip subtitle numbers
      if (line.match(/^\d+$/)) continue;
      // Skip timestamp lines
      if (line.includes('-->')) continue;
      // Skip empty lines
      if (line.trim() === '') continue;
      
      const cleanLine = line.replace(/<[^>]*>/g, '').trim();
      if (cleanLine) {
        lyrics.push(cleanLine);
      }
    }
    
    return lyrics.length > 0 
      ? this.formatLyrics(lyrics)
      : '<div class="empty-state"><i class="fas fa-inbox"></i><p>No lyrics found in file</p></div>';
  },
  
  // Parse LRC (LyRiCs format)
  parseLRC(text) {
    const lines = text.split('\n');
    const lyrics = [];
    
    for (const line of lines) {
      // Match [mm:ss.xx] or [mm:ss:xx] format
      const match = line.match(/^(?:\[\d{2}:\d{2}\.\d{2,3}\])+\s*(.+)$/);
      if (match) {
        lyrics.push(match[1].trim());
      } else if (line.trim() && !line.startsWith('[')) {
        // Lines without timestamps (metadata like [ar:Artist])
        if (!line.match(/^\[\w+:/)) {
          lyrics.push(line.trim());
        }
      }
    }
    
    return lyrics.length > 0 
      ? this.formatLyrics(lyrics)
      : '<div class="empty-state"><i class="fas fa-inbox"></i><p>No lyrics found in file</p></div>';
  },
  
  // Format lyrics for display
  formatLyrics(lines) {
    // Remove duplicates while preserving order
    const unique = [];
    const seen = new Set();
    
    for (const line of lines) {
      const normalized = line.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(line);
      }
    }
    
    return unique.map(line => `<p>${Utils.escapeHtml(line)}</p>`).join('');
  },
  
  // Format plain text
  formatPlainText(text) {
    return `<div style="white-space: pre-wrap;">${Utils.escapeHtml(text)}</div>`;
  }
};

// Export Lyrics
window.Lyrics = Lyrics;
