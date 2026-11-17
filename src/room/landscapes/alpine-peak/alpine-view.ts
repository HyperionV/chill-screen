import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { approach } from '../../../world/math';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, smooth, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { AlpineCast } from './cast';
import { AlpineInteractions } from './interactions';
import {
  ALPINE_COLORS,
  CHAPTERS,
  SCENE_ANCHORS,
  SKY_HORIZON,
  TRANSITION_SECONDS,
  alpenglowStrength,
  sceneTerrainY,
} from './scenes';
import { buildAlpineSprites, type AlpineSprites } from './sprites';
import { drawFarRange, drawForegroundGround, drawMainTerrain, drawMidRange } from './terrain';

const DESIGN_ROWS = 270;
const ROUTE_KEY = 'landscape-alpine-peak';
const MAX_PARALLAX_X = 4.2;
const MAX_PARALLAX_Y = 2.0;

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/**
 * Alpine Peak landscape: five interconnected high-mountain scenes with jagged alpine silhouettes,
 * strong sunrise/sunset alpenglow, two hazy far ranges, a dithered cloud sea, wildlife, climbers, and cable car.
 */
export class AlpinePeakView implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private parX = 0;
  private parY = 0;

  private readonly route = new Route(ROUTE_KEY, CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private readonly blendBuf = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [140, 168, 204] };
  private readonly cast = new AlpineCast();
  private readonly interactions = new AlpineInteractions();
  private sprites: AlpineSprites | null = null;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, SKY_HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = Math.max(0.5, this.h / DESIGN_ROWS);
    this.dome.resize(this.w, this.h);
    this.interactions.resize(this.w, this.h);
    this.land.canvas.width = this.w;
    this.land.canvas.height = this.h;
    this.land.ctx.imageSmoothingEnabled = false;
    this.blendBuf.canvas.width = this.w;
    this.blendBuf.canvas.height = this.h;
    this.blendBuf.ctx.imageSmoothingEnabled = false;

    if (!this.sprites) {
      this.sprites = buildAlpineSprites();
    }
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0) return;
    const { index: scene } = this.route.now;

    if (this.cast.tryClickIbex(x, y, this.unit)) {
      const pos = this.cast.ibexPosition(scene, this.w, this.h, this.parX, this.parY);
      this.interactions.spawnLeapDust(pos.x, pos.y, this.unit);
      return;
    }
    if (this.cast.tryClickEagle(x, y, scene, this.unit)) return;
    if (this.cast.tryClickCableCar(x, y, scene, this.unit)) return;
    if (this.interactions.tryClickHut(x, y, scene, this.unit)) return;
    this.interactions.tryClickSnow(x, y, scene, this.w, this.h, this.unit);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return this.look;

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, 1);
    const now = this.route.now;
    const hour = hourNow();
    const state = this.dome.stateAt(hour);
    const glow = alpenglowStrength(hour);
    this.updateLook(state, glow);

    const targetParX = frame.pointer ? ((frame.pointer.x / this.w) - 0.5) * -2 * MAX_PARALLAX_X * this.unit : 0;
    const targetParY = frame.pointer ? ((frame.pointer.y / this.h) - 0.5) * -2 * MAX_PARALLAX_Y * this.unit : 0;
    this.parX = approach(this.parX, targetParX, 3.2, dt);
    this.parY = approach(this.parY, targetParY, 3.2, dt);

    this.interactions.update(dt, frame.time, now.index, this.w, this.h, this.unit, frame.pointer);
    this.cast.update(dt, frame.time, now.index, this.w, this.h, this.unit, frame.pointer);

    // 1. Sky dome + Milky Way / extra stars / shooting star + soaring eagle in upper third.
    this.dome.draw(ctx, state, frame, this.look);
    this.interactions.drawSkyExtras(ctx, now.index, this.w, this.h, this.look.night, frame.time);
    this.cast.drawSkyCast(ctx, now.index, this.w, this.h, frame.time, this.sprites);

    // 2. Render active scene (and cross-dissolve cleanly over final 10s without sky bleed).
    const chapterSec = CHAPTERS[now.index].seconds;
    const remaining = (1 - now.t) * chapterSec;
    const blend = remaining < TRANSITION_SECONDS ? smooth(1 - remaining / TRANSITION_SECONDS) : 0;

    const L = this.land.ctx;
    L.clearRect(0, 0, this.w, this.h);
    this.renderSceneLand(L, now.index, hour, state, glow, frame.time, this.sprites);
    this.tintLand(L, state, glow);

    if (blend > 0.005) {
      const B = this.blendBuf.ctx;
      B.clearRect(0, 0, this.w, this.h);
      this.renderSceneLand(B, now.next, hour, state, glow, frame.time, this.sprites);
      this.tintLand(B, state, glow);

      L.save();
      L.globalCompositeOperation = 'destination-out';
      L.fillStyle = `rgba(0,0,0,${blend.toFixed(4)})`;
      L.fillRect(0, 0, this.w, this.h);
      L.globalCompositeOperation = 'lighter';
      L.globalAlpha = blend;
      L.drawImage(this.blendBuf.canvas, 0, 0);
      L.restore();
    }

    ctx.drawImage(this.land.canvas, 0, 0);

    // 3. Post-tint warm glows (lit hut window, tent lantern, cable car interior, chimney smoke rings).
    this.drawPostTint(ctx, now.index, state.day, 1 - blend, this.sprites);
    if (blend > 0.05) {
      this.drawPostTint(ctx, now.next, state.day, blend, this.sprites);
    }

    // 4. Chapter title overlay.
    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private updateLook(state: SkyState, glow: number): void {
    const { sky, sun, day } = state;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const alpenglowSnow = mix(ALPINE_COLORS.snowLit, ALPINE_COLORS.alpenglowPink, 0.55 * glow);
    const snowGround = mix([32, 46, 84], alpenglowSnow, Math.max(day, glow * 0.45));
    this.look.mean = luma(air) * 0.52 + luma(snowGround) * 0.48;
    this.look.night = 1 - day;
    this.look.tint = mix(air, snowGround, 0.34);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.75, color: sky.light } : null;
  }

  /** Renders 6+ alpine depth layers: 2 hazy far ranges, cloud sea 0, mid range, main mountains, cloud sea 1, foreground. */
  private renderSceneLand(
    L: CanvasRenderingContext2D,
    scene: number,
    hour: number,
    state: SkyState,
    glow: number,
    time: number,
    sprites: AlpineSprites,
  ): void {
    const sunRight = state.sun.up > -0.02 ? state.sun.u >= 0.5 : hour >= 12;

    drawFarRange(L, 1, scene, this.w, this.h, this.unit, this.parX, this.parY, state, glow, sunRight);
    this.interactions.drawCloudSea(L, scene, 0, this.w, this.h, this.unit, hour, state, this.parX * 0.5, this.parY * 0.5);
    drawFarRange(L, 2, scene, this.w, this.h, this.unit, this.parX, this.parY, state, glow, sunRight);
    drawMidRange(L, scene, this.w, this.h, this.unit, this.parX, this.parY, state, glow, sunRight);

    drawMainTerrain(L, scene, this.w, this.h, this.unit, time, this.parX, this.parY, state, glow, sunRight, sprites);
    this.drawLandmarks(L, scene, sprites);
    this.cast.drawSceneCast(
      L,
      scene,
      this.w,
      this.h,
      this.unit,
      time,
      this.parX,
      this.parY,
      sprites,
      this.interactions.wind,
    );
    this.interactions.drawLandEffects(
      L,
      scene,
      this.w,
      this.h,
      this.unit,
      time,
      state,
      this.parX,
      this.parY,
      sprites.hut,
    );

    this.interactions.drawCloudSea(L, scene, 1, this.w, this.h, this.unit, hour, state, this.parX * 1.1, this.parY * 1.1);
    drawForegroundGround(L, scene, this.w, this.h, this.unit, this.parX, this.parY, state, glow, sprites);
  }

  private drawLandmarks(L: CanvasRenderingContext2D, scene: number, sprites: AlpineSprites): void {
    if (scene === 1) {
      const hx = Math.round(SCENE_ANCHORS.glacierHut.u * this.w - sprites.hut.w / 2 + this.parX);
      const hy = Math.round(SCENE_ANCHORS.glacierHut.v * this.h - sprites.hut.h + 4 + this.parY);
      L.drawImage(sprites.hut.canvas, hx, hy);
    } else if (scene === 4) {
      const hx = Math.round(SCENE_ANCHORS.starryHut.u * this.w - sprites.hut.w / 2 + this.parX);
      const hy = Math.round(SCENE_ANCHORS.starryHut.v * this.h - sprites.hut.h + 4 + this.parY);
      L.drawImage(sprites.hut.canvas, hx, hy);

      const tx = Math.round(SCENE_ANCHORS.starryTent.u * this.w - sprites.tent.w / 2 + this.parX);
      const ty = Math.round(SCENE_ANCHORS.starryTent.v * this.h - sprites.tent.h + 4 + this.parY);
      L.drawImage(sprites.tent.canvas, tx, ty);

      const cx = Math.round(this.w * 0.34 - sprites.cairn.w / 2 + this.parX);
      const cy = Math.round(sceneTerrainY(4, 0.34) * this.h - sprites.cairn.h + 4 + this.parY);
      L.drawImage(sprites.cairn.canvas, cx, cy);
    }
  }

  private drawPostTint(
    ctx: CanvasRenderingContext2D,
    scene: number,
    day: number,
    fadeAlpha: number,
    sprites: AlpineSprites,
  ): void {
    if (fadeAlpha <= 0.02) return;
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    this.interactions.drawPostTintEffects(
      ctx,
      scene,
      this.w,
      this.h,
      day,
      this.parX,
      this.parY,
      sprites.hut,
      sprites.tent.glowDoor,
    );
    this.cast.drawPostTintCast(ctx, scene, day, sprites);
    ctx.restore();
  }

  /** Tints terrain for moonlit night while preserving strong sunlit-vs-shadow alpenglow contrast. */
  private tintLand(L: CanvasRenderingContext2D, state: SkyState, glow: number): void {
    const night = (1 - state.day) * (1 - glow * 0.65);
    if (night <= 0.02) return;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    L.fillStyle = css([10, 18, 48], 0.56 * night);
    L.fillRect(0, 0, this.w, this.h);
    L.fillStyle = css([46, 78, 152], 0.18 * night);
    L.fillRect(0, 0, this.w, this.h);
    L.restore();
  }
}
