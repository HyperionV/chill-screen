import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { pixmap } from '../pixmap';
import { createHarbourSprites, type HarbourSprites } from './harbour-sprites';

export interface SpriteBox {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface WindowLight {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CottageSprite extends SpriteBox {
  chimneyX: number;
  chimneyY: number;
  windows: readonly WindowLight[];
}

export interface CanalSprites {
  willows: SpriteBox[];
  oaks: SpriteBox[];
  bushes: SpriteBox[];
  reeds: SpriteBox[];
  lilyPads: SpriteBox[];
  haystack: SpriteBox;
  cottages: CottageSprite[];
  lockCottage: CottageSprite;
  churchTower: SpriteBox;
  stalls: SpriteBox[];
  windmillTower: SpriteBox;
  bench: SpriteBox;
  jetty: SpriteBox;
  flowerBox: SpriteBox;
  harbour: HarbourSprites;
}

function box(canvas: HTMLCanvasElement): SpriteBox {
  return { canvas, w: canvas.width, h: canvas.height };
}

function buildWillow(seed: number, wide: boolean): SpriteBox {
  const w = wide ? 54 : 44;
  const h = wide ? 44 : 40;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const cx = Math.floor(w / 2);

  ctx.fillStyle = '#5c422c';
  ctx.fillRect(cx - 2, h - 16, 4, 16);
  ctx.fillStyle = '#3f2c1c';
  ctx.fillRect(cx + 1, h - 16, 1, 16);
  ctx.fillStyle = '#5c422c';
  ctx.fillRect(cx - 7, h - 18, 6, 2);
  ctx.fillRect(cx + 1, h - 19, 7, 2);

  const palette = ['#88b45c', '#6a984a', '#4e783c', '#36582e'];
  for (let y = 2; y < h - 14; y++) {
    const ny = (y - h * 0.34) / (h * 0.34);
    const half = Math.round(w * 0.44 * Math.sqrt(Math.max(0, 1 - ny * ny * 0.9)));
    for (let x = cx - half; x <= cx + half; x++) {
      const shade = ((x - cx) / Math.max(1, half)) * 0.5 + ny * 0.4 + (rnd() - 0.5) * 0.35;
      const idx = shade < -0.25 ? 0 : shade < 0.15 ? 1 : shade < 0.48 ? 2 : 3;
      ctx.fillStyle = palette[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }

  for (let x = 4; x < w - 4; x += 2) {
    if (rnd() < 0.22) continue;
    const edge = Math.abs(x - cx) / (w * 0.5);
    const topY = Math.round(h * (0.28 + edge * 0.14));
    const botY = Math.round(h - 2 - rnd() * (wide ? 4 : 9));
    ctx.fillStyle = rnd() < 0.45 ? '#7ca854' : '#588442';
    for (let y = topY; y <= botY; y++) {
      if ((y + x) % 5 === 0 && rnd() < 0.25) continue;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return box(canvas);
}

function buildOak(seed: number): SpriteBox {
  const w = 36;
  const h = 38;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const cx = 18;
  ctx.fillStyle = '#5c4028';
  ctx.fillRect(cx - 1, h - 13, 3, 13);
  ctx.fillStyle = '#3d2a19';
  ctx.fillRect(cx + 1, h - 13, 1, 13);
  const tones = ['#7fb052', '#5b8c3f', '#426b34', '#2c4c26'];
  const lumps = [
    { x: cx, y: 14, r: 11 },
    { x: cx - 7, y: 17, r: 7 },
    { x: cx + 7, y: 16, r: 7 },
    { x: cx - 3, y: 9, r: 7 },
  ];
  for (let y = 1; y < 27; y++) {
    for (let x = 2; x < w - 2; x++) {
      let inside = false;
      let lit = 0;
      for (const l of lumps) {
        const d = Math.hypot(x - l.x, y - l.y) / l.r;
        if (d <= 1) {
          inside = true;
          lit = -(x - l.x) * 0.08 - (y - l.y) * 0.1 + (rnd() - 0.5) * 0.45;
          break;
        }
      }
      if (!inside) continue;
      const idx = lit > 0.35 ? 0 : lit > -0.1 ? 1 : lit > -0.5 ? 2 : 3;
      ctx.fillStyle = tones[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return box(canvas);
}

function buildBush(seed: number): SpriteBox {
  const w = 18;
  const h = 11;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const tones = ['#7aa850', '#5a8640', '#3d6230'];
  for (let y = 1; y < h; y++) {
    const ny = (y - h * 0.65) / (h * 0.55);
    const half = Math.round(8.5 * Math.sqrt(Math.max(0, 1 - ny * ny)));
    for (let x = 9 - half; x <= 9 + half; x++) {
      const idx = y < 4 && x < 11 ? 0 : y > h - 3 || rnd() < 0.25 ? 2 : 1;
      ctx.fillStyle = tones[idx];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return box(canvas);
}

function buildReeds(seed: number): SpriteBox {
  const w = 11;
  const h = 17;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  for (let i = 0; i < 5; i++) {
    const x = 1 + i * 2;
    const top = Math.floor(rnd() * 6);
    ctx.fillStyle = i % 2 === 0 ? '#74964a' : '#537238';
    ctx.fillRect(x, top, 1, h - top);
    if (rnd() < 0.55) {
      ctx.fillStyle = '#6c3e26';
      ctx.fillRect(x, top + 1, 1, 3);
    }
  }
  return box(canvas);
}

function buildLilyPad(bloom: boolean): SpriteBox {
  const rows = bloom
    ? [
        '......ppp.....',
        '.....pwwwp....',
        '....ppwwpp....',
        '..gggggggggg..',
        '.gggggg.ggggg.',
        'ggggggg.gggggg',
        '.dddddddddddd.',
      ]
    : [
        '..............',
        '..............',
        '..............',
        '..gggggggggg..',
        '.gggggg.ggggg.',
        'ggggggg.gggggg',
        '.dddddddddddd.',
      ];
  return box(
    pixmap(rows, {
      g: '#5c9446',
      d: '#3e6d32',
      p: '#e89ab2',
      w: '#f8e6ec',
    }),
  );
}

function buildHaystack(): SpriteBox {
  const rows = [
    '............yyyy............',
    '..........yyyyyyoo..........',
    '........yyyyyyyyyooo........',
    '......yyyyyyyyyyyyoooo......',
    '.....yyyyyyoyyyyyyooooo.....',
    '....yyyyyyoooyyyyyyooooo....',
    '...yyyyyyyyyyyyyyyyoooooo...',
    '..yyyyyoyyyyyyyooooooooooo..',
    '..yyyyoooyyyyyyooooodddooo..',
    '.yyyyyyyyyyyyooooooddddddoo.',
    '.dddyyyyyyooooooodddddddddo.',
    'ddddyyooooooooddddddddddddd.',
    'dddddddddddddddddddddddddddd',
    '.bbbbbbbbbbbbbbbbbbbbbbbbbb.',
  ];
  return box(
    pixmap(rows, {
      y: '#e6c860',
      o: '#c29a3e',
      d: '#8c6a28',
      b: '#5c461c',
    }),
  );
}

function buildCottage(roof: string, roofDark: string, wall: string, wallDark: string): CottageSprite {
  const w = 48;
  const h = 35;
  const { canvas, ctx } = memoryCanvas(w, h);
  ctx.fillStyle = '#8b5244';
  ctx.fillRect(33, 2, 5, 11);
  ctx.fillStyle = '#64382e';
  ctx.fillRect(37, 2, 1, 11);
  ctx.fillStyle = '#503028';
  ctx.fillRect(32, 1, 7, 2);

  for (let ry = 0; ry < 12; ry++) {
    const x0 = 13 - ry;
    const x1 = 34 + ry;
    ctx.fillStyle = ry === 0 ? '#d8c4a6' : ry % 3 === 0 ? roofDark : roof;
    ctx.fillRect(x0, 5 + ry, x1 - x0 + 1, 1);
    ctx.fillStyle = roofDark;
    ctx.fillRect(x1 - 2, 5 + ry, 3, 1);
  }

  ctx.fillStyle = wall;
  ctx.fillRect(5, 17, 38, 18);
  ctx.fillStyle = wallDark;
  ctx.fillRect(37, 17, 6, 18);
  ctx.fillRect(5, 33, 38, 2);

  ctx.fillStyle = '#66422b';
  ctx.fillRect(21, 23, 6, 12);
  ctx.fillStyle = '#4a2e1d';
  ctx.fillRect(26, 23, 1, 12);
  ctx.fillStyle = '#d6b662';
  ctx.fillRect(25, 29, 1, 1);

  const windows: WindowLight[] = [
    { x: 10, y: 21, w: 6, h: 6 },
    { x: 31, y: 21, w: 6, h: 6 },
  ];
  for (const win of windows) {
    ctx.fillStyle = '#3a2b24';
    ctx.fillRect(win.x - 1, win.y - 1, win.w + 2, win.h + 2);
    ctx.fillStyle = '#5d7c92';
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.fillStyle = '#ded4be';
    ctx.fillRect(win.x + 2, win.y, 1, win.h);
    ctx.fillRect(win.x, win.y + 2, win.w, 1);
  }
  return { canvas, w, h, chimneyX: 35, chimneyY: 1, windows };
}

function buildChurchTower(): SpriteBox {
  const w = 26;
  const h = 52;
  const { canvas, ctx } = memoryCanvas(w, h);
  ctx.fillStyle = '#9aa0a6';
  ctx.fillRect(7, 22, 12, 30);
  ctx.fillStyle = '#7e848c';
  ctx.fillRect(16, 22, 3, 30);
  ctx.fillStyle = '#767a84';
  ctx.fillRect(0, 38, 8, 14);
  ctx.fillRect(18, 40, 8, 12);
  for (let y = 0; y < 22; y++) {
    const half = Math.floor((y / 22) * 6);
    ctx.fillStyle = y < 10 ? '#6e7682' : '#7b838e';
    ctx.fillRect(13 - half, y, half * 2 + 1, 1);
  }
  ctx.fillStyle = '#cfd2cc';
  ctx.fillRect(11, 26, 4, 4);
  ctx.fillStyle = '#4e525a';
  ctx.fillRect(13, 27, 1, 2);
  return box(canvas);
}

function buildStall(stripeA: string, stripeB: string): SpriteBox {
  const w = 36;
  const h = 26;
  const { canvas, ctx } = memoryCanvas(w, h);
  ctx.fillStyle = '#6c492e';
  ctx.fillRect(2, 8, 2, 18);
  ctx.fillRect(32, 8, 2, 18);
  for (let y = 0; y < 9; y++) {
    const x0 = Math.max(0, 2 - Math.floor(y / 3));
    const x1 = Math.min(w - 1, 33 + Math.floor(y / 3));
    for (let x = x0; x <= x1; x++) {
      ctx.fillStyle = Math.floor(x / 4) % 2 === 0 ? stripeA : stripeB;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = '#382a24';
  ctx.fillRect(0, 9, w, 1);
  ctx.fillStyle = '#9a6d42';
  ctx.fillRect(2, 17, 32, 9);
  ctx.fillStyle = '#74502e';
  ctx.fillRect(2, 24, 32, 2);
  ctx.fillStyle = '#c49652';
  ctx.fillRect(5, 14, 7, 3);
  ctx.fillRect(15, 14, 7, 3);
  ctx.fillRect(25, 14, 6, 3);
  ctx.fillStyle = '#d64e3e';
  ctx.fillRect(6, 13, 5, 2);
  ctx.fillStyle = '#e0be46';
  ctx.fillRect(16, 13, 5, 2);
  ctx.fillStyle = '#68a246';
  ctx.fillRect(26, 13, 4, 2);
  return box(canvas);
}

function buildWindmillTower(): SpriteBox {
  const w = 34;
  const h = 54;
  const { canvas, ctx } = memoryCanvas(w, h);
  const cx = 17;
  // Dark slate cap
  ctx.fillStyle = '#48525c';
  for (let y = 0; y < 10; y++) {
    const half = 4 + Math.floor(y * 0.72);
    ctx.fillRect(cx - half, y + 1, half * 2 + 1, 1);
  }
  ctx.fillStyle = '#343c44';
  ctx.fillRect(cx + 3, 4, 4, 7);

  // Tapering whitewashed & timber-trimmed mill body
  for (let y = 11; y < h - 14; y++) {
    const half = 8 + Math.floor(((y - 11) / (h - 25)) * 4);
    ctx.fillStyle = '#dcd2bc';
    ctx.fillRect(cx - half, y, half * 2 + 1, 1);
    ctx.fillStyle = '#b4a992';
    ctx.fillRect(cx + half - 3, y, 4, 1);
  }

  // Wooden gallery stage & railing
  ctx.fillStyle = '#5a3d26';
  ctx.fillRect(3, h - 16, 28, 2);
  ctx.fillStyle = '#ded4c0';
  ctx.fillRect(4, h - 19, 26, 1);
  for (let x = 5; x <= 29; x += 4) {
    ctx.fillRect(x, h - 19, 1, 3);
  }

  // Brick base
  for (let y = h - 14; y < h; y++) {
    const half = 12 + Math.floor(((y - (h - 14)) / 14) * 3);
    ctx.fillStyle = '#8e5242';
    ctx.fillRect(cx - half, y, half * 2 + 1, 1);
    ctx.fillStyle = '#6b3b2e';
    ctx.fillRect(cx + half - 3, y, 4, 1);
  }
  // Door & windows
  ctx.fillStyle = '#4a301e';
  ctx.fillRect(cx - 2, h - 10, 5, 10);
  ctx.fillStyle = '#445464';
  ctx.fillRect(cx - 1, 20, 3, 4);
  ctx.fillRect(cx - 1, 29, 3, 4);
  return box(canvas);
}

/** Draws 4 crisp pixel-art lattice windmill sails around (cx, cy). Radius 20 => 40 stage px across. */
export function drawWindmillSails(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  radius: number,
  unit: number,
): void {
  const rx = Math.round(cx);
  const ry = Math.round(cy);
  const steps = Math.max(10, Math.round(radius));
  const dot = Math.max(1, Math.round(unit));
  for (let arm = 0; arm < 4; arm++) {
    const a = angle + (arm * Math.PI) / 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const px = -sin;
    const py = cos;
    ctx.fillStyle = '#4c3220';
    for (let r = 2; r <= steps; r++) {
      ctx.fillRect(Math.round(rx + cos * r), Math.round(ry + sin * r), dot, dot);
    }
    ctx.fillStyle = '#eee6d0';
    for (let r = 4 * unit; r <= steps - unit; r += Math.max(2, Math.round(2 * unit))) {
      for (let w = 1; w <= 4; w++) {
        ctx.fillRect(Math.round(rx + cos * r + px * w * unit), Math.round(ry + sin * r + py * w * unit), dot, dot);
      }
    }
    ctx.fillStyle = '#826444';
    for (let r = 6 * unit; r <= steps - unit; r += Math.max(4, Math.round(4 * unit))) {
      ctx.fillRect(Math.round(rx + cos * r + px * 2 * unit), Math.round(ry + sin * r + py * 2 * unit), dot, dot);
      ctx.fillRect(Math.round(rx + cos * r + px * 4 * unit), Math.round(ry + sin * r + py * 4 * unit), dot, dot);
    }
  }
  ctx.fillStyle = '#2e1e12';
  ctx.fillRect(rx - dot, ry - dot, dot * 3, dot * 3);
}

function buildBench(): SpriteBox {
  const rows = [
    '..bbbbbbbbbbbbbbbbbb..',
    '..dddddddddddddddddd..',
    '...b..............b...',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.dddddddddddddddddddd.',
    '..d................d..',
    '..d................d..',
    '..d................d..',
  ];
  return box(pixmap(rows, { b: '#9c6e42', d: '#644428' }));
}

function buildJetty(): SpriteBox {
  const rows = [
    'pppppppppppppppppppppppppppppppppppppppp',
    'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh',
    'dddddddddddddddddddddddddddddddddddddddd',
    '...d.........d............d.........d...',
    '...d.........d............d.........d...',
    '...d.........d............d.........d...',
    '...d.........d............d.........d...',
    '...d.........d............d.........d...',
    '...d.........d............d.........d...',
    '...d.........d............d.........d...',
  ];
  return box(pixmap(rows, { h: '#b89268', p: '#9c7852', d: '#64462c' }));
}

function buildFlowerBox(): SpriteBox {
  const rows = [
    '.r.y.r.r.y.r.',
    'ggggggggggggg',
    'bbbbbbbbbbbbb',
    'ddddddddddddd',
  ];
  return box(pixmap(rows, { r: '#dc4a46', y: '#ecc448', g: '#50843c', b: '#885834', d: '#5c3a20' }));
}

export function createCanalSprites(): CanalSprites {
  return {
    willows: [buildWillow(101, false), buildWillow(202, true)],
    oaks: [buildOak(303), buildOak(404)],
    bushes: [buildBush(505), buildBush(606)],
    reeds: [buildReeds(707), buildReeds(808), buildReeds(909)],
    lilyPads: [buildLilyPad(false), buildLilyPad(true)],
    haystack: buildHaystack(),
    cottages: [
      buildCottage('#9a5442', '#703a2d', '#ddd0ba', '#b8aa94'),
      buildCottage('#5e6874', '#404852', '#d2c2aa', '#ac9c84'),
    ],
    lockCottage: buildCottage('#525a64', '#383e46', '#b86c52', '#8c4e3a'),
    churchTower: buildChurchTower(),
    stalls: [
      buildStall('#c64c42', '#ede4d2'),
      buildStall('#4872a4', '#ede4d2'),
      buildStall('#c89238', '#528048'),
    ],
    windmillTower: buildWindmillTower(),
    bench: buildBench(),
    jetty: buildJetty(),
    flowerBox: buildFlowerBox(),
    harbour: createHarbourSprites(),
  };
}

/** Draws a sprite scaled by `unit` with crisp pixel edges, optionally leaning in wind toward its top. */
export function drawScaledSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteBox,
  centerX: number,
  baseY: number,
  unit: number,
  bend = 0,
): void {
  const dw = Math.max(1, Math.round(sprite.w * unit));
  const dh = Math.max(1, Math.round(sprite.h * unit));
  const dx = Math.round(centerX - dw / 2);
  const dy = Math.round(baseY - dh);
  ctx.imageSmoothingEnabled = false;
  if (Math.abs(bend) < 0.4) {
    ctx.drawImage(sprite.canvas, 0, 0, sprite.w, sprite.h, dx, dy, dw, dh);
    return;
  }
  const strip = 3;
  for (let sy = 0; sy < sprite.h; sy += strip) {
    const sh = Math.min(strip, sprite.h - sy);
    const k = 1 - (sy + sh * 0.5) / sprite.h;
    const outY = Math.round(dy + (sy / sprite.h) * dh);
    const outH = Math.max(1, Math.round(((sy + sh) / sprite.h) * dh) - (outY - dy));
    const lean = Math.round(bend * k * k * unit);
    ctx.drawImage(sprite.canvas, 0, sy, sprite.w, sh, dx + lean, outY, dw, outH);
  }
}
