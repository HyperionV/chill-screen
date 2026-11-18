import { clamp, lerp } from '../../../world/math';
import { breeze } from '../../wind';
import { CABLE_SPAN, SCENE_ANCHORS, cableYAt } from './scenes';
import type { AlpineSprites } from './sprites';

const CABLE_HIT_PAD = 10;
const CABLE_SPEED = 0.048;
const CABLE_DOCK_SECONDS = 4.5;
const CABLE_STOP_SECONDS = 3.0;
// Ambient gondola motion is limited to one stage pixel.
const GONDOLA_WIND_SWAY = 1;

/**
 * Manages the Cable Car Col gondola, steel catenary cables, station bullwheel,
 * and sunny cafe terrace with tiny patrons.
 */
export class CableCarSystem {
  private t = 0.38;
  private dir: 1 | -1 = 1;
  private dockPause = 0;
  private clickStopTimer = 0;
  private swingTimer = 0;
  private swingAmp = 0;
  private wheelAngle = 0;
  private lastPos = { x: 0, y: 0, hitY: 0 };

  /** Current normalized horizontal position along the valley span. */
  get gondolaU(): number {
    return lerp(CABLE_SPAN.u0 + 0.05, CABLE_SPAN.u1 - 0.05, this.t);
  }

  /** Advances gondola travel, docking pause, and click-induced pendulum swing. */
  step(dt: number): void {
    if (this.clickStopTimer > 0) {
      this.clickStopTimer = Math.max(0, this.clickStopTimer - dt);
      this.swingTimer += dt;
      return;
    }
    if (this.swingAmp > 0.05) {
      this.swingTimer += dt;
      this.swingAmp *= Math.exp(-1.5 * dt);
    } else {
      this.swingAmp = 0;
    }

    if (this.dockPause > 0) {
      this.dockPause = Math.max(0, this.dockPause - dt);
      return;
    }

    this.t += this.dir * CABLE_SPEED * dt;
    this.wheelAngle += dt * 4;
    if (this.t >= 1) {
      this.t = 1;
      this.dir = -1;
      this.dockPause = CABLE_DOCK_SECONDS;
    } else if (this.t <= 0) {
      this.t = 0;
      this.dir = 1;
      this.dockPause = CABLE_DOCK_SECONDS;
    }
  }

  /** Click reaction: stops the cable car and swings it gently before resuming. */
  tryClick(x: number, y: number, unit: number): boolean {
    const pad = CABLE_HIT_PAD * unit;
    if (Math.abs(x - this.lastPos.x) > 13 * unit + pad || Math.abs(y - this.lastPos.hitY) > 13 * unit + pad) {
      return false;
    }
    this.clickStopTimer = CABLE_STOP_SECONDS;
    this.swingTimer = 0;
    this.swingAmp = 4.5 * unit;
    return true;
  }

  /** Draws pylon, station, cafe terrace with patrons, catenary cables, and gondola. */
  draw(
    L: CanvasRenderingContext2D,
    w: number,
    h: number,
    unit: number,
    time: number,
    sprites: AlpineSprites,
  ): void {
    const x0 = Math.round(CABLE_SPAN.u0 * w);
    const y0 = Math.round(CABLE_SPAN.v0 * h);
    const x1 = Math.round(CABLE_SPAN.u1 * w);
    L.drawImage(sprites.pylon.canvas, Math.round(x0 - sprites.pylon.w / 2), y0 - 2);

    const stX = Math.round(SCENE_ANCHORS.cableStation.u * w);
    const stY = Math.round(SCENE_ANCHORS.cableStation.v * h);
    L.drawImage(sprites.station.canvas, Math.round(stX - sprites.station.w / 2), Math.round(stY - sprites.station.h + 4));

    const wheelX = Math.round(stX - sprites.station.w / 2 + 5);
    const wheelY = Math.round(stY - sprites.station.h + 21);
    const spoke = Math.round(Math.sin(this.wheelAngle));
    L.fillStyle = '#c4cee0';
    L.fillRect(wheelX + spoke, wheelY, 1, 1);

    const terX = Math.round(SCENE_ANCHORS.cafeTerrace.u * w);
    const terY = Math.round(SCENE_ANCHORS.cafeTerrace.v * h);
    const tx = Math.round(terX - sprites.terrace.w / 2);
    const ty = Math.round(terY - sprites.terrace.h + 4);
    L.drawImage(sprites.terrace.canvas, tx, ty);
    this.drawTerracePatrons(L, tx, ty, time);

    const spanPx = Math.max(16, x1 - x0);
    for (let i = 0; i <= spanPx; i += 2) {
      const u = lerp(CABLE_SPAN.u0, CABLE_SPAN.u1, i / spanPx);
      const cy = Math.round(cableYAt(u) * h);
      L.fillStyle = '#2c3444';
      L.fillRect(x0 + i, cy, 2, 1);
      L.fillStyle = '#5c667c';
      L.fillRect(x0 + i, cy - 2, 2, 1);
    }

    const carU = this.gondolaU;
    const carX = Math.round(carU * w);
    const carY = Math.round(cableYAt(carU) * h);
    const swing =
      this.swingAmp > 0.05
        ? Math.sin(this.swingTimer * 5.2) * this.swingAmp * Math.exp(-this.swingTimer * 0.85)
        : breeze(time, carX) * GONDOLA_WIND_SWAY;
    const gx = Math.round(carX + swing);
    const gy = carY;
    this.lastPos = { x: gx, y: gy, hitY: gy + Math.round(12 * unit) };
    L.drawImage(sprites.gondola.canvas, Math.round(gx - sprites.gondola.w / 2), Math.round(gy - sprites.gondola.cableAttachY));
  }

  /** Draws warm illuminated cabin windows post-tint at dusk and night. */
  drawPostTint(ctx: CanvasRenderingContext2D, day: number, sprites: AlpineSprites): void {
    if (day > 0.72) return;
    const strength = clamp((0.72 - day) / 0.5, 0, 1);
    const g = sprites.gondola;
    ctx.save();
    ctx.globalAlpha = strength * 0.9;
    ctx.drawImage(g.litCabin.canvas, Math.round(this.lastPos.x - g.w / 2 + 4), Math.round(this.lastPos.y - g.cableAttachY + 12));
    ctx.restore();
  }

  private drawTerracePatrons(L: CanvasRenderingContext2D, tx: number, ty: number, time: number): void {
    const patrons = [
      { dx: 11, dy: 18, coat: '#d84a3c', hat: '#f2e4c8', wave: Math.sin(time * 0.9) > 0.72 },
      { dx: 29, dy: 18, coat: '#3c88b8', hat: '#e8b644', wave: false },
      { dx: 51, dy: 18, coat: '#3ca07c', hat: '#e25c4a', wave: Math.sin(time * 0.7 + 2.1) > 0.78 },
    ];
    for (const p of patrons) {
      const px = tx + p.dx;
      const py = ty + p.dy;
      L.fillStyle = '#242a36';
      L.fillRect(px - 2, py - 5, 2, 5);
      L.fillRect(px + 1, py - 5, 2, 5);
      L.fillStyle = p.coat;
      L.fillRect(px - 2, py - 11, 5, 6);
      L.fillStyle = '#e8c09c';
      L.fillRect(px - 1, py - 14, 3, 3);
      L.fillStyle = p.hat;
      L.fillRect(px - 1, py - 16, 3, 2);
      if (p.wave) {
        L.fillStyle = p.coat;
        L.fillRect(px + 3, py - 13, 2, 3);
      }
    }
  }
}
