import { mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { approach, clamp } from '../../../world/math';
import { ChapterTitle } from '../../journeys/chapter-title';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { Atmosphere } from './atmosphere';
import { buildCreatureSprites, type CreatureSprites } from './creature-sprites';
import { Creatures } from './creatures';
import {
  CHAPTERS,
  DESIGN_ROWS,
  HORIZON,
  ROUTE_ID,
  SCENES,
  pointInBox,
  sceneTransition,
  type SceneId,
} from './scenes';
import { Scenery } from './scenery';
import { buildSnowySprites, type SnowySprites } from './sprites';

const MAX_PARALLAX_PX = 8;
const TRANSITION_GLIDE_PX = 18;

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/**
 * Snowy Cabin landscape: a warm log cabin in a snowy pine forest across five scenes,
 * with continuous interactive snowfall, recurring red fox, wildlife, and time-of-day sky.
 */
export class SnowyCabinView implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;

  private readonly route = new Route(ROUTE_ID, CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private readonly dissolve = memoryCanvas(1, 1);
  private readonly atmosphere = new Atmosphere();
  private readonly scenery = new Scenery();
  private readonly creatures = new Creatures();
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [170, 190, 215] };

  private sprites: SnowySprites | null = null;
  private creatureSprites: CreatureSprites | null = null;
  private builtUnit = -1;

  private parallaxX = 0;
  private windowLit = true;
  private windowGlow = 1;
  private snowmanAnim = 0;
  private lastScene: SceneId = 'clearing';

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.w = Math.max(0, Math.round(w));
    this.h = Math.max(0, Math.round(h));
    if (this.w <= 0 || this.h <= 0) return;

    this.unit = Math.max(0.5, this.h / DESIGN_ROWS);
    this.dome.resize(this.w, this.h);
    this.land.canvas.width = this.w;
    this.land.canvas.height = this.h;
    this.land.ctx.imageSmoothingEnabled = false;
    this.dissolve.canvas.width = this.w;
    this.dissolve.canvas.height = this.h;
    this.dissolve.ctx.imageSmoothingEnabled = false;

    if (!this.creatureSprites) {
      this.creatureSprites = buildCreatureSprites();
    }
    if (!this.sprites || Math.abs(this.unit - this.builtUnit) > 0.05) {
      this.sprites = buildSnowySprites(this.unit);
      this.builtUnit = this.unit;
    }

    this.atmosphere.resize(this.w, this.h, this.unit);
    this.scenery.resize(this.w, this.h, this.unit);
    this.creatures.resize(this.w, this.h, this.unit);
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0 || !this.sprites) return;
    const scene = SCENES[this.route.now.index].id;
    const anchors = this.scenery.anchors(scene, this.sprites, this.parallaxX);
    const pad = 5 * this.unit;

    for (const winBox of anchors.windowBoxes) {
      if (pointInBox(x, y, winBox, pad)) {
        this.windowLit = !this.windowLit;
        return;
      }
    }

    if (anchors.chimney && anchors.chimneyBox && pointInBox(x, y, anchors.chimneyBox, 6 * this.unit)) {
      this.atmosphere.triggerSmokeRing(anchors.chimney.x, anchors.chimney.y);
      return;
    }

    if (anchors.snowmanBox && pointInBox(x, y, anchors.snowmanBox, pad)) {
      this.snowmanAnim = 2.4;
      this.atmosphere.addSnowPuff(
        anchors.snowmanBox.x + anchors.snowmanBox.w * 0.5,
        anchors.snowmanBox.y + 3 * this.unit,
        5,
      );
      return;
    }

    if (this.creatures.press(x, y, scene, this.atmosphere)) {
      return;
    }

    const hy = this.h * HORIZON;
    const state = this.dome.stateAt(hourNow());
    if (y < hy) {
      if (1 - state.day > 0.35) {
        this.atmosphere.triggerShootingStar(x, y);
      }
      return;
    }

    this.atmosphere.triggerSnowClick(x, y, hy);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (this.w <= 0 || this.h <= 0 || !this.sprites || !this.creatureSprites) return this.look;

    const dt = Math.min(0.1, Math.max(0, frame.dt));
    ctx.imageSmoothingEnabled = false;

    this.route.advance(dt, 1);
    const transition = sceneTransition(this.route);
    const currentScene = SCENES[transition.current].id;
    const nextScene = SCENES[transition.next].id;

    if (currentScene !== this.lastScene) {
      this.lastScene = currentScene;
      this.atmosphere.clearSceneParticles();
    }

    const targetParallax = frame.pointer
      ? clamp(((frame.pointer.x / this.w) - 0.5) * 2, -1, 1) * MAX_PARALLAX_PX * this.unit
      : 0;
    this.parallaxX = approach(this.parallaxX, targetParallax, 4.5, dt);

    this.windowGlow = approach(this.windowGlow, this.windowLit ? 1 : 0, 10, dt);
    this.snowmanAnim = Math.max(0, this.snowmanAnim - dt);

    const state = this.dome.stateAt(hourNow());
    const anchors = this.scenery.anchors(currentScene, this.sprites, this.parallaxX);

    this.creatures.update(dt, frame.time, currentScene, frame.pointer, this.atmosphere);
    this.atmosphere.update(
      dt,
      frame.time,
      frame.pointer,
      anchors.chimney,
      currentScene === 'chimney',
      1 - state.day,
    );

    this.updateLook(state, currentScene);

    // 1. Sky dome + aurora + shooting stars
    this.dome.draw(ctx, state, frame, this.look);
    this.scenery.drawSkyExtras(ctx, state, frame.time, currentScene, this.atmosphere, this.parallaxX);

    // 2. Current scene terrain, props, cast, and warm glows
    const glideOut = transition.blend > 0 ? -TRANSITION_GLIDE_PX * this.unit * transition.blend : 0;
    this.scenery.drawScene(
      ctx,
      this.land.ctx,
      currentScene,
      state,
      frame.time,
      this.sprites,
      this.creatureSprites,
      this.creatures,
      this.atmosphere,
      frame.pointer,
      this.parallaxX,
      this.windowGlow,
      this.snowmanAnim,
      glideOut,
    );

    // 3. Smooth 10-second cross-dissolve & camera glide into the next scene
    if (transition.blend > 0.005) {
      const D = this.dissolve.ctx;
      D.clearRect(0, 0, this.w, this.h);
      const glideIn = TRANSITION_GLIDE_PX * this.unit * (1 - transition.blend);
      this.scenery.drawScene(
        D,
        this.land.ctx,
        nextScene,
        state,
        frame.time,
        this.sprites,
        this.creatureSprites,
        this.creatures,
        this.atmosphere,
        frame.pointer,
        this.parallaxX,
        this.windowGlow,
        this.snowmanAnim,
        glideIn,
      );
      ctx.save();
      ctx.globalAlpha = transition.blend;
      ctx.drawImage(this.dissolve.canvas, 0, 0);
      ctx.restore();
    }

    // 4. Chimney smoke, continuous interactive snowfall, and chapter title
    this.atmosphere.drawSmoke(ctx, state);
    this.atmosphere.drawSnowAndPuffs(ctx, state, this.windowLit ? anchors.glowPoint : null);
    this.title.draw(ctx, dt, this.w, this.h, transition.name);

    return this.look;
  }

  private updateLook(state: SkyState, scene: SceneId): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const ground = mix([42, 60, 96], [224, 236, 248], day);
    this.look.mean = luma(air) * 0.55 + luma(ground) * 0.45;
    this.look.night = night;

    let tint = mix(air, ground, 0.3);
    if (this.windowGlow > 0.1 && night > 0.2 && (scene === 'clearing' || scene === 'chimney' || scene === 'aurora')) {
      tint = mix(tint, [242, 182, 98], 0.14 * this.windowGlow * night);
    }
    this.look.tint = tint;
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.7, color: sky.light } : null;
  }
}
