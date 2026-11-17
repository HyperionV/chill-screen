import { approach, seededRandom } from '../world/math';
import { floorAt, SURFACE_Y } from '../world/geometry';
import type { Tank } from '../world/types';
import { css, haze, hsl, mix, type RGB } from './color';
import { driftwood, mossAnchors } from './hardscape';
import { surfaceAt } from './surface';

/**
 * The aquascape's decorative planting that is not part of the ecosystem but still moves: the dense
 * background wall, the carpet on the sand, moss trailing from the wood and plants floating at the top.
 * Each background plant is painted once into a small image and then swayed by skewing it about its base,
 * so hundreds of leaves move for the cost of one image copy each.
 */

type Kind = 'stems' | 'grass' | 'bush' | 'carpet';

interface Layer {
  z: [number, number];
  /** World units between plants along the tank. */
  spacing: number;
  height: [number, number];
  /** Resolution of the painted image relative to the screen; blurred layers need less. */
  res: number;
  /** Blur in world units: the far wall is out of focus, which is what sells depth. */
  blur: number;
  /** How much the plant takes on the water colour. */
  haze: number;
  variants: number;
  kinds: Kind[];
  /** Sway strength, as lean per unit of height. */
  sway: number;
  /** Whether the plant leans away from a passing pointer. */
  reacts: boolean;
}

const LAYERS: Layer[] = [
  { z: [0, 0.02], spacing: 26, height: [300, 560], res: 0.5, blur: 2.6, haze: 0.5, variants: 10, kinds: ['stems', 'stems', 'grass', 'bush'], sway: 0.03, reacts: false },
  { z: [0.02, 0.07], spacing: 48, height: [180, 400], res: 0.7, blur: 0.9, haze: 0.28, variants: 9, kinds: ['stems', 'grass', 'bush', 'bush'], sway: 0.045, reacts: true },
  { z: [0.08, 0.26], spacing: 34, height: [20, 38], res: 1, blur: 0, haze: 0.12, variants: 5, kinds: ['carpet'], sway: 0.14, reacts: true },
];

interface Sprite {
  canvas: HTMLCanvasElement;
  /** Size of the plant in world units, plus the margin painted around it. */
  w: number;
  h: number;
  margin: number;
}

interface Placed {
  sprite: Sprite;
  x: number;
  z: number;
  base: number;
  size: number;
  flip: boolean;
  phase: number;
  sway: number;
  reacts: boolean;
  bend: number;
}

interface Floater {
  x: number;
  r: number;
  roots: number;
  phase: number;
  drift: number;
  hue: number;
}

interface Strand {
  x: number;
  y: number;
  len: number;
  phase: number;
}

/** Hue ranges. Red runs below zero so the tint passes green, gold, then red, as real stem tips colour. */
const GREENS = { leaf: [96, 128], red: [-14, 4] };
const RED_SHARE = 0.22;

export class Scenery {
  private placed: Placed[] = [];
  private floaters: Floater[] = [];
  private strands: Strand[] = [];
  private builtWidth = 0;

  /** Repaints every plant image for the current window size and water colour. */
  rebuild(tank: Tank, water: RGB, scale: number): void {
    const rnd = seededRandom(tank.layoutSeed + 11);
    this.placed = [];
    for (const layer of LAYERS) {
      const sprites = Array.from({ length: layer.variants }, (_, i) => paintSprite(layer, layer.kinds[i % layer.kinds.length], rnd, water, scale));
      const count = Math.ceil(tank.width / layer.spacing);
      for (let i = 0; i < count; i++) {
        const x = ((i + rnd()) / count) * tank.width;
        const z = layer.z[0] + rnd() * (layer.z[1] - layer.z[0]);
        this.placed.push({
          sprite: sprites[Math.floor(rnd() * sprites.length)], x, z, base: floorAt(x, z) + 3,
          size: 0.8 + rnd() * 0.4, flip: rnd() < 0.5, phase: rnd() * Math.PI * 2, sway: layer.sway * (0.7 + rnd() * 0.6),
          reacts: layer.reacts, bend: 0,
        });
      }
    }
    this.placed.sort((a, b) => a.z - b.z);

    this.strands = [];
    for (const a of mossAnchors(driftwood(tank))) {
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) this.strands.push({ x: a.x + (rnd() - 0.5) * 22, y: a.y + 4, len: 10 + rnd() * 22, phase: rnd() * Math.PI * 2 });
    }

    if (this.floaters.length === 0 || this.builtWidth === 0) this.floaters = makeFloaters(tank.width, rnd);
    else for (const f of this.floaters) f.x *= tank.width / this.builtWidth;
    this.builtWidth = tank.width;
  }

  /** The planted background and the carpet. Call with the world transform set. */
  drawPlanting(ctx: CanvasRenderingContext2D, tank: Tank, time: number, dt: number, scale: number): void {
    const c = tank.cursor;
    const cur = tank.current;
    for (const p of this.placed) {
      const height = p.sprite.h * p.size;
      let target = 0;
      if (p.reacts && c.inside && c.speed > 40 && c.y < p.base && c.y > p.base - height && Math.abs(c.x - p.x) < 90) {
        target += Math.sign(p.x - c.x || 1) * (1 - Math.abs(c.x - p.x) / 90) * 0.3;
      }
      if (cur.strength > 0.01) {
        const d = Math.hypot(p.x - cur.x, p.base - height / 2 - cur.y);
        if (d < 400) target += cur.fx * cur.strength * (1 - d / 400) * 0.0006;
      }
      p.bend = approach(p.bend, target, target === 0 ? 1.1 : 4, dt);
      // A slow swell travels across the tank, with a quicker flutter on top.
      const lean = p.sway * (Math.sin(time * 0.42 - p.x * 0.0032 + p.phase * 0.25) + 0.35 * Math.sin(time * 1.15 + p.phase)) + p.bend;
      const sx = (p.flip ? -p.size : p.size) * scale;
      const sy = p.size * scale;
      ctx.setTransform(sx, 0, -lean * sy, sy, p.x * scale, p.base * scale);
      const s = p.sprite;
      ctx.drawImage(s.canvas, -s.w / 2 - s.margin, -s.h, s.w + s.margin * 2, s.h + s.margin);
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  /** Java moss trailing from the driftwood, swaying in the flow. */
  drawMoss(ctx: CanvasRenderingContext2D, water: RGB, time: number): void {
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = css(haze(hsl(104, 0.45, 0.26), water, 0.3), 0.85);
    ctx.beginPath();
    for (const s of this.strands) {
      const sway = Math.sin(time * 0.8 + s.phase) * s.len * 0.35;
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(s.x + sway * 0.3, s.y + s.len * 0.5, s.x + sway, s.y + s.len);
    }
    ctx.stroke();
  }

  /** Floating plants drifting on the surface, roots trailing below. Drawn before the surface so they reflect. */
  drawFloaters(ctx: CanvasRenderingContext2D, tank: Tank, water: RGB, time: number, dt: number): void {
    const c = tank.cursor;
    const cur = tank.current;
    for (const f of this.floaters) {
      let push = f.drift;
      if (c.inside && c.speed > 40 && c.y < SURFACE_Y + 120 && Math.abs(c.x - f.x) < 80) push += Math.sign(f.x - c.x || 1) * 40;
      if (cur.strength > 0.01 && Math.abs(cur.x - f.x) < 300 && cur.y < SURFACE_Y + 300) push += cur.fx * cur.strength * 0.08;
      f.x += push * dt;
      if (f.x < -40) f.x += tank.width + 80;
      if (f.x > tank.width + 40) f.x -= tank.width + 80;

      const y = surfaceAt(f.x, time) + 2;
      ctx.strokeStyle = css(haze([150, 132, 96], water, 0.6), 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (let i = 0; i < f.roots; i++) {
        const rx = f.x + (i / Math.max(1, f.roots - 1) - 0.5) * f.r;
        const len = f.r * (2 + ((i * 7 + f.hue) % 5) * 0.6);
        const sway = Math.sin(time * 0.9 + f.phase + i) * len * 0.22;
        ctx.moveTo(rx, y);
        ctx.quadraticCurveTo(rx + sway * 0.4, y + len * 0.55, rx + sway, y + len);
      }
      ctx.stroke();

      // Seen from below, a leaf is a dark disc with light glowing through its thin rim.
      ctx.save();
      ctx.translate(f.x, y);
      ctx.scale(1, 0.3);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r);
      g.addColorStop(0, css(hsl(f.hue, 0.5, 0.16)));
      g.addColorStop(0.75, css(hsl(f.hue, 0.5, 0.28)));
      g.addColorStop(1, css(hsl(f.hue - 6, 0.6, 0.48), 0.9));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function makeFloaters(width: number, rnd: () => number): Floater[] {
  const floaters: Floater[] = [];
  const clusters = 2 + Math.floor(rnd() * 2);
  for (let c = 0; c < clusters; c++) {
    const center = (0.15 + rnd() * 0.7) * width;
    const n = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      floaters.push({ x: center + (rnd() - 0.5) * 140, r: 8 + rnd() * 10, roots: 3 + Math.floor(rnd() * 4), phase: rnd() * 6, drift: (rnd() - 0.5) * 3, hue: 92 + rnd() * 18 });
    }
  }
  return floaters;
}

function paintSprite(layer: Layer, kind: Kind, rnd: () => number, water: RGB, scale: number): Sprite {
  const h = kind === 'bush' ? (layer.height[0] + rnd() * (layer.height[1] - layer.height[0])) * 0.4 : layer.height[0] + rnd() * (layer.height[1] - layer.height[0]);
  const w = kind === 'bush' ? h * 1.5 : kind === 'carpet' ? 110 : kind === 'grass' ? h * 0.42 : h * 0.5;
  const margin = layer.blur * 3 + 6;
  const k = scale * layer.res;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil((w + margin * 2) * k));
  canvas.height = Math.max(1, Math.ceil((h + margin) * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.setTransform(k, 0, 0, k, (margin + w / 2) * k, h * k);
  if (layer.blur > 0) ctx.filter = `blur(${(layer.blur * k).toFixed(2)}px)`;
  const tone = (c: RGB): RGB => haze(c, water, 1 - layer.haze * 2);
  switch (kind) {
    case 'stems':
      paintStems(ctx, rnd, w, h, tone);
      break;
    case 'grass':
      paintGrass(ctx, rnd, w, h, tone);
      break;
    case 'bush':
      paintBush(ctx, rnd, w, h, tone);
      break;
    case 'carpet':
      paintCarpet(ctx, rnd, w, h, tone);
      break;
    default: {
      const unreachable: never = kind;
      throw new Error(`No painter for ${String(unreachable)}`);
    }
  }
  return { canvas, w, h, margin };
}

type Tone = (c: RGB) => RGB;

/** A bunch of upright stem plants with whorls of narrow leaves; some turn red toward the light. */
function paintStems(ctx: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, tone: Tone): void {
  const red = rnd() < RED_SHARE;
  const leafHue = GREENS.leaf[0] + rnd() * (GREENS.leaf[1] - GREENS.leaf[0]);
  const tipHue = red ? GREENS.red[0] + rnd() * (GREENS.red[1] - GREENS.red[0]) : leafHue + 12;
  const stems = 6 + Math.floor(rnd() * 6);
  for (let s = 0; s < stems; s++) {
    const x0 = (rnd() - 0.5) * w * 0.5;
    const top = h * (0.65 + rnd() * 0.35);
    const lean = (rnd() - 0.5) * w * 0.5;
    const pointAt = (t: number): [number, number] => [x0 + lean * t * t, -top * t];
    ctx.strokeStyle = css(tone(hsl(leafHue - 8, 0.35, 0.22)));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo(x0 + lean * 0.25, -top * 0.5, ...pointAt(1));
    ctx.stroke();
    const whorls = Math.floor(top / 9);
    for (let i = 2; i <= whorls; i++) {
      const t = i / whorls;
      const [x, y] = pointAt(t);
      const hue = leafHue + (tipHue - leafHue) * Math.pow(t, 2.2);
      const light = 0.2 + t * 0.2 + rnd() * 0.05;
      const sat = red && t > 0.6 ? 0.55 : 0.45;
      ctx.fillStyle = css(tone(hsl((hue + 360) % 360, sat, light)), 0.95);
      const len = (11 - t * 4) * (0.85 + rnd() * 0.3);
      for (const side of [-1, 1]) {
        const ang = side * (0.9 + rnd() * 0.4) - 0.25 * side * t;
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(ang) * len * 0.5, y - Math.cos(ang) * len * 0.5, len * 0.18, len * 0.55, ang, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** A clump of tall ribbon grass, like vallisneria at the back of the tank. */
function paintGrass(ctx: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, tone: Tone): void {
  const hue = GREENS.leaf[0] + rnd() * 20;
  const blades = 9 + Math.floor(rnd() * 8);
  for (let b = 0; b < blades; b++) {
    const x0 = (rnd() - 0.5) * w * 0.3;
    const len = h * (0.55 + rnd() * 0.45);
    const lean = (rnd() - 0.5) * w * 1.1;
    const width = 3 + rnd() * 3;
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, css(tone(hsl(hue, 0.4, 0.16))));
    g.addColorStop(1, css(tone(hsl(hue + 10, 0.5, 0.36 + rnd() * 0.08))));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - width / 2, 0);
    ctx.quadraticCurveTo(x0 + lean * 0.2 - width / 2, -len * 0.55, x0 + lean, -len);
    ctx.quadraticCurveTo(x0 + lean * 0.2 + width / 2, -len * 0.55, x0 + width / 2, 0);
    ctx.closePath();
    ctx.fill();
  }
}

/** A low rounded mound of small leaves, darker underneath where light does not reach. */
function paintBush(ctx: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, tone: Tone): void {
  const hue = GREENS.leaf[0] - 6 + rnd() * 30;
  const leaves = Math.floor(w * h * 0.05);
  for (let i = 0; i < leaves; i++) {
    const a = rnd() * Math.PI;
    const r = Math.sqrt(rnd());
    const x = Math.cos(a) * r * w * 0.5;
    const y = -Math.sin(a) * r * h;
    const up = -y / h;
    ctx.fillStyle = css(tone(hsl(hue + rnd() * 10, 0.48, 0.13 + up * 0.22 + rnd() * 0.05)), 0.95);
    ctx.beginPath();
    ctx.ellipse(x, y, 2.4 + rnd() * 2.6, 1.3 + rnd() * 1.2, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A patch of carpeting grass: many short fine blades, lighter at the tips. */
function paintCarpet(ctx: CanvasRenderingContext2D, rnd: () => number, w: number, h: number, tone: Tone): void {
  const hue = 92 + rnd() * 18;
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = (rnd() - 0.5) * w;
    const len = h * (0.4 + rnd() * 0.6) * (1 - Math.abs(x / w) * 0.8);
    const lean = (rnd() - 0.5) * 12;
    ctx.strokeStyle = css(tone(mix(hsl(hue, 0.5, 0.2), hsl(hue + 8, 0.55, 0.42), rnd())), 0.95);
    ctx.lineWidth = 1 + rnd() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.quadraticCurveTo(x + lean * 0.2, -len * 0.5, x + lean, -len);
    ctx.stroke();
  }
}
