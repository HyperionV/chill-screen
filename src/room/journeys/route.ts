import { readJson, writeJson } from '../../store';

/** One stretch of a journey: its name, and how long it lasts at the normal pace. */
export interface Chapter {
  name: string;
  seconds: number;
}

const SAVE_EVERY_SECONDS = 5;

const isSeconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isChapterIndex = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0);

/** A chapter at rest sits half way through, clear of the dissolve into the next one at its end. */
const REST_POINT = 0.5;

/**
 * Where a journey is along its route, in time. It moves with the pace, comes back where it was after a reload, wraps
 * to the start at the end, and `?chapter=2.5` in the address jumps to the middle of the third chapter (for checking).
 * A chapter can be locked: the route then rests in the middle of it, where the picture is fully that chapter, until
 * the lock is lifted.
 */
export class Route {
  private seconds: number;
  private sinceSave = 0;
  private locked: number | null;
  readonly total: number;

  constructor(private readonly id: string, readonly chapters: readonly Chapter[]) {
    this.total = chapters.reduce((sum, c) => sum + c.seconds, 0);
    const asked = Number(new URLSearchParams(location.search).get('chapter'));
    const jump = new URLSearchParams(location.search).has('chapter') && Number.isFinite(asked);
    const saved = readJson<number | null>(this.lockKey, null, isChapterIndex);
    this.locked = !jump && saved !== null && saved < chapters.length ? saved : null;
    this.seconds = jump ? this.startOf(asked) : this.locked !== null ? this.startOf(this.locked + REST_POINT) : readJson<number>(this.key, 0, isSeconds) % this.total;
  }

  private get key(): string {
    return `chillscreen.route.${this.id}`;
  }

  private get lockKey(): string {
    return `${this.key}.lock`;
  }

  /** The time at which a (possibly fractional) chapter number begins: 2.5 is half way through the third. */
  private startOf(chapter: number): number {
    const whole = Math.max(0, Math.min(this.chapters.length - 1, Math.floor(chapter)));
    const before = this.chapters.slice(0, whole).reduce((sum, c) => sum + c.seconds, 0);
    return before + (chapter - whole) * this.chapters[whole].seconds;
  }

  /** Moves along the route. `speed` is the pace multiplier (0 holds still). */
  advance(dt: number, speed: number): void {
    if (speed <= 0 || this.locked !== null) return;
    this.seconds = (this.seconds + dt * speed) % this.total;
    this.sinceSave += dt;
    if (this.sinceSave >= SAVE_EVERY_SECONDS) {
      this.sinceSave = 0;
      writeJson(this.key, Math.round(this.seconds));
    }
  }

  /** The chapter the route is held on, or null while it moves on by itself. */
  get lockedChapter(): number | null {
    return this.locked;
  }

  /** Goes to the middle of a chapter. A held route stays held, now on this chapter. */
  goTo(index: number): void {
    if (index < 0 || index >= this.chapters.length) return;
    this.seconds = this.startOf(index + REST_POINT);
    writeJson(this.key, Math.round(this.seconds));
    if (this.locked !== null) this.setLock(index);
  }

  /** Holds the route on the chapter it is in now, or lets it move on. */
  toggleLock(): void {
    if (this.locked !== null) {
      this.setLock(null);
      return;
    }
    this.goTo(this.now.index);
    this.setLock(this.now.index);
  }

  private setLock(index: number | null): void {
    this.locked = index;
    writeJson(this.lockKey, index);
  }

  /** The chapter now, how far through it (0..1), and the number of the next one (wrapping at the end). */
  get now(): { index: number; name: string; t: number; next: number } {
    let left = this.seconds;
    for (let i = 0; i < this.chapters.length; i++) {
      const c = this.chapters[i];
      if (left < c.seconds) return { index: i, name: c.name, t: left / c.seconds, next: (i + 1) % this.chapters.length };
      left -= c.seconds;
    }
    return { index: 0, name: this.chapters[0].name, t: 0, next: 1 % this.chapters.length };
  }

  /** How far along the whole route, 0..1. Handy for slow drifts such as a night sky running from dusk to dawn. */
  get progress(): number {
    return this.seconds / this.total;
  }
}
