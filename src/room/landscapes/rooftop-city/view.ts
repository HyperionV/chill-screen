import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import type { NightSky } from '../../night-sky';
import { SkyDome, clamp01, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import { createCastSprites, type CastSprites } from './cast-sprites';
import { RooftopCreatures } from './creatures';
import { ForegroundLayer } from './foreground';
import { createForegroundSprites, type ForegroundSprites } from './foreground-sprites';
import { RooftopInteractions } from './interactions';
import { createHaloSprites, type HaloSprites } from './light-halos';
import {
  CHAPTERS,
  DESIGN_ROWS,
  HORIZON,
  cameraAt,
  createCityLayout,
} from './scenes';
import { drawSetPiecesPostTint, drawSetPiecesPreTint } from './set-pieces';
import { Skyline } from './skyline';
import { createRooftopSprites, type RooftopSprites } from './sprites';

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const MOONLIT_WASH: RGB = [40, 51, 86];
const NIGHT_WASH = 0.42;

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

  readonly route = new Route('landscape-rooftop-city', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };

  private readonly layout = createCityLayout();
  private readonly skyline = new Skyline(this.layout);
  private readonly foreground = new ForegroundLayer();
  private readonly creatures = new RooftopCreatures();
  private readonly interactions = new RooftopInteractions();

  private sprites: RooftopSprites | null = null;
  private castSprites: CastSprites | null = null;
  private fgSprites: ForegroundSprites | null = null;
  private halos: HaloSprites | null = null;

  private lastCamX = 0;
  private lastNight = 0;
  private hasDrawn = false;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    this.hasDrawn = false;
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = this.h / DESIGN_ROWS;
    this.designW = this.w / this.unit;
    this.dome.resize(this.w, this.h);
    this.land.canvas.width = this.w;
    this.land.canvas.height = this.h;
    this.land.ctx.imageSmoothingEnabled = false;

    if (!this.sprites) this.sprites = createRooftopSprites();
    if (!this.castSprites) this.castSprites = createCastSprites();
    if (!this.fgSprites) this.fgSprites = createForegroundSprites();
    if (!this.halos) this.halos = createHaloSprites();
  }

  press(x: number, y: number): void {
    if (!this.hasDrawn) return;
    this.interactions.press(
      x / this.unit,
      y / this.unit,
      this.lastCamX,
      this.designW,
      this.lastNight,
      this.skyline,
      this.creatures,
      this.foreground,
    );
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites || !this.castSprites || !this.fgSprites || !this.halos) {
      return this.look;
    }

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, 1);
    const now = this.route.now;
    const { camX, blend } = cameraAt(now.index, now.t, now.next);
    this.lastCamX = camX;

    const pointerDesign = frame.pointer ? { x: frame.pointer.x / this.unit, y: frame.pointer.y / this.unit } : null;

    const hour = hourNow();
    const state = this.dome.stateAt(hour);
    this.lastNight = 1 - state.day;
    this.updateLook(state);

    this.skyline.step(dt);
    this.foreground.update(dt, frame.time);
    this.interactions.update(dt, pointerDesign);
    this.creatures.update(
      dt,
      frame.time,
      now.index,
      now.next,
      blend,
      camX,
      this.designW,
      state.day,
      pointerDesign,
    );

    // 1. Sky dome (gradient, stars, meteors, sun/moon, clouds)
    this.dome.draw(ctx, state, frame, this.look);

    // Composite city lights before the rooftop so hidden windows cannot shine through the bricks.
    const L = this.land.ctx;
    L.imageSmoothingEnabled = false;
    L.clearRect(0, 0, this.w, this.h);

    this.skyline.drawPreTint(L, state, hour, camX, this.designW, DESIGN_ROWS, this.unit, this.sprites);
    this.tintLand(L, state);
    ctx.drawImage(this.land.canvas, 0, 0);
    this.skyline.drawPostTint(ctx, state, frame.time, camX, this.designW, this.unit, this.sprites, this.halos);

    L.clearRect(0, 0, this.w, this.h);
    this.foreground.drawSilhouetteLayer(L, camX, this.designW, this.unit);
    this.foreground.drawTerraceAndParapet(L, state, frame.time, camX, this.designW, this.unit, this.fgSprites);
    drawSetPiecesPreTint(
      L,
      frame.time,
      camX,
      this.designW,
      this.unit,
      pointerDesign,
      this.sprites,
      this.interactions,
    );
    this.creatures.drawPreTint(L, frame.time, camX, this.designW, state.day, this.unit, this.castSprites);
    this.foreground.drawPropsPreTint(
      L,
      frame.time,
      camX,
      this.designW,
      this.unit,
      pointerDesign,
      this.fgSprites,
      this.interactions,
    );

    this.tintLand(L, state);
    ctx.drawImage(this.land.canvas, 0, 0);

    drawSetPiecesPostTint(
      ctx,
      state,
      frame.time,
      camX,
      this.designW,
      this.unit,
      this.sprites,
      this.halos,
      this.interactions,
    );
    this.foreground.drawPropsPostTint(
      ctx,
      state,
      frame.time,
      camX,
      this.designW,
      this.unit,
      this.fgSprites,
      this.halos,
    );
    this.creatures.drawPostTint(ctx, frame.time, camX, this.designW, this.unit, this.castSprites);

    this.title.draw(ctx, dt, this.w, this.h, now.name);
    this.hasDrawn = true;
    return this.look;
  }

  private updateLook(state: SkyState): void {
    const { sky, sun, day } = state;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const rooftopStone = mix([49, 55, 78], [108, 103, 111], day);
    this.look.mean = luma(air) * 0.6 + luma(rooftopStone) * 0.4;
    this.look.night = 1 - day;
    this.look.tint = mix(air, rooftopStone, 0.3);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.72, color: sky.light } : null;
  }

  private tintLand(L: CanvasRenderingContext2D, state: SkyState): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (night > 0.02) {
      L.fillStyle = css(MOONLIT_WASH, NIGHT_WASH * night);
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
