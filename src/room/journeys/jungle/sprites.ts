import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { pixmap } from '../pixmap';

export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface JungleSprites {
  palmsFar: Sprite[];
  palmsMid: Sprite[];
  fernsMid: Sprite[];
  fernsNear: Sprite[];
  leavesFar: Sprite[];
  leavesMid: Sprite[];
  leavesNear: Sprite[];
  orchids: Sprite[];
  bioFlowers: Sprite[];
  bioGlows: Sprite[];
  wetRocks: Sprite[];
  lilyPads: Sprite[];
  driftwood: Sprite[];
  boat: Sprite;
  temple: Sprite;
  templeGlow: Sprite;
  stones: Sprite[];
  stoneGlows: Sprite[];
}

const LEAF_TONES_FAR: [RGB, RGB, RGB] = [[64, 108, 76], [42, 82, 58], [26, 56, 42]];
const LEAF_TONES_MID: [RGB, RGB, RGB] = [[96, 152, 74], [58, 108, 52], [32, 68, 38]];
const LEAF_TONES_NEAR: [RGB, RGB, RGB] = [[118, 174, 78], [72, 126, 54], [36, 74, 38]];
const PALM_FAR: [RGB, RGB] = [[54, 92, 74], [36, 66, 56]];
const PALM_MID: [RGB, RGB, RGB] = [[88, 138, 72], [54, 96, 54], [30, 58, 38]];
const FERN_TONES: [RGB, RGB, RGB] = [[104, 158, 76], [62, 114, 52], [32, 70, 38]];
const TRUNK_PALM: [RGB, RGB] = [[96, 74, 54], [64, 48, 36]];
const TRUNK_FERN: [RGB, RGB] = [[74, 54, 38], [48, 34, 24]];

const ORCHID_ROWS: readonly string[][] = [
  ['.pp.', 'pyyp', '.pp.', '..g.', '.g..'],
  ['.vv.', 'vwwv', '.vv.', '.g..', '.g..'],
  ['.oo.', 'oyyo', '.oo.', '..g.', '..g.'],
];

const BIO_ROWS: readonly string[][] = [
  ['.c.', 'cwc', '.c.', '.g.'],
  ['.t.', 'tct', '.t.', '.g.'],
  ['.a.', 'aya', '.a.', '.g.'],
];

const LILY_ROWS: readonly string[][] = [
  ['..ggggg..', '.gllggdg.', 'ggggggggg', 'ggdggggd.', '.ggggggg.'],
  ['.ggggg.', 'gllggdg', 'ggggggg', '.ggg.g.'],
];

const DRIFTWOOD_ROWS: readonly string[][] = [
  ['...bbb.......', '.bbllbbbbbbb.', 'ddddddddbbdd.'],
  ['..bbllbbbb.', 'ddddddddddd'],
];

const STONE_SYMBOLS: readonly string[][] = [
  ['.g.', 'ggg', '.g.', 'g.g'],
  ['ggg', 'g.g', 'ggg', 'g.g'],
  ['.g.', 'g.g', 'ggg', '.g.'],
  ['g.g', '.g.', 'g.g', 'ggg'],
  ['ggg', '.g.', '.g.', 'ggg'],
];

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const res = memoryCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  res.ctx.imageSmoothingEnabled = false;
  return res;
}

function toSprite(canvas: HTMLCanvasElement): Sprite {
  return { canvas, w: canvas.width, h: canvas.height };
}

function plot(ctx: CanvasRenderingContext2D, x: number, y: number, color: RGB): void {
  ctx.fillStyle = css(color);
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** Builds a curved palm tree sprite with drooping pixel fronds. */
function buildPalm(h: number, lean: number, tones: readonly RGB[], rnd: () => number): Sprite {
  const w = Math.max(14, Math.round(h * 0.85));
  const { canvas, ctx } = makeCanvas(w, h);
  const baseX = Math.round(w * 0.5 - lean * w * 0.14);
  const topX = Math.round(w * 0.5 + lean * w * 0.18);
  const topY = Math.round(h * 0.24);
  const trunkW = Math.max(2, Math.round(h * 0.045));

  for (let y = topY; y < h; y++) {
    const t = (y - topY) / Math.max(1, h - topY);
    const curve = Math.sin(t * Math.PI * 0.5);
    const cx = Math.round(topX + (baseX - topX) * curve);
    const seg = Math.floor(y / 3) % 2;
    ctx.fillStyle = css(seg === 0 ? TRUNK_PALM[0] : TRUNK_PALM[1]);
    ctx.fillRect(cx, y, trunkW, 1);
    ctx.fillStyle = css(TRUNK_PALM[1]);
    ctx.fillRect(cx + trunkW - 1, y, 1, 1);
  }

  const fronds = 6 + Math.floor(rnd() * 3);
  const frondLen = Math.round(h * 0.34);
  for (let i = 0; i < fronds; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const spread = 0.25 + (Math.floor(i / 2) / Math.max(1, Math.floor(fronds / 2))) * 0.95;
    const droop = 0.3 + rnd() * 0.45;
    for (let s = 0; s < frondLen; s++) {
      const k = s / frondLen;
      const fx = Math.round(topX + side * s * spread * 0.92);
      const fy = Math.round(topY - Math.sin(k * Math.PI * 0.7) * frondLen * 0.35 + k * k * frondLen * droop);
      const leafCol = tones[k < 0.35 ? 0 : Math.min(tones.length - 1, 1)];
      plot(ctx, fx, fy, leafCol);
      if (s > 2 && s % 2 === 0) {
        const drop = Math.max(1, Math.round((1 - k * 0.5) * (h * 0.055)));
        for (let d = 1; d <= drop; d++) {
          plot(ctx, fx - side, fy + d, tones[Math.min(tones.length - 1, d === 1 ? 1 : tones.length - 1)]);
        }
      }
    }
  }
  return toSprite(canvas);
}

/** Builds a tropical tree fern with radiating notched fronds. */
function buildFern(h: number, tones: readonly RGB[], rnd: () => number): Sprite {
  const w = Math.max(12, Math.round(h * 0.95));
  const { canvas, ctx } = makeCanvas(w, h);
  const cx = Math.round(w / 2);
  const crownY = Math.round(h * 0.34);
  const trunkW = Math.max(2, Math.round(h * 0.07));
  for (let y = crownY; y < h; y++) {
    ctx.fillStyle = css(TRUNK_FERN[0]);
    ctx.fillRect(cx - 1, y, trunkW, 1);
    ctx.fillStyle = css(TRUNK_FERN[1]);
    ctx.fillRect(cx + trunkW - 2, y, 1, 1);
  }
  const arms = 6;
  const armLen = Math.round(w * 0.44);
  for (let i = 0; i < arms; i++) {
    const dir = i < arms / 2 ? -1 : 1;
    const lift = ((i % (arms / 2)) / (arms / 2)) * 0.75 + 0.15;
    for (let s = 0; s < armLen; s++) {
      const k = s / armLen;
      const x = Math.round(cx + dir * s);
      const y = Math.round(crownY - lift * armLen * 0.45 * Math.sin(k * Math.PI * 0.85) + k * k * armLen * 0.36);
      plot(ctx, x, y, tones[0]);
      if (s > 1) {
        const span = Math.max(1, Math.round((1 - Math.abs(k - 0.45)) * (2 + rnd())));
        for (let dy = 1; dy <= span; dy++) {
          plot(ctx, x, y + dy, tones[dy === 1 ? 1 : 2]);
        }
      }
    }
  }
  return toSprite(canvas);
}

/** Builds a giant tropical leaf (monstera/elephant-ear style) with midrib and 1px rim lighting. */
function buildGiantLeaf(w: number, h: number, tones: readonly [RGB, RGB, RGB], notched: boolean, flip: boolean): Sprite {
  const { canvas, ctx } = makeCanvas(w, h);
  const cx = Math.floor(w / 2);
  const lightEdge = mix(tones[0], [230, 245, 190], 0.28);
  for (let y = 0; y < h; y++) {
    const v = y / Math.max(1, h - 1);
    const widthProfile = Math.sin(Math.pow(v, 0.72) * Math.PI);
    const half = Math.max(0, Math.round((w * 0.46) * widthProfile));
    if (half === 0) continue;
    const notchA = notched && Math.abs(v - 0.35) < 0.055;
    const notchB = notched && Math.abs(v - 0.63) < 0.055;
    for (let dx = -half; dx <= half; dx++) {
      const px = flip ? cx - dx : cx + dx;
      const absD = Math.abs(dx) / Math.max(1, half);
      if ((notchA || notchB) && absD > 0.48) continue;
      let col = tones[1];
      if (y === 0 || dx === -half || (v < 0.35 && dx < 0)) col = tones[0];
      if (dx === -half && v < 0.7) col = lightEdge;
      if (dx === half || v > 0.82) col = tones[2];
      if (Math.abs(dx) <= 0 && v > 0.12 && v < 0.88) col = tones[0];
      plot(ctx, px, y, col);
    }
  }
  return toSprite(canvas);
}

function buildWetRock(w: number, h: number, rnd: () => number): Sprite {
  const { canvas, ctx } = makeCanvas(w, h);
  const dark: RGB = [34, 42, 46];
  const mid: RGB = [56, 68, 72];
  const wet: RGB = [118, 146, 152];
  const moss: RGB = [44, 88, 48];
  for (let y = 0; y < h; y++) {
    const t = y / Math.max(1, h - 1);
    const span = Math.round(w * (0.35 + 0.65 * Math.sin(t * Math.PI * 0.62)));
    const left = Math.round((w - span) / 2 + (rnd() - 0.5) * 1.4);
    for (let x = left; x < left + span; x++) {
      let col = mid;
      if (y < 2 || x === left) col = wet;
      else if (x > left + span - 3 || t > 0.7) col = dark;
      else if (t < 0.28 && rnd() < 0.25) col = moss;
      plot(ctx, x, y, col);
    }
  }
  return toSprite(canvas);
}

/** Builds the curved wooden bow/gunwale of the drifting longboat at the bottom-left foreground. */
function buildBoat(unit: number): Sprite {
  const w = Math.max(48, Math.round(118 * unit));
  const h = Math.max(14, Math.round(32 * unit));
  const { canvas, ctx } = makeCanvas(w, h);
  const hullDark: RGB = [38, 24, 16];
  const hullMid: RGB = [68, 44, 28];
  const hullHi: RGB = [116, 80, 48];
  const rimGold: RGB = [184, 142, 74];

  for (let x = 0; x < w; x++) {
    const t = x / Math.max(1, w - 1);
    const topY = Math.round(h * (0.28 + 0.44 * Math.sin(t * Math.PI * 0.55)));
    for (let y = topY; y < h; y++) {
      let col = hullDark;
      if (y === topY) col = t > 0.72 ? rimGold : hullHi;
      else if (y < topY + Math.max(2, Math.round(3 * unit))) col = hullMid;
      plot(ctx, x, y, col);
    }
  }
  // Carved prow tip curving up on the right end of the bow
  const tipX = Math.round(w * 0.86);
  const tipTop = Math.round(h * 0.14);
  for (let y = tipTop; y < Math.round(h * 0.68); y++) {
    const k = (y - tipTop) / Math.max(1, Math.round(h * 0.54));
    const rx = Math.round(tipX + (1 - k) * 9 * unit);
    ctx.fillStyle = css(hullDark);
    ctx.fillRect(rx - 2, y, Math.max(3, Math.round(4 * unit)), 1);
    plot(ctx, rx - 2, y, y < tipTop + 3 ? rimGold : hullHi);
  }
  return toSprite(canvas);
}

/** Builds the overgrown temple sanctuary and its glowing rune overlay on matching dimensions. */
function buildTemple(unit: number): { temple: Sprite; glow: Sprite } {
  const w = Math.max(54, Math.round(132 * unit));
  const h = Math.max(48, Math.round(118 * unit));
  const base = makeCanvas(w, h);
  const glow = makeCanvas(w, h);
  const B = base.ctx;
  const G = glow.ctx;

  const stoneDark: RGB = [52, 58, 56];
  const stoneMid: RGB = [86, 94, 86];
  const stoneLight: RGB = [122, 130, 114];
  const mossLight: RGB = [76, 126, 62];
  const mossDark: RGB = [38, 76, 42];
  const doorDark: RGB = [16, 22, 22];
  const runeGlow: RGB = [110, 240, 200];
  const doorGlow: RGB = [248, 212, 128];

  // Stepped temple body
  const tiers = [
    { x: 0.16, y: 0.08, w: 0.68, h: 0.22 },
    { x: 0.08, y: 0.28, w: 0.84, h: 0.34 },
    { x: 0.02, y: 0.60, w: 0.96, h: 0.40 },
  ];
  const rnd = seededRandom(901);
  for (const tier of tiers) {
    const tx = Math.round(tier.x * w);
    const ty = Math.round(tier.y * h);
    const tw = Math.round(tier.w * w);
    const th = Math.round(tier.h * h);
    for (let y = ty; y < ty + th; y++) {
      for (let x = tx; x < tx + tw; x++) {
        const edge = x === tx || y === ty;
        const shadow = x >= tx + tw - 2 || y >= ty + th - 2;
        const seam = (y - ty) % 5 === 0 || (x - tx + Math.floor((y - ty) / 5) * 4) % 9 === 0;
        let col = stoneMid;
        if (edge) col = stoneLight;
        else if (shadow || seam) col = stoneDark;
        if (rnd() < 0.14 || y < ty + 2) col = rnd() < 0.55 ? mossDark : mossLight;
        plot(B, x, y, col);
      }
    }
  }

  // Carved stone guardian faces flanking the upper tier
  for (const fxRatio of [0.24, 0.72]) {
    const fx = Math.round(fxRatio * w);
    const fy = Math.round(0.35 * h);
    const fw = Math.max(5, Math.round(10 * unit));
    const fh = Math.max(6, Math.round(13 * unit));
    B.fillStyle = css(stoneLight);
    B.fillRect(fx, fy, fw, fh);
    B.fillStyle = css(stoneDark);
    B.fillRect(fx + 1, fy + 2, 2, 2);
    B.fillRect(fx + fw - 3, fy + 2, 2, 2);
    B.fillRect(fx + 2, fy + fh - 3, fw - 4, 2);
    B.fillStyle = css(mossLight);
    B.fillRect(fx, fy, fw, 1);
  }

  // Dark arched doorway in center + stairs down into the river
  const dw = Math.max(8, Math.round(22 * unit));
  const dh = Math.max(12, Math.round(30 * unit));
  const dx = Math.round((w - dw) / 2);
  const dy = Math.round(0.42 * h);
  B.fillStyle = css(doorDark);
  B.fillRect(dx, dy, dw, dh);
  G.fillStyle = css(doorGlow, 0.85);
  G.fillRect(dx + 1, dy + 1, dw - 2, dh - 2);
  G.fillStyle = css([255, 248, 210], 0.9);
  G.fillRect(dx + 3, dy + 3, dw - 6, dh - 6);

  // Carved rune pillars on doorway sides
  for (let i = 0; i < 4; i++) {
    const ry = dy + 3 + i * Math.max(2, Math.round(6 * unit));
    G.fillStyle = css(runeGlow);
    G.fillRect(dx - Math.max(2, Math.round(4 * unit)), ry, 2, 2);
    G.fillRect(dx + dw + Math.max(1, Math.round(2 * unit)), ry, 2, 2);
  }

  // Steps descending into the water
  const stairW = Math.round(dw * 1.45);
  const stairX = Math.round((w - stairW) / 2);
  const stairStart = dy + dh;
  const steps = 6;
  const stepH = Math.max(2, Math.round((h - stairStart) / steps));
  for (let s = 0; s < steps; s++) {
    const sy = stairStart + s * stepH;
    const sw = stairW + s * 2;
    const sx = stairX - s;
    B.fillStyle = css(stoneLight);
    B.fillRect(sx, sy, sw, 1);
    B.fillStyle = css(s > 3 ? stoneDark : stoneMid);
    B.fillRect(sx, sy + 1, sw, Math.max(1, stepH - 1));
  }

  return { temple: toSprite(base.canvas), glow: toSprite(glow.canvas) };
}

/** Builds the 5 clickable water's-edge carved stones and their glowing rune masks. */
function buildStones(unit: number): { stones: Sprite[]; glows: Sprite[] } {
  const stones: Sprite[] = [];
  const glows: Sprite[] = [];
  const sw = Math.max(7, Math.round(11 * unit));
  const sh = Math.max(9, Math.round(14 * unit));
  const stoneMid: RGB = [88, 96, 88];
  const stoneLight: RGB = [132, 138, 122];
  const stoneDark: RGB = [44, 52, 48];
  const moss: RGB = [62, 114, 54];
  const glyphCol: RGB = [140, 248, 210];

  for (let i = 0; i < STONE_SYMBOLS.length; i++) {
    const base = makeCanvas(sw, sh);
    const glow = makeCanvas(sw, sh);
    const B = base.ctx;
    const G = glow.ctx;

    for (let y = 1; y < sh; y++) {
      const inset = y < 3 ? 1 : 0;
      for (let x = inset; x < sw - inset; x++) {
        let col = stoneMid;
        if (x === inset || y === 1) col = stoneLight;
        else if (x === sw - 1 - inset || y === sh - 1) col = stoneDark;
        if (y <= 2 && x % 2 === 0) col = moss;
        plot(B, x, y, col);
      }
    }

    const sym = STONE_SYMBOLS[i];
    const ox = Math.floor((sw - sym[0].length) / 2);
    const oy = Math.floor((sh - sym.length) / 2) + 1;
    for (let r = 0; r < sym.length; r++) {
      for (let c = 0; c < sym[r].length; c++) {
        if (sym[r][c] !== 'g') continue;
        plot(B, ox + c, oy + r, stoneDark);
        plot(G, ox + c, oy + r, glyphCol);
      }
    }
    stones.push(toSprite(base.canvas));
    glows.push(toSprite(glow.canvas));
  }
  return { stones, glows };
}

export function buildSprites(unit: number): JungleSprites {
  const rnd = seededRandom(4242);
  const palmsFar = [-1, 1, -0.5, 0.7].map((lean, i) =>
    buildPalm(Math.max(26, Math.round((56 + i * 7) * unit)), lean, PALM_FAR, rnd),
  );
  const palmsMid = [-0.8, 0.9, -0.4].map((lean, i) =>
    buildPalm(Math.max(36, Math.round((78 + i * 10) * unit)), lean, PALM_MID, rnd),
  );
  const fernsMid = [0, 1, 2].map((i) => buildFern(Math.max(18, Math.round((34 + i * 6) * unit)), FERN_TONES, rnd));
  const fernsNear = [0, 1, 2].map((i) => buildFern(Math.max(24, Math.round((46 + i * 7) * unit)), FERN_TONES, rnd));

  const leavesFar = [0, 1, 2].map((i) =>
    buildGiantLeaf(Math.max(8, Math.round((13 + i * 2) * unit)), Math.max(10, Math.round((18 + i * 3) * unit)), LEAF_TONES_FAR, i % 2 === 0, i === 1),
  );
  const leavesMid = [0, 1, 2].map((i) =>
    buildGiantLeaf(Math.max(12, Math.round((19 + i * 3) * unit)), Math.max(16, Math.round((28 + i * 4) * unit)), LEAF_TONES_MID, i !== 1, i === 2),
  );
  const leavesNear = [0, 1, 2].map((i) =>
    buildGiantLeaf(Math.max(18, Math.round((28 + i * 5) * unit)), Math.max(24, Math.round((38 + i * 6) * unit)), LEAF_TONES_NEAR, i !== 2, i === 1),
  );

  const orchidPalette = { p: '#e87cb8', y: '#f8dc6c', v: '#b87cf0', w: '#f6eef8', o: '#f29a4e', g: '#3d7c3e' };
  const orchids = ORCHID_ROWS.map((rows) => toSprite(pixmap(rows, orchidPalette)));

  const bioPalette = { c: '#54f0d8', w: '#dcfff8', t: '#68b8f8', a: '#f4d868', y: '#fff8c4', g: '#285640' };
  const bioFlowers = BIO_ROWS.map((rows) => toSprite(pixmap(rows, bioPalette)));
  const bioGlowPalette = { c: '#78fff0', w: '#ffffff', t: '#88d4ff', a: '#ffe888', y: '#ffffff', g: '' };
  const bioGlows = BIO_ROWS.map((rows) => toSprite(pixmap(rows, bioGlowPalette)));

  const wetRocks = [0, 1, 2].map((i) => buildWetRock(Math.max(12, Math.round((20 + i * 7) * unit)), Math.max(8, Math.round((12 + i * 4) * unit)), rnd));
  const lilyPalette = { g: '#428446', l: '#68b058', d: '#285630' };
  const lilyPads = LILY_ROWS.map((rows) => toSprite(pixmap(rows, lilyPalette)));
  const woodPalette = { b: '#6c4b34', l: '#8e6648', d: '#3c281c' };
  const driftwood = DRIFTWOOD_ROWS.map((rows) => toSprite(pixmap(rows, woodPalette)));

  const { temple, glow } = buildTemple(unit);
  const { stones, glows } = buildStones(unit);

  return {
    palmsFar,
    palmsMid,
    fernsMid,
    fernsNear,
    leavesFar,
    leavesMid,
    leavesNear,
    orchids,
    bioFlowers,
    bioGlows,
    wetRocks,
    lilyPads,
    driftwood,
    boat: buildBoat(unit),
    temple,
    templeGlow: glow,
    stones,
    stoneGlows: glows,
  };
}
