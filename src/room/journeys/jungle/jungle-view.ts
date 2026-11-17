import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { clamp } from '../../../world/math';
import { PACE_SPEED, type Pace } from '../../journey/pace';
import type { NightSky } from '../../night-sky';
import { SkyDome, clamp01, type SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ChapterTitle } from '../chapter-title';
import type { JourneyView } from '../journey-view';
import { fbm, hash } from '../noise';
import { Route } from '../route';
import { CHAPTERS, blendMood, createMood, fillWeights, type ChapterMood } from './chapters';
import { JungleFeatures } from './features';
import { JungleLandmarks } from './landmarks';
import { RiverLife } from './river-life';
import { buildSprites, type JungleSprites } from './sprites';
import { JungleWildlife } from './wildlife';

const DESIGN_ROWS = 270;
const HORIZON = 0.56;
/** Base river scroll speed in stage pixels/second at 270 rows and gentle pace. */
const BASE_SPEED = 9;
const BLOCK = 8;
const WHITE: RGB = [255, 255, 255];

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/**
 * Jungle River: a longboat drifting down a layered green river through six blending chapters
 * from Misty Dawn Reach to Firefly Bend, with interactive vines, leaves, parrots, crocodile,
 * frogs, and a hidden temple puzzle.
 */
export class JungleView implements JourneyView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private scroll = 0;
  private multiplier = PACE_SPEED.gentle;
  private lastChapterIndex = -1;

  private readonly route = new Route('jungle', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.45, sun: null, sky: [], night: 0, tint: [60, 100, 76] };
  private readonly weights = new Float32Array(CHAPTERS.length);
  private readonly mood: ChapterMood = createMood();
  private readonly wildlife = new JungleWildlife();
  private readonly riverLife = new RiverLife();
  private readonly features = new JungleFeatures();
  private readonly landmarks = new JungleLandmarks();
  private sprites: JungleSprites | null = null;
  private ridgeTops = new Int16Array(0);
  private blockColors: { ridge: string; waterTop: string; waterDeep: string; bank: string }[] = [];

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  setPace(pace: Pace): void {
    this.multiplier = PACE_SPEED[pace];
  }

  resize(w: number, h: number): void {
    const prevUnit = this.unit;
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = this.h / DESIGN_ROWS;
    this.dome.resize(this.w, this.h);
    this.land.canvas.width = this.w;
    this.land.canvas.height = this.h;
    this.land.ctx.imageSmoothingEnabled = false;

    this.sprites = buildSprites(this.unit);
    this.wildlife.resize(this.w, this.h, this.unit);
    this.riverLife.resize(this.w, this.h, this.unit);
    this.features.resize(this.w, this.h, this.unit);
    this.landmarks.resize(this.w, this.h, this.unit);
    this.ridgeTops = new Int16Array(this.w);

    if (this.scroll === 0) {
      this.scroll = this.route.progress * this.route.total * BASE_SPEED * this.unit;
    } else if (prevUnit > 0) {
      this.scroll = (this.scroll / prevUnit) * this.unit;
    }
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return;
    const ch5Weight = this.weights[4];
    if (this.landmarks.pressStone(x, y, ch5Weight, this.sprites)) return;
    const leafHit = this.features.shakeLeafAt(x, y, this.scroll, this.sprites);
    if (y <= this.h * 0.36) {
      this.wildlife.callParrots(x, y);
      return;
    }
    if (leafHit) return;
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return this.look;

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, this.multiplier);
    const now = this.route.now;
    if (this.lastChapterIndex === CHAPTERS.length - 1 && now.index === 0) {
      this.landmarks.resetTempleForLoop();
    }
    this.lastChapterIndex = now.index;

    fillWeights(now.index, now.t, now.next, this.weights);
    blendMood(this.weights, this.mood);

    this.scroll += BASE_SPEED * this.multiplier * this.unit * dt;

    const state = this.dome.stateAt(hourNow());
    this.prepareColumns(state);
    this.updateLook(state);

    this.features.update(dt, frame.time, this.scroll, this.mood, frame.pointer);
    this.landmarks.update(dt, this.weights[4]);
    this.wildlife.update(dt, frame.time, state.day, this.mood, this.weights, frame.pointer);
    this.riverLife.update(
      dt,
      this.scroll,
      state.day,
      this.mood.rainStrength,
      this.mood.fireflyBoost,
      this.weights[2],
      frame.pointer,
    );

    // 1. Sky dome + upper sky gap creatures
    this.dome.draw(ctx, state, frame, this.look);
    const thunder = this.features.thunderAlpha(this.mood.rainStrength);
    if (thunder > 0.005) {
      ctx.fillStyle = `rgba(210,224,255,${thunder.toFixed(3)})`;
      ctx.fillRect(0, 0, this.w, Math.round(this.h * HORIZON));
    }
    this.wildlife.drawSkyLife(ctx, frame.time, state.day, this.weights[5]);

    // 2. Offscreen land & river layer
    const L = this.land.ctx;
    L.clearRect(0, 0, this.w, this.h);

    this.drawDistantJungle(L, frame.time);
    this.drawLightShafts(L, state, frame.time);
    this.drawMidBank(L, frame.time, this.sprites);

    const templePos = this.landmarks.templePos(this.weights[4]);
    const waterfallX = Math.round(this.w * 0.75 + (1 - this.weights[2]) * this.w * 0.38);

    this.landmarks.drawWaterfall(L, frame.time, this.weights[2], this.sprites);
    this.landmarks.drawTempleBase(L, this.weights[4], this.sprites);

    this.drawRiver(L, state, frame.time, this.sprites);
    this.riverLife.draw(L, frame.time, this.scroll, this.weights, this.sprites.lilyPads, waterfallX);

    this.drawNearBankAndCanopy(L, frame.time, this.sprites);
    this.features.drawVines(L, this.scroll, this.mood);
    this.features.drawBigLeaves(L, this.scroll, 2, this.sprites);
    this.wildlife.drawUpperAndBankLife(L, frame.time, state.day, this.mood, this.weights, templePos);
    this.features.drawRainAndParticles(L, this.mood.rainStrength);

    this.tintLand(L, state);
    ctx.drawImage(this.land.canvas, 0, 0);

    // 3. Post-tint glows, calm middle mist, foreground fast leaves, longboat prow, chapter title
    this.features.drawMist(ctx, frame.time, this.mood);
    this.drawBiolumGlows(ctx, frame.time, state.day, this.sprites);
    this.landmarks.drawPostTint(ctx, dt, frame.time, state.day, this.mood, this.weights[2], this.weights[4], this.sprites);

    this.features.drawBigLeaves(ctx, this.scroll, 3, this.sprites);
    this.drawForegroundReeds(ctx, frame.time);
    this.drawBoat(ctx, frame.time, state.day, this.sprites);

    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private prepareColumns(state: SkyState): void {
    const blocks = Math.ceil(this.w / BLOCK);
    this.blockColors.length = blocks;
    const ridgeMist = mix(this.mood.farRidge, this.mood.mistColor, 0.42);
    const waterTopCol = mix(this.mood.waterTop, state.sky.horizon, 0.22);
    const waterDeepCol = mix(this.mood.waterDeep, state.sky.zenith, 0.16);
    for (let i = 0; i < blocks; i++) {
      this.blockColors[i] = {
        ridge: css(ridgeMist),
        waterTop: css(waterTopCol),
        waterDeep: css(waterDeepCol),
        bank: css(this.mood.midBank),
      };
    }
    const base = this.h * 0.50;
    const reach = this.h * 0.14;
    for (let x = 0; x < this.w; x++) {
      const at = (this.scroll * 0.12 + x) * 0.009;
      const h = fbm(at);
      this.ridgeTops[x] = Math.round(base - h * reach);
    }
  }

  private updateLook(state: SkyState): void {
    const air = mix(state.sky.zenith, state.sky.horizon, 0.55);
    const lit = mix([22, 38, 60], this.mood.foliageMid, state.day * (1 - this.mood.dimness * 0.55));
    this.look.mean = clamp01((luma(air) * 0.28 + luma(lit) * 0.72) * (1 - this.mood.dimness * 0.38));
    this.look.night = 1 - state.day;
    this.look.tint = mix(air, lit, 0.65);
    this.look.sun =
      state.sun.up > -0.02
        ? { u: state.sun.u, v: state.sun.v, strength: 0.48 * (1 - this.mood.rainStrength * 0.75), color: state.sky.light }
        : null;
  }

  /** Layer 1 (speed 0.12): soft distant jungle ridge and silhouetted palms, keeping clock band calm. */
  private drawDistantJungle(L: CanvasRenderingContext2D, time: number): void {
    const bankBottom = Math.round(this.h * 0.60);
    for (let x = 0; x < this.w; x++) {
      const top = this.ridgeTops[x];
      L.fillStyle = this.blockColors[x >> 3].ridge;
      L.fillRect(x, top, 1, bankBottom - top);
    }
    if (!this.sprites) return;
    const cell = Math.round(46 * this.unit);
    const speed = 0.12;
    const first = Math.floor((this.scroll * speed - 40) / cell);
    const last = Math.ceil((this.scroll * speed + this.w + 40) / cell);
    L.save();
    L.globalAlpha = 0.58;
    for (let k = first; k <= last; k++) {
      const seed = k * 3917;
      if (hash(seed) > 0.68) continue;
      const lx = (k + hash(seed + 1)) * cell;
      const sx = Math.round(lx - this.scroll * speed);
      const sp = this.sprites.palmsFar[Math.floor(hash(seed + 2) * this.sprites.palmsFar.length)];
      const sway = Math.round(Math.sin(time * 0.7 + lx * 0.02) * 1.2 * this.unit);
      const baseY = this.ridgeTops[clamp(sx, 0, this.w - 1)] + Math.round(14 * this.unit);
      L.drawImage(sp.canvas, Math.round(sx - sp.w / 2) + sway, baseY - sp.h);
    }
    L.restore();
  }

  /** Soft slanted light beams filtering through canopy gaps into the river mist. */
  private drawLightShafts(L: CanvasRenderingContext2D, state: SkyState, time: number): void {
    const strength = this.mood.shaftStrength * clamp01(state.day * 1.3 - 0.15);
    if (strength < 0.04) return;
    const col = css(mix(state.sky.light, WHITE, 0.25), strength * 0.12);
    L.fillStyle = col;
    for (let i = 0; i < 4; i++) {
      const baseX = ((0.14 + i * 0.24) * this.w + Math.sin(time * 0.12 + i) * 12 * this.unit);
      const width = Math.round((14 + (i % 2) * 8) * this.unit);
      const topY = Math.round(this.h * 0.04);
      const botY = Math.round(this.h * 0.74);
      for (let y = topY; y < botY; y += 2) {
        const k = (y - topY) / (botY - topY);
        L.fillRect(Math.round(baseX + k * 24 * this.unit), y, Math.round(width * (0.5 + k * 0.7)), 2);
      }
    }
  }

  /** Layer 2 (speed 0.40): mid-far riverbank, tree ferns, mid palms, and far giant leaves. */
  private drawMidBank(L: CanvasRenderingContext2D, time: number, sprites: JungleSprites): void {
    const topY = Math.round(this.h * 0.56);
    const botY = Math.round(this.h * 0.67);
    const midCol = css(this.mood.midBank);
    const darkCol = css(this.mood.foliageDark);

    for (let x = 0; x < this.w; x++) {
      const undulate = Math.round(fbm((this.scroll * 0.4 + x) * 0.025) * 9 * this.unit);
      L.fillStyle = midCol;
      L.fillRect(x, topY + undulate, 1, botY - (topY + undulate));
      L.fillStyle = darkCol;
      L.fillRect(x, botY - 2, 1, 2);
    }

    const cell = Math.round(38 * this.unit);
    const speed = 0.4;
    const first = Math.floor((this.scroll * speed - 50) / cell);
    const last = Math.ceil((this.scroll * speed + this.w + 50) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 5233 + 19;
      const lx = (k + hash(seed)) * cell;
      const sx = Math.round(lx - this.scroll * speed);
      const roll = hash(seed + 1);
      const sway = Math.round(Math.sin(time * 0.9 + lx * 0.015) * 1.4 * this.unit);
      if (roll < 0.34) {
        const sp = sprites.palmsMid[Math.floor(hash(seed + 2) * sprites.palmsMid.length)];
        L.drawImage(sp.canvas, Math.round(sx - sp.w / 2) + sway, Math.round(this.h * 0.62) - sp.h);
      } else if (roll < 0.72) {
        const sp = sprites.fernsMid[Math.floor(hash(seed + 2) * sprites.fernsMid.length)];
        L.drawImage(sp.canvas, Math.round(sx - sp.w / 2) + sway, Math.round(this.h * 0.64) - sp.h);
      } else {
        const sp = sprites.leavesFar[Math.floor(hash(seed + 2) * sprites.leavesFar.length)];
        L.drawImage(sp.canvas, Math.round(sx - sp.w / 2), Math.round(this.h * 0.63) - sp.h);
      }
    }
  }

  /** Layer 3 (speed 1.00): green river with reflections, waves, ripples, and driftwood. */
  private drawRiver(L: CanvasRenderingContext2D, state: SkyState, time: number, sprites: JungleSprites): void {
    const riverTop = Math.round(this.h * 0.65);
    const riverBot = this.h;
    const span = Math.max(1, riverBot - riverTop);
    const rough = this.mood.rainStrength;
    const reflectCol = css(mix(this.mood.foliageMid, state.sky.horizon, 0.25), 0.35);

    for (let x = 0; x < this.w; x++) {
      const block = this.blockColors[x >> 3];
      const wave = Math.round(Math.sin(x * 0.08 + time * (1.8 + rough * 2.5)) * (0.6 + rough * 1.4));
      const top = riverTop + wave;
      const half = Math.ceil(span * 0.42);
      L.fillStyle = block.waterTop;
      L.fillRect(x, top, 1, half);
      L.fillStyle = block.waterDeep;
      L.fillRect(x, top + half, 1, riverBot - (top + half));

      // Subtle vertical canopy/sky reflection shimmer
      if ((x + Math.round(this.scroll * 0.5)) % 4 === 0) {
        L.fillStyle = reflectCol;
        L.fillRect(x, top + 2, 1, Math.round(span * (0.16 + 0.08 * Math.sin(x * 0.05 + time))));
      }
    }

    // Horizontal water ripple glints (calmer in dawn/firefly, choppier in monsoon)
    const glintCount = Math.round(34 + rough * 28);
    L.fillStyle = css(mix(this.mood.mistColor, state.sky.horizon, 0.45), 0.38 + rough * 0.24);
    for (let i = 0; i < glintCount; i++) {
      const gx = (((hash(i * 13 + 1) * this.w * 1.2 - this.scroll * 0.92 - time * 6 * this.unit) % this.w) + this.w) % this.w;
      const gy = riverTop + 4 + Math.round(hash(i * 13 + 2) * (this.h * 0.24));
      const len = Math.round((3 + hash(i * 13 + 3) * (6 - rough * 3)) * this.unit);
      if (Math.sin(time * (1.4 + rough * 2) + i) > 0.1) {
        L.fillRect(Math.round(gx), gy, Math.max(1, len), 1);
      }
    }

    // Drifting driftwood logs
    const woodSpan = this.w + 120 * this.unit;
    for (let i = 0; i < 2; i++) {
      const wx = 90 + i * 260;
      const raw = (wx - this.scroll * 0.92) % woodSpan;
      const sx = Math.round((raw < 0 ? raw + woodSpan : raw) - 50 * this.unit);
      const sy = Math.round(this.h * (0.76 + i * 0.05) + Math.sin(time * 1.3 + i) * 0.6);
      const sp = sprites.driftwood[i % sprites.driftwood.length];
      L.drawImage(sp.canvas, sx, sy);
    }
  }

  /** Near shoreline roots, ferns, orchids, bioluminescent flowers, and overhead mossy canopy boughs. */
  private drawNearBankAndCanopy(L: CanvasRenderingContext2D, time: number, sprites: JungleSprites): void {
    const bankY = Math.round(this.h * 0.665);
    const bankCol = css(this.mood.nearBank);
    L.fillStyle = bankCol;
    L.fillRect(0, bankY - 2, this.w, Math.round(4 * this.unit));

    const cell = Math.round(44 * this.unit);
    const first = Math.floor((this.scroll - 40) / cell);
    const last = Math.ceil((this.scroll + this.w + 40) / cell);
    const orchidShow = clamp(this.weights[1] + this.weights[0] * 0.3, 0, 1);

    for (let k = first; k <= last; k++) {
      const seed = k * 6701 + 7;
      const lx = (k + hash(seed)) * cell;
      const sx = Math.round(lx - this.scroll);
      const sp = sprites.fernsNear[Math.floor(hash(seed + 1) * sprites.fernsNear.length)];
      const sway = Math.round(Math.sin(time * 1.1 + lx * 0.02) * 1.5 * this.unit);
      L.drawImage(sp.canvas, Math.round(sx - sp.w / 2) + sway, bankY - sp.h + 2);

      // Gnarled roots dipping to the water edge
      if (hash(seed + 2) < 0.45) {
        L.fillStyle = 'rgb(64,46,32)';
        L.fillRect(sx - 2, bankY - 3, 2, Math.round(6 * this.unit));
        L.fillRect(sx + 1, bankY - 2, 1, Math.round(5 * this.unit));
      }

      // Orchids along bank & branches (Chapter 2)
      if (orchidShow > 0.08 && hash(seed + 3) < 0.52 * orchidShow) {
        const osp = sprites.orchids[Math.floor(hash(seed + 4) * sprites.orchids.length)];
        L.drawImage(osp.canvas, sx - 2, bankY - osp.h - Math.round(hash(seed + 5) * 6 * this.unit));
      }

      // Bioluminescent flowers (base plant drawn pre-tint; glowing petals re-drawn post-tint)
      if (hash(seed + 6) < 0.45) {
        const bsp = sprites.bioFlowers[Math.floor(hash(seed + 7) * sprites.bioFlowers.length)];
        L.drawImage(bsp.canvas, sx + 4, bankY - bsp.h);
      }
    }

    // Overhead dark canopy border + horizontal mossy boughs (perches for parrots, toucan, monkeys)
    const canopyThick = Math.round(this.h * (0.045 + this.mood.canopyDensity * 0.055));
    L.fillStyle = css(this.mood.foliageDark);
    L.fillRect(0, 0, this.w, canopyThick);
    L.fillStyle = css(this.mood.foliageMid);
    for (let x = 0; x < this.w; x += 6) {
      const dip = Math.round(fbm((this.scroll * 0.8 + x) * 0.03) * canopyThick * 0.9);
      L.fillRect(x, canopyThick - 2, 6, dip);
    }

    // Sturdy horizontal perches at the upper canopy bands so birds/monkeys sit naturally
    const bark = 'rgb(52,38,26)';
    const moss = css(this.mood.foliageMid);
    const drawBough = (bx: number, by: number, bw: number) => {
      L.fillStyle = bark;
      L.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.max(2, Math.round(3 * this.unit)));
      L.fillStyle = moss;
      L.fillRect(Math.round(bx + 2), Math.round(by - 1), Math.round(bw - 4), 1);
    };
    drawBough(0, this.h * 0.19, this.w * 0.36);
    drawBough(this.w * 0.58, this.h * 0.18, this.w * 0.42);
    drawBough(this.w * 0.14, this.h * 0.25, this.w * 0.22);
  }

  /** Glowing petals on bioluminescent flowers (Ch 6 Firefly Bend & night hours). */
  private drawBiolumGlows(ctx: CanvasRenderingContext2D, time: number, day: number, sprites: JungleSprites): void {
    const strength = clamp(this.mood.biolumBoost + (1 - day) * 0.45, 0, 1);
    if (strength < 0.06) return;
    const bankY = Math.round(this.h * 0.665);
    const cell = Math.round(44 * this.unit);
    const first = Math.floor((this.scroll - 40) / cell);
    const last = Math.ceil((this.scroll + this.w + 40) / cell);
    ctx.save();
    for (let k = first; k <= last; k++) {
      const seed = k * 6701 + 7;
      if (hash(seed + 6) >= 0.45) continue;
      const lx = (k + hash(seed)) * cell;
      const sx = Math.round(lx - this.scroll);
      const bsp = sprites.bioGlows[Math.floor(hash(seed + 7) * sprites.bioGlows.length)];
      const pulse = 0.65 + 0.35 * Math.sin(time * 1.8 + k);
      ctx.globalAlpha = strength * pulse;
      ctx.drawImage(bsp.canvas, sx + 4, bankY - bsp.h);
    }
    ctx.restore();
  }

  /** Layer 4 (speed 1.45): fast-passing foreground shoreline tufts along bottom corners. */
  private drawForegroundReeds(ctx: CanvasRenderingContext2D, time: number): void {
    const speed = 1.45;
    const cell = Math.round(34 * this.unit);
    const first = Math.floor((this.scroll * speed - 20) / cell);
    const last = Math.ceil((this.scroll * speed + this.w + 20) / cell);
    ctx.fillStyle = css(this.mood.foliageDark);
    for (let k = first; k <= last; k++) {
      const seed = k * 9103 + 11;
      if (hash(seed) > 0.55) continue;
      const lx = (k + hash(seed + 1)) * cell;
      const sx = Math.round(lx - this.scroll * speed);
      const sway = Math.round(Math.sin(time * 2.2 + lx * 0.03) * 2 * this.unit);
      const h = Math.round((8 + hash(seed + 2) * 8) * this.unit);
      ctx.fillRect(sx + sway, this.h - h, 2, h);
    }
  }

  /** Foreground longboat bow at the lower-left edge, gently rocking with current & monsoon swells. */
  private drawBoat(ctx: CanvasRenderingContext2D, time: number, day: number, sprites: JungleSprites): void {
    const rock = Math.sin(time * 1.35) * (0.9 + this.mood.boatRock * 2.4) * this.unit;
    const bx = 0;
    const by = Math.round(this.h - sprites.boat.h + 3 * this.unit + rock);
    ctx.drawImage(sprites.boat.canvas, bx, by);

    // Small warm bow lantern at dusk/night/monsoon
    const lanternGlow = clamp(Math.max(1 - day, this.mood.dimness * 1.4, this.weights[5] * 0.8), 0.15, 1);
    const lx = Math.round(sprites.boat.w * 0.84);
    const ly = by + Math.round(sprites.boat.h * 0.18);
    ctx.fillStyle = `rgba(255,204,108,${(0.22 * lanternGlow).toFixed(3)})`;
    ctx.fillRect(lx - 3, ly - 3, 7, 7);
    ctx.fillStyle = `rgba(255,232,164,${lanternGlow.toFixed(3)})`;
    ctx.fillRect(lx - 1, ly - 1, 2, 2);
  }

  /** Tints the land layer for night, sunset, and monsoon dimness, matching the house style. */
  private tintLand(L: CanvasRenderingContext2D, state: SkyState): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (night > 0.02) {
      L.fillStyle = css([8, 16, 44], 0.56 * night);
      L.fillRect(0, 0, this.w, this.h);
      L.fillStyle = css([34, 68, 136], 0.16 * night);
      L.fillRect(0, 0, this.w, this.h);
    }
    const low = clamp01(1 - sun.up / 0.55) * day;
    if (low > 0.02) {
      L.fillStyle = css(sky.light, 0.24 * low);
      L.fillRect(0, 0, this.w, this.h);
    }
    if (this.mood.dimness > 0.02) {
      L.fillStyle = css([14, 24, 28], this.mood.dimness * 0.42);
      L.fillRect(0, 0, this.w, this.h);
    }
    L.restore();
  }
}
