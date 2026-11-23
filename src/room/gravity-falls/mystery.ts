import { readJson, writeJson } from '../../store';
import { clamp } from '../../world/math';
import { bubbleAlpha, layoutBubble, type BubbleLayout } from './bubble';
import {
  drawCard,
  drawDoor,
  drawNote,
  drawPage,
  drawPeek,
  drawSymbol,
  drawToast,
  layoutCard,
  type CardLayout,
  type DoorMode,
} from './mystery-art';
import {
  JOURNAL,
  MSG_DOOR_LOCKED,
  MSG_DOOR_OPENS,
  MSG_NOTE_TITLE,
  MSG_SCURRIED,
  NOTES,
  encode,
  msgPageTitle,
  msgSymbolFound,
} from './story';
import { PLACES, type Clue, type PlaceId } from './types';

/** What the viewer has found, saved between visits and shared by both views. */
const STORAGE_KEY = 'chillscreen.gravityfalls.found';
const DOOR_ID = 'hidden-door';
const SYMBOL_IDS: Readonly<Record<PlaceId, string>> = {
  shack: 'shack-symbol',
  woods: 'woods-symbol',
  town: 'town-symbol',
  lake: 'lake-symbol',
  hidden: 'hidden-symbol',
};

/** Hit boxes grow by this much so a click that just misses still counts. */
const HIT_PAD = 3;
/** A moment that happened "long ago" (before this session). */
const LONG_AGO = -1e9;

const PAGE_DROP_SECONDS = 1.6;
const PAGE_CARD_SECONDS = 9;
const NOTE_DECODE_SECONDS = 2.5;
const NOTE_HOLD_SECONDS = 7;
const TOAST_SECONDS = 3.5;
const DOOR_OPEN_SECONDS = 1.2;

/** A peek shows for 3.5 seconds every 25 to 45 seconds; each peek in a scene has its own beat so two never rise together. */
const PEEK_SHOW_SECONDS = 3.5;
const PEEK_PERIOD_MIN = 25;
const PEEK_PERIOD_STEP = 7;
const PEEK_PERIOD_SPREAD = 21;
const PEEK_FIRST_DELAY = 6;
const PEEK_STAGGER = 3;
const PEEK_EDGE_SECONDS = 0.45;
const PEEK_STARTLE_SECONDS = 0.25;
const PEEK_DUCK_SECONDS = 0.25;
/** The creature must be this far up to be clicked: a sliver of head is not a target. */
const PEEK_CLICKABLE_RISE = 0.35;
/** The eyes sit at the middle of the head, which is 6 rows tall; the clue's centre is the middle of the head. */
const PEEK_HEAD_HALF = 3;

/** The cards and toasts sit in the upper part of the view, clear of the clock: toast first, the card below it. */
const TOAST_TOP = 0.05;
const CARD_TOP = 0.12;
const OVERLAY_GAP = 3;
const VIEW_MARGIN = 3;

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every((id) => typeof id === 'string');

type PopupKind = 'none' | 'note' | 'page';

export class MysteryBoard {
  private readonly found: Set<string>;
  private symbolCount: number;
  private clues: readonly Clue[] = [];
  /** Per clue (same order as `clues`): when its symbol was found, when its page was let go, when it was clicked away from. */
  private pulseAt = new Float64Array(0);
  private dropAt = new Float64Array(0);
  private duckAt = new Float64Array(0);
  private duckCycle = new Int32Array(0);
  private time = 0;
  private doorOpenAt = LONG_AGO;

  /** The result of the last `evalPeek`, kept in fields so the per-frame path builds nothing. */
  private peekRise = 0;
  private peekStartled = false;
  private peekCycle = 0;

  private popupKind: PopupKind = 'none';
  private popupStart = 0;
  private popupDuration = 0;
  private popupTitle = '';
  private popupPlain = '';
  private popupCoded = '';
  private toastText = '';
  private toastStart = 0;
  /** Wrapped text for the current popup and toast, rebuilt when either changes or the view width does. */
  private layoutWidth = -1;
  private card: CardLayout | null = null;
  private codedCard: CardLayout | null = null;
  private toastLayout: BubbleLayout | null = null;

  constructor() {
    this.found = new Set(readJson<string[]>(STORAGE_KEY, [], isIdList));
    this.symbolCount = this.countSymbols();
  }

  /** The clues of the scene now on show. Clues found before (this visit or an earlier one) draw as found. */
  setClues(clues: readonly Clue[]): void {
    this.clues = clues;
    this.pulseAt = new Float64Array(clues.length).fill(LONG_AGO);
    this.dropAt = new Float64Array(clues.length).fill(LONG_AGO);
    this.duckAt = new Float64Array(clues.length).fill(LONG_AGO);
    this.duckCycle = new Int32Array(clues.length).fill(-1);
  }

  update(_dt: number, time: number): void {
    this.time = time;
    if (this.popupKind !== 'none' && time - this.popupStart >= this.popupDuration) this.popupKind = 'none';
    if (this.toastText !== '' && time - this.toastStart >= TOAST_SECONDS) this.toastText = '';
  }

  get doorOpen(): boolean {
    return this.found.has(DOOR_ID);
  }

  get symbolsFound(): number {
    return this.symbolCount;
  }

  /** Draws the clues of the scene, in the scene's own space shifted left by `cameraX`. `night` is 0 (day) to 1 (night). */
  drawClues(ctx: CanvasRenderingContext2D, cameraX: number, time: number, night: number): void {
    for (let i = 0; i < this.clues.length; i++) {
      const clue = this.clues[i];
      const x = clue.x - cameraX;
      switch (clue.kind) {
        case 'symbol':
          drawSymbol(ctx, clue.place, x, clue.y, this.found.has(clue.id), time - this.pulseAt[i], time, i, night);
          break;
        case 'note':
          drawNote(ctx, x, clue.y, this.found.has(clue.id), night);
          break;
        case 'page':
          if (this.found.has(SYMBOL_IDS[clue.place])) drawPage(ctx, x, clue.y, clamp((time - this.dropAt[i]) / PAGE_DROP_SECONDS, 0, 1), time, i, night);
          break;
        case 'peek':
          this.evalPeek(i, time);
          drawPeek(ctx, x, clue.y + PEEK_HEAD_HALF, this.peekRise, this.peekStartled, time);
          break;
        case 'door':
          this.drawDoorClue(ctx, clue, x, time, night);
          break;
      }
    }
  }

  /** Draws the toast and the card over everything. They sit in the upper part of the view, above the clock. */
  drawOverlay(ctx: CanvasRenderingContext2D, viewWidth: number, viewHeight: number): void {
    if (this.toastText === '' && this.popupKind === 'none') return;
    if (this.layoutWidth !== viewWidth) this.layOut(viewWidth);
    let cardTop = Math.round(viewHeight * CARD_TOP);
    if (this.toastText !== '' && this.toastLayout !== null) {
      const toast = this.toastLayout;
      const y = Math.round(viewHeight * TOAST_TOP);
      const age = this.time - this.toastStart;
      drawToast(ctx, toast, Math.max(VIEW_MARGIN, Math.round((viewWidth - toast.width) / 2)), y, bubbleAlpha(age, TOAST_SECONDS));
      cardTop = Math.max(cardTop, y + toast.height + OVERLAY_GAP);
    }
    if (this.popupKind !== 'none' && this.card !== null && this.codedCard !== null) {
      const age = this.time - this.popupStart;
      const decoded = this.popupKind === 'note' ? Math.floor(clamp(age / NOTE_DECODE_SECONDS, 0, 1) * this.card.chars) : this.card.chars;
      const x = Math.max(VIEW_MARGIN, Math.round((viewWidth - this.card.width) / 2));
      drawCard(ctx, this.card, this.codedCard.lines, decoded, x, cardTop, bubbleAlpha(age, this.popupDuration));
    }
  }

  /** Offers a click to the clues; true when one took it (so the view should not also act on it). */
  press(x: number, y: number, cameraX: number): boolean {
    for (let i = 0; i < this.clues.length; i++) {
      const clue = this.clues[i];
      if (Math.abs(x - (clue.x - cameraX)) > clue.w / 2 + HIT_PAD || Math.abs(y - clue.y) > clue.h / 2 + HIT_PAD) continue;
      if (this.activate(clue, i)) return true;
    }
    return false;
  }

  private countSymbols(): number {
    let count = 0;
    for (const place of PLACES) if (this.found.has(SYMBOL_IDS[place])) count++;
    return count;
  }

  private save(): void {
    writeJson(STORAGE_KEY, [...this.found]);
  }

  /** What happens when a clue is clicked; false when it is not clickable right now. */
  private activate(clue: Clue, index: number): boolean {
    switch (clue.kind) {
      case 'symbol':
        if (this.found.has(clue.id)) return false;
        this.findSymbol(clue, index);
        return true;
      case 'note':
        this.openNote(clue);
        return true;
      case 'page':
        if (!this.found.has(SYMBOL_IDS[clue.place]) || this.time - this.dropAt[index] < PAGE_DROP_SECONDS) return false;
        this.openPage(clue);
        return true;
      case 'peek':
        return this.scareOff(index);
      case 'door':
        return this.pushDoor();
    }
  }

  private findSymbol(clue: Clue, index: number): void {
    this.found.add(clue.id);
    this.symbolCount++;
    this.pulseAt[index] = this.time;
    this.save();
    this.showToast(msgSymbolFound(this.symbolCount));
    for (let i = 0; i < this.clues.length; i++) {
      const other = this.clues[i];
      if (other.kind === 'page' && other.place === clue.place && !this.found.has(other.id)) this.dropAt[i] = this.time;
    }
  }

  private openNote(clue: Clue): void {
    if (!this.found.has(clue.id)) {
      this.found.add(clue.id);
      this.save();
    }
    const plain = NOTES[clue.place];
    this.showPopup('note', MSG_NOTE_TITLE, plain, encode(plain), NOTE_DECODE_SECONDS + NOTE_HOLD_SECONDS);
  }

  private openPage(clue: Clue): void {
    if (!this.found.has(clue.id)) {
      this.found.add(clue.id);
      this.save();
    }
    const text = JOURNAL[clue.place];
    this.showPopup('page', msgPageTitle(clue.place), text, text, PAGE_CARD_SECONDS);
  }

  private scareOff(index: number): boolean {
    this.evalPeek(index, this.time);
    if (this.peekRise < PEEK_CLICKABLE_RISE) return false;
    this.duckAt[index] = this.time;
    this.duckCycle[index] = this.peekCycle;
    this.showToast(MSG_SCURRIED);
    return true;
  }

  private pushDoor(): boolean {
    if (this.found.has(DOOR_ID)) return false;
    if (this.symbolCount < PLACES.length) {
      this.showToast(MSG_DOOR_LOCKED);
      return true;
    }
    this.found.add(DOOR_ID);
    this.doorOpenAt = this.time;
    this.save();
    this.showToast(MSG_DOOR_OPENS);
    return true;
  }

  private showToast(text: string): void {
    this.toastText = text;
    this.toastStart = this.time;
    this.layoutWidth = -1;
  }

  private showPopup(kind: PopupKind, title: string, plain: string, coded: string, seconds: number): void {
    this.popupKind = kind;
    this.popupStart = this.time;
    this.popupDuration = seconds;
    this.popupTitle = title;
    this.popupPlain = plain;
    this.popupCoded = coded;
    this.layoutWidth = -1;
  }

  /** Wraps the current toast and popup for a view this wide. Runs when one of them starts or the view is resized, never per frame. */
  private layOut(viewWidth: number): void {
    this.layoutWidth = viewWidth;
    this.toastLayout = this.toastText === '' ? null : layoutBubble(this.toastText, viewWidth);
    this.card = this.popupKind === 'none' ? null : layoutCard(this.popupTitle, this.popupPlain, viewWidth);
    this.codedCard = this.popupKind === 'none' ? null : layoutCard(this.popupTitle, this.popupCoded, viewWidth);
  }

  /**
   * Works out how far up clue `index`'s creature is at `time` into `peekRise`, whether it is startled into `peekStartled`
   * and which showing it is into `peekCycle`. Pure arithmetic on the clock, so a peek needs no stored schedule.
   */
  private evalPeek(index: number, time: number): void {
    this.peekRise = 0;
    this.peekStartled = false;
    const period = PEEK_PERIOD_MIN + ((index * PEEK_PERIOD_STEP) % PEEK_PERIOD_SPREAD);
    const t = time - PEEK_FIRST_DELAY - index * PEEK_STAGGER;
    const cycle = Math.floor(t / period);
    this.peekCycle = cycle;
    const into = t - cycle * period;
    if (cycle < 0 || into >= PEEK_SHOW_SECONDS) return;
    let rise = clamp(Math.min(into / PEEK_EDGE_SECONDS, (PEEK_SHOW_SECONDS - into) / PEEK_EDGE_SECONDS), 0, 1);
    if (this.duckCycle[index] === cycle) {
      const since = time - this.duckAt[index];
      if (since < PEEK_STARTLE_SECONDS) {
        rise = 1;
        this.peekStartled = true;
      } else {
        rise = Math.min(rise, clamp(1 - (since - PEEK_STARTLE_SECONDS) / PEEK_DUCK_SECONDS, 0, 1));
      }
    }
    this.peekRise = rise;
  }

  private drawDoorClue(ctx: CanvasRenderingContext2D, clue: Clue, x: number, time: number, night: number): void {
    const open = this.found.has(DOOR_ID);
    const mode: DoorMode = open ? 'open' : this.symbolCount >= PLACES.length ? 'armed' : 'locked';
    const swing = open ? clamp((time - this.doorOpenAt) / DOOR_OPEN_SECONDS, 0, 1) : 0;
    drawDoor(ctx, x, clue.y, Math.floor(Math.min(clue.w, clue.h) / 2), mode, swing, time, night);
  }
}
