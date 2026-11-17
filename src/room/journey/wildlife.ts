import { BIOMES, OLD_WOOD_BIOME, biomeIndexAt, blendNumber, weightsAt } from './biomes';
import { PICTURES, drawPicture, type Picture } from './animal-sprites';
import { FoxCharacter } from './fox';

type Kind = 'deer' | 'rabbit' | 'duck' | 'hedgehog';
type Mood = 'graze' | 'stand' | 'walk' | 'flee' | 'sit' | 'hop' | 'drift' | 'curl' | 'seek' | 'eat';

interface Animal {
  kind: Kind;
  /** Position along the road, in stage pixels at the near ground's speed; screen X is this minus scroll. */
  x: number;
  /** Row its feet are on. */
  y: number;
  dir: 1 | -1;
  mood: Mood;
  timer: number;
  clock: number;
  seed: number;
  targetFoodId: number | null;
}

interface PerchedOwl {
  x: number;
  perchY: number;
  trunkH: number;
  branchDir: 1 | -1;
  blinkTimer: number;
  blinkDuration: number;
  idleLook: -1 | 0 | 1;
  idleTimer: number;
}

interface GlidingOwl {
  x: number;
  y: number;
  vx: number;
  clock: number;
}

interface FoodItem {
  id: number;
  x: number;
  y: number;
  drop: number;
  life: number;
}

/** What a view needs to draw something standing on the ground: where its feet are, and how to paint it. */
export interface Standing {
  y: number;
  paint: (ctx: CanvasRenderingContext2D) => void;
}

export interface Pointer {
  x: number;
  y: number;
}

/** The rows animals may stand on: dry ground below `dryTop`, and the lake's water between `lakeTop` and `lakeBottom`. */
export interface Rows {
  dryTop: number;
  dryBottom: number;
  lakeTop: number;
  lakeBottom: number;
}

export interface WildlifeContext {
  scroll: number;
  screenW: number;
  screenH: number;
  rows: Rows;
  pointer: Pointer | null;
  campWorldX: number | null;
  travellerWaving: boolean;
  day: number;
  roadSpeed: number;
}

const MAX_ANIMALS = 10;
const MAX_FOOD = 5;
const SPAWN_STEP = 80;
const OWL_STEP = 380;
const FLEE_RADIUS = 28;
const HEDGEHOG_CURL_RADIUS = 32;
const FOOD_SEEK_RADIUS = 230;
const FOOD_DROP_SECONDS = 0.26;
const FOOD_LIFETIME = 28;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/**
 * The animals met along the road: deer, rabbits, ducks, hedgehogs and owls in Old Wood, and the recurring fox
 * character whose trust grows as you travel and feed it.
 */
export class Wildlife {
  private animals: Animal[] = [];
  private owls: PerchedOwl[] = [];
  private glidingOwl: GlidingOwl | null = null;
  private glideWait = 6;
  private readonly fox = new FoxCharacter();
  private spawnedTo = 0;
  private owlSpawnedTo = 0;
  private foods: FoodItem[] = [];
  private nextFoodId = 1;
  private readonly weights: number[] = new Array<number>(BIOMES.length).fill(0);

  /** Forgets everyone on screen and starts meeting animals from this point on the road. */
  reset(scroll: number, screenW = 480, rows?: Rows, campWorldX: number | null = null): void {
    this.animals = [];
    this.owls = [];
    this.foods = [];
    this.glidingOwl = null;
    this.spawnedTo = scroll - 60;
    this.owlSpawnedTo = scroll - 80;
    this.fox.reset(scroll, screenW, rows, campWorldX);
  }

  /** Tosses a small piece of food onto the ground; the nearest fox, rabbit or deer comes to eat it. */
  tossFood(worldX: number, targetY: number): void {
    if (this.foods.length >= MAX_FOOD) this.foods.shift();
    const id = this.nextFoodId++;
    this.foods.push({ id, x: worldX, y: Math.round(targetY), drop: FOOD_DROP_SECONDS, life: FOOD_LIFETIME });
    this.attractNearest(id, worldX, targetY);
  }

  private attractNearest(foodId: number, fx: number, fy: number): void {
    let bestDist = FOOD_SEEK_RADIUS;
    let bestAnimal: Animal | null = null;
    let pickFox = false;

    const foxState = this.fox.state;
    if (foxState && foxState.mood !== 'flee') {
      const d = Math.hypot(foxState.x - fx, foxState.y - fy);
      if (d < bestDist) {
        bestDist = d;
        pickFox = true;
      }
    }

    for (const a of this.animals) {
      if ((a.kind !== 'deer' && a.kind !== 'rabbit') || a.mood === 'flee') continue;
      const d = Math.hypot(a.x - fx, a.y - fy);
      if (d < bestDist) {
        bestDist = d;
        bestAnimal = a;
        pickFox = false;
      }
    }

    if (pickFox) {
      this.fox.seekFood(foodId);
    } else if (bestAnimal) {
      bestAnimal.targetFoodId = foodId;
      bestAnimal.mood = 'seek';
    }
  }

  /** Moves everyone on, spawns new animals/owls along the road, and handles pointer and food reactions. */
  update(dt: number, ctx: WildlifeContext): void {
    const { scroll, screenW, screenH, rows, pointer, campWorldX, travellerWaving, day, roadSpeed } = ctx;

    while (this.spawnedTo < scroll + screenW + 40) {
      this.spawnedTo += SPAWN_STEP;
      this.maybeSpawn(this.spawnedTo, rows);
    }
    while (this.owlSpawnedTo < scroll + screenW + 60) {
      this.owlSpawnedTo += OWL_STEP;
      this.maybeSpawnOwl(this.owlSpawnedTo, rows);
    }

    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      f.drop = Math.max(0, f.drop - dt);
      f.life -= dt;
      if (f.life <= 0 || f.x - scroll < -40) this.foods.splice(i, 1);
    }

    for (const a of this.animals) this.step(a, dt, scroll, pointer);
    this.animals = this.animals.filter((a) => a.x - scroll > -45 && a.x - scroll < screenW + 180);

    for (const o of this.owls) this.stepOwl(o, dt);
    this.owls = this.owls.filter((o) => o.x - scroll > -50);

    this.stepGlidingOwl(dt, scroll, screenW, screenH, day);
    this.fox.update(
      dt,
      scroll,
      screenW,
      rows,
      pointer,
      campWorldX,
      travellerWaving,
      roadSpeed,
      (id) => this.foods.find((f) => f.id === id),
      (id) => this.consumeFood(id),
    );
  }

  /** Everyone on screen, ready to be sorted among the trees by their feet. */
  standing(scroll: number, pointer: Pointer | null): Standing[] {
    const out: Standing[] = [];

    for (const f of this.foods) {
      out.push({
        y: f.y,
        paint: (ctx) => {
          const lift = Math.round(Math.sin((f.drop / FOOD_DROP_SECONDS) * Math.PI) * 12);
          const x = Math.round(f.x - scroll - PICTURES.food.w / 2);
          const y = Math.round(f.y - PICTURES.food.h - lift);
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(x, f.y - 1, PICTURES.food.w, 1);
          ctx.drawImage(PICTURES.food.canvas, x, y);
        },
      });
    }

    for (const a of this.animals) {
      out.push({ y: a.y, paint: (ctx) => this.paint(ctx, a, a.x - scroll) });
    }

    for (const o of this.owls) {
      out.push({ y: o.perchY + o.trunkH, paint: (ctx) => this.paintPerchedOwl(ctx, o, o.x - scroll, pointer) });
    }

    const foxState = this.fox.state;
    if (foxState) {
      out.push({ y: foxState.y, paint: (ctx) => this.fox.paint(ctx, scroll) });
    }

    return out;
  }

  /** Draws the silent nighttime owl gliding over the Old Wood canopy (in screen space, above the clock). */
  drawCanopyOwl(ctx: CanvasRenderingContext2D): void {
    const g = this.glidingOwl;
    if (!g) return;
    const flap = (g.clock * 1.4) % 4;
    const pic = flap < 0.7 ? PICTURES.owlGlideA : flap < 1.3 ? PICTURES.owlGlideB : PICTURES.owlGlideA;
    drawPicture(ctx, pic, Math.round(g.x - pic.w / 2), Math.round(g.y - pic.h / 2), g.vx >= 0 ? 1 : -1);
  }

  private maybeSpawn(x: number, rows: Rows): void {
    if (this.animals.length >= MAX_ANIMALS) return;
    weightsAt(x, this.weights);
    const lake = blendNumber(this.weights, 0, (b) => b.lake);
    const chance = (kind: Kind): number => blendNumber(this.weights, 0, (b) => b.wildlife[kind]);
    const roll = Math.random();
    const deer = chance('deer');
    const rabbit = chance('rabbit');
    const duck = chance('duck');
    const hedgehog = chance('hedgehog');

    let kind: Kind | null = null;
    if (roll < deer && lake < 0.25) kind = 'deer';
    else if (roll < deer + rabbit && lake < 0.25) kind = 'rabbit';
    else if (roll < deer + rabbit + duck && lake > 0.7) kind = 'duck';
    else if (roll < deer + rabbit + duck + hedgehog && lake < 0.25) kind = 'hedgehog';
    if (!kind) return;

    const row = kind === 'duck'
      ? rand(rows.lakeTop + 4, rows.lakeBottom - 2)
      : kind === 'hedgehog'
        ? rand(rows.dryTop + 6, rows.dryBottom - 2)
        : rand(rows.dryTop, rows.dryBottom - 3);

    this.animals.push({
      kind,
      x: x + rand(-20, 20),
      y: Math.round(row),
      dir: Math.random() < 0.5 ? 1 : -1,
      mood: kind === 'rabbit' ? 'sit' : kind === 'duck' ? 'drift' : kind === 'hedgehog' ? 'walk' : 'graze',
      timer: rand(1.5, 4.5),
      clock: 0,
      seed: Math.random() * 100,
      targetFoodId: null,
    });
  }

  private maybeSpawnOwl(x: number, rows: Rows): void {
    if (biomeIndexAt(x) !== OLD_WOOD_BIOME) return;
    const ox = Math.round(x + rand(-40, 40));
    const trunkH = Math.round(rand(22, 30));
    const perchY = Math.round(rows.dryTop + 2 - trunkH);
    this.owls.push({
      x: ox,
      perchY,
      trunkH,
      branchDir: Math.random() < 0.5 ? 1 : -1,
      blinkTimer: rand(2, 5),
      blinkDuration: 0,
      idleLook: 0,
      idleTimer: rand(2, 4),
    });
  }

  private step(a: Animal, dt: number, scroll: number, pointer: Pointer | null): void {
    a.clock += dt;
    a.timer -= dt;
    const sx = a.x - scroll;

    if (a.kind === 'hedgehog') {
      if (pointer && Math.hypot(pointer.x - sx, pointer.y - (a.y - 2)) < HEDGEHOG_CURL_RADIUS) {
        a.mood = 'curl';
        a.timer = 1.6;
        return;
      }
      if (a.mood === 'curl') {
        if (a.timer <= 0) {
          a.mood = 'walk';
          a.timer = rand(4, 8);
        }
        return;
      }
      if (a.mood === 'walk') a.x += a.dir * 5.5 * dt;
      if (a.timer <= 0) {
        a.mood = a.mood === 'walk' && Math.random() < 0.35 ? 'sit' : 'walk';
        a.timer = a.mood === 'sit' ? rand(1.2, 2.8) : rand(4, 9);
      }
      return;
    }

    if (pointer && a.kind !== 'duck' && a.mood !== 'flee' && Math.abs(pointer.x - sx) < FLEE_RADIUS && Math.abs(pointer.y - a.y) < FLEE_RADIUS * 1.4) {
      a.dir = pointer.x < sx ? 1 : -1;
      a.mood = 'flee';
      a.targetFoodId = null;
      a.timer = rand(2, 3.2);
    }

    if (a.mood === 'seek') {
      const food = this.foods.find((f) => f.id === a.targetFoodId);
      if (!food) {
        a.targetFoodId = null;
        this.choose(a);
        return;
      }
      const dx = food.x - a.x;
      const dy = food.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        a.mood = 'eat';
        a.timer = 1.4;
        this.consumeFood(food.id);
        a.targetFoodId = null;
        return;
      }
      const speed = a.kind === 'deer' ? 28 : 26;
      a.dir = dx >= 0 ? 1 : -1;
      a.x += (dx / dist) * speed * dt;
      a.y += (dy / dist) * speed * 0.65 * dt;
      return;
    }

    if (a.mood === 'eat') {
      if (a.timer <= 0) this.choose(a);
      return;
    }

    if (a.mood === 'flee') {
      a.x += a.dir * (a.kind === 'deer' ? 62 : 48) * dt;
    } else if (a.mood === 'walk') a.x += a.dir * 8 * dt;
    else if (a.mood === 'hop') a.x += a.dir * 22 * dt;
    else if (a.mood === 'drift') a.x += a.dir * 5 * dt;

    if (a.timer > 0) return;
    this.choose(a);
  }

  private consumeFood(foodId: number): void {
    const idx = this.foods.findIndex((f) => f.id === foodId);
    if (idx >= 0) this.foods.splice(idx, 1);
  }

  private choose(a: Animal): void {
    if (a.kind === 'deer') {
      const roll = Math.random();
      a.mood = roll < 0.45 ? 'graze' : roll < 0.7 ? 'stand' : 'walk';
      if (a.mood === 'walk') a.dir = Math.random() < 0.6 ? a.dir : a.dir === 1 ? -1 : 1;
      a.timer = a.mood === 'walk' ? rand(4, 8) : rand(3, 8);
    } else if (a.kind === 'rabbit') {
      a.mood = Math.random() < 0.55 ? 'sit' : 'hop';
      if (a.mood === 'hop') a.dir = Math.random() < 0.5 ? 1 : -1;
      a.timer = a.mood === 'hop' ? rand(0.7, 2) : rand(1.5, 5);
    } else {
      if (Math.random() < 0.3) a.dir = a.dir === 1 ? -1 : 1;
      a.timer = rand(4, 10);
    }
  }

  private stepOwl(o: PerchedOwl, dt: number): void {
    o.blinkDuration = Math.max(0, o.blinkDuration - dt);
    o.blinkTimer -= dt;
    if (o.blinkTimer <= 0) {
      o.blinkDuration = 0.18;
      o.blinkTimer = rand(3.2, 6.5);
    }
    o.idleTimer -= dt;
    if (o.idleTimer <= 0) {
      const r = Math.random();
      o.idleLook = r < 0.35 ? -1 : r < 0.7 ? 1 : 0;
      o.idleTimer = rand(2.5, 5);
    }
  }

  private stepGlidingOwl(dt: number, scroll: number, screenW: number, screenH: number, day: number): void {
    const inOldWood = biomeIndexAt(scroll + screenW * 0.5) === OLD_WOOD_BIOME;
    if (day > 0.45 || !inOldWood) {
      this.glidingOwl = null;
      return;
    }
    if (!this.glidingOwl) {
      this.glideWait -= dt;
      if (this.glideWait > 0) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.glidingOwl = {
        x: dir > 0 ? -18 : screenW + 18,
        y: screenH * rand(0.18, 0.25),
        vx: dir * rand(24, 32),
        clock: 0,
      };
      this.glideWait = rand(20, 36);
      return;
    }
    const g = this.glidingOwl;
    g.clock += dt;
    g.x += g.vx * dt;
    g.y += Math.sin(g.clock * 1.1) * 3 * dt;
    if (g.vx > 0 ? g.x > screenW + 24 : g.x < -24) this.glidingOwl = null;
  }

  private paint(ctx: CanvasRenderingContext2D, a: Animal, sx: number): void {
    const pic = this.picture(a);
    let lift = 0;
    if (a.kind === 'rabbit' && (a.mood === 'hop' || a.mood === 'flee' || a.mood === 'seek')) {
      const beat = (a.clock * (a.mood === 'flee' ? 3.2 : 2.2)) % 1;
      lift = Math.round(Math.sin(Math.PI * beat) * (a.mood === 'flee' ? 6 : 4));
    }
    if (a.kind === 'duck') lift = Math.round(Math.sin(a.clock * 1.6 + a.seed) * 0.6) - 1;

    const x = Math.round(sx - pic.w / 2);
    const y = Math.round(a.y - pic.h - lift);
    if (a.kind === 'duck') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x - 1, Math.round(a.y), pic.w + 2, 1);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 1, Math.round(a.y) - 1, pic.w - 2, 2);
    }
    drawPicture(ctx, pic, x, y, a.dir);
  }

  private paintPerchedOwl(ctx: CanvasRenderingContext2D, o: PerchedOwl, sx: number, pointer: Pointer | null): void {
    const bx = Math.round(sx);
    const by = Math.round(o.perchY);
    // Grounded mossy snag trunk + side bough so the owl sits on a visible branch.
    ctx.fillStyle = 'rgb(52,38,28)';
    ctx.fillRect(bx - o.branchDir * 4, by, 3, o.trunkH);
    ctx.fillStyle = 'rgb(74,54,38)';
    ctx.fillRect(bx - o.branchDir * 4, by, 1, o.trunkH);
    ctx.fillStyle = 'rgb(64,96,46)';
    ctx.fillRect(bx - o.branchDir * 4, by + Math.round(o.trunkH * 0.45), 2, 3);
    const armStart = o.branchDir > 0 ? bx - 4 : bx - 1;
    ctx.fillStyle = 'rgb(52,38,28)';
    ctx.fillRect(armStart, by - 1, 6, 2);

    let pic = PICTURES.owlFront;
    if (o.blinkDuration > 0) {
      pic = PICTURES.owlBlink;
    } else if (pointer) {
      const dx = pointer.x - sx;
      pic = dx < -18 ? PICTURES.owlLeft : dx > 18 ? PICTURES.owlRight : PICTURES.owlFront;
    } else {
      pic = o.idleLook < 0 ? PICTURES.owlLeft : o.idleLook > 0 ? PICTURES.owlRight : PICTURES.owlFront;
    }
    ctx.drawImage(pic.canvas, Math.round(sx - pic.w / 2), by - pic.h);
  }

  private picture(a: Animal): Picture {
    if (a.kind === 'rabbit') return PICTURES.rabbit;
    if (a.kind === 'duck') return PICTURES.duck;
    if (a.kind === 'hedgehog') {
      if (a.mood === 'curl') return PICTURES.hedgehogCurl;
      if (a.mood === 'sit') return PICTURES.hedgehogA;
      return Math.floor(a.clock * 4) % 2 === 0 ? PICTURES.hedgehogA : PICTURES.hedgehogB;
    }
    if (a.mood === 'graze' || a.mood === 'eat') return PICTURES.deerGraze;
    if (a.mood === 'walk' || a.mood === 'flee' || a.mood === 'seek') {
      const rate = a.mood === 'flee' ? 9 : 3;
      return Math.floor(a.clock * rate) % 2 === 0 ? PICTURES.deerUp : PICTURES.deerStride;
    }
    return PICTURES.deerUp;
  }
}
