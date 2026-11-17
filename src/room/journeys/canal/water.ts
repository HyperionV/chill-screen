import { css, mix, type RGB } from '../../../render/color';
import type { SkyState } from '../../sky';
import { hash } from '../noise';
import {
  BRIDGE_XS,
  CHAPTER_START,
  HARBOUR_BOAT_SPOTS,
  HARBOUR_HOUSE_SPOTS,
  HARBOUR_LAMP_XS,
  HARBOUR_TOWER_X,
  LOCK,
  wrapDelta,
} from './chapters';
import type { CanalSprites } from './sprites';

const DECK_Y = 0.945;
const WHITE: RGB = [255, 255, 255];

export interface WaterBlock {
  waterTop: string;
  waterDeep: string;
}

export interface SmokePuff {
  wx: number;
  y: number;
  age: number;
  life: number;
  drift: number;
}

interface DripDrop {
  x: number;
  y: number;
  vy: number;
}

/** Renders canal water, reflections, bow wave & barge wake, overhead stone bridges, night lights, and gunwale. */
export class CanalWater {
  private readonly bridgeDrips: DripDrop[] = Array.from({ length: 10 }, (_, i) => ({
    x: 34 + i * 44,
    y: 35 + (i % 3) * 32,
    vy: 34 + (i % 3) * 9,
  }));

  drawWater(
    ctx: CanvasRenderingContext2D,
    landCanvas: HTMLCanvasElement,
    blocks: readonly WaterBlock[],
    state: SkyState,
    dt: number,
    time: number,
    scroll: number,
    effectiveSpeed: number,
    shoreDesignY: number,
    bridgeShade: number,
    pointer: { x: number; y: number } | null,
    w: number,
    h: number,
    unit: number,
  ): void {
    const shorePx = Math.round(shoreDesignY * unit);
    const deckPx = Math.round(h * DECK_Y);

    for (let x = 0; x < w; x++) {
      const b = blocks[x >> 3];
      const mid = Math.round((deckPx - shorePx) * 0.45);
      ctx.fillStyle = b.waterTop;
      ctx.fillRect(x, shorePx, 1, mid);
      ctx.fillStyle = b.waterDeep;
      ctx.fillRect(x, shorePx + mid, 1, deckPx - shorePx - mid);
    }

    // Rippled reflection of the far bank
    const waterH = Math.max(4, deckPx - shorePx);
    const strip = 2;
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.imageSmoothingEnabled = false;
    for (let dy = 0; dy < waterH; dy += strip) {
      const srcY = Math.max(0, shorePx - Math.round(dy * 0.85) - strip);
      let wave = Math.sin(time * 2.1 + dy * 0.35 + scroll * 0.04) * (0.7 + dy * 0.03);
      if (pointer && pointer.y >= shorePx - 6 && Math.abs(pointer.y - (shorePx + dy)) < 16 * unit) {
        wave += Math.sin((pointer.y - (shorePx + dy)) * 0.4 + time * 6) * 2.2;
      }
      ctx.drawImage(landCanvas, 0, srcY, w, strip, Math.round(wave * unit), shorePx + dy, w, strip);
    }
    ctx.restore();

    // Sun / moon shimmer column
    if (state.sun.up > 0 || state.moon.up > 0.1) {
      const u = state.sun.up > 0 ? state.sun.u : state.moon.u;
      const sx = Math.round(u * w);
      ctx.fillStyle = state.sun.up > 0 ? css(mix(state.sky.light, WHITE, 0.35), 0.25) : 'rgba(205,220,255,0.18)';
      for (let dy = 2; dy < waterH - 4; dy += 4) {
        const sw = Math.round((6 + Math.sin(time * 2 + dy) * 3) * unit);
        ctx.fillRect(sx - Math.round(sw / 2), shorePx + dy, sw, 1);
      }
    }

    // Surface light glints
    ctx.fillStyle = css(mix(state.sky.horizon, WHITE, 0.5), 0.5);
    for (let q = 0; q < 26; q++) {
      const pulse = Math.sin(time * (0.8 + hash(q) * 1.1) + hash(q + 5) * 6.28);
      if (pulse < 0.35) continue;
      const gx = (((hash(q + 2) * w * 1.3 - scroll * unit * 0.6) % w) + w) % w | 0;
      const gy = shorePx + Math.round(hash(q + 7) * (waterH - 8));
      ctx.fillRect(gx, gy, Math.round((2 + hash(q + 9) * 3) * unit), 1);
    }

    // Gentle bow wave (right/front) & trailing barge wake (left/rear) in foreground water
    this.drawBowAndWake(ctx, time, scroll, effectiveSpeed, deckPx, w, unit);

    // Dim cool shade & dancing water caustics when passing under Chapter 5 stone bridges
    if (bridgeShade > 0.02) {
      ctx.fillStyle = `rgba(10,16,26,${(bridgeShade * 0.38).toFixed(3)})`;
      ctx.fillRect(0, 0, w, deckPx);

      ctx.fillStyle = `rgba(182,234,242,${(bridgeShade * 0.42).toFixed(3)})`;
      for (let i = 0; i < 10; i++) {
        const cx = Math.round(((i * 48 + Math.sin(time * 2.2 + i) * 12) % Math.max(1, w / unit)) * unit);
        const cy = shorePx + Math.round((6 + ((i * 7) % 28)) * unit);
        ctx.fillRect(cx, cy, Math.round(10 * unit), Math.max(1, Math.round(unit)));
      }
      ctx.fillStyle = `rgba(215,245,252,${(bridgeShade * 0.65).toFixed(3)})`;
      for (const d of this.bridgeDrips) {
        d.y += d.vy * dt;
        if (d.y > shoreDesignY + 12) d.y = 26;
        ctx.fillRect(Math.round(d.x * unit), Math.round(d.y * unit), Math.max(1, Math.round(unit)), Math.max(2, Math.round(2.5 * unit)));
      }
    }
  }

  private drawBowAndWake(
    ctx: CanvasRenderingContext2D,
    time: number,
    scroll: number,
    effectiveSpeed: number,
    deckPx: number,
    w: number,
    unit: number,
  ): void {
    const dot = Math.max(1, Math.round(unit));
    const speedK = Math.min(1.5, effectiveSpeed);

    // Subtle waterline hull lap even when still
    ctx.fillStyle = 'rgba(220,242,250,0.28)';
    for (let i = 0; i < 14; i++) {
      const lx = Math.round(((i * 36 + Math.sin(time * 1.6 + i) * 5) % Math.max(1, w / unit)) * unit);
      ctx.fillRect(lx, deckPx - dot * 2, Math.round(11 * unit), dot);
    }

    if (speedK <= 0.04) return;

    // Gentle bow wave fanning backward from the right-hand bow edge
    const bowStart = Math.round(w * 0.64);
    const bowSpan = Math.max(1, w - bowStart);
    ctx.fillStyle = `rgba(236,248,255,${(0.42 * Math.min(1, speedK)).toFixed(3)})`;
    for (let row = 0; row < 3; row++) {
      const segs = 9;
      for (let s = 0; s < segs; s++) {
        const frac = s / segs;
        const x = Math.round(bowStart + frac * bowSpan - ((time * 18 * speedK + row * 11) % 24) * unit);
        if (x < bowStart - 20 * unit || x >= w) continue;
        const rise = (1 - frac) * (6 + row * 3.5) * unit + Math.sin(time * 3.5 + s + row) * unit;
        const y = Math.round(deckPx - dot - rise);
        const len = Math.round((7 + (1 - frac) * 5) * unit);
        ctx.fillRect(x, y, len, dot);
      }
    }

    // Trailing diagonal V-wake ripples behind the barge toward the left
    ctx.fillStyle = `rgba(218,240,250,${(0.32 * Math.min(1, speedK)).toFixed(3)})`;
    for (let i = 0; i < 16; i++) {
      const phase = ((i * 32 - scroll * 1.35) % Math.max(1, w / unit) + w / unit) % (w / unit);
      const wx = Math.round(phase * unit);
      const rearDist = 1 - Math.min(1, wx / (w * 0.88));
      const wy = Math.round(deckPx - (3 + (i % 4) * 2.6 + rearDist * 6) * unit + Math.sin(time * 2.4 + i) * unit);
      const len = Math.round((8 + rearDist * 9) * unit);
      ctx.fillRect(wx, wy, len, dot);
      if (i % 3 === 0) {
        ctx.fillRect(wx + Math.round(3 * unit), wy - dot, Math.round(len * 0.55), dot);
      }
    }
  }

  /** Draws overhead stone bridge arches (Ch 5), chimney smoke, night lights, and the foreground barge gunwale. */
  drawOverlay(
    ctx: CanvasRenderingContext2D,
    sprites: CanalSprites,
    smoke: readonly SmokePuff[],
    state: SkyState,
    time: number,
    scroll: number,
    shoreDesignY: number,
    lockLiftDesign: number,
    w: number,
    h: number,
    unit: number,
  ): void {
    const night = 1 - state.day;
    const designW = w / unit;
    const shorePx = Math.round(shoreDesignY * unit);
    const deckPx = Math.round(h * DECK_Y);

    // Chimney smoke
    ctx.fillStyle = night > 0.5 ? 'rgba(180,190,210,0.28)' : 'rgba(240,242,244,0.45)';
    for (const p of smoke) {
      const dx = wrapDelta(p.wx, scroll);
      if (dx < -20 || dx > designW + 20) continue;
      const sx = Math.round(dx * unit);
      const sy = Math.round((shoreDesignY - 36 + p.y) * unit);
      const sz = Math.max(1, Math.round((1.5 + (p.age / p.life) * 2.5) * unit));
      ctx.fillRect(sx, sy, sz, sz);
    }

    // Warm lights at dusk/night
    if (night > 0.15) {
      this.drawNightLights(ctx, sprites, time, scroll, designW, shorePx, lockLiftDesign, unit, Math.min(1, (night - 0.15) / 0.5));
    }

    // Overhead arched stone bridges in Chapter 5 passing over the barge
    this.drawOverheadBridges(ctx, scroll, designW, shoreDesignY, w, deckPx, unit);

    // Low wooden barge gunwale along the bottom edge
    ctx.fillStyle = '#3b291c';
    ctx.fillRect(0, deckPx, w, h - deckPx);
    ctx.fillStyle = '#63462f';
    ctx.fillRect(0, deckPx, w, Math.max(2, Math.round(2 * unit)));
    const cleatX = Math.round(w * 0.14);
    ctx.fillStyle = '#b48a34';
    ctx.fillRect(cleatX, deckPx - Math.max(1, Math.round(unit)), Math.round(7 * unit), Math.max(2, Math.round(2 * unit)));
  }

  private drawOverheadBridges(
    ctx: CanvasRenderingContext2D,
    scroll: number,
    designW: number,
    shoreDesignY: number,
    w: number,
    deckPx: number,
    unit: number,
  ): void {
    const center = designW * 0.5;
    const dot = Math.max(1, Math.round(unit));

    for (const bx of BRIDGE_XS) {
      const dx = wrapDelta(bx, scroll);
      const offset = dx - center;
      if (Math.abs(offset) >= 185) continue;

      const proximity = Math.max(0, 1 - Math.abs(offset) / 175);
      const archCenterPx = Math.round((center + offset * 1.85) * unit);
      const archHalfSpan = Math.round((68 + proximity * 155) * unit);
      const crownY = Math.round((56 - proximity * 36) * unit);
      const springY = Math.min(deckPx, Math.round((shoreDesignY + 14) * unit));
      const bridgeTopY = Math.max(0, crownY - Math.round((16 + proximity * 10) * unit));
      const pierExtra = Math.round((32 + proximity * 24) * unit);

      const xStart = Math.max(0, archCenterPx - archHalfSpan - pierExtra);
      const xEnd = Math.min(w - 1, archCenterPx + archHalfSpan + pierExtra);
      if (xEnd <= xStart) continue;

      for (let x = xStart; x <= xEnd; x += dot) {
        const dist = Math.abs(x - archCenterPx);
        const colW = Math.min(dot, xEnd - x + 1);
        const courseShade = ((Math.floor(x / (dot * 6)) & 1) === 0);

        if (dist < archHalfSpan) {
          const u = dist / archHalfSpan;
          const archY = Math.round(crownY + (springY - crownY) * u * u);
          if (archY > bridgeTopY) {
            ctx.fillStyle = courseShade ? '#595d62' : '#4f5358';
            ctx.fillRect(x, bridgeTopY, colW, archY - bridgeTopY);
            // Stone voussoir arch ring
            const ringH = Math.min(Math.round(5 * unit), archY - bridgeTopY);
            ctx.fillStyle = Math.floor(dist / (dot * 5)) % 2 === 0 ? '#74787c' : '#3a3e44';
            ctx.fillRect(x, archY - ringH, colW, ringH);
          }
          // Soft dim arch shadow directly underneath the span
          if (proximity > 0.2 && springY > archY) {
            ctx.fillStyle = `rgba(10,15,24,${(0.28 * proximity).toFixed(3)})`;
            ctx.fillRect(x, archY, colW, springY - archY);
          }
        } else {
          // Left and right stone masonry abutments
          ctx.fillStyle = courseShade ? '#4d5156' : '#43474c';
          ctx.fillRect(x, bridgeTopY, colW, springY - bridgeTopY);
        }

        // Top parapet coping & hanging ivy tufts
        ctx.fillStyle = '#7c807c';
        ctx.fillRect(x, bridgeTopY, colW, Math.max(2, dot * 2));
        if (hash(Math.floor(x / (dot * 4)) + bx) > 0.84) {
          ctx.fillStyle = '#43683a';
          ctx.fillRect(x, bridgeTopY + dot * 2, colW, Math.round(3 * unit));
        }
      }
    }
  }

  private drawNightLights(
    ctx: CanvasRenderingContext2D,
    sprites: CanalSprites,
    time: number,
    scroll: number,
    designW: number,
    shorePx: number,
    lockLiftDesign: number,
    unit: number,
    a: number,
  ): void {
    // Harbour lamp posts
    for (const wx of HARBOUR_LAMP_XS) {
      const dx = wrapDelta(wx, scroll);
      if (dx > -25 && dx < designW + 25) {
        const lx = Math.round(dx * unit);
        const ly = shorePx - Math.round(27 * unit);
        ctx.fillStyle = `rgba(255,216,124,${(0.88 * a).toFixed(3)})`;
        ctx.fillRect(lx - Math.round(1.5 * unit), ly, Math.round(3 * unit), Math.round(3 * unit));
        ctx.fillStyle = `rgba(255,205,100,${(0.18 * a).toFixed(3)})`;
        ctx.fillRect(lx - Math.round(5 * unit), ly - Math.round(3 * unit), Math.round(10 * unit), Math.round(9 * unit));
      }
    }

    // Harbour tower lantern + gentle sweeping beam
    const towerDx = wrapDelta(HARBOUR_TOWER_X, scroll);
    if (towerDx > -45 && towerDx < designW + 45) {
      const lx = Math.round(towerDx * unit);
      const ly = shorePx - Math.round(61 * unit);
      const pulse = 0.7 + 0.3 * Math.sin(time * 1.4);
      ctx.fillStyle = `rgba(255,235,154,${(0.92 * a * pulse).toFixed(3)})`;
      ctx.fillRect(lx - Math.round(2.5 * unit), ly, Math.round(5 * unit), Math.round(4 * unit));
      const beamDir = Math.sin(time * 0.9);
      const beamW = Math.round(beamDir * 28 * unit);
      ctx.fillStyle = `rgba(255,232,150,${(0.14 * a * Math.abs(beamDir)).toFixed(3)})`;
      ctx.fillRect(beamW >= 0 ? lx : lx + beamW, ly - Math.round(2 * unit), Math.abs(beamW), Math.round(8 * unit));
    }

    // Fishing boat hanging stern lamps
    for (const spot of HARBOUR_BOAT_SPOTS) {
      if (spot.kind !== 2) continue;
      const dx = wrapDelta(spot.wx, scroll);
      if (dx > -65 && dx < designW + 65) {
        const boat = sprites.harbour.fishingBoat;
        const lx = Math.round((dx - boat.w * 0.5 + boat.lampX) * unit);
        const ly = shorePx + Math.round((8 - boat.h + boat.lampY) * unit);
        ctx.fillStyle = `rgba(255,220,126,${(0.9 * a).toFixed(3)})`;
        ctx.fillRect(lx - Math.round(unit), ly, Math.round(3 * unit), Math.round(3 * unit));
        ctx.fillStyle = `rgba(255,205,100,${(0.2 * a).toFixed(3)})`;
        ctx.fillRect(lx - Math.round(4 * unit), ly - Math.round(3 * unit), Math.round(9 * unit), Math.round(9 * unit));
      }
    }

    // Cottage & harbour house warm lit windows
    ctx.fillStyle = `rgba(255,212,118,${(0.85 * a).toFixed(3)})`;
    this.paintCottageWindows(ctx, LOCK.cottageX, sprites.lockCottage, 18 + lockLiftDesign, scroll, designW, shorePx, unit);
    this.paintCottageWindows(ctx, CHAPTER_START[2] + 920, sprites.cottages[0], 6, scroll, designW, shorePx, unit);
    this.paintCottageWindows(ctx, CHAPTER_START[2] + 1520, sprites.cottages[1], 6, scroll, designW, shorePx, unit);
    for (const spot of HARBOUR_HOUSE_SPOTS) {
      const house = sprites.harbour.houses[spot.variant % sprites.harbour.houses.length];
      this.paintCottageWindows(ctx, spot.wx, house, 6, scroll, designW, shorePx, unit);
    }
  }

  private paintCottageWindows(
    ctx: CanvasRenderingContext2D,
    wx: number,
    sprite: { w: number; h: number; windows: readonly { x: number; y: number; w: number; h: number }[] },
    lift: number,
    scroll: number,
    designW: number,
    shorePx: number,
    unit: number,
  ): void {
    const dx = wrapDelta(wx, scroll);
    if (dx < -45 || dx > designW + 45) return;
    const base = shorePx - Math.round(lift * unit);
    const left = Math.round((dx - sprite.w * 0.5) * unit);
    const top = Math.round(base - sprite.h * unit);
    for (const win of sprite.windows) {
      ctx.fillRect(left + Math.round(win.x * unit), top + Math.round(win.y * unit), Math.round(win.w * unit), Math.round(win.h * unit));
    }
  }
}
