/** About how many pixel rows the scene has, whatever the screen size: low enough to read as a pixel game. */
const TARGET_ROWS = 270;
/**
 * The colour steps each channel is snapped to. They sit closer together in the darks, so night scenes keep
 * their detail, and the gaps between them are filled with an ordered dither pattern, as old games did.
 */
const LEVELS = [0, 8, 17, 27, 38, 50, 63, 77, 92, 108, 125, 143, 162, 182, 204, 228, 255];
/** The 4x4 ordered dither pattern, as thresholds 0..15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * A small canvas kept in main memory, like the stage. Everything drawn onto the stage must be one: copying from a
 * graphics-card canvas makes the stage wait for the card every frame (measured: 9.6 ms a frame in heavy rain).
 */
export function memoryCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

/** For each of the 16 dither thresholds and each channel value, the snapped value. */
function buildSnap(): Uint8Array {
  const table = new Uint8Array(16 * 256);
  for (let t = 0; t < 16; t++) {
    const threshold = (BAYER[t] + 0.5) / 16;
    for (let v = 0; v < 256; v++) {
      let i = 0;
      while (LEVELS[i + 1] < v) i++;
      const lo = LEVELS[i];
      const hi = LEVELS[i + 1];
      table[t * 256 + v] = (v - lo) / (hi - lo) > threshold ? hi : lo;
    }
  }
  return table;
}

/**
 * A small canvas the scene is drawn on at pixel-game resolution, then shown on screen with its colours
 * snapped to a limited set and blown up with hard pixel edges.
 */
export class PixelStage {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Screen pixels per stage pixel. */
  scale = 1;
  private readonly screen: CanvasRenderingContext2D;
  private readonly snap = buildSnap();

  constructor(private readonly screenCanvas: HTMLCanvasElement) {
    const stage = memoryCanvas(1, 1);
    this.canvas = stage.canvas;
    this.ctx = stage.ctx;
    const screen = screenCanvas.getContext('2d', { alpha: false });
    if (!screen) throw new Error('2D canvas is not available');
    this.screen = screen;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  /** Sizes the screen canvas to the window and the stage to match. Returns false when the window has no size. */
  fit(dpr: number): boolean {
    if (innerWidth === 0 || innerHeight === 0) return false;
    const sw = Math.round(innerWidth * dpr);
    const sh = Math.round(innerHeight * dpr);
    this.screenCanvas.width = sw;
    this.screenCanvas.height = sh;
    this.screenCanvas.style.width = `${innerWidth}px`;
    this.screenCanvas.style.height = `${innerHeight}px`;
    this.scale = Math.max(2, Math.round(sh / TARGET_ROWS));
    this.canvas.width = Math.ceil(sw / this.scale);
    this.canvas.height = Math.ceil(sh / this.scale);
    return true;
  }

  /** Converts a point on the page (CSS pixels) to stage pixels. */
  toStage(clientX: number, clientY: number): [number, number] {
    const k = this.screenCanvas.width / innerWidth / this.scale;
    return [clientX * k, clientY * k];
  }

  /** Snaps the finished frame to the pixel palette and puts it on screen. */
  present(): void {
    const { width: w, height: h } = this.canvas;
    const image = this.ctx.getImageData(0, 0, w, h);
    const px = image.data;
    const snap = this.snap;
    for (let y = 0; y < h; y++) {
      const row = (y & 3) << 2;
      for (let x = 0; x < w; x++) {
        const t = (row | (x & 3)) << 8;
        const i = (y * w + x) << 2;
        px[i] = snap[t | px[i]];
        px[i + 1] = snap[t | px[i + 1]];
        px[i + 2] = snap[t | px[i + 2]];
      }
    }
    this.ctx.putImageData(image, 0, 0);
    this.screen.imageSmoothingEnabled = false;
    this.screen.drawImage(this.canvas, 0, 0, w * this.scale, h * this.scale);
  }
}
