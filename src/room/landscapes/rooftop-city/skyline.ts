import { css, mix, shade, type RGB } from '../../../render/color';
import type { SkyState } from '../../sky';
import { clamp01 } from '../../sky';
import { drawHalo, type HaloSprites } from './light-halos';
import {
  FAR_PARALLAX,
  FAR_SPAN,
  MID_PARALLAX,
  MID_SPAN,
  NEAR_ROOF_PARALLAX,
  NEAR_ROOF_SPAN,
  wrapCoord,
  wrapDelta,
  type CityLayout,
  type MidBuilding,
  type NearRoof,
  type WindowSlot,
} from './scenes';
import type { RooftopSprites } from './sprites';

const FAR_BASE: RGB = [74, 84, 112];
const DAWN_HAZE: RGB = [204, 146, 157];
const DAWN_HUE_STRENGTH = 0.19;

const MID_TONES: readonly RGB[] = [
  [96, 82, 86],   // warm brick
  [78, 88, 102],  // slate concrete
  [104, 96, 88],  // sandstone
];

const NEAR_TONES: readonly RGB[] = [
  [124, 76, 66],  // terracotta brick
  [86, 92, 104],  // weathered concrete
];

const WINDOW_GLOW: readonly RGB[] = [
  [255, 214, 134], // warm tungsten
  [255, 236, 188], // soft cream
  [148, 218, 238], // cool TV/monitor glow
];

interface Heli {
  x: number;
  y: number;
  vx: number;
  phase: number;
}

interface TrafficCar {
  x: number;
  lane: 0 | 1;
  speed: number;
  color: string;
}

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draws the layered city skyline behind the foreground rooftop:
 * far hazy skyscrapers, sky traffic (blimp & helicopters), mid-far city blocks with
 * toggleable windows, distant avenue traffic, and mid-near neighbouring roofs.
 */
export class Skyline {
  private readonly windowOverrides = new Map<number, boolean>();
  private blimpX = 155;
  private blimpRect: ScreenRect | null = null;

  private readonly helis: Heli[] = [
    { x: 110, y: 56, vx: 11, phase: 0.4 },
    { x: 470, y: 66, vx: -9.5, phase: 2.3 },
  ];

  private readonly cars: TrafficCar[] = Array.from({ length: 14 }, (_, i) => ({
    x: (i * 97) % MID_SPAN,
    lane: i % 2 === 0 ? 0 : 1,
    speed: i % 2 === 0 ? 19 + (i % 3) * 4 : -(17 + (i % 4) * 3),
    color: i % 3 === 0 ? '#788496' : i % 3 === 1 ? '#9e584e' : '#b8a882',
  }));

  constructor(private readonly layout: CityLayout) {}

  step(dt: number): void {
    this.blimpX = wrapCoord(this.blimpX + 5.2 * dt, FAR_SPAN);
    for (const h of this.helis) {
      h.x = wrapCoord(h.x + h.vx * dt, FAR_SPAN);
    }
    for (const c of this.cars) {
      c.x = wrapCoord(c.x + c.speed * dt, MID_SPAN);
    }
  }

  /** Screen-space bounds of the blimp (in design coordinates) for click detection. */
  getBlimpRect(): ScreenRect | null {
    return this.blimpRect;
  }

  /** Draws far towers, mid-far buildings, avenue traffic, and mid-near roofs onto the land canvas. */
  drawPreTint(
    L: CanvasRenderingContext2D,
    state: SkyState,
    hour: number,
    camX: number,
    designW: number,
    designH: number,
    unit: number,
    sprites: RooftopSprites,
  ): void {
    const halfW = designW * 0.5;
    const farCam = camX * FAR_PARALLAX;
    const dawn = Math.max(0, 1 - Math.abs(hour - 6.3) / 1.8);
    const farColor = mix(mix(FAR_BASE, state.sky.horizon, 0.52), DAWN_HAZE, dawn * DAWN_HUE_STRENGTH);

    // Layer 1: Far skyscrapers
    L.fillStyle = css(farColor);
    for (const t of this.layout.farTowers) {
      const sx = wrapDelta(t.x, farCam, FAR_SPAN) + halfW;
      if (sx + t.w < -12 || sx > designW + 12) continue;
      const dx = Math.round(sx * unit);
      const dy = Math.round(t.topY * unit);
      const dw = Math.max(2, Math.round(t.w * unit));
      const dh = Math.round((designH - t.topY) * unit);
      L.fillRect(dx, dy, dw, dh);
      if (t.hasSpire) {
        const spX = Math.round((sx + t.w * 0.5) * unit);
        const spH = Math.round(10 * unit);
        L.fillRect(spX, dy - spH, Math.max(1, Math.round(unit)), spH);
      }
    }

    // Layer 2 (pre-tint): Blimp & helicopters in upper sky
    this.drawSkyTrafficPreTint(L, farCam, halfW, designW, unit, sprites);

    // Layer 3: Mid-far city buildings + dark window recesses
    const midCam = camX * MID_PARALLAX;
    for (const b of this.layout.midBuildings) {
      const sx = wrapDelta(b.x, midCam, MID_SPAN) + halfW;
      if (sx + b.w < -16 || sx > designW + 16) continue;
      this.drawMidBuilding(L, b, sx, designH, unit);
    }

    // Distant avenue roadbed far below (visible through gaps and Scene 2 overlook)
    const roadY = Math.round(199 * unit);
    L.fillStyle = '#2d313d';
    L.fillRect(0, roadY, Math.round(designW * unit), Math.round(14 * unit));
    L.fillStyle = '#484e5e';
    L.fillRect(0, roadY, Math.round(designW * unit), Math.max(1, Math.round(unit)));
    for (const c of this.cars) {
      const sx = wrapDelta(c.x, midCam, MID_SPAN) + halfW;
      if (sx < -10 || sx > designW + 10) continue;
      const cy = Math.round((c.lane === 0 ? 202 : 206) * unit);
      L.fillStyle = c.color;
      L.fillRect(Math.round(sx * unit), cy, Math.max(3, Math.round(4 * unit)), Math.max(2, Math.round(2 * unit)));
    }

    // Layer 4: Mid-near neighbouring rooftops
    const nearCam = camX * NEAR_ROOF_PARALLAX;
    for (const r of this.layout.nearRoofs) {
      const sx = wrapDelta(r.x, nearCam, NEAR_ROOF_SPAN) + halfW;
      if (sx + r.w < -16 || sx > designW + 16) continue;
      this.drawNearRoof(L, r, sx, designH, unit);
    }
  }

  /** Draws post-tint glowing windows, beacons, blimp lights, and distant traffic lights directly onto `ctx`. */
  drawPostTint(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    time: number,
    camX: number,
    designW: number,
    unit: number,
    sprites: RooftopSprites,
    halos: HaloSprites,
  ): void {
    const halfW = designW * 0.5;
    const night = 1 - state.day;
    const farCam = camX * FAR_PARALLAX;

    // Far spire aircraft beacons (calm slow pulse <= 0.45 Hz)
    if (night > 0.2) {
      for (const t of this.layout.farTowers) {
        if (!t.hasSpire) continue;
        const sx = wrapDelta(t.x, farCam, FAR_SPAN) + halfW;
        if (sx + t.w < -8 || sx > designW + 8) continue;
        const pulse = Math.sin(time * 2.4 + t.beaconPhase);
        if (pulse < 0.25) continue;
        drawHalo(ctx, halos.beaconRed, sx + t.w * 0.5, t.topY - 11, unit, 0.52 * night);
      }
    }

    // Blimp cabin & banner glow + helicopter nav lights
    if (night > 0.15) {
      const bx = wrapDelta(this.blimpX, farCam, FAR_SPAN) + halfW;
      if (bx + sprites.blimp.w >= -10 && bx <= designW + 10) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, night * 1.15);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sprites.blimpGlow.canvas,
          Math.round(bx * unit),
          Math.round(38 * unit),
          Math.round(sprites.blimpGlow.w * unit),
          Math.round(sprites.blimpGlow.h * unit),
        );
        ctx.restore();
      }
    }

    for (const h of this.helis) {
      const sx = wrapDelta(h.x, farCam, FAR_SPAN) + halfW;
      if (sx < -30 || sx > designW + 30) continue;
      // Animated rotor blur line
      const rotorSpan = Math.round((6 + Math.abs(Math.sin(time * 28 + h.phase)) * 18) * unit);
      const rcx = Math.round((sx + 14) * unit);
      const rcy = Math.round(h.y * unit);
      ctx.fillStyle = `rgba(210, 220, 236, ${(0.35 + 0.35 * state.day).toFixed(2)})`;
      ctx.fillRect(rcx - Math.round(rotorSpan * 0.5), rcy, Math.max(2, rotorSpan), Math.max(1, Math.round(unit)));
      if (Math.sin(time * 4.2 + h.phase) > 0.35) {
        ctx.fillStyle = 'rgba(255, 104, 88, 0.9)';
        ctx.fillRect(Math.round((sx + 4) * unit), Math.round((h.y + 4) * unit), Math.max(1, Math.round(unit)), Math.max(1, Math.round(unit)));
      }
    }

    // Mid-far building lit windows
    const midCam = camX * MID_PARALLAX;
    for (const b of this.layout.midBuildings) {
      const sx = wrapDelta(b.x, midCam, MID_SPAN) + halfW;
      if (sx + b.w < -16 || sx > designW + 16) continue;
      this.drawLitWindows(ctx, b.windows, sx, b.topY, night, unit);
    }

    // Distant avenue car headlights & taillights
    for (const c of this.cars) {
      const sx = wrapDelta(c.x, midCam, MID_SPAN) + halfW;
      if (sx < -10 || sx > designW + 10) continue;
      const cy = Math.round((c.lane === 0 ? 202 : 206) * unit);
      const cx = Math.round(sx * unit);
      const cw = Math.max(3, Math.round(4 * unit));
      const headX = c.speed > 0 ? cx + cw : cx - 1;
      const tailX = c.speed > 0 ? cx - 1 : cx + cw;
      const glowA = 0.35 + 0.55 * night;
      ctx.fillStyle = `rgba(255, 240, 178, ${glowA.toFixed(2)})`;
      ctx.fillRect(headX, cy, Math.max(1, Math.round(unit)), Math.max(1, Math.round(unit)));
      ctx.fillStyle = `rgba(246, 78, 74, ${glowA.toFixed(2)})`;
      ctx.fillRect(tailX, cy, Math.max(1, Math.round(unit)), Math.max(1, Math.round(unit)));
    }

    // Mid-near roof windows
    const nearCam = camX * NEAR_ROOF_PARALLAX;
    for (const r of this.layout.nearRoofs) {
      const sx = wrapDelta(r.x, nearCam, NEAR_ROOF_SPAN) + halfW;
      if (sx + r.w < -16 || sx > designW + 16) continue;
      this.drawLitWindows(ctx, r.windows, sx, r.topY, night, unit);
    }
  }

  /** Toggles any window under stage point `(dx, dy)` in design pixels. Returns true if a window was hit. */
  toggleWindowAt(
    dx: number,
    dy: number,
    camX: number,
    designW: number,
    night: number,
  ): boolean {
    const halfW = designW * 0.5;
    const hitMargin = 2.5;

    // Check nearer roofs first so foreground windows win over buildings behind them.
    const nearCam = camX * NEAR_ROOF_PARALLAX;
    for (const r of this.layout.nearRoofs) {
      const sx = wrapDelta(r.x, nearCam, NEAR_ROOF_SPAN) + halfW;
      if (dx < sx - hitMargin || dx > sx + r.w + hitMargin) continue;
      for (const win of r.windows) {
        const wx = sx + win.rx;
        const wy = r.topY + win.ry;
        if (dx >= wx - hitMargin && dx <= wx + win.w + hitMargin && dy >= wy - hitMargin && dy <= wy + win.h + hitMargin) {
          this.flipWindow(win, night);
          return true;
        }
      }
    }

    const midCam = camX * MID_PARALLAX;
    for (const b of this.layout.midBuildings) {
      const sx = wrapDelta(b.x, midCam, MID_SPAN) + halfW;
      if (dx < sx - hitMargin || dx > sx + b.w + hitMargin) continue;
      for (const win of b.windows) {
        const wx = sx + win.rx;
        const wy = b.topY + win.ry;
        if (dx >= wx - hitMargin && dx <= wx + win.w + hitMargin && dy >= wy - hitMargin && dy <= wy + win.h + hitMargin) {
          this.flipWindow(win, night);
          return true;
        }
      }
    }

    return false;
  }

  private flipWindow(win: WindowSlot, night: number): void {
    const currentlyLit = this.isLit(win, night);
    this.windowOverrides.set(win.id, !currentlyLit);
  }

  private isLit(win: WindowSlot, night: number): boolean {
    const override = this.windowOverrides.get(win.id);
    if (override !== undefined) return override;
    return night > 0.16 && win.defaultLit;
  }

  private drawSkyTrafficPreTint(
    L: CanvasRenderingContext2D,
    farCam: number,
    halfW: number,
    designW: number,
    unit: number,
    sprites: RooftopSprites,
  ): void {
    L.imageSmoothingEnabled = false;
    const bx = wrapDelta(this.blimpX, farCam, FAR_SPAN) + halfW;
    const by = 38;
    if (bx + sprites.blimp.w >= -12 && bx <= designW + 12) {
      L.drawImage(
        sprites.blimp.canvas,
        Math.round(bx * unit),
        Math.round(by * unit),
        Math.round(sprites.blimp.w * unit),
        Math.round(sprites.blimp.h * unit),
      );
      this.blimpRect = { x: bx, y: by, w: sprites.blimp.w, h: sprites.blimp.h };
    } else {
      this.blimpRect = null;
    }

    for (const h of this.helis) {
      const sx = wrapDelta(h.x, farCam, FAR_SPAN) + halfW;
      if (sx < -32 || sx > designW + 32) continue;
      const hx = Math.round(sx * unit);
      const hy = Math.round(h.y * unit);
      const hw = Math.round(sprites.heli.w * unit);
      const hh = Math.round(sprites.heli.h * unit);
      if (h.vx >= 0) {
        L.drawImage(sprites.heli.canvas, hx, hy, hw, hh);
      } else {
        L.save();
        L.translate(hx + hw, hy);
        L.scale(-1, 1);
        L.drawImage(sprites.heli.canvas, 0, 0, hw, hh);
        L.restore();
      }
    }
  }

  private drawMidBuilding(
    L: CanvasRenderingContext2D,
    b: MidBuilding,
    sx: number,
    designH: number,
    unit: number,
  ): void {
    const baseCol = MID_TONES[b.tone] ?? MID_TONES[0];
    const sideCol = shade(baseCol, 0.72);
    const trimCol = shade(baseCol, 1.18);
    const dx = Math.round(sx * unit);
    const dy = Math.round(b.topY * unit);
    const dw = Math.round(b.w * unit);
    const dh = Math.round((designH - b.topY) * unit);

    L.fillStyle = css(baseCol);
    L.fillRect(dx, dy, dw, dh);
    L.fillStyle = css(sideCol);
    L.fillRect(dx + dw - Math.max(2, Math.round(4 * unit)), dy, Math.max(2, Math.round(4 * unit)), dh);
    L.fillStyle = css(trimCol);
    L.fillRect(dx - 1, dy, dw + 2, Math.max(2, Math.round(2 * unit)));

    // Rooftop details (penthouse box or small distant tank)
    if (b.roofKind === 'penthouse') {
      const pw = Math.round(b.w * 0.42 * unit);
      const ph = Math.round(7 * unit);
      L.fillStyle = css(sideCol);
      L.fillRect(dx + Math.round(5 * unit), dy - ph, pw, ph);
    } else if (b.roofKind === 'tank') {
      const tx = dx + Math.round(b.w * 0.55 * unit);
      L.fillStyle = '#4a4e58';
      L.fillRect(tx, dy - Math.round(4 * unit), Math.max(2, Math.round(2 * unit)), Math.round(4 * unit));
      L.fillRect(tx + Math.round(5 * unit), dy - Math.round(4 * unit), Math.max(2, Math.round(2 * unit)), Math.round(4 * unit));
      L.fillStyle = '#7c5c42';
      L.fillRect(tx - Math.round(unit), dy - Math.round(10 * unit), Math.round(9 * unit), Math.round(6 * unit));
    }

    // Dark window recesses
    L.fillStyle = '#252b38';
    for (const win of b.windows) {
      L.fillRect(
        Math.round((sx + win.rx) * unit),
        Math.round((b.topY + win.ry) * unit),
        Math.max(2, Math.round(win.w * unit)),
        Math.max(2, Math.round(win.h * unit)),
      );
    }
  }

  private drawNearRoof(
    L: CanvasRenderingContext2D,
    r: NearRoof,
    sx: number,
    designH: number,
    unit: number,
  ): void {
    const baseCol = NEAR_TONES[r.tone] ?? NEAR_TONES[0];
    const shadowCol = shade(baseCol, 0.72);
    const copingCol = '#8c94a0';
    const dx = Math.round(sx * unit);
    const dy = Math.round(r.topY * unit);
    const dw = Math.round(r.w * unit);
    const dh = Math.round((designH - r.topY) * unit);

    L.fillStyle = css(baseCol);
    L.fillRect(dx, dy, dw, dh);
    L.fillStyle = css(shadowCol);
    L.fillRect(dx + dw - Math.round(6 * unit), dy, Math.round(6 * unit), dh);
    // Coping lip
    L.fillStyle = copingCol;
    L.fillRect(dx - 1, dy - Math.round(2 * unit), dw + 2, Math.max(2, Math.round(3 * unit)));

    if (r.hasVent) {
      L.fillStyle = '#626a78';
      L.fillRect(dx + Math.round(8 * unit), dy - Math.round(7 * unit), Math.round(10 * unit), Math.round(5 * unit));
    }
    if (r.hasAntenna) {
      const ax = dx + Math.round((r.w - 14) * unit);
      L.fillStyle = '#4c5462';
      L.fillRect(ax, dy - Math.round(16 * unit), Math.max(1, Math.round(unit)), Math.round(14 * unit));
      L.fillRect(ax - Math.round(4 * unit), dy - Math.round(13 * unit), Math.round(9 * unit), Math.max(1, Math.round(unit)));
    }

    L.fillStyle = '#222836';
    for (const win of r.windows) {
      L.fillRect(
        Math.round((sx + win.rx) * unit),
        Math.round((r.topY + win.ry) * unit),
        Math.max(2, Math.round(win.w * unit)),
        Math.max(3, Math.round(win.h * unit)),
      );
    }
  }

  private drawLitWindows(
    ctx: CanvasRenderingContext2D,
    windows: readonly WindowSlot[],
    sx: number,
    topY: number,
    night: number,
    unit: number,
  ): void {
    const alpha = clamp01(0.62 + 0.38 * night);
    for (const win of windows) {
      if (!this.isLit(win, night)) continue;
      const col = WINDOW_GLOW[win.tone] ?? WINDOW_GLOW[0];
      const wx = Math.round((sx + win.rx) * unit);
      const wy = Math.round((topY + win.ry) * unit);
      const ww = Math.max(2, Math.round(win.w * unit));
      const wh = Math.max(2, Math.round(win.h * unit));
      ctx.fillStyle = css(col, alpha);
      ctx.fillRect(wx, wy, ww, wh);
      // Window muntin shadow line for crisp pixel detail
      if (ww >= 4 && wh >= 5) {
        ctx.fillStyle = css(shade(col, 0.7), alpha * 0.65);
        ctx.fillRect(wx + Math.floor(ww * 0.5), wy, 1, wh);
      }
    }
  }
}
