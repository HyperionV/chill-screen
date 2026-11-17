import type { Look } from '../wallpapers/look';
import { ClockFace } from './clock-face';
import { MusicDeck, type DeckControls } from './music-deck';
import { PixelStage } from '../render/pixel-stage';
import { frameSetting } from '../scene/frame-setting';
import { Rain } from './rain';
import type { OutsideView } from './view';
import { WindowFrame } from './window-frame';

const FPS_CAP = 30;
/** The pointer counts as stirring things (scaring animals) this long after it last moved. */
const POINTER_ACTIVE_SECONDS = 1.2;
const MAX_DPR = 1.5;
/** Where the time sits and how tall its digits are, as shares of the height. */
const CLOCK_Y = 0.43;
const CLOCK_SIZE = 0.15;
/** Shown while a view has nothing to show yet: a dim, neutral dusk. */
const WAITING_LOOK: Look = { mean: 0.25, sun: null, sky: [], night: 0.6, tint: [58, 66, 86] };
const WAITING_COLOR = '#0b1120';

/**
 * Sitting in a room by a window, as a pixel scene. Back to front: the view outside, rain falling past, the time,
 * mist and drops on the glass, then the window itself and the wall. The pointer wipes the glass. With the window
 * frame turned off, only the view, the weather and the time are drawn, and there is no radio (the player bar replaces it).
 */
export class WindowScene {
  private readonly stage: PixelStage;
  private readonly window = new WindowFrame();
  private readonly rain = new Rain();
  private readonly clock = new ClockFace();
  private view: OutsideView;
  private deck: MusicDeck | null = null;
  private rainTarget: number;
  private rainLevel: number;
  private running = false;
  private frameId = 0;
  private lastFrame = 0;
  /** The pointer in stage pixels, and the page time it last moved. */
  private pointer: { x: number; y: number } | null = null;
  private pointerMovedAt = -Infinity;
  frameCost = 0;

  constructor(private readonly canvas: HTMLCanvasElement, view: OutsideView, rain: number) {
    this.stage = new PixelStage(canvas);
    this.view = view;
    this.rainTarget = this.rainLevel = rain;
    addEventListener('resize', () => this.running && this.fit());
    canvas.addEventListener('pointermove', (e) => this.onPointer(e.clientX, e.clientY));
    canvas.addEventListener('pointerleave', () => {
      this.pointer = null;
      this.radio?.leave();
      canvas.classList.remove('over-control');
    });
    // Pressing the radio's display grabs its slider; the pointer is captured so the drag can leave the display.
    canvas.addEventListener('pointerdown', (e) => {
      const [x, y] = this.stage.toStage(e.clientX, e.clientY);
      if (this.radio?.beginSeek(x, y)) canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', () => this.radio?.endSeek());
    canvas.addEventListener('pointercancel', () => this.radio?.endSeek());
    canvas.addEventListener('click', (e) => {
      const [x, y] = this.stage.toStage(e.clientX, e.clientY);
      this.radio?.press(x, y, performance.now() / 1000);
    });
  }

  /** The radio, while the window is shown; without the window it has nowhere to stand. */
  private get radio(): MusicDeck | null {
    return frameSetting.framed ? this.deck : null;
  }

  /** Puts the music radio on the windowsill, wired to the given controls. */
  setDeck(controls: DeckControls): void {
    this.deck = new MusicDeck(controls);
    if (this.running) this.deck.layout(this.stage.width, this.window.sillRow);
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
    this.deck?.layout(w, this.window.sillRow);
    this.rain.resize(w, h);
    this.view.resize(w, h);
  }

  private onPointer(clientX: number, clientY: number): void {
    const [x, y] = this.stage.toStage(clientX, clientY);
    const last = this.pointer;
    if (last && this.rainLevel > 0.02) this.rain.wipe(last.x, last.y, x, y);
    this.pointer = { x, y };
    this.pointerMovedAt = performance.now() / 1000;
    this.canvas.classList.toggle('over-control', this.radio?.hover(x, y) ?? false);
    this.radio?.dragTo(x);
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
    this.rainLevel += (this.rainTarget - this.rainLevel) * (1 - Math.exp(-dt * 0.8));

    ctx.fillStyle = WAITING_COLOR;
    ctx.fillRect(0, 0, w, h);
    const moving = this.pointer && time - this.pointerMovedAt < POINTER_ACTIVE_SECONDS ? this.pointer : null;
    const look = this.view.draw(ctx, { dt, time, pointer: moving }) ?? WAITING_LOOK;

    const framed = frameSetting.framed;
    this.rain.drawOutside(ctx, dt, this.rainLevel, look);
    if (framed) this.window.draw(ctx, look);
    this.stage.present();
    // The time and the weather on the glass are drawn on the screen itself, so the lettering stays sharp.
    this.stage.overlay((screen) => {
      if (framed) this.window.clipToGlass(screen);
      this.clock.draw(screen, w / 2, h * CLOCK_Y, h * CLOCK_SIZE, look.tint, this.stage.scale);
      this.rain.drawGlass(screen, dt, this.rainLevel, look);
    });
    // The radio stands in the room, in front of the glass and any rain on it.
    if (framed) this.stage.overlay((screen) => this.deck?.draw(screen, dt, time, look, this.stage.scale));
  }
}
