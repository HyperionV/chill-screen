import { paletteAt } from '../world/daylight';
import { createTank, resizeTank, stepTank } from '../world/tank';
import { catchUp, loadTank, saveTank } from '../world/save';
import { SPECIES } from '../world/species';
import type { Fish, Tank } from '../world/types';
import { Renderer } from '../render/renderer';
import { sandPuff } from '../render/effects';
import { TankPointer } from './pointer';
import { hourNow } from './clock';

/** The tank runs at most this many frames a second: smooth for slow water, light on the machine. */
const FPS_CAP = 30;
const SAVE_EVERY = 30;
/** Longest step simulated in one go; longer gaps (a sleeping laptop) are caught up separately. */
const MAX_STEP = 0.1;
/** Tank width for a 16:9 window, used until the window reports a real size. */
const DEFAULT_WIDTH = 1778;

const lightSecondsAgo = (secondsAgo: number): number => {
  const d = new Date(Date.now() - secondsAgo * 1000);
  return paletteAt(d.getHours() + d.getMinutes() / 60).light;
};

export interface TankSceneHooks {
  onHover(fish: Fish | null, clientX: number, clientY: number): void;
}

/** Owns the living tank: loading it, running it, drawing it and saving it. */
export class TankScene {
  private tank: Tank;
  private readonly renderer: Renderer;
  private readonly pointer: TankPointer;
  private lastFrame = 0;
  private sinceSave = 0;
  private visibleSince = performance.now();
  private running = false;
  private frameId = 0;
  private stoppedAt: number | null = null;
  /** Average milliseconds of work per frame, for checking the tank stays light. */
  frameCost = 0;

  constructor(private readonly canvas: HTMLCanvasElement, hooks: TankSceneHooks) {
    const width = innerWidth > 0 && innerHeight > 0 ? (innerWidth / innerHeight) * 1000 : DEFAULT_WIDTH;
    const saved = this.readSave();
    if (saved) {
      this.tank = saved.tank;
      catchUp(this.tank, (Date.now() - saved.savedAt) / 1000, lightSecondsAgo, width);
    } else {
      this.tank = createTank(width);
    }
    this.renderer = new Renderer(canvas, this.tank);
    this.pointer = new TankPointer(canvas, () => this.tank, {
      onHover: hooks.onHover,
      onPlanted: (x, y) => sandPuff(this.renderer.effects, x, y, paletteAt(hourNow()).sand),
    });
    this.fit();
    addEventListener('resize', () => this.fit());
    addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => this.onVisibility());
  }

  /** Runs the tank. After a stop, the time away is caught up the same way as a closed window. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.canvas.hidden = false;
    if (this.stoppedAt !== null) {
      catchUp(this.tank, (performance.now() - this.stoppedAt) / 1000, lightSecondsAgo, this.tank.width);
      this.stoppedAt = null;
    }
    this.lastFrame = 0;
    this.fit();
    this.frameId = requestAnimationFrame((t) => this.frame(t));
  }

  /** Pauses the tank and hides it, so another scene costs nothing extra. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.canvas.hidden = true;
    this.stoppedAt = performance.now();
    this.save();
  }

  describe(f: Fish): string {
    const hours = f.age / 3600;
    const age = hours < 1 ? `${Math.max(1, Math.round(f.age / 60))} min old` : hours < 48 ? `${Math.round(hours)} h old` : `${Math.round(hours / 24)} days old`;
    return `${f.name} · ${SPECIES[f.species].label} · ${age}`;
  }

  private readSave(): ReturnType<typeof loadTank> {
    try {
      return loadTank(localStorage);
    } catch (err) {
      console.warn('[tank] saved tank could not be read; starting a new one', err);
      return null;
    }
  }

  private save(): void {
    try {
      saveTank(this.tank, localStorage, Date.now());
    } catch (err) {
      console.warn('[tank] could not save the tank', err);
    }
  }

  private fit(): void {
    // A window still being laid out (or minimised) reports zero size; keep the last good shape.
    if (innerWidth === 0 || innerHeight === 0) return;
    const width = this.renderer.resize(innerWidth, innerHeight);
    resizeTank(this.tank, width);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
  }

  private onVisibility(): void {
    if (!this.running) return;
    if (document.visibilityState === 'hidden') {
      this.save();
      return;
    }
    const away = (performance.now() - this.visibleSince) / 1000;
    if (away > 5) catchUp(this.tank, away, lightSecondsAgo, this.tank.width);
    this.lastFrame = 0;
  }

  private frame(now: number): void {
    this.frameId = requestAnimationFrame((t) => this.frame(t));
    if (document.visibilityState === 'hidden') return;
    this.visibleSince = now;
    if (this.lastFrame && now - this.lastFrame < 1000 / FPS_CAP - 2) return;
    const dt = this.lastFrame ? Math.min(MAX_STEP, (now - this.lastFrame) / 1000) : 1 / FPS_CAP;
    this.lastFrame = now;

    const started = performance.now();
    const pal = paletteAt(hourNow());
    this.pointer.tick(dt);
    stepTank(this.tank, dt, pal.light);
    this.renderer.render(this.tank, pal, dt, now / 1000);
    this.frameCost = this.frameCost * 0.95 + (performance.now() - started) * 0.05;

    this.sinceSave += dt;
    if (this.sinceSave > SAVE_EVERY) {
      this.sinceSave = 0;
      this.save();
    }
  }
}
