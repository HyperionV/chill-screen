import { css, mix, type RGB } from '../../../render/color';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import type { Pace } from '../../journey/pace';
import { PACE_SPEED } from '../../journey/pace';
import type { NightSky } from '../../night-sky';
import { SkyDome, clamp01, type SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ChapterTitle } from '../chapter-title';
import { FogLayer } from '../fog';
import type { JourneyView } from '../journey-view';
import { Route } from '../route';
import { CanalCast, type WaterBounds } from './cast';
import { CHAPTERS, LOCK, canalScroll, lockDepthAt } from './chapters';
import { CanalInteractions } from './interactions';
import { CanalScenery } from './scenery';
import { createCanalSprites, type CanalSprites } from './sprites';

const DESIGN_ROWS = 270;
const HORIZON = 0.56;
const DECK_DESIGN_Y = DESIGN_ROWS * 0.945;
const MIST_COLOR: RGB = [212, 224, 228];

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/** Canal Barge journey: a calm voyage past countryside banks, locks, market quay, windmills, bridges, and harbour. */
export class CanalView implements JourneyView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private multiplier = PACE_SPEED.gentle;

  readonly route = new Route('canal', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly fog = new FogLayer();
  private readonly scenery = new CanalScenery();
  private readonly cast = new CanalCast();
  private readonly interactions = new CanalInteractions();
  private sprites: CanalSprites | null = null;

  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };
  private lastShoreDesignY = DESIGN_ROWS * 0.67;
  private lastQuayHeight = 0;

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
    this.unit = Math.max(0.5, h / DESIGN_ROWS);
    this.dome.resize(w, h);
    this.fog.resize(w, h);
    this.scenery.resize(w, h);
    if (!this.sprites) this.sprites = createCanalSprites();
  }

  press(x: number, y: number): void {
    if (this.w === 0 || this.h === 0) return;
    const { index: chapter, t: chapterT } = this.route.now;
    const scroll = canalScroll(chapter, chapterT);
    const bounds = this.currentBounds(chapter, chapterT);
    const res = this.interactions.press(x, y, this.w, this.unit, chapter, chapterT, scroll, bounds, this.cast);
    if (res.lockBoostSeconds > 0 && chapter === 1) {
      const remaining = Math.max(0, (LOCK.departAt - chapterT) * CHAPTERS[1].seconds);
      const boost = Math.min(res.lockBoostSeconds, remaining);
      if (boost > 0) this.route.advance(boost, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (!this.sprites || this.w === 0 || this.h === 0) return this.look;

    this.route.advance(frame.dt, this.multiplier);
    const { index: chapter, name, t: chapterT } = this.route.now;
    const scroll = canalScroll(chapter, chapterT);

    const haltedInLock = chapter === 1 && chapterT >= LOCK.stopAt && chapterT <= LOCK.departAt;
    const effectiveSpeed = haltedInLock ? 0 : this.multiplier;
    const lockDepth = lockDepthAt(chapter, chapterT);
    const lockLiftDesign = lockDepth * 22;

    const state = this.dome.stateAt(hourNow());
    const prep = this.scenery.prepare(scroll, state);
    this.updateLook(state, prep.midGrass, prep.bridgeShade);

    this.dome.draw(ctx, state, frame, this.look);
    this.scenery.step(frame.dt, frame.time, scroll);

    const effectiveShoreDesignY = this.scenery.drawBank(
      this.sprites,
      scroll,
      frame.time,
      chapter,
      chapterT,
      prep.shoreDesignY,
      lockLiftDesign,
      this.interactions.gateNudgeTimer,
    );
    this.lastShoreDesignY = effectiveShoreDesignY;

    const inLock = chapter === 1 && chapterT > 0.14 && chapterT < 0.78;
    const quayHeight = inLock ? 18 : prep.quayHeight;
    this.lastQuayHeight = quayHeight;

    const bounds: WaterBounds = {
      shoreY: effectiveShoreDesignY,
      deckY: DECK_DESIGN_Y,
      quayHeight,
      designW: this.w / this.unit,
    };
    const pointerDesign = frame.pointer ? { x: frame.pointer.x / this.unit, y: frame.pointer.y / this.unit } : null;

    this.interactions.update(frame.dt, bounds, this.cast);
    this.cast.update(frame.dt, frame.time, scroll, effectiveSpeed, chapter, bounds, pointerDesign, this.interactions.crumbs);
    this.cast.drawBankCast(this.scenery.land.ctx, scroll, frame.time, chapter, bounds, lockLiftDesign, this.unit);

    this.tintLand(this.scenery.land.ctx, state);
    ctx.drawImage(this.scenery.land.canvas, 0, 0);

    this.scenery.drawWaterAndForeground(
      ctx,
      state,
      frame.dt,
      frame.time,
      scroll,
      effectiveSpeed,
      effectiveShoreDesignY,
      prep.bridgeShade,
      frame.pointer,
    );

    this.cast.drawWaterCast(ctx, this.sprites, scroll, frame.time, chapter, bounds, this.unit);
    this.interactions.drawWater(ctx, frame.time, bounds, this.unit);
    this.scenery.drawOverlay(ctx, this.sprites, state, frame.time, scroll, effectiveShoreDesignY, lockLiftDesign);

    this.drawMorningMist(ctx, frame, state, chapter, chapterT, effectiveShoreDesignY);
    this.interactions.drawBell(ctx, this.w, this.unit);
    this.title.draw(ctx, frame.dt, this.w, this.h, name);

    return this.look;
  }

  private currentBounds(chapter: number, chapterT: number): WaterBounds {
    const inLock = chapter === 1 && chapterT > 0.14 && chapterT < 0.78;
    return {
      shoreY: this.lastShoreDesignY,
      deckY: DECK_DESIGN_Y,
      quayHeight: inLock ? 18 : this.lastQuayHeight,
      designW: this.w / this.unit,
    };
  }

  private drawMorningMist(
    ctx: CanvasRenderingContext2D,
    frame: ViewFrame,
    state: SkyState,
    chapter: number,
    chapterT: number,
    shoreDesignY: number,
  ): void {
    const mistStrength = chapter === 0 ? 1 - Math.max(0, (chapterT - 0.72) / 0.28) : chapter === 6 && chapterT > 0.8 ? (chapterT - 0.8) / 0.2 : 0;
    if (mistStrength > 0.05) {
      this.fog.grow(frame.dt * 0.25 * mistStrength, 0.75 * mistStrength);
      if (frame.pointer) this.fog.wipe(frame.pointer.x, frame.pointer.y, 24 * this.unit);
      const tint = mix(MIST_COLOR, state.sky.horizon, 0.35);
      this.fog.draw(ctx, this.w, this.h, tint, 0.22 * mistStrength);

      // Soft low-lying mist ribbons hugging the water surface
      const shorePx = Math.round(shoreDesignY * this.unit);
      ctx.fillStyle = css(tint, 0.22 * mistStrength);
      for (let i = 0; i < 6; i++) {
        const mx = Math.round(((i * 92 + frame.time * (3 + (i % 2))) % (this.w / this.unit + 60) - 30) * this.unit);
        const my = shorePx + Math.round(((i % 3) * 4 - 4) * this.unit);
        ctx.fillRect(mx, my, Math.round(48 * this.unit), Math.max(2, Math.round(2 * this.unit)));
      }
    } else if (this.fog.covered > 0.01) {
      this.fog.fade(frame.dt * 0.4);
      this.fog.draw(ctx, this.w, this.h, MIST_COLOR, 0.2);
    }
  }

  private updateLook(state: SkyState, midGrass: RGB, bridgeShade: number): void {
    const { sky, sun, day } = state;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const lit = mix([40, 56, 90], midGrass, day);
    this.look.mean = (luma(air) * 0.65 + luma(lit) * 0.35) * (1 - bridgeShade * 0.35);
    this.look.night = 1 - day;
    this.look.tint = mix(air, lit, 0.3);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.7 * (1 - bridgeShade * 0.7), color: sky.light } : null;
  }

  private tintLand(L: CanvasRenderingContext2D, state: SkyState): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (night > 0.02) {
      L.fillStyle = css([8, 14, 44], 0.55 * night);
      L.fillRect(0, 0, this.w, this.h);
      L.fillStyle = css([40, 70, 150], 0.16 * night);
      L.fillRect(0, 0, this.w, this.h);
    }
    const low = clamp01(1 - sun.up / 0.55) * day;
    if (low > 0.02) {
      L.fillStyle = css(sky.light, 0.26 * low);
      L.fillRect(0, 0, this.w, this.h);
    }
    L.restore();
  }
}
