// stage.js - Motor da Tela 2 (Saída de Telão / Palco) para o Programa Silvio Show

const CHANNEL_NAME = 'silvio_show_stage_channel';

class StageScreenController {
  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.mediaUrlCache = new Map(); // padId -> ObjectURL em RAM

    this.standbyLayer = document.getElementById('standby-layer');
    this.defaultStandby = document.getElementById('default-standby');
    this.logoOnlyStandby = document.getElementById('logo-only-standby');
    this.customStandbyImg = document.getElementById('custom-standby-img');
    this.customStandbyVideo = document.getElementById('custom-standby-video');
    this.standbyCanvas = document.getElementById('standby-canvas');

    this.activeLayer = document.getElementById('active-media-layer');
    this.videoPlayer = document.getElementById('stage-video-player');
    this.imagePlayer = document.getElementById('stage-image-player');
    this.synthCanvas = document.getElementById('stage-synth-canvas');

    // Pré-carrega em RAM as imagens oficiais da pasta "Silvio Show imagens"
    this.officialBannerImg = new Image();
    this.officialBannerImg.src = 'Silvio%20Show%20imagens/imagem%20programa%20silvio%20show.jpeg';

    this.officialLogoDarkImg = new Image();
    this.officialLogoDarkImg.src = 'Silvio%20Show%20imagens/logo%20silvio%20show%20fundo%20preto.jpeg';

    this.currentPad = null;
    this.synthAnimId = null;
    this.synthStartTime = 0;
    this.synthDuration = 5.0;
    this.fadeInterval = null;
    this.telemetryTimer = null;
    this.showEffectsOverlay = true;

    this.init();
  }

  async init() {
    this.initStandbyAnimation();
    this.setupFullscreenHandlers();
    await this.preloadAllFromDB();
    await this.loadStandbyConfig();

    this.channel.onmessage = (event) => this.handleMessage(event.data);

    this.sendHeartbeat();
    setInterval(() => this.sendHeartbeat(), 1000);

    window.addEventListener('beforeunload', () => {
      this.channel.postMessage({ type: 'STAGE_DISCONNECTED' });
    });

    this.videoPlayer.addEventListener('ended', () => {
      if (this.currentPad && !this.currentPad.loop) {
        const finishedPadId = this.currentPad.id;
        this.returnToStandby();
        this.channel.postMessage({
          type: 'STAGE_MEDIA_ENDED',
          padId: finishedPadId
        });
      }
    });
  }

  sendHeartbeat() {
    this.channel.postMessage({
      type: 'STAGE_HEARTBEAT',
      isFullscreen: Boolean(document.fullscreenElement),
      activePadId: this.currentPad ? this.currentPad.id : null
    });
  }

  setupFullscreenHandlers() {
    let hintTimeout;
    window.addEventListener('mousemove', () => {
      if (!document.fullscreenElement) {
        document.body.classList.add('show-hint');
        clearTimeout(hintTimeout);
        hintTimeout = setTimeout(() => {
          document.body.classList.remove('show-hint');
        }, 2200);
      }
    });

    const toggleFs = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen requer interação direta:', e);
      }
    };

    window.addEventListener('dblclick', toggleFs);
    document.getElementById('fullscreen-hint').addEventListener('click', toggleFs);
  }

  async preloadAllFromDB() {
    try {
      const blobs = await window.stageDB.getAllMediaBlobs();
      for (const item of blobs) {
        if (this.mediaUrlCache.has(item.id)) {
          URL.revokeObjectURL(this.mediaUrlCache.get(item.id).url);
        }
        const url = URL.createObjectURL(item.blob);
        this.mediaUrlCache.set(item.id, {
          url,
          mimeType: item.mimeType || item.blob.type
        });
      }
    } catch (e) {
      console.error('Erro ao pré-carregar mídias na Tela 2:', e);
    }
  }

  async loadStandbyConfig() {
    const config = await window.stageDB.getSetting('standby_config', {
      mode: 'default', // 'default' (Imagem Programa Silvio Show) | 'logo_dark' (Logo Fundo Preto) | 'custom'
      effects: true
    });

    this.showEffectsOverlay = config.effects !== false;
    this.standbyCanvas.style.display = this.showEffectsOverlay ? 'block' : 'none';

    const standbyMedia = this.mediaUrlCache.get('__standby_media__');

    // Reset displays
    this.defaultStandby.style.display = 'none';
    this.logoOnlyStandby.style.display = 'none';
    this.customStandbyImg.style.display = 'none';
    this.customStandbyVideo.pause();
    this.customStandbyVideo.style.display = 'none';

    if (config.mode === 'custom' && standbyMedia) {
      if (standbyMedia.mimeType.startsWith('video/')) {
        this.customStandbyVideo.src = standbyMedia.url;
        this.customStandbyVideo.style.display = 'block';
        this.customStandbyVideo.play().catch(() => {});
      } else {
        this.customStandbyImg.src = standbyMedia.url;
        this.customStandbyImg.style.display = 'block';
      }
    } else if (config.mode === 'logo_dark') {
      this.logoOnlyStandby.style.display = 'flex';
    } else {
      // Padrão principal: "imagem programa silvio show.jpeg" em tela cheia
      this.defaultStandby.style.display = 'flex';
    }
  }

  async handleMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'PRELOAD_MEDIA':
      case 'UPDATE_STANDBY': {
        await this.preloadAllFromDB();
        await this.loadStandbyConfig();
        break;
      }

      case 'PLAY_STAGE_MEDIA': {
        const pad = msg.pad;
        if (!pad) return;
        if (this.currentPad && this.currentPad.id === pad.id && pad.mode === 'exclusive') {
          this.returnToStandby();
          this.channel.postMessage({ type: 'STAGE_MEDIA_ENDED', padId: pad.id });
          return;
        }
        await this.playStageMedia(pad);
        break;
      }

      case 'SET_STAGE_VOLUME': {
        if (this.currentPad && this.currentPad.id === msg.padId) {
          this.currentPad.volume = msg.volume;
          this.videoPlayer.volume = Math.min(1, Math.max(0, msg.volume));
        }
        break;
      }

      case 'SET_STAGE_LOOP': {
        if (this.currentPad && this.currentPad.id === msg.padId) {
          this.currentPad.loop = Boolean(msg.loop);
          this.videoPlayer.loop = Boolean(msg.loop);
        }
        break;
      }

      case 'FADE_OUT_STAGE': {
        this.fadeOutStage(msg.duration || 2.0);
        break;
      }

      case 'STOP_STAGE': {
        const prevId = this.currentPad ? this.currentPad.id : null;
        this.returnToStandby();
        if (prevId) {
          this.channel.postMessage({ type: 'STAGE_MEDIA_ENDED', padId: prevId });
        }
        break;
      }

      case 'REQUEST_FULLSCREEN': {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        break;
      }
    }
  }

  async playStageMedia(pad) {
    this.clearCurrentMedia();
    this.currentPad = pad;

    if (!this.mediaUrlCache.has(pad.id)) {
      await this.preloadAllFromDB();
    }
    const cached = this.mediaUrlCache.get(pad.id);

    this.activeLayer.style.transition = 'opacity 0.18s ease';
    this.activeLayer.classList.add('active');
    this.standbyLayer.classList.add('hidden');

    if (cached) {
      if (cached.mimeType.startsWith('image/')) {
        this.imagePlayer.src = cached.url;
        this.imagePlayer.style.display = 'block';
        this.synthStartTime = performance.now();
        this.synthDuration = pad.duration || 6.0;
        this.startTelemetryLoop('image');
      } else {
        this.videoPlayer.src = cached.url;
        this.videoPlayer.loop = Boolean(pad.loop);
        this.videoPlayer.volume = Math.min(1, Math.max(0, pad.volume ?? 1.0));
        this.videoPlayer.currentTime = 0;
        this.videoPlayer.style.display = 'block';
        try {
          await this.videoPlayer.play();
        } catch (err) {
          console.warn('Tentando reproduzir vídeo:', err);
        }
        this.startTelemetryLoop('video');
      }
    } else if (pad.synthVideoPreset) {
      this.synthCanvas.style.display = 'block';
      this.synthStartTime = performance.now();
      this.synthDuration = pad.duration || 4.2;
      this.startSynthVignette(pad.synthVideoPreset, pad);
      this.startTelemetryLoop('synth');
    }
  }

  startTelemetryLoop(mode) {
    clearInterval(this.telemetryTimer);
    this.telemetryTimer = setInterval(() => {
      if (!this.currentPad) return;

      let elapsed = 0;
      let duration = this.currentPad.duration || 5.0;

      if (mode === 'video') {
        elapsed = this.videoPlayer.currentTime || 0;
        duration = this.videoPlayer.duration || duration;
      } else {
        elapsed = (performance.now() - this.synthStartTime) / 1000;
        if (this.currentPad.loop) {
          elapsed = elapsed % duration;
        } else if (elapsed >= duration) {
          const doneId = this.currentPad.id;
          this.returnToStandby();
          this.channel.postMessage({ type: 'STAGE_MEDIA_ENDED', padId: doneId });
          return;
        }
      }

      const remaining = Math.max(0, duration - elapsed);
      const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;

      this.channel.postMessage({
        type: 'STAGE_TELEMETRY',
        padId: this.currentPad.id,
        elapsed,
        remaining,
        duration,
        progress,
        loop: Boolean(this.currentPad.loop)
      });
    }, 65);
  }

  fadeOutStage(durationSec = 2.0) {
    if (!this.currentPad) return;
    clearInterval(this.fadeInterval);

    const startVol = this.videoPlayer.volume;
    const steps = 30;
    const stepMs = (durationSec * 1000) / steps;
    let currentStep = 0;

    this.activeLayer.style.transition = `opacity ${durationSec}s linear`;
    this.activeLayer.classList.remove('active');
    this.standbyLayer.classList.remove('hidden');

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const ratio = Math.max(0, 1 - currentStep / steps);
      this.videoPlayer.volume = startVol * ratio;
      if (currentStep >= steps) {
        clearInterval(this.fadeInterval);
        const endedId = this.currentPad ? this.currentPad.id : null;
        this.returnToStandby();
        if (endedId) {
          this.channel.postMessage({ type: 'STAGE_MEDIA_ENDED', padId: endedId });
        }
      }
    }, stepMs);
  }

  clearCurrentMedia() {
    clearInterval(this.fadeInterval);
    clearInterval(this.telemetryTimer);
    if (this.synthAnimId) {
      cancelAnimationFrame(this.synthAnimId);
      this.synthAnimId = null;
    }
    this.videoPlayer.pause();
    this.videoPlayer.removeAttribute('src');
    this.videoPlayer.style.display = 'none';
    this.imagePlayer.style.display = 'none';
    this.synthCanvas.style.display = 'none';
    this.currentPad = null;
  }

  returnToStandby() {
    this.clearCurrentMedia();
    this.activeLayer.style.transition = 'opacity 0.25s ease';
    this.activeLayer.classList.remove('active');
    this.standbyLayer.classList.remove('hidden');
  }

  // Renderiza vinhetas dinâmicas usando a arte e a logo oficial do Silvio Show
  startSynthVignette(preset, pad) {
    const canvas = this.synthCanvas;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const render = (now) => {
      if (!this.currentPad) return;
      const t = (now - this.synthStartTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();

      if (preset === 'vinheta_abertura_ouro') {
        // Vinheta de Abertura com a Arte Oficial Widescreen + Feixes Laser Azul/Ciano
        ctx.fillStyle = '#00081c';
        ctx.fillRect(0, 0, w, h);

        if (this.officialBannerImg.complete && this.officialBannerImg.naturalWidth > 0) {
          const zoom = 1.0 + Math.sin(t * 2.2) * 0.04;
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(zoom, zoom);
          ctx.drawImage(this.officialBannerImg, -w / 2, -h / 2, w, h);
          ctx.restore();
        }

        // Raios luminosos azuis/cianos girando no centro
        ctx.save();
        ctx.translate(w / 2, h * 0.62);
        ctx.globalCompositeOperation = 'screen';
        const numRays = 16;
        for (let i = 0; i < numRays; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / numRays + t * 0.85);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-w * 0.04, -Math.max(w, h));
          ctx.lineTo(w * 0.04, -Math.max(w, h));
          ctx.closePath();
          ctx.fillStyle = 'rgba(0, 212, 255, 0.14)';
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();

        // Flash de laser horizontal acompanhando a linha da imagem
        const flareWidth = w * (0.5 + 0.4 * Math.sin(t * 6));
        const flareGrad = ctx.createRadialGradient(w / 2, h * 0.36, 5, w / 2, h * 0.36, flareWidth * 0.5);
        flareGrad.addColorStop(0, 'rgba(125, 211, 252, 0.55)');
        flareGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, h * 0.32, w, h * 0.08);
      } else if (preset === 'vinheta_logo_destaque') {
        // Vinheta Destaque com a Logo Oficial Fundo Preto + Anéis Prateados/Azuis
        const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.7);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.55, '#090d16');
        grad.addColorStop(1, '#02040a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.translate(w / 2, h / 2);

        // Anéis de energia prateados/cianos
        for (let r = 1; r <= 4; r++) {
          const radius = ((t * 240 + r * 150) % (Math.max(w, h) * 0.6));
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 0.7 - radius / (Math.max(w, h) * 0.6))})`;
          ctx.lineWidth = 6;
          ctx.stroke();
        }

        if (this.officialLogoDarkImg.complete && this.officialLogoDarkImg.naturalWidth > 0) {
          const boxSize = Math.min(w, h) * 0.68;
          const scale = 0.92 + Math.sin(t * 3.5) * 0.04;
          ctx.scale(scale, scale);
          ctx.shadowColor = 'rgba(0, 212, 255, 0.55)';
          ctx.shadowBlur = 45;
          ctx.drawImage(this.officialLogoDarkImg, -boxSize / 2, -boxSize / 2, boxSize, boxSize);
        }
      } else {
        // Chamada de Quadro / Patrocinador com a Logo Oficial no Topo
        const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.75);
        grad.addColorStop(0, '#002888');
        grad.addColorStop(0.6, '#001242');
        grad.addColorStop(1, '#000514');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.translate(w / 2, h / 2);

        if (this.officialLogoDarkImg.complete && this.officialLogoDarkImg.naturalWidth > 0) {
          const logoSize = Math.min(w, h) * 0.34;
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, -h * 0.14, logoSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(this.officialLogoDarkImg, -logoSize / 2, -h * 0.14 - logoSize / 2, logoSize, logoSize);
          ctx.restore();
        }

        ctx.fillStyle = '#38bdf8';
        ctx.font = `900 ${Math.round(w * 0.055)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 212, 255, 0.85)';
        ctx.shadowBlur = 35;
        ctx.fillText(pad.title.toUpperCase(), 0, h * 0.16);

        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(w * 0.024)}px "Segoe UI", sans-serif`;
        ctx.fillText('PROGRAMA SILVIO SHOW • AO VIVO', 0, h * 0.26);
      }

      ctx.restore();
      this.synthAnimId = requestAnimationFrame(render);
    };

    this.synthAnimId = requestAnimationFrame(render);
  }

  // Brilho e partículas azuis/prateadas sutis sobre a Tela de Espera Oficial
  initStandbyAnimation() {
    const canvas = this.standbyCanvas;
    const ctx = canvas.getContext('2d');
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3.2 + 1.0,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.45 - 0.15,
        alpha: Math.random() * 0.55 + 0.15
      });
    }

    const animate = (now) => {
      const t = now * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (this.showEffectsOverlay) {
        // Feixes suaves azul-celeste/prata no topo do telão
        for (let s = 0; s < 3; s++) {
          const angle = Math.sin(t * 0.45 + s * 2.1) * 0.3;
          const originX = (w * (s + 1)) / 4;
          ctx.save();
          ctx.translate(originX, -30);
          ctx.rotate(angle);
          const grad = ctx.createLinearGradient(0, 0, 0, h * 0.95);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
          grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(-25, 0);
          ctx.lineTo(-w * 0.18, h);
          ctx.lineTo(w * 0.18, h);
          ctx.lineTo(25, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Partículas flutuantes prateadas/azuis
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) p.y = h + 10;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha})`;
          ctx.fill();
        }
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

window.stageController = new StageScreenController();
