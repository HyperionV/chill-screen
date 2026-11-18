import { mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, smooth, type Body, type SkyKey } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { gust } from '../../wind';
import { SEED_DRIFT_CALM, SEED_DRIFT_GUST } from './coastal-wind';
import { SeasideCreatures } from './creatures';
import { createInteractions, handleScenePress, updateInteractions } from './interactions';
import { renderCoveScene, renderLighthouseScene, renderTidePoolsScene } from './scenes-headland';
import { renderBeachScene, renderHarbourScene } from './scenes-shore';
import { buildSprites, type SeasideSprites } from './sprites';
import {
  CHAPTERS,
  DESIGN_ROWS,
  HORIZON,
  SCENE_BEACH,
  SCENE_COVE,
  SCENE_HARBOUR,
  SCENE_LIGHTHOUSE,
  SCENE_TIDE_POOLS,
  TRANSITION_SECONDS,
  createBuffers,
  luma,
  resizeBuffers,
  type SceneBuffers,
  type SceneRenderContext,
} from './types';

const GLIDE_PIXELS = 14;

/**
 * Seaside landscape: five interconnected coastal scenes (Sandy Beach, Fishing Harbour,
 * Lighthouse Point, Tide Pools, Sunset Cove) with a recurring little red crab, coastal wildlife,
 * interactive props, and smooth 10-second cross-dissolve glides.
 */
export class SeasideView implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private lastTime = 0;
  private seedTravel = 0;

  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };
  private readonly dome: SkyDome;
  private readonly route = new Route('landscape-seaside', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly creatures = new SeasideCreatures();
  private readonly interactions = createInteractions();

  private sprites: SeasideSprites | null = null;
  private readonly buffersA: SceneBuffers = createBuffers(1, 1);
  private readonly buffersB: SceneBuffers = createBuffers(1, 1);
  private readonly blend = memoryCanvas(1, 1);

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = this.h / DESIGN_ROWS;
    this.dome.resize(this.w, this.h);
    resizeBuffers(this.buffersA, this.w, this.h);
    resizeBuffers(this.buffersB, this.w, this.h);
    this.blend.canvas.width = this.w;
    this.blend.canvas.height = this.h;
    this.blend.ctx.imageSmoothingEnabled = false;

    if (!this.sprites) this.sprites = buildSprites();
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0) return;
    const now = this.route.now;
    handleScenePress(now.index, x, y, this.w, this.h, this.unit, this.lastTime, this.interactions, this.creatures);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return this.look;

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    this.lastTime = frame.time;
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, 1);
    const now = this.route.now;
    const state = this.dome.stateAt(hourNow());
    this.updateLook(state.sky, state.sun, state.day);

    const windStrength = gust(frame.time);
    this.seedTravel += (SEED_DRIFT_CALM + SEED_DRIFT_GUST * windStrength) * dt;

    updateInteractions(this.interactions, dt);
    this.creatures.update(now.index, dt, frame.time, this.w, this.h, this.unit, frame.pointer);

    const dur = CHAPTERS[now.index].seconds;
    const remaining = (1 - now.t) * dur;
    const fade = remaining < TRANSITION_SECONDS ? smooth(1 - remaining / TRANSITION_SECONDS) : 0;

    if (fade > 0.002) {
      this.creatures.update(now.next, dt, frame.time, this.w, this.h, this.unit, frame.pointer);
    }

    this.dome.draw(ctx, state, frame, this.look);

    const baseCtx: SceneRenderContext = {
      w: this.w,
      h: this.h,
      unit: this.unit,
      time: frame.time,
      state,
      windStrength,
      seedTravel: this.seedTravel,
      glideX: 0,
      interactions: this.interactions,
    };

    if (fade <= 0.002) {
      this.renderScene(now.index, baseCtx, this.buffersA, this.sprites);
      ctx.drawImage(this.buffersA.scene.canvas, 0, 0);
    } else {
      const glide = GLIDE_PIXELS * this.unit;
      this.renderScene(now.index, { ...baseCtx, glideX: -fade * glide }, this.buffersA, this.sprites);
      this.renderScene(now.next, { ...baseCtx, glideX: (1 - fade) * glide }, this.buffersB, this.sprites);

      const B = this.blend.ctx;
      B.globalCompositeOperation = 'source-over';
      B.globalAlpha = 1;
      B.clearRect(0, 0, this.w, this.h);
      B.globalAlpha = 1 - fade;
      B.drawImage(this.buffersA.scene.canvas, 0, 0);
      B.globalCompositeOperation = 'lighter';
      B.globalAlpha = fade;
      B.drawImage(this.buffersB.scene.canvas, 0, 0);
      B.globalCompositeOperation = 'source-over';
      B.globalAlpha = 1;
      ctx.drawImage(this.blend.canvas, 0, 0);
    }

    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private renderScene(index: number, rc: SceneRenderContext, buffers: SceneBuffers, sprites: SeasideSprites): void {
    switch (index) {
      case SCENE_BEACH:
        renderBeachScene(rc, buffers, sprites, this.creatures);
        break;
      case SCENE_HARBOUR:
        renderHarbourScene(rc, buffers, sprites, this.creatures);
        break;
      case SCENE_LIGHTHOUSE:
        renderLighthouseScene(rc, buffers, sprites, this.creatures);
        break;
      case SCENE_TIDE_POOLS:
        renderTidePoolsScene(rc, buffers, sprites, this.creatures);
        break;
      case SCENE_COVE:
        renderCoveScene(rc, buffers, sprites, this.creatures);
        break;
      default:
        renderBeachScene(rc, buffers, sprites, this.creatures);
        break;
    }
  }

  private updateLook(sky: SkyKey, sun: Body, day: number): void {
    const air: RGB = mix(sky.zenith, sky.horizon, 0.55);
    this.look.mean = luma(air) * 0.6 + luma(sky.water) * 0.4;
    this.look.night = 1 - day;
    this.look.tint = mix(air, sky.water, 0.3);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.75, color: sky.light } : null;
  }
}
