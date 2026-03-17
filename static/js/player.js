/**
 * PLAYER.JS - Built-in Audio Player with Waveform
 */

const Player = {
  audio: null,
  audioContext: null,
  analyser: null,
  animationFrame: null,
  currentFile: null,
  isPlaying: false,
  isClosing: false,
  
  init() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('loadedmetadata', () => this.onLoaded());
    this.audio.addEventListener('error', (e) => this.onError(e));
    this.audio.addEventListener('play', () => this.onPlay());
    this.audio.addEventListener('pause', () => this.onPause());
    
    this.setupControls();
  },
  
  setupControls() {
    const playBtn = document.getElementById('playerPlayBtn');
    const seekBar = document.getElementById('playerSeek');
    const volumeBar = document.getElementById('playerVolume');
    const closeBtn = document.getElementById('playerCloseBtn');
    
    if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    
    if (seekBar) {
      seekBar.addEventListener('input', (e) => {
        if (this.audio && this.audio.duration) {
          this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
        }
      });
    }
    
    if (volumeBar) {
      volumeBar.addEventListener('input', (e) => {
        if (this.audio) this.audio.volume = e.target.value / 100;
      });
      // Set initial volume
      const saved = localStorage.getItem('playerVolume');
      if (saved) {
        volumeBar.value = saved;
        if (this.audio) this.audio.volume = saved / 100;
      }
      volumeBar.addEventListener('change', (e) => {
        localStorage.setItem('playerVolume', e.target.value);
      });
    }
  },
  
  // Play a file
  play(filename) {
    if (this.currentFile === filename && this.isPlaying) {
      this.togglePlay();
      return;
    }
    
    this.currentFile = filename;
    this.audio.src = API.getStreamUrl(filename);
    this.audio.play().catch(e => console.error('Player error:', e));
    this.show();
    this.updateTrackInfo(filename);
  },
  
  togglePlay() {
    if (!this.audio.src) return;
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(e => console.error('Player error:', e));
    }
  },
  
  close() {
    this.isClosing = true;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.currentFile = null;
    this.isPlaying = false;
    this.hide();
    this.stopVisualization();
    setTimeout(() => { this.isClosing = false; }, 100);
  },
  
  show() {
    const bar = document.getElementById('playerBar');
    if (bar) bar.classList.add('visible');
  },
  
  hide() {
    const bar = document.getElementById('playerBar');
    if (bar) bar.classList.remove('visible');
  },
  
  onPlay() {
    this.isPlaying = true;
    const btn = document.getElementById('playerPlayBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    this.startVisualization();
  },
  
  onPause() {
    this.isPlaying = false;
    const btn = document.getElementById('playerPlayBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
    this.stopVisualization();
  },
  
  onEnded() {
    this.isPlaying = false;
    const btn = document.getElementById('playerPlayBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
    const seek = document.getElementById('playerSeek');
    if (seek) seek.value = 0;
    this.stopVisualization();
  },
  
  onLoaded() {
    const dur = document.getElementById('playerDuration');
    if (dur && this.audio.duration) {
      dur.textContent = Utils.formatDuration(this.audio.duration);
    }
  },
  
  onError(e) {
    if (this.isClosing) return;
    console.error('Audio player error:', e);
    UI.toast.error('Failed to play file');
    this.close();
  },
  
  updateProgress() {
    if (!this.audio.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    const seek = document.getElementById('playerSeek');
    if (seek) seek.value = pct;
    
    const timeEl = document.getElementById('playerTime');
    if (timeEl) timeEl.textContent = Utils.formatDuration(this.audio.currentTime);
  },
  
  updateTrackInfo(filename) {
    const titleEl = document.getElementById('playerTitle');
    if (titleEl) {
      // Clean filename for display
      let name = filename.replace(/\.[^.]+$/, ''); // remove extension
      titleEl.textContent = name;
      titleEl.title = name;
    }
  },
  
  // --- Waveform Visualization ---
  initAudioContext() {
    if (this.audioContext) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  },
  
  startVisualization() {
    if (!this.audioContext) this.initAudioContext();
    if (!this.analyser) return;
    
    const canvas = document.getElementById('playerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      this.animationFrame = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);
      
      const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);
      
      const barWidth = Math.max(2, (w / bufferLength) * 1.5);
      const gap = 1;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        const barH = v * h * 0.9;
        
        // Gradient color from primary to accent
        const hue = 220 + (v * 60);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.6 + v * 0.4})`;
        
        const radius = Math.min(barWidth / 2, 3);
        const bx = x;
        const by = h - barH;
        
        ctx.beginPath();
        ctx.moveTo(bx + radius, by);
        ctx.lineTo(bx + barWidth - radius, by);
        ctx.quadraticCurveTo(bx + barWidth, by, bx + barWidth, by + radius);
        ctx.lineTo(bx + barWidth, h);
        ctx.lineTo(bx, h);
        ctx.lineTo(bx, by + radius);
        ctx.quadraticCurveTo(bx, by, bx + radius, by);
        ctx.fill();
        
        x += barWidth + gap;
      }
    };
    
    draw();
  },
  
  stopVisualization() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
};

window.Player = Player;
