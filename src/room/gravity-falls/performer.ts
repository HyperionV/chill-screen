import { breeze } from '../wind';
import { drawEmoteMark } from './bubble';
import { CAST_IDS } from './types';
import type { CastArt, CastId, CastSprites, Emote, Facing, IdleStyle, PerformerHome, Point } from './types';

/** A character's body: where they stand, how they idle, walk and react. The Troupe holds them all and draws them. */

const TAU = Math.PI * 2;

/**
 * The radio hides everything lower than this feet row inside this share of the view's width, so nobody walks across it:
 * a walk that would cross goes over the top instead, along DETOUR_ROW (a higher row than the radio reaches).
 */
const RADIO_FROM = 0.385;
const RADIO_TO = 0.625;
const RADIO_ROW = 218;
const DETOUR_ROW = 214;
/** Walkers turn the corner this far outside the radio's edge. */
const DETOUR_MARGIN = 6;
/** A walk past the radio has at most three legs: to the near edge, along the top, on to the target. */
const MAX_LEGS = 3;

/** The part of the view the radio hides, in the view's own space; empty (right <= left) until the views say where it is. */
export interface Keepout {
  left: number;
  right: number;
}

/** Walking speeds in stage pixels a second: a calm stroll for people, a quicker waddle for the pig, short steps for gnomes. */
const PERSON_SPEED = 22;
const WADDLE_SPEED = 30;
const GNOME_SPEED = 18;
/** Bill and the lake monster never walk: they float or swim where they are. */
const WALK_SPEED: Readonly<Record<CastId, number>> = {
  dipper: PERSON_SPEED, mabel: PERSON_SPEED, stan: PERSON_SPEED, soos: PERSON_SPEED, wendy: PERSON_SPEED,
  waddles: WADDLE_SPEED, bill: 0, mcgucket: PERSON_SPEED, blubs: PERSON_SPEED, durland: PERSON_SPEED,
  susan: PERSON_SPEED, pacifica: PERSON_SPEED, gideon: PERSON_SPEED,
  'gnome-a': GNOME_SPEED, 'gnome-b': GNOME_SPEED, 'gnome-chief': GNOME_SPEED, 'lake-monster': 0,
};

/** How each character fills a quiet moment. The gnome chief stands solemn and still while the other gnomes hop about. */
const IDLE_STYLE: Readonly<Record<CastId, IdleStyle>> = {
  dipper: 'read', mabel: 'bounce', stan: 'breathe', soos: 'sway', wendy: 'lean', waddles: 'trot', bill: 'hover',
  mcgucket: 'sway', blubs: 'breathe', durland: 'sway', susan: 'breathe', pacifica: 'lean', gideon: 'bounce',
  'gnome-a': 'bounce', 'gnome-b': 'bounce', 'gnome-chief': 'still', 'lake-monster': 'bob',
};

/** A recurring window of time: `duty` is the share (0 to 1) of every `period` seconds spent inside it. */
interface IdleWindow {
  period: number;
  duty: number;
}
/** Stan now and then unfolds his arms into his signature pose; Dipper holds his reading pose and now and then glances up. */
const ACT_WINDOW: Readonly<Partial<Record<CastId, IdleWindow>>> = { stan: { period: 17, duty: 0.2 } };
const GLANCE_WINDOW: IdleWindow = { period: 11, duty: 0.12 };

/** Each performer's loops start at a different moment so a group never moves in step. */
const PHASE_SPREAD_SECONDS = 40;
const GOLDEN_STEP = 0.618034;
const STEP_PERIOD = 0.25;
const EMOTE_SECONDS = 1.2;
const BREATHE_PERIOD = { min: 3, spread: 1 };
/** Anything shorter than this (gnomes, animals) hops lower and quicker than a person. */
const PERSON_MIN_HEIGHT = 21;
const BOUNCE_PERSON = { amplitude: 2, period: 1.5, spread: 0.7 };
const BOUNCE_SMALL = { amplitude: 1, period: 0.9, spread: 0.4 };
/** Hops fill the first half of each bounce loop; the rest is a pause. */
const BOUNCE_ACTIVE_SHARE = 0.5;
const SWAY_PIXELS = 1.4;
const HOVER = { pixels: 2, rate: 0.9, driftPixels: 4, driftRate: 0.17 };
const BOB = { pixels: 1.5, seconds: 3.2 };
const TROT = { range: 30, pauseMin: 1.5, pauseMax: 4 };
/** A follower that fell behind the camera catches up this fast, and counts as "there" when this close. */
const FOLLOW_CATCHUP = 80;
const FOLLOW_SNAP = 2;

const SURPRISE_HOP = { seconds: 0.4, height: 3 };
const DOUBLE_HOP_SECONDS = 0.8;
const LAUGH_HOP_HEIGHT = 2;
const CHEER_HOP_HEIGHT = 3;
const SCARED_SHAKE = { seconds: 0.8, pixels: 1.4, rate: 40 };
const SHRUG_SECONDS = 0.8;
/** Extra pixels around a sprite that still count as a click on it, so small gnomes are easy to hit. */
const HIT_PADDING = 3;

const inWindow = (time: number, span: IdleWindow): boolean => (time % span.period) / span.period < span.duty;

/** One arc up and down over `seconds`, `height` pixels high; zero after it ends. */
const hop = (age: number, seconds: number, height: number): number =>
  age < seconds ? Math.round(height * Math.sin((Math.PI * age) / seconds)) : 0;

/** Two quick arcs in a row. */
const doubleHop = (age: number, height: number): number =>
  age < DOUBLE_HOP_SECONDS ? Math.round(height * Math.abs(Math.sin((Math.PI * age) / (DOUBLE_HOP_SECONDS / 2)))) : 0;

export class Performer {
  readonly id: CastId;
  /** Feet, bottom-centre, in the view's own space. */
  x = 0;
  y = 0;
  facing: Facing = 1;
  readonly width: number;
  readonly height: number;
  /** Set by the conversation code while this character is part of one: idle wandering stops. */
  inConversation = false;

  private homeSpot: PerformerHome;
  private readonly sprites: CastSprites;
  private readonly style: IdleStyle;
  private readonly speed: number;
  private readonly phase: number;
  private readonly rng: () => number;
  private tx = 0;
  private ty = 0;
  private moving = false;
  /** The legs of a walk past the radio, and how many are still to come after the one under way. */
  private readonly legs: Point[] = Array.from({ length: MAX_LEGS }, () => ({ x: 0, y: 0 }));
  private legsLeft = 0;
  /** The way to face once a walk ends (0 = keep facing the way walked). */
  private arriveFacing: Facing | 0 = 0;
  /** Journey only: keeps a fixed distance right of the camera's left edge. */
  private following = false;
  private partyWalking = false;
  private trotWait = 0;
  private emoteKind: Emote | null = null;
  private emoteAge = 0;
  private offX = 0;
  private offY = 0;
  private actPose = false;

  constructor(id: CastId, sprites: CastSprites, home: PerformerHome, rng: () => number, private readonly keepout: Keepout) {
    this.id = id;
    this.sprites = sprites;
    this.homeSpot = home;
    this.rng = rng;
    this.style = IDLE_STYLE[id];
    this.speed = WALK_SPEED[id];
    this.phase = (CAST_IDS.indexOf(id) * GOLDEN_STEP) % 1;
    this.width = sprites.stand.width;
    this.height = sprites.stand.height;
    this.place(home);
  }

  get home(): PerformerHome { return this.homeSpot; }
  get canWalk(): boolean { return this.speed > 0; }
  /** True while stepping: on a walk of their own, or striding along with the travelling party. */
  get walking(): boolean { return this.moving || this.partyWalking; }
  /** True while walking to a place they were sent to (not while keeping up with the camera). */
  get arriving(): boolean { return this.moving && !this.following; }
  /** Where the body is drawn: feet position plus the idle or emote offset. */
  get drawX(): number { return this.x + this.offX; }
  get drawY(): number { return this.y + this.offY; }

  /** Puts the performer at a home, as at the start of a scene. */
  place(home: PerformerHome): void {
    this.homeSpot = home;
    this.x = home.x;
    this.y = home.y;
    this.facing = home.facing;
    this.moving = false;
    this.legsLeft = 0;
    this.arriveFacing = 0;
    this.following = home.followDx !== undefined;
    this.partyWalking = false;
    this.inConversation = false;
    this.emoteKind = null;
    this.trotWait = TROT.pauseMin + this.rng() * (TROT.pauseMax - TROT.pauseMin);
  }

  goTo(x: number, y: number): void {
    this.following = false;
    this.arriveFacing = 0;
    this.startMove(x, y);
  }

  face(towardX: number): void {
    if (this.moving || Math.abs(towardX - this.x) < 1) return;
    this.facing = towardX > this.x ? 1 : -1;
  }

  emote(kind: Emote): void {
    this.emoteKind = kind;
    this.emoteAge = 0;
  }

  /** Walks back to the home spot and turns to the home facing; a follower goes back to keeping up with the camera. */
  returnHome(): void {
    const home = this.homeSpot;
    if (home.followDx !== undefined) {
      this.following = true;
      return;
    }
    this.following = false;
    if (this.speed === 0) {
      this.facing = home.facing;
      return;
    }
    this.arriveFacing = home.facing;
    this.startMove(home.x, home.y);
  }

  update(dt: number, time: number, cameraX: number, travelling: boolean): void {
    if (this.emoteKind !== null) {
      this.emoteAge += dt;
      if (this.emoteAge >= EMOTE_SECONDS) this.emoteKind = null;
    }
    if (this.following) this.follow(dt, cameraX, travelling);
    else {
      this.partyWalking = false;
      if (this.moving) this.advance(dt);
      else this.trot(dt);
    }
    if (this.walking) {
      this.offX = 0;
      this.offY = 0;
      this.actPose = false;
    } else this.applyIdle(time);
    this.applyEmote();
  }

  /** Draws the sprite (mirrored when facing left) and any emote mark. `cameraX` shifts world pixels to view pixels. */
  draw(ctx: CanvasRenderingContext2D, cameraX: number, time: number, viewWidth: number): void {
    const px = Math.round(this.drawX - cameraX);
    const top = Math.round(this.drawY) - this.height;
    const left = px - Math.floor(this.width / 2);
    if (left + this.width < 0 || left > viewWidth) return;
    let frame = this.sprites.stand;
    if (this.walking) frame = this.sprites.step[Math.floor(time / STEP_PERIOD + this.phase * 2) % 2];
    else if (this.actPose) frame = this.sprites.act;
    if (this.facing === 1) ctx.drawImage(frame, left, top);
    else {
      ctx.save();
      ctx.translate(left + this.width, top);
      ctx.scale(-1, 1);
      ctx.drawImage(frame, 0, 0);
      ctx.restore();
    }
    if (this.emoteKind !== null) drawEmoteMark(ctx, this.emoteKind, px, top, this.emoteAge, EMOTE_SECONDS);
  }

  /** Starts a walk to (x, y); a straight line that would pass behind the radio is replaced by the three legs of a detour above it. */
  private startMove(x: number, y: number): void {
    if (this.speed === 0) return;
    this.moving = true;
    this.legsLeft = 0;
    if (!this.crossesRadio(x, y)) {
      this.aim(x, y);
      return;
    }
    const { left, right } = this.keepout;
    const fromLeft = this.x < x;
    const along = Math.min(DETOUR_ROW, this.y, y);
    this.setLeg(0, fromLeft ? left - DETOUR_MARGIN : right + DETOUR_MARGIN, along);
    this.setLeg(1, fromLeft ? right + DETOUR_MARGIN : left - DETOUR_MARGIN, along);
    this.setLeg(2, x, y);
    this.legsLeft = MAX_LEGS - 1;
    this.aim(this.legs[0].x, this.legs[0].y);
  }

  private setLeg(index: number, x: number, y: number): void {
    this.legs[index].x = x;
    this.legs[index].y = y;
  }

  private aim(x: number, y: number): void {
    this.tx = x;
    this.ty = y;
    if (Math.abs(x - this.x) > 0.5) this.facing = x > this.x ? 1 : -1;
  }

  /** True when the line from here to (x, y) runs from one side of the radio to the other at a row the radio hides. */
  private crossesRadio(x: number, y: number): boolean {
    const { left, right } = this.keepout;
    if (right <= left || Math.max(this.y, y) <= RADIO_ROW) return false;
    return (this.x < left && x > right) || (x < left && this.x > right);
  }

  /** One step of a walk along its current leg; the last leg ends the walk. */
  private advance(dt: number): void {
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (dist <= step) {
      this.x = this.tx;
      this.y = this.ty;
      if (this.legsLeft > 0) {
        const next = this.legs[MAX_LEGS - this.legsLeft];
        this.legsLeft--;
        this.aim(next.x, next.y);
        return;
      }
      this.moving = false;
      if (this.arriveFacing !== 0) {
        this.facing = this.arriveFacing;
        this.arriveFacing = 0;
      }
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  /** Keeps a fixed distance right of the camera. A follower that lagged (after a conversation) walks or hurries back to it. */
  private follow(dt: number, cameraX: number, travelling: boolean): void {
    const home = this.homeSpot;
    const tx = cameraX + (home.followDx ?? 0);
    const ty = home.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    this.partyWalking = travelling && this.canWalk;
    if (dist <= FOLLOW_SNAP || this.speed === 0) {
      this.x = tx;
      this.y = ty;
      if (this.moving) {
        this.moving = false;
        this.facing = home.facing;
      }
      return;
    }
    const step = Math.min(dist, (travelling ? FOLLOW_CATCHUP : this.speed) * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.moving = true;
    if (Math.abs(dx) > FOLLOW_SNAP) this.facing = dx > 0 ? 1 : -1;
  }

  /** The pig's small wandering walks near home, with pauses between them. */
  private trot(dt: number): void {
    if (this.style !== 'trot' || this.inConversation || !this.canWalk) return;
    this.trotWait -= dt;
    if (this.trotWait > 0) return;
    this.trotWait = TROT.pauseMin + this.rng() * (TROT.pauseMax - TROT.pauseMin);
    this.startMove(this.homeSpot.x + (this.rng() * 2 - 1) * TROT.range, this.homeSpot.y);
  }

  /** One pixel up for half of a 3 to 4 second loop. */
  private breatheOffset(t: number): number {
    return Math.sin((t * TAU) / (BREATHE_PERIOD.min + this.phase * BREATHE_PERIOD.spread)) > 0 ? -1 : 0;
  }

  private bounceOffset(t: number): number {
    const bounce = this.height < PERSON_MIN_HEIGHT ? BOUNCE_SMALL : BOUNCE_PERSON;
    const period = bounce.period + this.phase * bounce.spread;
    const u = (t % period) / period / BOUNCE_ACTIVE_SHARE;
    return u < 1 ? -Math.round(bounce.amplitude * Math.sin(Math.PI * u)) : 0;
  }

  private applyIdle(time: number): void {
    const t = time + this.phase * PHASE_SPREAD_SECONDS;
    this.offX = 0;
    this.offY = 0;
    this.actPose = false;
    switch (this.style) {
      case 'breathe':
      case 'trot': {
        this.offY = this.breatheOffset(t);
        const actWindow = ACT_WINDOW[this.id];
        if (actWindow) this.actPose = inWindow(t, actWindow);
        break;
      }
      case 'read':
      case 'lean':
        this.offY = this.breatheOffset(t);
        this.actPose = this.style === 'lean' || !inWindow(t, GLANCE_WINDOW);
        break;
      case 'sway':
        this.offX = Math.round(SWAY_PIXELS * breeze(time, this.x));
        break;
      case 'bounce':
        this.offY = this.bounceOffset(t);
        break;
      case 'hover':
        this.offY = Math.round(HOVER.pixels * Math.sin(t * HOVER.rate));
        this.offX = Math.round(HOVER.driftPixels * Math.sin(t * HOVER.driftRate));
        break;
      case 'bob':
        this.offY = Math.round(BOB.pixels * Math.sin((t * TAU) / BOB.seconds));
        break;
      case 'still':
        break;
    }
  }

  /** Adds the body part of the current emotion on top of the idle motion ('think' is only the mark over the head). */
  private applyEmote(): void {
    if (this.emoteKind === null) return;
    const age = this.emoteAge;
    switch (this.emoteKind) {
      case 'surprise':
        this.offY -= hop(age, SURPRISE_HOP.seconds, SURPRISE_HOP.height);
        break;
      case 'laugh':
        this.offY -= doubleHop(age, LAUGH_HOP_HEIGHT);
        break;
      case 'scared':
        if (age < SCARED_SHAKE.seconds) this.offX += Math.round(SCARED_SHAKE.pixels * Math.sin(age * SCARED_SHAKE.rate));
        break;
      case 'point':
        this.actPose = true;
        break;
      case 'cheer':
        this.actPose = true;
        this.offY -= doubleHop(age, CHEER_HOP_HEIGHT);
        break;
      case 'shrug':
        if (age < SHRUG_SECONDS) this.offX += this.facing * Math.round(Math.sin((Math.PI * age) / SHRUG_SECONDS));
        break;
    }
  }
}

/** Everyone standing in the current scene. */
export class Troupe {
  readonly performers: readonly Performer[];
  private readonly members: Performer[] = [];
  private readonly drawOrder: Performer[] = [];
  private readonly pool = new Map<CastId, Performer>();
  private readonly current = new Map<CastId, Performer>();
  private cameraX = 0;
  private isTravelling = false;
  private sceneCount = 0;
  /** Shared with every performer: where the radio hides the ground, so walkers go over the top instead of behind it. */
  private readonly keepout: Keepout = { left: 0, right: 0 };

  constructor(
    private readonly art: CastArt,
    private readonly rng: () => number = Math.random,
  ) {
    this.performers = this.members;
  }

  /** Changes on every `setScene`, so the conversation code can tell that its performers were replaced. */
  get revision(): number {
    return this.sceneCount;
  }

  get travelling(): boolean {
    return this.isTravelling;
  }

  /** Tells the troupe where the radio is for a view whose left edge is at world x `cameraX` and which is `viewWidth` wide. */
  setRadio(cameraX: number, viewWidth: number): void {
    this.keepout.left = cameraX + viewWidth * RADIO_FROM;
    this.keepout.right = cameraX + viewWidth * RADIO_TO;
  }

  /** Replaces everyone: each home gets a performer (reusing the one made for that character before) standing at it. */
  setScene(homes: readonly PerformerHome[]): void {
    this.members.length = 0;
    this.current.clear();
    for (const home of homes) {
      if (this.current.has(home.id)) continue;
      let performer = this.pool.get(home.id);
      if (performer) performer.place(home);
      else {
        performer = new Performer(home.id, this.art[home.id], home, this.rng, this.keepout);
        this.pool.set(home.id, performer);
      }
      this.members.push(performer);
      this.current.set(home.id, performer);
    }
    this.sceneCount++;
  }

  /** Followers (homes with `followDx`) keep up with the camera while `travelling`; otherwise they stay put. */
  setCamera(cameraX: number, travelling: boolean): void {
    this.cameraX = cameraX;
    this.isTravelling = travelling;
  }

  update(dt: number, time: number): void {
    for (let i = 0; i < this.members.length; i++) this.members[i].update(dt, time, this.cameraX, this.isTravelling);
  }

  get(id: CastId): Performer | undefined {
    return this.current.get(id);
  }

  /** Draws everyone, the ones nearer the viewer (larger y) last. Sorting reuses one array and allocates nothing. */
  draw(ctx: CanvasRenderingContext2D, cameraX: number, time: number, viewWidth: number): void {
    const order = this.drawOrder;
    order.length = this.members.length;
    for (let i = 0; i < this.members.length; i++) {
      const performer = this.members[i];
      let j = i - 1;
      while (j >= 0 && order[j].y > performer.y) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = performer;
    }
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < order.length; i++) order[i].draw(ctx, cameraX, time, viewWidth);
  }

  /** The nearest-to-the-viewer performer whose box holds the view point (x, y), or null. */
  pick(x: number, y: number, cameraX: number): Performer | null {
    const worldX = x + cameraX;
    let best: Performer | null = null;
    for (let i = 0; i < this.members.length; i++) {
      const p = this.members[i];
      const halfWidth = p.width / 2 + HIT_PADDING;
      const feet = p.drawY;
      const hit =
        Math.abs(worldX - p.drawX) <= halfWidth && y >= feet - p.height - HIT_PADDING && y <= feet + HIT_PADDING;
      if (hit && (best === null || p.y >= best.y)) best = p;
    }
    return best;
  }
}
