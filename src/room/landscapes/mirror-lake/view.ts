import { css, mix } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { ChapterTitle } from '../../journeys/chapter-title';
import { hash } from '../../journeys/noise';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, smooth, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { LakeCreatures } from './creatures';
import { LakeScenery } from './scenery';
import { CHAPTERS, DESIGN_HEIGHT, DISSOLVE_SECONDS, SCENE_SECONDS, WATERLINE } from './scenes';
import { buildSprites, type Sprites } from './sprites';
import { LakeWater } from './water';

const PARALLAX_EASING = 2.8;
const GALAXY_STARS = 230;

export class MirrorLake implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private px = 0;
  private py = 0;
  private activeScene = 0;
  private sprites: Sprites | null = null;
  private readonly route = new Route('landscape-mirror-lake', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly sky = memoryCanvas(1, 1);
  private readonly upper = memoryCanvas(1, 1);
  private readonly layer = memoryCanvas(1, 1);
  private readonly sceneA = memoryCanvas(1, 1);
  private readonly sceneB = memoryCanvas(1, 1);
  private readonly scenery = new LakeScenery();
  private readonly creatures = new LakeCreatures();
  private readonly water = new LakeWater();
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [100, 132, 140] };

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, WATERLINE);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w === 0 || this.h === 0) return;
    this.unit = this.h / DESIGN_HEIGHT;
    this.px = 0;
    this.py = 0;
    this.dome.resize(this.w, this.h);
    for (const surface of [this.sky, this.upper, this.layer, this.sceneA, this.sceneB]) {
      surface.canvas.width = this.w;
      surface.canvas.height = this.h;
      surface.ctx.imageSmoothingEnabled = false;
    }
    this.sprites = buildSprites();
    this.scenery.resize(this.w, this.h);
    this.creatures.resize(this.w, this.h);
    this.water.reset();
    this.activeScene = this.route.now.index;
  }

  press(x: number, y: number): void {
    if (!this.sprites || this.w === 0 || this.h === 0) return;
    if (this.creatures.press(x, y, this.activeScene, this.px)) {
      if (y >= this.h * WATERLINE) this.water.ripple(x, y, true);
      return;
    }
    const dockX = this.w * 0.12 + this.px * 3;
    const onDock = this.activeScene === 0 && Math.abs(x - dockX) < 28 * this.unit && y > this.h * 0.77;
    if (!onDock && y >= this.h * WATERLINE && y < this.h * 0.94) this.water.press(x, y, this.w, this.h);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (!this.sprites || this.w === 0 || this.h === 0) return this.look;
    const dt = Math.max(0, Math.min(0.1, frame.dt));
    this.route.advance(dt, 1);
    const now = this.route.now;
    const remaining = (1 - now.t) * SCENE_SECONDS;
    const fade = smooth(Math.max(0, 1 - remaining / DISSOLVE_SECONDS));
    this.activeScene = fade > 0.5 ? now.next : now.index;
    const targetX = frame.pointer ? (frame.pointer.x / this.w - 0.5) * this.unit * 2 : 0;
    const targetY = frame.pointer ? (frame.pointer.y / this.h - 0.5) * this.unit * 2 : 0;
    const ease = 1 - Math.exp(-dt * PARALLAX_EASING);
    this.px += (targetX - this.px) * ease;
    this.py += (targetY - this.py) * ease;
    const state = this.dome.stateAt(hourNow());
    this.updateLook(state);
    this.water.update(dt, this.unit);
    this.creatures.update(frame, now.index, fade > 0 ? now.next : now.index, this.water, this.px);
    this.scenery.update(frame, state.day, this.px);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.renderScene(this.sceneA.ctx, now.index, state, frame);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sceneA.canvas, 0, 0);
    if (fade > 0) {
      this.renderScene(this.sceneB.ctx, now.next, state, frame);
      ctx.globalAlpha = fade;
      ctx.drawImage(this.sceneB.canvas, 0, 0);
    }
    ctx.restore();
    this.title.draw(ctx, dt, this.w, this.h, now.name);
    return this.look;
  }

  private renderScene(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, frame: ViewFrame): void {
    const sprites = this.sprites;
    if (!sprites) return;
    const horizon = Math.round(this.h * WATERLINE);
    const upper = this.upper.ctx;
    upper.fillStyle = css(state.sky.zenith);
    upper.fillRect(0, 0, this.w, this.h);
    upper.drawImage(this.sky.canvas, Math.round(this.px * 0.3), Math.round(this.py * 0.3));
    if (scene === 4) this.galaxy(upper, state);
    const land = this.layer.ctx;
    land.clearRect(0, 0, this.w, this.h);
    this.scenery.upper(land, scene, state, frame.time, this.px, this.py, sprites);
    this.creatures.eagle(land, scene, this.px);
    this.tint(land, state);
    upper.drawImage(this.layer.canvas, 0, 0);
    ctx.drawImage(this.upper.canvas, 0, 0);
    this.water.reflect(ctx, this.upper.canvas, horizon, this.unit, frame.time, state);
    land.clearRect(0, 0, this.w, this.h);
    this.scenery.foreground(land, scene, state, frame.time, this.px, sprites);
    this.creatures.draw(land, scene, this.px, sprites, state.day);
    this.tint(land, state);
    ctx.drawImage(this.layer.canvas, 0, 0);
    this.water.draw(ctx, this.unit, state);
    this.scenery.atmosphere(ctx, scene, state, frame.time);
  }

  private tint(ctx: CanvasRenderingContext2D, state: SkyState): void {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = css([12, 27, 48], (1 - state.day) * 0.46);
    ctx.fillRect(0, 0, this.w, this.h);
    const sunset = Math.max(0, 1 - state.sun.up / 0.5) * state.day;
    ctx.fillStyle = css(state.sky.light, sunset * 0.12);
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.restore();
  }

  private galaxy(ctx: CanvasRenderingContext2D, state: SkyState): void {
    const night = 1 - state.day;
    if (night < 0.1) return;
    // A sparse diagonal dust lane made of hard pixels, reflected with the rest of the sky.
    for (let i = 0; i < GALAXY_STARS; i++) {
      const t = hash(i * 13 + 4);
      const x = this.w * (0.23 + t * 0.48) + (hash(i + 71) - 0.5) * 30 * this.unit + this.px * 0.3;
      const y = this.h * (0.29 - t * 0.27) + (hash(i + 37) - 0.5) * 18 * this.unit;
      ctx.fillStyle = css(i % 4 ? [158, 181, 192] : [225, 222, 197], night * (i % 4 ? 0.23 : 0.65));
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  private updateLook(state: SkyState): void {
    const air = mix(state.sky.zenith, state.sky.horizon, 0.55);
    const mean = (air[0] * 0.2126 + air[1] * 0.7152 + air[2] * 0.0722) / 255;
    this.look.mean = mean * 0.82;
    this.look.night = 1 - state.day;
    this.look.tint = mix(air, state.sky.water, 0.4);
    this.look.sun = state.sun.up > -0.02 ? { u: state.sun.u, v: state.sun.v, strength: 0.72, color: state.sky.light } : null;
  }
}
