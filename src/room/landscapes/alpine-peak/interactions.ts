import { css, mix } from '../../../render/color';
import { approach, clamp, lerp, rand } from '../../../world/math';
import type { SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { CloudSea } from './cloud-sea';
import { buildExtraStars, buildMilkyWayCanvas } from './milky-way';
import { ALPINE_COLORS, SCENE_ANCHORS, isSnowSurface, sceneTerrainY, slopeDirection } from './scenes';
import type { HutSprite } from './sprites';

interface PlumeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

interface AvalancheMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

interface SmokeRing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  radius: number;
}

interface StarryMeteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

const MAX_PLUME_MOTES = 32;
const MAX_AVALANCHE_MOTES = 96;
const MAX_SMOKE_RINGS = 6;
const HUT_LIT_DURATION = 22;
const BUNTING_COLORS: readonly string[] = ['#e65242', '#eab042', '#4498d8', '#46b88e', '#f2eee4'];

/**
 * Handles Alpine Peak's dynamic atmosphere and pointer/click interactions:
 * parting cloud sea, wind-streaming snow plumes & flags, avalanches, hut window & smoke rings, and Milky Way.
 */
export class AlpineInteractions {
  private readonly cloudSea = new CloudSea();
  private readonly plumes: PlumeParticle[] = [];
  private readonly avalanche: AvalancheMote[] = [];
  private readonly smokeRings: SmokeRing[] = [];
  private readonly extraStars = buildExtraStars();
  private mwCanvas: HTMLCanvasElement | null = null;
  private mwW = 0;
  private mwH = 0;
  private meteor: StarryMeteor | null = null;
  private meteorWait = 6.5;

  private windBias = 0.55;
  private hutLitTimer = 0;
  private lastHutRect: { x: number; y: number; w: number; h: number; chimX: number; chimY: number } | null = null;
  private plumeSpawnAcc = 0;

  /** Effective wind direction & strength (-1..+1), reacting promptly when the pointer moves. */
  get wind(): number {
    return this.windBias;
  }

  /** Rebuilds the cached pixel-dithered Milky Way band when stage dimensions change. */
  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    if (w !== this.mwW || h !== this.mwH) {
      this.mwW = w;
      this.mwH = h;
      this.mwCanvas = buildMilkyWayCanvas(w, h);
    }
  }

  /** Updates wind bias, cloud-sea parting, plumes, avalanches, hut lights, and smoke rings. */
  update(
    dt: number,
    time: number,
    scene: number,
    w: number,
    h: number,
    unit: number,
    pointer: ViewFrame['pointer'],
  ): void {
    let targetWind = 0.52 + Math.sin(time * 0.35) * 0.14;
    if (pointer) {
      const anchorU = scene === 0 ? SCENE_ANCHORS.summitPole.u : scene === 3 ? SCENE_ANCHORS.cableStation.u : 0.35;
      const anchorX = anchorU * w;
      const dx = anchorX - pointer.x;
      const prox = clamp(1 - Math.abs(dx) / (w * 0.55), 0.25, 1);
      targetWind = (dx >= 0 ? 1 : -1) * (0.65 + 0.35 * prox);
    }
    this.windBias = approach(this.windBias, targetWind, 6.5, dt);

    if (this.hutLitTimer > 0) {
      this.hutLitTimer = Math.max(0, this.hutLitTimer - dt);
    }

    this.cloudSea.update(dt, scene, w, h, unit, pointer);
    this.stepPlumes(dt, scene, w, h, unit);
    this.stepAvalanche(dt, unit);
    this.stepSmokeRings(dt, unit);
    this.stepMeteor(dt, scene, w, h);
  }

  /** Click on hut (Glacier Valley or Starry Col): lights window and sends a smoke ring up. */
  tryClickHut(x: number, y: number, scene: number, unit: number): boolean {
    if ((scene !== 1 && scene !== 4) || !this.lastHutRect) return false;
    const r = this.lastHutRect;
    const pad = 6 * unit;
    if (x < r.x - pad || x > r.x + r.w + pad || y < r.y - pad || y > r.y + r.h + pad) return false;

    this.hutLitTimer = HUT_LIT_DURATION;
    if (this.smokeRings.length >= MAX_SMOKE_RINGS) this.smokeRings.shift();
    this.smokeRings.push({
      x: r.chimX,
      y: r.chimY,
      vx: this.windBias * 4 * unit,
      vy: -13 * unit,
      age: 0,
      life: 3.6,
      radius: 2 * unit,
    });
    return true;
  }

  /** Click on snow slope or cornice: triggers a gentle snow-dust avalanche sliding downhill. */
  tryClickSnow(x: number, y: number, scene: number, w: number, h: number, unit: number): boolean {
    const u = clamp(x / w, 0, 1);
    const v = clamp(y / h, 0, 1);
    if (!isSnowSurface(scene, u, v)) return false;

    const dir = slopeDirection(scene, u);
    const count = 22;
    for (let i = 0; i < count; i++) {
      if (this.avalanche.length >= MAX_AVALANCHE_MOTES) this.avalanche.shift();
      this.avalanche.push({
        x: x + rand(-7, 7) * unit,
        y: y + rand(-3, 3) * unit,
        vx: dir * rand(10, 26) * unit + this.windBias * 4 * unit,
        vy: rand(6, 18) * unit,
        age: 0,
        life: rand(1.6, 2.5),
        size: Math.random() < 0.35 ? 2 : 1,
      });
    }
    return true;
  }

  /** Spawns tiny snow flecks when the recurring ibex leaps. */
  spawnLeapDust(x: number, y: number, unit: number): void {
    for (let i = 0; i < 6; i++) {
      if (this.avalanche.length >= MAX_AVALANCHE_MOTES) this.avalanche.shift();
      this.avalanche.push({
        x: x + rand(-5, 5) * unit,
        y: y - 1,
        vx: rand(-10, 10) * unit,
        vy: rand(-6, 4) * unit,
        age: 0,
        life: rand(0.6, 1.1),
        size: 1,
      });
    }
  }

  /** Draws pale dithered Milky Way band, extra Starry Col stars, and shooting star in the sky. */
  drawSkyExtras(
    ctx: CanvasRenderingContext2D,
    scene: number,
    w: number,
    h: number,
    night: number,
    time: number,
  ): void {
    this.resize(w, h);
    const mwAlpha = clamp((night - 0.15) / 0.65, 0, 1) * (scene === 4 ? 0.78 : 0.24);
    if (mwAlpha > 0.02 && this.mwCanvas) {
      ctx.save();
      ctx.globalAlpha = mwAlpha;
      ctx.drawImage(this.mwCanvas, 0, 0);
      if (scene === 4) {
        ctx.fillStyle = '#eef4ff';
        for (const s of this.extraStars) {
          const sx = Math.round(s.u * w);
          const sy = Math.round(s.v * h);
          const tw = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
          ctx.globalAlpha = mwAlpha * (0.28 + 0.65 * tw * tw);
          ctx.fillRect(sx, sy, 1, 1);
          if (s.bright && tw > 0.68) {
            ctx.globalAlpha *= 0.4;
            ctx.fillRect(sx - 1, sy, 1, 1);
            ctx.fillRect(sx + 1, sy, 1, 1);
            ctx.fillRect(sx, sy - 1, 1, 1);
            ctx.fillRect(sx, sy + 1, 1, 1);
          }
        }
      }
      ctx.restore();
    }

    const m = this.meteor;
    if (m && (scene === 4 || night > 0.45)) {
      const strength = scene === 4 ? Math.max(0.45, night) : night;
      const a = Math.sin(Math.PI * clamp(m.age / m.duration, 0, 1)) * strength;
      ctx.save();
      ctx.fillStyle = '#f6f8ff';
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        ctx.globalAlpha = a * (1 - k) * (1 - k);
        ctx.fillRect(Math.round(m.x - m.vx * 0.09 * k), Math.round(m.y - m.vy * 0.09 * k), 1, 1);
      }
      ctx.restore();
    }
  }

  /** Draws the valley cloud sea layer (layer 0 behind midground, or layer 1 in front). */
  drawCloudSea(
    L: CanvasRenderingContext2D,
    scene: number,
    layer: 0 | 1,
    w: number,
    h: number,
    unit: number,
    hour: number,
    state: SkyState,
    parX: number,
    parY: number,
  ): void {
    this.cloudSea.draw(L, scene, layer, w, h, unit, hour, state, parX, parY);
  }

  /** Draws summit flags, bunting, snow plumes, and gentle avalanches on the land layer. */
  drawLandEffects(
    L: CanvasRenderingContext2D,
    scene: number,
    w: number,
    h: number,
    unit: number,
    time: number,
    state: SkyState,
    parX: number,
    parY: number,
    hut: HutSprite | null,
  ): void {
    if ((scene === 1 || scene === 4) && hut) {
      const anchor = scene === 1 ? SCENE_ANCHORS.glacierHut : SCENE_ANCHORS.starryHut;
      const hx = Math.round(anchor.u * w - hut.w / 2 + parX);
      const hy = Math.round(anchor.v * h - hut.h + 4 + parY);
      this.lastHutRect = {
        x: hx,
        y: hy,
        w: hut.w,
        h: hut.h,
        chimX: hx + hut.chimneyX,
        chimY: hy + hut.chimneyY,
      };
    } else {
      this.lastHutRect = null;
    }

    if (scene === 0) {
      this.drawSummitFlagAndBunting(L, w, h, unit, time, parX, parY);
    } else if (scene === 3) {
      this.drawStationFlag(L, w, h, unit, time, parX, parY);
    }

    if (this.plumes.length > 0) {
      const col = mix(ALPINE_COLORS.snowLit, state.sky.light, 0.25 * state.day);
      for (const p of this.plumes) {
        const fade = Math.sin(Math.PI * clamp(p.age / p.life, 0, 1));
        L.fillStyle = css(col, 0.72 * fade);
        L.fillRect(Math.round(p.x), Math.round(p.y), p.size, 1);
      }
    }

    if (this.avalanche.length > 0) {
      const dustCol = mix(ALPINE_COLORS.snowLit, state.sky.light, 0.2 * state.day);
      for (const m of this.avalanche) {
        const lifeT = clamp(m.age / m.life, 0, 1);
        const alpha = (1 - lifeT) * 0.82;
        L.fillStyle = css(dustCol, alpha);
        L.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
      }
    }
  }

  /** Draws post-tint glowing hut window, tent glow, and rising chimney smoke rings. */
  drawPostTintEffects(
    ctx: CanvasRenderingContext2D,
    scene: number,
    w: number,
    h: number,
    day: number,
    parX: number,
    parY: number,
    hut: HutSprite,
    tentGlow: { canvas: HTMLCanvasElement; w: number; h: number },
  ): void {
    if ((scene === 1 || scene === 4) && this.lastHutRect) {
      const nightGlow = scene === 4 ? clamp(1 - day * 0.85, 0.35, 1) : clamp(1 - day * 1.15, 0, 0.9);
      const clickGlow = this.hutLitTimer > 0 ? clamp(this.hutLitTimer / 2, 0, 1) : 0;
      const strength = Math.max(nightGlow, clickGlow);
      if (strength > 0.05) {
        ctx.save();
        ctx.globalAlpha = strength;
        ctx.drawImage(
          hut.litWindow.canvas,
          Math.round(this.lastHutRect.x + hut.winX - 2),
          Math.round(this.lastHutRect.y + hut.winY - 1),
        );
        ctx.restore();
      }
    }

    if (scene === 4 && day < 0.72) {
      const strength = clamp((0.72 - day) / 0.45, 0.2, 1);
      const tx = Math.round(SCENE_ANCHORS.starryTent.u * w - 18 + parX);
      const ty = Math.round(SCENE_ANCHORS.starryTent.v * h - 22 + 4 + parY);
      ctx.save();
      ctx.globalAlpha = strength * 0.92;
      ctx.drawImage(tentGlow.canvas, tx + 11, ty + 9);
      ctx.restore();
    }

    for (const s of this.smokeRings) {
      const t = clamp(s.age / s.life, 0, 1);
      const alpha = Math.sin(Math.PI * Math.min(1, t * 1.35)) * (1 - t) * 0.72;
      if (alpha < 0.03) continue;
      const cx = Math.round(s.x);
      const cy = Math.round(s.y);
      const rx = Math.max(2, Math.round(s.radius * (1 + t * 1.4)));
      const ry = Math.max(1, Math.round(rx * 0.55));
      ctx.fillStyle = `rgba(226,234,244,${alpha.toFixed(3)})`;
      ctx.fillRect(cx - rx, cy, rx * 2 + 1, 1);
      ctx.fillRect(cx - rx + 1, cy - ry, rx * 2 - 1, 1);
      ctx.fillRect(cx - rx, cy - ry + 1, 1, Math.max(1, ry - 1));
      ctx.fillRect(cx + rx, cy - ry + 1, 1, Math.max(1, ry - 1));
    }
  }

  private drawSummitFlagAndBunting(
    L: CanvasRenderingContext2D,
    w: number,
    h: number,
    unit: number,
    time: number,
    parX: number,
    parY: number,
  ): void {
    const px = Math.round(SCENE_ANCHORS.summitPole.u * w + parX);
    const py = Math.round(sceneTerrainY(0, SCENE_ANCHORS.summitPole.u) * h + parY) + 1;
    const poleH = Math.round(24 * unit);
    const topY = py - poleH;

    L.fillStyle = '#5c422c';
    L.fillRect(px, topY, 1, poleH);

    const dir = this.windBias >= 0 ? 1 : -1;
    const stream = clamp(Math.abs(this.windBias), 0.35, 1);
    const flagLen = Math.round(11 * unit * (0.75 + 0.35 * stream));
    for (let i = 0; i < flagLen; i++) {
      const wave = Math.round(Math.sin(time * 7.5 - i * 0.55) * (0.6 + (i / flagLen) * 1.1));
      const fh = Math.max(2, Math.round(6 * unit * (1 - (i / flagLen) * 0.45)));
      L.fillStyle = i % 4 < 2 ? '#e65242' : '#c83428';
      L.fillRect(px + dir * (1 + i), topY + 1 + wave, 1, fh);
    }

    const bx = Math.round(SCENE_ANCHORS.buntingEnd.u * w + parX);
    const by = Math.round(sceneTerrainY(0, SCENE_ANCHORS.buntingEnd.u) * h + parY);
    L.fillStyle = '#485266';
    L.fillRect(bx, by - 5, 1, 6);
    L.fillStyle = '#c8d4e6';
    L.fillRect(bx - 2, by - 5, 4, 1);

    const startY = topY + Math.round(9 * unit);
    const endY = by - 4;
    const flags = 7;
    L.fillStyle = 'rgba(220,226,238,0.6)';
    const steps = Math.max(10, Math.abs(bx - px));
    for (let i = 0; i <= steps; i += 2) {
      const t = i / steps;
      const sx = Math.round(lerp(px, bx, t));
      const sy = Math.round(lerp(startY, endY, t) + Math.sin(Math.PI * t) * 5 * unit);
      L.fillRect(sx, sy, 2, 1);
    }
    for (let f = 1; f <= flags; f++) {
      const t = f / (flags + 1);
      const fx = Math.round(lerp(px, bx, t));
      const fy = Math.round(lerp(startY, endY, t) + Math.sin(Math.PI * t) * 5 * unit);
      const sway = Math.round(dir * (1.2 + Math.sin(time * 6.5 + f * 1.3) * 0.8) * stream);
      L.fillStyle = BUNTING_COLORS[f % BUNTING_COLORS.length];
      L.fillRect(fx - 1, fy + 1, 3, 2);
      L.fillRect(fx + sway, fy + 3, 2, 1);
    }
  }

  private drawStationFlag(
    L: CanvasRenderingContext2D,
    w: number,
    h: number,
    unit: number,
    time: number,
    parX: number,
    parY: number,
  ): void {
    const stX = Math.round(SCENE_ANCHORS.cableStation.u * w + parX);
    const stY = Math.round(SCENE_ANCHORS.cableStation.v * h + parY);
    const poleX = stX + 3;
    const poleTop = stY - 40;
    const dir = this.windBias >= 0 ? 1 : -1;
    const len = Math.round(10 * unit);
    for (let i = 0; i < len; i++) {
      const wave = Math.round(Math.sin(time * 6.8 - i * 0.5) * (0.4 + (i / len) * 0.9));
      L.fillStyle = i > len * 0.3 && i < len * 0.7 ? '#f4f6fa' : '#d63e34';
      L.fillRect(poleX + dir * (1 + i), poleTop + wave, 1, 4);
    }
  }

  private stepPlumes(dt: number, scene: number, w: number, h: number, unit: number): void {
    if (scene === 0 || scene === 2) {
      this.plumeSpawnAcc += dt * 16;
      const originU = scene === 0 ? 0.205 : 0.25;
      const ox = originU * w;
      const oy = sceneTerrainY(scene, originU) * h + 1;
      while (this.plumeSpawnAcc >= 1) {
        this.plumeSpawnAcc -= 1;
        if (this.plumes.length >= MAX_PLUME_MOTES) this.plumes.shift();
        this.plumes.push({
          x: ox + rand(-4, 4) * unit,
          y: oy + rand(-2, 2) * unit,
          vx: this.windBias * rand(28, 52) * unit,
          vy: rand(-6, 4) * unit,
          age: 0,
          life: rand(0.9, 1.8),
          size: Math.random() < 0.45 ? 2 : 1,
        });
      }
    }

    for (let i = this.plumes.length - 1; i >= 0; i--) {
      const p = this.plumes[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.plumes.splice(i, 1);
        continue;
      }
      p.vx = approach(p.vx, this.windBias * 42 * unit, 4.5, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private stepAvalanche(dt: number, unit: number): void {
    for (let i = this.avalanche.length - 1; i >= 0; i--) {
      const m = this.avalanche[i];
      m.age += dt;
      if (m.age >= m.life) {
        this.avalanche.splice(i, 1);
        continue;
      }
      m.vy += 12 * unit * dt;
      m.vx *= Math.exp(-0.7 * dt);
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
  }

  private stepSmokeRings(dt: number, unit: number): void {
    for (let i = this.smokeRings.length - 1; i >= 0; i--) {
      const s = this.smokeRings[i];
      s.age += dt;
      if (s.age >= s.life) {
        this.smokeRings.splice(i, 1);
        continue;
      }
      s.vx = approach(s.vx, this.windBias * 7 * unit, 2.2, dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
  }

  private stepMeteor(dt: number, scene: number, w: number, h: number): void {
    if (this.meteor) {
      this.meteor.age += dt;
      this.meteor.x += this.meteor.vx * dt;
      this.meteor.y += this.meteor.vy * dt;
      if (this.meteor.age >= this.meteor.duration) this.meteor = null;
      return;
    }
    this.meteorWait -= dt;
    if (this.meteorWait <= 0) {
      this.meteorWait = scene === 4 ? rand(9, 16) : rand(20, 35);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = h * rand(1.1, 1.7);
      const angle = rand(0.28, 0.45);
      this.meteor = {
        x: w * (dir > 0 ? rand(0.15, 0.48) : rand(0.52, 0.85)),
        y: h * rand(0.05, 0.16),
        vx: Math.cos(angle) * speed * dir,
        vy: Math.sin(angle) * speed,
        age: 0,
        duration: rand(0.65, 0.95),
      };
    }
  }
}
