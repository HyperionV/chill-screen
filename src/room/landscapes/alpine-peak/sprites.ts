import { mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import {
  buildCreatureSprites,
  spriteBox,
  type CreatureSprites,
  type DirectedSprite,
  type SpriteBox,
} from './creature-sprites';

export type { DirectedSprite, SpriteBox };

export interface HutSprite extends SpriteBox {
  chimneyX: number;
  chimneyY: number;
  winX: number;
  winY: number;
  winW: number;
  winH: number;
  litWindow: SpriteBox;
}

export interface TentSprite extends SpriteBox {
  glowDoor: SpriteBox;
}

export interface GondolaSprite extends SpriteBox {
  cableAttachY: number;
  litCabin: SpriteBox;
}

export interface AlpineSprites extends CreatureSprites {
  hut: HutSprite;
  tent: TentSprite;
  gondola: GondolaSprite;
  station: SpriteBox;
  terrace: SpriteBox;
  pylon: SpriteBox;
  pinesFar: SpriteBox[];
  pinesMid: SpriteBox[];
  pinesFg: SpriteBox[];
  boulders: SpriteBox[];
  shrubs: SpriteBox[];
  grassTufts: SpriteBox[];
  cairn: SpriteBox;
}

function buildHut(): HutSprite {
  const w = 52;
  const h = 38;
  const { canvas, ctx } = memoryCanvas(w, h);
  const chimneyX = 39;
  const chimneyY = 2;

  ctx.fillStyle = '#5c6272';
  ctx.fillRect(36, 2, 6, 12);
  ctx.fillStyle = '#848c9e';
  ctx.fillRect(36, 2, 2, 12);
  ctx.fillStyle = '#3e4452';
  ctx.fillRect(40, 2, 2, 12);
  ctx.fillStyle = '#eef4ff';
  ctx.fillRect(35, 1, 8, 2);

  for (let y = 6; y <= 18; y++) {
    const t = (y - 6) / 12;
    const half = Math.round(3 + t * 22);
    const cx = 26;
    ctx.fillStyle = '#384052';
    ctx.fillRect(cx - half, y, half * 2, 1);
    const snowThickness = y < 10 ? 3 : 4;
    ctx.fillStyle = '#eef4ff';
    ctx.fillRect(cx - half, y - snowThickness + 1, half * 2, 2);
    ctx.fillStyle = '#c4d4ec';
    ctx.fillRect(cx - half, y - 1, half * 2, 1);
  }
  ctx.fillStyle = '#d4e8ff';
  for (const ix of [6, 12, 20, 31, 41, 45]) {
    ctx.fillRect(ix, 19, 1, 2);
  }

  ctx.fillStyle = '#7e5436';
  ctx.fillRect(8, 17, 36, 10);
  ctx.fillStyle = '#9a6844';
  ctx.fillRect(8, 17, 20, 10);
  ctx.fillStyle = '#563824';
  for (let y = 19; y <= 25; y += 3) ctx.fillRect(8, y, 36, 1);

  ctx.fillStyle = '#5a6274';
  ctx.fillRect(7, 27, 38, 10);
  ctx.fillStyle = '#7c869a';
  ctx.fillRect(7, 27, 20, 10);
  ctx.fillStyle = '#3c4252';
  for (let y = 29; y < 37; y += 3) {
    ctx.fillRect(7, y, 38, 1);
    for (let x = 10 + (y % 2) * 3; x < 44; x += 6) ctx.fillRect(x, y - 2, 1, 2);
  }

  ctx.fillStyle = '#4a2e1c';
  ctx.fillRect(29, 21, 8, 15);
  ctx.fillStyle = '#684228';
  ctx.fillRect(30, 22, 6, 13);
  ctx.fillStyle = '#d8b468';
  ctx.fillRect(31, 28, 1, 1);

  const winX = 14;
  const winY = 20;
  const winW = 9;
  const winH = 7;
  ctx.fillStyle = '#322218';
  ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);
  ctx.fillStyle = '#202c3e';
  ctx.fillRect(winX, winY, winW, winH);
  ctx.fillStyle = '#483022';
  ctx.fillRect(winX + 4, winY, 1, winH);
  ctx.fillRect(winX, winY + 3, winW, 1);
  ctx.fillStyle = '#dce8fa';
  ctx.fillRect(winX - 1, winY + winH + 1, winW + 2, 1);

  ctx.fillStyle = '#6c4428';
  ctx.fillRect(40, 32, 4, 4);
  ctx.fillStyle = '#b48858';
  ctx.fillRect(40, 32, 1, 1);
  ctx.fillRect(42, 33, 1, 1);
  ctx.fillRect(41, 35, 1, 1);
  ctx.fillStyle = '#dce8f8';
  ctx.fillRect(5, 36, 42, 2);

  const lit = memoryCanvas(winW + 4, winH + 5);
  lit.ctx.fillStyle = 'rgba(255,180,82,0.28)';
  lit.ctx.fillRect(0, 0, winW + 4, winH + 5);
  lit.ctx.fillStyle = '#ffbc54';
  lit.ctx.fillRect(2, 1, winW, winH);
  lit.ctx.fillStyle = '#ffe896';
  lit.ctx.fillRect(3, 2, winW - 2, winH - 2);
  lit.ctx.fillStyle = '#5c3820';
  lit.ctx.fillRect(2 + 4, 1, 1, winH);
  lit.ctx.fillRect(2, 1 + 3, winW, 1);

  return {
    canvas,
    w,
    h,
    chimneyX,
    chimneyY,
    winX,
    winY,
    winW,
    winH,
    litWindow: spriteBox(lit.canvas),
  };
}

function buildTent(): TentSprite {
  const w = 36;
  const h = 22;
  const { canvas, ctx } = memoryCanvas(w, h);

  ctx.fillStyle = '#3c465a';
  ctx.fillRect(2, 18, 1, 2);
  ctx.fillRect(33, 18, 1, 2);
  ctx.fillStyle = 'rgba(180,196,220,0.6)';
  ctx.fillRect(3, 17, 3, 1);
  ctx.fillRect(30, 17, 3, 1);

  for (let y = 5; y < 20; y++) {
    const t = (y - 5) / 14;
    const half = Math.round(4 + Math.sin(t * Math.PI * 0.55) * 11);
    const cx = 18;
    ctx.fillStyle = '#c85e1a';
    ctx.fillRect(cx - half, y, half * 2, 1);
    ctx.fillStyle = '#f29834';
    ctx.fillRect(cx - half + 1, y, Math.max(2, half - 1), 1);
    if (y < 9) {
      ctx.fillStyle = '#ffbe5c';
      ctx.fillRect(cx - half + 2, y, Math.max(1, half - 4), 1);
    }
  }
  ctx.fillStyle = '#5c2c14';
  ctx.fillRect(6, 19, 24, 2);
  ctx.fillStyle = '#242a3a';
  for (let y = 10; y < 19; y++) {
    const half = Math.round(((y - 10) / 9) * 4) + 1;
    ctx.fillRect(18 - half, y, half * 2, 1);
  }
  ctx.fillStyle = '#3e4658';
  ctx.fillRect(18, 1, 1, 4);
  ctx.fillStyle = '#e84a3c';
  ctx.fillRect(19, 1, 4, 2);

  const glow = memoryCanvas(14, 12);
  glow.ctx.fillStyle = 'rgba(255,196,92,0.28)';
  glow.ctx.fillRect(0, 1, 14, 11);
  for (let y = 1; y < 10; y++) {
    const half = Math.round(((y - 1) / 9) * 4) + 1;
    glow.ctx.fillStyle = y > 4 ? '#ffdc80' : '#ffa63e';
    glow.ctx.fillRect(7 - half, y, half * 2, 1);
  }

  return { canvas, w, h, glowDoor: spriteBox(glow.canvas) };
}

function buildGondola(): GondolaSprite {
  const w = 24;
  const h = 24;
  const { canvas, ctx } = memoryCanvas(w, h);

  ctx.fillStyle = '#2c3442';
  ctx.fillRect(7, 1, 10, 2);
  ctx.fillStyle = '#7e8aa0';
  ctx.fillRect(8, 0, 2, 2);
  ctx.fillRect(14, 0, 2, 2);

  ctx.fillStyle = '#3a4252';
  ctx.fillRect(11, 3, 2, 7);
  ctx.fillStyle = '#6e7a90';
  ctx.fillRect(11, 3, 1, 7);

  ctx.fillStyle = '#dce4f2';
  ctx.fillRect(5, 10, 14, 2);
  ctx.fillStyle = '#c8342c';
  ctx.fillRect(3, 12, 18, 10);
  ctx.fillStyle = '#e85244';
  ctx.fillRect(3, 12, 9, 9);
  ctx.fillStyle = '#f2ece0';
  ctx.fillRect(3, 18, 18, 2);
  ctx.fillStyle = '#2a303e';
  ctx.fillRect(4, 22, 16, 2);

  ctx.fillStyle = '#24344c';
  ctx.fillRect(5, 13, 4, 4);
  ctx.fillRect(10, 13, 4, 4);
  ctx.fillRect(15, 13, 4, 4);
  ctx.fillStyle = '#7ca4cc';
  ctx.fillRect(5, 13, 1, 2);
  ctx.fillRect(10, 13, 1, 2);
  ctx.fillRect(15, 13, 1, 2);

  const lit = memoryCanvas(16, 6);
  lit.ctx.fillStyle = '#ffd278';
  lit.ctx.fillRect(1, 1, 4, 4);
  lit.ctx.fillRect(6, 1, 4, 4);
  lit.ctx.fillRect(11, 1, 4, 4);

  return { canvas, w, h, cableAttachY: 1, litCabin: spriteBox(lit.canvas) };
}

function buildStation(): SpriteBox {
  const w = 58;
  const h = 44;
  const { canvas, ctx } = memoryCanvas(w, h);

  ctx.fillStyle = '#5c6476';
  ctx.fillRect(12, 24, 40, 19);
  ctx.fillStyle = '#7a8498';
  ctx.fillRect(12, 24, 20, 19);
  ctx.fillStyle = '#3c4252';
  for (let y = 27; y < 42; y += 4) ctx.fillRect(12, y, 40, 1);

  ctx.fillStyle = '#323a4a';
  ctx.fillRect(2, 16, 14, 3);
  ctx.fillRect(5, 19, 8, 2);
  ctx.fillStyle = '#8e9ab0';
  ctx.fillRect(3, 15, 4, 4);

  ctx.fillStyle = '#744c30';
  ctx.fillRect(14, 14, 36, 11);
  ctx.fillStyle = '#92623e';
  ctx.fillRect(14, 14, 18, 11);

  for (let y = 5; y <= 14; y++) {
    const t = (y - 5) / 9;
    const half = Math.round(6 + t * 18);
    const cx = 32;
    ctx.fillStyle = '#363e50';
    ctx.fillRect(cx - half, y, half * 2, 1);
    ctx.fillStyle = '#edf4ff';
    ctx.fillRect(cx - half, y - 2, half * 2, 2);
  }

  ctx.fillStyle = '#485060';
  ctx.fillRect(32, 0, 1, 6);

  ctx.fillStyle = '#f2b85c';
  ctx.fillRect(20, 18, 6, 4);
  ctx.fillStyle = '#462c1c';
  ctx.fillRect(34, 28, 8, 13);
  ctx.fillStyle = '#e8ad56';
  ctx.fillRect(36, 30, 4, 4);

  return spriteBox(canvas);
}

function buildTerrace(): SpriteBox {
  const w = 66;
  const h = 28;
  const { canvas, ctx } = memoryCanvas(w, h);

  ctx.fillStyle = '#4a301e';
  ctx.fillRect(6, 20, 3, 8);
  ctx.fillRect(28, 20, 3, 8);
  ctx.fillRect(54, 20, 3, 8);
  ctx.fillStyle = '#785032';
  ctx.fillRect(2, 18, 62, 3);
  ctx.fillStyle = '#986642';
  ctx.fillRect(2, 18, 62, 1);

  ctx.fillStyle = '#5e3c24';
  for (let x = 4; x <= 60; x += 8) ctx.fillRect(x, 12, 2, 6);
  ctx.fillRect(2, 12, 62, 1);
  ctx.fillStyle = '#eef4ff';
  ctx.fillRect(2, 11, 62, 1);

  const drawParasol = (cx: number, colorA: string, colorB: string) => {
    ctx.fillStyle = '#483222';
    ctx.fillRect(cx, 5, 1, 13);
    for (let row = 0; row < 4; row++) {
      const half = 2 + row * 2;
      for (let x = cx - half; x <= cx + half; x++) {
        ctx.fillStyle = Math.abs(x - cx) % 3 === 0 ? colorB : colorA;
        ctx.fillRect(x, 2 + row, 1, 1);
      }
    }
    ctx.fillStyle = '#eef4ff';
    ctx.fillRect(cx - 3, 2, 7, 1);
  };
  drawParasol(16, '#d64438', '#f4eee4');
  drawParasol(46, '#3874b4', '#f4eee4');

  ctx.fillStyle = '#68442c';
  ctx.fillRect(13, 14, 7, 1);
  ctx.fillRect(16, 15, 1, 3);
  ctx.fillRect(43, 14, 7, 1);
  ctx.fillRect(46, 15, 1, 3);
  ctx.fillStyle = '#f4ece0';
  ctx.fillRect(14, 13, 2, 1);
  ctx.fillRect(45, 13, 2, 1);

  return spriteBox(canvas);
}

function buildPylon(): SpriteBox {
  const w = 22;
  const h = 42;
  const { canvas, ctx } = memoryCanvas(w, h);
  ctx.fillStyle = '#3a4254';
  for (let y = 6; y < h; y++) {
    const spread = Math.round(2 + ((y - 6) / (h - 6)) * 6);
    ctx.fillRect(11 - spread, y, 2, 1);
    ctx.fillRect(10 + spread, y, 2, 1);
    if (y % 6 === 0) ctx.fillRect(11 - spread, y, spread * 2 + 1, 1);
  }
  ctx.fillStyle = '#6a768e';
  ctx.fillRect(5, 4, 12, 2);
  ctx.fillRect(4, 2, 3, 3);
  ctx.fillRect(15, 2, 3, 3);
  return spriteBox(canvas);
}

function buildPine(h: number, seed: number, haze: number): SpriteBox {
  const w = Math.max(9, Math.round(h * 0.56)) | 1;
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const cx = Math.floor(w / 2);
  const trunkH = Math.max(3, Math.round(h * 0.12));
  const crownH = h - trunkH;
  const tiers = 4 + Math.floor(h / 11);
  const hazeRgb: RGB = [164, 184, 212];

  const trunkCol = mix([74, 52, 38], hazeRgb, haze);
  ctx.fillStyle = `rgb(${trunkCol[0] | 0},${trunkCol[1] | 0},${trunkCol[2] | 0})`;
  ctx.fillRect(cx - 1, crownH, 2, trunkH);

  const tones: RGB[] = [
    mix([58, 104, 82], hazeRgb, haze),
    mix([40, 78, 66], hazeRgb, haze),
    mix([26, 54, 50], hazeRgb, haze),
  ];
  const snowLit = mix([240, 246, 255], hazeRgb, haze * 0.6);
  const snowShade = mix([188, 208, 232], hazeRgb, haze * 0.6);

  for (let y = 0; y < crownH; y++) {
    const t = y / crownH;
    const within = t * tiers - Math.floor(t * tiers);
    const half = cx * (0.14 + 0.86 * t) * (0.58 + 0.42 * within);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = half > 0 ? (x - cx) / half : 0;
      const isSnow = within < 0.28 && (u < 0.35 || rnd() < 0.3);
      const col = isSnow
        ? (u < 0 ? snowLit : snowShade)
        : tones[u < -0.25 ? 0 : u < 0.35 ? 1 : 2];
      ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return spriteBox(canvas);
}

function buildBoulder(w: number, h: number, seed: number): SpriteBox {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const peakX = Math.round(w * (0.35 + rnd() * 0.3));
  const topY = 1;
  // Angular faceted rock silhouette with a craggy ridge top and dark fissure lines.
  for (let x = 1; x < w - 1; x++) {
    const dist = Math.abs(x - peakX);
    const maxD = x < peakX ? peakX : w - 1 - peakX;
    const slope = dist / Math.max(1, maxD);
    const crag = Math.round((rnd() - 0.5) * 2);
    const ridgeY = Math.max(topY, Math.min(h - 2, Math.round(topY + slope * (h - 4) + crag)));
    const isLeftFace = x <= peakX;
    const hasCrack = (x % 7 === 0 || (x === peakX + 3 && w > 24)) && ridgeY < h - 5;

    for (let y = ridgeY; y < h; y++) {
      const depth = y - ridgeY;
      const snowCap = depth < 2 && (isLeftFace || slope < 0.35) && rnd() > 0.2;
      if (snowCap) {
        ctx.fillStyle = isLeftFace ? '#eef4ff' : '#b8cce6';
      } else if (hasCrack && depth > 2 && depth < h - ridgeY - 2) {
        ctx.fillStyle = '#242a38';
      } else if (isLeftFace) {
        ctx.fillStyle = depth < 5 ? '#8892a6' : '#646e84';
      } else {
        ctx.fillStyle = depth < 4 ? '#4a5266' : '#323848';
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return spriteBox(canvas);
}

function buildShrub(w: number, h: number, seed: number): SpriteBox {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const cx = w / 2;
  // Low wind-sculpted alpine juniper / dwarf pine with snow tufts resting on top.
  for (let y = 2; y < h; y++) {
    const t = (y - 2) / Math.max(1, h - 2);
    const half = Math.round(w * 0.46 * Math.sin(Math.PI * (0.2 + 0.72 * t)));
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      if (rnd() < 0.16 && y < h - 2) continue;
      const side = (x - cx) / Math.max(1, half);
      const isSnow = y < Math.round(h * 0.48) && (rnd() < 0.45 || side < 0.15);
      if (isSnow) {
        ctx.fillStyle = side < 0.1 ? '#eef4ff' : '#bdd0ea';
      } else if (y > h - 3 && Math.abs(x - cx) < 3) {
        ctx.fillStyle = '#4a3628';
      } else {
        ctx.fillStyle = side < -0.15 ? '#486852' : side < 0.3 ? '#324c3e' : '#22362e';
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return spriteBox(canvas);
}

function buildGrassTuft(w: number, h: number, seed: number): SpriteBox {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seededRandom(seed);
  const blades = 4 + Math.floor(rnd() * 3);
  const baseX = Math.floor(w / 2);
  for (let b = 0; b < blades; b++) {
    const lean = (b / Math.max(1, blades - 1) - 0.5) * 2.4;
    const bh = Math.max(4, Math.round(h * (0.55 + rnd() * 0.4)));
    for (let i = 0; i < bh; i++) {
      const px = Math.round(baseX + (lean * i * i) / Math.max(1, bh));
      const py = h - 1 - i;
      if (px < 0 || px >= w || py < 0) continue;
      ctx.fillStyle = i > bh * 0.65 ? '#d8ba76' : i > bh * 0.3 ? '#9a8c50' : '#565c3a';
      ctx.fillRect(px, py, 1, 1);
    }
  }
  // Small snow fleck tucked at the base of the tuft.
  ctx.fillStyle = '#dce8fa';
  ctx.fillRect(Math.max(0, baseX - 2), h - 1, 4, 1);
  return spriteBox(canvas);
}

function buildCairn(): SpriteBox {
  const w = 13;
  const h = 16;
  const { canvas, ctx } = memoryCanvas(w, h);
  const stones = [
    { x: 2, y: 12, w: 9, h: 4, c: '#5c6476' },
    { x: 3, y: 9, w: 7, h: 3, c: '#747e94' },
    { x: 4, y: 6, w: 5, h: 3, c: '#60687c' },
    { x: 5, y: 4, w: 3, h: 2, c: '#8892a8' },
  ];
  for (const s of stones) {
    ctx.fillStyle = s.c;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#dce8fa';
    ctx.fillRect(s.x, s.y, Math.max(1, s.w - 2), 1);
  }
  return spriteBox(canvas);
}

/** Builds all pixel-art sprites once on resize; drawn crisp with imageSmoothingEnabled=false. */
export function buildAlpineSprites(): AlpineSprites {
  return {
    ...buildCreatureSprites(),
    hut: buildHut(),
    tent: buildTent(),
    gondola: buildGondola(),
    station: buildStation(),
    terrace: buildTerrace(),
    pylon: buildPylon(),
    pinesFar: [buildPine(20, 101, 0.38), buildPine(25, 102, 0.38), buildPine(22, 103, 0.38)],
    pinesMid: [buildPine(32, 201, 0.16), buildPine(38, 202, 0.16), buildPine(29, 203, 0.16)],
    pinesFg: [buildPine(64, 301, 0), buildPine(74, 302, 0)],
    boulders: [
      buildBoulder(30, 18, 401),
      buildBoulder(38, 22, 402),
      buildBoulder(22, 13, 403),
      buildBoulder(16, 10, 404),
    ],
    shrubs: [buildShrub(18, 11, 501), buildShrub(22, 13, 502), buildShrub(14, 9, 503)],
    grassTufts: [buildGrassTuft(11, 9, 601), buildGrassTuft(9, 8, 602), buildGrassTuft(13, 10, 603)],
    cairn: buildCairn(),
  };
}
