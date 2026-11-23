import { clamp } from '../../world/math';
import { bubbleAlpha, drawBubble, layoutBubble, type BubbleLayout } from './bubble';
import type { Performer, Troupe } from './performer';
import type { CastId, Point, Script } from './types';

/** Schedules and draws conversations: who talks next, how they come together, what each line looks like. */

/** A step longer than this is treated as this long, so a stalled tab does not skip whole lines. */
const MAX_STEP = 0.1;
const FIRST_DELAY = { min: 3, max: 6 };
const REST_BETWEEN = { min: 6, max: 14 };
/** When nothing can be played right now, look again after this many seconds. */
const RETRY_SECONDS = 2;
/** "Here" scripts need everyone within this distance of each other. */
const HERE_RANGE = 160;
/** A speaker this far outside the view counts as off screen. */
const SCREEN_MARGIN = 20;
const APPROACH_GAP = 13;
const SPOT_GAP = 14;
const ARRIVAL_TIMEOUT = 14;
const TYPE_RATE = 28;
const LINE_TIME = { base: 1.4, perChar: 0.075, min: 2.2, max: 7 };
const QUIP_TIME = { base: 1.4, perChar: 0.07 };
const LINE_SILENCE = 0.5;
const REACT_DELAY = 0.6;
const CLOSING_WAIT = 1;

type Phase = 'resting' | 'gathering' | 'line' | 'silence' | 'closing';

const anything = (): boolean => true;

/**
 * Hands out indices in a shuffled order, none twice until every acceptable one has had its turn,
 * and never the same one twice in a row (unless it is the only one acceptable).
 */
class ShuffleBag {
  private readonly order: number[] = [];
  private pos = 0;
  private last = -1;

  constructor(private size: number) {}

  reset(size: number): void {
    this.size = size;
    this.order.length = 0;
    this.pos = 0;
    this.last = -1;
  }

  /** The next acceptable index, or -1 when none is. */
  take(rng: () => number, accept: (index: number) => boolean): number {
    let found = this.scan(accept, true);
    if (found < 0) {
      this.refill(rng);
      found = this.scan(accept, true);
    }
    if (found < 0) found = this.scan(accept, false);
    return found;
  }

  private scan(accept: (index: number) => boolean, skipLast: boolean): number {
    for (let i = this.pos; i < this.order.length; i++) {
      const candidate = this.order[i];
      if ((skipLast && candidate === this.last) || !accept(candidate)) continue;
      this.order[i] = this.order[this.pos];
      this.order[this.pos] = candidate;
      this.pos++;
      this.last = candidate;
      return candidate;
    }
    return -1;
  }

  private refill(rng: () => number): void {
    this.order.length = this.size;
    for (let i = 0; i < this.size; i++) this.order[i] = i;
    for (let i = this.size - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const swap = this.order[i];
      this.order[i] = this.order[j];
      this.order[j] = swap;
    }
    this.pos = 0;
  }
}

export class Conversations {
  private scripts: readonly Script[] = [];
  private spots: readonly Point[] = [];
  private readonly scriptBag = new ShuffleBag(0);
  private readonly quipBags = new Map<CastId, ShuffleBag>();
  private readonly usable = (index: number): boolean => this.isUsable(this.scripts[index]);

  private phase: Phase = 'resting';
  /** Counts down while resting; counts up (seconds spent) in every other phase. */
  private timer: number;
  private script: Script | null = null;
  private readonly players: Performer[] = [];
  private turnsToFace = true;
  private lineIndex = 0;
  private lineSpeaker: Performer | null = null;
  private lineLayout: BubbleLayout | null = null;
  private lineDuration = 0;
  private reactPending = false;

  private quipPerformer: Performer | null = null;
  private quipLayout: BubbleLayout | null = null;
  private quipAge = 0;
  private quipDuration = 0;

  private cameraX = 0;
  private viewWidth = 0;
  private enabled = true;
  private revision: number;

  private readonly usedSpots: boolean[] = [];
  private readonly targets: Point[] = [];
  private readonly order: number[] = [];

  constructor(
    private readonly troupe: Troupe,
    private readonly quips: Readonly<Record<CastId, readonly string[]>>,
    private readonly rng: () => number = Math.random,
  ) {
    this.timer = this.between(FIRST_DELAY.min, FIRST_DELAY.max);
    this.revision = troupe.revision;
  }

  /** True from the moment a conversation is chosen until its cast is back home. */
  get busy(): boolean {
    return this.phase !== 'resting';
  }

  /** A new pool (a chapter or phase change). The current conversation ends; the first new one starts 3 to 6 seconds later. */
  setPool(scripts: readonly Script[], spots: readonly Point[]): void {
    this.cancel();
    this.scripts = scripts;
    this.spots = spots;
    this.scriptBag.reset(scripts.length);
    this.timer = this.between(FIRST_DELAY.min, FIRST_DELAY.max);
  }

  /** Ends the conversation at once: nobody speaks, everyone walks home. */
  cancel(): void {
    for (const p of this.players) {
      p.inConversation = false;
      p.returnHome();
    }
    this.players.length = 0;
    this.script = null;
    this.lineSpeaker = null;
    this.lineLayout = null;
    this.phase = 'resting';
    this.timer = this.between(REST_BETWEEN.min, REST_BETWEEN.max);
  }

  /** `_time` is unused: kept so a view calls this the same way as `Troupe.update`. */
  update(dt: number, _time: number, view: { cameraX: number; width: number; enabled: boolean }): void {
    const step = Math.min(dt, MAX_STEP);
    this.cameraX = view.cameraX;
    this.viewWidth = view.width;
    this.enabled = view.enabled;
    if (this.revision !== this.troupe.revision) {
      this.revision = this.troupe.revision;
      this.cancel();
    }
    this.updateQuip(step);
    switch (this.phase) {
      case 'resting': this.updateResting(step); break;
      case 'gathering': this.updateGathering(step); break;
      case 'line': this.updateLine(step); break;
      case 'silence': this.updateSilence(step); break;
      case 'closing': this.updateClosing(step); break;
    }
  }

  /** Call last, over everything else. */
  drawBubbles(ctx: CanvasRenderingContext2D, cameraX: number, viewWidth: number): void {
    if (this.phase === 'line' && this.lineSpeaker && this.lineLayout) {
      this.drawFor(ctx, this.lineSpeaker, this.lineLayout, this.timer, this.lineDuration, cameraX, viewWidth);
    }
    if (this.quipPerformer && this.quipLayout) {
      this.drawFor(ctx, this.quipPerformer, this.quipLayout, this.quipAge, this.quipDuration, cameraX, viewWidth);
    }
  }

  /** A click on a character: they say a fresh one-liner, unless they are in a conversation or another quip is showing. */
  poke(performer: Performer): void {
    if (performer.inConversation || this.quipPerformer) return;
    const lines = this.quips[performer.id];
    if (lines.length === 0) return;
    let bag = this.quipBags.get(performer.id);
    if (!bag) {
      bag = new ShuffleBag(lines.length);
      this.quipBags.set(performer.id, bag);
    }
    const text = lines[bag.take(this.rng, anything)];
    this.quipPerformer = performer;
    this.quipLayout = layoutBubble(text, this.viewWidth);
    this.quipAge = 0;
    this.quipDuration = QUIP_TIME.base + QUIP_TIME.perChar * text.length;
    performer.emote(this.rng() < 0.5 ? 'surprise' : 'cheer');
  }

  private between(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  private updateQuip(step: number): void {
    if (!this.quipPerformer) return;
    this.quipAge += step;
    if (this.quipAge < this.quipDuration) return;
    this.quipPerformer = null;
    this.quipLayout = null;
  }

  private drawFor(ctx: CanvasRenderingContext2D, who: Performer, layout: BubbleLayout, age: number, duration: number, cameraX: number, viewWidth: number): void {
    const alpha = bubbleAlpha(age, duration);
    if (alpha <= 0) return;
    const revealed = Math.min(layout.chars, Math.floor(age * TYPE_RATE));
    const headTop = Math.round(who.drawY) - who.height;
    drawBubble(ctx, layout, revealed, Math.round(who.drawX - cameraX), headTop, viewWidth, alpha);
  }

  private updateResting(step: number): void {
    if (!this.enabled) return;
    this.timer -= step;
    if (this.timer > 0) return;
    const index = this.scriptBag.take(this.rng, this.usable);
    if (index < 0) this.timer = RETRY_SECONDS;
    else this.begin(this.scripts[index]);
  }

  /** Whether everyone is here, close enough and on screen. While the party travels, only scripts meant for walking qualify. */
  private isUsable(script: Script): boolean {
    const travelling = this.troupe.travelling;
    if ((travelling && !script.walking) || script.cast.length === 0 || script.lines.length === 0) return false;
    const left = this.cameraX - SCREEN_MARGIN;
    const right = this.cameraX + this.viewWidth + SCREEN_MARGIN;
    for (let i = 0; i < script.cast.length; i++) {
      const p = this.troupe.get(script.cast[i]);
      if (!p || p.x < left || p.x > right) return false;
      if (script.meet !== 'here' || travelling) continue;
      for (let j = 0; j < i; j++) {
        const q = this.troupe.get(script.cast[j]);
        if (q && Math.hypot(p.x - q.x, p.y - q.y) > HERE_RANGE) return false;
      }
    }
    return true;
  }

  private begin(script: Script): void {
    this.script = script;
    this.players.length = 0;
    for (const id of script.cast) {
      const p = this.troupe.get(id);
      if (!p) continue;
      p.inConversation = true;
      this.players.push(p);
    }
    this.turnsToFace = !(script.walking === true && this.troupe.travelling);
    this.timer = 0;
    this.phase = 'gathering';
    this.stage(script);
  }

  /** Gets everyone into place: 'here' stays put, 'approach' sends the first beside the second, 'gather' fills the meeting spots. */
  private stage(script: Script): void {
    if (script.meet === 'here' || !this.turnsToFace) return;
    if (script.meet === 'gather' && this.spots.length > 0) this.stageGather();
    else this.stageApproach();
  }

  /** The first walks to 13 pixels beside the second, on the side they come from. If the first cannot walk, the second comes instead. */
  private stageApproach(): void {
    const first = this.players[0];
    const second = this.players[1];
    if (!first || !second) return;
    const mover = first.canWalk || !second.canWalk ? first : second;
    const anchor = mover === first ? second : first;
    const side = mover.x <= anchor.x ? -1 : 1;
    anchor.face(mover.x);
    mover.goTo(anchor.x + side * APPROACH_GAP, anchor.y);
  }

  /**
   * Each person takes the free meeting spot nearest the group's centre; when the spots run out, the rest stand 14 pixels
   * beside the last one. Spots and people are both ordered left to right so nobody walks across anybody.
   */
  private stageGather(): void {
    const count = this.players.length;
    let centreX = 0;
    let centreY = 0;
    for (const p of this.players) {
      centreX += p.x;
      centreY += p.y;
    }
    centreX /= count;
    centreY /= count;
    this.usedSpots.length = this.spots.length;
    this.usedSpots.fill(false);
    while (this.targets.length < count) this.targets.push({ x: 0, y: 0 });
    for (let slot = 0; slot < count; slot++) {
      const target = this.targets[slot];
      const spot = this.takeNearestSpot(centreX, centreY);
      if (spot) {
        target.x = spot.x;
        target.y = spot.y;
      } else {
        const previous = this.targets[slot - 1];
        target.x = previous.x + SPOT_GAP;
        target.y = previous.y;
      }
    }
    for (let i = 1; i < count; i++) {
      const target = this.targets[i];
      let j = i - 1;
      while (j >= 0 && this.targets[j].x > target.x) {
        this.targets[j + 1] = this.targets[j];
        j--;
      }
      this.targets[j + 1] = target;
    }
    this.order.length = count;
    for (let i = 0; i < count; i++) {
      let j = i - 1;
      while (j >= 0 && this.players[this.order[j]].x > this.players[i].x) {
        this.order[j + 1] = this.order[j];
        j--;
      }
      this.order[j + 1] = i;
    }
    for (let k = 0; k < count; k++) this.players[this.order[k]].goTo(this.targets[k].x, this.targets[k].y);
  }

  private takeNearestSpot(x: number, y: number): Point | null {
    let best = -1;
    let bestDistance = Infinity;
    for (let s = 0; s < this.spots.length; s++) {
      if (this.usedSpots[s]) continue;
      const distance = (this.spots[s].x - x) ** 2 + (this.spots[s].y - y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = s;
      }
    }
    if (best < 0) return null;
    this.usedSpots[best] = true;
    return this.spots[best];
  }

  /** Nobody speaks until everyone has arrived; after 14 seconds the meeting is called off. */
  private updateGathering(step: number): void {
    this.timer += step;
    if (!this.enabled) {
      this.cancel();
      return;
    }
    if (this.players.some((p) => p.arriving)) {
      if (this.timer > ARRIVAL_TIMEOUT) this.cancel();
      return;
    }
    this.startLine(0);
  }

  private startLine(index: number): void {
    const script = this.script;
    if (!script) return;
    if (index >= script.lines.length) {
      this.startClosing();
      return;
    }
    const line = script.lines[index];
    const speaker = this.troupe.get(line.who);
    if (!speaker) {
      this.startLine(index + 1);
      return;
    }
    this.lineIndex = index;
    this.lineSpeaker = speaker;
    this.lineLayout = layoutBubble(line.text, this.viewWidth);
    this.lineDuration = clamp(LINE_TIME.base + LINE_TIME.perChar * line.text.length, LINE_TIME.min, LINE_TIME.max);
    this.reactPending = line.react !== undefined;
    this.timer = 0;
    this.phase = 'line';
    if (this.turnsToFace) this.faceSpeaker(speaker, this.mainListener(script, index, speaker));
    if (line.emote) speaker.emote(line.emote);
  }

  /** The speaker turns to the main listener and everyone else turns to the speaker. */
  private faceSpeaker(speaker: Performer, listener: Performer): void {
    speaker.face(listener.x);
    for (const p of this.players) if (p !== speaker) p.face(speaker.x);
  }

  /** Whoever answers next; failing that, whoever spoke before; failing that, anyone else in the cast. */
  private mainListener(script: Script, index: number, speaker: Performer): Performer {
    for (let j = index + 1; j < script.lines.length; j++) {
      const p = this.troupe.get(script.lines[j].who);
      if (p && p !== speaker) return p;
    }
    for (let j = index - 1; j >= 0; j--) {
      const p = this.troupe.get(script.lines[j].who);
      if (p && p !== speaker) return p;
    }
    return this.players.find((p) => p !== speaker) ?? speaker;
  }

  private updateLine(step: number): void {
    const script = this.script;
    if (!script) return;
    this.timer += step;
    const reaction = script.lines[this.lineIndex].react;
    if (this.reactPending && reaction && this.timer >= REACT_DELAY) {
      this.reactPending = false;
      this.troupe.get(reaction.who)?.emote(reaction.emote);
    }
    if (this.timer < this.lineDuration) return;
    this.lineSpeaker = null;
    this.lineLayout = null;
    this.timer = 0;
    this.phase = 'silence';
  }

  /** Between lines. If the view stopped allowing conversations, the one in progress ends after its current line. */
  private updateSilence(step: number): void {
    this.timer += step;
    if (this.timer < LINE_SILENCE) return;
    if (this.enabled) this.startLine(this.lineIndex + 1);
    else this.startClosing();
  }

  private startClosing(): void {
    this.phase = 'closing';
    this.timer = 0;
  }

  private updateClosing(step: number): void {
    this.timer += step;
    if (this.timer >= CLOSING_WAIT) this.cancel();
  }
}
