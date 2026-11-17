import { hourNow } from '../scene/clock';
import { readLook, type Look } from '../wallpapers/look';
import type { Wallpaper } from '../wallpapers/store';
import type { NightSky } from './night-sky';
import { memoryCanvas } from '../render/pixel-stage';
import type { OutsideView, ViewFrame } from './view';

interface Slide {
  id: string;
  image: HTMLCanvasElement;
  look: Look;
  born: number;
}

const FADE_SECONDS = 3.5;
/** How many recent wallpapers are kept out of the next pick. */
const RECENT = 3;
const RETRY_SECONDS = 30;

/** How bright a wallpaper should be at this hour: bright by day, warm-dim at dusk and dawn, dark at night. */
function brightnessFor(hour: number): number {
  if (hour >= 8 && hour < 17) return 0.55;
  if ((hour >= 6 && hour < 8) || (hour >= 17 && hour < 19.5)) return 0.42;
  return 0.18;
}

/** What happens after a wallpaper has been up for a while: stay, a random one, or the next in the list. */
export type Rotation = 'stay' | 'shuffle' | 'order';

const ease = (t: number): number => t * t * (3 - 2 * t);

/**
 * The person's wallpapers as the view through the window, opened at pixel-game size so they read as pixel art,
 * rotating (or not, as chosen) every few minutes with a crossfade, preferring darker ones at night when shuffling, with stars over night skies.
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

  /** Told whenever a wallpaper starts to show, so the choice can be remembered. */
  onShown: (id: string) => void = () => undefined;

  constructor(private readonly nightSky: NightSky, private every: number, private rotation: Rotation) {}

  configure(every: number, rotation: Rotation): void {
    this.every = every;
    this.rotation = rotation;
  }

  /** `preferred` is the wallpaper to open on when none is showing yet (the one chosen last time). */
  setWallpapers(list: Wallpaper[], preferred: string | null): void {
    this.wallpapers = list;
    const top = this.slides[this.slides.length - 1];
    if (!top || !list.some((w) => w.id === top.id)) void this.show(preferred ?? undefined);
  }

  /** The wallpaper on screen, or null before the first one is ready. */
  get current(): string | null {
    return this.slides[this.slides.length - 1]?.id ?? null;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** Fades to the next wallpaper the rotation calls for. */
  next(): Promise<void> {
    return this.show();
  }

  /** Fades to the wallpaper with this id, or, with none given, to the one the rotation picks. */
  async show(id?: string): Promise<void> {
    if (this.loading || !this.wallpapers.length || !this.w) return;
    this.loading = true;
    try {
      const pick = this.wallpapers.find((w) => w.id === id) ?? this.choose();
      const image = await this.decode(pick.blob);
      this.slides.push({ id: pick.id, image, look: readLook(image), born: performance.now() / 1000 });
      this.recent = [pick.id, ...this.recent.filter((r) => r !== pick.id)].slice(0, Math.min(RECENT, this.wallpapers.length - 1));
      this.onShown(pick.id);
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
    if (this.rotation !== 'stay' && frame.time - top.born > this.every * 60 && frame.time > this.retryAt) void this.next();
    const fadeIn = Math.min(1, (frame.time - top.born) / FADE_SECONDS);
    if (fadeIn >= 1 && this.slides.length > 1) this.slides = [top];
    for (const s of this.slides) {
      const shown = s === top ? ease(fadeIn) : 1;
      const scale = Math.max(this.w / s.image.width, this.h / s.image.height);
      const iw = s.image.width * scale;
      const ih = s.image.height * scale;
      const x = Math.round((this.w - iw) / 2);
      const y = Math.round((this.h - ih) / 2);
      ctx.globalAlpha = shown;
      ctx.drawImage(s.image, x, y, iw, ih);
      ctx.globalAlpha = 1;
      this.nightSky.draw(ctx, s.look, (u, v) => [x + u * iw, y + v * ih], s === top ? shown : 1 - ease(fadeIn), frame.time);
    }
    this.nightSky.drawMeteors(ctx, frame.dt, top.look.night, this.w, this.h * 0.5);
    return top.look;
  }

  private choose(): Wallpaper {
    if (this.rotation === 'order') {
      const at = this.wallpapers.findIndex((w) => w.id === this.current);
      return this.wallpapers[(at + 1) % this.wallpapers.length];
    }
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
    const need = Math.min(1, Math.max(this.w / full.width, this.h / full.height));
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
