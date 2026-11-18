import { css, mix } from '../../../render/color';
import { approach, clamp, lerp, rand } from '../../../world/math';
import type { SkyState } from '../../sky';
import { breeze, gust } from '../../wind';
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
// Flag tips lift in stages, with the cloth at the pole held in place.
const SUMMIT_FLAG_SWAY = 3;
const STATION_FLAG_SWAY = 2;
const BUNTING_TIP_SWAY = 2;
const FLAG_WAVE_DELAY = 0.085;
const FLAG_CALM_LENGTH = 0.85;
const FLAG_GUST_LENGTH = 1.1;
// The existing crest plumes are denser than the windblown grains by the foreground banks.
const CREST_SNOW_RATE = 16;
const CREST_SNOW_CALM_RATE = 0.65;
const SHELTERED_SNOW_RATE = 3;
const SHELTERED_SNOW_LEFT_U = 0.08;
const SHELTERED_SNOW_RIGHT_U = 0.88;
const SHELTERED_SNOW_V = 0.87;
const CREST_SNOW_SPEED = 42;
const SHELTERED_SNOW_SPEED = 18;
const SNOW_CALM_SPEED = 0.3;
const CLICK_SNOW_WIND_SPEED = 4;
// Chimney smoke keeps rising as the breeze draws it sideways.
const SMOKE_CALM_SPEED = 2;
const SMOKE_GUST_SPEED = 5;

/**
 * Handles Alpine Peak's clouds, wind-streaming snow and flags, avalanches, hut lighting, and night sky effects.
 */
export class AlpineInteractions {
  private readonly cloudSea = new CloudSea();
  private readonly plumes: PlumeParticle[] = Array.from({ length: MAX_PLUME_MOTES }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, size: 1,
  }));
  private readonly avalanche: AvalancheMote[] = [];
  private readonly smokeRings: SmokeRing[] = [];
  private readonly extraStars = buildExtraStars();
  private mwCanvas: HTMLCanvasElement | null = null;
  private mwW = 0;
  private mwH = 0;
  private meteor: StarryMeteor | null = null;
  private meteorWait = 6.5;

  private gustStrength = 0;
  private hutLitTimer = 0;
  private lastHutRect: { x: number; y: number; w: number; h: number; chimX: number; chimY: number } | null = null;
  private plumeSpawnAcc = 0;
  private nextPlume = 0;
  private plumeColorKey = -1;
  private plumeFill = '';

  /** Rebuilds the cached pixel-dithered Milky Way band when stage dimensions change. */
  resize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    if (w !== this.mwW || h !== this.mwH) {
      this.mwW = w;
      this.mwH = h;
      this.mwCanvas = buildMilkyWayCanvas(w, h);
    }
  }

  /** Updates drifting clouds, plumes, avalanches, hut lights, and smoke rings. */
  update(
    dt: number,
    time: number,
    scene: number,
    w: number,
    h: number,
    unit: number,
  ): void {
    this.gustStrength = gust(time);

    if (this.hutLitTimer > 0) {
      this.hutLitTimer = Math.max(0, this.hutLitTimer - dt);
    }

    this.cloudSea.update(dt, this.gustStrength);
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
      vx: (SMOKE_CALM_SPEED + SMOKE_GUST_SPEED * this.gustStrength) * unit,
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
        vx: dir * rand(10, 26) * unit + this.gustStrength * CLICK_SNOW_WIND_SPEED * unit,
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
    time: number,
  ): void {
    this.cloudSea.draw(L, scene, layer, w, h, unit, hour, state, time, this.gustStrength);
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
    hut: HutSprite | null,
  ): void {
    if ((scene === 1 || scene === 4) && hut) {
      const anchor = scene === 1 ? SCENE_ANCHORS.glacierHut : SCENE_ANCHORS.starryHut;
      const hx = Math.round(anchor.u * w - hut.w / 2);
      const hy = Math.round(anchor.v * h - hut.h + 4);
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
      this.drawSummitFlagAndBunting(L, w, h, unit, time);
    } else if (scene === 3) {
      this.drawStationFlag(L, w, h, unit, time);
    }

    const snow = ALPINE_COLORS.snowLit;
    const light = state.sky.light;
    const tint = 0.25 * state.day;
    const red = lerp(snow[0], light[0], tint) | 0;
    const green = lerp(snow[1], light[1], tint) | 0;
    const blue = lerp(snow[2], light[2], tint) | 0;
    const colorKey = (red << 16) | (green << 8) | blue;
    if (this.plumeColorKey !== colorKey) {
      this.plumeColorKey = colorKey;
      this.plumeFill = `rgb(${red},${green},${blue})`;
    }
    L.save();
    L.fillStyle = this.plumeFill;
    for (const p of this.plumes) {
      if (p.age >= p.life) continue;
      const fade = Math.sin(Math.PI * (p.age / p.life));
      L.globalAlpha = 0.72 * fade;
      L.fillRect(Math.round(p.x), Math.round(p.y), p.size, 1);
    }
    L.restore();

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
      const tx = Math.round(SCENE_ANCHORS.starryTent.u * w - 18);
      const ty = Math.round(SCENE_ANCHORS.starryTent.v * h - 22 + 4);
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
  ): void {
    const px = Math.round(SCENE_ANCHORS.summitPole.u * w);
    const py = Math.round(sceneTerrainY(0, SCENE_ANCHORS.summitPole.u) * h) + 1;
    const poleH = Math.round(24 * unit);
    const topY = py - poleH;

    L.fillStyle = '#5c422c';
    L.fillRect(px, topY, 1, poleH);

    const flagLen = Math.round(11 * unit * lerp(FLAG_CALM_LENGTH, FLAG_GUST_LENGTH, this.gustStrength));
    for (let i = 0; i < flagLen; i++) {
      const wave = Math.round(breeze(time - i * FLAG_WAVE_DELAY, px) * SUMMIT_FLAG_SWAY * (i / flagLen));
      const fh = Math.max(2, Math.round(6 * unit * (1 - (i / flagLen) * 0.45)));
      L.fillStyle = i % 4 < 2 ? '#e65242' : '#c83428';
      L.fillRect(px + 1 + i, topY + 1 + wave, 1, fh);
    }

    const bx = Math.round(SCENE_ANCHORS.buntingEnd.u * w);
    const by = Math.round(sceneTerrainY(0, SCENE_ANCHORS.buntingEnd.u) * h);
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
      const sway = Math.round(breeze(time, fx) * BUNTING_TIP_SWAY);
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
  ): void {
    const stX = Math.round(SCENE_ANCHORS.cableStation.u * w);
    const stY = Math.round(SCENE_ANCHORS.cableStation.v * h);
    const poleX = stX + 3;
    const poleTop = stY - 40;
    const len = Math.round(10 * unit * lerp(FLAG_CALM_LENGTH, FLAG_GUST_LENGTH, this.gustStrength));
    for (let i = 0; i < len; i++) {
      const wave = Math.round(breeze(time - i * FLAG_WAVE_DELAY, poleX) * STATION_FLAG_SWAY * (i / len));
      L.fillStyle = i > len * 0.3 && i < len * 0.7 ? '#f4f6fa' : '#d63e34';
      L.fillRect(poleX + 1 + i, poleTop + wave, 1, 4);
    }
  }

  private stepPlumes(dt: number, scene: number, w: number, h: number, unit: number): void {
    const onCrest = scene === 0 || scene === 2;
    const spawnRate = onCrest
      ? CREST_SNOW_RATE * lerp(CREST_SNOW_CALM_RATE, 1, this.gustStrength)
      : SHELTERED_SNOW_RATE * this.gustStrength;
    this.plumeSpawnAcc += dt * spawnRate;
    const topSpeed = onCrest ? CREST_SNOW_SPEED : SHELTERED_SNOW_SPEED;
    const speed = topSpeed * lerp(SNOW_CALM_SPEED, 1, this.gustStrength) * unit;
    while (this.plumeSpawnAcc >= 1) {
      this.plumeSpawnAcc -= 1;
      const originU = onCrest
        ? (scene === 0 ? 0.205 : 0.25)
        : (Math.random() < 0.5 ? SHELTERED_SNOW_LEFT_U : SHELTERED_SNOW_RIGHT_U);
      const originV = onCrest ? sceneTerrainY(scene, originU) : SHELTERED_SNOW_V;
      const p = this.plumes[this.nextPlume];
      this.nextPlume = (this.nextPlume + 1) % MAX_PLUME_MOTES;
      p.x = originU * w + rand(-4, 4) * unit;
      p.y = originV * h + 1 + rand(-2, 2) * unit;
      p.vx = speed * rand(0.7, 1.2);
      p.vy = rand(-6, 4) * unit;
      p.age = 0;
      p.life = rand(0.9, 1.8);
      p.size = onCrest && Math.random() < 0.45 ? 2 : 1;
    }

    for (const p of this.plumes) {
      if (p.age >= p.life) continue;
      p.age += dt;
      p.vx = approach(p.vx, speed, 4.5, dt);
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
    const speed = (SMOKE_CALM_SPEED + SMOKE_GUST_SPEED * this.gustStrength) * unit;
    for (let i = this.smokeRings.length - 1; i >= 0; i--) {
      const s = this.smokeRings[i];
      s.age += dt;
      if (s.age >= s.life) {
        this.smokeRings.splice(i, 1);
        continue;
      }
      s.vx = approach(s.vx, speed, 2.2, dt);
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
