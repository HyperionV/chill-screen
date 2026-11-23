/**
 * The old stonework of the Hidden Hollow: the three standing stones with their carved runes, the stone ring and steps
 * around the round door, the worn flagstones and the faint circle in the lawn. The stones are painted once; only the
 * runes come alive (`drawRunes`): they glint now and then, and shine gold once the door is open.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, disc, drawHalo, ellipse, rect, type Ctx } from '../../gravity-falls/art-kit';
import { hash } from '../../journeys/noise';
import { DOOR_RADIUS, GOLD, GROUND, MOSS, STONE, TEAL, type HiddenLayout, type StoneSpec } from './hidden-layout';

/** Rune shapes, 3 x 5 pixels: six different glyphs so no two neighbours look alike. */
const GLYPHS: readonly (readonly string[])[] = [
  ['#.#', '#.#', '###', '.#.', '.#.'],
  ['###', '..#', '.#.', '#..', '###'],
  ['.#.', '#.#', '#.#', '#.#', '.#.'],
  ['###', '#.#', '###', '#..', '#..'],
  ['#.#', '.#.', '###', '.#.', '#.#'],
  ['..#', '.##', '#.#', '.##', '..#'],
];
const GLYPH_W = 3;
const GLYPH_H = 5;
/** First rune sits this many rows under the top of its stone, the next ones this many rows apart. */
const RUNE_TOP = 8;
const RUNE_STEP = 7;

const STONE_SHADE = '#6f6a9c';
const CARVED = '#38335f';
const RECESS = '#2a2142';
/** The top rows of a stone are trimmed to a rounded head. */
const ROUND_ROWS = 3;
const CHIP_CHANCE = 0.22;
const SHADE_COLUMNS = 3;
const SHADE_PER_COLUMN = 0.3;
const MOSS_ROWS = 10;
const MOSS_AMOUNT = 0.8;
const FOOT_SHADOW = 0.35;
const RING_STONES = 18;
/** Stones in the ring around the door sit this far out of the door's edge. */
const RING_OFFSET = 2.5;
const RING_SPIN = 0.2;
const FLAG_STEP = 12;
const FLAG_ROW = 232;
const CIRCLE_ROW = 229;
const CIRCLE_RX = 27;
const CIRCLE_RX_SHARE = 0.17;
const CIRCLE_RY = 5;
const CIRCLE_POINTS = 96;
const CIRCLE_SHARE = 0.83;
/** The flagstone path stops this share of the width across, before the stones. */
const FLAG_REACH_SHARE = 0.68;

/** Runes in the quiet state: always faintly there, a little stronger at night, with a bright glint now and then. */
const QUIET_BASE = 0.3;
const QUIET_NIGHT = 0.3;
const GLINT_SPEED = 0.35;
const GLINT_SHARPNESS = 12;
const GLINT_PEAK = 0.6;
/** Runes with the door open pulse slowly (never faster than once a second) between these two brightnesses. */
const OPEN_LOW = 0.85;
const OPEN_PULSE = 0.15;
const OPEN_SPEED = 1.1;
const RUNE_HALO_RADIUS = 7;
const RUNE_HALO_STRENGTH = 0.45;
const HALO_MIN_OPEN = 0.2;

export interface Rune {
  x: number;
  y: number;
  glyph: number;
  /** 0..1, spreads the glints and pulses so the runes do not flash together. */
  seed: number;
}

export interface RuneSheets {
  teal: HTMLCanvasElement;
  gold: HTMLCanvasElement;
}

function paintGlyph(ctx: Ctx, glyph: number, x: number, y: number, color: string): void {
  const rows = GLYPHS[glyph];
  ctx.fillStyle = color;
  for (let r = 0; r < GLYPH_H; r++) {
    for (let c = 0; c < GLYPH_W; c++) if (rows[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1);
  }
}

function runeSheet(color: string): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(GLYPHS.length * GLYPH_W, GLYPH_H);
  for (let g = 0; g < GLYPHS.length; g++) paintGlyph(ctx, g, g * GLYPH_W, 0, color);
  return canvas;
}

/** The glowing rune pictures in the quiet teal and in gold, built once. */
export function buildRuneSheets(): RuneSheets {
  return { teal: runeSheet(TEAL), gold: runeSheet(GOLD) };
}

/** Where every rune is carved: down the middle of each standing stone. */
export function runeSlots(layout: HiddenLayout): Rune[] {
  return layout.stones.flatMap((stone) =>
    Array.from({ length: stone.runes }, (_, k) => ({
      x: stone.x - 1,
      y: stone.base - stone.h + RUNE_TOP + k * RUNE_STEP,
      glyph: (stone.seed * 2 + k * 3) % GLYPHS.length,
      seed: hash(stone.seed * 7.3 + k),
    })),
  );
}

/** One standing stone: a dark outline, a lit left edge, a dithered shaded right side, moss at the foot and a crack. */
function stoneSprite(spec: StoneSpec): HTMLCanvasElement {
  const { w, h, seed } = spec;
  const { canvas, ctx } = memoryCanvas(w, h);
  for (let r = 0; r < h; r++) {
    const left = Math.max(0, ROUND_ROWS - r);
    const right = w - 1 - left - (hash(seed * 5.1 + r * 0.7) < CHIP_CHANCE ? 1 : 0);
    rect(ctx, STONE.dark, left, r, right - left + 1, 1);
    if (r === 0 || r === h - 1) continue;
    rect(ctx, STONE.base, left + 1, r, right - left - 1, 1);
    if (r > 1 && r < h - 3 && hash(seed * 2.3 + r) < 0.85) rect(ctx, STONE.light, left + 1, r, 1, 1);
    for (let dx = 0; dx < SHADE_COLUMNS; dx++) {
      const x = right - 1 - dx;
      if (x > left + 1 && bayer(x, r) < SHADE_PER_COLUMN * (SHADE_COLUMNS - dx)) rect(ctx, STONE_SHADE, x, r, 1, 1);
    }
    if (r >= h - MOSS_ROWS) {
      const level = ((r - (h - MOSS_ROWS)) / MOSS_ROWS) * MOSS_AMOUNT;
      for (let x = left + 1; x < right; x++) if (bayer(x, r) < level) rect(ctx, MOSS, x, r, 1, 1);
    }
  }
  rect(ctx, MOSS, ROUND_ROWS, 1, 2, 1);
  const crackX = Math.round(w * 0.4);
  const crackTop = Math.round(h * 0.5);
  for (let i = 0; i < 7; i++) rect(ctx, STONE.dark, crackX + (i > 3 ? 1 : 0), crackTop + i, 1, 1);
  return canvas;
}

/** The three standing stones with a soft shadow at their feet and their runes carved in, dark and quiet. */
export function paintStones(ctx: Ctx, layout: HiddenLayout, runes: readonly Rune[]): void {
  for (const stone of layout.stones) {
    ctx.globalAlpha = FOOT_SHADOW;
    ellipse(ctx, RECESS, stone.x + 3, stone.base, stone.w, 2);
    ctx.globalAlpha = 1;
    ctx.drawImage(stoneSprite(stone), stone.x - Math.floor(stone.w / 2), stone.base - stone.h);
  }
  for (const rune of runes) paintGlyph(ctx, rune.glyph, rune.x, rune.y, CARVED);
}

/** The stone ring, the lintel and the two steps around the round door. The door itself is drawn over this by the mystery board. */
export function paintDoorSurround(ctx: Ctx, layout: HiddenLayout): void {
  const { door } = layout;
  const radius = DOOR_RADIUS;
  disc(ctx, RECESS, door.x, door.y, radius + 4);
  for (let k = 0; k < RING_STONES; k++) {
    const angle = (k / RING_STONES) * Math.PI * 2 + RING_SPIN;
    const cx = Math.round(door.x + Math.cos(angle) * (radius + RING_OFFSET));
    const cy = Math.round(door.y + Math.sin(angle) * (radius + RING_OFFSET));
    rect(ctx, STONE.dark, cx - 2, cy - 2, 4, 4);
    rect(ctx, k % 2 === 0 ? STONE.base : STONE_SHADE, cx - 1, cy - 1, 3, 3);
    rect(ctx, STONE.light, cx - 1, cy - 1, 1, 1);
    if (Math.sin(angle) < 0 && k % 2 === 0) rect(ctx, MOSS, cx - 1, cy - 2, 2, 1);
  }
  const lintelWidth = radius * 2 + 10;
  const lintelLeft = door.x - radius - 5;
  const lintelTop = door.y - radius - 6;
  rect(ctx, STONE.dark, lintelLeft, lintelTop, lintelWidth, 5);
  rect(ctx, STONE.base, lintelLeft + 1, lintelTop + 1, lintelWidth - 2, 3);
  rect(ctx, STONE.light, lintelLeft + 1, lintelTop + 1, lintelWidth - 2, 1);
  for (let x = lintelLeft + 2; x < lintelLeft + lintelWidth - 2; x += 3) rect(ctx, MOSS, x, lintelTop, 2, 1);
  const stepWidth = radius * 2 + 8;
  const stepLeft = door.x - radius - 4;
  for (let s = 0; s < 2; s++) {
    const top = door.y + radius + 5 + s * 3;
    rect(ctx, STONE.dark, stepLeft - s * 4, top, stepWidth + s * 8, 3);
    rect(ctx, STONE.base, stepLeft - s * 4 + 1, top, stepWidth + s * 8 - 2, 2);
    rect(ctx, STONE.light, stepLeft - s * 4 + 1, top, stepWidth + s * 8 - 2, 1);
  }
}

/** Worn flagstones from the door to the stones, and a half-erased circle in the lawn where the cast gathers. */
export function paintClearing(ctx: Ctx, layout: HiddenLayout): void {
  const reach = Math.round(layout.width * FLAG_REACH_SHARE);
  for (let x = layout.door.x + 16, i = 0; x < reach; x += FLAG_STEP, i++) {
    const y = FLAG_ROW + Math.round(Math.sin(i * 1.7) * 2);
    ellipse(ctx, GROUND.dark, x, y, 4, 2);
    ellipse(ctx, STONE_SHADE, x, y, 3, 1);
    rect(ctx, STONE.light, x - 2, y - 1, 2, 1);
  }
  const cx = Math.round(layout.width * CIRCLE_SHARE);
  const rx = Math.round(Math.min(CIRCLE_RX, layout.width * CIRCLE_RX_SHARE));
  for (let i = 0; i < CIRCLE_POINTS; i++) {
    if (i % 4 === 3) continue;
    const angle = (i / CIRCLE_POINTS) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * rx);
    const y = Math.round(CIRCLE_ROW + Math.sin(angle) * CIRCLE_RY);
    rect(ctx, i % 12 === 5 ? STONE_SHADE : GROUND.dark, x, y, 1, 1);
  }
}

/**
 * Brings the runes alive. Quiet (`open` 0): faint teal, with one rune glinting now and then. Open (`open` 1): all of them
 * pulse in bright gold with a small halo. `open` eases between the two so the change is gradual.
 */
export function drawRunes(ctx: Ctx, sheets: RuneSheets, runes: readonly Rune[], time: number, night: number, open: number): void {
  const before = ctx.globalAlpha;
  for (const rune of runes) {
    const glint = Math.max(0, Math.sin(time * GLINT_SPEED + rune.seed * Math.PI * 2)) ** GLINT_SHARPNESS * GLINT_PEAK;
    const quiet = Math.min(1, QUIET_BASE + QUIET_NIGHT * night + glint);
    const lit = OPEN_LOW + OPEN_PULSE * Math.sin(time * OPEN_SPEED + rune.seed * 5);
    const level = quiet * (1 - open) + lit * open;
    const sx = rune.glyph * GLYPH_W;
    if (open < 1) {
      ctx.globalAlpha = before * level * (1 - open);
      ctx.drawImage(sheets.teal, sx, 0, GLYPH_W, GLYPH_H, rune.x, rune.y, GLYPH_W, GLYPH_H);
    }
    if (open > 0) {
      ctx.globalAlpha = before * level * open;
      ctx.drawImage(sheets.gold, sx, 0, GLYPH_W, GLYPH_H, rune.x, rune.y, GLYPH_W, GLYPH_H);
    }
    ctx.globalAlpha = before;
    if (open > HALO_MIN_OPEN) drawHalo(ctx, rune.x + 1, rune.y + 2, RUNE_HALO_RADIUS, GOLD, RUNE_HALO_STRENGTH * open * level);
  }
}
