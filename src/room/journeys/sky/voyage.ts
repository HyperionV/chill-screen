import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import type { NightSky } from '../../night-sky';
import { PACE_SPEED, type Pace } from '../../journey/pace';
import { SkyDome, type SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ChapterTitle } from '../chapter-title';
import type { JourneyView } from '../journey-view';
import { Route } from '../route';
import { CHAPTERS, CLOUD_ROW, DESIGN_HEIGHT, TRAVEL_SPEED, chapterWeights } from './chapters';
import { gondola, ribbons, stormClearing, stormClouds, stormStrength, stormVeil, sunRays } from './atmosphere';
import { Creatures } from './creatures';
import { Interactions } from './interactions';
import { Scenery } from './scenery';
import { buildSprites, type Sprites } from './sprites';

const HORIZON = 0.79;
const LOWER_CLICK_ROW = 222;
const NIGHT_TINT = 'rgb(14,27,52)';
// Fifteen-second sky samples avoid rebuilding colour tuples on every frame.
const SKY_SAMPLES_PER_HOUR = 240;

export class SkyVoyage implements JourneyView {
  private w = 0;
  private h = 0;
  private width = 0;
  private unit = 1;
  private speed = PACE_SPEED.gentle;
  private scroll = 0;
  private skyHour = Number.NaN;
  private skyState: SkyState | null = null;
  private sprites: Sprites | null = null;
  private layer: ReturnType<typeof memoryCanvas> | null = null;
  private readonly dome: SkyDome;
  readonly route = new Route('sky', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly scenery = new Scenery();
  private readonly creatures = new Creatures();
  private readonly interactions = new Interactions();
  private readonly weights = new Float32Array(CHAPTERS.length);
  private readonly localFrame: ViewFrame = { dt: 0, time: 0, pointer: null };
  private readonly localPointer = { x: 0, y: 0 };
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [150, 180, 190] };
  private readonly cloudedState: SkyState = {
    sky: { zenith: [0, 0, 0], horizon: [0, 0, 0], water: [0, 0, 0], light: [0, 0, 0] },
    sun: { u: 0, v: 0, up: -1 }, moon: { u: 0, v: 0, up: -1 }, day: 0,
  };

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
    // Route distance gives a repeatable opening after a saved position or chapter jump.
    this.scroll = this.route.progress * this.route.total * TRAVEL_SPEED;
  }

  setPace(pace: Pace): void { this.speed = PACE_SPEED[pace]; }

  resize(w: number, h: number): void {
    this.w = Math.max(1, Math.round(w));
    this.h = Math.max(1, Math.round(h));
    this.unit = this.h / DESIGN_HEIGHT;
    this.width = Math.ceil(this.w / this.unit);
    this.dome.resize(this.w, this.h);
    if (!this.sprites) this.sprites = buildSprites();
    this.layer = memoryCanvas(this.width, DESIGN_HEIGHT);
    this.layer.ctx.imageSmoothingEnabled = false;
    this.scenery.resize(this.width);
    this.creatures.resize(this.width);
    this.interactions.reset();
  }

  press(x: number, y: number): void {
    if (!this.layer) return;
    const px = x * this.width / this.w;
    const py = y / this.unit;
    const island = this.scenery.tap(px, py);
    if (island) {
      if (this.scenery.isFestival) this.interactions.burst(px, island.surface - 9);
      return;
    }
    if (py >= LOWER_CLICK_ROW) this.interactions.drop(px);
    else if (py < CLOUD_ROW) {
      this.interactions.release(Math.min(this.width - 12, px), 247);
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const layer = this.layer;
    const sprites = this.sprites;
    if (!layer || !sprites) return this.look;
    const dt = Math.min(0.1, Math.max(0, frame.dt));
    this.route.advance(dt, this.speed);
    this.scroll += TRAVEL_SPEED * this.speed * dt;
    const chapter = this.route.now;
    chapterWeights(chapter.index, chapter.next, chapter.t, this.weights);
    const hour = Math.floor(hourNow() * SKY_SAMPLES_PER_HOUR) / SKY_SAMPLES_PER_HOUR;
    if (!this.skyState || hour !== this.skyHour) {
      this.skyState = this.dome.stateAt(hour);
      this.skyHour = hour;
    }
    const state = this.skyState;
    const storm = stormStrength(this.weights[3], chapter.index, chapter.t);
    const clearing = stormClearing(chapter.index, chapter.t);
    this.updateLook(state, storm);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Hide the celestial discs inside the front, including their bright halos.
    this.cloudedState.sky = state.sky;
    this.cloudedState.day = state.day;
    this.dome.draw(ctx, storm > 0.02 ? this.cloudedState : state, frame, this.look);
    stormVeil(ctx, this.w, this.h, storm, state.day, clearing);
    this.localFrame.dt = dt;
    this.localFrame.time = frame.time;
    if (frame.pointer) {
      this.localPointer.x = frame.pointer.x * this.width / this.w;
      this.localPointer.y = frame.pointer.y / this.unit;
      this.localFrame.pointer = this.localPointer;
    } else this.localFrame.pointer = null;
    const L = layer.ctx;
    L.clearRect(0, 0, this.width, DESIGN_HEIGHT);
    const lift = this.interactions.lift;
    ribbons(L, this.width, frame.time, this.weights[5], this.look.night);
    this.scenery.draw(L, sprites, this.localFrame, this.scroll, this.weights, this.look.night, lift, storm, state);
    sunRays(L, this.width, state.sun.u, state.sun.v, state.sun.up, state.day, this.weights[0] * (1 - storm));
    stormClouds(L, this.width, frame.time, this.scroll, storm, lift, clearing);
    this.creatures.draw(L, sprites, this.localFrame, this.scroll, this.weights, chapter.index, lift, this.scenery.postalStop);
    this.tintLand(L, state, storm);
    this.interactions.draw(L, sprites, dt, this.look.night);
    gondola(L, this.width, frame.time, storm);
    ctx.drawImage(layer.canvas, 0, 0, this.width, DESIGN_HEIGHT, 0, 0, this.w, this.h);
    this.title.draw(ctx, dt, this.w, this.h, chapter.name);
    ctx.restore();
    return this.look;
  }

  private updateLook(state: SkyState, storm: number): void {
    const { sky, day, sun } = state;
    const airR = sky.zenith[0] * 0.4 + sky.horizon[0] * 0.6;
    const airG = sky.zenith[1] * 0.4 + sky.horizon[1] * 0.6;
    const airB = sky.zenith[2] * 0.4 + sky.horizon[2] * 0.6;
    this.look.tint[0] = (airR * 0.68 + (38 + day * 174) * 0.32) * (1 - storm) + (8 + day * 54) * storm;
    this.look.tint[1] = (airG * 0.68 + (55 + day * 164) * 0.32) * (1 - storm) + (12 + day * 56) * storm;
    this.look.tint[2] = (airB * 0.68 + (82 + day * 136) * 0.32) * (1 - storm) + (24 + day * 64) * storm;
    this.look.mean = (this.look.tint[0] * 0.2126 + this.look.tint[1] * 0.7152 + this.look.tint[2] * 0.0722) / 255;
    this.look.night = 1 - day;
    if (sun.up > -0.02 && storm <= 0.02) {
      const light = this.look.sun;
      if (light) {
        light.u = sun.u;
        light.v = sun.v;
        light.strength = 0.7 * (1 - storm * 0.55);
        light.color = sky.light;
      } else this.look.sun = { u: sun.u, v: sun.v, strength: 0.7 * (1 - storm * 0.55), color: sky.light };
    } else this.look.sun = null;
  }

  private tintLand(ctx: CanvasRenderingContext2D, state: SkyState, storm: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = NIGHT_TINT;
    ctx.globalAlpha = (1 - state.day) * 0.69 + storm * state.day * 0.18;
    ctx.fillRect(0, 0, this.width, DESIGN_HEIGHT);
    const lowSun = Math.max(0, 1 - state.sun.up / 0.55) * state.day;
    ctx.globalAlpha = lowSun * 0.22 * (1 - storm);
    ctx.fillStyle = `rgb(${state.sky.light[0]},${state.sky.light[1]},${state.sky.light[2]})`;
    ctx.fillRect(0, 0, this.width, DESIGN_HEIGHT);
    ctx.restore();
  }
}
