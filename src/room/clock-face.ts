import { mix, type RGB } from '../render/color';
import { memoryCanvas } from '../render/pixel-stage';

const FONT = '"Outfit Variable", "Segoe UI Variable", sans-serif';
const WHITE: RGB = [255, 255, 255];
const SHADOW: RGB = [10, 14, 26];
/** Edge pixels at least this covered by the letter are kept; the rest are dropped, so edges stay hard. */
const INK_THRESHOLD = 120;

const twelveHour = ((): boolean => {
  const cycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12';
})();

function readout(d: Date): { time: string; date: string } {
  const hours = twelveHour ? d.getHours() % 12 || 12 : d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return {
    time: `${twelveHour ? hours : String(hours).padStart(2, '0')}:${minutes}`,
    date: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

/**
 * The large time and date in the middle of the view, drawn in hard-edged pixels behind the glass, so the weather
 * plays over it: mist softens it, drops sit on it, sliding drops and the pointer clear it. Its colour takes the
 * light outside. The lettering is drawn once a minute and reused.
 */
export class ClockFace {
  private cache: { key: string; canvas: HTMLCanvasElement } | null = null;

  /** `size` is the height of the time's digits in stage pixels. */
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, tint: RGB): void {
    const { time, date } = readout(new Date());
    const color = mix(WHITE, mix(tint, WHITE, 0.55), 0.3);
    const px = Math.round(size);
    const fontReady = document.fonts.check(`300 ${px}px ${FONT}`);
    const key = [time, date, px, color.map((v) => Math.round(v / 8)).join(','), fontReady].join('|');
    if (this.cache?.key !== key) this.cache = { key, canvas: render(time, date, px, color) };
    if (!fontReady) void document.fonts.load(`300 ${px}px ${FONT}`);
    const c = this.cache.canvas;
    ctx.drawImage(c, Math.round(cx - c.width / 2), Math.round(cy - c.height / 2));
  }
}

/** Draws the lettering, then keeps only well-covered pixels in solid colour, with a one-pixel shadow. */
function render(time: string, date: string, size: number, color: RGB): HTMLCanvasElement {
  const timeFont = `300 ${size}px ${FONT}`;
  const dateFont = `600 ${Math.max(9, Math.round(size * 0.24))}px ${FONT}`;
  const { canvas: ink, ctx } = memoryCanvas(1, 1);
  ctx.font = timeFont;
  const timeW = ctx.measureText(time).width;
  ctx.font = dateFont;
  const dateW = ctx.measureText(date).width;
  const pad = 3;
  ink.width = Math.ceil(Math.max(timeW, dateW)) + pad * 2;
  ink.height = Math.ceil(size * 1.42) + pad * 2;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = dateFont;
  ctx.fillText(date, ink.width / 2, pad + Math.round(size * 0.24));
  ctx.font = timeFont;
  ctx.fillText(time, ink.width / 2, pad + Math.round(size * 1.3));

  const image = ctx.getImageData(0, 0, ink.width, ink.height);
  const src = image.data;
  const out = ctx.createImageData(ink.width, ink.height);
  const dst = out.data;
  const paint = (i: number, c: RGB, a: number): void => {
    dst[i] = c[0];
    dst[i + 1] = c[1];
    dst[i + 2] = c[2];
    dst[i + 3] = a;
  };
  const w = ink.width;
  for (let y = 0; y < ink.height; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] >= INK_THRESHOLD) paint(i, color, 255);
      else if (x > 0 && y > 0 && src[((y - 1) * w + x - 1) * 4 + 3] >= INK_THRESHOLD) paint(i, SHADOW, 110);
    }
  }
  ctx.putImageData(out, 0, 0);
  return ink;
}
