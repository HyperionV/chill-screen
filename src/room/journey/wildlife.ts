import { memoryCanvas } from '../../render/pixel-stage';
import type { RGB } from '../../render/color';
import { BIOMES, blendNumber, weightsAt } from './biomes';

type Kind = 'deer' | 'rabbit' | 'fox' | 'duck';
type Mood = 'graze' | 'stand' | 'walk' | 'flee' | 'sit' | 'hop' | 'drift';

interface Picture {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

const DEER_COLORS: Record<string, RGB> = { b: [160, 105, 58], d: [107, 68, 38], w: [236, 220, 192], k: [28, 18, 12], a: [205, 189, 148] };
const RABBIT_COLORS: Record<string, RGB> = { b: [176, 150, 120], w: [240, 232, 220], k: [30, 22, 18], d: [130, 108, 86] };
const DUCK_COLORS: Record<string, RGB> = { g: [47, 122, 74], b: [138, 122, 98], y: [224, 176, 48], w: [232, 232, 224] };
const FOX_COLORS: Record<string, RGB> = { o: [214, 112, 48], w: [250, 244, 232], k: [34, 22, 18] };

/** Pictures drawn as rows of letters, one letter a pixel, facing right. A dot is clear. */
const DEER_UP = [
  '..........a.a...', '...........aa...', '..........bbb...', '.........bbbbk..', '.........bbbb...', '..bbbbbbbbbb....',
  '.wbbbbbbbbbbb...', '.wbbbbbbbbbbb...', '..bbbbbbbbbbb...', '...d.d...d.d....', '...d.d...d.d....', '...d.d...d.d....', '...d.d...d.d....',
];
const DEER_STRIDE = [
  '..........a.a...', '...........aa...', '..........bbb...', '.........bbbbk..', '.........bbbb...', '..bbbbbbbbbb....',
  '.wbbbbbbbbbbb...', '.wbbbbbbbbbbb...', '..bbbbbbbbbbb...', '..d..d....d..d..', '..d...d..d...d..', '.d....d..d....d.', '.d....d..d....d.',
];
const DEER_GRAZE = [
  '................', '................', '................', '................', '................', '..bbbbbbbbbb....',
  '.wbbbbbbbbbbbb..', '.wbbbbbbbbbb.bb.', '..bbbbbbbbbb.bbb', '...d.d...d.d.bbk', '...d.d...d.d....', '...d.d...d.d....', '...d.d...d.d....',
];
const RABBIT = ['....b.b.', '....b.b.', '...bbbbk', '...bbbb.', '.bbbbbb.', 'wbbbbbb.', '.bbbbbb.', '..d..d..'];
const DUCK = ['.....gg.', '..bbbggy', '.bbbbbb.', 'wbbbbb..'];
const FOX_STAND = [
  '.........k.k..', '.........ooo..', 'ww......oook..', 'wooooooooooowk',
  '.oooooooowww..', '..oo.oo..ow...', '...k.k...k.k..',
];
const FOX_TROT = [
  '.........k.k..', '.........ooo..', 'ww......oook..', 'wooooooooooowk',
  '.oooooooowww..', '..oo.oo..ow...', '..k...k.k...k.',
];

function bake(rows: string[], colors: Record<string, RGB>): Picture {
  const w = rows[0].length;
  const { canvas, ctx } = memoryCanvas(w, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = colors[ch];
    if (!c) return;
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(x, y, 1, 1);
  }));
  return { canvas, w, h: rows.length };
}

const PICTURES = {
  deerUp: bake(DEER_UP, DEER_COLORS),
  deerStride: bake(DEER_STRIDE, DEER_COLORS),
  deerGraze: bake(DEER_GRAZE, DEER_COLORS),
  rabbit: bake(RABBIT, RABBIT_COLORS),
  duck: bake(DUCK, DUCK_COLORS),
  foxStand: bake(FOX_STAND, FOX_COLORS),
  foxTrot: bake(FOX_TROT, FOX_COLORS),
};

interface Animal {
  kind: Kind;
  /** Position along the road, in stage pixels at the near ground's speed; the screen position is this minus the scroll. */
  x: number;
  /** The row its feet are on. */
  y: number;
  dir: 1 | -1;
  mood: Mood;
  timer: number;
  clock: number;
  seed: number;
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

const MAX_ANIMALS = 8;
const SPAWN_STEP = 80;
const FLEE_RADIUS = 28;
/** Foxes spend most of their time walking, with short rests and a faster escape stride. */
const FOX = { walkSpeed: 11, fleeSpeed: 70, walkRate: 4, fleeRate: 10, sitChance: 0.25, sitMin: 2, sitMax: 5, walkMin: 4, walkMax: 8 };
const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/**
 * The animals met along the road: deer that graze, rabbits that hop, foxes that roam and rest, ducks on the
 * lake. They keep their own pace as the scenery scrolls past, and bolt from the pointer when it comes close.
 */
export class Wildlife {
  private animals: Animal[] = [];
  private spawnedTo = 0;
  private readonly weights: number[] = new Array<number>(BIOMES.length).fill(0);

  /** Forgets everyone and starts meeting animals from this point on the road. */
  reset(scroll: number): void {
    this.animals = [];
    this.spawnedTo = scroll - 60;
  }

  /** Moves everyone on, and meets new animals as the road brings them into view. */
  update(dt: number, scroll: number, screenW: number, rows: Rows, pointer: Pointer | null): void {
    while (this.spawnedTo < scroll + screenW + 40) {
      this.spawnedTo += SPAWN_STEP;
      this.maybeSpawn(this.spawnedTo, rows);
    }
    for (const a of this.animals) this.step(a, dt, scroll, pointer);
    this.animals = this.animals.filter((a) => a.x - scroll > -40);
  }

  /** Everyone on screen, ready to be sorted among the trees by their feet. */
  standing(scroll: number): Standing[] {
    return this.animals.map((a) => ({ y: a.y, paint: (ctx) => this.paint(ctx, a, a.x - scroll) }));
  }

  private maybeSpawn(x: number, rows: Rows): void {
    if (this.animals.length >= MAX_ANIMALS) return;
    weightsAt(x, this.weights);
    const lake = blendNumber(this.weights, 0, (b) => b.lake);
    const chance = (kind: Kind): number => blendNumber(this.weights, 0, (b) => b.wildlife[kind]);
    const roll = Math.random();
    const deer = chance('deer');
    const rabbit = chance('rabbit');
    const fox = chance('fox');
    const duck = chance('duck');
    let kind: Kind | null = null;
    if (roll < deer && lake < 0.25) kind = 'deer';
    else if (roll < deer + rabbit && lake < 0.25) kind = 'rabbit';
    else if (roll < deer + rabbit + fox && lake < 0.25) kind = 'fox';
    else if (roll < deer + rabbit + fox + duck && lake > 0.7) kind = 'duck';
    if (!kind) return;
    const row = kind === 'duck' ? rand(rows.lakeTop + 4, rows.lakeBottom - 2) : rand(rows.dryTop, rows.dryBottom - 3);
    this.animals.push({
      kind, x: x + rand(-20, 20), y: Math.round(row), dir: Math.random() < 0.5 ? 1 : -1,
      mood: kind === 'rabbit' ? 'sit' : kind === 'duck' ? 'drift' : kind === 'fox' ? 'walk' : 'graze',
      timer: rand(1, 4), clock: 0, seed: Math.random() * 100,
    });
  }

  private step(a: Animal, dt: number, scroll: number, pointer: Pointer | null): void {
    a.clock += dt;
    a.timer -= dt;
    const sx = a.x - scroll;
    if (pointer && a.kind !== 'duck' && a.mood !== 'flee' && Math.abs(pointer.x - sx) < FLEE_RADIUS && Math.abs(pointer.y - a.y) < FLEE_RADIUS * 1.4) {
      a.dir = pointer.x < sx ? 1 : -1;
      a.mood = 'flee';
      a.timer = rand(2, 3.2);
    }
    if (a.mood === 'flee') {
      a.x += a.dir * (a.kind === 'fox' ? FOX.fleeSpeed : a.kind === 'deer' ? 62 : 48) * dt;
    } else if (a.mood === 'walk') a.x += a.dir * (a.kind === 'fox' ? FOX.walkSpeed : 8) * dt;
    else if (a.mood === 'hop') a.x += a.dir * 22 * dt;
    else if (a.mood === 'drift') a.x += a.dir * 5 * dt;
    if (a.timer > 0) return;
    this.choose(a);
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
    } else if (a.kind === 'fox') {
      a.mood = a.mood !== 'sit' && Math.random() < FOX.sitChance ? 'sit' : 'walk';
      a.timer = a.mood === 'sit' ? rand(FOX.sitMin, FOX.sitMax) : rand(FOX.walkMin, FOX.walkMax);
    } else {
      if (Math.random() < 0.3) a.dir = a.dir === 1 ? -1 : 1;
      a.timer = rand(4, 10);
    }
  }

  private paint(ctx: CanvasRenderingContext2D, a: Animal, sx: number): void {
    const pic = this.picture(a);
    let lift = 0;
    if (a.kind === 'rabbit' && (a.mood === 'hop' || a.mood === 'flee')) {
      const beat = (a.clock * (a.mood === 'flee' ? 3.2 : 2.2)) % 1;
      lift = Math.round(Math.sin(Math.PI * beat) * (a.mood === 'flee' ? 6 : 4));
    }
    if (a.kind === 'duck') lift = Math.round(Math.sin(a.clock * 1.6 + a.seed) * 0.6) - 1;
    const x = Math.round(sx - pic.w / 2);
    const y = Math.round(a.y - pic.h - lift);
    if (a.kind === 'duck') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x - 1, a.y, pic.w + 2, 1);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 1, a.y - 1, pic.w - 2, 2);
    }
    if (a.dir === 1) {
      ctx.drawImage(pic.canvas, x, y);
      return;
    }
    ctx.save();
    ctx.translate(x + pic.w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(pic.canvas, 0, 0);
    ctx.restore();
  }

  private picture(a: Animal): Picture {
    if (a.kind === 'rabbit') return PICTURES.rabbit;
    if (a.kind === 'duck') return PICTURES.duck;
    if (a.kind === 'fox') {
      if (a.mood === 'sit') return PICTURES.foxStand;
      const rate = a.mood === 'flee' ? FOX.fleeRate : FOX.walkRate;
      return Math.floor(a.clock * rate) % 2 === 0 ? PICTURES.foxStand : PICTURES.foxTrot;
    }
    if (a.mood === 'graze') return PICTURES.deerGraze;
    if (a.mood === 'walk' || a.mood === 'flee') {
      const rate = a.mood === 'flee' ? 9 : 3;
      return Math.floor(a.clock * rate) % 2 === 0 ? PICTURES.deerUp : PICTURES.deerStride;
    }
    return PICTURES.deerUp;
  }
}
