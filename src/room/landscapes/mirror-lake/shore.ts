import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise, ramp } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';
import type { SkyState } from '../../sky';
import { breeze } from '../../wind';
import { flicker } from './light-sprites';
import type { LakeLighting } from './lighting';
import { DESIGN_HEIGHT, SCENES } from './scenes';
import { sprite, windSprite } from './sprites';

const TOP = 0.61;
const BUD_HEIGHT = 7;
const ROCKS_PER_BANK = 7;
const PADS_PER_PATCH = 6;
const REED_CLUMPS = 12;
const GRASS_TUFTS = 12;
/** Maximum tip movement in stage pixels. */
const PINE_SWAY = 3;
const REED_SWAY = 3;
const GRASS_SWAY = 2;
const PAD_SWAY = 1;
const SAIL_SWAY = 2;
/** Bottom rows of the boat sprite that contain the hull. */
const BOAT_HULL_ROWS = 4;
const PATCHES = [
  [0.27, 0.82], [0.18, 0.78], [0.10, 0.89], [0.16, 0.85], [0.29, 0.91],
];

interface ShoreArt {
  rock: HTMLCanvasElement;
  pads: HTMLCanvasElement;
  pine: HTMLCanvasElement;
  reeds: HTMLCanvasElement;
  grass: HTMLCanvasElement;
  boat: HTMLCanvasElement;
}

interface Pad {
  x: number;
  y: number;
  size: number;
  bud: boolean;
}

interface ShoreScene {
  day: HTMLCanvasElement;
  night: HTMLCanvasElement;
  pads: Pad[];
}

function pine(night: boolean): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(55, 87);
  const shadow = night ? '#213542' : '#315143';
  const middle = night ? '#2c4652' : '#406957';
  const needles = night ? '#43616b' : '#567b5e';
  const rim = night ? '#6e8998' : '#81a073';
  ctx.fillStyle = night ? '#3c4d50' : '#665d46';
  ctx.fillRect(25, 9, 5, 78);
  ctx.fillStyle = night ? '#657479' : '#8a785b';
  ctx.fillRect(29, 18, 1, 69);
  for (let y = 1; y < 76; y++) {
    const tier = y % 11;
    const width = Math.round((2 + y * 0.31) * (0.52 + tier / 23));
    const x = 27 - width;
    ctx.fillStyle = shadow;
    ctx.fillRect(x, y, width * 2 + 1, 1);
    ctx.fillStyle = middle;
    ctx.fillRect(x + Math.round(width * 0.7), y, Math.max(1, Math.round(width * 1.3)), 1);
    if (tier > 2 && hash(y + 95) > 0.2) {
      ctx.fillStyle = needles;
      ctx.fillRect(27 + Math.floor(width * 0.2), y, Math.max(1, Math.floor(width * 0.71)), 1);
    }
    if (tier < 8 && hash(y + 81) > 0.4) {
      ctx.fillStyle = rim;
      ctx.fillRect(27 + width - (tier > 3 ? 1 : 0), y, tier > 3 ? 2 : 1, 1);
    }
  }
  return canvas;
}

function reed(night: boolean): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(23, 33);
  const base = canvas.height - 1;
  const stem = night ? '#344c53' : '#58744d';
  const leaf = night ? '#557076' : '#829264';
  const seed = night ? '#6a6c61' : '#8a6b48';
  for (let i = 0; i < 5; i++) {
    const tall = 11 + Math.round(hash(i + 29) * 20);
    const root = 7 + i * 2;
    const bend = (i - 2) * 1.3;
    for (let y = 0; y < tall; y++) {
      const x = Math.round(root + bend * (y / tall) ** 2);
      ctx.fillStyle = y > tall * 0.6 ? leaf : stem;
      ctx.fillRect(x, base - y, 1, 1);
      if (y > 3 && y < 9 && i % 2 === 0) {
        const leafTip = x + (y - 2) * (i === 0 ? -1 : 1) / 2;
        ctx.fillRect(Math.round(leafTip), base - y * 2, 1, 2);
      }
    }
    if (i % 2 === 1) {
      ctx.fillStyle = seed;
      ctx.fillRect(Math.round(root + bend) - 1, base - tall - 2, 2, 5);
    }
  }
  return canvas;
}

function buildArt(night: boolean): ShoreArt {
  return {
    rock: pixmap([
      '......hhhhs.....', '....hhmhhsss....', '..hmmmmmmsssd...', '.hmhmmmssmmssd..',
      'hhmmsssssssssdd.', 'hmmsmssddssdddd.', '.ddddddddddd....', '...wwww..ww.....',
    ], night
      ? { h: '#788991', m: '#5c6c76', s: '#435862', d: '#304752', w: '#4d6879' }
      : { h: '#b2b09a', m: '#8c917b', s: '#687967', d: '#4b615b', w: '#729594' }),
    pads: pixmap([
      '....hhhhh.....', '..hhmhhmhmh...', '.hmmmmmmsss...', 'hmmdmssss.....',
      '.ssmmmsmmsss..', '..ssmsssdddd..', '....ddddd.....',
    ], night
      ? { h: '#6d867e', m: '#4d6b62', s: '#395a54', d: '#2e4b4e' }
      : { h: '#a8b880', m: '#7d9d61', s: '#537d52', d: '#3e624b' }),
    pine: pine(night),
    reeds: reed(night),
    grass: pixmap([
      '.h...s.', '.h...s.', '..s.s..', 's.s.s.h', '.ssssh.', '..sss..',
    ], night ? { h: '#506869', s: '#40575a' } : { h: '#829264', s: '#697d58' }),
    boat: pixmap([
      '.........m...........', '........hm...........', '.......hhms..........', '......hhhmss.........',
      '.....hhsmmsss........', '....hhhsmmssss.......', '...hhhssmmssss.......', '..hhhhssmmsssss......',
      '......mm.m...........', 'd.dddddddddddddddd..d', '.dhhhhhhhhhhhhhhhhhd.', '..dddddddddddddddmd..',
      '....mmddddddddmm.....',
    ], night
      ? { h: '#85949e', s: '#506679', m: '#627482', d: '#37434a' }
      : { h: '#e0d6b2', s: '#aea898', m: '#8b8170', d: '#5a5e51' }),
  };
}

function bankSide(x: number, w: number): number {
  return Math.min(1, Math.abs(x / w - 0.5) * 2);
}

function bankEdge(scene: number, h: number, x: number, side: number, unit: number): number {
  const depth = scene === 3 ? 0.055 : 0.105;
  return Math.round(h * (1 - depth * side ** 2.8) - noise(x * 0.06) * 4 * side * unit);
}

export class LakeShore {
  private readonly dayArt = buildArt(false);
  private readonly nightArt = buildArt(true);
  private w = 1;
  private h = 1;
  private unit = 1;
  private top = 1;
  private shores: ShoreScene[] = [];

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_HEIGHT;
    this.top = Math.round(h * TOP);
    this.shores = SCENES.map((_, scene) => {
      const pads: Pad[] = [];
      if (scene !== 2) {
        for (const column of PATCHES[scene]) {
          for (let i = 0; i < PADS_PER_PATCH; i++) {
            const x = column * w + (hash(i + scene * 19 + 71) - 0.5) * 54 * this.unit;
            const y = h * (0.75 + hash(i + scene * 19 + 478) * 0.18);
            if (x >= w * 0.37 && x <= w * 0.64) continue;
            pads.push({ x, y, size: 0.55 + hash(i + 259) * 0.4, bud: i === 1 || i === 4 });
          }
        }
      }
      return { day: this.paint(scene, false), night: this.paint(scene, true), pads };
    });
  }

  private paint(scene: number, night: boolean): HTMLCanvasElement {
    const { w, h, top, unit: u } = this;
    const { canvas, ctx } = memoryCanvas(w, Math.max(1, h - top));
    ctx.translate(0, -top);
    ctx.imageSmoothingEnabled = false;
    const art = night ? this.nightArt : this.dayArt;
    const edge = night ? '#465a5c' : '#7f8e72';
    const gravel = night ? '#54686b' : '#a0a087';
    const grass = night ? '#334a4d' : '#586e51';
    for (let x = 0; x < w; x++) {
      const side = bankSide(x, w);
      const y = bankEdge(scene, h, x, side, u);
      ctx.fillStyle = grass;
      ctx.fillRect(x, y, 1, Math.max(0, h - y));
      if (side < 0.43) continue;
      ctx.fillStyle = edge;
      ctx.fillRect(x, y, 1, 1 + (hash(x + 19) < 0.55 ? 1 : 0));
      const seed = hash(x + 73);
      if (seed > 0.38) continue;
      ctx.fillStyle = gravel;
      ctx.fillRect(x, Math.round(y + seed * 18 * u), hash(x + 473) > 0.76 ? 2 : 1, 1);
    }
    for (let i = 0; i < ROCKS_PER_BANK * 2; i++) {
      const shore = i % 2 === 0 ? 0 : 1;
      const distance = 0.01 + hash(i + 29 + scene * 14) * (scene === 3 ? 0.11 : 0.19);
      const x = w * (shore === 0 ? distance : 1 - distance);
      const y = h * (0.89 + hash(i + 551) * 0.1);
      sprite(ctx, art.rock, x, y, (0.44 + hash(i + 321) * 0.95) * u, shore === 1);
    }
    return canvas;
  }

  draw(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number): void {
    const shore = this.shores[scene];
    this.pads(ctx, shore.pads, state.day, time);
    if (state.day < 1) ctx.drawImage(shore.night, 0, this.top);
    if (state.day > 0) {
      ctx.globalAlpha = state.day;
      ctx.drawImage(shore.day, 0, this.top);
      ctx.globalAlpha = 1;
    }
    this.grass(ctx, scene, state.day, time);
    const treeSize = this.unit * (scene === 3 ? 0.65 : 0.91);
    const left = this.w * 0.016;
    const right = this.w * 0.985;
    this.plant(ctx, 'pine', left, this.h * 0.988, treeSize, Math.round(breeze(time, left) * PINE_SWAY), state.day);
    this.plant(ctx, 'pine', right, this.h * 1.01, treeSize + this.unit * 0.09, Math.round(breeze(time, right) * PINE_SWAY), state.day, true);
    if (scene === 1 || scene === 3) this.boat(ctx, scene, state.day, time);
    this.reeds(ctx, scene, state.day, time);
  }

  private plant(ctx: CanvasRenderingContext2D, art: 'pads' | 'pine' | 'grass' | 'reeds', x: number, y: number, size: number, sway: number, day: number, flip = false): void {
    if (day < 1) windSprite(ctx, this.nightArt[art], x, y, size, sway, flip);
    if (day > 0) {
      ctx.globalAlpha = day;
      windSprite(ctx, this.dayArt[art], x, y, size, sway, flip);
      ctx.globalAlpha = 1;
    }
  }

  private pads(ctx: CanvasRenderingContext2D, pads: readonly Pad[], day: number, time: number): void {
    const u = this.unit;
    for (const pad of pads) {
      const sway = Math.round(breeze(time, pad.x) * PAD_SWAY);
      this.plant(ctx, 'pads', pad.x, pad.y, pad.size * u, sway, day);
      if (!pad.bud) continue;
      const x = Math.round(pad.x);
      const y = Math.round(pad.y - BUD_HEIGHT * u);
      const width = Math.max(1, Math.round(u));
      const stem = Math.max(1, Math.round(2 * u));
      ctx.fillStyle = '#6c8877';
      ctx.fillRect(x + sway, y, width, stem);
      ctx.fillRect(x, y + stem, width, stem);
      if (day > 0) {
        ctx.fillStyle = '#a9a97a';
        ctx.globalAlpha = day;
        ctx.fillRect(x + sway, y, width, stem);
        ctx.fillRect(x, y + stem, width, stem);
        ctx.globalAlpha = 1;
      }
    }
  }

  private grass(ctx: CanvasRenderingContext2D, scene: number, day: number, time: number): void {
    const { w, h, unit: u } = this;
    for (let i = 0; i < GRASS_TUFTS; i++) {
      const distance = 0.025 + hash(i + 619 + scene * 19) * 0.18;
      const x = Math.round((i % 2 ? 1 - distance : distance) * w);
      const y = bankEdge(scene, h, x, bankSide(x, w), u);
      const size = (0.7 + hash(i + 92) * 0.35) * u;
      this.plant(ctx, 'grass', x, y, size, Math.round(breeze(time, x) * GRASS_SWAY), day);
    }
  }

  private reeds(ctx: CanvasRenderingContext2D, scene: number, day: number, time: number): void {
    const { w, h, unit: u } = this;
    const count = scene === 3 ? REED_CLUMPS / 2 : REED_CLUMPS;
    for (let i = 0; i < count; i++) {
      const distance = 0.014 + hash(i + 715 + scene * 19) * 0.16;
      const x = (i % 2 ? 1 - distance : distance) * w;
      const y = h * (0.956 + hash(i + 5) * 0.047);
      const size = (0.58 + hash(i + 28) * 0.51) * u;
      const sway = Math.round(breeze(time, x) * REED_SWAY);
      this.plant(ctx, 'reeds', x, y, size, sway, day);
    }
  }

  private boat(ctx: CanvasRenderingContext2D, scene: number, day: number, time: number): void {
    const { w, h, unit: u } = this;
    const x = w * (scene === 3 ? 0.67 : 0.26) + Math.sin(time * 0.055 + scene) * 12 * u;
    const y = h * (scene === 3 ? 0.627 : 0.645) + Math.sin(time * 0.78) * u;
    const size = u * 0.92;
    const sway = Math.round(breeze(time, x) * SAIL_SWAY);
    ctx.save();
    ctx.translate(0, Math.round(y) * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.23;
    windSprite(ctx, day > 0.5 ? this.dayArt.boat : this.nightArt.boat, x + u, y, size, sway, false, BOAT_HULL_ROWS);
    ctx.restore();
    if (day < 1) windSprite(ctx, this.nightArt.boat, x, y, size, sway, false, BOAT_HULL_ROWS);
    if (day > 0) {
      ctx.globalAlpha = day;
      windSprite(ctx, this.dayArt.boat, x, y, size, sway, false, BOAT_HULL_ROWS);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = day > 0.5 ? 'rgba(203,223,213,0.25)' : 'rgba(131,166,183,0.25)';
    ctx.fillRect(Math.round(x - 20 * u), Math.round(y), Math.max(1, Math.round(15 * u)), 1);
    ctx.fillRect(Math.round(x - 26 * u), Math.round(y + 2 * u), Math.max(1, Math.round(12 * u)), 1);
  }

  buds(ctx: CanvasRenderingContext2D, scene: number, lighting: LakeLighting, state: SkyState, time: number): void {
    const night = ramp(0.11, 0.88, 1 - state.day);
    if (night <= 0) return;
    for (const pad of this.shores[scene].pads) {
      if (pad.bud) {
        const x = pad.x + Math.round(breeze(time, pad.x) * PAD_SWAY);
        lighting.bud(ctx, x, pad.y - BUD_HEIGHT * this.unit, night * flicker(time, pad.x));
      }
    }
  }
}
