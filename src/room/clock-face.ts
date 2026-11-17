import { mix, type RGB } from '../render/color';
import { memoryCanvas } from '../render/pixel-stage';

const FONT = '"Outfit Variable", "Segoe UI Variable", sans-serif';
const WHITE: RGB = [255, 255, 255];
const SHADOW = 'rgba(10,14,26,0.5)';

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
 * The large time and date in the middle of the view, drawn smooth at full screen resolution so the lettering stays
 * sharp while the scene around it is pixel art. It sits behind the glass, so the weather plays over it: mist softens
 * it, drops sit on it, sliding drops and the pointer clear it. Its colour takes the light outside. The lettering is
 * drawn once a minute and reused.
 */
export class ClockFace {
  private cache: { key: string; canvas: HTMLCanvasElement } | null = null;

  /**
   * Draws the clock centred on a point given in stage pixels. `size` is the height of the time's digits in stage
   * pixels, and `scale` is screen pixels per stage pixel. The context must be on the screen canvas.
   */
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, tint: RGB, scale: number): void {
    const { time, date } = readout(new Date());
    const color = mix(WHITE, mix(tint, WHITE, 0.55), 0.3);
    const px = Math.round(size * scale);
    const fontReady = document.fonts.check(`300 ${px}px ${FONT}`);
    const key = [time, date, px, color.map((v) => Math.round(v / 8)).join(','), fontReady].join('|');
    if (this.cache?.key !== key) this.cache = { key, canvas: render(time, date, px, color) };
    if (!fontReady) void document.fonts.load(`300 ${px}px ${FONT}`);
    const c = this.cache.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, Math.round(cx * scale - c.width / 2), Math.round(cy * scale - c.height / 2));
    ctx.restore();
  }
}

/** Draws the lettering at screen size with a soft shadow, so it reads on any sky. */
function render(time: string, date: string, size: number, color: RGB): HTMLCanvasElement {
  const timeFont = `300 ${size}px ${FONT}`;
  const dateFont = `600 ${Math.max(12, Math.round(size * 0.24))}px ${FONT}`;
  const { canvas, ctx } = memoryCanvas(1, 1);
  ctx.font = timeFont;
  const timeW = ctx.measureText(time).width;
  ctx.font = dateFont;
  const dateW = ctx.measureText(date).width;
  const pad = Math.ceil(size * 0.1);
  canvas.width = Math.ceil(Math.max(timeW, dateW)) + pad * 2;
  canvas.height = Math.ceil(size * 1.42) + pad * 2;
  ctx.fillStyle = `rgb(${color[0] | 0},${color[1] | 0},${color[2] | 0})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = SHADOW;
  ctx.shadowBlur = size * 0.06;
  ctx.shadowOffsetY = size * 0.018;
  ctx.font = dateFont;
  ctx.fillText(date, canvas.width / 2, pad + Math.round(size * 0.24));
  ctx.font = timeFont;
  ctx.fillText(time, canvas.width / 2, pad + Math.round(size * 1.3));
  return canvas;
}
