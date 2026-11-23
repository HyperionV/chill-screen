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
import { PLACES, sceneLift, type PerformerHome, type Point } from '../../gravity-falls/types';
import { PACE_SPEED, type Pace } from '../../journey/pace';
import { SKY_HORIZON, tintLand, updateLook } from '../../landscapes/gravity-falls/view-render';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ChapterTitle } from '../chapter-title';
import type { JourneyView } from '../journey-view';
import { ramp } from '../noise';
import { Route } from '../route';
import { CHAPTER_SECONDS, CHAPTERS, DISSOLVE_SECONDS, NO_STATION, cameraAt, pauseAt } from './chapters';
import { drawLayers } from './view-render';
import { DESIGN_ROWS, type ChapterWorld } from './world';
import { WORLDS } from './worlds';

/** A character turns to face the pointer when it is this close (design pixels) to their body. */
const POINTER_REACH = 30;
/** A longer step than this (a stalled tab) is treated as this long. */
const MAX_STEP = 0.1;
/** The next place starts building this many seconds before the one on show ends, so no frame has to build it in a hurry. */
const PREBUILD_SECONDS = 20;
/** The camera counts as walking when it moved more than this (design pixels) since the last frame. */
const MOVING_EPSILON = 0.01;

/** Talk while the party walks only uses scripts meant for walking; at a station only the ones that need standing still. */
const WALKING_SCRIPTS = PLACES.map((place) => SCRIPTS[place].filter((script) => script.walking));
const STANDING_SCRIPTS = PLACES.map((place) => SCRIPTS[place].filter((script) => !script.walking));

/** The cast and its conversations, made once the first size is known. */
interface Stage {
  troupe: Troupe;
  talk: Conversations;
}

/** The party's homes follow the camera, so they start beside it wherever the camera is when the place is entered. */
function homesAt(homes: readonly PerformerHome[], cameraX: number): PerformerHome[] {
  return homes.map((home) => (home.followDx === undefined ? home : { ...home, x: cameraX + home.followDx }));
}

/** For each station, the meeting spots that lie inside the view while the camera rests there. */
function spotsByStation(world: ChapterWorld, designWidth: number): Point[][] {
  return world.stations.map((station) => world.plan.spots.filter((spot) => spot.x >= station.at && spot.x <= station.at + designWidth));
}

/** Sets a buffer's size only when it changed, because resizing a canvas clears it and reallocates. */
function fit(buffer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }, width: number, height: number): void {
  if (buffer.canvas.width !== width) buffer.canvas.width = width;
  if (buffer.canvas.height !== height) buffer.canvas.height = height;
  buffer.ctx.imageSmoothingEnabled = false;
}

/** The Gravity Falls Journey: the party walks through five places, resting at stations where the locals talk. */
export class GravityFallsJourney implements JourneyView {
  private width = 0;
  private height = 0;
  private designWidth = 1;
  private unit = 1;
  private multiplier = PACE_SPEED.gentle;
  private time = 0;
  /** The place the cast, the talk and the clues belong to right now; -1 until the first frame after a resize. */
  private shown = -1;
  /** The station whose pause is on (its talk pool is in use), or NO_STATION while walking. */
  private phase = NO_STATION;
  private camera = 0;
  private spots: Point[][] = [];
  private builtFor = 0;
  private builtThisFrame = false;
  private built: (ChapterWorld | null)[] = WORLDS.map((): ChapterWorld | null => null);
  readonly route = new Route('gravity-falls', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [150, 160, 130] };
  private readonly sky = memoryCanvas(1, 1);
  private readonly land = memoryCanvas(1, 1);
  private readonly picture = memoryCanvas(1, 1);
  private readonly nextPicture = memoryCanvas(1, 1);
  private readonly mystery = new MysteryBoard();
  private readonly pointer: Point = { x: 0, y: 0 };
  /** Where design pixels land on the stage for the speech: the camera's place and the shared lift. */
  private readonly projection: Projection = { unit: 1, lift: sceneLift(), cameraX: 0 };
  private stage: Stage | null = null;

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, SKY_HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  setPace(pace: Pace): void {
    this.multiplier = PACE_SPEED[pace];
  }

  resize(w: number, h: number): void {
    this.width = Math.max(0, Math.round(w));
    this.height = Math.max(0, Math.round(h));
    if (this.width === 0 || this.height === 0) return;
    this.unit = this.height / DESIGN_ROWS;
    this.designWidth = Math.max(1, Math.round(this.width / this.unit));
    this.dome.resize(this.width, this.height);
    fit(this.sky, this.width, this.height);
    for (const buffer of [this.land, this.picture, this.nextPicture]) fit(buffer, this.designWidth, DESIGN_ROWS);
    if (!this.stage) {
      const troupe = new Troupe(buildCastArt());
      this.stage = { troupe, talk: new Conversations(troupe, QUIPS) };
    }
    if (this.designWidth !== this.builtFor) {
      this.builtFor = this.designWidth;
      this.built.fill(null);
      this.shown = -1;
    }
  }

  press(x: number, y: number): void {
    const { stage, shown } = this;
    const world = shown < 0 ? null : this.built[shown];
    if (!stage || !world || this.width === 0 || this.height === 0) return;
    const px = (x * this.designWidth) / this.width;
    const py = y / this.unit + sceneLift();
    const who = stage.troupe.pick(px, py, this.camera);
    if (who) stage.talk.poke(who);
    else if (!this.mystery.press(px, py, this.camera)) world.press?.(px + this.camera, py, this.time);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const { stage } = this;
    if (!stage || this.width === 0 || this.height === 0) return this.look;
    const dt = Math.min(MAX_STEP, Math.max(0, frame.dt));
    this.time = frame.time;
    this.route.advance(dt, this.multiplier);
    const now = this.route.now;
    this.builtThisFrame = false;
    const current = this.worldFor(now.index);
    if (!current) return this.look;
    const seconds = now.t * CHAPTER_SECONDS;
    const fade = ramp(CHAPTER_SECONDS - DISSOLVE_SECONDS, CHAPTER_SECONDS, seconds);
    const next = fade > 0 || CHAPTER_SECONDS - seconds <= PREBUILD_SECONDS ? this.worldFor(now.next) : null;
    const useNext = fade > 0.5 && next !== null;
    const active = useNext ? now.next : now.index;
    const activeWorld = useNext ? next : current;
    const activeT = useNext ? 0 : now.t;
    const mainCamera = this.cameraFor(current, now.t);
    const camera = useNext ? this.cameraFor(next, 0) : mainCamera;

    if (active !== this.shown) this.enter(stage, active, activeWorld, camera);
    const walking = !useNext && Math.abs(camera - this.camera) > MOVING_EPSILON;
    this.camera = camera;
    const phase = pauseAt(activeT, activeWorld.stations);
    if (phase !== this.phase) this.setPhase(stage, active, phase);
    stage.troupe.setCamera(camera, walking);
    this.syncDoor(current);
    if (next) this.syncDoor(next);
    this.updateCast(stage, dt, frame.time, fade === 0, frame.pointer);

    const state = this.dome.stateAt(hourNow());
    updateLook(this.look, state);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.render(this.picture.ctx, stage, current, mainCamera, now.index === active, state, frame.time);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.picture.canvas, 0, 0, this.width, this.height);
    if (fade > 0 && next) {
      this.render(this.nextPicture.ctx, stage, next, this.cameraFor(next, 0), now.next === active, state, frame.time);
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
    this.projection.cameraX = this.camera;
    stage.talk.drawBubbles(screen, this.projection, stageWidth);
    this.mystery.drawOverlay(screen, stageWidth, stageHeight);
  }

  /**
   * A place's world, built on first use. Only one world is built in a frame: a second request in the same frame gets
   * null and is answered a frame later.
   */
  private worldFor(index: number): ChapterWorld | null {
    const cached = this.built[index];
    if (cached) return cached;
    if (this.builtThisFrame) return null;
    this.builtThisFrame = true;
    const world = WORLDS[index].build(this.designWidth);
    this.built[index] = world;
    return world;
  }

  /** The camera, kept inside the world so the strips never run out. */
  private cameraFor(world: ChapterWorld, chapterT: number): number {
    return clamp(cameraAt(chapterT, world.stations), 0, Math.max(0, world.worldWidth - this.designWidth));
  }

  /** Hands the cast and the clues over to a place; the party appears beside the camera. */
  private enter(stage: Stage, chapter: number, world: ChapterWorld, camera: number): void {
    stage.troupe.setScene(homesAt(world.plan.homes, camera));
    this.spots = spotsByStation(world, this.designWidth);
    this.mystery.setClues(world.plan.clues);
    this.shown = chapter;
    this.camera = camera;
    this.setPhase(stage, chapter, NO_STATION);
  }

  /** Switches what the cast talks about: the walking scripts on the road, the standing scripts with this station's spots at a pause. */
  private setPhase(stage: Stage, chapter: number, phase: number): void {
    this.phase = phase;
    if (phase === NO_STATION) stage.talk.setPool(WALKING_SCRIPTS[chapter], []);
    else stage.talk.setPool(STANDING_SCRIPTS[chapter], this.spots[phase]);
  }

  private syncDoor(world: ChapterWorld): void {
    world.setDoorOpen?.(this.mystery.doorOpen);
  }

  private updateCast(stage: Stage, dt: number, time: number, talking: boolean, pointer: { x: number; y: number } | null): void {
    stage.troupe.update(dt, time);
    if (pointer) {
      this.pointer.x = (pointer.x * this.designWidth) / this.width + this.camera;
      this.pointer.y = pointer.y / this.unit + sceneLift();
      for (const performer of stage.troupe.performers) {
        if (performer.walking || performer.inConversation) continue;
        const dx = this.pointer.x - performer.x;
        const dy = this.pointer.y - (performer.y - performer.height / 2);
        if (dx * dx + dy * dy <= POINTER_REACH * POINTER_REACH) performer.face(this.pointer.x);
      }
    }
    stage.talk.update(dt, time, { cameraX: this.camera, width: this.designWidth, enabled: talking });
    this.mystery.update(dt, time);
  }

  /** One place, in order: sky, strips, moving parts, cast and clues, foreground, night tint, lights, speech. */
  private render(
    ctx: CanvasRenderingContext2D,
    stage: Stage,
    world: ChapterWorld,
    cameraX: number,
    withCast: boolean,
    state: SkyState,
    time: number,
  ): void {
    const night = clamp(1 - state.day, 0, 1);
    const land = this.land.ctx;
    ctx.clearRect(0, 0, this.designWidth, DESIGN_ROWS);
    ctx.drawImage(this.sky.canvas, 0, 0, this.designWidth, DESIGN_ROWS);
    land.clearRect(0, 0, this.designWidth, DESIGN_ROWS);
    drawLayers(land, world.layers, cameraX, this.designWidth);
    world.drawBehind(land, cameraX, time, night);
    if (withCast) {
      stage.troupe.draw(land, cameraX, time, this.designWidth);
      this.mystery.drawClues(land, cameraX, time, night);
    }
    world.drawAhead(land, cameraX, time, night);
    tintLand(land, this.designWidth, DESIGN_ROWS, state);
    ctx.save();
    ctx.translate(0, -sceneLift());
    ctx.drawImage(this.land.canvas, 0, 0);
    world.drawGlow(ctx, cameraX, time, night);
    ctx.restore();
  }
}
