import { drawText, plainText, textWidth } from '../../../../render/pixel-font';
import { CHAPTERS, FIRST_DEEP_CHAPTER } from '../scenes';

/** Give the title time to fade before the first line, and space the lines through the chapter. */
const FIRST_LINE_SECONDS = 14;
const LINE_INTERVAL_SECONDS = 70;
const LINE_SECONDS = 18;
const FADE_SECONDS = 1.5;

/** Sit the caption just under the clock, in the clear space above the radio and clear of the window bars. */
const CAPTION_ROW = 0.6;
const SIZE = 1;
const CENTER_FRACTION = 0.5;
const CREAM = 'rgb(246,238,214)';
const SHADOW = 'rgb(10,14,30)';

const GARGANTUA = [
  'The Station has circled Gargantua for 300 years.',
  'Its ring turns slowly, so home always feels like down.',
  'Tonight, a small ship is coming back.',
];
const BLUE_HORIZON = [
  'The ship dives to the blue edge, where time runs thin.',
  'One hour out here is a lifetime back home.',
  'The light bends, and the ship does not look away.',
];
const GIANT_AND_GALAXY = [
  'Past the shadow: a quiet giant and an old spiral.',
  'The crew counts the stars they left behind.',
  'None of them were ever really lost.',
];
const GOLDEN_HEART = [
  "The galaxy's heart glows like a lamp left on.",
  'Dust lanes drift by like quiet roads.',
  'Somewhere in the light, a message is waiting.',
];
const TWO_GALAXIES = [
  'Two galaxies, circling for a billion years.',
  'They will meet, and neither will mind.',
  'The ship turns toward the Station. Home.',
];

/** A line wider than this share of the screen is shown as two rows. */
const MAX_WIDTH_FRACTION = 0.92;
/** Glyph height plus two rows of space between caption rows. */
const ROW_STEP = 7;

interface Row {
  text: string;
  width: number;
}

interface CaptionLine {
  whole: Row;
  single: readonly [Row];
  /** The same sentence cut at the space nearest its middle, for narrow screens. */
  halves: readonly [Row, Row];
}

function toRow(text: string): Row {
  return { text, width: textWidth(text) * SIZE };
}

function toCaptionLine(line: string): CaptionLine {
  const text = plainText(line);
  const middle = text.length / 2;
  let cut = text.indexOf(' ');
  for (let i = cut; i >= 0; i = text.indexOf(' ', i + 1)) {
    if (Math.abs(i - middle) < Math.abs(cut - middle)) cut = i;
  }
  const whole = toRow(text);
  return { whole, single: [whole], halves: [toRow(text.slice(0, cut)), toRow(text.slice(cut + 1))] };
}

const CAPTIONS = [GARGANTUA, BLUE_HORIZON, GIANT_AND_GALAXY, GOLDEN_HEART, TWO_GALAXIES].map((lines) =>
  lines.map(toCaptionLine),
);

/** Shows the current chapter's story lines and repeats them while the chapter is held. */
export class StoryCaption {
  private chapterIndex: number | null = null;
  private elapsed = 0;

  draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, chapterIndex: number): void {
    if (chapterIndex !== this.chapterIndex) {
      this.chapterIndex = chapterIndex;
      this.elapsed = 0;
    }
    const lines = CAPTIONS[chapterIndex - FIRST_DEEP_CHAPTER];
    if (!lines) return;

    this.elapsed = (this.elapsed + dt) % CHAPTERS[chapterIndex].seconds;
    const sinceFirstLine = this.elapsed - FIRST_LINE_SECONDS;
    if (sinceFirstLine < 0) return;

    const line = lines[Math.floor(sinceFirstLine / LINE_INTERVAL_SECONDS)];
    const age = sinceFirstLine % LINE_INTERVAL_SECONDS;
    if (!line || age >= LINE_SECONDS) return;

    const rows = line.whole.width <= w * MAX_WIDTH_FRACTION ? line.single : line.halves;
    const top = Math.round(h * CAPTION_ROW);
    ctx.save();
    ctx.globalAlpha = Math.min(1, age / FADE_SECONDS, (LINE_SECONDS - age) / FADE_SECONDS);
    for (let i = 0; i < rows.length; i++) {
      const x = Math.round((w - rows[i].width) * CENTER_FRACTION);
      const y = top + i * ROW_STEP * SIZE;
      drawText(ctx, rows[i].text, x + SIZE, y + SIZE, SHADOW, SIZE);
      drawText(ctx, rows[i].text, x, y, CREAM, SIZE);
    }
    ctx.restore();
  }
}
