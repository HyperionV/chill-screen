import type { Look } from '../wallpapers/look';
import { ClockFace } from './clock-face';
import { PixelStage } from './pixel-stage';
import { Rain } from './rain';
import type { OutsideView } from './view';
import { WindowFrame } from './window-frame';

const FPS_CAP = 30;
const MAX_DPR = 1.5;
/** How far things shift as the pointer crosses the screen, as a share of the width: the near window more than the far view. */
const VIEW_PARALLAX = 0.012;
const WINDOW_PARALLAX = 0.024;
/** Where the time sits and how tall its digits are, as shares of the height. */
const CLOCK_Y = 0.43;
const CLOCK_SIZE = 0.15;
/** Shown while a view has nothing to show yet: a dim, neutral dusk. */
const WAITING_LOOK: Look = { mean: 0.25, sun: null, sky: [], night: 0.6, tint: [58, 66, 86] };
const WAITING_COLOR = '#0b1120';

/**
 * Sitting in a room by a window, as a pixel scene. Back to front: the view outside, rain falling past, the time,
 * mist and drops on the glass, then the window itself and the wall. The pointer moves the eye a little (parallax)
 * and wipes the glass.
 */
export class WindowScene {
  private readonly stage: PixelStage;
  private readonly window = new WindowFrame();
  private readonly rain = new Rain();
  private readonly clock = new ClockFace();
  private view: OutsideView;
  private rainTarget: number;
  private rainLevel: number;
  private running = false;
  private frameId = 0;
  private lastFrame = 0;
  /** The pointer in stage pixels, and where the window sat when it was last seen (to wipe in glass positions). */
  private pointer: { x: number; y: number; ox: number; oy: number } | null = null;
  private parallax: [number, number] = [0, 0];
  frameCost = 0;

  constructor(private readonly canvas: HTMLCanvasElement, view: OutsideView, rain: number) {
    this.stage = new PixelStage(canvas);
    this.view = view;
    this.rainTarget = this.rainLevel = rain;
    addEventListener('resize', () => this.running && this.fit());
    canvas.addEventListener('pointermove', (e) => this.onPointer(e.clientX, e.clientY));
    canvas.addEventListener('pointerleave', () => (this.pointer = null));
  }

  setView(view: OutsideView): void {
    this.view = view;
    if (this.running) view.resize(this.stage.width, this.stage.height);
  }

  /** 0 is no rain, 1 a downpour. The scene eases toward it. */
  setRain(level: number): void {
    this.rainTarget = level;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.canvas.hidden = false;
    this.fit();
    this.lastFrame = 0;
    this.frameId = requestAnimationFrame((t) => this.tick(t));
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.canvas.hidden = true;
  }

  private fit(): void {
    if (!this.stage.fit(Math.min(devicePixelRatio || 1, MAX_DPR))) return;
    const { width: w, height: h } = this.stage;
    this.window.layout(w, h);
    this.rain.resize(w, h);
    this.view.resize(w, h);
  }

  private onPointer(clientX: number, clientY: number): void {
    const [x, y] = this.stage.toStage(clientX, clientY);
    const [ox, oy] = this.windowShift();
    const last = this.pointer;
    if (last && this.rainLevel > 0.02) this.rain.wipe(last.x - last.ox, last.y - last.oy, x - ox, y - oy);
    this.pointer = { x, y, ox, oy };
  }

  private windowShift(): [number, number] {
    const w = this.stage.width;
    return [Math.round(-this.parallax[0] * w * WINDOW_PARALLAX), Math.round(-this.parallax[1] * w * WINDOW_PARALLAX * 0.6)];
  }

  private tick(now: number): void {
    this.frameId = requestAnimationFrame((t) => this.tick(t));
    if (document.visibilityState === 'hidden') return;
    if (this.lastFrame && now - this.lastFrame < 1000 / FPS_CAP - 2) return;
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 1 / FPS_CAP;
    this.lastFrame = now;
    const started = performance.now();
    this.draw(dt, now / 1000);
    this.frameCost = this.frameCost * 0.95 + (performance.now() - started) * 0.05;
  }

  private draw(dt: number, time: number): void {
    const ctx = this.stage.ctx;
    const { width: w, height: h } = this.stage;
    const target: [number, number] = this.pointer ? [(this.pointer.x / w) * 2 - 1, (this.pointer.y / h) * 2 - 1] : [0, 0];
    const k = 1 - Math.exp(-dt * 1.8);
    this.parallax = [this.parallax[0] + (target[0] - this.parallax[0]) * k, this.parallax[1] + (target[1] - this.parallax[1]) * k];
    this.rainLevel += (this.rainTarget - this.rainLevel) * (1 - Math.exp(-dt * 0.8));

    ctx.fillStyle = WAITING_COLOR;
    ctx.fillRect(0, 0, w, h);
    const shift: [number, number] = [Math.round(-this.parallax[0] * w * VIEW_PARALLAX), Math.round(-this.parallax[1] * w * VIEW_PARALLAX * 0.5)];
    const look = this.view.draw(ctx, { dt, time, shift }) ?? WAITING_LOOK;
    const [ox, oy] = this.windowShift();

    this.rain.drawOutside(ctx, dt, this.rainLevel, look);
    this.clock.draw(ctx, w / 2 + ox, h * CLOCK_Y + oy, h * CLOCK_SIZE, look.tint);
    ctx.save();
    this.window.clipToGlass(ctx, ox, oy);
    this.rain.drawGlass(ctx, dt, this.rainLevel, look, ox, oy);
    ctx.restore();
    this.window.draw(ctx, look, ox, oy);
    this.stage.present();
  }
}
