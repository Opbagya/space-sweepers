let ctx: AudioContext | null = null;
let master: GainNode;
let hiss: GainNode;
let roar: GainNode;
let noiseBuf: AudioBuffer;
let musicGain: GainNode | null = null;
let musicTimer: ReturnType<typeof setInterval> | null = null;
const musicNodes = new Set<AudioNode>();

function noiseSrc() {
  if (!ctx) throw new Error("Audio not initialized");
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

function env(g: GainNode, t: number, peak: number, a: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export const audio = {
  masterVolume: 0.85,
  musicVolume: 0.75,
  sfxVolume: 0.85,
  voiceEnabled: true,

  setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (master && ctx) {
      master.gain.setTargetAtTime(this.masterVolume, ctx.currentTime, 0.05);
    }
  },

  setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (musicGain && ctx) {
      musicGain.gain.setTargetAtTime(this.musicVolume * 0.42, ctx.currentTime, 0.08);
    }
  },

  setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (hiss && ctx) {
      hiss.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
  },

  setVoiceEnabled(val: boolean) {
    this.voiceEnabled = val;
    if (!val && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },

  init() {
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);

    // Generate stereo noise buffer
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // Ultra-quiet, smooth spacecraft atmosphere (no harsh buzzing or beating)
    const air = noiseSrc();
    air.loop = true;
    const af = ctx.createBiquadFilter();
    af.type = "lowpass";
    af.frequency.value = 180;
    const ag = ctx.createGain();
    ag.gain.value = 0.008;
    air.connect(af).connect(ag).connect(master);
    air.start();

    // RCS thruster soft hiss
    const hs = noiseSrc();
    hs.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.6;
    hiss = ctx.createGain();
    hiss.gain.value = 0;
    hs.connect(bp).connect(hiss).connect(master);
    hs.start();

    // Hypersonic reentry / burn-up roar
    const rs = noiseSrc();
    rs.loop = true;
    const rlp = ctx.createBiquadFilter();
    rlp.type = "lowpass";
    rlp.frequency.value = 400;
    roar = ctx.createGain();
    roar.gain.value = 0;
    rs.connect(rlp).connect(roar).connect(master);
    rs.start();
  },

  suspend(on: boolean) {
    if (!ctx) return;
    if (on) void ctx.suspend();
    else void ctx.resume();
  },

  setHiss(v: number) {
    if (!ctx) return;
    hiss.gain.setTargetAtTime(Math.min(0.14, v * 0.06 * this.sfxVolume), ctx.currentTime, 0.05);
  },

  setRoar(v: number) {
    if (!ctx) return;
    roar.gain.setTargetAtTime(Math.min(0.3, v * 0.2 * this.sfxVolume), ctx.currentTime, 0.08);
  },

  /** Sub-bass impulse when firing main thrusters or boost */
  thud(freq = 60, duration = 0.25, vol = 0.35) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(22, t + duration);
    env(g, t, vol * this.sfxVolume, 0.015, duration);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + duration + 0.05);
  },

  /** Clean telemetry chirp */
  beep(freq = 1100, duration = 0.06, vol = 0.14) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    env(g, t, vol * this.sfxVolume, 0.005, duration);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + duration + 0.02);
  },

  /** Bingo fuel warning siren */
  bingoWarning() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(740, t);
    o.frequency.setValueAtTime(580, t + 0.12);
    env(g, t, 0.12 * this.sfxVolume, 0.01, 0.22);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.25);
  },

  /** Soft robotic capture grapple lock */
  grappleLock() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Fluid servo sweep
    const s = ctx.createOscillator();
    const sg = ctx.createGain();
    s.type = "sine";
    s.frequency.setValueAtTime(260, t);
    s.frequency.exponentialRampToValueAtTime(620, t + 0.22);
    env(sg, t, 0.2 * this.sfxVolume, 0.02, 0.22);
    s.connect(sg).connect(master);
    s.start(t);
    s.stop(t + 0.26);

    // Deep hydraulic lock latch
    setTimeout(() => {
      if (!ctx) return;
      const t2 = ctx.currentTime;
      const cl = ctx.createOscillator();
      const cg = ctx.createGain();
      cl.type = "sine";
      cl.frequency.setValueAtTime(120, t2);
      cl.frequency.exponentialRampToValueAtTime(32, t2 + 0.16);
      env(cg, t2, 0.3, 0.008, 0.16);
      cl.connect(cg).connect(master);
      cl.start(t2);
      cl.stop(t2 + 0.2);
    }, 200);
  },

  /** Atmospheric Debris Disintegration explosion shockwave */
  disintegrationExplosion() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Deep sub detonation
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(85, t);
    o.frequency.exponentialRampToValueAtTime(18, t + 0.9);
    env(g, t, 0.5, 0.02, 0.9);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.95);

    // Atmospheric warm sweep
    const n = noiseSrc();
    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(600, t);
    flt.frequency.exponentialRampToValueAtTime(80, t + 1.2);
    const ng = ctx.createGain();
    env(ng, t, 0.35, 0.04, 1.2);
    n.connect(flt).connect(ng).connect(master);
    n.start(t);
    n.stop(t + 1.3);
  },

  /** Mothership Fast Recharge chime */
  rechargeHum(progress: number) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    const freq = 360 + progress * 520;
    o.frequency.setValueAtTime(freq, t);
    env(g, t, 0.09, 0.01, 0.07);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.08);
  },

  /** Mission Control Voice Callout */
  voice(text: string) {
    if (!this.voiceEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      u.volume = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const eng = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Daniel")),
      );
      if (eng) u.voice = eng;
      window.speechSynthesis.speak(u);
    } catch {
      // Audio fallback already provides beeps
    }
  },

  /**
   * Subtle Hans Zimmer (Interstellar) & Vangelis (Blade Runner 2049) Soundtrack
   * - Lush analog detuned CS-80 / organ pads in F minor / Db / Ab / Eb
   * - Gentle celestial bell motifs (Blade Runner "Tears in Rain" aesthetic)
   * - Pure deep sine sub-bass (no harsh sawtooth or buzz)
   */
  music(on: boolean) {
    if (!ctx) return;
    const context = ctx;
    if (musicGain) {
      musicGain.gain.setTargetAtTime(on ? 0.32 : 0, context.currentTime, 1.2);
      return;
    }
    if (!on) return;

    const bus = context.createGain();
    musicGain = bus;
    bus.gain.setValueAtTime(0, context.currentTime);
    bus.gain.setTargetAtTime(0.32, context.currentTime, 2.5);
    bus.connect(master);

    // Hans Zimmer / Interstellar & Blade Runner Harmonic Palette:
    // 1. F minor 9: [F2, C3, Ab3, C4, Eb4, G4] - Deep, emotional space
    // 2. Db major 7: [Db2, Ab2, F3, Ab3, C4, F4] - Expansive celestial wonder
    // 3. Ab major add9: [Ab1, Eb2, C3, G3, Bb3, Eb4] - Orbital grandeur
    // 4. Eb major / Bb: [Eb2, Bb2, G3, Bb3, Eb4, G4] - Iconic cinematic resolution
    const progressions = [
      {
        sub: 43.65, // F1
        pad: [87.31, 130.81, 207.65, 261.63, 311.13], // F2, C3, Ab3, C4, Eb4
        bell: 523.25, // C5 chime
      },
      {
        sub: 34.65, // Db1
        pad: [69.3, 138.59, 174.61, 207.65, 261.63], // Db2, Db3, F3, Ab3, C4
        bell: 466.16, // Bb4 chime
      },
      {
        sub: 51.91, // Ab1
        pad: [103.83, 155.56, 196.0, 233.08, 311.13], // Ab2, Eb3, G3, Bb3, Eb4
        bell: 415.3, // Ab4 chime
      },
      {
        sub: 38.89, // Eb1
        pad: [77.78, 116.54, 196.0, 233.08, 311.13], // Eb2, Bb2, G3, Bb3, Eb4
        bell: 392.0, // G4 chime
      },
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (!ctx || !musicGain) return;
      const prog = progressions[chordIdx % progressions.length];
      chordIdx++;
      const now = context.currentTime;
      const chordDuration = 9.5;

      // 1. Pure, warm sub-bass sine (F1 / Db1 / Ab1 / Eb1) - zero buzz, silky smooth
      const subOsc = context.createOscillator();
      const subGain = context.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(prog.sub, now);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.exponentialRampToValueAtTime(0.16, now + 3.0);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);
      subOsc.connect(subGain).connect(bus);
      subOsc.start(now);
      subOsc.stop(now + chordDuration + 0.1);
      musicNodes.add(subOsc);

      // 2. Lush CS-80 / Interstellar Organ Pad Voices
      prog.pad.forEach((freq, idx) => {
        // Dual-oscillator detuning for rich analog chorus
        for (const detune of [-4, 4]) {
          const osc = context.createOscillator();
          const voiceGain = context.createGain();

          // Soft triangle waveform filtered through warm 24dB low-pass
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.setValueAtTime(detune, now);

          const lpf = context.createBiquadFilter();
          lpf.type = "lowpass";
          // Gentle filter sweep from 380Hz to 680Hz
          lpf.frequency.setValueAtTime(360, now);
          lpf.frequency.exponentialRampToValueAtTime(640, now + 4.0);
          lpf.frequency.exponentialRampToValueAtTime(380, now + chordDuration);
          lpf.Q.value = 1.1;

          const level = 0.038 / (idx * 0.4 + 1);
          voiceGain.gain.setValueAtTime(0.0001, now);
          voiceGain.gain.exponentialRampToValueAtTime(level, now + 3.2);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + chordDuration);

          osc.connect(lpf).connect(voiceGain).connect(bus);
          osc.start(now);
          osc.stop(now + chordDuration + 0.1);
          musicNodes.add(osc);
        }
      });

      // 3. Subtle Blade Runner "Tears in Rain" Celestial Chime (Soft upper bell)
      setTimeout(() => {
        if (!ctx || !musicGain) return;
        const chimeNow = context.currentTime;
        const chimeOsc = context.createOscillator();
        const chimeGain = context.createGain();
        chimeOsc.type = "sine";
        chimeOsc.frequency.setValueAtTime(prog.bell, chimeNow);

        const bellFilter = context.createBiquadFilter();
        bellFilter.type = "lowpass";
        bellFilter.frequency.setValueAtTime(1400, chimeNow);

        chimeGain.gain.setValueAtTime(0.0001, chimeNow);
        chimeGain.gain.exponentialRampToValueAtTime(0.022, chimeNow + 0.4);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeNow + 4.5);

        chimeOsc.connect(bellFilter).connect(chimeGain).connect(bus);
        chimeOsc.start(chimeNow);
        chimeOsc.stop(chimeNow + 4.8);
        musicNodes.add(chimeOsc);
      }, 2200);
    };

    playChord();
    musicTimer = setInterval(playChord, 8500);
  },

  stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    if (musicGain && ctx) {
      musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    }
    musicNodes.forEach((n) => {
      try {
        if ("stop" in n && typeof (n as OscillatorNode).stop === "function") {
          (n as OscillatorNode).stop();
        }
      } catch {
        // Ignored
      }
    });
    musicNodes.clear();
  },
};
