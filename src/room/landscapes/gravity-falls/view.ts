import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { clamp } from '../../../world/math';
import type { Projection } from '../../gravity-falls/bubble';
import { buildCastArt } from '../../gravity-falls/cast-art';
import { Conversations } from '../../gravity-falls/dialogue';
import { MysteryBoard } from '../../gravity-falls/mystery';
import { Troupe } from '../../gravity-falls/performer';
import { QUIPS } from '../../gravity-falls/quips';
import { SCRIPTS } from '../../gravity-falls/scripts';
import { PLACES, type Point } from '../../gravity-falls/types';
import { ChapterTitle } from '../../journeys/chapter-title';
import { ramp } from '../../journeys/noise';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { DESIGN_HEIGHT, type SceneArt } from './scene-art';
import { CHAPTERS, DISSOLVE_SECONDS, SCENES, SCENE_SECONDS } from './scenes';
import { SKY_HORIZON, tintLand, updateLook } from './view-render';

/** A character turns to face the pointer when it is this close (design pixels) to their body. */
const POINTER_REACH = 30;
/** A longer step than this (a stalled tab) is treated as this long. */
const MAX_STEP = 0.1;

/** The cast and its conversations, made once the first size is known. */
interface Stage {
  troupe: Troupe;
  talk: Conversations;
}

export class GravityFallsLandscape implements OutsideView {
  private width = 0;
  private height = 0;
  private designWidth = 1;
  private unit = 1;
  /** The place the cast, the talk and the clues belong to right now; -1 until the first frame after a resize. */
  private shown = -1;
  private time = 0;
  readonly route = new Route('landscape-gravity-falls', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [150, 160, 130] };
  private readonly sky = memoryCanvas(1, 1);
  private readonly land = memoryCanvas(1, 1);
  private readonly picture = memoryCanvas(1, 1);
  private readonly nextPicture = memoryCanvas(1, 1);
  private readonly mystery = new MysteryBoard();
  private readonly pointer: Point = { x: 0, y: 0 };
  /** Where design pixels land on the stage for the speech: no camera here, and the active scene's lift. */
  private readonly projection: Projection = { unit: 1, lift: 0, cameraX: 0 };
  private stage: Stage | null = null;
  private scenes: SceneArt[] = [];

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, SKY_HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.width = Math.max(0, Math.round(w));
    this.height = Math.max(0, Math.round(h));
    if (this.width === 0 || this.height === 0) return;
    this.unit = this.height / DESIGN_HEIGHT;
    this.designWidth = Math.max(1, Math.round(this.width / this.unit));
    this.dome.resize(this.width, this.height);
    this.sky.canvas.width = this.width;
    this.sky.canvas.height = this.height;
    for (const buffer of [this.land, this.picture, this.nextPicture]) {
      buffer.canvas.width = this.designWidth;
      buffer.canvas.height = DESIGN_HEIGHT;
      buffer.ctx.imageSmoothingEnabled = false;
    }
    if (!this.stage) {
      const troupe = new Troupe(buildCastArt());
      this.stage = { troupe, talk: new Conversations(troupe, QUIPS) };
    }
    this.scenes = SCENES.map((scene) => scene.build(this.designWidth));
    this.shown = -1;
  }

  press(x: number, y: number): void {
    const { stage, shown } = this;
    if (!stage || shown < 0 || this.width === 0 || this.height === 0) return;
    const px = (x * this.designWidth) / this.width;
    const py = y / this.unit + SCENES[shown].lift;
    const who = stage.troupe.pick(px, py, 0);
    if (who) stage.talk.poke(who);
    else if (!this.mystery.press(px, py, 0)) this.scenes[shown].press?.(px, py, this.time);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const { stage } = this;
    if (!stage || this.scenes.length === 0 || this.width === 0 || this.height === 0) return this.look;
    const dt = Math.min(MAX_STEP, Math.max(0, frame.dt));
    this.time = frame.time;
    this.route.advance(dt, 1);
    const now = this.route.now;
    const fade = ramp(SCENE_SECONDS - DISSOLVE_SECONDS, SCENE_SECONDS, now.t * SCENE_SECONDS);
    const active = fade > 0.5 ? now.next : now.index;
    if (active !== this.shown) this.enter(stage, active);
    let pointer: Point | null = null;
    if (frame.pointer) {
      this.pointer.x = (frame.pointer.x * this.designWidth) / this.width;
      this.pointer.y = frame.pointer.y / this.unit + SCENES[this.shown >= 0 ? this.shown : 0].lift;
      pointer = this.pointer;
    }
    this.updateCast(stage, dt, frame.time, fade === 0, pointer);
    this.scenes[active].setDoorOpen?.(this.mystery.doorOpen);
    const state = this.dome.stateAt(hourNow());
    updateLook(this.look, state);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.render(this.picture.ctx, stage, now.index, active, state, frame.time);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.picture.canvas, 0, 0, this.width, this.height);
    if (fade > 0) {
      this.render(this.nextPicture.ctx, stage, now.next, active, state, frame.time);
      ctx.globalAlpha = fade;
      ctx.drawImage(this.nextPicture.canvas, 0, 0, this.width, this.height);
    }
    ctx.restore();
    this.title.draw(ctx, dt, this.width, this.height, CHAPTERS[active].name);
    return this.look;
  }

  /** Speech, toasts and cards are drawn here, on the screen itself in a normal font, for the place that has the cast. */
  drawOverlay(screen: CanvasRenderingContext2D, stageWidth: number, stageHeight: number): void {
    const { stage, shown } = this;
    if (!stage || shown < 0 || this.width === 0 || this.height === 0) return;
    this.projection.unit = this.unit;
    this.projection.lift = SCENES[shown].lift;
    stage.talk.drawBubbles(screen, this.projection, stageWidth);
    this.mystery.drawOverlay(screen, stageWidth, stageHeight);
  }

  /** Hands the cast, the conversations and the clues over to a place. */
  private enter(stage: Stage, chapter: number): void {
    const { plan } = this.scenes[chapter];
    stage.troupe.setScene(plan.homes);
    stage.talk.setPool(SCRIPTS[PLACES[chapter]], plan.spots);
    this.mystery.setClues(plan.clues);
    this.shown = chapter;
  }

  private updateCast(stage: Stage, dt: number, time: number, talking: boolean, pointer: Point | null): void {
    stage.troupe.update(dt, time);
    if (pointer) {
      for (const performer of stage.troupe.performers) {
        if (performer.walking || performer.inConversation) continue;
        const dx = pointer.x - performer.x;
        const dy = pointer.y - (performer.y - performer.height / 2);
        if (dx * dx + dy * dy <= POINTER_REACH * POINTER_REACH) performer.face(pointer.x);
      }
    }
    stage.talk.update(dt, time, { cameraX: 0, width: this.designWidth, enabled: talking });
    this.mystery.update(dt, time);
  }

  /** One place, in order: sky, scenery, moving parts, cast and clues, foreground, night tint, lights, speech. */
  private render(ctx: CanvasRenderingContext2D, stage: Stage, chapter: number, active: number, state: SkyState, time: number): void {
    const scene = this.scenes[chapter];
    const withCast = chapter === active;
    const night = clamp(1 - state.day, 0, 1);
    const land = this.land.ctx;
    ctx.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    ctx.drawImage(this.sky.canvas, 0, 0, this.designWidth, DESIGN_HEIGHT);
    land.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    land.drawImage(scene.back, 0, 0);
    scene.drawBehind(land, time, night);
    if (withCast) {
      stage.troupe.draw(land, 0, time, this.designWidth);
      this.mystery.drawClues(land, 0, time, night);
    }
    land.drawImage(scene.front, 0, 0);
    scene.drawAhead(land, time, night);
    tintLand(land, this.designWidth, DESIGN_HEIGHT, state);
    ctx.save();
    ctx.translate(0, -SCENES[chapter].lift);
    ctx.drawImage(this.land.canvas, 0, 0);
    scene.drawGlow(ctx, time, night);
    ctx.restore();
  }
}
