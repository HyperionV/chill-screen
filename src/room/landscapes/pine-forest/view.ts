import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import { ramp } from '../../journeys/noise';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { ForestAir } from './air';
import { Creatures } from './creatures';
import { ForestFloor } from './floor';
import { Interactions } from './interactions';
import { ForestLights } from './lighting';
import { CHAPTERS, DESIGN_HEIGHT, DISSOLVE_SECONDS, SCENE_SECONDS } from './scenes';
import { Scenery } from './scenery';
import { buildCast, type CastSprites } from './sprites';

const HORIZON = 0.65;
const MAX_DT = 0.1;
// Keep blue-green detail in the shadows after the night grade.
const NIGHT_TINT = 'rgba(28,52,67,0.36)';

/** A stationary woodland, revisited from five nearby places. */
export class PineForest implements OutsideView {
  private w = 0;
  private h = 0;
  private width = 0;
  private unit = 1;
  private activeScene = 0;
  private readonly pointer = { x: 0, y: 0 };
  private readonly route = new Route('landscape-pine-forest', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly sky = memoryCanvas(1, 1);
  private readonly land = memoryCanvas(1, 1);
  private readonly outgoing = memoryCanvas(1, 1);
  private readonly incoming = memoryCanvas(1, 1);
  private readonly scenery = new Scenery();
  private readonly floor = new ForestFloor();
  private readonly air = new ForestAir();
  private readonly lights = new ForestLights();
  private readonly creatures = new Creatures();
  private readonly interactions = new Interactions();
  private sprites: CastSprites | null = null;
  private readonly look: Look = { mean: 0.4, sun: null, sky: [], night: 0, tint: [82, 112, 95] };

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (!this.w || !this.h) return;
    this.unit = this.h / DESIGN_HEIGHT;
    const width = Math.ceil(this.w / this.unit);
    if (width !== this.width) {
      this.width = width;
      this.scenery.resize(width);
      this.floor.resize(width, this.scenery.patches);
    }
    this.dome.resize(this.w, this.h);
    this.sky.canvas.width = this.w; this.sky.canvas.height = this.h;
    for (const target of [this.land, this.outgoing, this.incoming]) {
      target.canvas.width = this.width;
      target.canvas.height = DESIGN_HEIGHT;
      target.ctx.imageSmoothingEnabled = false;
    }
    this.sprites ??= buildCast();
    this.creatures.resize(this.width);
    this.interactions.reset();
    this.activeScene = this.route.now.index;
  }

  press(x: number, y: number): void {
    if (!this.w || !this.h || !this.sprites) return;
    this.interactions.press(x / this.unit, y / this.unit, this.width, this.activeScene,
      this.scenery.trees(this.activeScene), this.creatures);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (!this.w || !this.h || !this.sprites) return this.look;
    const dt = Math.max(0, Math.min(MAX_DT, frame.dt));
    this.route.advance(dt, 1);
    const now = this.route.now;
    const remaining = (1 - now.t) * SCENE_SECONDS;
    const blend = ramp(DISSOLVE_SECONDS, 0, remaining);
    this.activeScene = blend > 0.5 ? now.next : now.index;
    if (frame.pointer) {
      this.pointer.x = frame.pointer.x / this.unit;
      this.pointer.y = frame.pointer.y / this.unit;
    }
    const pointer = frame.pointer ? this.pointer : null;
    const state = this.dome.stateAt(hourNow());
    this.updateLook(state);
    this.sky.ctx.clearRect(0, 0, this.w, this.h);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.air.advance(dt, frame.time);
    this.interactions.update(dt, frame.time);
    this.creatures.update(now.index, dt, frame.time, pointer);
    this.paint(this.outgoing.ctx, now.index, frame.time, state);
    if (blend > 0) {
      this.creatures.update(now.next, dt, frame.time, pointer, false);
      this.paint(this.incoming.ctx, now.next, frame.time, state);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.outgoing.canvas, 0, 0, this.w, this.h);
    if (blend > 0) {
      ctx.globalAlpha = blend;
      ctx.drawImage(this.incoming.canvas, 0, 0, this.w, this.h);
    }
    ctx.restore();
    this.title.draw(ctx, dt, this.w, this.h, CHAPTERS[this.activeScene].name);
    return this.look;
  }

  private paint(c: CanvasRenderingContext2D, scene: number, time: number, state: SkyState): void {
    const sprites = this.sprites;
    if (!sprites) return;
    const l = this.land.ctx;
    const night = 1 - state.day;
    l.clearRect(0, 0, this.width, DESIGN_HEIGHT);
    this.scenery.drawBack(l, scene);
    this.air.drawLight(l, scene, time, state);
    this.air.drawMist(l, scene, time, night);
    this.scenery.drawProps(l, scene, time);
    this.air.drawSmoke(l, scene, time, night);
    this.lights.draw(l, scene, this.width, time, night, this.scenery.patches);
    this.creatures.draw(l, scene, sprites, time);
    this.scenery.drawPines(l, scene, time);
    this.floor.draw(l, scene, time);
    this.air.drawSeeds(l, scene, time);
    this.interactions.draw(l, scene, this.width, sprites);
    this.tint(l, state);
    c.clearRect(0, 0, this.width, DESIGN_HEIGHT);
    c.drawImage(this.sky.canvas, 0, 0, this.width, DESIGN_HEIGHT);
    c.drawImage(this.land.canvas, 0, 0);
    this.creatures.glow(c, scene, time, night, this.lights);
  }

  private tint(c: CanvasRenderingContext2D, state: SkyState): void {
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = 1 - state.day;
    c.fillStyle = NIGHT_TINT;
    c.fillRect(0, 0, this.width, DESIGN_HEIGHT);
    c.globalAlpha = 1;
    const warm = Math.max(0, Math.min(1, 1 - state.sun.up / 0.55)) * state.day;
    const light = state.sky.light;
    c.fillStyle = `rgba(${light[0]},${light[1]},${light[2]},${warm * 0.23})`;
    c.fillRect(0, 0, this.width, DESIGN_HEIGHT);
    c.restore();
  }

  private updateLook(state: SkyState): void {
    const { day, sky, sun } = state;
    const tint = this.look.tint;
    // The room receives mostly forest light, with a little open sky above it.
    tint[0] = 40 + day * 35 + sky.horizon[0] * 0.07;
    tint[1] = 58 + day * 47 + sky.horizon[1] * 0.09;
    tint[2] = 68 + day * 22 + sky.horizon[2] * 0.08;
    this.look.mean = (0.2126 * tint[0] + 0.7152 * tint[1] + 0.0722 * tint[2]) / 255;
    this.look.night = 1 - day;
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.38, color: sky.light } : null;
  }
}
