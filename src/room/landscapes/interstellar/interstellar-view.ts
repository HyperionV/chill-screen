import { css, mix, type RGB } from '../../../render/color';
import type { Look } from '../../../wallpapers/look';
import { seededRandom } from '../../../world/math';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import type { OutsideView, ViewFrame } from '../../view';
import { gust } from '../../wind';
import { CargoFreighter, DockingTraffic, ExplorerProbe, PatrolDrone, TetheredAstronaut } from './cast';
import { SpaceInteractions } from './interactions';
import {
  drawAsteroidScene,
  drawBinarySunScene,
  drawHaze,
  drawIceAndStationScene,
  drawNebulaScene,
  drawRingedGiantScene,
  MOON_POSITIONS,
  type AsteroidBody,
  type SceneRenderContext,
} from './scene-renderers';
import { CHAPTERS, blendSceneStyle, createSceneStyle, fillSceneWeights } from './scenes';
import { buildInterstellarSprites, type InterstellarSprites } from './sprites';

const DESIGN_ROWS = 270;
const FAR_STARS = 135;
const MID_STARS = 55;
const ASTEROID_COUNT = 11;
const FOREGROUND_PEBBLES = 5;
/** Horizontal travel at the start or end of a chapter transition, at the design size. */
const CHAPTER_SLIDE = 14;

const STAR_TINTS: readonly RGB[] = [
  [232, 240, 255],
  [184, 214, 255],
  [255, 236, 198],
  [255, 206, 186],
];

interface StarDot {
  u: number;
  v: number;
  phase: number;
  speed: number;
  bright: boolean;
  tint: RGB;
}

/**
 * Interstellar: a calm deep-space window view drifting across five scenes (Ringed Giant, Nebula Nursery,
 * Asteroid Garden, Ice Moon and Station, Binary Sun) with twinkling stars, interactive comets,
 * shimmering worlds, and a recurring round white explorer probe.
 */
export class InterstellarView implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;

  private readonly route = new Route('landscape-interstellar', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly weights = new Float32Array(CHAPTERS.length);
  private readonly style = createSceneStyle();
  private readonly look: Look = { mean: 0.09, sun: null, sky: [], night: 1, tint: [38, 48, 86] };

  private readonly probe = new ExplorerProbe();
  private readonly freighter = new CargoFreighter();
  private readonly astronaut = new TetheredAstronaut();
  private readonly drone = new PatrolDrone();
  private readonly docking = new DockingTraffic();
  private readonly interactions = new SpaceInteractions();

  private sprites: InterstellarSprites | null = null;
  private farStars: StarDot[] = [];
  private midStars: StarDot[] = [];
  private asteroids: AsteroidBody[] = [];

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = Math.max(0.5, this.h / DESIGN_ROWS);
    this.sprites = buildInterstellarSprites(this.unit);
    this.interactions.resize(this.w, this.h);
    this.buildStars();
    this.buildAsteroids();
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return;

    // 1. Recurring explorer probe has top click priority.
    if (this.probe.contains(x, y, this.unit)) {
      this.probe.triggerSpin();
      return;
    }

    const dominant = this.route.now.index;

    // 2. Scene-specific cast & station clicks.
    if (dominant === 1 && this.astronaut.contains(x, y, this.unit)) {
      this.astronaut.triggerWave();
      return;
    }
    if (dominant === 3) {
      const stX = this.w * 0.79;
      const stY = this.h * 0.67;
      if (Math.hypot(x - stX, y - stY) <= Math.max(28, 38 * this.unit)) {
        this.interactions.triggerStationFlash();
        return;
      }
    }

    // 3. Planet and moon clicks (shimmer rings, clouds, or ice fractures).
    if (dominant === 0) {
      const moonIds: readonly (0 | 1 | 2)[] = [0, 1, 2];
      for (const i of moonIds) {
        const [u, v] = MOON_POSITIONS[i];
        const hitR = Math.max(10, (12 - i * 2) * this.unit);
        if (Math.hypot(x - u * this.w, y - v * this.h) <= hitR) {
          this.interactions.triggerMoonShimmer(i);
          return;
        }
      }
      const gx = this.w * 0.8;
      const gy = this.h * 0.75;
      const dx = x - gx;
      const dy = y - gy;
      const inBody = Math.hypot(dx, dy) <= 52 * this.unit;
      const inRings = Math.abs(dx) <= 104 * this.unit && Math.abs(dy) <= 44 * this.unit;
      if (inBody || inRings) {
        this.interactions.triggerGiantShimmer();
        return;
      }
    }
    if (dominant === 3) {
      const ix = this.w * 0.21;
      const iy = this.h * 0.77;
      if (Math.hypot(x - ix, y - iy) <= 46 * this.unit) {
        this.interactions.triggerIceMoonShimmer();
        return;
      }
    }

    // 4. Empty space launches a comet from the clicked spot.
    this.interactions.launchComet(x, y, this.w, this.unit);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return this.look;
    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, 1);
    const now = this.route.now;
    fillSceneWeights(now.index, now.t, now.next, this.weights);
    blendSceneStyle(this.weights, this.style);
    this.updateLook();

    const windStrength = gust(frame.time);
    this.interactions.update(dt, this.w, this.h, this.unit, frame.pointer, windStrength);
    if (this.weights[0] > 0.01) this.freighter.update(dt, this.w, this.h, frame.pointer);
    if (this.weights[1] > 0.01) {
      this.astronaut.update(dt, frame.time, this.w, this.h, frame.pointer);
    }
    if (this.weights[2] > 0.01) this.drone.update(dt, this.w, this.h, frame.pointer);
    if (this.weights[3] > 0.01) this.docking.update(dt);
    this.probe.update(dt, frame.time, this.w, this.h, this.weights, frame.pointer);

    // Layer 1: Deep space backdrop and cosmic haze.
    this.drawBackdrop(ctx, frame.time, windStrength);

    // Layers 2 and 3: Far and mid-far starfields.
    this.drawStars(ctx, this.farStars, frame.time, false);
    this.drawStars(ctx, this.midStars, frame.time, true);

    // Layer 4 & 5: Scene-specific celestial worlds and cast, cross-dissolved smoothly.
    for (let i = 0; i < CHAPTERS.length; i++) {
      const wScene = this.weights[i];
      if (wScene <= 0.01) continue;
      const chapterSlide = wScene < 0.99
        ? (i === now.index ? -1 : 1) * (1 - wScene) * CHAPTER_SLIDE * this.unit
        : 0;
      const rc: SceneRenderContext = {
        w: this.w,
        h: this.h,
        unit: this.unit,
        time: frame.time,
        alpha: wScene,
        chapterSlide,
        windStrength,
        sprites: this.sprites,
        interactions: this.interactions,
        freighter: this.freighter,
        astronaut: this.astronaut,
        drone: this.drone,
        docking: this.docking,
        asteroids: this.asteroids,
      };
      if (i === 0) drawRingedGiantScene(ctx, rc);
      else if (i === 1) drawNebulaScene(ctx, rc);
      else if (i === 2) drawAsteroidScene(ctx, rc);
      else if (i === 3) drawIceAndStationScene(ctx, rc);
      else drawBinarySunScene(ctx, rc);
    }

    // Recurring explorer probe on top of scene worlds (Layer 5).
    this.probe.draw(ctx, this.sprites.craft, frame.time, this.unit, 1);

    // Layer 6: Foreground stardust, micrometeoroids, and comets.
    this.interactions.stardust.draw(ctx, this.style.tint);
    this.drawForegroundMotes(ctx, frame.time);
    this.interactions.drawComets(ctx, this.unit);

    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private updateLook(): void {
    this.look.mean = this.style.mean;
    this.look.night = this.style.night;
    this.look.tint = [
      Math.round(this.style.tint[0]),
      Math.round(this.style.tint[1]),
      Math.round(this.style.tint[2]),
    ];
    this.look.sun =
      this.style.sunStrength > 0.04
        ? {
            u: this.style.sunU,
            v: this.style.sunV,
            strength: this.style.sunStrength,
            color: [
              Math.round(this.style.sunColor[0]),
              Math.round(this.style.sunColor[1]),
              Math.round(this.style.sunColor[2]),
            ],
          }
        : null;
  }

  private buildStars(): void {
    const rnd = seededRandom(4207);
    this.farStars = Array.from({ length: FAR_STARS }, () => ({
      u: rnd(),
      v: rnd(),
      phase: rnd() * Math.PI * 2,
      speed: 0.4 + rnd() * 0.9,
      bright: rnd() < 0.14,
      tint: STAR_TINTS[Math.floor(rnd() * STAR_TINTS.length)],
    }));
    this.midStars = Array.from({ length: MID_STARS }, () => ({
      u: rnd(),
      v: rnd(),
      phase: rnd() * Math.PI * 2,
      speed: 0.5 + rnd() * 1.0,
      bright: rnd() < 0.24,
      tint: STAR_TINTS[Math.floor(rnd() * STAR_TINTS.length)],
    }));
  }

  private buildAsteroids(): void {
    // Keep asteroids clear of center clock (0.30..0.56h) and radio (0.39..0.62w, 0.74..0.97h).
    const spots: [number, number, number][] = [
      [0.12, 0.2, 1],
      [0.86, 0.18, 2],
      [0.16, 0.61, 0],
      [0.3, 0.84, 3],
      [0.69, 0.62, 2],
      [0.85, 0.78, 4],
      [0.74, 0.87, 1],
      [0.92, 0.64, 0],
      [0.08, 0.79, 2],
      [0.24, 0.14, 0],
      [0.68, 0.22, 1],
    ];
    this.asteroids = spots.slice(0, ASTEROID_COUNT).map(([u, v, variant], i) => ({
      u,
      v,
      variant,
      driftX: (i % 2 === 0 ? 1 : -1) * (0.0012 + (i % 3) * 0.0004),
      driftY: i % 3 === 0 ? 0.0005 : -0.0004,
      bobPhase: i * 1.3,
    }));
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, time: number, windStrength: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, css(this.style.spaceTop));
    g.addColorStop(1, css(this.style.spaceBottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    drawHaze(ctx, this.w * 0.2, this.h * 0.2, this.w * 0.32, this.style.hazeA, 0.24, time, windStrength);
    drawHaze(ctx, this.w * 0.8, this.h * 0.74, this.w * 0.36, this.style.hazeB, 0.22, time, windStrength);
  }

  private drawStars(
    ctx: CanvasRenderingContext2D,
    stars: StarDot[],
    time: number,
    allowCross: boolean,
  ): void {
    const bhWeight = this.weights[4];
    const bhX = this.w * 0.79;
    const bhY = this.h * 0.72;
    const lensRadius = 46 * this.unit;

    for (const s of stars) {
      let sx = s.u * this.w;
      let sy = s.v * this.h;

      // Gravitational lensing around Scene 5's black hole bends background starlight radially.
      if (bhWeight > 0.05) {
        const dx = sx - bhX;
        const dy = sy - bhY;
        const d = Math.hypot(dx, dy);
        if (d > 6 * this.unit && d < lensRadius) {
          const push = (1 - d / lensRadius) ** 2 * 14 * this.unit * bhWeight;
          sx += (dx / d) * push;
          sy += (dy / d) * push;
        }
      }

      const x = Math.round(sx);
      const y = Math.round(sy);
      const inClockBand = y > this.h * 0.3 && y < this.h * 0.56 && x > this.w * 0.26 && x < this.w * 0.74;
      const tw = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
      const baseAlpha = (0.28 + 0.65 * tw) * (inClockBand ? 0.52 : 1);

      ctx.fillStyle = css(s.tint, baseAlpha);
      ctx.fillRect(x, y, 1, 1);
      if (allowCross && s.bright && !inClockBand && tw > 0.72) {
        ctx.fillStyle = css(s.tint, baseAlpha * 0.38);
        ctx.fillRect(x - 1, y, 1, 1);
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      }
    }
  }

  private drawForegroundMotes(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.fillStyle = css(mix(this.style.tint, [200, 210, 230], 0.4), 0.45);
    for (let i = 0; i < FOREGROUND_PEBBLES; i++) {
      const mx = Math.round((((i * 0.23 + time * 0.015 * (i % 2 === 0 ? 1 : 0.7)) % 1.1) - 0.05) * this.w);
      const my = Math.round(this.h * (i < 2 ? 0.14 + i * 0.08 : 0.65 + (i - 2) * 0.09));
      if (mx > this.w * 0.38 && mx < this.w * 0.63 && my > this.h * 0.72) continue;
      ctx.fillRect(mx, my, 2, 1);
    }
  }
}
