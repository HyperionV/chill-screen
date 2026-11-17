import { hash } from '../noise';
import { sprite, type Sprites } from './sprites';

const SNOW_COUNT = 110;
const PASS_SECONDS = 3.6; // A finite train clears even a wide window within four seconds.
const PASS_PROGRESS = 0.28; // One scheduled encounter per chapter, away from preview midpoints.
const CARRIAGE_COUNT = 3;
const CARRIAGE_WIDTH = 66;
const CARRIAGE_GAP = 5;
const TRAIN_TOP = 163;
const TRAIN_HEIGHT = 34; // The train stays above the radio and leaves the mountains visible.
export const LAMP_X = 12;
export const LAMP_Y = 103;
export const LAMP_WIDTH = 10;
export const LAMP_HEIGHT = 16;

export class Atmosphere {
  private chapter = -1;
  private passed = false;
  private previousProgress = 0;
  private passAge = PASS_SECONDS;
  private lampBrightness = 0;

  get pressure(): number {
    return this.passAge < 0.24 ? 1 : 0;
  }

  update(dt: number, lamp: boolean, chapter: number, progress: number): void {
    if (chapter !== this.chapter) {
      this.chapter = chapter;
      this.passed = progress >= PASS_PROGRESS;
      this.previousProgress = progress;
      this.passAge = PASS_SECONDS;
    }
    const target = lamp ? 1 : 0;
    this.lampBrightness += (target - this.lampBrightness) * Math.min(1, dt * 14);
    this.passAge += dt;
    if (!this.passed && this.previousProgress < PASS_PROGRESS && progress >= PASS_PROGRESS) {
      this.passAge = 0;
      this.passed = true;
    }
    this.previousProgress = progress;
  }

  aurora(ctx: CanvasRenderingContext2D, width: number, time: number, amount: number): void {
    if (amount < 0.01) return;
    ctx.save();
    for (let ribbon = 0; ribbon < 2; ribbon++) {
      for (let x = 0; x < width; x += 2) {
        const y = Math.round(26 + ribbon * 23 + Math.sin(x * 0.014 + time * 0.035 + ribbon * 2) * 11 + Math.sin(x * 0.033 + time * 0.018) * 4);
        ctx.globalAlpha = amount * (ribbon === 0 ? 0.6 : 0.42);
        ctx.fillStyle = ribbon === 0 ? '#9be6bd' : '#80cbd0';
        ctx.fillRect(x, y, 2, 2);
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(x, y - 5, 2, 5);
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(x, y - 12, 2, 7);
        if (x % 4 === 0) ctx.fillRect(x, y - 20, 1, 8);
      }
    }
    ctx.restore();
  }

  snow(ctx: CanvasRenderingContext2D, width: number, time: number, cold: number, tunnel: number): void {
    ctx.save();
    ctx.globalAlpha = (1 - tunnel) * 0.7;
    ctx.fillStyle = '#dce5e9';
    const count = Math.round(28 + cold * (SNOW_COUNT - 28));
    for (let i = 0; i < count; i++) {
      const near = i % 3 === 0;
      const speed = near ? 19 : 8;
      const x = Math.round(((hash(i + 14) * width + time * (near ? 6 : 2) + Math.sin(time * 0.3 + i) * 4) % width + width) % width);
      const y = Math.round((hash(i + 130) * 290 + time * speed) % 290 - 10);
      // Sparse flakes in front of the clock preserve its quiet background.
      if (y > 78 && y < 153 && i % 5 !== 0) continue;
      ctx.fillRect(x, y, 1, near ? 2 : 1);
    }
    ctx.restore();
  }

  mist(ctx: CanvasRenderingContext2D, width: number, time: number, amount: number): void {
    if (amount <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = amount * 0.2;
    ctx.fillStyle = '#d8ded9';
    for (let i = 0; i < 6; i++) {
      const x = Math.round(((i * 93 + time * 0.8) % (width + 140)) - 100);
      ctx.fillRect(x, 177 + i * 5, 110, 3);
      ctx.fillRect(x + 19, 175 + i * 5, 72, 2);
    }
    ctx.restore();
  }

  whistleSteam(ctx: CanvasRenderingContext2D, x: number, y: number, progress: number, art: Sprites): void {
    ctx.save();
    for (let puff = 0; puff < 3; puff++) {
      const age = Math.min(1, Math.max(0, (progress - puff * 0.09) / (1 - puff * 0.09)));
      const radius = 4 + Math.round(age * 8);
      const px = Math.round(x - puff * 5 - age * (30 + puff * 7));
      const py = Math.round(y - 6 - puff * 3 - age * (26 + puff * 7));
      ctx.globalAlpha = (1 - age) * 0.85;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art.steam, px - radius, py - radius, radius * 2 + 1, radius * 2 + 1);
      ctx.fillStyle = '#d2e0e6';
      ctx.fillRect(px - radius + 2, py + Math.round(radius / 2), radius, 2);
    }
    ctx.restore();
  }

  passingTrain(ctx: CanvasRenderingContext2D, width: number, time: number): void {
    if (this.passAge >= PASS_SECONDS) return;
    ctx.save();
    const length = CARRIAGE_COUNT * (CARRIAGE_WIDTH + CARRIAGE_GAP);
    const lead = width - this.passAge / PASS_SECONDS * (width + length);
    for (let carriage = 0; carriage < CARRIAGE_COUNT; carriage++) {
      const x = Math.round(lead + carriage * (CARRIAGE_WIDTH + CARRIAGE_GAP));
      if (x > width || x + CARRIAGE_WIDTH < 0) continue;
      ctx.fillStyle = '#202e3b';
      ctx.fillRect(x, TRAIN_TOP, CARRIAGE_WIDTH, TRAIN_HEIGHT);
      ctx.fillStyle = '#627383';
      ctx.fillRect(x + 2, TRAIN_TOP, CARRIAGE_WIDTH - 4, 1);
      ctx.fillStyle = '#a28a69';
      ctx.fillRect(x, TRAIN_TOP + 26, CARRIAGE_WIDTH, 1);
      for (let window = 0; window < 4; window++) {
        const wx = x + 6 + window * 14;
        ctx.fillStyle = '#b79e73';
        ctx.fillRect(wx, TRAIN_TOP + 7, 10, 14);
        ctx.fillStyle = '#d4bb8b';
        ctx.fillRect(wx, TRAIN_TOP + 7, 10, 2);
        ctx.fillStyle = '#4d514f';
        const head = Math.round(Math.sin(time * 0.4 + window + carriage));
        ctx.fillRect(wx + 4, TRAIN_TOP + 12 + head, 3, 3);
        ctx.fillRect(wx + 2, TRAIN_TOP + 15 + head, 6, 6);
      }
      ctx.fillStyle = '#131f2b';
      ctx.fillRect(x + 9, TRAIN_TOP + 31, 9, 3);
      ctx.fillRect(x + 48, TRAIN_TOP + 31, 9, 3);
      if (carriage < CARRIAGE_COUNT - 1) ctx.fillRect(x + CARRIAGE_WIDTH, TRAIN_TOP + 28, CARRIAGE_GAP, 2);
    }
    ctx.restore();
  }

  reflection(ctx: CanvasRenderingContext2D, width: number, tunnel: number, art: Sprites, chosenLamp: boolean): void {
    const light = this.lampBrightness;
    ctx.save();
    ctx.fillStyle = '#100f18';
    ctx.globalAlpha = light * 0.15 * (1 - tunnel);
    ctx.fillRect(0, 0, width, 270);
    ctx.globalAlpha = Math.max(tunnel * 0.66, light * 0.13);
    ctx.fillStyle = '#8e7253';
    ctx.fillRect(width - 147, 238, 147, 3);
    ctx.fillStyle = '#594b43';
    ctx.fillRect(width - 145, 241, 145, 20);
    sprite(ctx, art.cup, width - 76, 237, 1.7);
    ctx.restore();
    // The brass reading lamp is fixed to the compartment, outside the moving country.
    const x = LAMP_X;
    const y = LAMP_Y;
    if (light > 0.01) {
      ctx.save();
      ctx.globalAlpha = light * 0.16;
      ctx.drawImage(art.lampGlow, x - 13, y - 9);
      ctx.restore();
    }
    ctx.fillStyle = '#5d503f';
    ctx.fillRect(x + 4, y, 2, LAMP_HEIGHT);
    ctx.fillRect(x + 1, y + 14, 8, 2);
    ctx.fillStyle = '#a9925f';
    ctx.fillRect(x + 2, y + 2, 6, 6);
    ctx.fillRect(x, y + 7, LAMP_WIDTH, 3);
    ctx.fillStyle = '#cfb681';
    ctx.fillRect(x + 2, y + 2, 1, 5);
    ctx.fillStyle = light > 0.5 ? '#ffe2aa' : '#756447';
    ctx.fillRect(x + 1, y + 10, 8, 2);
    ctx.fillStyle = chosenLamp ? '#f5d7a0' : '#756447';
    ctx.fillRect(x + 8, y + 13, 2, 2);
  }
}

