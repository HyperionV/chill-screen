import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { approach, clamp } from '../../../world/math';
import type { NightSky } from '../../night-sky';
import { SkyDome, clamp01, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import { createCastSprites, type CastSprites } from './cast-sprites';
import { RooftopCreatures } from './creatures';
import { RooftopInteractions } from './interactions';
import {
  CHAPTERS,
  DESIGN_ROWS,
  FRONT_PARALLAX,
  FRONT_SPAN,
  HORIZON,
  SCENE_SPACING,
  WORLD_W,
  cameraAt,
  createCityLayout,
  deckTopAt,
  wrapDelta,
} from './scenes';
import { drawSetPiecesPostTint, drawSetPiecesPreTint } from './set-pieces';
import { Skyline } from './skyline';
import { createRooftopSprites, type RooftopSprites } from './sprites';

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

const PARALLAX_MAX_SHIFT = 7;

/**
 * Rooftop City: a calm, lived-in rooftop above a layered skyline spanning five connected
 * camera spots (Water Tower Roof, Skyline Golden Hour, Neon Rooftop Bar, Billboard Roof,
 * and Rooftop Garden) with a recurring grey cat and interactive city life.
 */
export class RooftopCityView implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private designW = 480;
  private pxShift = 0;

  private readonly route = new Route('landscape-rooftop-city', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };

  private readonly layout = createCityLayout();
  private readonly skyline = new Skyline(this.layout);
  private readonly creatures = new RooftopCreatures();
  private readonly interactions = new RooftopInteractions();

  private sprites: RooftopSprites | null = null;
  private castSprites: CastSprites | null = null;

  private lastCamX = 0;
  private lastNight = 0;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = Math.max(0.5, this.h / DESIGN_ROWS);
    this.designW = this.w / this.unit;
    this.dome.resize(this.w, this.h);
    this.land.canvas.width = this.w;
    this.land.canvas.height = this.h;
    this.land.ctx.imageSmoothingEnabled = false;

    if (!this.sprites) this.sprites = createRooftopSprites();
    if (!this.castSprites) this.castSprites = createCastSprites();
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0) return;
    this.interactions.press(
      x / this.unit,
      y / this.unit,
      this.lastCamX,
      this.pxShift,
      this.designW,
      this.lastNight,
      this.skyline,
      this.creatures,
    );
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites || !this.castSprites) return this.look;

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, 1);
    const now = this.route.now;
    const { camX, blend } = cameraAt(now.index, now.t, now.next);
    this.lastCamX = camX;

    const targetShift = frame.pointer
      ? clamp((frame.pointer.x / this.w - 0.5) * 2 * PARALLAX_MAX_SHIFT, -PARALLAX_MAX_SHIFT, PARALLAX_MAX_SHIFT)
      : 0;
    this.pxShift = approach(this.pxShift, targetShift, 4.5, dt);

    const pointerDesign = frame.pointer ? { x: frame.pointer.x / this.unit, y: frame.pointer.y / this.unit } : null;

    const hour = hourNow();
    const state = this.dome.stateAt(hour);
    this.lastNight = 1 - state.day;
    this.updateLook(state);

    this.skyline.step(dt);
    this.interactions.update(dt, pointerDesign);
    this.creatures.update(
      dt,
      frame.time,
      now.index,
      now.next,
      blend,
      camX,
      this.pxShift,
      this.designW,
      state.day,
      pointerDesign,
    );

    // 1. Sky dome (gradient, stars, meteors, sun/moon, clouds)
    this.dome.draw(ctx, state, frame, this.look);

    // 2. Offscreen city + rooftop layer
    const L = this.land.ctx;
    L.imageSmoothingEnabled = false;
    L.clearRect(0, 0, this.w, this.h);

    this.skyline.drawPreTint(L, state, hour, camX, this.pxShift, this.designW, DESIGN_ROWS, this.unit, this.sprites);
    this.drawRooftopDeck(L, camX, this.pxShift);
    drawSetPiecesPreTint(
      L,
      frame.time,
      camX,
      this.pxShift,
      this.designW,
      this.unit,
      pointerDesign,
      this.sprites,
      this.interactions,
    );
    this.creatures.drawPreTint(L, frame.time, camX, this.pxShift, this.designW, state.day, this.unit, this.castSprites);

    this.tintLand(L, state);
    ctx.drawImage(this.land.canvas, 0, 0);

    // 3. Post-tint lights, glowing signs, greenhouse glow, sprinkler water, balloons, notes, silhouettes
    this.skyline.drawPostTint(ctx, state, frame.time, camX, this.pxShift, this.designW, this.unit, this.sprites);
    drawSetPiecesPostTint(ctx, state, frame.time, camX, this.pxShift, this.designW, this.unit, this.sprites, this.interactions);
    this.creatures.drawPostTint(ctx, frame.time, camX, this.pxShift, this.designW, this.unit, this.castSprites);
    this.drawForegroundSilhouettes(ctx, state, camX, this.pxShift);

    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private updateLook(state: SkyState): void {
    const { sky, sun, day } = state;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const rooftopStone = mix([42, 48, 72], [116, 108, 102], day);
    this.look.mean = luma(air) * 0.6 + luma(rooftopStone) * 0.4;
    this.look.night = 1 - day;
    this.look.tint = mix(air, rooftopStone, 0.3);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.72, color: sky.light } : null;
  }

  private drawRooftopDeck(L: CanvasRenderingContext2D, camX: number, pxShift: number): void {
    const foreCam = camX + pxShift;
    const halfW = this.designW * 0.5;
    const step = 4;

    for (let sx = 0; sx < this.designW; sx += step) {
      const wx = foreCam + sx - halfW;
      const top = deckTopAt(wx);
      const dx = Math.round(sx * this.unit);
      const dw = Math.max(1, Math.round((sx + step) * this.unit) - dx);
      const dy = Math.round(top * this.unit);
      const dh = this.h - dy;

      L.fillStyle = '#7c4b3e';
      L.fillRect(dx, dy, dw, dh);
      L.fillStyle = '#5e362c';
      for (let ry = top + 5; ry < DESIGN_ROWS; ry += 5) {
        L.fillRect(dx, Math.round(ry * this.unit), dw, Math.max(1, Math.round(0.9 * this.unit)));
      }

      L.fillStyle = '#9aa3b0';
      L.fillRect(dx, dy - Math.round(2 * this.unit), dw, Math.max(2, Math.round(3 * this.unit)));
      L.fillStyle = '#c0c8d4';
      L.fillRect(dx, dy - Math.round(2 * this.unit), dw, Math.max(1, Math.round(this.unit)));
    }

    const overlookSx = wrapDelta(SCENE_SPACING, foreCam, WORLD_W) + halfW;
    if (overlookSx > -200 && overlookSx < this.designW + 200) {
      const railLeft = Math.round((overlookSx - 148) * this.unit);
      const railW = Math.round(296 * this.unit);
      const railTop = Math.round(205 * this.unit);
      const railThick = Math.max(1, Math.round(this.unit));
      L.fillStyle = '#383e4a';
      L.fillRect(railLeft, railTop, railW, railThick);
      L.fillRect(railLeft, railTop + Math.round(5 * this.unit), railW, railThick);
      for (let rx = overlookSx - 144; rx <= overlookSx + 144; rx += 18) {
        L.fillRect(Math.round(rx * this.unit), railTop, railThick, Math.round(12 * this.unit));
      }
    }
  }

  private drawForegroundSilhouettes(ctx: CanvasRenderingContext2D, state: SkyState, camX: number, pxShift: number): void {
    const frontCam = camX * FRONT_PARALLAX + pxShift * FRONT_PARALLAX;
    const halfW = this.designW * 0.5;
    const col = mix([22, 26, 36], [10, 12, 22], 1 - state.day);
    ctx.fillStyle = css(col, 0.72);

    for (let k = 0; k < 5; k++) {
      const wx = k * 700 + 350;
      const sx = wrapDelta(wx, frontCam, FRONT_SPAN) + halfW;
      if (sx < -20 || sx > this.designW + 20) continue;
      if (sx > this.designW * 0.32 && sx < this.designW * 0.68) continue;
      const x = Math.round(sx * this.unit);
      const h = Math.round(28 * this.unit);
      ctx.fillRect(x, this.h - h, Math.max(2, Math.round(3 * this.unit)), h);
      ctx.fillRect(
        x - Math.round(5 * this.unit),
        this.h - h + Math.round(4 * this.unit),
        Math.round(13 * this.unit),
        Math.max(1, Math.round(2 * this.unit)),
      );
    }
  }

  private tintLand(L: CanvasRenderingContext2D, state: SkyState): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (night > 0.02) {
      L.fillStyle = css([8, 14, 44], 0.56 * night);
      L.fillRect(0, 0, this.w, this.h);
      L.fillStyle = css([38, 66, 146], 0.16 * night);
      L.fillRect(0, 0, this.w, this.h);
    }
    const low = clamp01(1 - sun.up / 0.55) * day;
    if (low > 0.02) {
      L.fillStyle = css(sky.light, 0.25 * low);
      L.fillRect(0, 0, this.w, this.h);
    }
    L.restore();
  }
}
