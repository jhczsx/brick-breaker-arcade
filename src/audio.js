/**
 * Efeitos sonoros sintetizados com a Web Audio API.
 *
 * Por que sintetizar em vez de usar arquivos .mp3/.wav?
 *  - o repositório fica leve e sem binários;
 *  - não existe problema de licença de áudio;
 *  - o jogo funciona 100% offline.
 *
 * O AudioContext só pode ser criado após uma interação do usuário
 * (regra dos navegadores), por isso `unlock()` é chamado no primeiro clique.
 */

export class Sound {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
  }

  /** Cria (ou retoma) o contexto de áudio. Deve ser chamado num gesto do usuário. */
  unlock() {
    try {
      if (!this.context) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = 0.28;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') {
        this.context.resume();
      }
    } catch {
      this.context = null;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) {
      this.master.gain.value = enabled ? 0.28 : 0;
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /** Toca uma nota simples com envelope de ataque/decaimento. */
  tone({ frequency = 440, duration = 0.12, type = 'square', volume = 1, sweepTo = null, delay = 0 }) {
    if (!this.enabled || !this.context) return;

    try {
      const now = this.context.currentTime + delay;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      if (sweepTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      /* ignora falhas de áudio */
    }
  }

  /** Ruído branco curto, usado no "estilhaço" do bloco quebrando. */
  noise({ duration = 0.16, volume = 0.5, delay = 0 }) {
    if (!this.enabled || !this.context) return;

    try {
      const now = this.context.currentTime + delay;
      const frameCount = Math.floor(this.context.sampleRate * duration);
      const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
      }

      const src = this.context.createBufferSource();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();

      src.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(now);
      src.stop(now + duration);
    } catch {
      /* ignora falhas de áudio */
    }
  }

  bounce(power = 0.5) {
    this.tone({
      frequency: 320 + power * 220,
      duration: 0.07,
      type: 'square',
      volume: 0.5,
    });
  }

  brickHit() {
    this.tone({ frequency: 620, duration: 0.06, type: 'triangle', volume: 0.45 });
  }

  brickBreak() {
    this.noise({ duration: 0.18, volume: 0.45 });
    this.tone({ frequency: 780, sweepTo: 1180, duration: 0.11, type: 'square', volume: 0.28 });
  }

  loseLife() {
    this.tone({ frequency: 340, sweepTo: 90, duration: 0.55, type: 'sawtooth', volume: 0.42 });
  }

  serve() {
    this.tone({ frequency: 520, duration: 0.07, type: 'square', volume: 0.4 });
  }

  levelClear() {
    [523, 659, 784, 1047].forEach((freq, index) => {
      this.tone({ frequency: freq, duration: 0.16, type: 'square', volume: 0.38, delay: index * 0.09 });
    });
  }

  gameOver() {
    [440, 392, 330, 262].forEach((freq, index) => {
      this.tone({ frequency: freq, duration: 0.24, type: 'triangle', volume: 0.4, delay: index * 0.17 });
    });
  }
}
