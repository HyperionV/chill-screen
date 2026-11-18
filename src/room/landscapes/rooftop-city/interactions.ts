import { clamp } from '../../../world/math';
import type { RooftopCreatures } from './creatures';
import type { ForegroundLayer } from './foreground';
import type { ScreenRect, Skyline } from './skyline';

const BILLBOARD_CYCLE_SECONDS = 45;
const BILLBOARD_WIPE_SECONDS = 0.26;
const POINTER_SWAY_RADIUS = 52;

/**
 * Coordinates interactive pointer sway (for laundry & plants), billboard advert cycling,
 * and click routing across the cat, pigeons, neighbour, billboard, blimp, and windows.
 */
export class RooftopInteractions {
  private prevPointer: { x: number; y: number } | null = null;
  private pointerVx = 0;

  private advertIndex = 0;
  private prevAdvertIndex = 0;
  private advertCycleTimer = BILLBOARD_CYCLE_SECONDS;
  private advertWipeTimer = 0;
  private billboardRect: ScreenRect | null = null;

  update(dt: number, pointerDesign: { x: number; y: number } | null): void {
    if (pointerDesign && this.prevPointer) {
      const instVx = clamp((pointerDesign.x - this.prevPointer.x) / Math.max(0.01, dt), -220, 220);
      this.pointerVx = this.pointerVx * 0.65 + instVx * 0.35;
    } else {
      this.pointerVx *= Math.exp(-5 * dt);
    }
    this.prevPointer = pointerDesign ? { x: pointerDesign.x, y: pointerDesign.y } : null;

    this.advertCycleTimer -= dt;
    if (this.advertCycleTimer <= 0) {
      this.advanceAdvert();
    }
    if (this.advertWipeTimer > 0) {
      this.advertWipeTimer = Math.max(0, this.advertWipeTimer - dt);
    }
  }

  /** Extra horizontal sway impulse for laundry & plants near a moving pointer. */
  breezeAt(sx: number, sy: number, pointerDesign: { x: number; y: number } | null): number {
    if (!pointerDesign) return 0;
    const dist = Math.hypot(pointerDesign.x - sx, pointerDesign.y - sy);
    if (dist >= POINTER_SWAY_RADIUS) return 0;
    const falloff = 1 - dist / POINTER_SWAY_RADIUS;
    const dir = Math.abs(this.pointerVx) > 8 ? Math.sign(this.pointerVx) : Math.sign(sx - pointerDesign.x || 1);
    const strength = Math.max(0.45, Math.min(1.6, Math.abs(this.pointerVx) / 90));
    return dir * falloff * strength * 2.8;
  }

  setBillboardRect(rect: ScreenRect | null): void {
    this.billboardRect = rect;
  }

  /** Current advert index, previous index during wipe, and 0..1 wipe progress. */
  get advertState(): { current: number; previous: number; wipe: number } {
    const wipe = this.advertWipeTimer > 0 ? 1 - this.advertWipeTimer / BILLBOARD_WIPE_SECONDS : 1;
    return { current: this.advertIndex, previous: this.prevAdvertIndex, wipe };
  }

  /** Routes a stage click in design pixels to the first matching interactive element. */
  press(
    dx: number,
    dy: number,
    camX: number,
    designW: number,
    night: number,
    skyline: Skyline,
    creatures: RooftopCreatures,
    foreground: ForegroundLayer,
  ): void {
    if (creatures.tryStretchCat(dx, dy)) return;
    if (creatures.tryScatterPigeons(dx, dy)) return;
    if (creatures.tryWaveNeighbour(dx, dy)) return;
    if (this.trySwitchBillboard(dx, dy)) return;

    const blimpRect = skyline.getBlimpRect();
    if (
      blimpRect &&
      dx >= blimpRect.x - 4 &&
      dx <= blimpRect.x + blimpRect.w + 4 &&
      dy >= blimpRect.y - 4 &&
      dy <= blimpRect.y + blimpRect.h + 4
    ) {
      creatures.releaseBalloons(blimpRect);
      return;
    }

    if (foreground.tryClickPuddle(dx, dy)) return;
    if (!foreground.coversSkyline(dx, dy, camX, designW)) {
      skyline.toggleWindowAt(dx, dy, camX, designW, night);
    }
  }

  private trySwitchBillboard(dx: number, dy: number): boolean {
    const r = this.billboardRect;
    if (!r || dx < r.x || dx > r.x + r.w || dy < r.y || dy > r.y + r.h) return false;
    this.advanceAdvert();
    return true;
  }

  private advanceAdvert(): void {
    this.prevAdvertIndex = this.advertIndex;
    this.advertIndex = (this.advertIndex + 1) % 3;
    this.advertCycleTimer = BILLBOARD_CYCLE_SECONDS;
    this.advertWipeTimer = BILLBOARD_WIPE_SECONDS;
  }
}
