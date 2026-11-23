import { clamp } from '../../world/math';
import { drawText, plainText, textWidth } from '../../render/pixel-font';
import type { Emote } from './types';

/** The pixels of a speech bubble and of the small marks that float over a head. Pure drawing: no state, no timers. */

const INK = '#1c2036';
const PAPER = '#fbf4e2';
const OUTLINE = '#1c2036';
const SHADOW = 'rgba(20, 24, 44, 0.35)';
const MARK_COLOR = '#ffd75e';
const MARK_SHADOW = '#1c2036';

/** The pixel font is 5 rows tall with a 4 pixel step per letter; lines sit 7 pixels apart so they never touch. */
const GLYPH_HEIGHT = 5;
const LETTER_STEP = 4;
const LINE_HEIGHT = 7;
const PADDING = 2;
const BORDER = 1;
/** Text wraps at this many pixels wide (or a little less than the view on a narrow phone view). */
const MAX_INNER_WIDTH = 84;
const NARROW_VIEW_MARGIN = 16;
const MIN_INNER_WIDTH = 11;
/** Space kept between a bubble and the edge of the view. */
const VIEW_MARGIN = 3;
/** The bubble body ends this far above the head; the tail covers 3 of those pixels. */
const HEAD_GAP = 6;
/** Keeps the tail clear of the rounded corners. */
const TAIL_INSET = 4;
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

/** A bubble's wrapped text and size, worked out once when a line starts (not every frame). */
export interface BubbleLayout {
  readonly lines: readonly string[];
  /** Letters in all lines together: the most a typing reveal can show. */
  readonly chars: number;
  /** Outer size in pixels, border included, tail not included. */
  readonly width: number;
  readonly height: number;
}

/** Splits already-plain text into lines of at most `maxChars` letters; a word longer than a line is cut. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    if (word === '') continue;
    let rest = word;
    while (rest.length > maxChars) {
      if (current !== '') {
        lines.push(current);
        current = '';
      }
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    if (current === '') current = rest;
    else if (current.length + 1 + rest.length <= maxChars) current += ` ${rest}`;
    else {
      lines.push(current);
      current = rest;
    }
  }
  if (current !== '') lines.push(current);
  if (lines.length === 0) lines.push('');
  return lines;
}

/** Wraps and measures a spoken line. All text goes through `plainText` here, so the font never meets a letter it lacks. */
export function layoutBubble(text: string, viewWidth: number): BubbleLayout {
  const inner = Math.max(MIN_INNER_WIDTH, Math.min(MAX_INNER_WIDTH, viewWidth - NARROW_VIEW_MARGIN));
  const lines = wrap(plainText(text), Math.floor((inner + 1) / LETTER_STEP));
  let widest = 0;
  let chars = 0;
  for (const line of lines) {
    widest = Math.max(widest, textWidth(line));
    chars += line.length;
  }
  const frame = 2 * (PADDING + BORDER);
  return { lines, chars, width: widest + frame, height: (lines.length - 1) * LINE_HEIGHT + GLYPH_HEIGHT + frame };
}

/** How opaque a bubble is `age` seconds after it appeared: quick fade in, quick fade out at the end. */
export function bubbleAlpha(age: number, duration: number): number {
  return clamp(Math.min(age / POP_IN_SECONDS, (duration - age) / FADE_OUT_SECONDS), 0, 1);
}

/** A filled box with its 4 corner pixels left out. */
function fillRounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, 1, h - 2);
  ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
}

/** The small pointer under the bubble: 3 rows, narrowing to one pixel, opening into the bubble's bottom border. */
function drawTail(ctx: CanvasRenderingContext2D, tailX: number, bodyBottom: number): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(tailX - 1, bodyBottom - 1, 3, 1);
  ctx.fillRect(tailX - 1, bodyBottom, 3, 1);
  ctx.fillRect(tailX, bodyBottom + 1, 1, 1);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(tailX - 2, bodyBottom, 1, 1);
  ctx.fillRect(tailX + 2, bodyBottom, 1, 1);
  ctx.fillRect(tailX - 1, bodyBottom + 1, 1, 1);
  ctx.fillRect(tailX + 1, bodyBottom + 1, 1, 1);
  ctx.fillRect(tailX, bodyBottom + 2, 1, 1);
}

/**
 * Draws a bubble over a speaker. `anchorX` is the speaker's centre and `headTopY` the top of their head, both in view pixels.
 * The box stays inside the view; the tail keeps pointing at the speaker. `revealed` is how many letters have been typed so far.
 */
export function drawBubble(
  ctx: CanvasRenderingContext2D,
  layout: BubbleLayout,
  revealed: number,
  anchorX: number,
  headTopY: number,
  viewWidth: number,
  alpha: number,
): void {
  const { width, height, lines } = layout;
  const x = clamp(Math.round(anchorX - width / 2), VIEW_MARGIN, viewWidth - VIEW_MARGIN - width);
  const bodyBottom = Math.round(headTopY) - HEAD_GAP;
  const y = Math.max(VIEW_MARGIN, bodyBottom - height);
  const tailX = clamp(Math.round(anchorX), x + TAIL_INSET, x + width - 1 - TAIL_INSET);
  const previousAlpha = ctx.globalAlpha;
  ctx.globalAlpha = previousAlpha * alpha;
  fillRounded(ctx, x + 1, y + 1, width, height, SHADOW);
  fillRounded(ctx, x, y, width, height, OUTLINE);
  fillRounded(ctx, x + BORDER, y + BORDER, width - 2 * BORDER, height - 2 * BORDER, PAPER);
  drawTail(ctx, tailX, y + height);
  let left = revealed;
  for (let i = 0; i < lines.length && left > 0; i++) {
    const line = lines[i];
    const shown = left >= line.length ? line : line.slice(0, left);
    drawText(ctx, shown, x + BORDER + PADDING, y + BORDER + PADDING + i * LINE_HEIGHT, INK);
    left -= line.length;
  }
  ctx.globalAlpha = previousAlpha;
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
