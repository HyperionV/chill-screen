import { memoryCanvas } from '../../../render/pixel-stage';
import { hash } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';

export const INK = '#58454f';
export const BARK = '#785257';
export const RED = '#b84d54';
export const ROOF = '#535963';
export const STONE = '#aaa99b';
export const CREAM = '#f8e7cf';
const BLOSSOM = ['#a76889', '#cf8eaa', '#ebaac2', '#f8c8d5', '#ffe2e7'];
const TREE_WIDTH = 100;
const TREE_HEIGHT = 103;
const MOON_EDGE = '#edf4ff';
const MOON_SHADE = '#afd4fa';

export function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

export function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = color;
  const radius = Math.max(1, Math.round(ry));
  for (let row = -radius; row <= radius; row++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - row * row / (radius * radius))));
    ctx.fillRect(Math.round(x) - half, Math.round(y) + row, half * 2 + 1, 1);
  }
}

export function sprite(ctx: CanvasRenderingContext2D, picture: HTMLCanvasElement, x: number, y: number, scale = 1): void {
  const width = Math.round(picture.width * scale);
  const height = Math.round(picture.height * scale);
  ctx.drawImage(picture, Math.round(x - width / 2), Math.round(y - height), width, height);
}

interface BlossomTree {
  image: HTMLCanvasElement;
  moonRim: HTMLCanvasElement;
}

function tree(seed: number): BlossomTree {
  const { canvas, ctx } = memoryCanvas(TREE_WIDTH, TREE_HEIGHT);
  for (let y = 27; y < 102; y++) {
    const bend = Math.round(Math.sin(y / 26 + seed) * 5);
    rect(ctx, INK, 47 + bend, y, 7 + (y > 96 ? 5 : 0), 1);
    rect(ctx, BARK, 48 + bend, y, 3, 1);
    if (y % 11 === 0) rect(ctx, '#ad7b76', 49 + bend, y, 2, 2);
  }
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 30; i++) {
      rect(ctx, INK, 50 + side * i, 65 - i, 4, 4);
      rect(ctx, BARK, 50 + side * i, 65 - i, 2, 2);
      if (i % 5 < 3) rect(ctx, '#a77a77', 50 + side * i, 65 - i, 1, 1);
    }
  }
  const crown = memoryCanvas(TREE_WIDTH, TREE_HEIGHT);
  for (let i = 0; i < 15; i++) {
    const cx = 15 + hash(i + seed * 40) * 70;
    const cy = 15 + hash(i + 18 + seed * 40) * 29;
    const radius = 15 + hash(i + 65) * 8;
    oval(crown.ctx, BLOSSOM[0], cx, cy + 6, radius, radius * 0.66);
    oval(crown.ctx, BLOSSOM[1], cx, cy + 2, radius, radius * 0.65);
    oval(crown.ctx, BLOSSOM[2], cx - 2, cy, radius - 2, radius * 0.53);
    oval(crown.ctx, BLOSSOM[3], cx - 4, cy - 4, radius * 0.65, radius * 0.3);
  }
  // Read the baked crown once so blossoms and the moonlit edge stay inside its silhouette.
  const pixels = crown.ctx.getImageData(0, 0, TREE_WIDTH, TREE_HEIGHT).data;
  const covered = (x: number, y: number): boolean =>
    x >= 0 && x < TREE_WIDTH && y >= 0 && y < TREE_HEIGHT && pixels[(y * TREE_WIDTH + x) * 4 + 3] !== 0;
  crown.ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 390; i++) {
    const x = Math.floor(hash(i + seed * 700) * 94) + 3;
    const y = Math.floor(hash(i + 85) * 45) + 10;
    rect(crown.ctx, BLOSSOM[i % BLOSSOM.length], x, y, 2, 1);
    if (i % 5 === 0) rect(crown.ctx, BLOSSOM[4], x + 1, y - 1, 1, 3);
  }
  ctx.drawImage(crown.canvas, 0, 0);

  const rim = memoryCanvas(TREE_WIDTH, TREE_HEIGHT);
  for (let x = 0; x < TREE_WIDTH; x++) {
    for (let y = 0; y < TREE_HEIGHT; y++) {
      if (!covered(x, y) || covered(x, y - 1)) continue;
      rect(rim.ctx, hash(x + seed * 191) < 0.32 ? MOON_SHADE : MOON_EDGE, x, y, 1, 1);
      if (covered(x, y + 1) && (x + y) % 3 !== 0) rect(rim.ctx, MOON_SHADE, x, y + 1, 1, 1);
      if (covered(x, y + 4) && (x + y) % 7 === 0) rect(rim.ctx, MOON_SHADE, x, y + 4, 1, 1);
      break;
    }
  }
  return { image: canvas, moonRim: rim.canvas };
}

const CAT_PALETTE = { o: '#d68a4f', d: '#a95f40', l: '#f4bb70', c: '#ffe1ab', e: '#453a43', p: '#cf8885' };
const CAT_ROWS = [
  '...............o...o..', '...............oo.oo..', '...............olllo..',
  '..............olllllo.', '..............ocelceo.', '..............occpcco.',
  '.....dddddd...oocccoo.', '...dollllllloooolloo..', '..dolldolldollllloo...',
  '.dolllllllllllllllo...', 'dollllllllllllllllo...', 'doollllllllllllllo....',
  '.doocccccccccccoo.....', '..oooccccccccooo......', '...oocoo..oocoo.......',
  '...occco..occco.......',
];
const SLEEP_ROWS = [
  '......................', '......................', '......................',
  '....ooooooo...........', '..oolllllllooo..o...o.', '.olllldllldlllo.oo.oo.',
  'olllllllllllllloolllo.', 'ollccccclllllllocccco.', 'olccccccclllllocceceo.',
  'olccclllocllllloccpco.', '.olccllloclllooocccoo.', '..ooolllooooolllooo...',
  '....ooooo...ooooo.....',
];

function person(): HTMLCanvasElement {
  return pixmap([
    '......hhhh......', '.....hhhhhh.....', '.....hsssph.....', '......ssss......',
    '.......ss.......', '....ttttttt.....', '...ttttttttt....', '..sttttttttts...',
    '..sttttttttts...', '...ttttttttt....', '....ttttttt.....', '....ttttttt.....',
    '...ttttttttt....', '..ttttttttttt...', '.ttttttttttttt..', '.ttttttttttttt..',
    '..ttttttttttt...', '...dddddttttt...', '...ddddddtttt...', '...dddddddddd...',
    '...dddddddddd...', '....dddddddd....', '....dddddddd....', '...eeee..eeee...',
    '..eeeee..eeeee..',
  ], { h: '#463a45', s: '#ecc39f', p: '#bb897c', t: '#768e8a', d: '#55616c', e: '#433d47' });
}

function fox(): HTMLCanvasElement {
  return pixmap([
    '...s.......s...', '...ss.....ss...', '...sss...sss...', '...slssssls....',
    '....slllls.....', '....slssls.....', '....slllls.....', '.....sdds......',
    '.....slls......', '....rssssr.....', '...rrrrrrrr....', '....ssllss.....',
    '....ssllss.....', '...ssllllss....', '...ssllllsss...', '..sssllllssss..',
    '..sssssssssss..', '.sssssssssssss.', 'sssssssssssssss',
  ], { s: '#999b91', l: '#c4c2ab', d: '#515861', r: '#b55356' });
}

function lantern(): HTMLCanvasElement {
  return pixmap([
    '....dd....', '....dd....', '..dddddd..', '.rrrrrrrr.', 'rrlrrllrrr',
    'rrlrrllrrr', 'rrlrrllrrr', 'rrlrrllrrr', 'rrlrrllrrr', 'rrlrrllrrr',
    '.rrrrrrrr.', '..dddddd..', '....dd....', '....rr....',
  ], { d: INK, r: '#d98a82', l: '#efb4a3' });
}

export interface Sprites {
  trees: readonly BlossomTree[];
  cat: HTMLCanvasElement;
  sleepingCat: HTMLCanvasElement;
  person: HTMLCanvasElement;
  fox: HTMLCanvasElement;
  lantern: HTMLCanvasElement;
}

export function buildSprites(): Sprites {
  return {
    trees: [tree(1), tree(2), tree(3)], cat: pixmap(CAT_ROWS, CAT_PALETTE),
    sleepingCat: pixmap(SLEEP_ROWS, CAT_PALETTE), person: person(), fox: fox(), lantern: lantern(),
  };
}
