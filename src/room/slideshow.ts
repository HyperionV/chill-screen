import { hourNow } from '../scene/clock';
import { readLook, type Look } from '../wallpapers/look';
import type { Wallpaper } from '../wallpapers/store';
import type { NightSky } from './night-sky';
import { memoryCanvas } from './pixel-stage';
import type { OutsideView, ViewFrame } from './view';

interface Slide {
  id: string;
  image: HTMLCanvasElement;
  look: Look;
  born: number;
}

const FADE_SECONDS = 3.5;
/** The picture is drawn this much past each edge so the pointer's shift never shows a gap. */
const EDGE = 0.05;
/** How many recent wallpapers are kept out of the next pick. */
const RECENT = 3;
const RETRY_SECONDS = 30;

/** How bright a wallpaper should be at this hour: bright by day, warm-dim at dusk and dawn, dark at night. */
function brightnessFor(hour: number): number {
  if (hour >= 8 && hour < 17) return 0.55;
  if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19.5)) return 0.42;
  return 0.18;
}

const ease = (t: number): number => t * t * (3 - 2 * t);

/**
 * The person's wallpapers as the view through the window, opened at pixel-game size so they read as pixel art,
 * rotating every few minutes with a crossfade, preferring darker ones at night, with stars over night skies.
 */
export class Slideshow implements OutsideView {
  private wallpapers: Wallpaper[] = [];
  private slides: Slide[] = [];
  private recent: string[] = [];
  private loading = false;
  /** After a wallpaper fails to open, the next try waits until this time. */
  private retryAt = 0;
  private w = 0;
  private h = 0;

  constructor(private readonly nightSky: NightSky, private every: number) {}

  setEvery(minutes: number): void {
    this.every = minutes;
  }

  setWallpapers(list: Wallpaper[]): void {
    this.wallpapers = list;
    const top = this.slides[this.slides.length - 1];
    if (!top || !list.some((w) => w.id === top.id)) void this.next();
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** Fades to another wallpaper, preferring ones whose brightness suits the hour. */
  async next(): Promise<void> {
    if (this.loading || !this.wallpapers.length || !this.w) return;
    this.loading = true;
    try {
      const pick = this.choose();
      const image = await this.decode(pick.blob);
      this.slides.push({ id: pick.id, image, look: readLook(image), born: performance.now() / 1000 });
      this.recent = [pick.id, ...this.recent.filter((id) => id !== pick.id)].slice(0, Math.min(RECENT, this.wallpapers.length - 1));
    } catch (err) {
      console.warn('[wallpapers] could not show the next wallpaper', err);
      this.retryAt = performance.now() / 1000 + RETRY_SECONDS;
    } finally {
      this.loading = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look | null {
    const top = this.slides[this.slides.length - 1];
    if (!top) {
      if (this.wallpapers.length && frame.time > this.retryAt) void this.next();
      return null;
    }
    if (frame.time - top.born > this.every * 60 && frame.time > this.retryAt) void this.next();
    const fadeIn = Math.min(1, (frame.time - top.born) / FADE_SECONDS);
    if (fadeIn >= 1 && this.slides.length > 1) this.slides = [top];
    for (const s of this.slides) {
      const shown = s === top ? ease(fadeIn) : 1;
      const scale = Math.max((this.w * (1 + EDGE * 2)) / s.image.width, (this.h * (1 + EDGE * 2)) / s.image.height);
      const iw = s.image.width * scale;
      const ih = s.image.height * scale;
      const x = Math.round((this.w - iw) / 2 + frame.shift[0]);
      const y = Math.round((this.h - ih) / 2 + frame.shift[1]);
      ctx.globalAlpha = shown;
      ctx.drawImage(s.image, x, y, iw, ih);
      ctx.globalAlpha = 1;
      this.nightSky.draw(ctx, s.look, (u, v) => [x + u * iw, y + v * ih], s === top ? shown : 1 - ease(fadeIn), frame.time);
    }
    this.nightSky.drawMeteors(ctx, frame.dt, top.look.night, this.w, this.h * 0.5);
    return top.look;
  }

  private choose(): Wallpaper {
    const target = brightnessFor(hourNow());
    const fresh = this.wallpapers.filter((w) => !this.recent.includes(w.id));
    const pool = (fresh.length ? fresh : this.wallpapers).slice().sort((a, b) => Math.abs(a.mean - target) - Math.abs(b.mean - target));
    const best = pool.slice(0, Math.max(1, Math.ceil(pool.length / 3)));
    return best[Math.floor(Math.random() * best.length)];
  }

  /**
   * Opens a picture at just the stage's size, which is what makes it pixel art and keeps memory tiny, and copies
   * it into main memory beside the stage so drawing it each frame stays cheap.
   */
  private async decode(blob: Blob): Promise<HTMLCanvasElement> {
    const full = await createImageBitmap(blob);
    const need = Math.min(1, Math.max((this.w * (1 + EDGE * 2)) / full.width, (this.h * (1 + EDGE * 2)) / full.height));
    const small = await createImageBitmap(full, {
      resizeWidth: Math.ceil(full.width * need), resizeHeight: Math.ceil(full.height * need), resizeQuality: 'high',
    });
    full.close();
    const { canvas, ctx } = memoryCanvas(small.width, small.height);
    ctx.drawImage(small, 0, 0);
    small.close();
    return canvas;
  }
}
