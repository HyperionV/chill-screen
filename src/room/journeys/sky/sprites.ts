import { memoryCanvas } from '../../../render/pixel-stage';
import { pixmap } from '../pixmap';
import { hash } from '../noise';
import { disc } from '../../sky';

const ROCK_WIDTH = 144;
const ROCK_HEIGHT = 100;
const GRASS_ROW = 32;
const ROCK_BOTTOM = 94;
const STONE = ['#606f79', '#78858a', '#929b96', '#4b5d69'];

function island(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(ROCK_WIDTH, ROCK_HEIGHT);
  for (let x = 5; x < ROCK_WIDTH - 5; x++) {
    const edge = Math.sin((x - 5) / (ROCK_WIDTH - 10) * Math.PI);
    const top = GRASS_ROW + Math.round(Math.sin(x * 0.1 + seed) * 2);
    const bottom = top + Math.round(edge * (ROCK_BOTTOM - GRASS_ROW) * (0.65 + hash(Math.floor(x / 8) + seed) * 0.35));
    ctx.fillStyle = STONE[Math.floor(x / 13 + seed) % STONE.length];
    ctx.fillRect(x, top, 1, bottom - top);
    ctx.fillStyle = '#477e6b';
    ctx.fillRect(x, top - 2, 1, 4);
    ctx.fillStyle = '#9dbd77';
    ctx.fillRect(x, top - 3, 1, 1);
    for (let y = top + 5; y < bottom; y += 4) {
      if (hash(x * 19 + y + seed) > 0.77) {
        ctx.fillStyle = '#b2b4a1';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = 25 + i * 22;
    const y = GRASS_ROW - 10 - Math.round(hash(seed + i) * 4);
    ctx.fillStyle = '#c8b99a';
    ctx.fillRect(x, y, 12, GRASS_ROW - y);
    ctx.fillStyle = '#7f6158';
    for (let r = 0; r < 5; r++) ctx.fillRect(x - 2 + r, y - r, 16 - r * 2, 1);
    ctx.fillStyle = '#f0ddaf';
    ctx.fillRect(x + 1, y + 1, 1, GRASS_ROW - y - 1);
    ctx.fillStyle = '#4b5b62';
    ctx.fillRect(x + 5, GRASS_ROW - 5, 3, 5);
    ctx.fillRect(x + 2, y + 3, 2, 2);
    ctx.fillRect(x + 8, y + 3, 2, 2);
    ctx.fillStyle = '#756a62';
    ctx.fillRect(x + 9, y - 5, 2, 5);
  }
  return canvas;
}

function whale(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(64, 26);
  for (let x = 4; x < 54; x++) {
    const half = Math.round(Math.sin((x - 4) / 50 * Math.PI) * 9);
    ctx.fillStyle = '#769aaf';
    ctx.fillRect(x, 11 - half, 1, half * 2 + 1);
    ctx.fillStyle = '#b1c5c7';
    ctx.fillRect(x, 13 + Math.floor(half / 2), 1, Math.max(1, Math.floor(half / 2)));
    if (x % 4 === 0) {
      ctx.fillStyle = '#95b0bb';
      ctx.fillRect(x, 10 - half, 1, 1);
    }
  }
  ctx.fillStyle = '#52788f';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(50 + i, 11 - Math.floor(i / 2), 1, 1 + i);
    ctx.fillRect(25 + i, 17, 1, 8 - Math.floor(i / 2));
  }
  ctx.fillStyle = '#283e54';
  ctx.fillRect(11, 10, 2, 2);
  ctx.fillStyle = '#d9e2dc';
  ctx.fillRect(11, 10, 1, 1);
  ctx.fillStyle = '#52788f';
  ctx.fillRect(5, 15, 11, 1);
  return canvas;
}

function lanternGlow(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(25, 25);
  ctx.fillStyle = '#ffc879';
  ctx.globalAlpha = 0.045;
  disc(ctx, 12, 12, 12);
  ctx.globalAlpha = 0.075;
  disc(ctx, 12, 12, 8);
  ctx.globalAlpha = 0.12;
  disc(ctx, 12, 12, 5);
  return canvas;
}

export function buildSprites() {
  const pigeonColors = { b: '#b8c5cc', d: '#637a8e', w: '#eef0d8', k: '#243746', a: '#d5a46b', g: '#6c9c97' };
  const perched = pixmap([
    '......bbb...', '.....bbkb...', '.....gbba...', '..ddbbbg....', '.dbbbbbbb...', '..wwwwbb....', '...d.dd.....', '...a.a......',
  ], pigeonColors);
  const flying = pixmap([
    '..dd........', '...dbb......', '....db..bbb.', '.....bb.bbkb', '.ddbbbbbgbaa', '..dbbbwww...', '....dd......',
  ], pigeonColors);
  return {
    islands: [island(2), island(7), island(11)], whale: whale(), perched, flying, lanternGlow: lanternGlow(),
    lantern: pixmap(['.ttt.', 'trhrt', 'rhchr', 'rhchr', 'rhchr', 'trhrt', '.ttt.', '..f..', '..y..'],
      { t: '#95664d', r: '#df935e', h: '#ffd48c', c: '#fff0bd', f: '#ffba59', y: '#ffe1a0' }),
    bag: pixmap(['..dd..', '.bbbb.', '.bhbb.', 'bbhbbb', 'bbbbbb', '.dddd.'],
      { d: '#7c6356', b: '#b99970', h: '#dcc29a' }),
    balloon: pixmap(['...aaa...', '.aaabbb..', 'aaabbbbb.', 'aaabbbbb.', '.aaabbb..', '..aabb...', '...d.d...', '...ddd...'],
      { a: '#e3c899', b: '#ba8069', d: '#665653' }),
    fish: pixmap(['....b...', 'aabbbbk.', '.bbbbb..', 'a..b....'],
      { a: '#9dc3cc', b: '#cfddd7', k: '#5e8798' }),
    wisp: pixmap(['........wwww..........', '....wwwwwwwwwwww......', '..wwwwhwwwwwwhwwwww...', 'wwwwwwwwwwwwwwwwwwwwww', '..swswswswswswswswsw..'],
      { w: '#dce4de', h: '#f0eddd', s: '#bacdd1' }),
  };
}

export type Sprites = ReturnType<typeof buildSprites>;

// All scene positions are whole design pixels before the final nearest-neighbour copy.
export function picture(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number, scale = 1): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x), Math.round(y), Math.max(1, Math.round(sprite.width * scale)), Math.max(1, Math.round(sprite.height * scale)));
}
