import { clamp, rand } from '../../../world/math';
import type { SpritePair } from './cast-sprites';
import type { SpriteBox } from './sprites';

export interface Ring {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  maxR: number;
  color: string;
  fishSplash: boolean;
}

export interface Crumb {
  x: number;
  y: number;
  age: number;
  eaten: boolean;
}

export interface WaterBounds {
  shoreY: number;
  deckY: number;
  quayHeight: number;
  designW: number;
}

interface DucklingState {
  x: number;
  y: number;
  dir: 1 | -1;
}

interface DuckDrawEntry {
  x: number;
  y: number;
  dir: 1 | -1;
  isMother: boolean;
  hop: number;
}

const MAX_DUCKLINGS = 5;
const MAX_RINGS = 32;

const INITIAL_DIR: 1 | -1 = 1;

/**
 * Mother duck and her trailing ducklings, plus elliptical water surface rings (rising fish, splashes, crumb ripples).
 */
export class DuckFamily {
  private readonly mother: { x: number; y: number; dir: 1 | -1; startle: number; peck: number } = {
    x: 170,
    y: 214,
    dir: INITIAL_DIR,
    startle: 0,
    peck: 0,
  };
  private readonly ducklings: DucklingState[] = Array.from({ length: MAX_DUCKLINGS }, (_, i) => ({
    x: 152 - i * 11,
    y: 215,
    dir: INITIAL_DIR,
  }));
  private readonly renderList: DuckDrawEntry[] = Array.from({ length: 1 + MAX_DUCKLINGS }, (_, i) => ({
    x: 0,
    y: 0,
    dir: 1,
    isMother: i === 0,
    hop: 0,
  }));
  private fedTimer = 0;
  private lastChapter = -1;
  private fishRiseTimer = 2.0;
  readonly rings: Ring[] = [];

  /** True if stage pixel (sx, sy) is within `radiusStagePx` of the mother duck or any duckling. */
  isNear(sx: number, sy: number, unit: number, radiusStagePx: number): boolean {
    if (Math.hypot(sx - this.mother.x * unit, sy - this.mother.y * unit) <= radiusStagePx) return true;
    for (const d of this.ducklings) {
      if (Math.hypot(sx - d.x * unit, sy - d.y * unit) <= radiusStagePx) return true;
    }
    return false;
  }

  addRing(
    designX: number,
    designY: number,
    maxR = 13,
    color = 'rgba(224,242,250,0.65)',
    fishSplash = false,
  ): void {
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({ x: designX, y: designY, age: 0, maxAge: 1.7, maxR, color, fishSplash });
  }

  startle(): void {
    this.mother.startle = 0.8;
    this.addRing(this.mother.x, this.mother.y + 1, 12);
  }

  update(dt: number, time: number, effectiveSpeed: number, chapter: number, bounds: WaterBounds, crumbs: Crumb[]): void {
    if (this.lastChapter !== -1 && this.lastChapter !== chapter) {
      this.mother.x = clamp(this.mother.x, 90, Math.max(120, bounds.designW - 90));
    }
    this.lastChapter = chapter;

    if (this.fedTimer > 0) this.fedTimer = Math.max(0, this.fedTimer - dt);
    if (this.mother.startle > 0) this.mother.startle = Math.max(0, this.mother.startle - dt);
    if (this.mother.peck > 0) this.mother.peck = Math.max(0, this.mother.peck - dt);

    const minY = bounds.shoreY + 14;
    const maxY = bounds.deckY - 12;
    const homeY = clamp(bounds.shoreY + (bounds.deckY - bounds.shoreY) * 0.45, minY, maxY);

    const motherCrumb = this.nearestCrumb(this.mother.x, this.mother.y, crumbs);
    if (motherCrumb) {
      const dx = motherCrumb.x - this.mother.x;
      const dy = motherCrumb.y - this.mother.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 5) {
        motherCrumb.eaten = true;
        this.mother.peck = 0.35;
        this.fedTimer = 22;
        this.addRing(motherCrumb.x, motherCrumb.y, 9);
      } else {
        const swim = 28;
        this.mother.x += (dx / dist) * swim * dt;
        this.mother.y += (dy / dist) * swim * dt;
        if (Math.abs(dx) > 0.5) this.mother.dir = dx > 0 ? 1 : -1;
      }
    } else {
      const closeness = this.fedTimer > 0 ? 18 : 0;
      const homeX = clamp(bounds.designW * 0.38 + closeness + Math.sin(time * 0.17) * 28, 60, bounds.designW - 60);
      const targetY = homeY + Math.sin(time * 0.29) * 5;
      this.mother.x += (homeX - this.mother.x) * Math.min(1, dt * 0.9);
      this.mother.y += (targetY - this.mother.y) * Math.min(1, dt * 0.9);
      this.mother.dir = effectiveSpeed > 0.05 || homeX >= this.mother.x ? 1 : -1;
    }

    this.mother.y = clamp(this.mother.y, minY, maxY);

    const trailGap = this.fedTimer > 0 ? 8 : 11;
    let leadX = this.mother.x;
    let leadY = this.mother.y;
    for (let i = 0; i < this.ducklings.length; i++) {
      const d = this.ducklings[i];
      const crumb = this.nearestCrumb(d.x, d.y, crumbs);
      if (crumb) {
        const cx = crumb.x - d.x;
        const cy = crumb.y - d.y;
        const dist = Math.hypot(cx, cy);
        if (dist < 4.5) {
          crumb.eaten = true;
          this.fedTimer = 22;
          this.addRing(crumb.x, crumb.y, 8);
        } else {
          const rush = 31;
          d.x += (cx / dist) * rush * dt;
          d.y += (cy / dist) * rush * dt;
          if (Math.abs(cx) > 0.3) d.dir = cx > 0 ? 1 : -1;
        }
      } else {
        const wobble = Math.sin(time * 2.4 + i * 1.1) * (this.fedTimer > 0 ? 1.4 : 2.5);
        const tx = leadX - this.mother.dir * trailGap;
        const ty = clamp(leadY + wobble, minY, maxY);
        const dx = tx - d.x;
        d.x += dx * Math.min(1, dt * 3.4);
        d.y += (ty - d.y) * Math.min(1, dt * 3.4);
        if (Math.abs(dx) > 0.3) d.dir = dx > 0 ? 1 : -1;
      }
      d.y = clamp(d.y, minY, maxY);
      leadX = d.x;
      leadY = d.y;
    }

    this.fishRiseTimer -= dt;
    if (this.fishRiseTimer <= 0) {
      this.fishRiseTimer = rand(2.2, 5.0);
      const rx = rand(36, Math.max(70, bounds.designW - 36));
      const ry = rand(bounds.shoreY + 7, bounds.deckY - 14);
      this.addRing(rx, ry, 13, 'rgba(235,248,255,0.72)', true);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].age += dt;
      if (this.rings[i].age >= this.rings[i].maxAge) this.rings.splice(i, 1);
    }
  }

  private nearestCrumb(x: number, y: number, crumbs: Crumb[]): Crumb | null {
    let best: Crumb | null = null;
    let bestDist = Infinity;
    for (const c of crumbs) {
      if (c.eaten) continue;
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  drawRings(ctx: CanvasRenderingContext2D, unit: number): void {
    const dot = Math.max(1, Math.round(unit));
    for (const r of this.rings) {
      const k = r.age / r.maxAge;
      const rx = Math.round(r.x * unit);
      const ry = Math.round(r.y * unit);
      const rad = Math.max(2, Math.round((2 + k * r.maxR) * unit));

      ctx.fillStyle = r.color;
      ctx.globalAlpha = (1 - k) * 0.78;
      // Crisp pixel-art perspective ellipse: horizontal top/bottom arcs + side tips
      const innerW = Math.round(rad * 1.3);
      const midY = Math.max(1, Math.round(rad * 0.28));
      ctx.fillRect(rx - Math.round(innerW / 2), ry - midY, innerW, dot);
      ctx.fillRect(rx - Math.round(innerW / 2), ry + midY, innerW, dot);
      ctx.fillRect(rx - rad, ry, Math.max(dot, Math.round(rad * 0.35)), dot);
      ctx.fillRect(rx + rad - Math.max(dot, Math.round(rad * 0.35)), ry, Math.max(dot, Math.round(rad * 0.35)), dot);

      // Second concentric ripple for rising fish or larger splashes
      if (r.fishSplash && r.age > 0.2) {
        const rad2 = Math.max(1, Math.round((rad * 0.55)));
        const midY2 = Math.max(1, Math.round(rad2 * 0.25));
        ctx.globalAlpha = (1 - k) * 0.55;
        ctx.fillRect(rx - Math.round(rad2 * 0.65), ry - midY2, Math.round(rad2 * 1.3), dot);
        ctx.fillRect(rx - Math.round(rad2 * 0.65), ry + midY2, Math.round(rad2 * 1.3), dot);
      }
      // Tiny silver splash pip right as the fish breaks the surface
      if (r.fishSplash && r.age < 0.22) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#e8f4fa';
        ctx.fillRect(rx, ry - dot * 2, dot, dot * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawDucks(ctx: CanvasRenderingContext2D, motherPair: SpritePair, ducklingPair: SpritePair, unit: number): void {
    ctx.imageSmoothingEnabled = false;
    const motherHop =
      this.mother.startle > 0
        ? Math.abs(Math.sin(this.mother.startle * Math.PI * 3)) * 2.5
        : this.mother.peck > 0
          ? -1.2
          : 0;
    const chickHop = this.mother.startle > 0 ? Math.abs(Math.sin(this.mother.startle * Math.PI * 3)) * 2 : 0;

    const head = this.renderList[0];
    head.x = this.mother.x;
    head.y = this.mother.y;
    head.dir = this.mother.dir;
    head.isMother = true;
    head.hop = motherHop;

    for (let i = 0; i < this.ducklings.length; i++) {
      const d = this.ducklings[i];
      const entry = this.renderList[i + 1];
      entry.x = d.x;
      entry.y = d.y;
      entry.dir = d.dir;
      entry.isMother = false;
      entry.hop = chickHop;
    }

    // Insertion sort on 6 entries: zero allocations per frame
    for (let i = 1; i < this.renderList.length; i++) {
      const cur = this.renderList[i];
      let j = i - 1;
      while (j >= 0 && this.renderList[j].y > cur.y) {
        this.renderList[j + 1] = this.renderList[j];
        j--;
      }
      this.renderList[j + 1] = cur;
    }

    for (const d of this.renderList) {
      const pair = d.isMother ? motherPair : ducklingPair;
      const sprite: SpriteBox = d.dir === 1 ? pair.right : pair.left;
      const sx = Math.round(d.x * unit);
      const sy = Math.round((d.y - d.hop) * unit);
      const dw = Math.max(1, Math.round(sprite.w * unit));
      const dh = Math.max(1, Math.round(sprite.h * unit));
      const dx = Math.round(sx - dw / 2);
      const dy = Math.round(sy - dh);
      ctx.fillStyle = 'rgba(240,248,255,0.5)';
      ctx.fillRect(sx - Math.round(dw * 0.55), Math.round(d.y * unit), Math.round(dw * 1.1), Math.max(1, Math.round(unit)));
      ctx.drawImage(sprite.canvas, 0, 0, sprite.w, sprite.h, dx, dy, dw, dh);
    }
  }
}
