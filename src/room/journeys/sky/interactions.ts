import { hash } from '../noise';
import { picture, type Sprites } from './sprites';

const MAX_LANTERNS = 48;
const MAX_BAGS = 8;
const LIFT_SECONDS = 6;
const LIFT_PIXELS = 17;
const LANTERN_LIFE = 44;

interface Lantern { x: number; y: number; age: number; seed: number }
interface Bag { x: number; y: number; speed: number }

export class Interactions {
  private readonly lanterns: Lantern[] = [];
  private readonly bags: Bag[] = [];
  private liftAge = LIFT_SECONDS;
  private serial = 0;

  get lift(): number {
    // A quick, smooth rise is visible immediately; the longer return feels buoyant.
    return LIFT_PIXELS * Math.min(1, this.liftAge / 0.5) * Math.max(0, 1 - this.liftAge / LIFT_SECONDS);
  }

  reset(): void {
    this.lanterns.length = 0;
    this.bags.length = 0;
  }

  drop(x: number): void {
    this.liftAge = 0;
    if (this.bags.length >= MAX_BAGS) this.bags.shift();
    this.bags.push({ x, y: 246, speed: 8 });
  }

  release(x: number, y: number): void {
    if (this.lanterns.length >= MAX_LANTERNS) this.lanterns.shift();
    this.lanterns.push({ x, y, age: 0, seed: this.serial++ });
  }

  burst(x: number, y: number): void {
    for (let i = 0; i < 12; i++) this.release(x - 16 + hash(this.serial + i) * 32, y - hash(i) * 7);
  }

  draw(ctx: CanvasRenderingContext2D, sprites: Sprites, dt: number, night: number): void {
    this.liftAge = Math.min(LIFT_SECONDS, this.liftAge + dt);
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const bag = this.bags[i];
      bag.speed += dt * 28;
      bag.y += dt * bag.speed;
      picture(ctx, sprites.bag, bag.x - 3, bag.y);
      if (bag.y > 280) this.bags.splice(i, 1);
    }
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const lantern = this.lanterns[i];
      lantern.age += dt;
      lantern.y -= dt * (4 + hash(lantern.seed) * 2);
      lantern.x += dt * (1.5 + Math.sin(lantern.age * 0.6 + lantern.seed));
      const scale = Math.max(0.4, 1 - lantern.age / 65);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (LANTERN_LIFE - lantern.age) / 3);
      ctx.globalAlpha *= 0.65 + night * 0.35;
      picture(ctx, sprites.lanternGlow, lantern.x + 2 - 12 * scale, lantern.y + 3 - 12 * scale, scale);
      ctx.globalAlpha = Math.min(1, (LANTERN_LIFE - lantern.age) / 3);
      picture(ctx, sprites.lantern, lantern.x, lantern.y, scale);
      ctx.restore();
      if (lantern.age >= LANTERN_LIFE || lantern.y < -10) this.lanterns.splice(i, 1);
    }
  }
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number, size: number): void {
  ctx.save();
  ctx.fillStyle = '#ffcc82';
  ctx.globalAlpha *= 0.06 * strength;
  for (let i = 3; i > 0; i--) {
    const r = size * i / 3;
    ctx.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  }
  ctx.restore();
}
