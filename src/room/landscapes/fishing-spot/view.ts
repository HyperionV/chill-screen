import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { ChapterTitle } from '../../journeys/chapter-title';
import { FogLayer } from '../../journeys/fog';
import { ramp } from '../../journeys/noise';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, clamp01, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { FishingCreatures, type RippleTrigger } from './creatures';
import { FishingInteractions } from './interactions';
import { FishingScenes } from './scenes';
import { buildFishingSprites, type FishingSprites } from './sprites';
import {
  CHAPTERS,
  DESIGN_ROWS,
  HORIZON,
  TRANSITION_SECONDS,
  computeLayout,
  type SceneIndex,
  type SceneLayout,
} from './types';

const MIST_COLOR: RGB = [214, 224, 232];
const CAMERA_GLIDE_PX = 12;

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

function toSceneIndex(index: number): SceneIndex {
  switch (index) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 4;
    default:
      return 0;
  }
}

/**
 * Fishing Spot: a calm lakeside landscape with five scenes (Wooden Jetty, Reed Shallows,
 * Morning Rowboat, Evening Pier, Night Fishing), recurring angler and dog, interactive
 * cast-and-reel fishing, bird takeoffs, and skittish fish shadows.
 */
export class FishingSpotView implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private layout: SceneLayout = computeLayout(480, 270, 1);

  private readonly route = new Route('landscape-fishing-spot', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly fog = new FogLayer();
  private readonly landA = memoryCanvas(1, 1);
  private readonly landB = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };

  private readonly scenes = new FishingScenes();
  private readonly creatures = new FishingCreatures();
  private readonly interactions = new FishingInteractions();
  private readonly addRipple = (r: RippleTrigger) => this.interactions.addRing(r);
  private sprites: FishingSprites | null = null;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = this.h / DESIGN_ROWS;
    this.layout = computeLayout(this.w, this.h, this.unit);
    this.dome.resize(this.w, this.h);
    this.fog.resize(this.w, this.h);

    this.landA.canvas.width = this.w;
    this.landA.canvas.height = this.h;
    this.landA.ctx.imageSmoothingEnabled = false;
    this.landB.canvas.width = this.w;
    this.landB.canvas.height = this.h;
    this.landB.ctx.imageSmoothingEnabled = false;

    if (!this.sprites) {
      this.sprites = buildFishingSprites();
    }
    this.scenes.resize(this.w, this.h, this.layout, this.sprites);
    this.creatures.syncLayout(this.layout);
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0) return;
    const scene = toSceneIndex(this.route.now.index);
    this.interactions.press(x, y, scene, this.layout, this.creatures);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return this.look;

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.scenes.stepWind(frame.time, dt);
    this.route.advance(dt, 1);
    const now = this.route.now;
    const sceneA = toSceneIndex(now.index);
    const sceneB = toSceneIndex(now.next);
    const chapterDuration = CHAPTERS[sceneA]?.seconds ?? 210;
    const remaining = (1 - now.t) * chapterDuration;
    const blend = remaining < TRANSITION_SECONDS ? ramp(TRANSITION_SECONDS, 0, remaining) : 0;

    const hour = hourNow();
    const state = this.dome.stateAt(hour);
    this.updateLook(state, sceneA, sceneB, blend);

    this.interactions.update(dt, frame.pointer, sceneA, this.layout);
    const rowboatX = this.scenes.rowboatX(frame.time, this.layout);
    this.creatures.update(
      dt,
      frame.time,
      sceneA,
      this.layout,
      state.day,
      this.interactions.pointer,
      rowboatX,
      this.addRipple,
    );
    if (blend > 0.005) {
      this.creatures.update(
        dt,
        frame.time,
        sceneB,
        this.layout,
        state.day,
        this.interactions.pointer,
        rowboatX,
        this.addRipple,
      );
    }

    // 1. Sky dome (shared across scene transitions)
    this.dome.draw(ctx, state, frame, this.look);

    // 2. Render active scene (or smooth 10-second cross-dissolve + camera glide between scenes)
    if (blend <= 0.005) {
      this.renderLandBuffer(this.landA.ctx, state, sceneA, frame.time);
      ctx.drawImage(this.landA.canvas, 0, 0);
      this.renderPostTint(ctx, state, sceneA, frame, hour, 1);
    } else {
      const glide = CAMERA_GLIDE_PX * this.unit;
      this.renderLandBuffer(this.landA.ctx, state, sceneA, frame.time);
      this.renderLandBuffer(this.landB.ctx, state, sceneB, frame.time);

      ctx.save();
      ctx.globalAlpha = 1 - blend;
      ctx.drawImage(this.landA.canvas, Math.round(-blend * glide), 0);
      ctx.globalAlpha = blend;
      ctx.drawImage(this.landB.canvas, Math.round((1 - blend) * glide), 0);
      ctx.restore();

      this.renderPostTint(ctx, state, sceneA, frame, hour, 1 - blend);
      this.renderPostTint(ctx, state, sceneB, frame, hour, blend);
    }

    this.scenes.drawForeground(ctx, this.sprites, state, this.layout, frame.time);
    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private renderLandBuffer(
    L: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    time: number,
  ): void {
    if (!this.sprites) return;
    L.imageSmoothingEnabled = false;
    L.clearRect(0, 0, this.w, this.h);
    this.scenes.drawBackdrop(L, state, scene, this.layout, time);
    this.scenes.drawWater(L, this.sprites, state, scene, this.layout, time);
    this.scenes.drawSceneMidground(
      L,
      this.sprites,
      state,
      scene,
      this.layout,
      time,
      this.interactions,
      this.creatures,
    );
    this.tintLand(L, state, scene);
    this.scenes.drawLights(L, this.sprites, state, scene, this.layout, time);
  }

  private renderPostTint(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    frame: ViewFrame,
    hour: number,
    alpha: number,
  ): void {
    if (alpha < 0.01 || !this.sprites) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    this.creatures.drawNightAndGlowLife(ctx, this.sprites, scene, this.layout, frame.time, state.day);
    this.drawLakeMist(ctx, state, scene, frame, hour);
    ctx.restore();
  }

  private drawLakeMist(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    frame: ViewFrame,
    hour: number,
  ): void {
    this.scenes.drawLayeredShoreMist(ctx, state, scene, this.layout, frame.time, hour);

    const dawnMist = hour >= 5.2 && hour <= 8.5 ? Math.sin(((hour - 5.2) / 3.3) * Math.PI) * 0.45 : 0;
    const sceneMist = scene === 2 ? 0.65 : 0;
    const mistStrength = Math.max(dawnMist, sceneMist);

    // Condensation stays on the glass so a wiped patch can fill back in.
    if (mistStrength > 0.05) {
      this.fog.grow(frame.dt * 0.22 * mistStrength, 0.72 * mistStrength);
      if (frame.pointer) this.fog.wipe(frame.pointer.x, frame.pointer.y, 26 * this.unit);
      const tint = mix(MIST_COLOR, state.sky.horizon, 0.35);
      this.fog.draw(ctx, this.w, this.h, tint, 0.2 * mistStrength);
    } else if (this.fog.covered > 0.01) {
      this.fog.fade(frame.dt * 0.45);
      this.fog.draw(ctx, this.w, this.h, MIST_COLOR, 0.18);
    }
  }

  private updateLook(state: SkyState, sceneA: SceneIndex, sceneB: SceneIndex, blend: number): void {
    const { sky, sun, day } = state;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const nightBoostA = sceneA === 4 ? 0.28 : 0;
    const nightBoostB = sceneB === 4 ? 0.28 : 0;
    const nightBoost = nightBoostA * (1 - blend) + nightBoostB * blend;

    this.look.mean = clamp01((luma(air) * 0.58 + luma(sky.water) * 0.42) * (1 - nightBoost * 0.45));
    this.look.night = clamp01(1 - day + nightBoost * 0.5);
    let tint = mix(air, sky.water, 0.35);
    const eveningMix = (sceneA === 3 ? 1 - blend : 0) + (sceneB === 3 ? blend : 0);
    if (eveningMix > 0.01) {
      tint = mix(tint, [232, 162, 102], 0.14 * eveningMix);
    }
    this.look.tint = tint;
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.72, color: sky.light } : null;
  }

  private tintLand(L: CanvasRenderingContext2D, state: SkyState, scene: SceneIndex): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (night > 0.02) {
      L.fillStyle = css([17, 28, 50], 0.35 * night);
      L.fillRect(0, 0, this.w, this.h);
      L.fillStyle = css([64, 92, 129], 0.14 * night);
      L.fillRect(0, 0, this.w, this.h);
    }
    const low = clamp01(1 - sun.up / 0.55) * day;
    if (low > 0.02) {
      L.fillStyle = css(sky.light, 0.25 * low);
      L.fillRect(0, 0, this.w, this.h);
    }
    // Subtle scene-signature atmospheric tint that still respects Time control
    if (scene === 3) {
      L.fillStyle = css([236, 138, 76], 0.10 * day);
      L.fillRect(0, 0, this.w, this.h);
    } else if (scene === 4) {
      L.fillStyle = css([28, 47, 70], 0.14 * day);
      L.fillRect(0, 0, this.w, this.h);
    }
    L.restore();
  }
}
