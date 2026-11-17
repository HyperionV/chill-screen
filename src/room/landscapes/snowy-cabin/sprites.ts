import { mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { pixmap } from '../../journeys/pixmap';
import {
  buildCabinClose,
  buildCabinLarge,
  buildCabinSmall,
  buildVillageChurch,
  buildVillageHouse,
  type CabinSpec,
  type VillageBuilding,
  type WindowRect,
} from './buildings';
import type { SpriteBox } from './creature-sprites';

export type { CabinSpec, VillageBuilding, WindowRect };

export interface SnowySprites {
  pinesFar: SpriteBox[];
  pinesMid: SpriteBox[];
  pinesNear: SpriteBox[];
  birches: SpriteBox[];
  shrubs: SpriteBox[];
  cabinLarge: CabinSpec;
  cabinClose: CabinSpec;
  cabinSmall: CabinSpec;
  woodpile: SpriteBox;
  axeStump: SpriteBox;
  snowmanBody: SpriteBox;
  snowmanHat: SpriteBox;
  bench: SpriteBox;
  rowboat: SpriteBox;
  owlSnag: SpriteBox;
  villageChurch: VillageBuilding;
  villageHouses: VillageBuilding[];
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

/** Builds a snow-laden pine tree with layered evergreen boughs and thick snow caps. */
function buildSnowPine(h: number, seed: number, haze: number): SpriteBox {
  const w = Math.max(11, Math.round(h * 0.56)) | 1;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const cx = (w - 1) / 2;
  const trunkH = Math.max(4, Math.round(h * 0.13));
  const crownH = h - trunkH;
  const tiers = 4 + Math.floor(h / 20);
  const hazeCol: RGB = [188, 206, 224];

  const pineTones: RGB[] = [
    mix([64, 108, 86], hazeCol, haze),
    mix([46, 84, 68], hazeCol, haze),
    mix([31, 60, 50], hazeCol, haze),
    mix([20, 42, 36], hazeCol, haze),
  ];
  const snowTones: RGB[] = [
    mix([242, 248, 254], hazeCol, haze),
    mix([204, 222, 240], hazeCol, haze),
    mix([162, 186, 212], hazeCol, haze),
  ];

  const trunkCol = mix([78, 54, 38], hazeCol, haze);
  const trunkShade = mix([50, 34, 24], hazeCol, haze);
  for (let y = crownH - 1; y < h; y++) {
    ctx.fillStyle = `rgb(${trunkCol[0] | 0},${trunkCol[1] | 0},${trunkCol[2] | 0})`;
    ctx.fillRect(cx - 1, y, 2, 1);
    ctx.fillStyle = `rgb(${trunkShade[0] | 0},${trunkShade[1] | 0},${trunkShade[2] | 0})`;
    ctx.fillRect(cx + 1, y, 1, 1);
  }

  for (let y = 0; y < crownH; y++) {
    const t = y / crownH;
    const tierFloat = t * tiers;
    const within = tierFloat - Math.floor(tierFloat);
    const half = cx * (0.14 + 0.86 * t) * (0.52 + 0.48 * within);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = half > 0 ? (x - cx) / half : 0;
      const onSnowCap = within < 0.36 - Math.abs(u) * 0.08 + (rnd() - 0.5) * 0.14;
      let rgb: RGB;
      if (onSnowCap) {
        const sIdx = u < 0.1 ? 0 : u < 0.65 ? 1 : 2;
        rgb = snowTones[sIdx];
      } else {
        let pIdx = u < -0.3 ? 0 : u < 0.18 ? 1 : u < 0.68 ? 2 : 3;
        if (within > 0.85) pIdx = Math.min(3, pIdx + 1);
        if (rnd() < 0.08) pIdx = Math.max(0, Math.min(3, pIdx + (rnd() < 0.5 ? -1 : 1)));
        rgb = pineTones[pIdx];
      }
      ctx.fillStyle = `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return box(canvas);
}

/** Builds a slender winter birch tree with pale bark, dark dashes, and frosted branches. */
function buildBirch(h: number, seed: number): SpriteBox {
  const w = Math.max(17, Math.round(h * 0.46)) | 1;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const cx = Math.floor(w / 2);

  for (let y = Math.round(h * 0.14); y < h; y++) {
    const bend = Math.round(Math.sin((y / h) * Math.PI) * (rnd() < 0.5 ? 0 : 0.6));
    const thick = y > h * 0.72 ? 3 : 2;
    ctx.fillStyle = '#e6edf4';
    ctx.fillRect(cx - 1 + bend, y, thick, 1);
    ctx.fillStyle = '#b4c4d6';
    ctx.fillRect(cx + thick - 2 + bend, y, 1, 1);
    if (y % 4 === 0 && rnd() < 0.65) {
      ctx.fillStyle = '#3a424e';
      ctx.fillRect(cx - 1 + bend + (rnd() < 0.5 ? 0 : 1), y, 1, 1);
    }
  }

  for (let b = 0; b < 6; b++) {
    const by = Math.round(h * (0.18 + b * 0.1));
    const dir = b % 2 === 0 ? -1 : 1;
    const len = Math.round(w * (0.28 + rnd() * 0.16));
    for (let s = 1; s <= len; s++) {
      const bx = cx + dir * s;
      const twigY = by - Math.round(s * 0.45);
      ctx.fillStyle = '#6c7a8c';
      ctx.fillRect(bx, twigY, 1, 1);
      if (s % 2 === 0) {
        ctx.fillStyle = '#eef5fc';
        ctx.fillRect(bx, twigY - 1, 1, 1);
      }
    }
  }
  return box(canvas);
}

function buildShrub(seed: number): SpriteBox {
  const w = 18;
  const h = 11;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  for (let y = 1; y < h; y++) {
    const ny = (y - h * 0.68) / (h * 0.55);
    const half = Math.round(8 * Math.sqrt(Math.max(0, 1 - ny * ny)));
    for (let x = 9 - half; x <= 9 + half; x++) {
      if (y < 4) {
        ctx.fillStyle = x < 10 ? '#eef5fc' : '#c6d8ec';
      } else if (y === 4 && rnd() < 0.6) {
        ctx.fillStyle = '#b2c7de';
      } else {
        ctx.fillStyle = rnd() < 0.35 ? '#264438' : '#355c4a';
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return box(canvas);
}

function buildWoodpile(): SpriteBox {
  const rows = [
    '......wwwwwwwwwwwww.........',
    '....wwwwwwwwwwwwwwwww.......',
    '...bbbbccbbccbbccbbbb.......',
    '..bbbccbbccbbccbbccbbb......',
    '..dddddddddddddddddddd......',
    '.bbbbccbbccbbccbbccbbbbb....',
    '.bbccbbccbbccbbccbbccbbb....',
    '.ddddddddddddddddddddddd....',
    'bbbbccbbccbbccbbccbbccbbb...',
    'bbccbbccbbccbbccbbccbbccbb..',
    'dddddddddddddddddddddddddd..',
    '.ssssssssssssssssssssssss...',
  ];
  return box(
    pixmap(rows, {
      w: '#eef5fc',
      b: '#5c3c24',
      c: '#d9b17b',
      d: '#3d2515',
      s: '#b6cce2',
    }),
  );
}

function buildAxeStump(): SpriteBox {
  const rows = [
    '...........mmm....',
    '..........mmmmm...',
    '.........mmmmmh...',
    '........mmm.hhh...',
    '.......mmm..hh....',
    '......mmmm.hh.....',
    '.....mmmm..h......',
    '.....wwwwwwwww....',
    '....wwccccccwww...',
    '....bbbbbbbbbbb...',
    '....bbddbbbddbb...',
    '....bbddbbbddbb...',
    '....bbddbbbddbb...',
    '...bbbddbbbddbbb..',
    '..bbbbddbbbddbbbb.',
    '..sssssssssssssss.',
  ];
  return box(
    pixmap(rows, {
      m: '#9eb0c2',
      h: '#b57b48',
      w: '#eef5fc',
      c: '#d4ab74',
      b: '#69432a',
      d: '#462a19',
      s: '#b6cce2',
    }),
  );
}

function buildSnowman(): { body: SpriteBox; hat: SpriteBox } {
  const bodyRows = [
    '......................',
    '.......wwwwww.........',
    '......wwwwwwww........',
    '.....wwkwwwwkww.......',
    '.....wwwwwoooow.......',
    '......wwwkkkww........',
    '......rrrrrrrr........',
    '.....rryrrrrryrr......',
    '......rrrrrrryrr......',
    '.....wwwwwwwwrry......',
    '....wwwwkwwwwww.......',
    '....wwwwwwwwwww.......',
    '...wwwwwkwwwwwww......',
    '...wwwwwwwwwwwwws.....',
    '..wwwwwwkwwwwwwwss....',
    '..wwwwwwwwwwwwwwss....',
    '..wwwwwwwwwwwwwsss....',
    '...wwwwwwwwwwwsss.....',
    '...ssssssssssssss.....',
    '....ssssssssssss......',
  ];
  const hatRows = [
    '..kkkkkk..',
    '..kggggk..',
    '..kkkkkk..',
    '..rrrrrr..',
    'kkkkkkkkkk',
  ];
  return {
    body: box(
      pixmap(bodyRows, {
        w: '#f3f8fe',
        s: '#b9cde2',
        k: '#262933',
        o: '#eb7d2d',
        r: '#be3838',
        y: '#e8c464',
      }),
    ),
    hat: box(
      pixmap(hatRows, {
        k: '#262933',
        g: '#4a5060',
        r: '#be3838',
      }),
    ),
  };
}

function buildBench(): SpriteBox {
  const rows = [
    '..wwwwwwwwwwwwwwwwwwwwwwww..',
    '.bbbbbbbbbbbbbbbbbbbbbbbbbb.',
    '.dd..dd..............dd..dd.',
    '.bbbbbbbbbbbbbbbbbbbbbbbbbb.',
    '.dd..dd..............dd..dd.',
    '.wwwwwwwwwwwwwwwwwwwwwwwwww.',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'dddddddddddddddddddddddddddd',
    '..kk....................kk..',
    '..kk....................kk..',
    '..kk....................kk..',
    '.ssss..................ssss.',
  ];
  return box(
    pixmap(rows, {
      w: '#edf5fc',
      b: '#7a4f30',
      d: '#4f311c',
      k: '#282d38',
      s: '#b6cce2',
    }),
  );
}

function buildRowboat(): SpriteBox {
  const rows = [
    '.......wwwwwwwwwwwwwwwwwwwwwww..........',
    '.....wwwwwwwwwwwwwwwwwwwwwwwwwww........',
    '...wwbbbbbbbbbbbbbbbbbbbbbbbbbbbw.......',
    '..bbbbbbbwwwwwwwwwwwwwwwwwbbbbbbbb......',
    '.bbbbbbwwwwwwwwwwwwwwwwwwwwwbbbbbbbw....',
    '.ddddbbbbbnnnnnnnnnnnnnnnbbbbbbdddd.....',
    '..ddddddbbbbbbbbbbbbbbbbbbdddddddd......',
    '...dddddddddddddddddddddddddddddd.......',
    '....ssssssssssssssssssssssssssss........',
  ];
  return box(
    pixmap(rows, {
      w: '#edf5fc',
      b: '#6e503b',
      d: '#463124',
      n: '#9c7852',
      s: '#b6cce2',
    }),
  );
}

function buildOwlSnag(): SpriteBox {
  const rows = [
    '.........w....',
    '........wwww..',
    '.....bbbbbb...',
    '....bbdddb....',
    '....bbdd......',
    '....bbdd......',
    '....bbdd......',
    '...bbbdd......',
    '...bbbdd......',
    '...bbbdd......',
    '...bbbdd......',
    '...bbbdd......',
    '...bbbdd......',
    '...bbbdd......',
    '..bbbbddb.....',
    '..sssssss.....',
  ];
  return box(
    pixmap(rows, {
      w: '#eaf3fc',
      b: '#5c422c',
      d: '#3d2a1b',
      s: '#b6cce2',
    }),
  );
}

export function buildSnowySprites(unit: number): SnowySprites {
  const farH = [22, 28, 34, 40].map((v) => Math.max(8, Math.round(v * unit)));
  const midH = [38, 48, 56, 66].map((v) => Math.max(12, Math.round(v * unit)));
  const nearH = [66, 82, 94, 108].map((v) => Math.max(18, Math.round(v * unit)));
  const birchH = [52, 64, 76].map((v) => Math.max(16, Math.round(v * unit)));
  const snowman = buildSnowman();

  return {
    pinesFar: farH.map((h, i) => buildSnowPine(h, 101 + i * 37, 0.48)),
    pinesMid: midH.map((h, i) => buildSnowPine(h, 211 + i * 43, 0.22)),
    pinesNear: nearH.map((h, i) => buildSnowPine(h, 313 + i * 53, 0.04)),
    birches: birchH.map((h, i) => buildBirch(h, 409 + i * 29)),
    shrubs: [0, 1, 2].map((i) => buildShrub(503 + i * 19)),
    cabinLarge: buildCabinLarge(),
    cabinClose: buildCabinClose(),
    cabinSmall: buildCabinSmall(),
    woodpile: buildWoodpile(),
    axeStump: buildAxeStump(),
    snowmanBody: snowman.body,
    snowmanHat: snowman.hat,
    bench: buildBench(),
    rowboat: buildRowboat(),
    owlSnag: buildOwlSnag(),
    villageChurch: buildVillageChurch(),
    villageHouses: [buildVillageHouse('#7d5e48'), buildVillageHouse('#697882')],
  };
}
