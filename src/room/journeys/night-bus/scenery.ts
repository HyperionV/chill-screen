import { memoryCanvas } from '../../../render/pixel-stage';
import { drawText, textWidth } from '../../../render/pixel-font';
import { hash } from '../noise';
import { NEON, NEON_CORE, ROAD_TOP, trafficPhase, wrap } from './route';

const TILE = 168;
const SIGN_NAMES = ['HOTEL', 'OPEN', '24H', 'BAR', 'PHARMACY', 'KARAOKE', 'NOODLE', 'OPEN'] as const;
const BUILDING = ['#353d52', '#404358', '#394554', '#48475a'] as const;
const SIGN_SCALE = 2;
const SIGN_HEIGHT = 18;
const HALO_PAD = 12;
const SIGN_SECONDS = 1.6;
const FLASH_SECONDS = 0.45;
const RETRIGGER_SECONDS = 0.25;
const MAX_HITS = 24;
const TRAIN_CARS = 12;
const TRAIN_CAR_WIDTH = 87;
const TRAIN_ENTER = 0.2;
const TRAIN_EXIT = 0.59;

interface SignHit { x: number; y: number; w: number; id: number }
interface SignState { age: number; color: number }
interface SignSprite { canvas: HTMLCanvasElement; boxW: number }

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Broken columns of colour read as wet reflections without sampling the canvas. */
export function reflection(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  length = 36,
  width = 6,
  time = 0,
  strength = 0.32,
): void {
  const prevAlpha = ctx.globalAlpha;
  const stripeWidth = Math.max(1, Math.round(width));
  const coreWidth = Math.max(1, Math.round(stripeWidth * 0.4));
  ctx.fillStyle = color;
  for (let row = 0; row < length; row += 2) {
    const falloff = 1 - row / length;
    const shift = Math.round(Math.sin(row * 0.85 + time * 1.7) * 2.2);
    const rx = Math.round(x + shift - stripeWidth / 2);
    const ry = Math.round(y + row);
    ctx.globalAlpha = prevAlpha * strength * falloff;
    ctx.fillRect(rx, ry, stripeWidth + (row % 2), 1);
    ctx.globalAlpha = prevAlpha * Math.min(0.85, strength * 1.4) * falloff;
    ctx.fillRect(Math.round(x + shift - coreWidth / 2), ry, coreWidth, 1);
  }
  ctx.globalAlpha = prevAlpha;
}

/** Builds a size-2 neon sign baked inside a 2-ring dithered glow halo. */
function buildSignSprite(name: string, color: string): SignSprite {
  const boxW = textWidth(name) * SIGN_SCALE + 8;
  const w = boxW + HALO_PAD * 2;
  const h = SIGN_HEIGHT + HALO_PAD * 2;
  const { canvas, ctx } = memoryCanvas(w, h);
  const [r, g, b] = hexToRgb(color);
  const innerMax = 5;
  const outerMax = HALO_PAD;

  for (let py = 0; py < h; py++) {
    const dy = py < HALO_PAD ? HALO_PAD - py : py >= HALO_PAD + SIGN_HEIGHT ? py - (HALO_PAD + SIGN_HEIGHT - 1) : 0;
    for (let px = 0; px < w; px++) {
      const dx = px < HALO_PAD ? HALO_PAD - px : px >= HALO_PAD + boxW ? px - (HALO_PAD + boxW - 1) : 0;
      if (dx === 0 && dy === 0) continue;
      const dist = Math.hypot(dx, dy);
      if (dist > outerMax) continue;
      if (dist <= innerMax) {
        const dense = (px + py) % 2 === 0;
        const alpha = dist <= 2 ? (dense ? 0.65 : 0.32) : (dense ? 0.48 : 0.18);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.fillRect(px, py, 1, 1);
      } else {
        const sparse = (px % 2 === 0 && py % 2 === 0) || (dist <= 8 && (px + py) % 4 === 2);
        if (!sparse) continue;
        const alpha = 0.28 * (1 - (dist - innerMax) / (outerMax - innerMax + 1));
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  ctx.fillStyle = '#111420'; ctx.fillRect(HALO_PAD, HALO_PAD, boxW, SIGN_HEIGHT);
  ctx.fillStyle = `rgba(${r},${g},${b},0.14)`; ctx.fillRect(HALO_PAD, HALO_PAD, boxW, SIGN_HEIGHT);
  ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
  ctx.fillRect(HALO_PAD, HALO_PAD, boxW, 1);
  ctx.fillRect(HALO_PAD, HALO_PAD + SIGN_HEIGHT - 1, boxW, 1);
  ctx.fillRect(HALO_PAD, HALO_PAD, 1, SIGN_HEIGHT);
  ctx.fillRect(HALO_PAD + boxW - 1, HALO_PAD, 1, SIGN_HEIGHT);
  drawText(ctx, name, HALO_PAD + 4, HALO_PAD + 4, color, SIGN_SCALE);
  return { canvas, boxW };
}

/** Builds a glowing vending machine with a 2-ring cyan halo around its drink window. */
function buildVendingSprite(): HTMLCanvasElement {
  const pad = 8; const mw = 20; const mh = 30;
  const { canvas, ctx } = memoryCanvas(mw + pad * 2, mh + pad * 2);
  // Outer & inner dithered cyan glow around the display window.
  for (let py = 0; py < canvas.height; py++) {
    const dy = py < pad + 3 ? pad + 3 - py : py >= pad + 19 ? py - (pad + 18) : 0;
    for (let px = 0; px < canvas.width; px++) {
      const dx = px < pad + 2 ? pad + 2 - px : px >= pad + 16 ? px - (pad + 15) : 0;
      const dist = Math.hypot(dx, dy);
      if (dist === 0 || dist > 8) continue;
      if (dist <= 3.5) {
        ctx.fillStyle = (px + py) % 2 === 0 ? 'rgba(90,238,255,0.42)' : 'rgba(90,238,255,0.16)';
        ctx.fillRect(px, py, 1, 1);
      } else if (px % 2 === 0 && py % 2 === 0) {
        ctx.fillStyle = 'rgba(90,238,255,0.18)'; ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  ctx.fillStyle = '#4c546a'; ctx.fillRect(pad, pad, mw, mh);
  ctx.fillStyle = '#6c758d'; ctx.fillRect(pad, pad, mw, 2);
  ctx.fillStyle = '#2d3445'; ctx.fillRect(pad + mw - 2, pad + 2, 2, mh - 2);
  ctx.fillStyle = '#cbfcff'; ctx.fillRect(pad + 2, pad + 3, 14, 15);
  const cans = ['#ff4f8b', '#4de8ff', '#ffd24d', '#7cf098'];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = cans[(row + col) % cans.length];
      ctx.fillRect(pad + 3 + col * 3, pad + 4 + row * 5, 2, 3);
    }
    ctx.fillStyle = '#6ea8b8'; ctx.fillRect(pad + 2, pad + 7 + row * 5, 14, 1);
  }
  ctx.fillStyle = '#1e2836'; ctx.fillRect(pad + 3, pad + 22, 11, 5);
  ctx.fillStyle = '#8ef0ff'; ctx.fillRect(pad + 15, pad + 19, 2, 4);
  return canvas;
}

export class Scenery {
  private readonly tiles: HTMLCanvasElement[][] = [];
  private readonly signs: SignSprite[][] = [];
  private readonly vending: HTMLCanvasElement;
  private readonly states: SignState[] = Array.from({ length: 56 }, () => ({ age: SIGN_SECONDS, color: 0 }));
  private readonly hits: SignHit[] = Array.from({ length: MAX_HITS }, () => ({ x: 0, y: 0, w: 0, id: 0 }));
  private hitCount = 0;
  private trainExtra = 0;

  constructor() {
    for (let chapter = 0; chapter < 7; chapter++) {
      this.tiles.push(Array.from({ length: 4 }, (_, variant) => this.buildTile(chapter, variant)));
    }
    for (const name of SIGN_NAMES) {
      this.signs.push(NEON.map((color) => buildSignSprite(name, color)));
    }
    this.vending = buildVendingSprite();
  }

  update(dt: number, chapter: number, progress: number, still: boolean): void {
    this.hitCount = 0;
    for (const state of this.states) state.age = Math.min(SIGN_SECONDS, state.age + dt);
    if (chapter !== 5) this.trainExtra = 0;
    else if (still && progress >= TRAIN_ENTER && progress < TRAIN_EXIT) this.trainExtra += dt * 18;
  }

  press(x: number, y: number): boolean {
    for (let i = this.hitCount - 1; i >= 0; i--) {
      const hit = this.hits[i];
      if (x < hit.x - 4 || x > hit.x + hit.w + 4 || y < hit.y - 4 || y > hit.y + SIGN_HEIGHT + 4) continue;
      const state = this.states[hit.id];
      if (state.age >= RETRIGGER_SECONDS) {
        state.age = 0;
        state.color = (state.color + 1) % NEON.length;
      }
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, chapter: number, w: number, scroll: number, time: number, dawn: number, progress: number, active: boolean): void {
    ctx.fillStyle = chapter === 2 ? '#1a3140' : '#28303e';
    ctx.fillRect(0, 176, w, 94);
    this.skyline(ctx, w, scroll * 0.08, chapter);
    this.middle(ctx, w, scroll * 0.24, chapter);
    ctx.fillStyle = chapter === 2 ? '#20313e' : '#2d3442';
    ctx.fillRect(0, ROAD_TOP, w, 63);
    for (let y = ROAD_TOP + 3; y < 270; y += 5) {
      ctx.fillStyle = y % 2 ? '#363d4c' : '#28303d';
      for (let x = -Math.round(wrap(scroll * 1.1, 29)); x < w; x += 29) ctx.fillRect(x, y, 11, 1);
    }
    if (chapter === 2) this.river(ctx, w, scroll, time);
    const near = scroll * 0.65;
    for (let cell = Math.floor(near / TILE) - 1; cell * TILE - near < w; cell++) {
      const variant = wrap(cell, 4);
      const x = Math.round(cell * TILE - near);
      ctx.drawImage(this.tiles[chapter][variant], x, 0);
    }
    // Gentle night wash preserves building silhouettes without crushing lit windows.
    ctx.fillStyle = `rgba(10,17,35,${0.12 * (1 - dawn)})`;
    ctx.fillRect(0, 148, w, 122);
    if (dawn > 0) {
      ctx.fillStyle = `rgba(179,140,144,${dawn * 0.13})`;
      ctx.fillRect(0, 148, w, 122);
    }
    for (let cell = Math.floor(near / TILE) - 1; cell * TILE - near < w; cell++) {
      const x = Math.round(cell * TILE - near);
      const variant = wrap(cell, 8);
      this.streetDetails(ctx, chapter, x, variant, time, active);
    }
    if (chapter === 5) this.crossing(ctx, w, progress, time);
    this.lamps(ctx, w, scroll * 1.35, chapter, time);
  }

  private buildTile(chapter: number, variant: number): HTMLCanvasElement {
    const { canvas, ctx } = memoryCanvas(TILE, 270);
    const house = chapter === 4;
    const roof = chapter === 3;
    if (chapter === 2 || chapter === 5 || chapter === 6) {
      if (chapter === 6) {
        ctx.fillStyle = '#4a545d';
        ctx.fillRect(10, 185, 136, 3);
        ctx.fillStyle = '#36414e';
        ctx.fillRect(16, 188, 2, 22);
        ctx.fillRect(138, 188, 2, 22);
        ctx.fillStyle = '#70635a';
        ctx.fillRect(52, 201, 42, 3);
        ctx.fillRect(56, 204, 2, 6);
        ctx.fillRect(88, 204, 2, 6);
        drawText(ctx, 'LAST STOP', 36, 173, '#d6d4c4', SIGN_SCALE);
      }
      if (chapter === 5) {
        ctx.fillStyle = '#504e58';
        ctx.fillRect(0, 201, TILE, 2);
        for (let x = 0; x < TILE; x += 12) ctx.fillRect(x, 204, 7, 2);
      }
      return canvas;
    }
    for (let n = 0; n < 2; n++) {
      const seed = variant * 31 + n * 7 + chapter * 131;
      const x = n * 84 + 2;
      const top = house ? 177 : roof ? 184 : 153 + Math.floor(hash(seed) * 20);
      ctx.fillStyle = BUILDING[wrap(variant + n, BUILDING.length)];
      ctx.fillRect(x, top, 78, ROAD_TOP - top);
      ctx.fillStyle = '#6c6876';
      ctx.fillRect(x - 2, top, 82, 2);
      ctx.fillStyle = '#262e3d';
      ctx.fillRect(x + 72, top + 2, 6, ROAD_TOP - top - 2);
      for (let y = top + 7; y < 199; y += 12) {
        for (let wx = x + 8; wx < x + 68; wx += 15) {
          const r = hash(wx + y + seed);
          const lit = r > (house ? 0.52 : 0.42);
          const brightYellow = lit && r > 0.78;
          ctx.fillStyle = brightYellow ? '#ffe566' : lit ? '#eab764' : '#242c3b';
          ctx.fillRect(wx, y, 7, 7);
          ctx.fillStyle = brightYellow ? '#fff6b3' : lit ? '#f8d88a' : '#3e4656';
          ctx.fillRect(wx, y, 2, 7);
          ctx.fillStyle = '#3b3742';
          ctx.fillRect(wx + 3, y, 1, 7);
          if (lit) {
            ctx.fillStyle = brightYellow ? '#ffd95e' : '#c89b5a';
            ctx.fillRect(wx - 1, y + 7, 9, 1);
            reflection(ctx, wx + 3, ROAD_TOP + 2, brightYellow ? '#ffe566' : '#e6b86a', 34, 4, 0, 0.24);
          }
        }
      }
      if (roof) {
        ctx.fillStyle = '#4e5560';
        ctx.fillRect(x + 10, top - 17, 22, 15);
        ctx.fillStyle = '#7b7b82';
        ctx.fillRect(x + 9, top - 18, 24, 2);
        ctx.fillStyle = '#283240';
        ctx.fillRect(x + 13, top - 2, 2, 3);
        ctx.fillRect(x + 28, top - 2, 2, 3);
        ctx.fillStyle = '#87919c';
        ctx.fillRect(x + 52, top - 21, 1, 21);
        ctx.fillRect(x + 45, top - 17, 16, 1);
        ctx.fillStyle = '#5c5f6a';
        ctx.fillRect(x + 38, top - 7, 34, 1);
        for (let q = 0; q < 3; q++) {
          ctx.fillStyle = ['#9c8496', '#72949a', '#b5a48e'][q];
          ctx.fillRect(x + 40 + q * 10, top - 6, 5, 6);
        }
      }
      if (house) {
        ctx.fillStyle = '#65575d';
        for (let y = 0; y < 13; y++) ctx.fillRect(x + 39 - y * 3, top - 13 + y, y * 6 + 1, 1);
        ctx.fillStyle = '#3b4e46';
        ctx.fillRect(x + 4, 203, 70, 5);
        for (let q = 0; q < 8; q++) ctx.fillRect(x + 4 + q * 9, 200 - q % 3, 5, 5);
        if (variant === 0 && n === 0) {
          ctx.fillStyle = '#e6c289';
          ctx.fillRect(x + 18, 188, 28, 12);
          ctx.fillStyle = '#857462';
          ctx.fillRect(x + 20, 196, 24, 2);
          ctx.fillStyle = '#4a4240';
          ctx.fillRect(x + 25, 192, 6, 4);
          ctx.fillRect(x + 30, 191, 2, 2);
          ctx.fillRect(x + 35, 190, 2, 8);
          reflection(ctx, x + 32, 212, '#f0cc92', 43, 16, 0, 0.34);
        }
      }
      if (chapter === 1) {
        // Noodle stall awning, warm glowing counter interior, broth pot, and stools.
        ctx.fillStyle = '#8a4c5e';
        ctx.fillRect(x - 1, 185, 80, 5);
        for (let ax = x; ax < x + 78; ax += 8) {
          ctx.fillStyle = '#d99888';
          ctx.fillRect(ax, 185, 4, 5);
        }
        ctx.fillStyle = '#f5bc5e';
        ctx.fillRect(x + 6, 190, 62, 12);
        ctx.fillStyle = '#ffe594';
        ctx.fillRect(x + 12, 191, 50, 5);
        ctx.fillStyle = '#5c443e';
        ctx.fillRect(x + 6, 197, 62, 4);
        ctx.fillStyle = '#8e98a6';
        ctx.fillRect(x + 32, 192, 10, 5);
        ctx.fillStyle = '#fff0a6';
        ctx.fillRect(x + 33, 191, 8, 1);
        for (let q = 0; q < 3; q++) {
          ctx.fillStyle = '#b37468';
          ctx.fillRect(x + 12 + q * 18, 204, 8, 2);
          ctx.fillRect(x + 13 + q * 18, 206, 1, 3);
          ctx.fillRect(x + 18 + q * 18, 206, 1, 3);
        }
      }
    }
    return canvas;
  }

  private skyline(ctx: CanvasRenderingContext2D, w: number, offset: number, chapter: number): void {
    const cellWidth = 29;
    for (let i = Math.floor(offset / cellWidth) - 1; i * cellWidth - offset < w; i++) {
      const x = Math.round(i * cellWidth - offset);
      const height = Math.round(25 + hash(i + 91) * (chapter === 0 || chapter === 2 ? 65 : 30));
      ctx.fillStyle = '#2d3548';
      ctx.fillRect(x, 182 - height, 25, height);
      ctx.fillStyle = '#475266';
      ctx.fillRect(x + 2, 182 - height, 1, height);
      for (let y = 185 - height; y < 178; y += 9) {
        for (let col = 3; col < 22; col += 7) {
          const r = hash(i * 17 + y + col);
          if (r < 0.62) continue;
          ctx.fillStyle = r > 0.9 ? '#e0bd72' : '#7b7d7c';
          ctx.fillRect(x + col, y, 2, 2);
        }
      }
    }
  }

  private middle(ctx: CanvasRenderingContext2D, w: number, offset: number, chapter: number): void {
    for (let i = Math.floor(offset / 84) - 1; i * 84 - offset < w; i++) {
      const x = Math.round(i * 84 - offset);
      const y = chapter === 0 ? 148 : 168;
      ctx.fillStyle = '#333b4d';
      ctx.fillRect(x, y + Math.round(hash(i) * 10), 74, 40);
      ctx.fillStyle = '#535264';
      ctx.fillRect(x + 4, y + 4, 2, 33);
      if (chapter === 0) {
        ctx.fillStyle = '#434354';
        ctx.fillRect(x + 12, 155, 50, 16);
        drawText(ctx, 'RADIO', x + 18, 158, '#bf88a8', SIGN_SCALE);
      }
    }
  }

  private streetDetails(ctx: CanvasRenderingContext2D, chapter: number, x: number, variant: number, time: number, active: boolean): void {
    if (chapter === 0 || chapter === 1) {
      const name = chapter === 1 ? 6 + variant % 2 : variant % 6;
      this.sign(ctx, name, chapter * 8 + variant, x + 8, 162 + (variant % 2) * 5, time, active);
      if (chapter === 0 && variant % 2 === 0) {
        // Lit shopfront window with warm spill onto the wet sidewalk.
        ctx.fillStyle = '#7db0bc';
        ctx.fillRect(x + 90, 190, 52, 16);
        ctx.fillStyle = '#253547';
        for (let q = 0; q < 3; q++) {
          ctx.fillRect(x + 93 + q * 16, 193, 13, 9);
          ctx.fillStyle = '#d4f2f4';
          ctx.fillRect(x + 94 + q * 16, 194, 10, 5);
          reflection(ctx, x + 99 + q * 16, 210, '#4beeff', 38, 6, time, 0.36);
          ctx.fillStyle = '#253547';
        }
      }
      if (chapter === 1) {
        for (let q = 0; q < 3; q++) {
          const lx = x + 94 + q * 22;
          ctx.fillStyle = '#8b7172';
          ctx.fillRect(lx, 183, 1, 5);
          ctx.fillStyle = 'rgba(255,112,72,0.22)';
          ctx.fillRect(lx - 6, 186, 13, 12);
          ctx.fillStyle = '#ff6d4d';
          ctx.fillRect(lx - 4, 188, 9, 9);
          ctx.fillStyle = '#ffe58f';
          ctx.fillRect(lx - 1, 189, 3, 7);
          reflection(ctx, lx, 211, '#ff8e5e', 38, 8, time, 0.42);
        }
        this.steam(ctx, x + 39, 191, time);
        this.steam(ctx, x + 123, 191, time + 3.5);
      }
    }
    if ((chapter === 0 && variant % 2 === 1) || (chapter === 1 && variant % 2 === 1) || chapter === 6) {
      const vx = x + 114;
      ctx.drawImage(this.vending, vx - 8, 178 - 8);
      reflection(ctx, vx + 10, 211, '#5ceeff', 52, 15, time, 0.42);
    }
    if (chapter === 4 && variant % 4 === 1) {
      ctx.fillStyle = '#536068';
      ctx.fillRect(x + 88, 190, 54, 3);
      ctx.fillRect(x + 90, 193, 2, 17);
      ctx.fillRect(x + 138, 193, 2, 17);
      ctx.fillStyle = '#4e5862';
      ctx.fillRect(x + 92, 194, 44, 13);
      ctx.fillStyle = '#dfbe86';
      ctx.fillRect(x + 94, 195, 40, 2);
      reflection(ctx, x + 114, 211, '#dfbe86', 35, 14, time, 0.34);
    }
    if (chapter === 3) {
      const breeze = Math.round(Math.sin(time * 0.6 + variant));
      for (let cloth = 0; cloth < 3; cloth++) {
        ctx.fillStyle = ['#9c8496', '#72949a', '#b5a48e'][cloth];
        ctx.fillRect(x + 42 + cloth * 10 + breeze, 180, 5, 5);
      }
    }
    if (chapter === 0) this.traffic(ctx, x + 158, time);
    if (chapter !== 2 && variant === 2) {
      ctx.fillStyle = '#5a5f6c';
      ctx.fillRect(x + 70, 220, 16, 2);
      this.steam(ctx, x + 76, 220, time + 12);
    }
  }

  private sign(ctx: CanvasRenderingContext2D, name: number, id: number, x: number, y: number, time: number, active: boolean): void {
    const state = this.states[id];
    const index = wrap(state.color + id, NEON.length);
    const { canvas: picture, boxW } = this.signs[name][index];
    const age = state.age;
    let pulse = 0.94 + Math.sin(time * 0.8 + id) * 0.06;
    if (age < SIGN_SECONDS) {
      pulse = age < 0.35 ? 1 : age < 0.65 ? 0.42 : 0.42 + ((age - 0.65) / (SIGN_SECONDS - 0.65)) * 0.58;
    }

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = pulse;
    ctx.drawImage(picture, x - HALO_PAD, y - HALO_PAD);
    if (age < FLASH_SECONDS) {
      const flash = 1 - age / FLASH_SECONDS;
      ctx.globalAlpha = flash * 0.78;
      ctx.drawImage(picture, x - HALO_PAD, y - HALO_PAD);
      drawText(ctx, SIGN_NAMES[name], x + 4, y + 4, NEON_CORE[index], SIGN_SCALE);
    }
    ctx.globalAlpha = prevAlpha;

    reflection(ctx, x + boxW / 2, ROAD_TOP + 3, NEON[index], 56, Math.max(10, boxW * 0.52), time, 0.44);
    // Compact side icon when the building still has room beside the sign.
    if (boxW <= 56) {
      ctx.fillStyle = NEON[index];
      const ix = x + boxW + 3;
      if (name % 3 === 0) {
        ctx.fillRect(ix, y + 5, 6, 5);
        ctx.fillRect(ix + 6, y + 6, 2, 3);
      } else if (name % 3 === 1) {
        ctx.fillRect(ix, y + 8, 8, 2);
        ctx.fillRect(ix + 6, y + 6, 2, 6);
      } else {
        ctx.fillRect(ix, y + 5, 3, 2);
        ctx.fillRect(ix + 4, y + 5, 3, 2);
        ctx.fillRect(ix + 1, y + 7, 5, 2);
        ctx.fillRect(ix + 3, y + 9, 1, 1);
      }
    }
    if (active && this.hitCount < MAX_HITS) {
      const hit = this.hits[this.hitCount++];
      hit.x = x;
      hit.y = y;
      hit.w = boxW + (boxW <= 56 ? 12 : 0);
      hit.id = id;
    }
  }

  private traffic(ctx: CanvasRenderingContext2D, x: number, time: number): void {
    const phase = trafficPhase(time);
    ctx.fillStyle = '#484e5a';
    ctx.fillRect(x, 186, 2, 24);
    ctx.fillStyle = '#171f2c';
    ctx.fillRect(x - 3, 171, 8, 16);
    for (let i = 0; i < 3; i++) {
      const activeColor = ['#ff4b5e', '#ffbe3b', '#4ce08a'][i];
      ctx.fillStyle = i === phase ? activeColor : '#45404a';
      ctx.fillRect(x - 1, 173 + i * 4, 4, 3);
      if (i === phase) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x - 3, 171 + i * 4, 8, 7);
        ctx.globalAlpha = prev;
        reflection(ctx, x + 1, 211, activeColor, 34, 5, time, 0.38);
      }
    }
  }

  private lamps(ctx: CanvasRenderingContext2D, w: number, offset: number, chapter: number, time: number): void {
    const spacing = chapter === 4 || chapter === 6 ? 238 : 164;
    for (let i = Math.floor(offset / spacing) - 1; i * spacing - offset < w; i++) {
      const x = Math.round(i * spacing - offset);
      ctx.fillStyle = '#44505c';
      ctx.fillRect(x, 164, 3, 69);
      ctx.fillRect(x - 13, 163, 16, 3);
      ctx.fillStyle = '#ffe599';
      ctx.fillRect(x - 12, 166, 9, 2);
      ctx.fillStyle = 'rgba(255,220,145,0.06)';
      for (let y = 171; y < 226; y += 5) {
        ctx.fillRect(x - 10 - Math.floor((y - 171) / 8), y, 8 + Math.floor((y - 171) / 4), 5);
      }
      reflection(ctx, x - 8, 229, '#f2cc88', 40, 14, time, 0.36);
    }
  }

  private steam(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    for (let q = 0; q < 7; q++) {
      const rise = wrap(time * 4.5 + q * 4, 28);
      const fade = 1 - rise / 28;
      ctx.fillStyle = `rgba(225,235,245,${(0.14 + fade * 0.34).toFixed(2)})`;
      const sx = Math.round(x + Math.sin(time * 0.9 + q * 1.1) * 4 - rise / 9);
      const sy = Math.round(y - rise);
      ctx.fillRect(sx, sy, 3 + Math.floor(rise / 7), 2);
    }
  }

  private river(ctx: CanvasRenderingContext2D, w: number, scroll: number, time: number): void {
    ctx.fillStyle = '#20323e';
    ctx.fillRect(0, 185, w, 61);
    const skylineOffset = scroll * 0.08;
    for (let cell = Math.floor(skylineOffset / 29) - 1; cell * 29 - skylineOffset < w; cell++) {
      const x = Math.round(cell * 29 - skylineOffset);
      const height = Math.round(25 + hash(cell + 91) * 65);
      ctx.fillStyle = '#2b3846';
      for (let row = 0; row < height * 0.6; row += 3) {
        ctx.fillRect(x + Math.round(Math.sin(row + time) * 2), 187 + row, 25, 2);
      }
      for (let y = 185 - height; y < 178; y += 9) {
        for (let col = 3; col < 22; col += 7) {
          if (hash(cell * 17 + y + col) < 0.62) continue;
          reflection(ctx, x + col, 187 + Math.round((182 - y) * 0.6), '#a59e88', 14, 2, time, 0.28);
        }
      }
    }
    for (let q = 0; q < 95; q++) {
      const x = Math.round(wrap(hash(q + 9) * w - scroll * 0.19, w));
      const y = 187 + Math.floor(hash(q + 66) * 51);
      ctx.fillStyle = q % 3 ? '#384852' : '#73747c';
      ctx.fillRect(x, y, 3 + q % 7, 1);
    }
    const bx = Math.round(wrap(w * 0.6 - scroll * 0.18 + time * 0.7, w + 90) - 45);
    ctx.fillStyle = '#171f2a';
    ctx.fillRect(bx - 25, 208, 56, 6);
    ctx.fillRect(bx + 9, 202, 14, 6);
    ctx.fillStyle = '#f2cc88';
    ctx.fillRect(bx + 14, 203, 5, 3);
    reflection(ctx, bx + 16, 215, '#f2cc88', 26, 9, time, 0.38);
    ctx.fillStyle = '#47525f';
    ctx.fillRect(0, 229, w, 3);
    ctx.fillRect(0, 247, w, 3);
    for (let x = -Math.round(wrap(scroll, 28)); x < w; x += 28) ctx.fillRect(x, 232, 2, 16);
  }

  private crossing(ctx: CanvasRenderingContext2D, w: number, progress: number, time: number): void {
    const train = progress >= TRAIN_ENTER && progress < TRAIN_EXIT;
    if (train) {
      const totalLength = TRAIN_CARS * TRAIN_CAR_WIDTH;
      const travel = (progress - TRAIN_ENTER) / (TRAIN_EXIT - TRAIN_ENTER) * (w + totalLength + TRAIN_CAR_WIDTH) + this.trainExtra;
      const front = w + TRAIN_CAR_WIDTH - travel;
      for (let car = 0; car < TRAIN_CARS; car++) {
        const x = Math.round(front + car * TRAIN_CAR_WIDTH);
        if (x > w || x + TRAIN_CAR_WIDTH < 0) continue;
        ctx.fillStyle = '#505966';
        ctx.fillRect(x, 164, 83, 41);
        ctx.fillStyle = '#858584';
        ctx.fillRect(x + 2, 164, 79, 2);
        ctx.fillStyle = '#2d3745';
        ctx.fillRect(x, 199, 83, 6);
        for (let q = 0; q < 5; q++) {
          ctx.fillStyle = '#f0d69c';
          ctx.fillRect(x + 5 + q * 15, 174, 10, 14);
          ctx.fillStyle = '#8e8c82';
          ctx.fillRect(x + 8 + q * 15, 184, 4, 4);
          reflection(ctx, x + 10 + q * 15, 211, '#f0d69c', 45, 9, time, 0.36);
        }
      }
    }
    const down = Math.min(1, Math.max(0, (progress - 0.12) / 0.04)) * (1 - Math.min(1, Math.max(0, (progress - 0.64) / 0.05)));
    ctx.fillStyle = '#c4bab1';
    ctx.fillRect(64, 193, 5, 25);
    for (let q = 0; q < 32; q++) {
      ctx.fillStyle = q % 4 < 2 ? '#d67474' : '#e6d8bd';
      ctx.fillRect(66 + Math.round(q * 3 * down), 193 - Math.round(q * 2.4 * (1 - down)), 4, 3);
    }
    if (down > 0) {
      for (let side = 0; side < 2; side++) {
        const a = (0.55 + 0.3 * Math.sin(time * Math.PI + side * Math.PI)).toFixed(2);
        ctx.fillStyle = `rgba(255,75,90,${a})`;
        ctx.fillRect(58 + side * 12, 186, 5, 4);
        reflection(ctx, 61 + side * 12, 220, '#ff4b5e', 34, 7, time, 0.42);
      }
    }
  }
}
