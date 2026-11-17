import { seededRandom } from '../world/math';
import { depthScale, floorAt, SAND_BACK_Y, SAND_DEPTH, TANK_HEIGHT } from '../world/geometry';
import type { Palette } from '../world/daylight';
import type { Tank } from '../world/types';
import { css, mix, shade, type RGB } from './color';
import { driftwood, DRIFTWOOD_Z, paintDriftwood, paintRock } from './hardscape';

/**
 * The still parts of the aquarium, painted once into offscreen canvases and copied each frame.
 * Repainted only when the window changes shape or the light changes colour.
 */

const context = (canvas: HTMLCanvasElement, scale: number): CanvasRenderingContext2D => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
};

export const waterColor = (pal: Palette): RGB => mix(pal.waterTop, pal.waterDeep, 0.5);

/** The back layer: open water, distant blurred stone, and the sand bed. */
export function paintWaterLayer(canvas: HTMLCanvasElement, tank: Tank, pal: Palette, scale: number): void {
  const ctx = context(canvas, scale);
  const W = tank.width;
  const rnd = seededRandom(tank.layoutSeed);

  const water = ctx.createLinearGradient(0, 0, 0, TANK_HEIGHT);
  water.addColorStop(0, css(mix(pal.waterTop, pal.rays, 0.12)));
  water.addColorStop(0.45, css(mix(pal.waterTop, pal.waterDeep, 0.45)));
  water.addColorStop(0.85, css(pal.waterDeep));
  water.addColorStop(1, css(shade(pal.waterDeep, 0.8)));
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, W, TANK_HEIGHT);

  // The lamp above the tank: a broad soft glow through the top of the water.
  const glow = ctx.createRadialGradient(W * 0.5, -260, 50, W * 0.5, -260, Math.max(W * 0.6, 900));
  glow.addColorStop(0, css(pal.rays, 0.34 * pal.light));
  glow.addColorStop(1, css(pal.rays, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, TANK_HEIGHT);

  ctx.filter = `blur(${(3 * scale).toFixed(1)}px)`;
  paintDistantStone(ctx, W, pal, rnd);
  ctx.filter = 'none';
  paintSand(ctx, W, pal, rnd);
}

/** The front layer of still things: rocks and driftwood, with their shadows. Transparent elsewhere. */
export function paintHardscapeLayer(canvas: HTMLCanvasElement, tank: Tank, pal: Palette, scale: number): void {
  const ctx = context(canvas, scale);
  const water = waterColor(pal);
  const rocks = [...tank.rocks].sort((a, b) => a.z - b.z);
  for (const r of rocks) if (r.z < DRIFTWOOD_Z) paintRock(ctx, r, water, pal.sand);
  paintDriftwood(ctx, driftwood(tank), water);
  for (const r of rocks) if (r.z >= DRIFTWOOD_Z) paintRock(ctx, r, water, pal.sand);
}

function paintDistantStone(ctx: CanvasRenderingContext2D, W: number, pal: Palette, rnd: () => number): void {
  for (let layer = 0; layer < 2; layer++) {
    const base = SAND_BACK_Y + 30;
    ctx.fillStyle = css(mix(pal.waterTop, pal.waterDeep, 0.5 + layer * 0.18), 0.5);
    ctx.beginPath();
    ctx.moveTo(0, base);
    const peaks = 5 + Math.floor(rnd() * 3);
    for (let i = 0; i <= peaks; i++) {
      const x = (i / peaks) * W;
      ctx.lineTo(x - W / peaks / 2 + rnd() * 40, base - 180 - rnd() * (220 - layer * 90));
      ctx.lineTo(x, base - 60 - rnd() * 60);
    }
    ctx.lineTo(W, base);
    ctx.closePath();
    ctx.fill();
  }
}

function paintSand(ctx: CanvasRenderingContext2D, W: number, pal: Palette, rnd: () => number): void {
  const deep = pal.waterDeep;
  const sand = ctx.createLinearGradient(0, SAND_BACK_Y - 15, 0, TANK_HEIGHT);
  sand.addColorStop(0, css(mix(pal.sand, deep, 0.55)));
  sand.addColorStop(0.3, css(mix(pal.sand, deep, 0.28)));
  sand.addColorStop(0.75, css(mix(pal.sand, deep, 0.08)));
  sand.addColorStop(1, css(shade(pal.sand, 0.86)));
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, TANK_HEIGHT);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, floorAt(x, 0));
  ctx.lineTo(W, floorAt(W, 0));
  ctx.lineTo(W, TANK_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Shade where the sand meets the planted background.
  const edge = ctx.createLinearGradient(0, SAND_BACK_Y - 15, 0, SAND_BACK_Y + 40);
  edge.addColorStop(0, css(shade(deep, 0.6), 0.55));
  edge.addColorStop(1, css(shade(deep, 0.6), 0));
  ctx.fillStyle = edge;
  ctx.fillRect(0, SAND_BACK_Y - 20, W, 70);

  const depthAt = (x: number): number => TANK_HEIGHT - floorAt(x, 0);
  // Fine grains: thousands of one-unit specks in light and dark.
  for (let i = 0; i < W * 5; i++) {
    const x = rnd() * W;
    const z = rnd();
    const y = floorAt(x, 0) + z * depthAt(x);
    const light = rnd() > 0.55;
    const c: RGB = light ? mix(pal.sand, [255, 250, 236], 0.4) : shade(pal.sand, 0.55);
    ctx.fillStyle = css(mix(c, deep, (1 - z) * 0.45), 0.35 + z * 0.3);
    const size = 0.6 + z * 1.4;
    ctx.fillRect(x, y, size, size * 0.8);
  }
  // Gravel and small pebbles, larger toward the glass.
  for (let i = 0; i < W / 9; i++) {
    const x = rnd() * W;
    const z = 0.25 + rnd() * 0.75;
    const y = floorAt(x, z * (depthAt(x) / SAND_DEPTH));
    const r = (1.5 + rnd() * 4.5) * depthScale(z);
    const tone: RGB = mix([140, 128, 112], pal.sand, rnd() * 0.6);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    g.addColorStop(0, css(mix(mix(tone, [255, 255, 255], 0.35), deep, (1 - z) * 0.4)));
    g.addColorStop(1, css(mix(shade(tone, 0.5), deep, (1 - z) * 0.4)));
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.2, y + r * 0.35, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, rnd() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Darkened edges, painted once at low resolution (a smooth gradient loses nothing when stretched). */
export function paintVignette(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const g = ctx.createRadialGradient(width / 2, height * 0.42, Math.min(width, height) * 0.3, width / 2, height / 2, Math.hypot(width, height) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,6,14,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}
