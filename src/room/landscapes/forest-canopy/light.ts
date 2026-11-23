/**
 * Sunlight in the Forest Canopy: dithered shafts that fall from the opening in the leaves, two sets that swap
 * slowly so the beams shimmer, warm patches where the light reaches the trunks, glints on sunlit leaves and
 * drifting specks in the beams. The shaft pictures are built once; each frame only blits and a few short loops.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, drawHalo, seeded } from '../../gravity-falls/art-kit';
import { breeze } from '../../wind';
import { DESIGN_HEIGHT, GAP_HALF_H, GAP_HALF_W, GAP_ROW, SUN_ROW, inClockBand, perspective, type Perspective } from './layout';

/** Angles of the shafts, measured from straight down (radians): more to the left, where there is more page. */
const RAY_FROM = -0.95;
const RAY_TO = 0.42;
const RAYS_PER_SET = 9;
const RAY_MIN_HALF = 0.018;
const RAY_MAX_HALF = 0.05;
/** How far a shaft reaches, in page heights, before it has faded out. */
const RAY_REACH = 1.25;
/** Light is dithered into two strengths: a bright core and a faint edge, as pixel alpha. */
const CORE_ALPHA = 215;
const EDGE_ALPHA = 125;
const CORE_LEVEL = 0.62;
const SHIMMER_SPEED = 0.23;
const BEAM_SWAY = 1.4;

function buildRays(width: number, sunX: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_HEIGHT);
  const rand = seeded(seed);
  const rays = Array.from({ length: RAYS_PER_SET }, (_, i) => ({
    angle: RAY_FROM + ((i + rand() * 0.8) / RAYS_PER_SET) * (RAY_TO - RAY_FROM),
    half: RAY_MIN_HALF + rand() * (RAY_MAX_HALF - RAY_MIN_HALF),
    power: 0.55 + rand() * 0.45,
    wobble: rand() * 6,
  }));
  const image = ctx.createImageData(width, DESIGN_HEIGHT);
  for (let y = 0; y < DESIGN_HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - sunX;
      const dy = y - SUN_ROW;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dx, dy);
      let level = 0;
      for (const ray of rays) {
        const off = Math.abs(angle - ray.angle);
        if (off >= ray.half) continue;
        const along = 0.78 + 0.22 * Math.sin(dist * 0.045 + ray.wobble);
        level = Math.max(level, Math.pow(1 - off / ray.half, 0.7) * ray.power * along);
      }
      level *= Math.max(0, 1 - dist / (DESIGN_HEIGHT * RAY_REACH));
      if (level * 1.1 <= bayer(x, y) * 0.7 + 0.12) continue;
      const o = (y * width + x) * 4;
      image.data[o] = 255;
      image.data[o + 1] = 255;
      image.data[o + 2] = 255;
      image.data[o + 3] = level > CORE_LEVEL ? CORE_ALPHA : EDGE_ALPHA;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

const PATCHES = 22;
const PATCH_ROW_FROM = 120;
const PATCH_ROW_TO = 236;
const PATCH_MIN_R = 5;
const PATCH_MAX_R = 11;
const GLINTS = 64;
const MOTES = 34;
const MOTE_RISE = 5;
/** Glints sit on leaves in this ring around the opening, in multiples of its size. */
const GLINT_INNER = 1.05;
const GLINT_OUTER = 1.7;

interface Patch {
  x: number;
  y: number;
  r: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  speed: number;
  phase: number;
}

export class Sunlight {
  private readonly p: Perspective;
  private readonly setA: HTMLCanvasElement;
  private readonly setB: HTMLCanvasElement;
  private readonly scratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  private readonly patches: Patch[] = [];
  private readonly glints: Patch[] = [];
  private readonly motes: Mote[] = [];

  constructor(width: number) {
    this.p = perspective(width);
    this.setA = buildRays(width, this.p.sunX, 7);
    this.setB = buildRays(width, this.p.sunX, 19);
    this.scratch = memoryCanvas(width, DESIGN_HEIGHT);
    const rand = seeded(41);
    while (this.patches.length < PATCHES) {
      const x = rand() * width;
      const y = PATCH_ROW_FROM + rand() * (PATCH_ROW_TO - PATCH_ROW_FROM);
      if (inClockBand(this.p, x, y)) continue;
      this.patches.push({ x, y, r: PATCH_MIN_R + rand() * (PATCH_MAX_R - PATCH_MIN_R), phase: rand() * 6.28 });
    }
    for (let i = 0; i < GLINTS; i++) {
      const angle = rand() * Math.PI * 2;
      const ring = GLINT_INNER + rand() * (GLINT_OUTER - GLINT_INNER);
      this.glints.push({
        x: this.p.sunX + Math.cos(angle) * GAP_HALF_W * ring,
        y: GAP_ROW + Math.sin(angle) * GAP_HALF_H * ring,
        r: 0,
        phase: rand() * 6.28,
      });
    }
    for (let i = 0; i < MOTES; i++) {
      this.motes.push({ x: rand() * (this.p.sunX + 30), y: rand() * DESIGN_HEIGHT, speed: 1.5 + rand() * 3, phase: rand() * 6.28 });
    }
  }

  /** The shafts, tinted `light` and added over what is drawn; `strength` is 0 in darkness and about 0.5 in full sun. */
  drawBeams(ctx: CanvasRenderingContext2D, time: number, strength: number, light: readonly [number, number, number]): void {
    if (strength <= 0.01) return;
    const mix = 0.5 + 0.5 * Math.sin(time * SHIMMER_SPEED);
    const shift = Math.round(breeze(time, 0) * BEAM_SWAY);
    const s = this.scratch.ctx;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, this.p.width, DESIGN_HEIGHT);
    s.globalAlpha = 0.45 + mix * 0.55;
    s.drawImage(this.setA, shift, 0);
    s.globalAlpha = 0.45 + (1 - mix) * 0.55;
    s.drawImage(this.setB, -shift, 0);
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = `rgb(${light[0]},${light[1]},${light[2]})`;
    s.fillRect(0, 0, this.p.width, DESIGN_HEIGHT);
    s.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    ctx.drawImage(this.scratch.canvas, 0, 0);
    ctx.restore();
  }

  /** Warm patches where the light reaches the trunks, glints on the sunlit leaves and specks floating in the beams. */
  drawSparkle(ctx: CanvasRenderingContext2D, time: number, strength: number, glow: string): void {
    if (strength <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const patch of this.patches) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 0.5 + patch.phase);
      drawHalo(ctx, patch.x + Math.round(breeze(time, patch.x)), patch.y, Math.round(patch.r), glow, strength * pulse * 0.7);
    }
    ctx.restore();
    ctx.fillStyle = '#fff6c4';
    for (const glint of this.glints) {
      if (Math.sin(time * 1.7 + glint.phase) > 0.82) ctx.fillRect(Math.round(glint.x + breeze(time, glint.x)), Math.round(glint.y), 1, 1);
    }
    for (const mote of this.motes) {
      const rise = (time * mote.speed + mote.y) % DESIGN_HEIGHT;
      const y = DESIGN_HEIGHT - rise;
      const x = mote.x + Math.sin(time * 0.3 + mote.phase) * MOTE_RISE + breeze(time, mote.x);
      ctx.globalAlpha = strength * (0.4 + 0.6 * Math.max(0, Math.sin(time * 1.1 + mote.phase)));
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}
