import { hash, ramp } from '../noise';
import { wrap } from './chapters';

const LIGHTNING_PERIOD = 8;
const LIGHTNING_SECONDS = 0.4;
const RAIN_STREAKS = 56;
const RIBBON_COLORS = ['#7dbdae', '#a6bbbf', '#c0cfb3'];
const STORM_RAMP_END = 1 / 3;
const CLEARING_START = 0.75;

export function stormStrength(weight: number, chapter: number, progress: number): number {
  // The approaching front begins in migration and opens only in the final quarter.
  if (chapter !== 3) return weight * 0.25;
  return (0.25 + 0.75 * ramp(0, STORM_RAMP_END, progress)) * (1 - ramp(CLEARING_START, 1, progress));
}

export function stormClearing(chapter: number, progress: number): number {
  return chapter === 3 ? ramp(CLEARING_START, 1, progress) : 0;
}

export function stormVeil(ctx: CanvasRenderingContext2D, width: number, height: number,
  strength: number, day: number, clearing: number): void {
  if (strength < 0.005) return;
  ctx.save();
  const slate = `rgb(${Math.round(10 + day * 61)},${Math.round(13 + day * 62)},${Math.round(26 + day * 73)})`;
  // A rounded opening grows from the upper right during the final quarter.
  for (let x = 0; x < width; x += 4) {
    const distance = (x - width * 0.82) / Math.max(1, width * 0.6);
    const opening = Math.round(height * clearing * Math.sqrt(Math.max(0, 1 - distance * distance)));
    ctx.globalAlpha = strength;
    ctx.fillStyle = slate;
    ctx.fillRect(x, opening, 4, Math.max(0, height - opening));
    ctx.fillStyle = '#090d21';
    ctx.globalAlpha = strength * 0.3;
    ctx.fillRect(x, opening, 4, Math.max(0, Math.round(height * 0.24) - opening));
    ctx.globalAlpha = strength * 0.15;
    const middle = Math.max(opening, Math.round(height * 0.24));
    ctx.fillRect(x, middle, 4, Math.max(0, Math.round(height * 0.38) - middle));
  }
  ctx.restore();
}

export function stormClouds(ctx: CanvasRenderingContext2D, width: number, time: number,
  scroll: number, strength: number, lift: number, clearing: number): void {
  if (strength < 0.005) return;
  ctx.save();
  const phase = wrap(time, LIGHTNING_PERIOD);
  const lightning = phase < LIGHTNING_SECONDS ? Math.sin(phase / LIGHTNING_SECONDS * Math.PI) : 0;
  ctx.globalAlpha = strength;
  ctx.fillStyle = '#30364e';
  // The wall towers on the right; broad, quiet tones remain behind the clock.
  for (let x = 0; x < width; x += 3) {
    const ahead = ramp(width * 0.48, width * 0.9, x);
    const clump = Math.sqrt(Math.max(0, 1 - Math.pow((wrap(x + scroll * 0.08, 74) - 37) / 37, 2)));
    const y = Math.round(175 - ahead * 119 - clump * 19 + lift + clearing * 240);
    ctx.fillRect(x, y, 3, Math.max(0, 271 - y));
    if (lightning > 0 && x > width * 0.63) {
      ctx.globalAlpha = strength * lightning * 0.26;
      ctx.fillStyle = '#bfb4db';
      ctx.fillRect(x, y + 1, 3, 3);
      ctx.globalAlpha = strength;
      ctx.fillStyle = '#30364e';
    }
  }
  if (lightning > 0) {
    const cx = width * 0.83;
    ctx.fillStyle = '#c8bce3';
    for (let band = 3; band > 0; band--) {
      ctx.globalAlpha = strength * lightning * 0.045;
      for (let dy = -18 * band; dy <= 18 * band; dy += 3) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow(dy / (18 * band), 2))) * 20 * band);
        ctx.fillRect(Math.round(cx - half), Math.round(116 + dy + lift), half * 2, 3);
      }
    }
  }
  ctx.globalAlpha = strength * 0.36;
  ctx.fillStyle = '#bacbd0';
  for (let i = 0; i < RAIN_STREAKS; i++) {
    const x = wrap(hash(i + 50) * width - time * 42, width + 20) - 10;
    const y = wrap(hash(i + 70) * 240 + time * 30, 240) + 20;
    for (let r = 0; r < 5; r++) ctx.fillRect(Math.round(x - r), Math.round(y + r / 2), 1, 1);
  }
  ctx.restore();
}

export function ribbons(ctx: CanvasRenderingContext2D, width: number, time: number, presence: number, night: number): void {
  if (presence < 0.01) return;
  ctx.save();
  ctx.globalAlpha = presence * (0.035 + night * 0.2);
  for (let ribbon = 0; ribbon < RIBBON_COLORS.length; ribbon++) {
    ctx.fillStyle = RIBBON_COLORS[ribbon];
    for (let x = 0; x < width; x += 2) {
      const y = Math.round(28 + ribbon * 10 + Math.sin(x * 0.014 + time * 0.05 + ribbon) * 10);
      ctx.fillRect(x, y, 2, 2 + Math.round((Math.sin(x * 0.03 + time * 0.1) + 1) * 4));
      if (x % 4 === 0) ctx.fillRect(x, y + 9, 1, 3);
    }
  }
  ctx.restore();
}

export function sunRays(ctx: CanvasRenderingContext2D, width: number, sunX: number, sunY: number,
  sunUp: number, day: number, presence: number): void {
  if (presence < 0.005 || day < 0.01 || sunUp < -0.05) return;
  ctx.save();
  ctx.globalAlpha = day * presence * 0.09;
  ctx.fillStyle = '#ffe2ac';
  const cx = sunX * width;
  const cy = sunY * 270;
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(angle) * 24), Math.round(cy + Math.sin(angle) * 24), 1, 1);
  }
  for (let ray = 0; ray < 8; ray++) {
    const angle = ray / 8 * Math.PI * 2;
    for (let distance = 30; distance < 43; distance += 2) {
      ctx.fillRect(Math.round(cx + Math.cos(angle) * distance), Math.round(cy + Math.sin(angle) * distance), 1, 1);
    }
  }
  ctx.restore();
}

export function gondola(ctx: CanvasRenderingContext2D, width: number, time: number, storm: number): void {
  const rock = Math.round(Math.sin(time * 0.65) * storm * 2);
  ctx.fillStyle = '#394c53';
  ctx.fillRect(0, 259 + rock, width, 3);
  ctx.fillStyle = '#ae9778';
  ctx.fillRect(0, 258 + rock, width, 1);
  ctx.fillStyle = '#60564c';
  for (let x = 19; x < width; x += 91) {
    ctx.fillRect(x, 262 + rock, 3, 8);
    ctx.fillStyle = '#84725d';
    ctx.fillRect(x, 262 + rock, 1, 8);
    ctx.fillStyle = '#60564c';
  }
  // Ropes hang only at the corners and stop well above the clock.
  ctx.fillStyle = '#8a7c68';
  for (let y = 0; y < 42; y++) {
    const lean = Math.round(y * 0.09 + rock * y / 42);
    ctx.fillRect(14 + lean, y, 2, 1);
    ctx.fillRect(Math.round(width - 16 - lean), y, 2, 1);
  }
  ctx.fillStyle = '#c5b18b';
  ctx.fillRect(13, 3, 4, 2);
  ctx.fillRect(Math.round(width - 17), 3, 4, 2);
}
