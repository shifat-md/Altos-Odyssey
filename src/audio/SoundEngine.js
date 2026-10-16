// Web Audio API procedural sound engine for Alto's Odyssey inspired game

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isMusicMuted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Wind & Sand sound nodes
    this.windSource = null;
    this.windGain = null;
    this.windFilter = null;

    this.sandSource = null;
    this.sandGain = null;
    this.sandFilter = null;

    // Music ambient pad state
    this.padOscillators = [];
    this.padGain = null;
    this.currentChordIndex = 0;
    this.musicInterval = null;

    // Coin arpeggio tracker
    this.coinNoteIndex = 0;
    this.lastCoinTime = 0;

    // Chords for Alto's serene desert atmosphere (frequencies in Hz)
    // Dreamy Desert Pentatonic / Dorian chords: Dm9, Gm7, Bbmaj7, Asus4
    this.ambientChords = [
      [146.83, 220.00, 261.63, 329.63, 440.00], // D3, A3, C4, E4, A4
      [196.00, 293.66, 349.23, 440.00, 523.25], // G3, D4, F4, A4, C5
      [116.54, 233.08, 293.66, 349.23, 440.00], // Bb2, Bb3, D4, F4, A4
      [220.00, 293.66, 329.63, 440.00, 587.33]  // A3, D4, E4, A4, D5
    ];

    // Egyptian/Desert Pentatonic notes for coin pick up
    this.coinScale = [440, 493.88, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.50];
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initContinuousSounds();
      this.startAmbientMusic();
    } catch (e) {
      console.warn("Web Audio API could not be initialized:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initContinuousSounds() {
    if (!this.ctx) return;

    // 1. Wind noise generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Wind source (white/pink noise filtered)
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxGain);
    this.windSource.start();

    // 2. Sand carving sliding sound
    this.sandSource = this.ctx.createBufferSource();
    this.sandSource.buffer = noiseBuffer;
    this.sandSource.loop = true;

    this.sandFilter = this.ctx.createBiquadFilter();
    this.sandFilter.type = 'lowpass';
    this.sandFilter.frequency.setValueAtTime(500, this.ctx.currentTime);

    this.sandGain = this.ctx.createGain();
    this.sandGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sandSource.connect(this.sandFilter);
    this.sandFilter.connect(this.sandGain);
    this.sandGain.connect(this.sfxGain);
    this.sandSource.start();
  }

  updateDynamicSounds(speed, isGrounded, isGliding, heightAboveGround) {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Wind volume increases with speed or high in air
    if (this.windGain && this.windFilter) {
      const airFactor = Math.min(1.5, Math.max(0.1, (speed / 10) + (heightAboveGround / 600)));
      const targetGain = Math.min(0.28, 0.05 + airFactor * 0.15);
      const targetFreq = Math.min(900, 280 + speed * 35);
      this.windGain.gain.setTargetAtTime(targetGain, t, 0.1);
      this.windFilter.frequency.setTargetAtTime(targetFreq, t, 0.1);
    }

    // Sand carving noise
    if (this.sandGain && this.sandFilter) {
      if (isGrounded && speed > 0.5) {
        const sandVolume = Math.min(0.35, (speed / 15) * 0.3);
        const sandFreq = Math.min(1800, 400 + speed * 70);
        this.sandGain.gain.setTargetAtTime(sandVolume, t, 0.05);
        this.sandFilter.frequency.setTargetAtTime(sandFreq, t, 0.05);
      } else {
        this.sandGain.gain.setTargetAtTime(0, t, 0.08);
      }
    }
  }

  startAmbientMusic() {
    if (!this.ctx || this.musicInterval) return;

    const playChord = () => {
      if (!this.ctx || this.isMusicMuted || this.isMuted) return;

      const chord = this.ambientChords[this.currentChordIndex];
      this.currentChordIndex = (this.currentChordIndex + 1) % this.ambientChords.length;

      const now = this.ctx.currentTime;
      const chordDuration = 7.0; // gentle slow evolving pad

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        // Subtle detune for warmth
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 1.5, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600 + Math.random() * 400, now);

        // Soft attack, sustained, slow release
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.04 / chord.length, now + 2.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + chordDuration + 0.5);
      });
    };

    playChord();
    this.musicInterval = setInterval(playChord, 6500);
  }

  // --- ONE-SHOT SFX ---

  playJump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playFlipSpin(rotationRate) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260 + Math.abs(rotationRate) * 120, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playLanding(quality = 'normal') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sand thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);

    // If "great" or "perfect" landing, play rewarding chime
    if (quality === 'perfect' || quality === 'great') {
      const chimeFreq = quality === 'perfect' ? 880 : 660;
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(chimeFreq, now + 0.05);

      chimeGain.gain.setValueAtTime(0.18, now + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chimeOsc.start(now + 0.05);
      chimeOsc.stop(now + 0.65);
    }
  }

  playCoin() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Advance scale note if collected quickly within 1.2s
    if (now - this.lastCoinTime < 1.2) {
      this.coinNoteIndex = (this.coinNoteIndex + 1) % this.coinScale.length;
    } else {
      this.coinNoteIndex = 0;
    }
    this.lastCoinTime = now;

    const freq = this.coinScale[this.coinNoteIndex];

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    // High harmonic sparkle
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  }

  playBalloonBounce() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  playGrind() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350 + Math.random() * 80, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playRockSmash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  playLotusBoost() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Harmonic triumphant shimmer
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.65);
    });
  }

  playExpeditionComplete() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Triumphant multi-chord pentatonic fanfare: D4 -> F#4 -> A4 -> D5 -> E5
    const fanfareNotes = [293.66, 369.99, 440.00, 587.33, 659.25, 880.00];
    fanfareNotes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.3);
    });
  }

  playTimerTick(isUrgent = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isUrgent ? 880 : 580, now);

    gain.gain.setValueAtTime(isUrgent ? 0.15 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  toggleMusic() {
    this.isMusicMuted = !this.isMusicMuted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMusicMuted;
  }
}

export const soundEngine = new SoundEngine();
