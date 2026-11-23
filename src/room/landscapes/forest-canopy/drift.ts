/**
 * Things that cross the Forest Canopy: leaves that let go and spin down, a bird now and then through the gap in the
 * leaves, and the shower of leaves a click shakes loose. Fixed pools, no allocation while it plays.
 */
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { LEAF_FLECKS } from './foliage';
import { DESIGN_HEIGHT } from './layout';

const AMBIENT_LEAVES = 12;
const FALL_MIN = 5;
const FALL_RANGE = 7;
const SWAY_MIN = 6;
const SWAY_RANGE = 9;
const BURST_LEAVES = 18;
const BURST_SECONDS = 5;
const BURST_FALL = 22;
const BURST_SPREAD = 46;
/** Burst leaves start in the canopy, in this band of rows. */
const BURST_ROW_FROM = 8;
const BURST_ROW_TO = 70;
const BIRD_EVERY = 38;
const BIRD_CROSSING = 9;
const BIRD_ROW = 58;
const BIRD_WAVE = 6;
const BIRD_INK = '#16241c';
const BIRD_DAY_FROM = 0.4;

interface Falling {
  x: number;
  seed: number;
  born: number;
}

export class Drift {
  private readonly ambient: Falling[] = [];
  private readonly burst: Falling[] = [];

  constructor(private readonly width: number) {
    for (let i = 0; i < AMBIENT_LEAVES; i++) this.ambient.push({ x: hash(i * 3.3) * width, seed: i, born: 0 });
    for (let i = 0; i < BURST_LEAVES; i++) this.burst.push({ x: 0, seed: 100 + i, born: -Infinity });
  }

  /** A click shakes leaves loose from the canopy around column `x`. */
  shake(time: number, x: number): void {
    for (const leaf of this.burst) {
      leaf.x = x + (hash(leaf.seed + time) - 0.5) * BURST_SPREAD * 2;
      leaf.born = time;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, day: number): void {
    for (const leaf of this.ambient) {
      const speed = FALL_MIN + hash(leaf.seed * 1.7) * FALL_RANGE;
      const y = ((time * speed + hash(leaf.seed * 5.1) * DESIGN_HEIGHT) % (DESIGN_HEIGHT + 30)) - 15;
      const sway = Math.sin(time * 0.8 + leaf.seed) * (SWAY_MIN + hash(leaf.seed * 2.9) * SWAY_RANGE);
      this.fleck(ctx, leaf, leaf.x + sway + breeze(time, leaf.x) * 3, y, time);
    }
    for (const leaf of this.burst) {
      const age = time - leaf.born;
      if (age < 0 || age > BURST_SECONDS) continue;
      const y = BURST_ROW_FROM + hash(leaf.seed * 4.1) * (BURST_ROW_TO - BURST_ROW_FROM) + age * BURST_FALL;
      const sway = Math.sin(age * 2.1 + leaf.seed) * 7;
      this.fleck(ctx, leaf, leaf.x + sway, y, time);
    }
    this.bird(ctx, time, day);
  }

  private fleck(ctx: CanvasRenderingContext2D, leaf: Falling, x: number, y: number, time: number): void {
    ctx.fillStyle = LEAF_FLECKS[leaf.seed % LEAF_FLECKS.length];
    const flat = Math.sin(time * 3 + leaf.seed * 2) > 0;
    ctx.fillRect(Math.round(x), Math.round(y), flat ? 2 : 1, flat ? 1 : 2);
  }

  private bird(ctx: CanvasRenderingContext2D, time: number, day: number): void {
    if (day < BIRD_DAY_FROM) return;
    const t = (time % BIRD_EVERY) / BIRD_CROSSING;
    if (t >= 1) return;
    const x = Math.round(this.width + 8 - t * (this.width + 16));
    const y = Math.round(BIRD_ROW + Math.sin(t * BIRD_WAVE) * 6);
    const up = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = BIRD_INK;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(x - 1, y + (up ? -1 : 1), 1, 1);
    ctx.fillRect(x + 1, y + (up ? -1 : 1), 1, 1);
    ctx.fillRect(x - 2, y + (up ? -2 : 1), 1, 1);
    ctx.fillRect(x + 2, y + (up ? -2 : 1), 1, 1);
  }
}
