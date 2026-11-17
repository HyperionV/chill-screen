import { clamp, rand } from '../../../world/math';
import { hash } from '../noise';
import {
  createCastPopulation,
  type Dragonfly,
  type FrogState,
  type Gull,
  type RoamAnimal,
  type ShoreBird,
  type Swallow,
} from './cast-seed';
import { buildCastSprites, type SpritePair } from './cast-sprites';
import { ANGLER_SPOTS, CHAPTER_START, LOCK, wrapDelta } from './chapters';
import { DuckFamily, type Crumb, type WaterBounds } from './ducks';
import type { SpriteBox } from './sprites';

export type { Crumb, WaterBounds } from './ducks';

const FARMER_X = CHAPTER_START[5] + 1580;

/** Manages all people and wildlife along the canal bank and water. */
export class CanalCast {
  private readonly sprites = buildCastSprites();
  readonly ducks = new DuckFamily();

  private readonly anglerWave = new Map<number, number>();
  private keeperWaveTimer = 0;
  private farmerWaveTimer = 0;

  private readonly shoreBirds: ShoreBird[];
  private readonly roamers: RoamAnimal[];
  private readonly frogs: FrogState[];
  private readonly swallows: Swallow[];
  private readonly gulls: Gull[];
  private readonly dragonflies: Dragonfly[];

  constructor() {
    const pop = createCastPopulation();
    this.shoreBirds = pop.shoreBirds;
    this.roamers = pop.roamers;
    this.frogs = pop.frogs;
    this.swallows = pop.swallows;
    this.gulls = pop.gulls;
    this.dragonflies = pop.dragonflies;
  }

  isNearDucks(sx: number, sy: number, unit: number, radiusStagePx = 48 * unit): boolean {
    return this.ducks.isNear(sx, sy, unit, radiusStagePx);
  }

  addRing(
    designX: number,
    designY: number,
    maxR = 13,
    color = 'rgba(224,242,250,0.65)',
    fishSplash = false,
  ): void {
    this.ducks.addRing(designX, designY, maxR, color, fishSplash);
  }

  onBellRing(scroll: number, bounds: WaterBounds): void {
    this.ducks.startle();
    for (const b of this.shoreBirds) {
      const dx = wrapDelta(b.wx, scroll);
      if (dx > -25 && dx < bounds.designW + 25 && b.state !== 'fly') {
        this.startleShoreBird(b, dx, bounds.shoreY - 8);
      }
    }
    for (const f of this.frogs) {
      const dx = wrapDelta(f.wx, scroll);
      if (!f.dived && dx > 0 && dx < bounds.designW) {
        f.dived = true;
        f.timer = rand(4, 7);
        this.ducks.addRing(dx, bounds.shoreY + f.dy + 1, 9);
      }
    }
    for (const s of this.swallows) s.scatterTimer = 1.8;
    for (const g of this.gulls) {
      g.startleTimer = 1.6;
      g.vx = -g.vx;
    }
  }

  private startleShoreBird(b: ShoreBird, screenDesignX: number, startY: number): void {
    b.state = 'fly';
    b.flyX = screenDesignX;
    b.flyY = startY;
    b.flyVx = (screenDesignX < 240 ? -1 : 1) * rand(30, 44);
    b.flyVy = -rand(20, 28);
    b.cooldown = rand(10, 16);
  }

  update(
    dt: number,
    time: number,
    scroll: number,
    effectiveSpeed: number,
    chapter: number,
    bounds: WaterBounds,
    pointerDesign: { x: number; y: number } | null,
    crumbs: Crumb[],
  ): void {
    this.ducks.update(dt, time, effectiveSpeed, chapter, bounds, crumbs);
    this.stepShoreBirds(dt, scroll, bounds, pointerDesign);
    this.stepRoamers(dt, scroll, bounds, pointerDesign);
    this.stepAnglersAndPeople(dt, scroll, bounds, pointerDesign);
    this.stepFrogs(dt, scroll, bounds, pointerDesign);
    this.stepAmbientAir(dt, time, chapter, bounds);
  }

  private stepShoreBirds(
    dt: number,
    scroll: number,
    bounds: WaterBounds,
    pointer: { x: number; y: number } | null,
  ): void {
    const perchY = bounds.shoreY - 6;
    for (const b of this.shoreBirds) {
      if (b.state === 'fly') {
        b.flyX += b.flyVx * dt;
        b.flyY += b.flyVy * dt;
        b.cooldown -= dt;
        if (b.cooldown <= 0) {
          b.state = 'still';
          b.timer = rand(4, 9);
        }
        continue;
      }
      const dx = wrapDelta(b.wx, scroll);
      if (dx < -45 || dx > bounds.designW + 45) continue;
      if (pointer && Math.hypot(pointer.x - dx, pointer.y - perchY) < 30) {
        this.startleShoreBird(b, dx, perchY);
        continue;
      }
      b.timer -= dt;
      if (b.timer <= 0) {
        if (b.state === 'still' && b.kind !== 'gull') {
          b.state = 'strike';
          b.timer = b.kind === 'heron' ? 0.55 : 0.8;
          this.ducks.addRing(dx + 6, bounds.shoreY + 3, 9);
        } else {
          b.state = 'still';
          b.timer = rand(4, 10);
        }
      }
    }
  }

  private stepRoamers(
    dt: number,
    scroll: number,
    bounds: WaterBounds,
    pointer: { x: number; y: number } | null,
  ): void {
    for (const r of this.roamers) {
      const dx = wrapDelta(r.wx, scroll);
      if (dx < -60 || dx > bounds.designW + 60) continue;
      if (r.waveTimer > 0) r.waveTimer = Math.max(0, r.waveTimer - dt);
      const ry = bounds.shoreY - (r.kind === 'villager' || r.kind === 'cat' ? bounds.quayHeight : 0) + r.dy;
      if (r.kind === 'villager' && pointer && Math.hypot(pointer.x - dx, pointer.y - (ry - 6)) < 26) {
        r.waveTimer = 2.2;
      }
      r.timer -= dt;
      if (r.state === 'walk') {
        const spd = r.kind === 'villager' ? 7 : r.kind === 'cat' ? 5 : 3.5;
        r.wx += r.dir * spd * dt;
      }
      if (r.timer <= 0) {
        if (r.kind === 'villager') {
          r.state = r.state === 'walk' ? 'idle' : 'walk';
          if (r.state === 'walk' && hash(r.seed + Math.floor(r.wx)) < 0.5) r.dir = r.dir === 1 ? -1 : 1;
          r.timer = rand(2.5, 6);
        } else if (r.kind === 'cat') {
          r.state = r.state === 'stretch' ? 'idle' : r.state === 'idle' ? 'stretch' : 'walk';
          r.timer = rand(2.5, 6);
        } else if (r.kind === 'cow') {
          r.state = r.dy >= 0 ? (r.state === 'drink' ? 'idle' : 'drink') : r.state === 'walk' ? 'idle' : 'walk';
          r.timer = rand(3, 8);
        } else {
          r.state = r.state === 'walk' ? 'idle' : 'walk';
          if (r.state === 'walk') r.dir = r.dir === 1 ? -1 : 1;
          r.timer = rand(2, 6);
        }
      }
    }
  }

  private stepAnglersAndPeople(
    dt: number,
    scroll: number,
    bounds: WaterBounds,
    pointer: { x: number; y: number } | null,
  ): void {
    for (const [key, val] of this.anglerWave) {
      if (val > 0) this.anglerWave.set(key, Math.max(0, val - dt));
    }
    if (this.keeperWaveTimer > 0) this.keeperWaveTimer = Math.max(0, this.keeperWaveTimer - dt);
    if (this.farmerWaveTimer > 0) this.farmerWaveTimer = Math.max(0, this.farmerWaveTimer - dt);
    if (!pointer) return;

    for (const spot of ANGLER_SPOTS) {
      const dx = wrapDelta(spot.wx, scroll);
      const ay = bounds.shoreY - (spot.variant === 'market' || spot.variant === 'harbour' ? bounds.quayHeight : 0) - 7;
      if (Math.hypot(pointer.x - dx, pointer.y - ay) < 28) {
        this.anglerWave.set(spot.chapter, 2.5);
      }
    }
    const keeperX = wrapDelta(LOCK.cottageX - 28, scroll);
    if (Math.hypot(pointer.x - keeperX, pointer.y - (bounds.shoreY - bounds.quayHeight - 7)) < 28) {
      this.keeperWaveTimer = 2.4;
    }
    const farmerX = wrapDelta(FARMER_X, scroll);
    if (Math.hypot(pointer.x - farmerX, pointer.y - (bounds.shoreY - 9)) < 28) {
      this.farmerWaveTimer = 2.4;
    }
  }

  private stepFrogs(
    dt: number,
    scroll: number,
    bounds: WaterBounds,
    pointer: { x: number; y: number } | null,
  ): void {
    for (const f of this.frogs) {
      const dx = wrapDelta(f.wx, scroll);
      if (f.dived) {
        f.timer -= dt;
        if (f.timer <= 0) f.dived = false;
        continue;
      }
      if (dx < -15 || dx > bounds.designW + 15) continue;
      if (pointer && Math.hypot(pointer.x - dx, pointer.y - (bounds.shoreY + f.dy)) < 22) {
        f.dived = true;
        f.timer = rand(4, 7);
        this.ducks.addRing(dx, bounds.shoreY + f.dy, 8);
      }
    }
  }

  private stepAmbientAir(dt: number, time: number, chapter: number, bounds: WaterBounds): void {
    if (chapter === 3 || chapter === 4) {
      for (const s of this.swallows) {
        if (s.scatterTimer > 0) s.scatterTimer = Math.max(0, s.scatterTimer - dt);
        const boost = s.scatterTimer > 0 ? 2.2 : 1;
        s.x += 24 * s.speed * boost * dt;
        s.y = 72 + Math.sin(time * 1.9 * s.speed + s.phase) * 24;
        if (s.x > bounds.designW + 16) s.x = -16;
      }
    }
    if (chapter === 6) {
      for (const g of this.gulls) {
        if (g.startleTimer > 0) g.startleTimer = Math.max(0, g.startleTimer - dt);
        const boost = g.startleTimer > 0 ? 2.1 : 1;
        g.x += g.vx * boost * dt;
        if (g.x > bounds.designW + 24) g.x = -24;
        if (g.x < -24) g.x = bounds.designW + 24;
      }
    }
    if (chapter === 0 || chapter === 1 || chapter === 3 || chapter === 5) {
      for (const d of this.dragonflies) {
        d.timer -= dt;
        if (d.timer <= 0) {
          d.vx = rand(-22, 22);
          d.vy = rand(-8, 8);
          d.timer = rand(0.4, 1.4);
        }
        d.x += d.vx * dt;
        d.y = clamp(d.y + d.vy * dt, bounds.shoreY - 12, bounds.shoreY + 8);
        if (d.x < 10) d.x = bounds.designW - 10;
        if (d.x > bounds.designW - 10) d.x = 10;
      }
    }
  }

  drawBankCast(
    L: CanvasRenderingContext2D,
    scroll: number,
    time: number,
    chapter: number,
    bounds: WaterBounds,
    lockLiftPx: number,
    unit: number,
  ): void {
    L.imageSmoothingEnabled = false;
    const bankY = bounds.shoreY - bounds.quayHeight - lockLiftPx;

    for (const spot of ANGLER_SPOTS) {
      const dx = wrapDelta(spot.wx, scroll);
      if (dx < -45 || dx > bounds.designW + 45) continue;
      const waving = (this.anglerWave.get(spot.chapter) ?? 0) > 0;
      const sx = Math.round(dx * unit);
      let pair: SpritePair = this.sprites.anglerSit;
      if (spot.variant === 'nap') pair = waving ? this.sprites.anglerNapWave : this.sprites.anglerNap;
      else if (spot.variant === 'harbour') pair = waving ? this.sprites.anglerFishWave : this.sprites.anglerFish;
      else pair = waving ? this.sprites.anglerSitWave : this.sprites.anglerSit;

      const anglerDesignY = spot.variant === 'jetty' ? bounds.shoreY - 2 : bankY;
      const ay = Math.round(anglerDesignY * unit);
      this.drawBox(L, pair.right, sx, ay, unit);

      if (spot.variant === 'market' || spot.variant === 'harbour') {
        this.drawBox(L, this.sprites.bucket, Math.round((dx - 10) * unit), ay, unit);
      }
      if (spot.variant === 'nap' && !waving && Math.floor(time * 1.4) % 2 === 0) {
        L.fillStyle = 'rgba(240,240,220,0.85)';
        L.fillRect(
          Math.round((dx + 5) * unit),
          Math.round((anglerDesignY - 15) * unit),
          Math.max(1, Math.round(1.5 * unit)),
          Math.max(1, Math.round(1.5 * unit)),
        );
      }
      if (spot.variant !== 'harbour') {
        this.drawAnglerRodAndBobber(L, dx, anglerDesignY, bounds.shoreY, time, unit);
      }
    }

    const keeperDx = wrapDelta(LOCK.cottageX - 28, scroll);
    if (keeperDx > -25 && keeperDx < bounds.designW + 25) {
      const pair = this.keeperWaveTimer > 0 ? this.sprites.keeperWave : this.sprites.keeperIdle;
      this.drawBox(L, pair.right, Math.round(keeperDx * unit), Math.round(bankY * unit), unit);
    }

    const farmerDx = wrapDelta(FARMER_X, scroll);
    if (farmerDx > -25 && farmerDx < bounds.designW + 25) {
      const pair = this.farmerWaveTimer > 0 ? this.sprites.farmerWave : this.sprites.farmerSit;
      this.drawBox(L, pair.right, Math.round(farmerDx * unit), Math.round((bounds.shoreY - 2) * unit), unit);
    }

    for (const r of this.roamers) {
      const dx = wrapDelta(r.wx, scroll);
      if (dx < -35 || dx > bounds.designW + 35) continue;
      const sx = Math.round(dx * unit);
      const baseSurface = r.kind === 'villager' || r.kind === 'cat' ? bankY : bounds.shoreY;
      const sy = Math.round((baseSurface + r.dy) * unit);
      let pair: SpritePair = this.sprites.sheep;
      if (r.kind === 'villager') pair = this.sprites.villagers[r.variant][r.waveTimer > 0 ? 1 : 0];
      else if (r.kind === 'cow') pair = r.state === 'drink' ? this.sprites.cowDrink : this.sprites.cowStand;
      else if (r.kind === 'cat') pair = this.sprites.cats[r.variant][r.state === 'stretch' ? 1 : 0];
      this.drawBox(L, r.dir === -1 ? pair.left : pair.right, sx, sy, unit);
    }

    for (const b of this.shoreBirds) {
      if (b.state === 'fly') {
        const pair =
          b.kind === 'heron'
            ? Math.floor(time * 6) % 2 === 0
              ? this.sprites.heronFlyA
              : this.sprites.heronFlyB
            : b.kind === 'gull'
              ? Math.floor(time * 6) % 2 === 0
                ? this.sprites.gullFlyA
                : this.sprites.gullFlyB
              : this.sprites.kingfisher;
        const sp = b.flyVx < 0 ? pair.left : pair.right;
        this.drawBox(L, sp, Math.round(b.flyX * unit), Math.round(b.flyY * unit), unit);
        continue;
      }
      const dx = wrapDelta(b.wx, scroll);
      if (dx < -25 || dx > bounds.designW + 25) continue;
      const sx = Math.round(dx * unit);
      const sy = Math.round((bounds.shoreY - 2) * unit);
      if (b.kind === 'heron') {
        const pair = b.state === 'strike' ? this.sprites.heronStrike : this.sprites.heronStill;
        this.drawBox(L, pair.right, sx, Math.round(bounds.shoreY * unit), unit);
      } else if (b.kind === 'gull') {
        // Perched cleanly atop the mooring post (post top sits at shoreY - 9)
        this.drawBox(L, this.sprites.gullPerch.right, sx, Math.round((bounds.shoreY - 9) * unit), unit);
      } else {
        const dy = b.state === 'strike' ? Math.round(Math.sin(time * 8) * 3) : 0;
        L.fillStyle = '#5c4028';
        L.fillRect(sx - Math.round(unit), sy - Math.round(6 * unit), Math.max(2, Math.round(2 * unit)), Math.round(7 * unit));
        this.drawBox(L, this.sprites.kingfisher.right, sx, sy - Math.round(6 * unit) + dy, unit);
      }
    }

    if (chapter === 3 || chapter === 4) {
      L.fillStyle = '#202634';
      for (const s of this.swallows) {
        const sx = Math.round(s.x * unit);
        const sy = Math.round(s.y * unit);
        const flap = Math.floor(time * 9 + s.phase) % 2 === 0 ? -1 : 1;
        const dot = Math.max(1, Math.round(unit));
        L.fillRect(sx - dot, sy, dot * 3, dot);
        L.fillRect(sx - dot * 2, sy + flap * dot, dot, dot);
        L.fillRect(sx + dot * 2, sy + flap * dot, dot, dot);
      }
    }
    if (chapter === 6) {
      for (const g of this.gulls) {
        const pair = Math.floor(time * 5 + g.phase) % 2 === 0 ? this.sprites.gullFlyA : this.sprites.gullFlyB;
        this.drawBox(L, g.vx < 0 ? pair.left : pair.right, Math.round(g.x * unit), Math.round(g.y * unit), unit);
      }
    }
  }

  /** Draws the recurring angler's diagonal rod, visible fishing line, and red-and-white bobber. */
  private drawAnglerRodAndBobber(
    L: CanvasRenderingContext2D,
    dx: number,
    anglerDesignY: number,
    shoreY: number,
    time: number,
    unit: number,
  ): void {
    const dot = Math.max(1, Math.round(unit));
    const handX = dx + 4;
    const handY = anglerDesignY - 7;
    const tipX = dx + 18;
    const tipY = anglerDesignY - 17;

    L.fillStyle = '#6e4a28';
    const rodSteps = 14;
    for (let i = 0; i <= rodSteps; i++) {
      const k = i / rodSteps;
      const rx = Math.round((handX + (tipX - handX) * k) * unit);
      const ry = Math.round((handY + (tipY - handY) * k) * unit);
      L.fillRect(rx, ry, dot, dot);
    }

    const bob = Math.sin(time * 2.6 + dx * 0.1) * 0.7;
    const bobberY = shoreY + 4 + bob;
    const tipPxX = Math.round(tipX * unit);
    const tipPxY = Math.round(tipY * unit);
    const bobPxY = Math.round(bobberY * unit);

    // Crisp visible fishing line down to the bobber
    L.fillStyle = 'rgba(232,244,248,0.85)';
    L.fillRect(tipPxX, tipPxY, dot, Math.max(2, bobPxY - tipPxY));

    // Red-and-white float bobber on the water
    L.fillStyle = '#f2f0e6';
    L.fillRect(tipPxX - dot, bobPxY - dot * 2, dot * 2, dot);
    L.fillStyle = '#da4236';
    L.fillRect(tipPxX - dot, bobPxY - dot, dot * 2, dot);
  }

  drawWaterCast(
    ctx: CanvasRenderingContext2D,
    sprites: { lilyPads: SpriteBox[] },
    scroll: number,
    time: number,
    chapter: number,
    bounds: WaterBounds,
    unit: number,
  ): void {
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.frogs.length; i++) {
      const f = this.frogs[i];
      const dx = wrapDelta(f.wx, scroll);
      if (dx < -20 || dx > bounds.designW + 20) continue;
      const sx = Math.round(dx * unit);
      const sy = Math.round((bounds.shoreY + f.dy) * unit);
      this.drawBox(ctx, sprites.lilyPads[i % 2], sx, sy + Math.round(3 * unit), unit);
      if (!f.dived) this.drawBox(ctx, this.sprites.frog, sx, sy, unit);
    }

    this.ducks.drawRings(ctx, unit);

    if (chapter === 0 || chapter === 1 || chapter === 3 || chapter === 5) {
      for (const d of this.dragonflies) {
        const sx = Math.round(d.x * unit);
        const sy = Math.round(d.y * unit);
        ctx.fillStyle = d.color;
        ctx.fillRect(sx, sy, Math.max(2, Math.round(2.5 * unit)), Math.max(1, Math.round(unit)));
        if (Math.floor(time * 18) % 2 === 0) {
          ctx.fillStyle = 'rgba(235,248,255,0.75)';
          ctx.fillRect(sx, sy - Math.max(1, Math.round(unit)), Math.max(1, Math.round(unit)), Math.max(1, Math.round(unit)));
        }
      }
    }

    this.ducks.drawDucks(ctx, this.sprites.duckMother, this.sprites.duckling, unit);
  }

  private drawBox(ctx: CanvasRenderingContext2D, sprite: SpriteBox, cx: number, baseY: number, unit: number): void {
    const dw = Math.max(1, Math.round(sprite.w * unit));
    const dh = Math.max(1, Math.round(sprite.h * unit));
    const dx = Math.round(cx - dw / 2);
    const dy = Math.round(baseY - dh);
    ctx.drawImage(sprite.canvas, 0, 0, sprite.w, sprite.h, dx, dy, dw, dh);
  }
}
