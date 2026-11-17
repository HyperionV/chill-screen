import { clamp01 } from '../sky';
import { CAMP_WORLD_X, ROAD_LENGTH } from './biomes';
import { wind } from './sprites';
import type { Pointer, Rows, Standing } from './wildlife';
import { memoryCanvas } from '../../render/pixel-stage';
import type { RGB } from '../../render/color';

interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface SmokeWisp {
  x: number;
  y: number;
  vy: number;
  age: number;
  maxAge: number;
  size: number;
}

const TENT_PALETTE: Record<string, RGB> = {
  a: [152, 134, 92],
  b: [124, 106, 70],
  c: [94, 78, 50],
  d: [64, 52, 34],
  w: [78, 54, 36],
  k: [24, 18, 18],
  i: [68, 42, 26],
  p: [158, 148, 128],
};

const TENT_ROWS = [
  '.............ww.............',
  '............aabb............',
  '...........aaabbb...........',
  '..........aaaabbbb..........',
  '.........aaaaabbbbb.........',
  '........aaaaaabbbbbb........',
  '.......aaaaaaabbbbbbb.......',
  '......aaaaaaaabbbbbbbb......',
  '.....aaaaaaaaabbbbbbbbb.....',
  '....aaaaaaaaabkbbbbbbbbb....',
  '...aaaaaaaaabkkkbbbbbbbbb...',
  '..aaaaaaaaabkkikkbbbbbbbbb..',
  '.aaaaaaaaabkkiiikkbbbbbbbbb.',
  '.cccccccccbkiiiiikccccccccc.',
  'p.dddddddddkiiiiikdddddddd.p',
  'p.dddddddddkiiiiikdddddddd.p',
];

const BENCH_PALETTE: Record<string, RGB> = {
  l: [122, 88, 56],
  b: [92, 64, 40],
  d: [62, 42, 26],
  m: [82, 118, 60],
};

const BENCH_ROWS = [
  '..llllmllllbllllmllll..',
  '.bbbbbbmbbbbbbbbbmbbbb.',
  'dddddddbddddddddddddddd',
  '..dd.dd.........dd.dd..',
  '..dd.dd.........dd.dd..',
];

const RING_PALETTE: Record<string, RGB> = {
  l: [148, 142, 132],
  s: [108, 102, 96],
  d: [72, 68, 64],
  w: [74, 46, 30],
  k: [42, 26, 18],
  e: [198, 68, 24],
  g: [242, 134, 40],
};

const RING_ROWS = [
  '....lss..ssl....',
  '..lsswwkkwwssl..',
  '.lsdwwgeegwwdsl.',
  '.ssdwkeeekwwdss.',
  '..dssswwwwsssd..',
  '....dddddddd....',
];

const LANTERN_PALETTE: Record<string, RGB> = {
  w: [94, 64, 40],
  d: [62, 42, 26],
  i: [54, 58, 66],
  g: [248, 184, 72],
  c: [255, 242, 184],
};

const LANTERN_ROWS = [
  '.wwwwww..',
  '.wd..i...',
  '.wd.iii..',
  '.wd.iggi.',
  '.wd.icci.',
  '.wd.iii..',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  '.wd......',
  'dwd......',
];

const TRAVELLER_PALETTE: Record<string, RGB> = {
  h: [88, 124, 104],
  g: [62, 92, 76],
  d: [38, 60, 48],
  f: [216, 176, 136],
  k: [28, 20, 18],
  p: [128, 80, 48],
  q: [86, 52, 30],
};

const TRAVELLER_IDLE = [
  '....hhh.....',
  '...hgggg....',
  '...dggffg...',
  '...dggffk...',
  '.qphggggd...',
  'qpphggggg...',
  'qppdgggggg..',
  'qqqdddddd...',
  '...dddddd...',
  '....kk.kk...',
];

const TRAVELLER_WARM = [
  '....hhh.....',
  '...hgggg....',
  '...dggffg...',
  '...dggffk...',
  '.qphggggd...',
  'qpphggggggf.',
  'qppdggggg...',
  'qqqdddddd...',
  '...dddddd...',
  '....kk.kk...',
];

const TRAVELLER_WAVE_A = [
  '.f..hhh.....',
  '.ghhgggg....',
  '..gdggffg...',
  '...dggffk...',
  '.qphggggd...',
  'qpphggggd...',
  'qppdggggd...',
  'qqqdddddd...',
  '...dddddd...',
  '....kk.kk...',
];

const TRAVELLER_WAVE_B = [
  '..f.hhh.....',
  '..ghgggg....',
  '..gdggffg...',
  '...dggffk...',
  '.qphggggd...',
  'qpphggggd...',
  'qppdggggd...',
  'qqqdddddd...',
  '...dddddd...',
  '....kk.kk...',
];

function bake(rows: readonly string[], palette: Readonly<Record<string, RGB>>): Sprite {
  const w = rows[0].length;
  const { canvas, ctx } = memoryCanvas(w, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (!c) return;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return { canvas, w, h: rows.length };
}

const CAMP_SPRITES = {
  tent: bake(TENT_ROWS, TENT_PALETTE),
  bench: bake(BENCH_ROWS, BENCH_PALETTE),
  ring: bake(RING_ROWS, RING_PALETTE),
  lantern: bake(LANTERN_ROWS, LANTERN_PALETTE),
  travellerIdle: bake(TRAVELLER_IDLE, TRAVELLER_PALETTE),
  travellerWarm: bake(TRAVELLER_WARM, TRAVELLER_PALETTE),
  travellerWaveA: bake(TRAVELLER_WAVE_A, TRAVELLER_PALETTE),
  travellerWaveB: bake(TRAVELLER_WAVE_B, TRAVELLER_PALETTE),
};

const TENT_OFFSET_X = -58;
const BENCH_OFFSET_X = -24;
const TRAVELLER_OFFSET_X = -23;
const LANTERN_OFFSET_X = 40;
const STOKE_DURATION = 4.5;
const WAVE_DURATION = 1.6;
const WAVE_RADIUS = 46;
const STOKE_RADIUS = 22;
const MAX_SPARKS = 28;
const MAX_SMOKE = 12;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Draws a pixel-stepped horizontal ellipse filled with `fillStyle` (no anti-aliasing). */
function fillPixelEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const rxi = Math.round(rx);
  const ryi = Math.round(ry);
  if (rxi <= 0 || ryi <= 0) return;
  for (let dy = -ryi; dy <= ryi; dy++) {
    const t = dy / ryi;
    const half = Math.round(rxi * Math.sqrt(Math.max(0, 1 - t * t)));
    if (half > 0) ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

/**
 * The Campfire Clearing campsite: tent, log bench, hooded traveller with a pack, stone-ring campfire with
 * three-layer flames, sparks, smoke and warm firelight, plus a lantern on a post.
 */
export class Clearing {
  private stokeTimer = 0;
  private waveTimer = 0;
  private sparkCooldown = 0.2;
  private smokeCooldown = 0.4;
  private readonly sparks: Ember[] = [];
  private readonly smoke: SmokeWisp[] = [];
  private lastCampWorldX: number | null = null;

  /** Returns the world X of the nearest campsite if it lies near the visible window. */
  campWorldX(scroll: number, w: number): number | null {
    const k = Math.round((scroll + w * 0.5 - CAMP_WORLD_X) / ROAD_LENGTH);
    const wx = k * ROAD_LENGTH + CAMP_WORLD_X;
    if (wx < scroll - 140 || wx > scroll + w + 140) return null;
    return wx;
  }

  private fireY(rows: Rows): number {
    return Math.round(rows.dryTop + (rows.dryBottom - rows.dryTop) * 0.56);
  }

  private benchY(rows: Rows): number {
    return this.fireY(rows) - 3;
  }

  update(dt: number, scroll: number, w: number, pointer: Pointer | null, rows: Rows): void {
    this.stokeTimer = Math.max(0, this.stokeTimer - dt);
    this.waveTimer = Math.max(0, this.waveTimer - dt);

    const campX = this.campWorldX(scroll, w);
    if (campX === null) {
      this.sparks.length = 0;
      this.smoke.length = 0;
      this.lastCampWorldX = null;
      return;
    }
    if (this.lastCampWorldX !== campX) {
      this.sparks.length = 0;
      this.smoke.length = 0;
      this.lastCampWorldX = campX;
    }

    const sx = campX - scroll;
    const fy = this.fireY(rows);
    const travX = sx + TRAVELLER_OFFSET_X;
    const travY = this.benchY(rows) - 6;

    if (pointer && Math.hypot(pointer.x - travX, pointer.y - travY) < WAVE_RADIUS) {
      this.waveTimer = WAVE_DURATION;
    }

    const stoke = clamp01(this.stokeTimer / STOKE_DURATION);
    this.sparkCooldown -= dt * (1 + stoke * 3.5);
    if (this.sparkCooldown <= 0) {
      this.sparkCooldown = rand(0.24, 0.52);
      if (this.sparks.length < MAX_SPARKS) {
        this.sparks.push({
          x: campX + rand(-3, 3),
          y: fy - 4,
          vx: rand(-5, 5),
          vy: -rand(12, 22) * (1 + stoke * 0.45),
          life: 0,
          maxLife: rand(0.9, 1.8),
        });
      }
    }

    this.smokeCooldown -= dt;
    if (this.smokeCooldown <= 0) {
      this.smokeCooldown = rand(0.45, 0.8);
      if (this.smoke.length < MAX_SMOKE) {
        this.smoke.push({
          x: campX + rand(-2, 2),
          y: fy - 10,
          vy: -rand(7, 11),
          age: 0,
          maxAge: rand(2.2, 3.6),
          size: Math.random() < 0.5 ? 2 : 3,
        });
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx += rand(-10, 10) * dt;
      if (s.life >= s.maxLife) this.sparks.splice(i, 1);
    }

    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const m = this.smoke[i];
      m.age += dt;
      m.y += m.vy * dt;
      if (m.age >= m.maxAge) this.smoke.splice(i, 1);
    }
  }

  /** Returns true when the traveller is waving because the pointer moved near them. */
  isTravellerWaving(): boolean {
    return this.waveTimer > 0;
  }

  /** Stokes the fire on a click near the campfire; returns true if the click hit the fire. */
  tryStoke(x: number, y: number, scroll: number, w: number, rows: Rows): boolean {
    const campX = this.campWorldX(scroll, w);
    if (campX === null) return false;
    const sx = campX - scroll;
    const fy = this.fireY(rows) - 3;
    if (Math.hypot(x - sx, y - fy) > STOKE_RADIUS) return false;
    this.stokeTimer = STOKE_DURATION;
    const fyBase = this.fireY(rows);
    for (let i = 0; i < 14 && this.sparks.length < MAX_SPARKS; i++) {
      this.sparks.push({
        x: campX + rand(-4, 4),
        y: fyBase - 4,
        vx: rand(-14, 14),
        vy: -rand(18, 34),
        life: 0,
        maxLife: rand(0.8, 1.6),
      });
    }
    return true;
  }

  /** Props sorted by foot Y so the fox, bushes and campsite overlap naturally. */
  standing(scroll: number, w: number, rows: Rows, time: number): Standing[] {
    const campX = this.campWorldX(scroll, w);
    if (campX === null) return [];
    const sx = campX - scroll;
    const fy = this.fireY(rows);
    const by = this.benchY(rows);
    const ty = Math.round(rows.dryTop + (rows.dryBottom - rows.dryTop) * 0.25);
    const ly = fy + 1;

    return [
      {
        y: ty,
        paint: (L) => {
          const sp = CAMP_SPRITES.tent;
          const x = Math.round(sx + TENT_OFFSET_X - sp.w / 2);
          L.fillStyle = 'rgba(0,0,0,0.22)';
          L.fillRect(x + 2, ty - 1, sp.w - 4, 2);
          L.drawImage(sp.canvas, x, ty - sp.h);
        },
      },
      {
        y: by,
        paint: (L) => {
          const bench = CAMP_SPRITES.bench;
          const bx = Math.round(sx + BENCH_OFFSET_X - bench.w / 2);
          L.fillStyle = 'rgba(0,0,0,0.22)';
          L.fillRect(bx + 2, by - 1, bench.w - 4, 2);
          L.drawImage(bench.canvas, bx, by - bench.h);

          const trav = this.travellerSprite(time);
          const tx = Math.round(sx + TRAVELLER_OFFSET_X - trav.w / 2);
          L.drawImage(trav.canvas, tx, by - bench.h - trav.h + 3);
        },
      },
      {
        y: fy,
        paint: (L) => {
          const ring = CAMP_SPRITES.ring;
          L.drawImage(ring.canvas, Math.round(sx - ring.w / 2), fy - ring.h + 2);
        },
      },
      {
        y: ly,
        paint: (L) => {
          const post = CAMP_SPRITES.lantern;
          const lx = Math.round(sx + LANTERN_OFFSET_X - 2);
          L.fillStyle = 'rgba(0,0,0,0.2)';
          L.fillRect(lx - 1, ly - 1, 4, 2);
          L.drawImage(post.canvas, lx, ly - post.h);
        },
      },
    ];
  }

  private travellerSprite(time: number): Sprite {
    if (this.waveTimer > 0) {
      return Math.floor(time * 2.8) % 2 === 0 ? CAMP_SPRITES.travellerWaveA : CAMP_SPRITES.travellerWaveB;
    }
    return Math.sin(time * 0.45) > 0.25 ? CAMP_SPRITES.travellerWarm : CAMP_SPRITES.travellerIdle;
  }

  /** Tints the ground and nearby camp/plants with warm light; strongest at dusk and night. */
  drawGlow(
    L: CanvasRenderingContext2D,
    scroll: number,
    w: number,
    rows: Rows,
    day: number,
    time: number,
  ): void {
    const campX = this.campWorldX(scroll, w);
    if (campX === null) return;
    const sx = campX - scroll;
    const fy = this.fireY(rows) - 2;
    const stoke = clamp01(this.stokeTimer / STOKE_DURATION);
    const pulse = 1 + 0.05 * Math.sin(time * 4.2) + stoke * 0.35;
    const nightWeight = 0.22 + 0.78 * (1 - day);
    const intensity = Math.min(1, nightWeight * (1 + stoke * 0.45));

    L.save();
    L.globalCompositeOperation = 'source-atop';
    L.fillStyle = `rgba(255,138,44,${(0.11 * intensity).toFixed(3)})`;
    fillPixelEllipse(L, sx, fy, 74 * pulse, 26 * pulse);
    L.fillStyle = `rgba(255,168,68,${(0.17 * intensity).toFixed(3)})`;
    fillPixelEllipse(L, sx, fy, 46 * pulse, 16 * pulse);
    L.fillStyle = `rgba(255,214,120,${(0.24 * intensity).toFixed(3)})`;
    fillPixelEllipse(L, sx, fy, 20 * pulse, 8 * pulse);

    const lx = sx + LANTERN_OFFSET_X + 4;
    const ly = this.fireY(rows) - 13;
    L.fillStyle = `rgba(255,186,84,${(0.14 * intensity).toFixed(3)})`;
    fillPixelEllipse(L, lx, ly, 16, 12);
    L.restore();
  }

  /** Draws the three-layer campfire flames, sparks, smoke wisps and lantern glow after `tintLand`. */
  drawFlamesAndParticles(
    L: CanvasRenderingContext2D,
    scroll: number,
    w: number,
    rows: Rows,
    time: number,
  ): void {
    const campX = this.campWorldX(scroll, w);
    if (campX === null) return;
    const sx = Math.round(campX - scroll);
    const fy = this.fireY(rows) - 1;
    const stoke = clamp01(this.stokeTimer / STOKE_DURATION);
    const boost = 1 + 0.65 * stoke;

    // Soft rising smoke wisps behind/above the flames.
    for (const m of this.smoke) {
      const t = m.age / m.maxAge;
      const alpha = Math.sin(Math.PI * t) * 0.26;
      if (alpha < 0.02) continue;
      const drift = wind(time * 0.7, m.x) * 8 * t;
      const mx = Math.round(m.x - scroll + drift);
      const my = Math.round(m.y);
      L.fillStyle = `rgba(205,210,222,${alpha.toFixed(3)})`;
      L.fillRect(mx, my, m.size, Math.max(1, m.size - 1));
    }

    // Layer 1 (outer deep orange-red flames)
    L.fillStyle = 'rgb(220,76,26)';
    for (let dx = -3; dx <= 3; dx++) {
      const wave = 0.5 + 0.5 * Math.sin(time * 5.2 + dx * 1.9);
      const colH = Math.round((3 + (3 - Math.abs(dx)) * 1.1 + wave * 2.5) * boost);
      L.fillRect(sx + dx, fy - colH, 1, colH);
    }

    // Layer 2 (middle bright amber flames)
    L.fillStyle = 'rgb(246,148,38)';
    for (let dx = -2; dx <= 2; dx++) {
      const wave = 0.5 + 0.5 * Math.sin(time * 6.5 + dx * 2.3 + 1.1);
      const colH = Math.round((2 + (2 - Math.abs(dx)) * 1.1 + wave * 2.1) * boost);
      L.fillRect(sx + dx, fy - colH, 1, colH);
    }

    // Layer 3 (inner pale yellow-cream core)
    L.fillStyle = 'rgb(255,240,168)';
    for (let dx = -1; dx <= 1; dx++) {
      const wave = 0.5 + 0.5 * Math.sin(time * 7.4 + dx * 2.7 + 2.2);
      const colH = Math.max(1, Math.round((1.5 + (1 - Math.abs(dx)) * 0.8 + wave * 1.4) * boost));
      L.fillRect(sx + dx, fy - colH, 1, colH);
    }

    // Rising sparks
    for (const s of this.sparks) {
      const t = s.life / s.maxLife;
      const alpha = (1 - t) * 0.95;
      const c = t < 0.45 ? `rgba(255,222,118,${alpha.toFixed(3)})` : `rgba(235,108,34,${alpha.toFixed(3)})`;
      L.fillStyle = c;
      L.fillRect(Math.round(s.x - scroll), Math.round(s.y), 1, 1);
    }

    // Subtle lantern flame pulse
    const lx = sx + LANTERN_OFFSET_X + 3;
    const ly = this.fireY(rows) - 13;
    const flicker = Math.sin(time * 4.7) > 0 ? 1 : 0;
    L.fillStyle = 'rgba(255,220,120,0.22)';
    L.fillRect(lx - 1, ly - 1, 4, 4);
    L.fillStyle = 'rgb(255,244,186)';
    L.fillRect(lx + flicker, ly, 1, 1);
  }
}
