import { mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { buildCastSprites, fromPixmap, type CastSprites, type Sprite } from './sprites-cast';

export type { Sprite, CastSprites };

const COTTAGE_PAL: Record<string, string> = {
  R: '#4c3e5e',
  r: '#342a42',
  d: '#241c30',
  m: '#4e7c4c',
  W: '#dfd2b8',
  w: '#b8a88e',
  t: '#6e4e34',
  k: '#3d2a1c',
  g: '#ffca5c',
  o: '#f29a3a',
  c: '#6e6a78',
  s: '#4c4956',
};

const COTTAGE = fromPixmap([
  '.........ccc..............',
  '.........csc..............',
  '.........csc..............',
  '........ccss..............',
  '.......RRRRRRR............',
  '......RRRRmrrrr...........',
  '.....RRRRmmrrrrrr.........',
  '....RRRRrrrrrrrrrd........',
  '...RRRRrrrrrrrrrrdd.......',
  '..RRRRmrrrrrrrrrrrdd......',
  '.RRRRrrrrrmrrrrrrrrdd.....',
  'RRRRrrrrrrrrrrrrrrrrdd....',
  'RRRRrrrrrrrrrrrrrrrrrrdd..',
  'dddddddddddddddddddddddddd',
  '.tttttttttttttttttttttttt.',
  '.tWWWWWtttWWWWWWWtWWWWWWt.',
  '.tWgggWtWtWWkkkWWtWWggWWt.',
  '.tWgogWtWtWWkkkWWtWWogWWt.',
  '.tWWWWWtWtWWkkkWWtWWWWWWt.',
  '.twwwwwtWtWWkkkWWtwwwwwwt.',
  '.tttttttWtWWkkdWWtwwwwwwt.',
  '.twwwwwwWtWWkkkWWtwwwwwwt.',
  '.twwwwwwWtWWkkkWWtwwwwwwt.',
  '.tttttttttttttttttttttttt.',
], COTTAGE_PAL);

const CAULDRON = fromPixmap([
  '...bbbbbb...',
  '..gggggggg..',
  '.kkkkkkkkkk.',
  'kkkkkkkkkkkk',
  'kkddkkkkddkk',
  'kkkkkkkkkkkk',
  '.kkkkkkkkkk.',
  '..kk....kk..',
  '.oo.oooo.oo.',
], {
  k: '#26242c', d: '#3c3a48', b: '#94e878', g: '#54a84e', o: '#f07828',
});

const LANTERN_POST = fromPixmap([
  '..ttttt.',
  '..t...t.',
  '..t...g.',
  '..t..glg',
  '..t..glg',
  '..t...g.',
  '..t.....',
  '..t.....',
  '..t.....',
  '..t.....',
  '..t.....',
  '..t.....',
  '.ttt....',
], { t: '#5c4028', g: '#42362c', l: '#ffd670' });

const HERB_RACK = fromPixmap([
  'tttttttttttt',
  '.g.p.g.y.g..',
  'gggppgyyggg.',
  '.g.p.g.y.g..',
  '.t........t.',
  '.t........t.',
  '.t........t.',
], { t: '#6e4e34', g: '#528c4e', p: '#9a6ab8', y: '#d8b454' });

const BROOM = fromPixmap([
  '...t.',
  '...t.',
  '..t..',
  '..t..',
  '..t..',
  '.bbb.',
  'ybyby',
  'bybyb',
], { t: '#7a5838', b: '#b48a46', y: '#d8b464' });

const FENCE = fromPixmap([
  '..t.....t.....t..',
  'ttttttttttttttttt',
  '..d.....d.....d..',
  '..t.....t.....t..',
  'ttttttttttttttttt',
  '..d.....d.....d..',
], { t: '#684a32', d: '#483222' });

export interface StoneSprite {
  base: Sprite;
  rune: Sprite;
}

function makeStone(rows: readonly string[]): StoneSprite {
  const basePal: Record<string, string> = {
    L: '#8a92a4', m: '#687082', d: '#485060', g: '#4c7456', R: '#323846',
  };
  const runePal: Record<string, string> = {
    R: '#b8f4ff',
  };
  return { base: fromPixmap(rows, basePal), rune: fromPixmap(rows, runePal) };
}

const STONES: readonly StoneSprite[] = [
  makeStone([
    '...LLm....',
    '..LLmmm...',
    '..LmRmmd..',
    '.LLRRRmdd.',
    '.LmmRmddd.',
    '.LmRRRmdd.',
    '.LmmRmddd.',
    '.Lmmmmddd.',
    '.gmmdmddg.',
    'ggddddddgg',
  ]),
  makeStone([
    '....LL....',
    '...LLmm...',
    '..LmRRmd..',
    '..LRmmRd..',
    '..LmRRmd..',
    '..Lmmmmd..',
    '..LmRRmd..',
    '..LRmmRd..',
    '..Lmmmdd..',
    '.gmddddmg.',
    'ggddddddgg',
  ]),
  makeStone([
    '..LLLLm...',
    '.LLmmmmm..',
    '.LmRRRmmd.',
    '.LmmRmmdd.',
    '.LmRRRmdd.',
    '.LmmRmmdd.',
    '.LmRRRmdd.',
    '.Lmmmmmdd.',
    '.gmmddddg.',
    'ggddddddgg',
  ]),
];

export const FLASH_HUES: readonly RGB[] = [
  [124, 244, 240],
  [244, 134, 224],
  [252, 224, 112],
  [144, 244, 162],
];

export interface MushroomKind {
  stem: Sprite;
  cap: Sprite;
  glow: Sprite;
  flashCaps: readonly Sprite[];
  spotColor: RGB;
}

function rgbStr(c: RGB): string {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

function makeMushroom(
  w: number,
  h: number,
  capH: number,
  stemColor: RGB,
  capColor: RGB,
  spotColor: RGB,
  seed: number,
): MushroomKind {
  const rnd = seededRandom(seed);
  const stem = memoryCanvas(w, h);
  const cap = memoryCanvas(w, h);
  const glow = memoryCanvas(w, h);
  const flash = FLASH_HUES.map(() => memoryCanvas(w, h));
  const cx = Math.floor(w / 2);
  const stemW = Math.max(3, Math.round(w * 0.24));
  const stemDark = mix(stemColor, [28, 24, 34], 0.45);
  const stemLit = mix(stemColor, [255, 250, 236], 0.25);

  for (let y = capH - 2; y < h; y++) {
    const t = (y - capH) / Math.max(1, h - capH);
    const half = Math.round(stemW * (0.5 + 0.25 * t));
    for (let x = cx - half; x <= cx + half; x++) {
      stem.ctx.fillStyle = x < cx - half + 1 ? rgbStr(stemLit) : x > cx + half - 1 ? rgbStr(stemDark) : rgbStr(stemColor);
      if (y < capH + 1) stem.ctx.fillStyle = rgbStr(stemDark);
      stem.ctx.fillRect(x, y, 1, 1);
    }
  }

  const capDark = mix(capColor, [20, 14, 34], 0.48);
  const capLit = mix(capColor, [255, 255, 255], 0.28);
  const spots: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 6; i++) {
    spots.push({ x: Math.round(w * (0.2 + rnd() * 0.6)), y: Math.round(capH * (0.22 + rnd() * 0.5)), r: rnd() < 0.4 ? 2 : 1 });
  }
  for (let y = 0; y < capH; y++) {
    const v = y / Math.max(1, capH - 1);
    const half = Math.round((w / 2 - 1) * Math.sin(Math.pow(v, 0.72) * Math.PI * 0.54));
    for (let x = cx - half; x <= cx + half; x++) {
      const u = (x - cx) / Math.max(1, half);
      let c = u < -0.25 && y < capH * 0.6 ? capLit : u > 0.45 || y >= capH - 2 ? capDark : capColor;
      let isSpot = false;
      for (const s of spots) {
        if (Math.hypot(x - s.x, y - s.y) <= s.r * 0.85) {
          isSpot = true;
          c = spotColor;
          break;
        }
      }
      cap.ctx.fillStyle = rgbStr(c);
      cap.ctx.fillRect(x, y, 1, 1);
      if (isSpot || y === capH - 2) {
        glow.ctx.fillStyle = rgbStr(spotColor);
        glow.ctx.fillRect(x, y, 1, 1);
      }
      for (let f = 0; f < FLASH_HUES.length; f++) {
        const fc: RGB = isSpot ? [255, 255, 248] : mix(FLASH_HUES[f], [255, 255, 255], u < -0.2 ? 0.35 : 0);
        flash[f].ctx.fillStyle = rgbStr(fc);
        flash[f].ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  return {
    stem: { canvas: stem.canvas, w, h },
    cap: { canvas: cap.canvas, w, h },
    glow: { canvas: glow.canvas, w, h },
    flashCaps: flash.map((m) => ({ canvas: m.canvas, w, h })),
    spotColor,
  };
}

function makeTwistedTree(w: number, h: number, seed: number, withFace: boolean, foliage: [RGB, RGB, RGB]): Sprite {
  const rnd = seededRandom(seed);
  const { canvas, ctx } = memoryCanvas(w, h);
  const cx = Math.floor(w / 2);
  const trunkW = Math.max(4, Math.round(w * 0.16));
  const trunkTop = Math.round(h * 0.36);
  const bark: RGB = [74, 54, 42];
  const barkDark: RGB = [44, 32, 26];
  const barkLit: RGB = [98, 76, 58];

  for (let y = trunkTop; y < h; y++) {
    const lean = Math.round(Math.sin((y / h) * Math.PI * 1.4 + seed) * 2);
    const flare = y > h * 0.82 ? Math.round(((y - h * 0.82) / (h * 0.18)) * 3) : 0;
    const half = Math.floor(trunkW / 2) + flare;
    for (let x = cx + lean - half; x <= cx + lean + half; x++) {
      const c = x === cx + lean - half ? barkLit : x >= cx + lean + half - 1 ? barkDark : bark;
      ctx.fillStyle = rgbStr(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // Stepped limbs give the trunks a crooked silhouette even without their crowns.
  for (let limb = 0; limb < 3; limb++) {
    const direction = limb % 2 === 0 ? -1 : 1;
    const baseY = Math.round(h * (0.48 + limb * 0.08));
    for (let step = 0; step < Math.round(w * 0.24); step++) {
      const x = cx + direction * step;
      const y = baseY - Math.floor(step * 0.7);
      ctx.fillStyle = rgbStr(barkDark);
      ctx.fillRect(x, y, 3, 3);
      ctx.fillStyle = rgbStr(barkLit);
      ctx.fillRect(x, y, 2, 1);
    }
  }
  if (withFace) {
    const fy = Math.round(h * 0.68);
    const lean = Math.round(Math.sin((fy / h) * Math.PI * 1.4 + seed) * 2);
    ctx.fillStyle = rgbStr(barkDark);
    ctx.fillRect(cx + lean - 3, fy, 2, 2);
    ctx.fillRect(cx + lean + 1, fy, 2, 2);
    ctx.fillRect(cx + lean - 1, fy + 4, 2, 2);
    ctx.fillStyle = rgbStr(barkLit);
    ctx.fillRect(cx + lean - 3, fy - 1, 2, 1);
    ctx.fillRect(cx + lean + 1, fy - 1, 2, 1);
  }
  for (let i = 0; i < 6; i++) {
    const lx = Math.round(w * (0.2 + rnd() * 0.6));
    const ly = Math.round(h * (0.18 + rnd() * 0.25));
    const r = Math.round(w * (0.18 + rnd() * 0.1));
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      for (let dx = -half; dx <= half; dx++) {
        const tone = dy < -r * 0.25 && dx < 0 ? foliage[0] : dy > r * 0.35 ? foliage[2] : foliage[1];
        ctx.fillStyle = rgbStr(tone);
        ctx.fillRect(lx + dx, ly + dy, 1, 1);
      }
    }
  }
  return { canvas, w, h };
}

function makeFern(w: number, h: number, lit: RGB, dark: RGB): Sprite {
  const { canvas, ctx } = memoryCanvas(w, h);
  const cx = Math.floor(w / 2);
  for (let i = -2; i <= 2; i++) {
    for (let s = 0; s < h; s++) {
      const t = s / h;
      const x = Math.round(cx + i * t * (w * 0.18));
      const y = h - 1 - s;
      ctx.fillStyle = rgbStr(s > h * 0.5 ? lit : dark);
      ctx.fillRect(x, y, 1, 1);
      if (s % 3 === 0 && s > 2) {
        const reach = Math.max(1, Math.round((1 - t) * w * 0.15));
        ctx.fillRect(x - reach, y, reach * 2 + 1, 1);
        ctx.fillRect(x - reach + 1, y - 1, Math.max(1, reach * 2 - 1), 1);
      }
    }
  }
  return { canvas, w, h };
}

function makeGiantLeaf(w: number, h: number, lit: RGB, mid: RGB, dark: RGB): Sprite {
  const { canvas, ctx } = memoryCanvas(w, h);
  const cx = Math.floor(w / 2);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = Math.round(w * 0.44 * Math.sin(Math.pow(t, 0.7) * Math.PI));
    for (let x = cx - half; x <= cx + half; x++) {
      const c = x === cx ? lit : x < cx ? mid : dark;
      ctx.fillStyle = rgbStr(c);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return { canvas, w, h };
}

function makeReeds(w: number, h: number): Sprite {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(88);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rnd() * w);
    const top = Math.floor(rnd() * h * 0.4);
    ctx.fillStyle = i % 2 === 0 ? '#5c8c58' : '#3c6844';
    for (let y = top; y < h; y++) ctx.fillRect(x, y, 1, 1);
    if (i < 2) {
      ctx.fillStyle = '#6c422c';
      ctx.fillRect(x, top, 1, 3);
    }
  }
  return { canvas, w, h };
}

export interface FairySprites extends CastSprites {
  cottage: {
    house: Sprite;
    cauldron: Sprite;
    lanternPost: Sprite;
    herbRack: Sprite;
    broom: Sprite;
    fence: Sprite;
  };
  stones: readonly StoneSprite[];
  mushrooms: readonly MushroomKind[];
  trees: readonly Sprite[];
  ferns: readonly Sprite[];
  giantLeaves: readonly Sprite[];
  reeds: readonly Sprite[];
}

export function buildFairySprites(): FairySprites {
  return {
    ...buildCastSprites(),
    cottage: {
      house: COTTAGE,
      cauldron: CAULDRON,
      lanternPost: LANTERN_POST,
      herbRack: HERB_RACK,
      broom: BROOM,
      fence: FENCE,
    },
    stones: STONES,
    mushrooms: [
      makeMushroom(22, 32, 11, [224, 214, 198], [168, 72, 148], [176, 248, 226], 11),
      makeMushroom(28, 38, 13, [230, 218, 198], [76, 152, 168], [236, 250, 178], 23),
      makeMushroom(18, 24, 9, [218, 208, 192], [198, 86, 82], [250, 236, 198], 37),
    ],
    trees: [
      makeTwistedTree(38, 62, 101, true, [[76, 130, 84], [48, 96, 62], [30, 66, 48]]),
      makeTwistedTree(32, 54, 202, true, [[68, 118, 78], [44, 88, 58], [28, 60, 44]]),
      makeTwistedTree(42, 66, 303, true, [[94, 138, 74], [58, 98, 54], [36, 68, 42]]),
    ],
    ferns: [
      makeFern(14, 12, [44, 82, 59], [19, 46, 38]),
      makeFern(18, 15, [40, 76, 61], [17, 41, 36]),
    ],
    giantLeaves: [
      makeGiantLeaf(16, 18, [54, 94, 65], [28, 62, 43], [14, 37, 31]),
      makeGiantLeaf(20, 22, [48, 88, 70], [24, 56, 47], [12, 33, 32]),
    ],
    reeds: [makeReeds(14, 18), makeReeds(16, 22)],
  };
}
