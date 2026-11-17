import type { Pace } from '../room/journey/pace';
import type { SceneKind } from '../scene/scene-switch';

/** What the soundscape should follow: the scene on screen, how hard it rains, the pace, and the chosen loudness (0 to 1). */
export interface Mix {
  scene: SceneKind;
  rain: number;
  pace: Pace;
  volume: number;
}

const NOISE_SECONDS = 6;
/** How long a level takes to settle when the scene or the rain changes, so nothing ever jumps. */
const SETTLE_SECONDS = 0.8;
const EVENT_EVERY_MS = 700;
const DAY_FROM_HOUR = 6;
const DAY_TO_HOUR = 19;
const MASTER_SCALE = 1.2;

/** How much wind the journey makes at each pace; the other scenes have a steady breeze. */
const PACE_WIND: Record<Pace, number> = { still: 0.25, slow: 0.4, gentle: 0.6, brisk: 1 };
const BREEZE: Record<SceneKind, number> = { journey: 1, seaside: 0.5, wallpapers: 0.35, aquarium: 0 };

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
const isDaytime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= DAY_FROM_HOUR && hour < DAY_TO_HOUR;
};

/**
 * Soft background sound made on the spot, with no sound files: rain that thickens as it pours, wind that follows the
 * pace of the journey, waves on the seaside, a low hum and bubbles in the aquarium, birds by day and crickets at night.
 * Browsers only allow sound after the person has clicked or pressed a key once, so it starts then.
 */
export class Ambience {
  private mix: Mix = { scene: 'journey', rain: 0, pace: 'gentle', volume: 0 };
  private unlocked = false;
  private ac: AudioContext | null = null;
  private master!: GainNode;
  private rainHiss!: GainNode;
  private rainBrightness!: BiquadFilterNode;
  private rainRumble!: GainNode;
  private wind!: GainNode;
  private waves!: GainNode;
  private water!: GainNode;
  private crickets!: GainNode;
  private eventTimer = 0;

  constructor() {
    const unlock = (): void => {
      this.unlocked = true;
      this.sync();
    };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });
  }

  set(mix: Mix): void {
    this.mix = mix;
    this.sync();
  }

  private sync(): void {
    if (!this.unlocked) return;
    if (this.mix.volume <= 0) {
      if (this.ac?.state === 'running') void this.ac.suspend();
      window.clearInterval(this.eventTimer);
      return;
    }
    if (!this.ac) this.build();
    void this.ac?.resume();
    window.clearInterval(this.eventTimer);
    this.eventTimer = window.setInterval(() => this.occasionalSounds(), EVENT_EVERY_MS);
    this.apply();
  }

  private apply(): void {
    const { scene, rain, pace, volume } = this.mix;
    const outside = scene !== 'aquarium';
    const night = !isDaytime();
    const wind = BREEZE[scene] * (scene === 'journey' ? PACE_WIND[pace] : 0.6);
    this.settle(this.master.gain, volume ** 1.5 * MASTER_SCALE);
    this.settle(this.rainHiss.gain, outside && rain > 0 ? 0.08 + 0.5 * rain : 0);
    this.settle(this.rainBrightness.frequency, 3200 + 4800 * rain);
    this.settle(this.rainRumble.gain, outside ? rain * rain * 0.3 : 0);
    this.settle(this.wind.gain, wind * 0.22);
    this.settle(this.waves.gain, scene === 'seaside' ? 0.3 : 0);
    this.settle(this.water.gain, scene === 'aquarium' ? 0.2 : 0);
    this.settle(this.crickets.gain, outside && scene !== 'wallpapers' && night ? 0.012 * (1 - rain) : 0);
  }

  private settle(param: AudioParam, value: number): void {
    param.setTargetAtTime(value, (this.ac as AudioContext).currentTime, SETTLE_SECONDS / 3);
  }

  private build(): void {
    const ac = new AudioContext();
    this.ac = ac;
    this.master = ac.createGain();
    this.master.gain.value = 0;
    this.master.connect(ac.destination);

    const white = this.noise(ac, false);
    const brown = this.noise(ac, true);
    const source = (buffer: AudioBuffer): AudioBufferSourceNode => {
      const node = ac.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      node.start();
      return node;
    };
    const filter = (type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode => {
      const node = ac.createBiquadFilter();
      node.type = type;
      node.frequency.value = frequency;
      node.Q.value = q;
      return node;
    };
    const gain = (value = 0): GainNode => {
      const node = ac.createGain();
      node.gain.value = value;
      return node;
    };
    /** A slow wobble added to a level, so wind gusts and waves swell. */
    const swell = (target: AudioParam, hertz: number, depth: number): void => {
      const lfo = ac.createOscillator();
      const amount = gain(depth);
      lfo.frequency.value = hertz;
      lfo.connect(amount).connect(target);
      lfo.start();
    };

    this.rainHiss = gain();
    this.rainBrightness = filter('lowpass', 4000);
    source(white).connect(filter('highpass', 500)).connect(this.rainBrightness).connect(this.rainHiss).connect(this.master);
    this.rainRumble = gain();
    source(brown).connect(filter('lowpass', 420)).connect(this.rainRumble).connect(this.master);

    this.wind = gain();
    source(brown).connect(filter('bandpass', 520, 0.5)).connect(this.wind).connect(this.master);
    swell(this.wind.gain, 0.07, 0.06);

    this.waves = gain();
    source(brown).connect(filter('lowpass', 1100)).connect(this.waves).connect(this.master);
    swell(this.waves.gain, 0.11, 0.22);

    this.water = gain();
    source(brown).connect(filter('lowpass', 240)).connect(this.water).connect(this.master);

    // Crickets: a high tone switched on and off many times a second.
    this.crickets = gain();
    const tone = ac.createOscillator();
    const pulse = gain(0.5);
    tone.frequency.value = 4600;
    tone.connect(pulse).connect(this.crickets).connect(this.master);
    swell(pulse.gain, 13, 0.5);
    tone.start();
  }

  /** Looping noise; brown noise is the deep, soft kind used for wind, waves and rumble. */
  private noise(ac: AudioContext, brown: boolean): AudioBuffer {
    const buffer = ac.createBuffer(1, ac.sampleRate * NOISE_SECONDS, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = brown ? (last + 0.02 * white) / 1.02 : white;
      data[i] = brown ? last * 3.5 : white * 0.5;
    }
    return buffer;
  }

  private occasionalSounds(): void {
    const { scene, rain } = this.mix;
    if (scene === 'aquarium' && Math.random() < 0.25) this.bubble();
    if (scene === 'journey' && isDaytime() && Math.random() < 0.3 * (1 - rain)) this.birdsong();
  }

  private bubble(): void {
    const ac = this.ac as AudioContext;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const level = ac.createGain();
    osc.frequency.setValueAtTime(rand(280, 420), t);
    osc.frequency.exponentialRampToValueAtTime(rand(700, 1100), t + 0.07);
    level.gain.setValueAtTime(0, t);
    level.gain.linearRampToValueAtTime(0.05, t + 0.01);
    level.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(level).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** A few short chirps in a row. */
  private birdsong(): void {
    const ac = this.ac as AudioContext;
    const start = ac.currentTime;
    const pitch = rand(2200, 3800);
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = start + i * 0.15;
      const osc = ac.createOscillator();
      const level = ac.createGain();
      osc.frequency.setValueAtTime(pitch, t);
      osc.frequency.exponentialRampToValueAtTime(pitch * rand(1.3, 1.7), t + 0.09);
      level.gain.setValueAtTime(0, t);
      level.gain.linearRampToValueAtTime(0.05, t + 0.02);
      level.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(level).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.14);
    }
  }
}
