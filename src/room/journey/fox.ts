import { CAMP_BIOME, OLD_WOOD_BIOME, biomeIndexAt } from './biomes';
import { PICTURES, drawPicture, type Picture } from './animal-sprites';
import type { Pointer, Rows } from './wildlife';

export type FoxMood = 'sit' | 'walk' | 'drink' | 'look' | 'flee' | 'seek' | 'eat' | 'companion';

export interface FoxState {
  x: number;
  y: number;
  dir: 1 | -1;
  mood: FoxMood;
  biome: number;
  timer: number;
  clock: number;
  lookTimer: number;
  companionAge: number;
  pacing: boolean;
  targetFoodId: number | null;
  atCamp: boolean;
}

const FOX = {
  walkSpeed: 11,
  fleeSpeed: 70,
  seekSpeed: 24,
  walkRate: 4,
  fleeRate: 10,
  sitChance: 0.28,
  sitMin: 2.5,
  sitMax: 5.5,
  walkMin: 4,
  walkMax: 8,
};

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

function makeFox(
  x: number,
  y: number,
  dir: 1 | -1,
  mood: FoxMood,
  biome: number,
  timer: number,
  atCamp = false,
): FoxState {
  return {
    x,
    y: Math.round(y),
    dir,
    mood,
    biome,
    timer,
    clock: 0,
    lookTimer: 0,
    companionAge: 0,
    pacing: false,
    targetFoodId: null,
    atCamp,
  };
}

/**
 * The recurring fox character with a white-tipped tail: watches from the forest edge, drinks at the lakeside,
 * sits by the campfire near the traveller, walks beside you in Old Wood, and grows more trusting when fed.
 */
export class FoxCharacter {
  state: FoxState | null = null;
  private wait = 1.5;
  private trust = 0;
  private campSpawnedAt: number | null = null;

  reset(scroll: number, screenW: number, rows?: Rows, campWorldX: number | null = null): void {
    this.state = null;
    this.campSpawnedAt = null;
    this.wait = 1.5;
    if (!rows) return;
    const biome = biomeIndexAt(scroll + screenW * 0.5);
    if (biome === CAMP_BIOME && campWorldX !== null) {
      this.spawnAtCamp(campWorldX, rows);
    } else if (biome === 0) {
      this.state = makeFox(scroll + screenW * 0.68, rows.dryTop + 2, -1, 'sit', 0, rand(3, 6));
    } else if (biome === 2) {
      this.state = makeFox(scroll + screenW * 0.64, rows.lakeBottom + 1, -1, 'drink', 2, rand(3, 5));
    } else if (biome === OLD_WOOD_BIOME) {
      this.state = makeFox(
        scroll + screenW * 0.54,
        (rows.dryTop + rows.dryBottom) * 0.58,
        1,
        'companion',
        OLD_WOOD_BIOME,
        rand(4, 7),
      );
    }
  }

  private spawnAtCamp(campWorldX: number, rows: Rows): void {
    const fireY = Math.round(rows.dryTop + (rows.dryBottom - rows.dryTop) * 0.56);
    this.state = makeFox(campWorldX + 64, fireY + 2, -1, 'sit', CAMP_BIOME, 99, true);
    this.campSpawnedAt = campWorldX;
  }

  private fleeRadius(biome: number): number {
    const base = biome === 0 ? 44 : biome === 2 ? 30 : biome === CAMP_BIOME ? 20 : biome === OLD_WOOD_BIOME ? 12 : 36;
    if (this.trust >= 0.7 && (biome === CAMP_BIOME || biome === OLD_WOOD_BIOME)) return 0;
    return Math.max(0, base * (1 - 0.72 * this.trust));
  }

  seekFood(foodId: number): void {
    if (!this.state || this.state.mood === 'flee') return;
    this.state.targetFoodId = foodId;
    this.state.mood = 'seek';
    this.state.atCamp = false;
  }

  update(
    dt: number,
    scroll: number,
    screenW: number,
    rows: Rows,
    pointer: Pointer | null,
    campWorldX: number | null,
    travellerWaving: boolean,
    roadSpeed: number,
    findFood: (id: number) => { x: number; y: number } | undefined,
    consumeFood: (id: number) => void,
  ): void {
    if (!this.state) {
      if (
        campWorldX !== null &&
        this.campSpawnedAt !== campWorldX &&
        campWorldX + 64 > scroll - 20 &&
        campWorldX + 64 <= scroll + screenW + 90
      ) {
        this.spawnAtCamp(campWorldX, rows);
        return;
      }
      this.wait -= dt;
      if (this.wait > 0) return;
      const ahead = biomeIndexAt(scroll + screenW * 0.85);
      if (ahead === 0) {
        this.state = makeFox(scroll + screenW + 14, rows.dryTop + 2, -1, 'sit', 0, rand(3, 6));
      } else if (ahead === 2) {
        this.state = makeFox(scroll + screenW + 14, rows.lakeBottom + 1, -1, 'drink', 2, rand(3, 5));
      } else if (ahead === OLD_WOOD_BIOME) {
        this.state = makeFox(
          scroll + screenW * 0.62,
          (rows.dryTop + rows.dryBottom) * 0.58,
          1,
          'companion',
          OLD_WOOD_BIOME,
          rand(4, 7),
        );
      } else if (Math.random() < 0.25) {
        this.state = makeFox(
          scroll + screenW + 14,
          rand(rows.dryTop + 3, rows.dryBottom - 6),
          -1,
          'walk',
          ahead,
          rand(4, 7),
        );
      }
      this.wait = rand(8, 16);
      return;
    }

    const f = this.state;
    f.clock += dt;
    f.timer -= dt;
    f.lookTimer = Math.max(0, f.lookTimer - dt);

    const sx = f.x - scroll;
    const fleeR = this.fleeRadius(f.biome);
    if (pointer && fleeR > 0 && f.mood !== 'flee' && Math.hypot(pointer.x - sx, pointer.y - f.y) < fleeR) {
      f.dir = pointer.x < sx ? 1 : -1;
      f.mood = 'flee';
      f.targetFoodId = null;
      f.atCamp = false;
      f.timer = rand(2.2, 3.2);
    }

    if (travellerWaving && f.biome === CAMP_BIOME && f.mood !== 'flee' && f.mood !== 'seek') {
      f.lookTimer = 1.8;
    }

    if (f.mood === 'seek') {
      const foodId = f.targetFoodId;
      const food = foodId !== null ? findFood(foodId) : undefined;
      if (foodId === null || !food) {
        f.targetFoodId = null;
        f.mood = f.biome === CAMP_BIOME ? 'sit' : 'walk';
        f.timer = 3;
      } else {
        const dx = food.x - f.x;
        const dy = food.y - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          f.mood = 'eat';
          f.timer = 1.6;
          consumeFood(foodId);
          f.targetFoodId = null;
          this.trust = Math.min(1, this.trust + 0.22);
        } else {
          f.dir = dx >= 0 ? 1 : -1;
          f.x += (dx / dist) * FOX.seekSpeed * dt;
          f.y += (dy / dist) * FOX.seekSpeed * 0.65 * dt;
        }
      }
    } else if (f.mood === 'eat') {
      if (f.timer <= 0) {
        f.mood = f.biome === OLD_WOOD_BIOME ? 'companion' : 'look';
        f.lookTimer = 1.8;
        f.timer = rand(2.5, 5);
      }
    } else if (f.mood === 'flee') {
      f.x += f.dir * FOX.fleeSpeed * dt;
    } else if (f.mood === 'companion') {
      f.companionAge += dt;
      f.pacing = roadSpeed > 0;
      if (f.pacing) {
        const desiredX = scroll + screenW * 0.54 + Math.sin(f.companionAge * 0.35) * 26;
        f.x += roadSpeed * dt + (desiredX - f.x) * Math.min(1, dt * 1.4);
        f.dir = 1;
      }
      if (f.companionAge > 24 && biomeIndexAt(scroll + screenW * 0.5) !== OLD_WOOD_BIOME) {
        f.mood = 'walk';
        f.timer = 5;
      }
    } else if (f.mood === 'walk') {
      f.x += f.dir * FOX.walkSpeed * dt;
      if (f.timer <= 0) {
        f.mood = f.biome === 2 ? 'drink' : Math.random() < FOX.sitChance ? 'sit' : 'look';
        f.timer = rand(FOX.sitMin, FOX.sitMax);
      }
    } else if (f.timer <= 0 && !f.atCamp) {
      f.mood = f.biome === 2 && Math.random() < 0.5 ? 'drink' : f.biome === 0 && Math.random() < 0.65 ? 'sit' : 'walk';
      f.timer = f.mood === 'walk' ? rand(FOX.walkMin, FOX.walkMax) : rand(FOX.sitMin, FOX.sitMax);
    }

    if (sx < -42 || sx > screenW + 150) {
      this.state = null;
      this.wait = rand(8, 15);
    }
  }

  paint(ctx: CanvasRenderingContext2D, scroll: number): void {
    const f = this.state;
    if (!f) return;
    const pic = this.picture(f);
    const sx = f.x - scroll;
    const x = Math.round(sx - pic.w / 2);
    const y = Math.round(f.y - pic.h);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 1, Math.round(f.y) - 1, pic.w - 2, 2);
    drawPicture(ctx, pic, x, y, f.dir);
  }

  private picture(f: FoxState): Picture {
    if (f.lookTimer > 0 || f.mood === 'look') return PICTURES.foxLook;
    if (f.mood === 'sit') return PICTURES.foxSit;
    if (f.mood === 'drink' || f.mood === 'eat') return PICTURES.foxDrink;
    if (f.mood === 'companion') {
      if (!f.pacing) return PICTURES.foxSit;
      return Math.floor(f.clock * 3.2) % 2 === 0 ? PICTURES.foxStand : PICTURES.foxTrot;
    }
    const rate = f.mood === 'flee' ? FOX.fleeRate : FOX.walkRate;
    return Math.floor(f.clock * rate) % 2 === 0 ? PICTURES.foxStand : PICTURES.foxTrot;
  }
}
