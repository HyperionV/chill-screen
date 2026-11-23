import { FONTS } from '../../scene/typography';
import { clamp } from '../../world/math';
import { drawText } from '../../render/pixel-font';
import type { Emote } from './types';

/**
 * The speech bubble and the small marks that float over a head. The bubble is drawn on the screen itself in the app's normal
 * font (units are stage pixels, see `OutsideView.drawOverlay`); the marks stay pixel glyphs in the stage picture.
 * Layout (wrapping, measuring) runs once when a line starts; drawing allocates nothing.
 */

const INK = '#1c2036';
const PAPER = '#fdf7e6';
const OUTLINE = '#1c2036';
const SHADOW = 'rgba(20, 24, 44, 0.3)';
const MARK_COLOR = '#ffd75e';
const MARK_SHADOW = '#1c2036';

/** Text metrics shared by every box that holds words (bubble, toast, card), in stage pixels. */
export const TEXT_SIZE = 5.8;
export const TEXT_LINE_HEIGHT = 7.6;
/** Where the baseline sits below the top of a text line, as a share of the font size (the letters' height without descenders). */
export const TEXT_BASELINE_SHARE = 0.8;

export const PAD_X = 3;
export const PAD_Y = 2.4;
const RADIUS = 2.4;
const OUTLINE_WIDTH = 0.7;
const SHADOW_DROP = 1;
/** The widest text line in a bubble, and its share of a narrow (phone) stage. */
const MAX_INNER_WIDTH = 124;
const MAX_INNER_SHARE = 0.62;
/** Space kept between a bubble and the side or top of the stage. */
const STAGE_MARGIN = 3;
/** The window frame covers this share of the stage at each side, so a bubble must stay inside the glass. */
const GLASS_INSET = 0.065;
/** The bubble body ends this far above the head; the tail fills the gap. */
const HEAD_GAP = 3.4;
const TAIL_HEIGHT = 3.2;
const TAIL_HALF_WIDTH = 2.2;
/** The tail tip may lean this far from the tail's base, so a bubble pushed sideways by the stage edge still points at the speaker. */
const TAIL_SLANT = 7;
const POP_IN_SECONDS = 0.15;
const FADE_OUT_SECONDS = 0.2;

const MARK_OFFSET_X = 3;
const MARK_RISE = 6;
const MARK_POP_PIXELS = 3;
const MARK_POP_SECONDS = 0.2;
const MARK_FADE_SECONDS = 0.3;

/** The small mark each emotion shows over the head; point and cheer are shown by the body alone. */
const EMOTE_MARKS: Readonly<Record<Emote, string>> = {
  surprise: '!',
  think: '?',
  laugh: '*',
  scared: '!',
  point: '',
  cheer: '',
  shrug: '...',
};

/** Where a view's own pixels land on the stage: stageX = (worldX - cameraX) * unit, stageY = (worldY - lift) * unit. */
export interface Projection {
  unit: number;
  lift: number;
  cameraX: number;
}

/** The two canvas font settings used for all overlay words: the app's own UI font, found once. */
interface OverlayFonts {
  readonly text: string;
  readonly title: string;
}

let fonts: OverlayFonts | null = null;

export function overlayFonts(): OverlayFonts {
  if (fonts === null) {
    const family = FONTS.clean.family;
    fonts = { text: `600 ${TEXT_SIZE}px ${family}`, title: `700 ${TEXT_SIZE}px ${family}` };
  }
  return fonts;
}

/** A bubble's wrapped text and size, worked out once when a line starts (not every frame). */
export interface BubbleLayout {
  readonly lines: readonly string[];
  /** Letters in all lines together: the most a typing reveal can show. */
  readonly chars: number;
  /** Outer size in stage pixels, tail not included. */
  readonly width: number;
  readonly height: number;
}

/** The widest a line of speech may be on a stage this wide. */
export function maxInnerWidth(stageWidth: number): number {
  return Math.min(MAX_INNER_WIDTH, stageWidth * MAX_INNER_SHARE, stageWidth * (1 - 2 * GLASS_INSET) - 12);
}

/** Splits text into lines no wider than `maxWidth` in the font already set on `ctx`; a single word wider than that stays whole. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    if (word === '') continue;
    const joined = current === '' ? word : `${current} ${word}`;
    if (current === '' || ctx.measureText(joined).width <= maxWidth) current = joined;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  if (lines.length === 0) lines.push('');
  return lines;
}

/** Wraps and measures a spoken line for a bubble whose text may be `maxWidth` wide. */
export function layoutBubble(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): BubbleLayout {
  ctx.save();
  ctx.font = overlayFonts().text;
  const lines = wrapText(ctx, text, maxWidth);
  let widest = 0;
  let chars = 0;
  for (const line of lines) {
    widest = Math.max(widest, ctx.measureText(line).width);
    chars += line.length;
  }
  ctx.restore();
  return { lines, chars, width: widest + 2 * PAD_X, height: 2 * PAD_Y + (lines.length - 1) * TEXT_LINE_HEIGHT + TEXT_SIZE };
}

/** How opaque a bubble is `age` seconds after it appeared: quick fade in, quick fade out at the end. */
export function bubbleAlpha(age: number, duration: number): number {
  return clamp(Math.min(age / POP_IN_SECONDS, (duration - age) / FADE_OUT_SECONDS), 0, 1);
}

/**
 * Draws a bubble over a speaker. `anchorX` is the speaker's centre and `anchorY` the top of their head, both in stage pixels.
 * The box stays inside the stage; the tail keeps pointing at the speaker. `revealed` is how many letters have been typed so far.
 */
export function drawBubble(
  ctx: CanvasRenderingContext2D,
  layout: BubbleLayout,
  anchorX: number,
  anchorY: number,
  revealed: number,
  alpha: number,
  stageWidth: number,
): void {
  const { width, height, lines } = layout;
  const edge = STAGE_MARGIN + stageWidth * GLASS_INSET;
  const x = clamp(anchorX - width / 2, edge, stageWidth - edge - width);
  const y = Math.max(STAGE_MARGIN, anchorY - HEAD_GAP - height);
  const bottom = y + height;
  const tailBase = clamp(anchorX, x + RADIUS + TAIL_HALF_WIDTH, x + width - RADIUS - TAIL_HALF_WIDTH);
  const tailTip = clamp(anchorX, tailBase - TAIL_SLANT, tailBase + TAIL_SLANT);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.roundRect(x, y + SHADOW_DROP, width, height, RADIUS);
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, RADIUS);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tailBase - TAIL_HALF_WIDTH, bottom);
  ctx.lineTo(tailTip, bottom + TAIL_HEIGHT);
  ctx.lineTo(tailBase + TAIL_HALF_WIDTH, bottom);
  ctx.fill();
  ctx.stroke();
  const seam = OUTLINE_WIDTH / 2;
  ctx.fillRect(tailBase - TAIL_HALF_WIDTH + seam, bottom - seam, 2 * (TAIL_HALF_WIDTH - seam), OUTLINE_WIDTH);
  ctx.fillStyle = INK;
  ctx.font = overlayFonts().text;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let left = revealed;
  for (let i = 0; i < lines.length && left > 0; i++) {
    const line = lines[i];
    ctx.fillText(left >= line.length ? line : line.slice(0, left), x + PAD_X, y + PAD_Y + TEXT_SIZE * TEXT_BASELINE_SHARE + i * TEXT_LINE_HEIGHT);
    left -= line.length;
  }
  ctx.restore();
}

/**
 * A small mark floating at the upper right of a head: it pops up from a few pixels lower, holds, then fades.
 * It sits beside the speech bubble's tail rather than under the bubble, so both stay readable.
 */
export function drawEmoteMark(
  ctx: CanvasRenderingContext2D,
  kind: Emote,
  headX: number,
  headTopY: number,
  age: number,
  duration: number,
): void {
  const mark = EMOTE_MARKS[kind];
  if (mark === '') return;
  const pop = Math.round(MARK_POP_PIXELS * Math.max(0, 1 - age / MARK_POP_SECONDS));
  const x = Math.round(headX) + MARK_OFFSET_X;
  const y = Math.round(headTopY) - MARK_RISE + pop;
  const previousAlpha = ctx.globalAlpha;
  ctx.globalAlpha = previousAlpha * clamp((duration - age) / MARK_FADE_SECONDS, 0, 1);
  drawText(ctx, mark, x + 1, y + 1, MARK_SHADOW);
  drawText(ctx, mark, x, y, MARK_COLOR);
  ctx.globalAlpha = previousAlpha;
}
