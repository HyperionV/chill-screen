import type { RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import type { NightSky } from '../../night-sky';
import { SkyDome, disc } from '../../sky';
import type { Look } from '../../../wallpapers/look';
import { noise, ramp } from '../noise';
import { wrap } from './route';

const EVENING: RGB = [32, 35, 52];
const MIDNIGHT: RGB = [18, 25, 39];
const DAWN: RGB = [130, 123, 133];
const HORIZON = 0.7;
const WRAP_SECONDS = 20;

const blend = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const color = (rgb: RGB): string => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

/** Low cloud covers every open sky cell: only a dull moon glow reaches the street. */
export class BusSky {
  private readonly dome: SkyDome;
  private previous = 0;
  private wrapFade = 0;
  private top: RGB = EVENING;
  private bottom: RGB = EVENING;
  private backdrop: ReturnType<typeof memoryCanvas> | null = null;
  private backdropKey = '';
  dawn = 0;
  readonly look: Look = { mean: 0.15, sun: null, sky: [], night: 1, tint: [45, 45, 60] };

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
    // Overcast leaves no holes for the application's room stars.
    this.look.sky.length = 0;
  }

  resize(w: number): void {
    this.dome.resize(w, 270);
    this.backdrop = memoryCanvas(w, 270);
    this.backdropKey = '';
  }

  update(progress: number, dt: number): void {
    if (this.previous > 0.9 && progress < 0.1) this.wrapFade = 1;
    this.previous = progress;
    this.wrapFade = Math.max(0, this.wrapFade - dt / WRAP_SECONDS);
    const hour = wrap(21 + progress * 8.75, 24);
    const state = this.dome.stateAt(hour);
    this.dawn = Math.max(ramp(0.79, 1, progress), this.wrapFade);
    const night = blend(EVENING, MIDNIGHT, Math.max(ramp(0, 0.45, progress), this.wrapFade));
    this.top = blend(night, DAWN, this.dawn * 0.62);
    this.bottom = blend(night, [174, 144, 145], this.dawn);
    const tint = blend(this.top, this.bottom, 0.6);
    this.look.mean = (tint[0] * 0.2126 + tint[1] * 0.7152 + tint[2] * 0.0722) / 255 * 0.8 + 0.035;
    this.look.night = 1 - this.dawn * 0.47;
    this.look.tint = blend(tint, [88, 76, 87], 0.18);
    this.look.sun = state.moon.up > 0 && this.dawn < 0.8
      ? { u: 0.79, v: 51 / 270, strength: 0.025 * (1 - this.dawn), color: [137, 151, 174] }
      : null;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, time: number): void {
    const backdrop = this.backdrop;
    if (backdrop) {
      const key = `${this.top.join(',')}/${this.bottom.join(',')}`;
      if (key !== this.backdropKey) {
        this.backdropKey = key;
        const sky = backdrop.ctx;
        // Ordered bands and alternate pixels replace a smooth canvas gradient.
        for (let y = 0; y < 270; y += 3) {
          const t = Math.min(1, y / 190);
          sky.fillStyle = color(blend(this.top, this.bottom, Math.floor(t * 12) / 12));
          sky.fillRect(0, y, w, 3);
          sky.fillStyle = color(blend(this.top, this.bottom, Math.min(1, (Math.floor(t * 12) + 1) / 12)));
          for (let x = (Math.floor(y / 3) % 2) * 2; x < w; x += 4) sky.fillRect(x, y + 2, 1, 1);
        }
      }
      ctx.drawImage(backdrop.canvas, 0, 0);
    }
    if (this.dawn < 0.85) {
      ctx.fillStyle = 'rgba(144,152,174,0.045)';
      disc(ctx, Math.round(w * 0.79), 51, 23);
      ctx.fillStyle = 'rgba(165,173,188,0.035)';
      disc(ctx, Math.round(w * 0.79), 51, 13);
    }
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = color(blend(this.top, [83, 84, 99], 0.07 + layer * 0.06));
      for (let x = 0; x < w; x += 3) {
        const top = Math.round(20 + layer * 29 + noise(x * 0.009 + time * (0.005 + layer * 0.002) + layer * 17) * 20);
        ctx.fillRect(x, top, 3, 9 + layer * 2);
      }
    }
  }
}
