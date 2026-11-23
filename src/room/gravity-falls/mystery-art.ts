import { clamp } from '../../world/math';
import { drawText, textWidth } from '../../render/pixel-font';
import { breeze } from '../wind';
import {
  PAD_X,
  PAD_Y,
  TEXT_BASELINE_SHARE,
  TEXT_LINE_HEIGHT,
  TEXT_SIZE,
  overlayFonts,
  wrapText,
  type BubbleLayout,
} from './bubble';
import { encode } from './story';
import type { PlaceId } from './types';

/**
 * The pictures of the mystery: carved symbols, folded notes, journal pages, peeking eyes and the round hidden door
 * (all pixel art in the stage picture), and the paper card and toast that show text (drawn on the screen itself in the
 * app's normal font). Pure drawing from the values it is given: no state, no timers.
 */

const GOLD = '#ffd75e';
const WHITE = '#ffffff';

/** Every symbol is a 7 by 7 glyph; `#` is a lit pixel. */
const GLYPH_SIZE = 7;
const GLYPH_CENTRE = 3;
const SYMBOL_GLYPHS: Readonly<Record<PlaceId, readonly string[]>> = {
  shack: ['...#...', '..#.#..', '..#.#..', '.#...#.', '.#.#.#.', '#.....#', '#######'],
  woods: ['...#...', '..###..', '.#####.', '..###..', '.#####.', '...#...', '...#...'],
  town: ['.....#.', '....###', '.....#.', '...#...', '..#....', '.#.....', '#......'],
  lake: ['..###..', '.#...#.', '.....#.', '...##..', '...#...', '.......', '...#...'],
  hidden: ['#.#.#..', '######.', '######.', '#######', '.#####.', '..###..', '..###..'],
};

/** Unfound symbols are faint carvings: dark ink at about half strength, with a light rim a pixel lower so they read as cut into the surface. */
const CARVING_INK = '#1a1410';
const CARVING_ALPHA = 0.55;
const CARVING_RIM = '#e9dcb4';
const CARVING_RIM_ALPHA = 0.14;
/** At night the rim is a little stronger, so the carving does not vanish into dark bark. */
const CARVING_RIM_NIGHT_ALPHA = 0.12;

/** A 2-pixel white sparkle on an unfound symbol every 9 to 14 seconds, a different one for each symbol. */
const GLINT_PERIOD_MIN = 9;
const GLINT_PERIOD_STEP = 7;
const GLINT_PERIOD_SPREAD = 6;
const GLINT_OFFSET_STEP = 4.1;
const GLINT_SECONDS = 0.45;
const GLINT_SPOT_X = 5;
const GLINT_SPOT_Y = 3;

/** A found symbol is gold with a slow pulse, a dithered gold halo and, just after the click, an expanding ring. */
const FOUND_SHADOW_ALPHA = 0.5;
const PULSE_SPEED = 2.2;
const HALO_REACH = 7;
const HALO_ALPHA = 0.16;
const HALO_NIGHT_ALPHA = 0.14;
const RING_SECONDS = 0.9;
const RING_START = 4;
const RING_GROWTH = 7;

/** Paper colours shared by notes and pages. The outline is dark brown by day and a lifted warm brown at night. */
const PAPER = '#f0e4c2';
const PAPER_FOUND = '#cdbf99';
const PAPER_LINE = '#8a7a58';
const PAPER_CREASE = '#c9b88e';
const PAPER_FLAP = '#c4a870';
const OUTLINE_DAY = '#3b2a1c';
const OUTLINE_NIGHT = '#8a7452';
const PIN_RED = '#d8342a';
const PIN_SHINE = '#ff9a8a';

/** A note is a folded paper 6 by 7 pixels, pinned with a red dot. */
const NOTE_WIDTH = 6;
const NOTE_HEIGHT = 7;
const NOTE_REACH_LEFT = 3;
const NOTE_REACH_UP = 3;

/** A journal page is 7 by 9 pixels with its lower corner curled; its top edge flutters in the wind. */
const PAGE_WIDTH = 7;
const PAGE_HEIGHT = 9;
const PAGE_REACH_LEFT = 3;
const PAGE_REACH_UP = 4;
const PAGE_FLUTTER = 1.4;
const PAGE_DROP_HEIGHT = 40;
const PAGE_DROP_SWAY = 6;
const PAGE_DROP_SWAYS = 3;
const PAGE_FADE_IN = 5;

/** The peeking creature: a rounded dark head with two glowing eyes, rising from behind a tree edge. `E` marks an eye. */
const HEAD_ROWS: readonly string[] = ['.#####.', '#######', '#E###E#', '#E###E#', '#######', '.#####.'];
const HEAD_COLOR = '#0d1017';
const HEAD_RIM = '#232a3e';
const EYE_COLOR = '#ffe070';
const BLINK_PERIOD = 3.1;
const BLINK_SECONDS = 0.14;
/** The row of the head whose eyes close first when it blinks. */
const EYE_TOP_ROW = 2;

/** The hidden door: a ring of stone around a round wooden door. */
const STONE_DARK = '#3d4150';
const STONE = '#6b7080';
const STONE_LIGHT = '#9097a8';
const WOOD = '#3a2517';
const WOOD_DARK = '#22160d';
const LOCK_DULL = '#8a6a2a';
const LIGHT_OUTER = '#ffe9a0';
const LIGHT_CORE = '#fff7d6';
const RING_THICKNESS = 3;
const RUNE_COUNT = 8;
const GROOVE_FRACTION = 0.5;
const LIGHT_CORE_FRACTION = 0.6;
/** A fully open door leaves this share of its width as the leaf still seen on the left edge. */
const OPEN_LEAF_REMAINS = 0.25;
const SPILL_LENGTH = 1.4;
const SPILL_ALPHA = 0.35;
const SPILL_FLICKER = 0.08;
const SPILL_SPEED = 1.1;
const HALO_DOOR_ALPHA = 0.1;
const DOOR_HALO_OUTER = 4;
const DOOR_HALO_INNER = 2;
const ARMED_PULSE_SPEED = 2;
const ARMED_ALPHA = 0.55;
const DOOR_GLOW_DAY = 0.8;
const DOOR_GLOW_NIGHT = 0.2;

export type DoorMode = 'locked' | 'armed' | 'open';

/** The paper card: a title, a thin rule and the text below it. */
const CARD_PAPER = '#fbf1d4';
const CARD_OUTLINE = '#3b2a1c';
const CARD_SHADOW = 'rgba(20, 24, 44, 0.3)';
const CARD_TITLE = '#8f5513';
const CARD_RULE = '#c9b88e';
const CARD_INK = '#1c2036';
const CARD_CODED_INK = '#8a6a2a';
const CARD_RADIUS = 1.8;
const CARD_OUTLINE_WIDTH = 0.7;
const CARD_RULE_WIDTH = 0.4;
const CARD_SHADOW_DROP = 1;
const CARD_PAD_X = 4;
const CARD_PAD_TOP = 3;
const CARD_PAD_BOTTOM = 3;
/** Where the rule and the first line of text sit below the top of the card. */
const CARD_RULE_Y = 9.6;
const CARD_BODY_TOP = 11.8;
/** The widest a card may be: a note or short page, and a long journal page (which then needs no more than a few lines). */
const CARD_WIDTH = 112;
const CARD_WIDE_WIDTH = 150;
const CARD_WIDE_AFTER_LINES = 3;
/** Cards never come closer than this to the side of the stage. */
const CARD_STAGE_MARGIN = 3;
/** The pixel font (used for the cipher) is 5 rows tall, 3 wide and steps 4 pixels per letter. */
const PIXEL_GLYPH_HEIGHT = 5;

const TOAST_FILL = '#1c2036';
const TOAST_OUTLINE = '#5a4a22';
const TOAST_RADIUS = 2.4;
const TOAST_OUTLINE_WIDTH = 0.7;

/** Fills a box in a day colour and, as the night grows, a night colour over it, without building any colour text per frame. */
function fillMix(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dayColor: string,
  nightColor: string,
  night: number,
): void {
  ctx.fillStyle = dayColor;
  ctx.fillRect(x, y, w, h);
  if (night < 0.02) return;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * night;
  ctx.fillStyle = nightColor;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = previous;
}

/** A filled pixel disc (no smoothing) centred on a pixel. */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string): void {
  ctx.fillStyle = color;
  for (let dy = -radius; dy <= radius; dy++) {
    const half = Math.floor(Math.sqrt(radius * radius + radius - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

function drawGlyph(ctx: CanvasRenderingContext2D, rows: readonly string[], left: number, top: number, color: string): void {
  ctx.fillStyle = color;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(left + c, top + r, 1, 1);
  }
}

/** The rare sparkle: two white pixels that flash for a moment somewhere over the area, a new spot each time. */
function drawGlint(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, time: number, index: number): void {
  const period = GLINT_PERIOD_MIN + ((index * GLINT_PERIOD_STEP) % GLINT_PERIOD_SPREAD);
  const t = time + index * GLINT_OFFSET_STEP;
  const cycle = Math.floor(t / period);
  const into = t - cycle * period;
  if (into >= GLINT_SECONDS) return;
  const previous = ctx.globalAlpha;
  ctx.globalAlpha = previous * Math.sin((Math.PI * into) / GLINT_SECONDS);
  ctx.fillStyle = WHITE;
  ctx.fillRect(left + ((cycle * GLINT_SPOT_X) % (width - 1)), top + ((cycle * GLINT_SPOT_Y + index) % height), 2, 1);
  ctx.globalAlpha = previous;
}

function drawCarving(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  left: number,
  top: number,
  time: number,
  index: number,
  night: number,
): void {
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * (CARVING_RIM_ALPHA + CARVING_RIM_NIGHT_ALPHA * night);
  drawGlyph(ctx, rows, left + 1, top + 1, CARVING_RIM);
  ctx.globalAlpha = base * CARVING_ALPHA;
  drawGlyph(ctx, rows, left, top, CARVING_INK);
  ctx.globalAlpha = base;
  drawGlint(ctx, left, top, GLYPH_SIZE, GLYPH_SIZE, time, index);
}

function drawFoundSymbol(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  left: number,
  top: number,
  foundAge: number,
  time: number,
  night: number,
): void {
  const base = ctx.globalAlpha;
  const pulse = 0.5 + 0.5 * Math.sin(time * PULSE_SPEED);
  const glow = HALO_ALPHA + HALO_NIGHT_ALPHA * night;
  ctx.globalAlpha = base * glow * (0.7 + 0.3 * pulse);
  ctx.fillStyle = GOLD;
  for (let dy = -HALO_REACH; dy <= HALO_REACH; dy++) {
    for (let dx = -HALO_REACH; dx <= HALO_REACH; dx++) {
      if (((dx + dy) & 1) !== 0 || Math.abs(dx) + Math.abs(dy) > HALO_REACH) continue;
      ctx.fillRect(left + GLYPH_CENTRE + dx, top + GLYPH_CENTRE + dy, 1, 1);
    }
  }
  ctx.globalAlpha = base * FOUND_SHADOW_ALPHA;
  drawGlyph(ctx, rows, left + 1, top + 1, CARVING_INK);
  ctx.globalAlpha = base * (0.82 + 0.18 * pulse);
  drawGlyph(ctx, rows, left, top, GOLD);
  if (foundAge >= 0 && foundAge < RING_SECONDS) {
    const k = foundAge / RING_SECONDS;
    const half = Math.round(RING_START + RING_GROWTH * k);
    const cx = left + GLYPH_CENTRE;
    const cy = top + GLYPH_CENTRE;
    ctx.globalAlpha = base * (1 - k) * (0.7 + 0.3 * night);
    ctx.fillStyle = GOLD;
    ctx.fillRect(cx - half, cy - half, half * 2 + 1, 1);
    ctx.fillRect(cx - half, cy + half, half * 2 + 1, 1);
    ctx.fillRect(cx - half, cy - half + 1, 1, half * 2 - 1);
    ctx.fillRect(cx + half, cy - half + 1, 1, half * 2 - 1);
  }
  ctx.globalAlpha = base;
}

/**
 * One symbol, centred on (cx, cy). `foundAge` is the seconds since it was found in this session (any large number when it was
 * found long ago); `index` makes each symbol's sparkle and pulse run on its own beat.
 */
export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  place: PlaceId,
  cx: number,
  cy: number,
  found: boolean,
  foundAge: number,
  time: number,
  index: number,
  night: number,
): void {
  const left = Math.round(cx) - GLYPH_CENTRE;
  const top = Math.round(cy) - GLYPH_CENTRE;
  if (found) drawFoundSymbol(ctx, SYMBOL_GLYPHS[place], left, top, foundAge, time, night);
  else drawCarving(ctx, SYMBOL_GLYPHS[place], left, top, time, index, night);
}

/** A folded note pinned with a red dot; once read the paper is duller and the pin turns gold. */
export function drawNote(ctx: CanvasRenderingContext2D, cx: number, cy: number, found: boolean, night: number): void {
  const left = Math.round(cx) - NOTE_REACH_LEFT;
  const top = Math.round(cy) - NOTE_REACH_UP;
  fillMix(ctx, left - 1, top - 1, NOTE_WIDTH + 2, NOTE_HEIGHT + 2, OUTLINE_DAY, OUTLINE_NIGHT, night);
  ctx.fillStyle = found ? PAPER_FOUND : PAPER;
  ctx.fillRect(left, top, NOTE_WIDTH, NOTE_HEIGHT);
  ctx.fillStyle = PAPER_FLAP;
  ctx.fillRect(left + NOTE_WIDTH - 2, top, 2, 1);
  ctx.fillRect(left + NOTE_WIDTH - 1, top + 1, 1, 1);
  ctx.fillStyle = PAPER_CREASE;
  ctx.fillRect(left, top + 3, NOTE_WIDTH, 1);
  ctx.fillStyle = PAPER_LINE;
  ctx.fillRect(left + 1, top + 5, 4, 1);
  ctx.fillStyle = found ? GOLD : PIN_RED;
  ctx.fillRect(left + 2, top, 2, 2);
  ctx.fillStyle = found ? WHITE : PIN_SHINE;
  ctx.fillRect(left + 2, top, 1, 1);
}

/**
 * A journal page. `drop` runs from 0 (just let go, high above) to 1 (settled): it drifts down on the wind in a few
 * lazy sways. Settled, its top edge flutters with the breeze and it glints now and then.
 */
export function drawPage(ctx: CanvasRenderingContext2D, cx: number, cy: number, drop: number, time: number, index: number, night: number): void {
  const eased = 1 - (1 - drop) * (1 - drop);
  const sway = Math.round(Math.sin(drop * Math.PI * PAGE_DROP_SWAYS) * (1 - eased) * PAGE_DROP_SWAY + breeze(time, cx) * PAGE_FLUTTER);
  const left = Math.round(cx) - PAGE_REACH_LEFT;
  const top = Math.round(cy) - PAGE_REACH_UP - Math.round((1 - eased) * PAGE_DROP_HEIGHT);
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * Math.min(1, drop * PAGE_FADE_IN);
  for (let r = 0; r < PAGE_HEIGHT; r++) {
    const shear = Math.round(sway * (1 - r / (PAGE_HEIGHT - 1)));
    const curled = r >= PAGE_HEIGHT - 2 ? (r - (PAGE_HEIGHT - 3)) * 2 - 1 : 0;
    const width = PAGE_WIDTH - curled;
    const x = left + shear;
    const y = top + r;
    if (r === 0 || r === PAGE_HEIGHT - 1) {
      fillMix(ctx, x, y, width, 1, OUTLINE_DAY, OUTLINE_NIGHT, night);
    } else {
      fillMix(ctx, x, y, 1, 1, OUTLINE_DAY, OUTLINE_NIGHT, night);
      fillMix(ctx, x + width - 1, y, 1, 1, OUTLINE_DAY, OUTLINE_NIGHT, night);
      ctx.fillStyle = PAPER;
      ctx.fillRect(x + 1, y, width - 2, 1);
      if (r % 2 === 0 && r < PAGE_HEIGHT - 2) {
        ctx.fillStyle = PAPER_LINE;
        ctx.fillRect(x + 2, y, PAGE_WIDTH - 5, 1);
      }
    }
    if (curled > 0) {
      ctx.fillStyle = PAPER_FLAP;
      ctx.fillRect(x + width, y, 1, 1);
    }
  }
  drawGlint(ctx, left, top, PAGE_WIDTH, PAGE_HEIGHT, time, index);
  ctx.globalAlpha = base;
}

/**
 * The peeking creature: its head rises from `baseY` (the tree edge it hides behind). `rise` is 0 (hidden) to 1 (fully up);
 * `startled` opens the eyes wide and white. It blinks now and then.
 */
export function drawPeek(ctx: CanvasRenderingContext2D, cx: number, baseY: number, rise: number, startled: boolean, time: number): void {
  const visible = Math.round(rise * HEAD_ROWS.length);
  if (visible <= 0) return;
  const left = Math.round(cx) - GLYPH_CENTRE;
  const top = Math.round(baseY) - visible;
  const blink = time % BLINK_PERIOD < BLINK_SECONDS;
  for (let r = 0; r < visible; r++) {
    const row = HEAD_ROWS[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      if (ch === 'E') ctx.fillStyle = startled ? WHITE : blink && r === EYE_TOP_ROW ? HEAD_COLOR : EYE_COLOR;
      else ctx.fillStyle = c === row.length - 1 ? HEAD_RIM : HEAD_COLOR;
      ctx.fillRect(left + c, top + r, 1, 1);
    }
  }
}

/** The warm light spilling out of an open door, widening and fading as it falls, laid down in dithered rows. */
function drawSpill(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, inner: number, openProgress: number, time: number, glow: number): void {
  const length = Math.round(radius * SPILL_LENGTH);
  const flicker = 1 + SPILL_FLICKER * Math.sin(time * SPILL_SPEED);
  const base = ctx.globalAlpha;
  ctx.fillStyle = GOLD;
  for (let k = 0; k < length; k += 2) {
    const width = inner * 2 + 1 + k;
    ctx.globalAlpha = base * SPILL_ALPHA * glow * flicker * openProgress * (1 - k / length);
    ctx.fillRect(x - Math.floor(width / 2), y + radius + k, width, 1);
  }
  ctx.globalAlpha = base * HALO_DOOR_ALPHA * glow * openProgress;
  disc(ctx, x, y, radius + DOOR_HALO_OUTER, GOLD);
  disc(ctx, x, y, radius + DOOR_HALO_INNER, GOLD);
  ctx.globalAlpha = base;
}

/** Small darker marks set into the stone ring, evenly round it. */
function drawRunes(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const mid = radius - 1.5;
  for (let k = 0; k < RUNE_COUNT; k++) {
    const angle = (k * 2 * Math.PI) / RUNE_COUNT;
    ctx.fillStyle = k % 2 === 0 ? STONE_DARK : STONE_LIGHT;
    ctx.fillRect(x + Math.round(Math.cos(angle) * mid), y + Math.round(Math.sin(angle) * mid), 1, 1);
  }
}

function drawClosedDoor(ctx: CanvasRenderingContext2D, x: number, y: number, inner: number, armed: boolean, time: number): void {
  disc(ctx, x, y, inner, WOOD);
  const groove = Math.round(inner * GROOVE_FRACTION);
  ctx.fillStyle = WOOD_DARK;
  for (let dy = -inner; dy <= inner; dy++) {
    const half = Math.floor(Math.sqrt(inner * inner + inner - dy * dy));
    if (groove < half) {
      ctx.fillRect(x - groove, y + dy, 1, 1);
      ctx.fillRect(x + groove, y + dy, 1, 1);
    }
  }
  ctx.fillStyle = armed ? GOLD : LOCK_DULL;
  const base = ctx.globalAlpha;
  if (armed) ctx.globalAlpha = base * (0.7 + 0.3 * Math.sin(time * ARMED_PULSE_SPEED));
  ctx.fillRect(x - 1, y, 2, 2);
  ctx.globalAlpha = base;
}

function drawOpenDoor(ctx: CanvasRenderingContext2D, x: number, y: number, inner: number, openProgress: number): void {
  disc(ctx, x, y, inner, LIGHT_OUTER);
  disc(ctx, x, y, Math.max(1, Math.round(inner * LIGHT_CORE_FRACTION)), LIGHT_CORE);
  const leaf = Math.round((inner * 2 + 1) * (1 - (1 - OPEN_LEAF_REMAINS) * openProgress));
  ctx.fillStyle = WOOD;
  for (let dy = -inner; dy <= inner; dy++) {
    const half = Math.floor(Math.sqrt(inner * inner + inner - dy * dy));
    const width = clamp(leaf - (inner - half), 0, half * 2 + 1);
    if (width > 0) ctx.fillRect(x - half, y + dy, width, 1);
  }
}

/**
 * The round hidden door, centred on (cx, cy). Locked it is dark wood in a stone ring; armed (all symbols found) the lock
 * and a rim glow gold; open (`openProgress` 0 to 1 is the swing) light spills out of it.
 */
export function drawDoor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  mode: DoorMode,
  openProgress: number,
  time: number,
  night: number,
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const inner = radius - RING_THICKNESS;
  const glow = DOOR_GLOW_DAY + DOOR_GLOW_NIGHT * night;
  const base = ctx.globalAlpha;
  if (mode === 'open') drawSpill(ctx, x, y, radius, inner, openProgress, time, glow);
  if (mode === 'armed') {
    ctx.globalAlpha = base * ARMED_ALPHA * glow * (0.6 + 0.4 * Math.sin(time * ARMED_PULSE_SPEED));
    disc(ctx, x, y, radius + 1, GOLD);
    ctx.globalAlpha = base;
  }
  disc(ctx, x, y, radius, STONE_DARK);
  disc(ctx, x, y, radius - 1, STONE);
  drawRunes(ctx, x, y, radius);
  disc(ctx, x, y, inner + 1, STONE_DARK);
  if (mode === 'open') drawOpenDoor(ctx, x, y, inner, openProgress);
  else drawClosedDoor(ctx, x, y, inner, mode === 'armed', time);
}

/** A card of text under a title: the wrapped lines, the letters in them and the card's outer size, worked out once. */
export interface CardLayout {
  readonly title: string;
  readonly lines: readonly string[];
  /** What each line looks like in code (the same lines again for a page that is not coded). */
  readonly coded: readonly string[];
  /** Letters in all lines together. */
  readonly chars: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Wraps `text` under `title` for a stage `stageWidth` wide. A long text gets the wider card. With `ciphered` the
 * coded form of every line is worked out too, so a note can decode letter by letter without re-wrapping.
 */
export function layoutCard(ctx: CanvasRenderingContext2D, title: string, text: string, ciphered: boolean, stageWidth: number): CardLayout {
  const fonts = overlayFonts();
  ctx.save();
  ctx.font = fonts.text;
  const inner = (outer: number): number => Math.min(outer, stageWidth - 2 * CARD_STAGE_MARGIN) - 2 * CARD_PAD_X;
  let lines = wrapText(ctx, text, inner(CARD_WIDTH));
  if (lines.length > CARD_WIDE_AFTER_LINES) lines = wrapText(ctx, text, inner(CARD_WIDE_WIDTH));
  const coded = ciphered ? lines.map(encode) : lines;
  let widest = 0;
  let chars = 0;
  for (let i = 0; i < lines.length; i++) {
    widest = Math.max(widest, ctx.measureText(lines[i]).width, ciphered ? textWidth(coded[i]) : 0);
    chars += lines[i].length;
  }
  ctx.font = fonts.title;
  widest = Math.max(widest, ctx.measureText(title).width);
  ctx.restore();
  return {
    title,
    lines,
    coded,
    chars,
    width: widest + 2 * CARD_PAD_X,
    height: CARD_BODY_TOP + (lines.length - 1) * TEXT_LINE_HEIGHT + TEXT_SIZE + CARD_PAD_BOTTOM,
  };
}

function cardPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, CARD_RADIUS);
}

/**
 * Draws a card with its top-left at (x, y) in stage pixels. The first `decoded` letters show as plain text in the normal
 * font and the rest as the card's coded letters in the pixel font, so a note turns from cipher into words; a card that is
 * not coded passes `decoded === card.chars`.
 */
export function drawCard(ctx: CanvasRenderingContext2D, card: CardLayout, decoded: number, x: number, y: number, alpha: number): void {
  const { width, height, lines, coded } = card;
  const fonts = overlayFonts();
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = CARD_SHADOW;
  cardPath(ctx, x, y + CARD_SHADOW_DROP, width, height);
  ctx.fill();
  ctx.fillStyle = CARD_PAPER;
  ctx.strokeStyle = CARD_OUTLINE;
  ctx.lineWidth = CARD_OUTLINE_WIDTH;
  cardPath(ctx, x, y, width, height);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = fonts.title;
  ctx.fillStyle = CARD_TITLE;
  ctx.fillText(card.title, x + CARD_PAD_X, y + CARD_PAD_TOP + TEXT_SIZE * TEXT_BASELINE_SHARE);
  ctx.strokeStyle = CARD_RULE;
  ctx.lineWidth = CARD_RULE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(x + CARD_PAD_X, y + CARD_RULE_Y);
  ctx.lineTo(x + width - CARD_PAD_X, y + CARD_RULE_Y);
  ctx.stroke();
  ctx.font = fonts.text;
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineX = x + CARD_PAD_X;
    const baseline = y + CARD_BODY_TOP + TEXT_SIZE * TEXT_BASELINE_SHARE + i * TEXT_LINE_HEIGHT;
    const done = decoded - seen;
    seen += line.length;
    if (done >= line.length) {
      ctx.fillStyle = CARD_INK;
      ctx.fillText(line, lineX, baseline);
      continue;
    }
    let codedX = lineX;
    if (done > 0) {
      const plain = line.slice(0, done);
      ctx.fillStyle = CARD_INK;
      ctx.fillText(plain, lineX, baseline);
      codedX += ctx.measureText(plain).width;
    }
    drawText(ctx, done > 0 ? coded[i].slice(done) : coded[i], Math.round(codedX), Math.round(baseline - PIXEL_GLYPH_HEIGHT), CARD_CODED_INK);
  }
  ctx.restore();
}

/** A small dark box of gold text for short messages, with its top-left at (x, y) in stage pixels. */
export function drawToast(ctx: CanvasRenderingContext2D, layout: BubbleLayout, x: number, y: number, alpha: number): void {
  const { width, height, lines } = layout;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = TOAST_FILL;
  ctx.strokeStyle = TOAST_OUTLINE;
  ctx.lineWidth = TOAST_OUTLINE_WIDTH;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, TOAST_RADIUS);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = overlayFonts().text;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x + PAD_X, y + PAD_Y + TEXT_SIZE * TEXT_BASELINE_SHARE + i * TEXT_LINE_HEIGHT);
  ctx.restore();
}
