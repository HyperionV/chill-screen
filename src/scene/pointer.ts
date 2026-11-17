import { approach } from '../world/math';
import { floorAt, TANK_HEIGHT } from '../world/geometry';
import { bodyLength } from '../world/fish';
import { dropFood, isOnSand, plantSprout, stir, tapSnail } from '../world/tank';
import type { Fish, Tank } from '../world/types';

/** Movement (world units) that turns a press into a drag instead of a click. */
const DRAG_THRESHOLD = 10;
const STILL_SPEED = 60;

export interface PointerEvents {
  /** The fish under the pointer changed; null when there is none. */
  onHover(fish: Fish | null, clientX: number, clientY: number): void;
  onPlanted(x: number, y: number): void;
}

/** Turns mouse movement over the tank into cursor state, food, sprouts, taps and currents. */
export class TankPointer {
  private last: { x: number; y: number; t: number } | null = null;
  private press: { x: number; y: number; dragging: boolean } | null = null;
  private hovered: Fish | null = null;

  constructor(private readonly el: HTMLElement, private readonly getTank: () => Tank, private readonly events: PointerEvents) {
    el.addEventListener('pointermove', (e) => this.move(e));
    el.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('pointerup', (e) => this.up(e));
    el.addEventListener('pointerleave', () => this.leave());
  }

  private toWorld(e: PointerEvent): { x: number; y: number } {
    const k = TANK_HEIGHT / this.el.clientHeight;
    return { x: e.clientX * k, y: e.clientY * k };
  }

  private move(e: PointerEvent): void {
    const tank = this.getTank();
    const p = this.toWorld(e);
    const now = performance.now() / 1000;
    const c = tank.cursor;
    if (this.last && now > this.last.t) {
      const dt = now - this.last.t;
      const v = Math.hypot(p.x - this.last.x, p.y - this.last.y) / dt;
      c.speed = approach(c.speed, Math.min(v, 5000), 12, dt);
      if (this.press) {
        if (Math.hypot(p.x - this.press.x, p.y - this.press.y) > DRAG_THRESHOLD) this.press.dragging = true;
        if (this.press.dragging) stir(tank, p.x, p.y, ((p.x - this.last.x) / dt) * 0.4, ((p.y - this.last.y) / dt) * 0.4);
      }
    }
    c.x = p.x;
    c.y = p.y;
    c.inside = true;
    this.last = { x: p.x, y: p.y, t: now };
    this.updateHover(tank, e.clientX, e.clientY);
  }

  private down(e: PointerEvent): void {
    const p = this.toWorld(e);
    this.press = { x: p.x, y: p.y, dragging: false };
    this.el.setPointerCapture(e.pointerId);
  }

  private up(e: PointerEvent): void {
    const press = this.press;
    this.press = null;
    if (!press || press.dragging) return;
    const tank = this.getTank();
    const p = this.toWorld(e);
    if (tapSnail(tank, p.x, p.y)) return;
    if (isOnSand(p.x, p.y)) {
      const z = Math.min(1, Math.max(0, (p.y - floorAt(p.x, 0)) / (floorAt(p.x, 1) - floorAt(p.x, 0))));
      if (plantSprout(tank, p.x, z)) this.events.onPlanted(p.x, p.y);
      return;
    }
    dropFood(tank, p.x, p.y);
  }

  private leave(): void {
    const tank = this.getTank();
    tank.cursor.inside = false;
    this.last = null;
    if (this.hovered) {
      this.hovered = null;
      this.events.onHover(null, 0, 0);
    }
  }

  /** Called every frame: speed fades when the pointer rests, and resting time accumulates. */
  tick(dt: number): void {
    const c = this.getTank().cursor;
    if (this.last && performance.now() / 1000 - this.last.t > 0.05) c.speed = approach(c.speed, 0, 6, dt);
    c.stillFor = c.speed < STILL_SPEED ? c.stillFor + dt : 0;
  }

  private updateHover(tank: Tank, clientX: number, clientY: number): void {
    const c = tank.cursor;
    let found: Fish | null = null;
    let best = Infinity;
    for (const f of tank.fish) {
      const d = Math.hypot(f.x - c.x, f.y - c.y);
      if (d < bodyLength(f) * 0.65 + 6 && d < best) {
        best = d;
        found = f;
      }
    }
    if (found !== this.hovered || found) {
      this.hovered = found;
      this.events.onHover(found, clientX, clientY);
    }
  }
}
