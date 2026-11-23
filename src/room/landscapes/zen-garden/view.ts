import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { breeze } from '../../wind';
import { GardenCast } from './creatures';
import { GardenInteractions } from './interactions';
import { GardenPlants } from './plants';
import { buildScenery, type Scenery } from './scenery';
import { CHAPTERS, DESIGN_HEIGHT, DISSOLVE_SECONDS, SCENE_SECONDS, layout } from './scenes';
import { buildSprites, line, type GardenSprites } from './sprites';

const HORIZON = 0.59;
// Peak drift of grove light and pond reflections, in stage pixels.
const RAY_SWAY = 2;
const REFLECTION_SWAY = 2;
const REFLECTION_ROW_PHASE = 8;
const luma = (color: RGB): number => (color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722) / 255;

export class ZenGarden implements OutsideView {
  private w = 0;
  private h = 0;
  private designWidth = 0;
  private unit = 1;
  private activeScene = 0;
  readonly route = new Route('landscape-zen-garden', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly stage = memoryCanvas(1, 1);
  private readonly land = memoryCanvas(1, 1);
  private readonly incoming = memoryCanvas(1, 1);
  private scenery: Scenery[] = [];
  private sprites: GardenSprites | null = null;
  private plants: GardenPlants | null = null;
  private readonly cast = new GardenCast();
  private readonly effects = new GardenInteractions();
  private readonly pointer = { x: 0, y: 0 };
  private readonly localFrame: ViewFrame = { dt: 0, time: 0, pointer: null };
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [150, 164, 130] };

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w === 0 || this.h === 0) return;
    this.unit = this.h / DESIGN_HEIGHT;
    this.designWidth = Math.max(1, Math.round(this.w / this.unit));
    this.dome.resize(this.designWidth, DESIGN_HEIGHT);
    for (const buffer of [this.stage, this.land, this.incoming]) {
      buffer.canvas.width = this.designWidth;
      buffer.canvas.height = DESIGN_HEIGHT;
      buffer.ctx.imageSmoothingEnabled = false;
    }
    const sprites = buildSprites();
    this.sprites = sprites;
    this.plants = new GardenPlants(this.designWidth, sprites.bamboo);
    this.scenery = CHAPTERS.map((_, index) => buildScenery(index, this.designWidth, sprites));
    this.cast.resize(this.designWidth);
    this.effects.resize(this.designWidth);
    this.activeScene = this.route.now.index;
  }

  press(x: number, y: number): void {
    if (this.w === 0 || this.h === 0) return;
    this.effects.press(this.activeScene, x * this.designWidth / this.w, y / this.unit);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const { plants, sprites } = this;
    if (this.w === 0 || this.h === 0 || !plants || !sprites) return this.look;
    const dt = Math.min(0.1, Math.max(0, frame.dt));
    this.route.advance(dt, 1);
    const now = this.route.now;
    const elapsed = now.t * SCENE_SECONDS;
    const fade = Math.max(0, (elapsed - SCENE_SECONDS + DISSOLVE_SECONDS) / DISSOLVE_SECONDS);
    const blend = fade * fade * (3 - 2 * fade);
    this.activeScene = blend >= 0.5 ? now.next : now.index;
    this.localFrame.dt = dt; this.localFrame.time = frame.time;
    if (frame.pointer) {
      this.pointer.x = frame.pointer.x * this.designWidth / this.w;
      this.pointer.y = frame.pointer.y / this.unit;
      this.localFrame.pointer = this.pointer;
    } else this.localFrame.pointer = null;
    this.effects.update(this.localFrame, this.activeScene);
    this.cast.update(this.localFrame, this.activeScene, this.effects);
    const state = this.dome.stateAt(hourNow());
    this.updateLook(state);
    const stage = this.stage.ctx;
    stage.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    this.dome.draw(stage, state, this.localFrame, this.look);
    this.renderLand(this.land.ctx, now.index, state, this.localFrame, sprites, plants);
    this.addSkyBehind(this.land.ctx);
    if (blend > 0) {
      this.renderLand(this.incoming.ctx, now.next, state, this.localFrame, sprites, plants);
      this.addSkyBehind(this.incoming.ctx);
    }
    stage.drawImage(this.land.canvas, 0, 0);
    if (blend > 0) {
      stage.save(); stage.globalAlpha = blend;
      stage.drawImage(this.incoming.canvas, 0, 0);
      stage.restore();
    }
    this.title.draw(stage, dt, this.designWidth, DESIGN_HEIGHT,
      blend >= 0.5 ? CHAPTERS[now.next]?.name ?? now.name : now.name);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.stage.canvas, 0, 0, this.w, this.h);
    ctx.restore();
    return this.look;
  }

  private addSkyBehind(ctx: CanvasRenderingContext2D): void {
    // Complete both pictures before blending, including gaps between the trees.
    ctx.save(); ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(this.stage.canvas, 0, 0);
    ctx.restore();
  }

  private updateLook(state: SkyState): void {
    const air = mix(state.sky.zenith, state.sky.horizon, 0.55);
    const garden = mix([40, 52, 61], [171, 178, 139], state.day);
    this.look.mean = luma(air) * 0.35 + luma(garden) * 0.65;
    this.look.night = 1 - state.day;
    this.look.tint = mix(air, garden, 0.65);
    this.look.sun = state.sun.up > -0.02 ? { u: state.sun.u, v: state.sun.v, strength: 0.55, color: state.sky.light } : null;
  }

  private renderLand(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, frame: ViewFrame,
    sprites: GardenSprites, plants: GardenPlants): void {
    ctx.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    const scenery = this.scenery[scene];
    if (!scenery) return;
    for (let depth = 0; depth < 5; depth++) {
      const image = scenery.layers[depth];
      if (!image) continue;
      if (depth === 4) plants.drawForeground(ctx, scene, frame.time);
      ctx.drawImage(image, 0, 0);
      if (depth === 1) {
        plants.drawBackground(ctx, scene, frame.time);
        if (scene === 2) this.drawGroveLight(ctx, frame.time, state.day);
      }
      if (depth === 2) {
        if (scene === 0) this.effects.drawSand(ctx);
        if (scene === 1 || scene === 4) {
          plants.drawPond(ctx, frame.time);
          if (scenery.pondSteps) ctx.drawImage(scenery.pondSteps, 0, 0);
          this.effects.drawWater(ctx, scene, frame.time);
          if (scene === 4) this.drawReflection(ctx, state, frame.time);
          this.cast.drawFish(ctx, sprites, frame.time);
        }
      }
      if (depth === 3) {
        this.effects.drawProps(ctx, scene, frame.time);
        this.cast.draw(ctx, sprites, frame, scene, this.effects);
      }
    }
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    const night = 1 - state.day;
    ctx.fillStyle = css([15, 26, 45], night * 0.68);
    ctx.fillRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    const sunset = Math.max(0, 1 - state.sun.up / 0.5) * state.day;
    ctx.fillStyle = css(state.sky.light, sunset * 0.24);
    ctx.fillRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    ctx.restore();
    this.effects.drawLights(ctx, scene, night);
    if (scene === this.activeScene) this.effects.drawRipples(ctx);
    this.cast.drawAir(ctx, scene, frame.time, night, frame.pointer);
  }

  private drawGroveLight(ctx: CanvasRenderingContext2D, time: number, day: number): void {
    const width = this.designWidth;
    // Sparse stepped rays keep the clock area quiet and avoid smooth gradients.
    if (day < 0.3) return;
    for (let ray = 0; ray < 4; ray++) {
      const origin = width * (0.13 + ray * 0.24);
      const rayDrift = breeze(time, origin) * RAY_SWAY;
      for (let y = 30; y < 179; y += 4) {
        const x = Math.round(origin + y * 0.12 + rayDrift);
        if (x > width * 0.31 && x < width * 0.67 && y > 70 && y < 155) continue;
        ctx.fillStyle = '#a3af7c'; ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  private drawReflection(ctx: CanvasRenderingContext2D, state: SkyState, time: number): void {
    if (state.moon.up <= 0 || state.day > 0.5) return;
    const pond = layout(4, this.designWidth).pond;
    const x = state.moon.u * this.designWidth;
    const distance = Math.abs(x - pond.x) / pond.rx;
    if (distance > 0.88) return;
    const top = pond.y - Math.sqrt(1 - distance * distance) * pond.ry + 7;
    for (let row = -5; row <= 5; row++) {
      const half = Math.round(Math.sqrt(25 - row * row));
      const drift = Math.round(breeze(time, x + row * REFLECTION_ROW_PHASE) * REFLECTION_SWAY);
      line(ctx, x - half + drift, top + row * 0.6, x + half + drift, top + row * 0.6, row % 2 ? '#c4c9af' : '#a6b7a5');
    }
    for (let row = 0; row < 8; row++) {
      const half = 4 + row * 1.5;
      const drift = Math.round(breeze(time, x + half + row * REFLECTION_ROW_PHASE) * REFLECTION_SWAY);
      line(ctx, x - half + drift, top + 7 + row * 2, x + half, top + 7 + row * 2, row % 2 ? '#8fa899' : '#6d9486');
    }
  }
}
