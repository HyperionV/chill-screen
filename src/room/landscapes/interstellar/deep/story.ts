import { drawText, plainText, textWidth } from '../../../../render/pixel-font';
import { CHAPTERS, FIRST_DEEP_CHAPTER } from '../scenes';

/** Give the title time to fade before the first line, and space the lines through the chapter. */
const FIRST_LINE_SECONDS = 14;
const LINE_INTERVAL_SECONDS = 70;
const LINE_SECONDS = 18;
const FADE_SECONDS = 1.5;

/** Keep the caption above the chapter title and use the same colours as the title. */
const CAPTION_ROW = 0.15;
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

const CAPTIONS = [GARGANTUA, BLUE_HORIZON, GIANT_AND_GALAXY, GOLDEN_HEART, TWO_GALAXIES].map((lines) =>
  lines.map((line) => {
    const text = plainText(line);
    return { text, width: textWidth(text) * SIZE };
  }),
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

    const x = Math.round((w - line.width) * CENTER_FRACTION);
    const y = Math.round(h * CAPTION_ROW);
    ctx.save();
    ctx.globalAlpha = Math.min(1, age / FADE_SECONDS, (LINE_SECONDS - age) / FADE_SECONDS);
    drawText(ctx, line.text, x + SIZE, y + SIZE, SHADOW, SIZE);
    drawText(ctx, line.text, x, y, CREAM, SIZE);
    ctx.restore();
  }
}
