import { css, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { PACE_SPEED, type Pace } from '../../journey/pace';
import type { NightSky } from '../../night-sky';
import { SkyDome, clamp01, type SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ChapterTitle } from '../chapter-title';
import type { JourneyView } from '../journey-view';
import { fbm, hash } from '../noise';
import { Route } from '../route';
import { CHAPTERS, PALETTES, blendChapters, createBlended } from './chapters';
import { Creatures } from './creatures';
import { blendColor } from './colors';
import { Landmarks } from './landmarks';
import { DrawList } from './draw-list';
import { drawCart, paintEdgeLeaves, paintFairyHouses } from './scenery';
import { buildFairySprites, type FairySprites } from './sprites';

const DESIGN_ROWS = 270;
const HORIZON = 0.645;
const GROUND = 0.665;
const ROAD_TOP = 0.835;
const CART_TOP = 1;
const LANDMARK_TRAVEL = 90; // Slow passing keeps each set piece visible throughout its chapter.
const SPEED = 7.5;
const WHITE: RGB = [255, 255, 255];
const DAWN: RGB = [255, 206, 112];
const NIGHT_GROUND: RGB = [32, 46, 78];
const NIGHT_SHADE: RGB = [8, 14, 44];
const MOON_SHADE: RGB = [40, 70, 150];
const DAWN_WASH: RGB = [255, 206, 98];
const DAPPLES: RGB = [198, 211, 112];

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

function signedChapterDelta(target: number, index: number, t: number): number {
  const n = CHAPTERS.length;
  let d = index + t - (target + 0.5);
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/**
 * Fairy Road: a wooden cart rolling along a dirt lane through an enchanted wood, marsh,
 * witch's cottage, standing stones, spirit deer glade, and golden dawn.
 */
export class FairyRoad implements JourneyView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private multiplier = PACE_SPEED.gentle;
  private loopCount = 0;
  private prevRouteSeconds = -1;
  private prevScroll = 0;

  readonly route = new Route('fairy', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };
  private readonly blended = createBlended();
  private readonly landmarks = new Landmarks();
  private readonly creatures = new Creatures();
  private readonly standing = new DrawList();
  private readonly glows = new DrawList();
  private readonly ridgeColor: RGB = [0, 0, 0];
  private readonly waterColor: RGB = [0, 0, 0];
  private readonly airColor: RGB = [0, 0, 0];
  private readonly groundColor: RGB = [0, 0, 0];
  private readonly litColor: RGB = [0, 0, 0];
  private readonly sunlight = { u: 0, v: 0, strength: 0.7, color: WHITE };
  private sprites: FairySprites | null = null;

  // Wave gesture tracking for waving at the witch
  private lastPointerX: number | null = null;
  private lastWaveDir: -1 | 0 | 1 = 0;
  private waveReversals = 0;
  private waveWindow = 0;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  setPace(pace: Pace): void {
    this.multiplier = PACE_SPEED[pace];
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_ROWS;
    this.dome.resize(w, h);
    this.land.canvas.width = w;
    this.land.canvas.height = h;
    if (!this.sprites) this.sprites = buildFairySprites();
    const scroll = this.currentScroll();
    this.prevScroll = scroll;
    this.landmarks.reset();
    this.creatures.reset(scroll, w, h);
  }

  press(x: number, y: number): void {
    const now = this.route.now;
    if (this.landmarks.press(x, y, this.unit, now.index)) return;
    this.creatures.press(x, y, this.h, this.unit);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (!this.sprites) this.sprites = buildFairySprites();
    const sprites = this.sprites;

    this.route.advance(frame.dt, this.multiplier);
    const now = this.route.now;
    const scroll = this.currentScroll();
    const scrollDelta = scroll - this.prevScroll;
    this.prevScroll = scroll;

    blendChapters(now.index, now.t, now.next, this.blended);
    const state = this.dome.stateAt(hourNow());
    const nightBoost = 1 - state.day;

    this.updateLook(state);
    this.dome.draw(ctx, state, frame, this.look);

    const stonesX = this.w * 0.5 - signedChapterDelta(3, now.index, now.t) * LANDMARK_TRAVEL * this.unit;
    const cottageX = this.w * 0.30 - signedChapterDelta(2, now.index, now.t) * LANDMARK_TRAVEL * this.unit;

    // Huge rising moon or sun disc behind Moonrise Stones (Ch 4)
    this.landmarks.drawMoonriseDisc(ctx, state, stonesX, this.h, this.unit, this.blended.weights[3]);

    // Land buffer (tinted by time of day and Chapter 6 dawn gold)
    const L = this.land.ctx;
    L.clearRect(0, 0, this.w, this.h);
    this.paintRidge(L, scroll, 0.06, 0.625, 0.11, 0.0045, blendColor(this.ridgeColor, this.blended.mountain, state.sky.horizon, 0.55));
    this.paintRidge(L, scroll, 0.15, 0.645, 0.055, 0.011, blendColor(this.ridgeColor, this.blended.hill, state.sky.horizon, 0.28));

    paintFairyHouses(L, sprites, scroll, this.w, this.h, this.unit, nightBoost);
    this.paintMidTrees(L, sprites, scroll);
    this.paintGround(L, scroll, state, frame.time, now.t);
    this.landmarks.paintStandingStones(
      L, sprites, stonesX, this.h, this.w, this.unit,
      blendColor(this.ridgeColor, this.blended.hill, state.sky.horizon, 0.15), this.blended.weights[3],
    );

    const standing = this.standing;
    standing.clear();
    this.glows.clear();
    this.collectScenery(sprites, scroll, frame.time, standing);
    this.landmarks.collectMushrooms(sprites, scroll, this.w, this.h, this.unit,
      this.blended.mushrooms, nightBoost, standing, this.glows);
    this.landmarks.collectCottage(sprites, cottageX, this.h, this.unit, frame.time, frame.dt,
      this.w, this.blended.weights[2], standing);
    this.landmarks.update(frame.dt, this.unit, now.index);
    this.detectWave(frame.dt, frame.pointer);
    this.creatures.update(
      frame.dt, frame.time, scroll, scrollDelta, this.w, this.h, this.unit,
      this.multiplier, this.blended.weights, now.index, frame.pointer, this.landmarks,
    );

    this.creatures.collectStanding(
      sprites, scroll, this.w, this.h, this.unit, frame.time, this.multiplier,
      this.blended.weights, now.index, standing,
    );
    standing.draw(L);

    this.paintMist(L, frame.time);
    paintEdgeLeaves(L, sprites, scroll, frame.time, this.w, this.h, this.unit);
    this.tintLand(L, state);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.land.canvas, 0, 0);

    // Post-tint bioluminescence, magic glows, and ambient spirits
    this.glows.draw(ctx);
    this.landmarks.drawCottageGlow(ctx, this.unit, nightBoost);
    this.landmarks.drawStoneGlows(ctx, sprites, stonesX, this.h, this.w, this.unit, this.blended.weights[3], nightBoost);
    this.landmarks.drawPuffs(ctx, this.unit);
    this.creatures.drawEffects(ctx, sprites, frame.time, this.unit, state.day, this.blended.weights, state.sun.up);

    drawCart(ctx, frame.time, this.multiplier, this.w, this.h, this.unit, nightBoost);
    this.title.draw(ctx, frame.dt, this.w, this.h, now.name);
    return this.look;
  }

  private currentScroll(): number {
    const secs = this.route.progress * this.route.total;
    if (this.prevRouteSeconds >= 0 && secs < this.prevRouteSeconds - this.route.total * 0.5) {
      this.loopCount++;
    }
    this.prevRouteSeconds = secs;
    return (this.loopCount * this.route.total + secs) * SPEED * this.unit;
  }

  private detectWave(dt: number, pointer: ViewFrame['pointer']): void {
    const witch = this.landmarks.witch;
    if (!pointer || !witch) {
      this.lastPointerX = null;
      this.lastWaveDir = 0;
      this.waveReversals = 0;
      this.waveWindow = 0;
      return;
    }
    if (this.waveWindow > 0) {
      this.waveWindow -= dt;
      if (this.waveWindow <= 0) {
        this.waveReversals = 0;
        this.lastWaveDir = 0;
      }
    }
    if (Math.hypot(pointer.x - witch.x, pointer.y - (witch.y - 10 * this.unit)) > 90 * this.unit) {
      this.lastPointerX = pointer.x;
      return;
    }
    if (this.lastPointerX !== null) {
      const dx = pointer.x - this.lastPointerX;
      if (Math.abs(dx) >= 2.5 * this.unit) {
        const dir: -1 | 1 = dx > 0 ? 1 : -1;
        if (this.lastWaveDir !== 0 && dir !== this.lastWaveDir && this.waveWindow > 0) {
          this.waveReversals++;
          this.waveWindow = 0.65;
          if (this.waveReversals >= 1) {
            this.landmarks.waveAtWitch(this.unit);
            this.waveReversals = 0;
          }
        } else {
          this.waveWindow = 0.65;
        }
        this.lastWaveDir = dir;
        this.lastPointerX = pointer.x;
      }
    } else {
      this.lastPointerX = pointer.x;
    }
  }

  private updateLook(state: SkyState): void {
    const { sky, sun, day } = state;
    const air = blendColor(this.airColor, sky.zenith, sky.horizon, 0.55);
    const ground = blendColor(this.groundColor, this.blended.grass, DAWN, this.blended.dawnGold * 0.3);
    const lit = blendColor(this.litColor, NIGHT_GROUND, ground, day);
    this.look.mean = luma(air) * 0.65 + luma(lit) * 0.35;
    this.look.night = 1 - day;
    blendColor(this.look.tint, air, lit, 0.3);
    this.sunlight.u = sun.u;
    this.sunlight.v = sun.v;
    this.sunlight.color = sky.light;
    this.look.sun = sun.up > -0.02 ? this.sunlight : null;
  }

  private paintRidge(
    L: CanvasRenderingContext2D,
    scroll: number,
    speed: number,
    baseShare: number,
    heightShare: number,
    scale: number,
    color: RGB,
  ): void {
    const ground = Math.round(this.h * GROUND);
    const base = Math.round(this.h * baseShare);
    const reach = this.h * heightShare;
    L.fillStyle = css(color);
    for (let x = 0; x < this.w; x++) {
      const at = (scroll * speed + x * (1 / Math.max(0.5, this.unit))) * scale;
      const rise = clamp01((fbm(at) - 0.28) * 1.9);
      const top = base - Math.round((0.1 + 0.9 * rise) * reach);
      L.fillRect(x, top, 1, ground - top + 3);
    }
  }

  private paintMidTrees(L: CanvasRenderingContext2D, sprites: FairySprites, scroll: number): void {
    const density = this.blended.trees;
    if (density <= 0.05) return;
    const speed = 0.42;
    const cell = 34 * this.unit;
    const first = Math.floor((scroll * speed - 60 * this.unit) / cell);
    const last = Math.ceil((scroll * speed + this.w + 60 * this.unit) / cell);
    const baseY = Math.round(this.h * 0.675);

    L.save();
    L.globalAlpha = 0.52;
    L.imageSmoothingEnabled = false;
    for (let k = first; k <= last; k++) {
      const seed = k * 3187 + 11;
      if (hash(seed) > density * 0.42) continue;
      const sx = Math.round((k + hash(seed + 1)) * cell - scroll * speed);
      const sp = sprites.trees[Math.abs(k) % sprites.trees.length];
      const tw = Math.round(sp.w * 0.9 * this.unit);
      const th = Math.round(sp.h * 0.9 * this.unit);
      L.drawImage(sp.canvas, Math.round(sx - tw / 2), baseY - th + Math.round(hash(seed + 2) * 3 * this.unit), tw, th);
    }
    L.restore();
  }

  private paintGround(L: CanvasRenderingContext2D, scroll: number, state: SkyState, time: number, chapterT: number): void {
    const g = Math.round(this.h * GROUND);
    const roadY = Math.round(this.h * ROAD_TOP);
    const marsh = this.blended.marsh;

    // Verge grass and marsh water pools
    const grassStr = css(this.blended.grass);
    const grassDarkStr = css(this.blended.grassDark);
    const waterTopStr = css(blendColor(this.waterColor, state.sky.horizon, this.blended.waterTop, 0.55));
    const waterDeepStr = css(blendColor(this.waterColor, state.sky.zenith, this.blended.waterDeep, 0.55));

    L.fillStyle = grassStr;
    L.fillRect(0, g, this.w, roadY - g);

    if (marsh > 0.04) {
      const poolTop = g + Math.round(3 * this.unit);
      const poolBot = roadY - Math.round(5 * this.unit);
      for (let x = 0; x < this.w; x++) {
        const wave = Math.sin((scroll + x) * 0.032 / Math.max(0.5, this.unit)) + Math.sin((scroll + x) * 0.015 / Math.max(0.5, this.unit));
        if (wave < 1.15 - marsh * 1.45) continue;
        const inset = Math.round(3 * this.unit * (1 - marsh * 0.5));
        const top = poolTop + inset;
        const bot = poolBot - inset;
        if (bot <= top) continue;
        const half = Math.ceil((bot - top) * 0.5);
        L.fillStyle = waterTopStr;
        L.fillRect(x, top, 1, half);
        L.fillStyle = waterDeepStr;
        L.fillRect(x, top + half, 1, bot - top - half);
        L.fillStyle = grassDarkStr;
        L.fillRect(x, bot, 1, 1);
      }
      // Still pool glints
      L.fillStyle = css(blendColor(this.waterColor, state.sky.horizon, WHITE, 0.45), 0.55 * marsh);
      for (let q = 0; q < 24; q++) {
        const pulse = Math.sin(time * (0.7 + hash(q)) + hash(q + 3) * 6.28);
        if (pulse < 0.4) continue;
        const gx = (((hash(q + 7) * this.w * 1.2 - scroll * 0.85) % this.w) + this.w) % this.w | 0;
        const gy = poolTop + Math.round(hash(q + 11) * (poolBot - poolTop - 4));
        L.fillRect(gx, gy, 2 + Math.round(hash(q + 13) * 2), 1);
      }
    }

    // Verge grass texture and toadstool rings
    for (let r = g + 3; r < roadY - 2; r += 4) {
      const depth = (r - g) / Math.max(1, roadY - g);
      const spd = 0.72 + 0.28 * depth;
      const spacing = 14 * this.unit;
      const offset = scroll * spd;
      L.fillStyle = grassDarkStr;
      for (let j = Math.floor(offset / spacing) - 1; j * spacing - offset < this.w; j++) {
        const seed = r * 97 + j;
        if (hash(seed) < 0.45) continue;
        const x = Math.round((j + hash(seed + 1)) * spacing - offset);
        if (x >= 0 && x < this.w) L.fillRect(x, r, 2, 1);
      }
    }

    // Small solid sun patches keep the daytime wood rich in colour.
    if (state.day > 0.5) {
      L.fillStyle = css(DAPPLES, 0.23 * state.day);
      const cell = 28 * this.unit;
      for (let k = Math.floor(scroll / cell); k <= Math.ceil((scroll + this.w) / cell); k++) {
        const x = Math.round((k + hash(k * 41)) * cell - scroll);
        const y = g + Math.round(hash(k * 43) * (roadY - g - 3));
        L.fillRect(x, y, Math.round(7 * this.unit), Math.max(1, Math.round(2 * this.unit)));
        L.fillRect(x + Math.round(3 * this.unit), y - 2, Math.round(3 * this.unit), 1);
      }
    }

    // Toadstool rings in Mushroom Wood
    if (this.blended.weights[0] > 0.1) {
      const cell = 76 * this.unit;
      const first = Math.floor(scroll / cell) - 1;
      const last = Math.ceil((scroll + this.w) / cell);
      for (let k = first; k <= last; k++) {
        const seed = k * 2113 + 7;
        if (hash(seed) > 0.55) continue;
        const cx = Math.round((k + 0.5) * cell - scroll);
        const cy = Math.round(this.h * (0.74 + hash(seed + 1) * 0.06));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const tx = cx + Math.round(Math.cos(a) * 7 * this.unit);
          const ty = cy + Math.round(Math.sin(a) * 2.5 * this.unit);
          L.fillStyle = '#e8dfd0';
          L.fillRect(tx, ty, 1, 2);
          L.fillStyle = '#d64e44';
          L.fillRect(tx - 1, ty - 1, 3, 1);
        }
      }
    }

    // Glowing and opening flowers (especially Ch 5 & Ch 6)
    this.paintFlowers(L, scroll, roadY, chapterT);

    // Dirt road with wheel ruts and pebbles
    const cartY = Math.round(this.h * CART_TOP);
    L.fillStyle = css(this.blended.road);
    L.fillRect(0, roadY, this.w, cartY - roadY);
    L.fillStyle = grassDarkStr;
    L.fillRect(0, roadY, this.w, 2);

    L.fillStyle = css(this.blended.roadRut);
    const rut1 = Math.round(this.h * 0.875);
    const rut2 = Math.round(this.h * 0.925);
    for (let x = 0; x < this.w; x += 2) {
      const wob = Math.round(Math.sin((scroll + x) * 0.04) * 0.6);
      L.fillRect(x, rut1 + wob, 2, 2);
      L.fillRect(x, rut2 - wob, 2, 2);
    }

    const pebbleCell = 18 * this.unit;
    const pFirst = Math.floor(scroll / pebbleCell) - 1;
    const pLast = Math.ceil((scroll + this.w) / pebbleCell);
    for (let k = pFirst; k <= pLast; k++) {
      const seed = k * 919 + 5;
      if (hash(seed) > 0.6) continue;
      const px = Math.round((k + hash(seed + 1)) * pebbleCell - scroll);
      const py = roadY + 3 + Math.round(hash(seed + 2) * (cartY - roadY - 6));
      L.fillStyle = hash(seed + 3) < 0.5 ? css(this.blended.roadRut) : '#c8b89a';
      L.fillRect(px, py, 2, 1);
      if (hash(seed + 4) < 0.23) {
        const width = Math.round((7 + hash(seed + 5) * 8) * this.unit);
        L.fillStyle = waterDeepStr;
        L.fillRect(px, py, width, Math.max(1, Math.round(3 * this.unit)));
        L.fillStyle = waterTopStr;
        L.fillRect(px + 2, py, Math.max(1, width - 4), 1);
      }
    }
  }

  private paintFlowers(L: CanvasRenderingContext2D, scroll: number, roadY: number, chapterT: number): void {
    const density = this.blended.flowers;
    if (density <= 0.05) return;
    const cell = 11 * this.unit;
    const first = Math.floor(scroll / cell) - 1;
    const last = Math.ceil((scroll + this.w) / cell);
    const top = Math.round(this.h * (GROUND + 0.02));
    const open = this.blended.weights[5] > 0.2 ? Math.min(1, chapterT * 2.2) : 1;

    // Pick dominant palette colours
    let dom = 0;
    for (let i = 1; i < this.blended.weights.length; i++) {
      if (this.blended.weights[i] > this.blended.weights[dom]) dom = i;
    }
    const colors = PALETTES[dom].flowerColors;

    for (let k = first; k <= last; k++) {
      const seed = k * 3571 + 1;
      if (hash(seed) > density * 0.65) continue;
      const sx = Math.round((k + hash(seed + 1)) * cell - scroll);
      if (sx < 0 || sx >= this.w) continue;
      const y = top + Math.round(hash(seed + 2) * (roadY - top - 4));
      const c = colors[Math.floor(hash(seed + 3) * colors.length)];
      L.fillStyle = '#3b6d32';
      L.fillRect(sx, y + 1, 1, 2);
      L.fillStyle = css(c);
      L.fillRect(sx, y, 1, 1);
      if (open > 0.45 && y > this.h * 0.72) {
        L.fillRect(sx - 1, y, 1, 1);
        L.fillRect(sx + 1, y, 1, 1);
        L.fillRect(sx, y - 1, 1, 1);
        L.fillStyle = '#fae47a';
        L.fillRect(sx, y, 1, 1);
      }
    }
  }

  private collectScenery(sprites: FairySprites, scroll: number, time: number, out: DrawList): void {
    const cell = 66 * this.unit;
    const first = Math.floor((scroll - 70 * this.unit) / cell);
    const last = Math.ceil((scroll + this.w + 70 * this.unit) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 7919 + 29;
      const x = (k + 0.15 + hash(seed + 1) * 0.7) * cell - scroll;
      // Leave the clock and the chapter's cast a clear silhouette.
      const edge = x < this.w * 0.16 || x > this.w * 0.94;
      if (hash(seed) <= this.blended.trees * 0.65 && edge) {
        const base = Math.round(this.h * (0.76 + hash(seed + 2) * 0.035));
        const sp = sprites.trees[Math.abs(k) % sprites.trees.length];
        const width = sp.w * 1.45 * this.unit;
        const height = sp.h * 1.45 * this.unit;
        out.add(sp, x - width / 2 + Math.sin(time * 0.9 + k), base - height, width, height, base);
      }
      const list = this.blended.marsh > 0.4 ? sprites.reeds : sprites.ferns;
      const sp = list[Math.abs(k) % list.length];
      const base = this.h * 0.82;
      out.add(sp, x, base - sp.h * this.unit, sp.w * this.unit, sp.h * this.unit, base);
    }
  }

  private paintMist(L: CanvasRenderingContext2D, time: number): void {
    const mistStrength = Math.max(this.blended.weights[1] * 0.9, this.blended.weights[3] * 0.75);
    if (mistStrength < 0.04) return;
    L.fillStyle = `rgba(210,228,236,${(0.18 * mistStrength).toFixed(3)})`;
    for (let i = 0; i < 9; i++) {
      const mx = (((hash(i * 19) * this.w * 1.4 - time * (4 + i % 3) * this.unit) % (this.w + 90)) + this.w + 90) % (this.w + 90) - 45;
      const my = Math.round(this.h * (0.65 + hash(i * 23) * 0.14));
      const mw = Math.round((36 + hash(i * 29) * 44) * this.unit);
      L.fillRect(Math.round(mx), my, mw, Math.max(2, Math.round(2.5 * this.unit)));
    }
  }

  private tintLand(L: CanvasRenderingContext2D, state: SkyState): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (day > 0.5 && sun.up > 0.55) {
      L.fillStyle = 'rgba(158,190,104,0.13)';
      L.fillRect(0, 0, this.w, this.h);
    }
    if (night > 0.02) {
      L.fillStyle = css(NIGHT_SHADE, 0.55 * night);
      L.fillRect(0, 0, this.w, this.h);
      L.fillStyle = css(MOON_SHADE, 0.16 * night);
      L.fillRect(0, 0, this.w, this.h);
    }
    const low = clamp01(1 - sun.up / 0.55) * day;
    if (low > 0.02) {
      L.fillStyle = css(sky.light, 0.26 * low);
      L.fillRect(0, 0, this.w, this.h);
    }
    if (this.blended.dawnGold > 0.02) {
      L.fillStyle = css(DAWN_WASH, 0.26 * this.blended.dawnGold);
      L.fillRect(0, 0, this.w, this.h);
    }
    L.restore();
  }

}
