// audio-engine.js - Motor Web Audio API em RAM (Zero Delay) para o Painel Silvio Show

class ShowAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bedDuckGain = null; // Sub-bus para Trilhas de Fundo / Cama (sujeitas ao Ducking)
    this.fgGain = null;      // Sub-bus para Abertura e Efeitos (não baixam no Talkover)
    this.analyser = null;

    // Cache em RAM: padId -> AudioBuffer
    this.buffers = new Map();
    // Vozes ativas: voiceId -> { voiceId, padId, bank, source, gainNode, startTime, duration, loop, volume, fadingOut }
    this.activeVoices = new Map();

    this.isDucking = false;
    this.duckLevel = 0.20; // 20% padrão quando Talkover/Ducking está ativo
    this.masterVolume = 1.0;
    this.voiceCounter = 0;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;

      this.bedDuckGain = this.ctx.createGain();
      this.bedDuckGain.gain.value = this.isDucking ? this.duckLevel : 1.0;

      this.fgGain = this.ctx.createGain();
      this.fgGain.gain.value = 1.0;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.78;

      this.bedDuckGain.connect(this.masterGain);
      this.fgGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Decodifica um ArrayBuffer/Blob de áudio para AudioBuffer na memória RAM
  async decodeAndStore(padId, blobOrBuffer) {
    this.initContext();
    let arrayBuffer;
    if (blobOrBuffer instanceof Blob) {
      arrayBuffer = await blobOrBuffer.arrayBuffer();
    } else {
      arrayBuffer = blobOrBuffer;
    }
    // Copia o buffer pois decodeAudioData pode destacar o original
    const bufferCopy = arrayBuffer.slice(0);
    const audioBuffer = await this.ctx.decodeAudioData(bufferCopy);
    this.buffers.set(padId, audioBuffer);
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      ramBytes: audioBuffer.length * audioBuffer.numberOfChannels * 4
    };
  }

  // Gera e armazena na RAM os áudios sintetizados de fábrica (Kit Demo Auditório)
  generatePresetInRAM(padId, presetName) {
    this.initContext();
    const sr = this.ctx.sampleRate;
    let buffer;

    switch (presetName) {
      case 'fanfarra_silvio': {
        // Fanfarra brass festiva estilo show de auditório (4.2s)
        const dur = 4.2;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        const notes = [
          { f: 523.25, t: 0.0, d: 0.22 }, // C5
          { f: 659.25, t: 0.24, d: 0.22 }, // E5
          { f: 783.99, t: 0.48, d: 0.22 }, // G5
          { f: 1046.5, t: 0.72, d: 0.55 }, // C6
          { f: 880.00, t: 1.35, d: 0.25 }, // A5
          { f: 987.77, t: 1.65, d: 0.25 }, // B5
          { f: 1046.5, t: 1.95, d: 1.95 }  // C6 final acorde
        ];
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          const detune = ch === 0 ? 0.998 : 1.002;
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            let sample = 0;
            for (const n of notes) {
              if (t >= n.t && t <= n.t + n.d) {
                const localT = t - n.t;
                const env = Math.min(1, localT / 0.02) * Math.exp(-localT * 1.4);
                const w =
                  0.5 * Math.sin(2 * Math.PI * n.f * detune * localT) +
                  0.3 * Math.sin(2 * Math.PI * n.f * 2 * detune * localT) +
                  0.15 * Math.sin(2 * Math.PI * n.f * 3 * detune * localT) +
                  0.1 * Math.sin(2 * Math.PI * (n.f * 0.5) * localT);
                sample += w * env * 0.45;
              }
            }
            data[i] = Math.tanh(sample);
          }
        }
        break;
      }

      case 'entrada_impacto': {
        // Fanfarra de Entrada de Convidado / Quadro (3.2s)
        const dur = 3.2;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        const chords = [
          { freqs: [293.66, 440, 587.33, 739.99], t: 0.0, d: 0.35 },
          { freqs: [329.63, 493.88, 659.25, 830.61], t: 0.38, d: 0.35 },
          { freqs: [392.00, 587.33, 783.99, 987.77], t: 0.76, d: 2.2 }
        ];
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            let s = 0;
            for (const c of chords) {
              if (t >= c.t && t <= c.t + c.d) {
                const lt = t - c.t;
                const env = Math.min(1, lt / 0.015) * Math.exp(-lt * 1.1);
                for (const f of c.freqs) {
                  s += (Math.sin(2 * Math.PI * f * lt) + 0.4 * Math.sin(4 * Math.PI * f * lt)) * env * 0.16;
                }
              }
            }
            data[i] = Math.tanh(s);
          }
        }
        break;
      }

      case 'cama_auditorio': {
        // Loop instrumental alegre estilo Talk Show / Auditório (8.0s perfeitamente loopável)
        const dur = 8.0;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        const bpm = 120;
        const beatDur = 60 / bpm; // 0.5s
        const bassPattern = [130.81, 164.81, 196.00, 220.00, 146.83, 174.61, 196.00, 246.94];
        const chordProg = [
          [261.63, 329.63, 392.00, 493.88], // Cmaj7
          [220.00, 261.63, 329.63, 392.00], // Am7
          [293.66, 349.23, 440.00, 523.25], // Dm7
          [196.00, 246.94, 293.66, 349.23]  // G7
        ];
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            const beatIdx = Math.floor(t / beatDur);
            const beatTime = t % beatDur;
            const barIdx = Math.floor(t / (beatDur * 4)) % 4;

            // Walking bass suave
            const bassFreq = bassPattern[beatIdx % bassPattern.length];
            const bassEnv = Math.min(1, beatTime / 0.015) * Math.exp(-beatTime * 5.5);
            const bass = Math.sin(2 * Math.PI * bassFreq * beatTime) * bassEnv * 0.32;

            // Rhodes / Electric Piano Chord
            const chord = chordProg[barIdx];
            const chordBeat = t % (beatDur * 2);
            const chordEnv = Math.min(1, chordBeat / 0.02) * Math.exp(-chordBeat * 1.8);
            let ep = 0;
            for (const cf of chord) {
              ep += Math.sin(2 * Math.PI * cf * (ch === 0 ? 0.999 : 1.001) * t) * chordEnv * 0.09;
            }

            // Hi-hat swing leve
            const hhTime = t % (beatDur / 2);
            const hhEnv = Math.exp(-hhTime * 45);
            const hh = (Math.random() * 2 - 1) * hhEnv * 0.05;

            data[i] = Math.tanh(bass + ep + hh);
          }
        }
        break;
      }

      case 'cama_suspense': {
        // Cama de suspense / pergunta valendo prêmio (6.0s loopável)
        const dur = 6.0;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
            const drone =
              Math.sin(2 * Math.PI * 110 * t) * 0.25 +
              Math.sin(2 * Math.PI * 164.81 * t) * 0.15 +
              Math.sin(2 * Math.PI * 233.08 * t) * 0.12 * pulse;
            const tickT = t % 0.5;
            const tick = Math.sin(2 * Math.PI * 1200 * tickT) * Math.exp(-tickT * 35) * 0.18;
            data[i] = Math.tanh(drone + tick);
          }
        }
        break;
      }

      case 'efeito_risadas': {
        // Risadas ritmadas de auditório / sitcom (2.6s)
        const dur = 2.6;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        const bursts = [0.0, 0.22, 0.45, 0.70, 0.98, 1.25, 1.55, 1.85];
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            let val = 0;
            for (let b = 0; b < bursts.length; b++) {
              const dt = t - bursts[b];
              if (dt >= 0 && dt < 0.35) {
                const env = Math.sin((dt / 0.35) * Math.PI) * Math.exp(-t * 0.45);
                const formant =
                  Math.sin(2 * Math.PI * (240 - b * 8 - dt * 60) * dt) * 0.4 +
                  Math.sin(2 * Math.PI * (720 + ch * 25) * dt) * 0.3 +
                  (Math.random() * 2 - 1) * 0.3;
                val += formant * env * 0.55;
              }
            }
            data[i] = Math.tanh(val);
          }
        }
        break;
      }

      case 'efeito_ta_certo': {
        // Sino Duplo "Tá Certo!" / Resposta Correta (1.6s)
        const dur = 1.6;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            let s = 0;
            // Ding 1 (G6)
            if (t < 1.2) {
              s += Math.sin(2 * Math.PI * 1567.98 * t) * Math.exp(-t * 6) * 0.45;
              s += Math.sin(2 * Math.PI * 3135.96 * t) * Math.exp(-t * 12) * 0.2;
            }
            // Ding 2 (C7)
            if (t >= 0.18) {
              const t2 = t - 0.18;
              s += Math.sin(2 * Math.PI * 2093.00 * t2) * Math.exp(-t2 * 3.5) * 0.55;
              s += Math.sin(2 * Math.PI * 4186.01 * t2) * Math.exp(-t2 * 8) * 0.25;
            }
            data[i] = Math.tanh(s);
          }
        }
        break;
      }

      case 'efeito_buzina': {
        // Buzina cômica / Erro de auditório "Honk-Honk!" (1.3s)
        const dur = 1.3;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            const active1 = t >= 0 && t <= 0.38;
            const active2 = t >= 0.46 && t <= 1.05;
            let s = 0;
            if (active1 || active2) {
              const lt = active1 ? t : t - 0.46;
              const f = active1 ? 310 : 285 - lt * 40;
              const env = Math.min(1, lt / 0.02) * Math.exp(-lt * 1.8);
              for (let h = 1; h <= 6; h++) {
                s += (1 / h) * Math.sin(2 * Math.PI * f * h * lt);
              }
              s *= env * 0.45;
            }
            data[i] = Math.tanh(s);
          }
        }
        break;
      }

      case 'efeito_badumtss': {
        // Ba-Dum-Tss clássico para piada de palco (1.9s)
        const dur = 1.9;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            let s = 0;
            // "Ba" (Kick/Tom grave em t=0)
            if (t < 0.3) {
              const f = 140 * Math.exp(-t * 14) + 55;
              s += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 12) * 0.8;
            }
            // "Dum" (Snare/Tom médio em t=0.22)
            if (t >= 0.22 && t < 0.55) {
              const lt = t - 0.22;
              const f = 210 * Math.exp(-lt * 12) + 95;
              const tone = Math.sin(2 * Math.PI * f * lt) * Math.exp(-lt * 14) * 0.6;
              const snareNoise = (Math.random() * 2 - 1) * Math.exp(-lt * 22) * 0.35;
              s += tone + snareNoise;
            }
            // "Tss" (Crash Cymbal em t=0.48)
            if (t >= 0.48) {
              const lt = t - 0.48;
              const env = Math.min(1, lt / 0.008) * Math.exp(-lt * 3.2);
              const metal =
                Math.sin(2 * Math.PI * 3420 * lt) * 0.2 +
                Math.sin(2 * Math.PI * 5180 * lt) * 0.2 +
                (Math.random() * 2 - 1) * 0.6;
              s += metal * env * 0.55;
            }
            data[i] = Math.tanh(s);
          }
        }
        break;
      }

      case 'efeito_aplausos': {
        // Aplausos calorosos do auditório (3.5s)
        const dur = 3.5;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          let prev = 0;
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            const env =
              t < 0.25
                ? t / 0.25
                : t > dur - 0.8
                ? Math.max(0, (dur - t) / 0.8)
                : 1.0;
            // Ruído filtrado com modulação de palmas individuais
            const clapMod = 0.65 + 0.35 * Math.sin(2 * Math.PI * (14 + (i % 7)) * t);
            const raw = (Math.random() * 2 - 1) * clapMod;
            prev = prev * 0.72 + raw * 0.28;
            data[i] = Math.tanh(prev * env * 1.4);
          }
        }
        break;
      }

      default: {
        // Beep padrão
        const dur = 1.0;
        buffer = this.ctx.createBuffer(2, Math.floor(sr * dur), sr);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) {
            const t = i / sr;
            data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 4) * 0.4;
          }
        }
      }
    }

    this.buffers.set(padId, buffer);
    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      ramBytes: buffer.length * buffer.numberOfChannels * 4
    };
  }

  hasBuffer(padId) {
    return this.buffers.has(padId);
  }

  getBufferDuration(padId) {
    const b = this.buffers.get(padId);
    return b ? b.duration : 0;
  }

  getTotalRAMUsageMB() {
    let bytes = 0;
    for (const buf of this.buffers.values()) {
      bytes += buf.length * buf.numberOfChannels * 4;
    }
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  // Disparo instantâneo (Zero Delay) a partir do AudioBuffer na RAM
  playPad(pad, onEndedCallback) {
    this.initContext();
    const buffer = this.buffers.get(pad.id);
    if (!buffer) {
      console.warn('Buffer não encontrado em RAM para o pad:', pad.id);
      return null;
    }

    // Se o pad estiver em modo EXCLUSIVO:
    // - Se já estiver tocando este mesmo pad em modo exclusivo, fazemos toggle stop suave
    // - Corta suavemente outros áudios exclusivos (ou do mesmo banco de trilha/abertura)
    if (pad.mode === 'exclusive') {
      for (const [vId, voice] of this.activeVoices.entries()) {
        if (voice.padId === pad.id) {
          this.stopVoice(vId, 0.12);
          return null; // Toggle off se clicou no mesmo botão exclusivo
        }
        if (voice.mode === 'exclusive' || voice.bank === pad.bank) {
          this.stopVoice(vId, 0.12);
        }
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(pad.loop);

    const gainNode = this.ctx.createGain();
    const targetVol = typeof pad.volume === 'number' ? pad.volume : 1.0;
    gainNode.gain.setValueAtTime(targetVol, this.ctx.currentTime);

    source.connect(gainNode);

    // Roteia Trilhas de Fundo para o barramento com Ducking, e os demais para o FG bus
    if (pad.bank === 'trilhas' || pad.duckable) {
      gainNode.connect(this.bedDuckGain);
    } else {
      gainNode.connect(this.fgGain);
    }

    const voiceId = `voice_${++this.voiceCounter}_${pad.id}`;
    const voiceRecord = {
      voiceId,
      padId: pad.id,
      title: pad.title,
      bank: pad.bank,
      mode: pad.mode,
      source,
      gainNode,
      startTime: this.ctx.currentTime,
      duration: buffer.duration,
      loop: Boolean(pad.loop),
      volume: targetVol,
      fadingOut: false
    };

    this.activeVoices.set(voiceId, voiceRecord);

    source.onended = () => {
      if (this.activeVoices.has(voiceId)) {
        this.activeVoices.delete(voiceId);
        if (onEndedCallback) onEndedCallback(voiceRecord);
      }
    };

    source.start(0);
    return voiceRecord;
  }

  // Atualiza volume individual em tempo real enquanto toca
  setPadVolume(padId, newVolume) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices.values()) {
      if (voice.padId === padId && !voice.fadingOut) {
        voice.volume = newVolume;
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setTargetAtTime(newVolume, now, 0.03);
      }
    }
  }

  // Atualiza flag de loop em tempo real
  setPadLoop(padId, loopVal) {
    for (const voice of this.activeVoices.values()) {
      if (voice.padId === padId) {
        voice.loop = Boolean(loopVal);
        voice.source.loop = Boolean(loopVal);
      }
    }
  }

  // Ativa/desativa o Ducking (Talkover) com rampa suave
  setDucking(active, customDuckLevel = null) {
    this.initContext();
    this.isDucking = Boolean(active);
    if (typeof customDuckLevel === 'number') {
      this.duckLevel = customDuckLevel;
    }
    const now = this.ctx.currentTime;
    const target = this.isDucking ? this.duckLevel : 1.0;
    const timeConstant = this.isDucking ? 0.08 : 0.16; // Desce rápido (250ms), sobe suave (500ms)
    this.bedDuckGain.gain.cancelScheduledValues(now);
    this.bedDuckGain.gain.setTargetAtTime(target, now, timeConstant);
  }

  // Para uma voz específica com fade curto anti-estalo ou rampa customizada
  stopVoice(voiceId, fadeSeconds = 0.05) {
    const voice = this.activeVoices.get(voiceId);
    if (!voice || !this.ctx) return;

    voice.fadingOut = true;
    const now = this.ctx.currentTime;
    try {
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), now);
      voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
      voice.source.stop(now + fadeSeconds + 0.01);
    } catch (e) {
      // Caso já tenha parado
    }
  }

  // Para todas as vozes de um pad específico
  stopPad(padId, fadeSeconds = 0.08) {
    for (const [vId, voice] of this.activeVoices.entries()) {
      if (voice.padId === padId) {
        this.stopVoice(vId, fadeSeconds);
      }
    }
  }

  // Corta todas as trilhas de fundo (ex: quando um vídeo do telão é configurado para cortar a trilha)
  stopBank(bankName, fadeSeconds = 0.4) {
    for (const [vId, voice] of this.activeVoices.entries()) {
      if (voice.bank === bankName) {
        this.stopVoice(vId, fadeSeconds);
      }
    }
  }

  // FADE OUT GERAL (ex: 2 segundos)
  fadeOutAll(durationSeconds = 2.0) {
    for (const vId of this.activeVoices.keys()) {
      this.stopVoice(vId, durationSeconds);
    }
  }

  // STOP IMEDIATO DE EMERGÊNCIA
  stopAllImmediate() {
    for (const vId of this.activeVoices.keys()) {
      this.stopVoice(vId, 0.02);
    }
  }

  // Retorna o progresso (0..1) e tempo restante de um pad ativo
  getPadPlaybackState(padId) {
    if (!this.ctx) return null;
    let latestVoice = null;
    for (const voice of this.activeVoices.values()) {
      if (voice.padId === padId) {
        latestVoice = voice;
      }
    }
    if (!latestVoice) return null;

    const elapsedRaw = Math.max(0, this.ctx.currentTime - latestVoice.startTime);
    const dur = Math.max(0.01, latestVoice.duration);
    const elapsed = latestVoice.loop ? elapsedRaw % dur : Math.min(dur, elapsedRaw);
    const remaining = Math.max(0, dur - elapsed);
    const progress = Math.min(1, elapsed / dur);

    return {
      isPlaying: true,
      fadingOut: latestVoice.fadingOut,
      elapsed,
      remaining,
      duration: dur,
      progress,
      loop: latestVoice.loop
    };
  }

  // Medidor VU Master (0..100) para feedback visual na mesa técnica
  getMasterLevel() {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const norm = (data[i] - 128) / 128;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    return Math.min(100, Math.round(rms * 240));
  }
}

window.audioEngine = new ShowAudioEngine();
