// app.js - Controlador Principal da Tela 1 (Painel do Operador) - Silvio Show

const STAGE_CHANNEL_NAME = 'silvio_show_stage_channel';

const BANK_META = {
  abertura: {
    title: '🎺 1. Abertura e Entrada',
    desc: 'Vinhetas de impacto, "Silvio Santos vem aí" e fanfarras (Modo Exclusivo por padrão)',
    defaultColor: '#f59e0b',
    defaultMode: 'exclusive',
    defaultLoop: false
  },
  trilhas: {
    title: '🎵 2. Trilhas de Fundo / Cama',
    desc: 'Músicas instrumentais contínuas com suporte a Loop e Ducking (Talkover) quando o apresentador fala',
    defaultColor: '#3b82f6',
    defaultMode: 'exclusive',
    defaultLoop: true
  },
  efeitos: {
    title: '😂 3. Efeitos e Vinhetas de Humor',
    desc: 'Risadas, "tá certo ou não tá?", buzinas, aplausos e piadas (Modo Sobreposição: toca por cima da trilha)',
    defaultColor: '#10b981',
    defaultMode: 'overlay',
    defaultLoop: false
  },
  videos: {
    title: '🎬 4. Vídeos e Telão (Saída Tela 2)',
    desc: 'Dispara direto em tela cheia no projetor/LED (Tela 2) e baixa/corta a trilha de fundo automaticamente',
    defaultColor: '#8b5cf6',
    defaultMode: 'exclusive',
    defaultLoop: false
  }
};

const DEFAULT_DEMO_PADS = [
  // 1. Abertura e Entrada
  {
    id: 'demo_abertura_1',
    title: 'Silvio Show Vem Aí! (Abertura)',
    bank: 'abertura',
    mode: 'exclusive',
    loop: false,
    volume: 1.0,
    color: '#f59e0b',
    hotkey: '1',
    synthPreset: 'fanfarra_silvio',
    order: 1
  },
  {
    id: 'demo_abertura_2',
    title: 'Fanfarra Triunfal de Palco',
    bank: 'abertura',
    mode: 'exclusive',
    loop: false,
    volume: 1.0,
    color: '#f59e0b',
    hotkey: '2',
    synthPreset: 'entrada_impacto',
    order: 2
  },
  // 2. Trilhas de Fundo / Cama
  {
    id: 'demo_trilha_1',
    title: 'Cama Auditório Alegre (Loop)',
    bank: 'trilhas',
    mode: 'exclusive',
    loop: true,
    duckable: true,
    volume: 0.85,
    color: '#3b82f6',
    hotkey: '3',
    synthPreset: 'cama_auditorio',
    order: 3
  },
  {
    id: 'demo_trilha_2',
    title: 'Cama Suspense / Pergunta Final',
    bank: 'trilhas',
    mode: 'exclusive',
    loop: true,
    duckable: true,
    volume: 0.85,
    color: '#3b82f6',
    hotkey: '4',
    synthPreset: 'cama_suspense',
    order: 4
  },
  // 3. Efeitos e Vinhetas de Humor
  {
    id: 'demo_efeito_1',
    title: 'Risadas do Auditório',
    bank: 'efeitos',
    mode: 'overlay',
    loop: false,
    volume: 1.0,
    color: '#10b981',
    hotkey: '5',
    synthPreset: 'efeito_risadas',
    order: 5
  },
  {
    id: 'demo_efeito_2',
    title: 'Tá Certo ou Não Tá?! (Sino)',
    bank: 'efeitos',
    mode: 'overlay',
    loop: false,
    volume: 1.0,
    color: '#10b981',
    hotkey: '6',
    synthPreset: 'efeito_ta_certo',
    order: 6
  },
  {
    id: 'demo_efeito_3',
    title: 'Buzina de Palhaço / Erro',
    bank: 'efeitos',
    mode: 'overlay',
    loop: false,
    volume: 1.0,
    color: '#f43f5e',
    hotkey: '7',
    synthPreset: 'efeito_buzina',
    order: 7
  },
  {
    id: 'demo_efeito_4',
    title: 'Ba-Dum-Tss! (Piada)',
    bank: 'efeitos',
    mode: 'overlay',
    loop: false,
    volume: 1.05,
    color: '#10b981',
    hotkey: '8',
    synthPreset: 'efeito_badumtss',
    order: 8
  },
  {
    id: 'demo_efeito_5',
    title: 'Aplausos Calorosos',
    bank: 'efeitos',
    mode: 'overlay',
    loop: false,
    volume: 0.95,
    color: '#10b981',
    hotkey: '9',
    synthPreset: 'efeito_aplausos',
    order: 9
  },
  // 4. Vídeos e Telão (Tela 2)
  {
    id: 'demo_video_1',
    title: 'Vinheta Oficial: Programa Silvio Show',
    bank: 'videos',
    mode: 'exclusive',
    loop: false,
    volume: 1.0,
    color: '#3b82f6',
    hotkey: 'Q',
    isStageMedia: true,
    synthPreset: 'fanfarra_silvio',
    synthVideoPreset: 'vinheta_abertura_ouro',
    duration: 4.2,
    order: 10
  },
  {
    id: 'demo_video_2',
    title: 'Telão: Destaque Logo Microfone',
    bank: 'videos',
    mode: 'exclusive',
    loop: false,
    volume: 1.0,
    color: '#8b5cf6',
    hotkey: 'W',
    isStageMedia: true,
    synthPreset: 'entrada_impacto',
    synthVideoPreset: 'vinheta_logo_destaque',
    duration: 3.2,
    order: 11
  },
  {
    id: 'demo_video_3',
    title: 'Telão: Chamada Valendo Prêmios',
    bank: 'videos',
    mode: 'exclusive',
    loop: false,
    volume: 1.0,
    color: '#06b6d4',
    hotkey: 'E',
    isStageMedia: true,
    synthPreset: 'entrada_impacto',
    synthVideoPreset: 'vinheta_patrocinador_quadro',
    duration: 3.2,
    order: 12
  }
];

class OperatorPanelApp {
  constructor() {
    this.channel = new BroadcastChannel(STAGE_CHANNEL_NAME);
    this.stageWindow = null;
    this.stageConnected = false;
    this.stageLastHeartbeat = 0;
    this.activeStageTelemetry = null; // { padId, elapsed, remaining, duration, progress }
    this.autoDuckedByVideo = false;

    this.pads = [];
    this.currentBankFilter = 'all';
    this.queue = []; // Array de padIds na Lista de Espera

    this.init();
  }

  async init() {
    this.bindUIEvents();
    this.setupStageChannel();

    await window.stageDB.init();
    let storedPads = await window.stageDB.getAllPads();
    if (!storedPads || storedPads.length === 0) {
      await window.stageDB.saveAllPads(DEFAULT_DEMO_PADS);
      storedPads = [...DEFAULT_DEMO_PADS];
    }
    this.pads = storedPads;

    await this.preloadAllIntoRAM();
    this.renderBankCounts();
    this.renderPads();
    this.renderQueue();

    // Loop de atualização visual de 30fps (barras de progresso, contadores, VU meter)
    requestAnimationFrame(() => this.uiTick());

    // Monitor de conexão da Tela 2
    setInterval(() => this.checkStageConnection(), 1500);
  }

  async preloadAllIntoRAM() {
    const statusText = document.getElementById('ram-status-text');
    const dot = document.getElementById('ram-dot');
    statusText.textContent = '⚡ Decodificando áudios e vídeos na RAM...';
    dot.className = 'dot warn';

    let loadedCount = 0;

    for (const pad of this.pads) {
      try {
        const mediaRecord = await window.stageDB.getMediaBlob(pad.id);
        if (mediaRecord && mediaRecord.blob) {
          pad.fileName = mediaRecord.fileName;
          pad.mimeType = mediaRecord.mimeType || mediaRecord.blob.type;

          if (pad.mimeType.startsWith('audio/')) {
            const info = await window.audioEngine.decodeAndStore(pad.id, mediaRecord.blob);
            pad.duration = info.duration;
            pad.hasDecodedAudio = true;
          } else if (pad.mimeType.startsWith('video/')) {
            pad.isStageMedia = true;
            // Tenta também decodificar a trilha de áudio do vídeo na Web Audio API para Zero Delay e VU Meter
            try {
              const info = await window.audioEngine.decodeAndStore(pad.id, mediaRecord.blob);
              pad.duration = info.duration;
              pad.hasDecodedAudio = true;
            } catch (videoAudioErr) {
              // Vídeo sem faixa de áudio ou codec apenas no player de vídeo
              pad.hasDecodedAudio = false;
            }
          } else if (pad.mimeType.startsWith('image/')) {
            pad.isStageMedia = true;
            pad.duration = pad.duration || 6.0;
            pad.hasDecodedAudio = false;
          }
        } else if (pad.synthPreset) {
          const info = window.audioEngine.generatePresetInRAM(pad.id, pad.synthPreset);
          pad.duration = info.duration;
          pad.hasDecodedAudio = true;
        }
        loadedCount++;
      } catch (err) {
        console.error('Erro ao pré-carregar pad na RAM:', pad.title, err);
      }
    }

    const ramMB = window.audioEngine.getTotalRAMUsageMB();
    dot.className = 'dot online';
    statusText.textContent = `⚡ RAM PRONTA: 100% (${loadedCount}/${this.pads.length} • ${ramMB} MB • 0ms Delay)`;
    this.channel.postMessage({ type: 'PRELOAD_MEDIA' });
  }

  setupStageChannel() {
    this.channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'STAGE_HEARTBEAT': {
          this.stageConnected = true;
          this.stageLastHeartbeat = Date.now();
          this.updateStageStatusIndicator(true, msg.isFullscreen);
          break;
        }
        case 'STAGE_DISCONNECTED': {
          this.stageConnected = false;
          this.updateStageStatusIndicator(false, false);
          break;
        }
        case 'STAGE_TELEMETRY': {
          this.activeStageTelemetry = msg;
          break;
        }
        case 'STAGE_MEDIA_ENDED': {
          if (this.activeStageTelemetry && this.activeStageTelemetry.padId === msg.padId) {
            this.activeStageTelemetry = null;
          }
          // Se o vídeo havia ativado o Ducking automático na trilha de fundo, restaura suavemente!
          if (this.autoDuckedByVideo) {
            this.autoDuckedByVideo = false;
            this.setDuckingState(false);
          }
          this.updateStageMiniMonitor();
          break;
        }
      }
    };
  }

  checkStageConnection() {
    if (this.stageConnected && Date.now() - this.stageLastHeartbeat > 3200) {
      this.stageConnected = false;
      this.updateStageStatusIndicator(false, false);
    }
  }

  updateStageStatusIndicator(connected, isFullscreen) {
    const dot = document.getElementById('stage-dot');
    const text = document.getElementById('stage-status-text');
    if (connected) {
      dot.className = 'dot online';
      text.textContent = isFullscreen
        ? 'TELA 2 (TELÃO): CONECTADA • TELA CHEIA'
        : 'TELA 2 (TELÃO): CONECTADA (JANELA ABERTA)';
    } else {
      dot.className = 'dot warn';
      text.textContent = 'TELA 2 (TELÃO): FECHADA (CLIQUE EM ABRIR)';
    }
  }

  openStageWindow() {
    // Abre a Tela 2 como popup limpo sem barras de ferramentas
    const width = Math.min(1280, window.screen.availWidth);
    const height = Math.min(720, window.screen.availHeight);
    this.stageWindow = window.open(
      'stage.html',
      'SilvioShowStageWindow',
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
    );
  }

  // DISPARO PRINCIPAL DE UM PAD (ZERO DELAY)
  triggerPad(padId) {
    const pad = this.pads.find((p) => p.id === padId);
    if (!pad) return;

    window.audioEngine.initContext();

    const isVideoOrStage = pad.bank === 'videos' || pad.isStageMedia;

    if (isVideoOrStage) {
      // Verifica se já está tocando este mesmo vídeo em modo exclusivo (toggle off)
      const currentlyOnStage =
        this.activeStageTelemetry && this.activeStageTelemetry.padId === pad.id;

      if (currentlyOnStage && pad.mode === 'exclusive') {
        window.audioEngine.stopPad(pad.id, 0.12);
        this.channel.postMessage({ type: 'STOP_STAGE' });
        this.activeStageTelemetry = null;
        if (this.autoDuckedByVideo) {
          this.autoDuckedByVideo = false;
          this.setDuckingState(false);
        }
        return;
      }

      // Aplica a regra de interação Vídeo <-> Trilha de Fundo escolhida pelo operador
      const behavior = document.getElementById('select-video-duck-behavior').value;
      if (behavior === 'duck') {
        this.autoDuckedByVideo = true;
        this.setDuckingState(true);
      } else if (behavior === 'cut') {
        window.audioEngine.stopBank('trilhas', 0.4);
      }

      // Se o vídeo também possui áudio decodificado na RAM (Web Audio API), toca pela engine principal
      // e avisa a Tela 2 para reproduzir o vídeo sincronizado (sem duplicar áudio)
      const audioHandledByMaster = Boolean(pad.hasDecodedAudio && window.audioEngine.hasBuffer(pad.id));
      if (audioHandledByMaster) {
        window.audioEngine.playPad(pad, () => {
          if (this.autoDuckedByVideo) {
            this.autoDuckedByVideo = false;
            this.setDuckingState(false);
          }
        });
      }

      // Dispara na Tela 2 (Telão)
      this.channel.postMessage({
        type: 'PLAY_STAGE_MEDIA',
        pad: {
          ...pad,
          volume: audioHandledByMaster ? 0 : pad.volume // Evita eco duplo se o áudio já sai pelo Master da Tela 1
        }
      });

      this.activeStageTelemetry = {
        padId: pad.id,
        elapsed: 0,
        remaining: pad.duration || 5.0,
        duration: pad.duration || 5.0,
        progress: 0
      };
      this.updateStageMiniMonitor();
    } else {
      // Disparo de Áudio Instantâneo (Abertura, Trilhas de Fundo, Efeitos de Humor)
      window.audioEngine.playPad(pad, () => {
        // Callback quando termina
      });
    }
  }

  // CONTROLE DE DUCKING (TALKOVER)
  setDuckingState(active) {
    const slider = document.getElementById('duck-level-slider');
    const level = Number(slider.value) / 100;
    window.audioEngine.setDucking(active, level);

    const btn = document.getElementById('btn-ducking-toggle');
    if (active) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  toggleDucking() {
    this.autoDuckedByVideo = false;
    this.setDuckingState(!window.audioEngine.isDucking);
  }

  // FADE OUT SUAVE EM 2 SEGUNDOS
  masterFadeOut() {
    window.audioEngine.fadeOutAll(2.0);
    this.channel.postMessage({ type: 'FADE_OUT_STAGE', duration: 2.0 });
    if (this.autoDuckedByVideo) {
      this.autoDuckedByVideo = false;
      this.setDuckingState(false);
    }
  }

  // STOP IMEDIATO DE EMERGÊNCIA
  masterPanicStop() {
    window.audioEngine.stopAllImmediate();
    this.channel.postMessage({ type: 'STOP_STAGE' });
    this.activeStageTelemetry = null;
    if (this.autoDuckedByVideo) {
      this.autoDuckedByVideo = false;
      this.setDuckingState(false);
    }
    this.updateStageMiniMonitor();
  }

  // LISTA DE ESPERA (QUEUE)
  addToQueue(padId) {
    this.queue.push(padId);
    this.renderQueue();
  }

  removeFromQueue(index) {
    this.queue.splice(index, 1);
    this.renderQueue();
  }

  fireNextInQueue() {
    if (this.queue.length === 0) return;
    const nextPadId = this.queue.shift();
    this.renderQueue();
    this.triggerPad(nextPadId);
  }

  renderQueue() {
    const listEl = document.getElementById('queue-list');
    const fireBtn = document.getElementById('btn-fire-next');
    fireBtn.disabled = this.queue.length === 0;

    if (this.queue.length === 0) {
      listEl.innerHTML = `
        <div class="empty-hint">
          Clique em <strong>"+ Fila"</strong> em qualquer botão para montar a sequência do show.
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.queue
      .map((padId, idx) => {
        const pad = this.pads.find((p) => p.id === padId);
        if (!pad) return '';
        const bankLabel = BANK_META[pad.bank]?.title || pad.bank;
        return `
          <div class="queue-item">
            <div class="queue-item-info">
              <div class="queue-item-title">${idx + 1}. ${this.escapeHtml(pad.title)}</div>
              <div class="queue-item-bank">${bankLabel}</div>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="pad-mini-btn" onclick="window.operatorApp.triggerPad('${pad.id}');window.operatorApp.removeFromQueue(${idx})" title="Tocar agora">▶</button>
              <button class="pad-mini-btn" onclick="window.operatorApp.removeFromQueue(${idx})" title="Remover da fila">✕</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // RENDERIZAÇÃO DOS BANCOS E BOTÕES
  renderBankCounts() {
    document.getElementById('count-all').textContent = this.pads.length;
    for (const key of Object.keys(BANK_META)) {
      const c = this.pads.filter((p) => p.bank === key).length;
      const el = document.getElementById(`count-${key}`);
      if (el) el.textContent = c;
    }
  }

  renderPads() {
    const container = document.getElementById('pads-container');
    const banksToShow =
      this.currentBankFilter === 'all'
        ? ['abertura', 'trilhas', 'efeitos', 'videos']
        : [this.currentBankFilter];

    container.innerHTML = banksToShow
      .map((bankKey) => {
        const meta = BANK_META[bankKey];
        const bankPads = this.pads.filter((p) => p.bank === bankKey);

        return `
          <section class="bank-section" data-bank-section="${bankKey}">
            <div class="bank-section-header">
              <div>
                <div class="bank-section-title">${meta.title}</div>
                <div class="bank-section-desc">${meta.desc}</div>
              </div>
              <button class="pad-mini-btn" onclick="window.operatorApp.openPadModal(null, '${bankKey}')">
                ➕ Adicionar neste Banco
              </button>
            </div>

            <div class="pads-grid">
              ${bankPads.map((pad) => this.renderPadCardHTML(pad)).join('')}
            </div>
          </section>
        `;
      })
      .join('');

    this.attachPadCardListeners();
  }

  renderPadCardHTML(pad) {
    const isExclusive = pad.mode === 'exclusive';
    const isStage = pad.bank === 'videos' || pad.isStageMedia;
    const volPercent = Math.round((pad.volume ?? 1.0) * 100);
    const durFormatted = this.formatTime(pad.duration || 0);
    const tint = this.hexToRgba(pad.color || '#f59e0b', 0.22);

    return `
      <div class="pad-card" id="pad-card-${pad.id}" data-pad-id="${pad.id}" style="--pad-color: ${pad.color || '#f59e0b'}; --pad-tint: ${tint};">
        <div class="pad-trigger-zone" data-trigger-pad="${pad.id}" title="Clique para Disparar Instantaneamente (Zero Delay) ou solte um arquivo aqui">
          <div class="pad-top-meta">
            <span class="hotkey-badge">${pad.hotkey ? `[${this.escapeHtml(pad.hotkey)}]` : 'PAD'}</span>
            <div class="pad-badges">
              ${isStage ? '<span class="mini-badge badge-stage">📺 TELA 2</span>' : ''}
              <span class="mini-badge ${isExclusive ? 'badge-exclusive' : 'badge-overlay'}">
                ${isExclusive ? '⚡ EXCLUSIVO' : '🔊 SOBREP.'}
              </span>
            </div>
          </div>

          <div class="pad-title-row">
            <div class="pad-title">${this.escapeHtml(pad.title)}</div>
            <div class="pad-play-icon" id="pad-icon-${pad.id}">▶</div>
          </div>

          <div class="pad-time-row">
            <span id="pad-elapsed-${pad.id}">00:00.0 / ${durFormatted}</span>
            <span class="pad-remaining" id="pad-rem-${pad.id}">PRONTO</span>
          </div>
        </div>

        <div class="pad-progress-track">
          <div class="pad-progress-fill" id="pad-prog-${pad.id}"></div>
        </div>

        <div class="pad-controls">
          <div class="pad-volume-row">
            <span id="pad-vol-label-${pad.id}">🔊 ${volPercent}%</span>
            <input
              type="range"
              class="pad-volume-slider"
              data-vol-pad="${pad.id}"
              min="0"
              max="150"
              value="${volPercent}"
              title="Volume Individual do Botão"
            />
          </div>

          <div class="pad-btn-row">
            <button class="pad-mini-btn ${pad.loop ? 'active' : ''}" data-loop-pad="${pad.id}" title="Ativar/Desativar repetição em Loop">
              🔁 Loop
            </button>
            <button class="pad-mini-btn" data-mode-pad="${pad.id}" title="Alternar entre Modo Exclusivo (corta anterior) e Sobreposição (toca junto)">
              ${isExclusive ? '⚡ Excl.' : '🔊 Sobrep.'}
            </button>
            <button class="pad-mini-btn" data-queue-pad="${pad.id}" title="Adicionar à Lista de Espera">
              ➕ Fila
            </button>
            <button class="pad-mini-btn" data-edit-pad="${pad.id}" title="Editar nome, cor, atalho ou trocar arquivo">
              ⚙️
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachPadCardListeners() {
    // Disparo Instantâneo no Mousedown (Zero Delay real de mesa de corte: dispara na descida do clique!)
    document.querySelectorAll('[data-trigger-pad]').forEach((zone) => {
      zone.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Apenas botão esquerdo
        const padId = zone.getAttribute('data-trigger-pad');
        this.triggerPad(padId);
      });
    });

    // Volume individual
    document.querySelectorAll('[data-vol-pad]').forEach((slider) => {
      slider.addEventListener('input', async (e) => {
        const padId = slider.getAttribute('data-vol-pad');
        const val = Number(e.target.value) / 100;
        const pad = this.pads.find((p) => p.id === padId);
        if (!pad) return;
        pad.volume = val;
        const lbl = document.getElementById(`pad-vol-label-${padId}`);
        if (lbl) lbl.textContent = `🔊 ${Math.round(val * 100)}%`;

        window.audioEngine.setPadVolume(padId, val);
        this.channel.postMessage({ type: 'SET_STAGE_VOLUME', padId, volume: val });
        await window.stageDB.savePad(pad);
      });
    });

    // Toggle Loop
    document.querySelectorAll('[data-loop-pad]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const padId = btn.getAttribute('data-loop-pad');
        const pad = this.pads.find((p) => p.id === padId);
        if (!pad) return;
        pad.loop = !pad.loop;
        btn.classList.toggle('active', pad.loop);
        window.audioEngine.setPadLoop(padId, pad.loop);
        this.channel.postMessage({ type: 'SET_STAGE_LOOP', padId, loop: pad.loop });
        await window.stageDB.savePad(pad);
      });
    });

    // Toggle Exclusivo vs Sobreposição
    document.querySelectorAll('[data-mode-pad]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const padId = btn.getAttribute('data-mode-pad');
        const pad = this.pads.find((p) => p.id === padId);
        if (!pad) return;
        pad.mode = pad.mode === 'exclusive' ? 'overlay' : 'exclusive';
        await window.stageDB.savePad(pad);
        this.renderPads();
      });
    });

    // Adicionar à Fila
    document.querySelectorAll('[data-queue-pad]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const padId = btn.getAttribute('data-queue-pad');
        this.addToQueue(padId);
      });
    });

    // Editar Pad
    document.querySelectorAll('[data-edit-pad]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const padId = btn.getAttribute('data-edit-pad');
        this.openPadModal(padId);
      });
    });

    // Drag & Drop direto sobre um card específico para substituir o arquivo dele
    document.querySelectorAll('.pad-card').forEach((card) => {
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.style.borderColor = '#38bdf8';
      });
      card.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.style.borderColor = '';
      });
      card.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.style.borderColor = '';
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const padId = card.getAttribute('data-pad-id');
          await this.assignFileToExistingPad(padId, files[0]);
        }
      });
    });
  }

  // LOOP DE ATUALIZAÇÃO EM TEMPO REAL DA INTERFACE (30FPS)
  uiTick() {
    // 1. Atualiza Medidor VU Master
    const vuFill = document.getElementById('master-vu-fill');
    if (vuFill) {
      const level = window.audioEngine.getMasterLevel();
      vuFill.style.width = `${level}%`;
    }

    // 2. Atualiza estado visual de cada Pad (barra de progresso, contador regressivo)
    const activeChannels = [];

    for (const pad of this.pads) {
      let state = window.audioEngine.getPadPlaybackState(pad.id);

      // Se for mídia visual no Telão sem faixa na Web Audio API, usa a telemetria da Tela 2
      if (!state && this.activeStageTelemetry && this.activeStageTelemetry.padId === pad.id) {
        state = {
          isPlaying: true,
          elapsed: this.activeStageTelemetry.elapsed,
          remaining: this.activeStageTelemetry.remaining,
          duration: this.activeStageTelemetry.duration,
          progress: this.activeStageTelemetry.progress,
          loop: pad.loop
        };
      }

      const card = document.getElementById(`pad-card-${pad.id}`);
      const progBar = document.getElementById(`pad-prog-${pad.id}`);
      const elapsedEl = document.getElementById(`pad-elapsed-${pad.id}`);
      const remEl = document.getElementById(`pad-rem-${pad.id}`);
      const iconEl = document.getElementById(`pad-icon-${pad.id}`);

      if (state && state.isPlaying) {
        activeChannels.push({ pad, state });
        if (card) card.classList.add('playing');
        if (progBar) progBar.style.width = `${(state.progress * 100).toFixed(1)}%`;
        if (elapsedEl) {
          elapsedEl.textContent = `${this.formatTime(state.elapsed)} / ${this.formatTime(state.duration)}`;
        }
        if (remEl) {
          remEl.textContent = `-${this.formatTime(state.remaining)}`;
          remEl.classList.add('active');
        }
        if (iconEl) iconEl.textContent = '⏹';
      } else {
        if (card) card.classList.remove('playing');
        if (progBar) progBar.style.width = '0%';
        if (elapsedEl) {
          elapsedEl.textContent = `00:00.0 / ${this.formatTime(pad.duration || 0)}`;
        }
        if (remEl) {
          remEl.textContent = 'PRONTO';
          remEl.classList.remove('active');
        }
        if (iconEl) iconEl.textContent = '▶';
      }
    }

    this.renderActiveChannelsList(activeChannels);
    this.updateStageMiniMonitor();

    requestAnimationFrame(() => this.uiTick());
  }

  renderActiveChannelsList(activeChannels) {
    const countEl = document.getElementById('active-channels-count');
    const listEl = document.getElementById('active-channels-list');
    if (!countEl || !listEl) return;

    countEl.textContent = `${activeChannels.length} ativo(s)`;
    if (activeChannels.length === 0) {
      listEl.innerHTML = `<div class="empty-hint">Nenhum áudio ou vídeo tocando no momento.</div>`;
      return;
    }

    listEl.innerHTML = activeChannels
      .map(
        ({ pad, state }) => `
        <div class="active-channel-item" style="border-left-color: ${pad.color || '#10b981'}">
          <div>
            <strong>${this.escapeHtml(pad.title)}</strong>
            <div style="font-size:0.68rem;color:#94a3b8;">Restante: -${this.formatTime(state.remaining)}</div>
          </div>
          <button class="pad-mini-btn" onclick="window.operatorApp.stopSpecificPad('${pad.id}')">Parar</button>
        </div>
      `
      )
      .join('');
  }

  stopSpecificPad(padId) {
    window.audioEngine.stopPad(padId, 0.1);
    if (this.activeStageTelemetry && this.activeStageTelemetry.padId === padId) {
      this.channel.postMessage({ type: 'STOP_STAGE' });
      this.activeStageTelemetry = null;
      if (this.autoDuckedByVideo) {
        this.autoDuckedByVideo = false;
        this.setDuckingState(false);
      }
    }
  }

  updateStageMiniMonitor() {
    const badge = document.getElementById('stage-mini-badge');
    const title = document.getElementById('stage-mini-title');
    const bar = document.getElementById('stage-mini-bar');
    const thumb = document.getElementById('stage-mini-thumb');
    if (!badge || !title || !bar) return;

    if (this.activeStageTelemetry) {
      const pad = this.pads.find((p) => p.id === this.activeStageTelemetry.padId);
      badge.className = 'stage-mini-status playing-video';
      badge.textContent = '🔴 EXIBINDO VÍDEO NO TELÃO';
      title.textContent = pad ? pad.title : 'Vídeo em Execução';
      bar.style.width = `${((this.activeStageTelemetry.progress || 0) * 100).toFixed(1)}%`;
      if (thumb && pad?.synthVideoPreset === 'vinheta_logo_destaque') {
        thumb.src = 'Silvio%20Show%20imagens/logo%20silvio%20show%20fundo%20preto.jpeg';
      }
    } else {
      badge.className = 'stage-mini-status';
      badge.textContent = '🟢 TELA DE ESPERA NO AR';
      title.textContent =
        this.currentStandbyMode === 'logo_dark'
          ? 'Standby: Logo Microfone Silvio Show'
          : 'Arte Oficial: Programa Silvio Show';
      bar.style.width = '0%';
      if (thumb) {
        thumb.src =
          this.currentStandbyMode === 'logo_dark'
            ? 'Silvio%20Show%20imagens/logo%20silvio%20show%20fundo%20preto.jpeg'
            : 'Silvio%20Show%20imagens/imagem%20programa%20silvio%20show.jpeg';
      }
    }
  }

  // IMPORTAÇÃO ARRASTAR E SOLTAR (DRAG & DROP) E MODAL DE EDIÇÃO
  async assignFileToExistingPad(padId, file) {
    const pad = this.pads.find((p) => p.id === padId);
    if (!pad || !file) return;

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    pad.title = cleanName;
    pad.fileName = file.name;
    pad.mimeType = file.type;
    delete pad.synthPreset;
    delete pad.synthVideoPreset;

    if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
      pad.isStageMedia = true;
    }

    await window.stageDB.saveMediaBlob(pad.id, file, file.type, file.name);
    await window.stageDB.savePad(pad);
    await this.preloadAllIntoRAM();
    this.renderPads();
  }

  async importMultipleFiles(fileList, targetBank = null) {
    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      const isVisual = file.type.startsWith('video/') || file.type.startsWith('image/');
      const bank =
        targetBank && targetBank !== 'all'
          ? targetBank
          : isVisual
          ? 'videos'
          : this.currentBankFilter !== 'all'
          ? this.currentBankFilter
          : 'efeitos';

      const meta = BANK_META[bank] || BANK_META.efeitos;
      const newPad = {
        id: `pad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        bank,
        mode: meta.defaultMode,
        loop: meta.defaultLoop,
        duckable: bank === 'trilhas',
        isStageMedia: isVisual || bank === 'videos',
        volume: 1.0,
        color: meta.defaultColor,
        hotkey: '',
        fileName: file.name,
        mimeType: file.type,
        order: this.pads.length + 1
      };

      await window.stageDB.saveMediaBlob(newPad.id, file, file.type, file.name);
      await window.stageDB.savePad(newPad);
      this.pads.push(newPad);
    }

    await this.preloadAllIntoRAM();
    this.renderBankCounts();
    this.renderPads();
  }

  openPadModal(padId = null, defaultBank = 'abertura') {
    const modal = document.getElementById('modal-pad');
    const titleEl = document.getElementById('modal-pad-title');
    const idInput = document.getElementById('pad-id-input');
    const nameInput = document.getElementById('pad-title-input');
    const bankInput = document.getElementById('pad-bank-input');
    const modeInput = document.getElementById('pad-mode-input');
    const colorInput = document.getElementById('pad-color-input');
    const hotkeyInput = document.getElementById('pad-hotkey-input');
    const loopInput = document.getElementById('pad-loop-input');
    const fileInput = document.getElementById('pad-file-input');
    const fileInfo = document.getElementById('pad-file-current-info');

    fileInput.value = '';

    if (padId) {
      const pad = this.pads.find((p) => p.id === padId);
      if (!pad) return;
      titleEl.textContent = `Editar Botão: ${pad.title}`;
      idInput.value = pad.id;
      nameInput.value = pad.title;
      bankInput.value = pad.bank;
      modeInput.value = pad.mode;
      colorInput.value = pad.color || '#f59e0b';
      hotkeyInput.value = pad.hotkey || '';
      loopInput.checked = Boolean(pad.loop);
      fileInfo.textContent = pad.fileName
        ? `Arquivo atual na RAM: ${pad.fileName}`
        : 'Usando áudio/vinheta de fábrica na RAM (escolha um arquivo se quiser substituir).';
    } else {
      const bank = defaultBank !== 'all' ? defaultBank : 'abertura';
      const meta = BANK_META[bank];
      titleEl.textContent = '➕ Novo Botão no Painel';
      idInput.value = '';
      nameInput.value = '';
      bankInput.value = bank;
      modeInput.value = meta.defaultMode;
      colorInput.value = meta.defaultColor;
      hotkeyInput.value = '';
      loopInput.checked = meta.defaultLoop;
      fileInfo.textContent = 'Selecione um arquivo de áudio (.mp3, .wav) ou vídeo (.mp4, .webm).';
    }

    modal.classList.add('open');
  }

  bindUIEvents() {
    // Abrir Tela 2 (Telão)
    document.getElementById('btn-open-stage').addEventListener('click', () => {
      this.openStageWindow();
    });

    // Comando de Tela Cheia para Tela 2
    document.getElementById('btn-fullscreen-stage').addEventListener('click', () => {
      this.channel.postMessage({ type: 'REQUEST_FULLSCREEN' });
      if (!this.stageConnected) {
        this.openStageWindow();
      }
    });

    // Voltar Telão para Descanso
    document.getElementById('btn-clear-stage').addEventListener('click', () => {
      this.channel.postMessage({ type: 'STOP_STAGE' });
      this.activeStageTelemetry = null;
      if (this.autoDuckedByVideo) {
        this.autoDuckedByVideo = false;
        this.setDuckingState(false);
      }
      this.updateStageMiniMonitor();
    });

    // Botão Ducking / Talkover
    document.getElementById('btn-ducking-toggle').addEventListener('click', () => {
      this.toggleDucking();
    });

    // Slider de nível de Ducking
    document.getElementById('duck-level-slider').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      document.getElementById('duck-level-label').textContent = `${val}%`;
      window.audioEngine.duckLevel = val / 100;
      if (window.audioEngine.isDucking) {
        window.audioEngine.setDucking(true, val / 100);
      }
    });

    // Botão Fade Out 2s
    document.getElementById('btn-master-fadeout').addEventListener('click', () => {
      this.masterFadeOut();
    });

    // Botão Stop Emergência
    document.getElementById('btn-master-stop').addEventListener('click', () => {
      this.masterPanicStop();
    });

    // Abas de Bancos
    document.querySelectorAll('.bank-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.bank-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentBankFilter = tab.getAttribute('data-bank');
        this.renderPads();
      });
    });

    // Importação rápida de múltiplos arquivos
    const quickInput = document.getElementById('quick-file-input');
    document.getElementById('btn-quick-import').addEventListener('click', () => {
      quickInput.click();
    });
    quickInput.addEventListener('change', async (e) => {
      if (e.target.files?.length) {
        await this.importMultipleFiles(e.target.files, this.currentBankFilter);
        quickInput.value = '';
      }
    });

    // Drag & Drop geral na área de pads
    const padsContainer = document.getElementById('pads-container');
    padsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      padsContainer.classList.add('drag-over');
    });
    padsContainer.addEventListener('dragleave', (e) => {
      if (e.target === padsContainer) {
        padsContainer.classList.remove('drag-over');
      }
    });
    padsContainer.addEventListener('drop', async (e) => {
      e.preventDefault();
      padsContainer.classList.remove('drag-over');
      if (e.dataTransfer?.files?.length) {
        await this.importMultipleFiles(e.dataTransfer.files, this.currentBankFilter);
      }
    });

    // Novo Botão
    document.getElementById('btn-new-pad').addEventListener('click', () => {
      this.openPadModal(null, this.currentBankFilter);
    });

    // Restaurar Kit Demo
    document.getElementById('btn-reset-demo').addEventListener('click', async () => {
      this.masterPanicStop();
      await window.stageDB.clearAll();
      await window.stageDB.saveAllPads(DEFAULT_DEMO_PADS);
      this.pads = JSON.parse(JSON.stringify(DEFAULT_DEMO_PADS));
      await this.preloadAllIntoRAM();
      this.renderBankCounts();
      this.renderPads();
    });

    // Lista de Espera
    document.getElementById('btn-fire-next').addEventListener('click', () => {
      this.fireNextInQueue();
    });
    document.getElementById('btn-clear-queue').addEventListener('click', () => {
      this.queue = [];
      this.renderQueue();
    });

    // Modal de Pad (Salvar / Fechar)
    const closePadModal = () => document.getElementById('modal-pad').classList.remove('open');
    document.getElementById('btn-close-pad-modal').addEventListener('click', closePadModal);
    document.getElementById('btn-cancel-pad-modal').addEventListener('click', closePadModal);

    document.getElementById('form-pad').addEventListener('submit', async (e) => {
      e.preventDefault();
      const existingId = document.getElementById('pad-id-input').value;
      const title = document.getElementById('pad-title-input').value.trim();
      const bank = document.getElementById('pad-bank-input').value;
      const mode = document.getElementById('pad-mode-input').value;
      const color = document.getElementById('pad-color-input').value;
      const hotkey = document.getElementById('pad-hotkey-input').value.trim().toUpperCase();
      const loop = document.getElementById('pad-loop-input').checked;
      const file = document.getElementById('pad-file-input').files?.[0];

      let pad;
      if (existingId) {
        pad = this.pads.find((p) => p.id === existingId);
        if (pad) {
          pad.title = title;
          pad.bank = bank;
          pad.mode = mode;
          pad.color = color;
          pad.hotkey = hotkey;
          pad.loop = loop;
          pad.duckable = bank === 'trilhas';
          pad.isStageMedia = bank === 'videos' || Boolean(pad.isStageMedia);
        }
      } else {
        pad = {
          id: `pad_${Date.now()}`,
          title,
          bank,
          mode,
          color,
          hotkey,
          loop,
          duckable: bank === 'trilhas',
          isStageMedia: bank === 'videos',
          volume: 1.0,
          synthPreset: file ? null : 'efeito_ta_certo',
          order: this.pads.length + 1
        };
        this.pads.push(pad);
      }

      if (file && pad) {
        pad.fileName = file.name;
        pad.mimeType = file.type;
        delete pad.synthPreset;
        delete pad.synthVideoPreset;
        if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
          pad.isStageMedia = true;
        }
        await window.stageDB.saveMediaBlob(pad.id, file, file.type, file.name);
      }

      await window.stageDB.savePad(pad);
      closePadModal();
      await this.preloadAllIntoRAM();
      this.renderBankCounts();
      this.renderPads();
    });

    // Modal da Tela de Descanso (Standby da Tela 2)
    const standbyModal = document.getElementById('modal-standby');
    const closeStandby = () => standbyModal.classList.remove('open');
    document.getElementById('btn-config-standby').addEventListener('click', () => {
      standbyModal.classList.add('open');
    });
    document.getElementById('btn-close-standby-modal').addEventListener('click', closeStandby);
    document.getElementById('btn-cancel-standby-modal').addEventListener('click', closeStandby);

    document.getElementById('form-standby').addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = document.getElementById('standby-mode-input').value;
      const effects = document.getElementById('standby-effects-input').checked;
      const file = document.getElementById('standby-file-input').files?.[0];

      let finalMode = mode;
      if (file) {
        finalMode = 'custom';
        await window.stageDB.saveMediaBlob('__standby_media__', file, file.type, file.name);
      }

      this.currentStandbyMode = finalMode;
      await window.stageDB.setSetting('standby_config', {
        mode: finalMode,
        effects
      });

      this.updateStageMiniMonitor();
      this.channel.postMessage({ type: 'UPDATE_STANDBY' });
      closeStandby();
    });

    // ATALHOS DE TECLADO AO VIVO PARA O OPERADOR
    window.addEventListener('keydown', (e) => {
      // Ignora atalhos quando estiver digitando em um input/modal
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      const key = e.key.toUpperCase();

      if (e.code === 'Space' || e.key === 'Escape') {
        e.preventDefault();
        this.masterPanicStop();
        return;
      }

      if (key === 'D') {
        e.preventDefault();
        this.toggleDucking();
        return;
      }

      if (key === 'F') {
        e.preventDefault();
        this.masterFadeOut();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        this.fireNextInQueue();
        return;
      }

      // Verifica se algum pad possui esta tecla como atalho
      const matchedPad = this.pads.find((p) => p.hotkey && p.hotkey.toUpperCase() === key);
      if (matchedPad) {
        e.preventDefault();
        this.triggerPad(matchedPad.id);
      }
    });
  }

  formatTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return '00:00.0';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
  }

  hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.operatorApp = new OperatorPanelApp();
