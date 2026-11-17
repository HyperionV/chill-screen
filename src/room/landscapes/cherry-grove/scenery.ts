import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import { DESIGN_HEIGHT, SCENES, waterSpan, type Scene } from './scenes';
import { BARK, CREAM, INK, RED, ROOF, STONE, oval, rect, sprite, type Sprites } from './sprites';

export interface Scenery {
  mountains: HTMLCanvasElement;
  grove: HTMLCanvasElement;
  ground: HTMLCanvasElement;
  props: HTMLCanvasElement;
  foreground: HTMLCanvasElement;
}

const GRASS = ['#879b78', '#93a37b', '#a4ad87', '#748c70'];
const MOSS = ['#536f5c', '#657e61', '#a9b28b'];
const PATH = ['#c6b9a3', '#d8c8af', '#b5ad97'];
const PETALS = ['#e7afc2', '#f6cdd7', '#d99ab3'];
const GROUND_ROW = 164;
const WHEEL_U = 0.21;
const WHEEL_ROW = 216;

function picture(width: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_HEIGHT);
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  return canvas;
}

function mountains(ctx: CanvasRenderingContext2D, width: number, scene: number): void {
  for (let layer = 0; layer < 3; layer++) {
    const colors = ['#b0b4bb', '#a2adb1', '#8d9da0'];
    for (let x = 0; x < width; x++) {
      const top = Math.round(136 + layer * 10 - noise(x / (80 - layer * 14) + layer * 13 + scene * 0.7) * (31 - layer * 5));
      rect(ctx, colors[layer], x, top, 1, 173 - top);
      if ((x + top) % 5 === 0) rect(ctx, '#c8bdc0', x, top, 1, 1);
    }
  }
  // A stepped snow line makes the distant peak readable without a hard outline.
  if (scene === 2) {
    const center = width * 0.34;
    for (let dx = -69; dx <= 69; dx++) {
      const top = 70 + Math.abs(dx) * 0.93;
      rect(ctx, '#a3aab6', center + dx, top, 1, 145 - top);
      if (Math.abs(dx) < 27) {
        const snowBottom = 91 + Math.sin(dx * 0.45) * 3 + Math.abs(dx) * 0.2;
        if (snowBottom > top) rect(ctx, '#e5dedb', center + dx, top, 1, snowBottom - top);
      }
    }
  }
}

function grove(ctx: CanvasRenderingContext2D, width: number, index: number, assets: Sprites): void {
  const count = Math.ceil(width / 23) + 2;
  for (let i = 0; i < count; i++) {
    const x = i * 23 - 10;
    const y = 166 + noise(i * 0.7 + index) * 9;
    sprite(ctx, assets.trees[i % assets.trees.length], x, y, 0.3 + hash(i + 9) * 0.16);
  }
  // Horizontal bands of haze soften the grove behind the clock.
  for (let y = 148; y < 170; y += 3) {
    for (let x = y % 4; x < width; x += 4) rect(ctx, '#c5b9bd', x, y, 2, 1);
  }
}

function ground(ctx: CanvasRenderingContext2D, width: number, scene: Scene, index: number): void {
  for (let y = GROUND_ROW; y < DESIGN_HEIGHT; y++) {
    rect(ctx, GRASS[Math.floor((y - GROUND_ROW) / 29) % GRASS.length], 0, y, width, 1);
    const t = (y - GROUND_ROW) / (DESIGN_HEIGHT - GROUND_ROW);
    const pathX = width * (0.5 - 0.07 * Math.sin(t * 4 + index));
    const pathHalf = 5 + t * t * 41;
    if (!scene.water || index === 3) rect(ctx, PATH[0], pathX - pathHalf, y, pathHalf * 2, 1);
    const span = waterSpan(scene, y, width);
    if (span) {
      rect(ctx, '#677d75', span[0] - 5, y, span[1] - span[0] + 10, 1);
      rect(ctx, '#9daca0', span[0] - 2, y, span[1] - span[0] + 4, 1);
      rect(ctx, y < 207 ? '#819f9d' : '#73918e', span[0], y, span[1] - span[0], 1);
    }
  }
  const details = Math.round(width * 3.6);
  for (let i = 0; i < details; i++) {
    const x = Math.floor(hash(i * 7 + index * 191) * width);
    const y = Math.floor(GROUND_ROW + hash(i * 11 + 6) * (DESIGN_HEIGHT - GROUND_ROW));
    const span = waterSpan(scene, y, width);
    if (span && x > span[0] - 3 && x < span[1] + 3) continue;
    const t = (y - GROUND_ROW) / (DESIGN_HEIGHT - GROUND_ROW);
    const onPath = Math.abs(x - width * (0.5 - 0.07 * Math.sin(t * 4 + index))) < 5 + t * t * 41;
    if (i % 3 === 0) rect(ctx, PETALS[i % PETALS.length], x, y, 2, 1);
    else if (onPath) rect(ctx, PATH[i % PATH.length], x, y, 2, 1);
    else {
      rect(ctx, GRASS[i % GRASS.length], x, y, 2, 1);
      if (i % 8 === 0) {
        rect(ctx, MOSS[i % MOSS.length], x, y - 3, 1, 4);
        rect(ctx, MOSS[1], x + 2, y - 2, 1, 3);
      }
    }
  }
  for (let i = 0; i < 23; i++) {
    const x = hash(i + 82 + index * 12) * width;
    const y = 182 + hash(i + 85) * 74;
    const span = waterSpan(scene, y, width);
    if (span && x > span[0] - 8 && x < span[1] + 8) continue;
    oval(ctx, '#747d72', x, y, 4 + hash(i) * 4, 3);
    rect(ctx, '#b7b5a1', x - 3, y - 2, 5, 1);
    rect(ctx, MOSS[1], x + 1, y, 5, 2);
  }
  if (index === 2) {
    const center = width * 0.76;
    const half = width * 0.2;
    for (let dx = -half; dx <= half; dx++) {
      const top = 197 + Math.abs(dx / half) ** 1.5 * 42;
      rect(ctx, '#6e886c', center + dx, top, 1, DESIGN_HEIGHT - top);
      rect(ctx, '#a1ad84', center + dx, top, 1, 2);
      if (Math.round(dx) % 5 === 0) {
        for (let row = Math.round(top) + 7; row < DESIGN_HEIGHT; row += 11) rect(ctx, '#849774', center + dx, row, 2, 1);
      }
    }
    for (let step = 0; step < 9; step++) {
      const y = 214 + step * 5;
      const x = center - step * 2;
      rect(ctx, '#7b8777', x - 14, y, 28, 3);
      rect(ctx, '#c0bca4', x - 14, y, 28, 1);
    }
  }
}

function stoneLantern(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  rect(ctx, '#6a736d', x - 11, y - 2, 22, 4);
  rect(ctx, STONE, x - 8, y - 5, 16, 3);
  rect(ctx, '#8b9388', x - 3, y - 27, 6, 23);
  rect(ctx, '#c6c4ac', x - 3, y - 27, 2, 20);
  rect(ctx, STONE, x - 9, y - 38, 18, 13);
  rect(ctx, '#59675f', x - 5, y - 35, 10, 7);
  rect(ctx, '#cdc8b1', x - 11, y - 40, 22, 3);
  for (let row = 0; row < 7; row++) rect(ctx, row % 2 ? '#899183' : STONE, x - 12 + row, y - 41 - row, 24 - row * 2, 1);
  rect(ctx, '#bdbda8', x - 2, y - 51, 4, 4);
  rect(ctx, MOSS[1], x + 4, y - 42, 5, 2);
}

function torii(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  for (const side of [-1, 1]) {
    const post = x + side * 28;
    rect(ctx, INK, post - 5, y - 66, 10, 66);
    rect(ctx, RED, post - 4, y - 66, 7, 64);
    rect(ctx, '#de8871', post - 3, y - 62, 2, 58);
    rect(ctx, '#797f73', post - 7, y - 4, 14, 5);
  }
  rect(ctx, INK, x - 44, y - 73, 88, 6);
  rect(ctx, RED, x - 39, y - 66, 78, 6);
  rect(ctx, '#da7f6c', x - 39, y - 66, 78, 2);
  rect(ctx, RED, x - 36, y - 52, 72, 5);
  rect(ctx, '#e18d74', x - 36, y - 52, 72, 1);
  rect(ctx, RED, x - 3, y - 61, 6, 14);
  rect(ctx, INK, x - 7, y - 63, 14, 14);
  rect(ctx, '#d7bd85', x - 4, y - 60, 8, 8);
  rect(ctx, '#8c6856', x - 1, y - 59, 2, 6);
  rect(ctx, INK, x - 46, y - 75, 8, 3);
  rect(ctx, INK, x + 38, y - 75, 8, 3);
}

function bridge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const half = 38;
  for (let dx = -half; dx <= half; dx++) {
    const rise = Math.round((1 - (dx / half) ** 2) * 9);
    rect(ctx, '#733f49', x + dx, y - rise, 1, 7);
    rect(ctx, '#da8b74', x + dx, y - rise, 1, 2);
    if ((dx + half) % 10 === 0) {
      rect(ctx, INK, x + dx - 1, y - rise - 15, 4, 16);
      rect(ctx, RED, x + dx, y - rise - 15, 2, 15);
      rect(ctx, '#e3a184', x + dx - 1, y - rise - 17, 4, 2);
    }
    rect(ctx, RED, x + dx, y - rise - 12, 1, 3);
    rect(ctx, '#e19a83', x + dx, y - rise - 12, 1, 1);
  }
}

function pagoda(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  for (let step = 0; step < 5; step++) {
    rect(ctx, '#797e76', x - 43 + step * 3, y - step * 3, 86 - step * 6, 3);
    rect(ctx, '#b9b8a3', x - 43 + step * 3, y - step * 3, 86 - step * 6, 1);
  }
  for (let tier = 0; tier < 3; tier++) {
    const base = y - 14 - tier * 28;
    const half = 29 - tier * 6;
    rect(ctx, '#e3ceb0', x - half, base - 22, half * 2, 22);
    for (let p = -1; p <= 1; p++) {
      rect(ctx, RED, x + p * (half - 3) - 2, base - 22, 4, 24);
      rect(ctx, '#d3836d', x + p * (half - 3) - 2, base - 22, 1, 24);
    }
    rect(ctx, '#5b5354', x - 8, base - 16, 16, 16);
    rect(ctx, '#b7a888', x - 1, base - 16, 2, 16);
    for (let row = 0; row < 10; row++) {
      const roofHalf = half + 12 - row * 2;
      rect(ctx, row % 3 === 0 ? '#7f8585' : ROOF, x - roofHalf, base - 24 - row, roofHalf * 2, 1);
    }
    rect(ctx, INK, x - half - 15, base - 27, 8, 3);
    rect(ctx, INK, x + half + 7, base - 27, 8, 3);
    rect(ctx, RED, x - half - 3, base - 2, half * 2 + 6, 3);
    for (let rail = -half; rail <= half; rail += 7) rect(ctx, RED, x + rail, base - 7, 2, 7);
  }
  rect(ctx, '#b39d6a', x - 1, y - 119, 3, 18);
  for (let ring = 0; ring < 4; ring++) rect(ctx, '#cfb888', x - 3, y - 107 - ring * 3, 7, 1);
}

function picnic(ctx: CanvasRenderingContext2D, x: number): void {
  rect(ctx, '#d8959b', x - 39, 215, 78, 22);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row + col) % 2 === 0) rect(ctx, '#f0c1bb', x - 39 + col * 8, 215 + row * 5, 7, 4);
    }
  }
  rect(ctx, '#725346', x + 4, 224, 20, 11);
  rect(ctx, '#edd7b4', x + 6, 225, 16, 8);
  rect(ctx, '#9b685a', x + 14, 225, 1, 8);
  rect(ctx, '#9b685a', x + 6, 229, 16, 1);
  rect(ctx, '#fbebcd', x + 7, 226, 6, 3);
  rect(ctx, '#d27760', x + 17, 227, 3, 2);
  rect(ctx, '#73956a', x + 7, 231, 5, 2);
  rect(ctx, '#ecd5ad', x + 4, 221, 22, 1);
  rect(ctx, '#ecd5ad', x + 4, 219, 22, 1);
  rect(ctx, BARK, x - 10, 176, 2, 48);
  for (let row = 0; row < 17; row++) {
    const half = Math.round(Math.sqrt(1 - ((16 - row) / 17) ** 2) * 36);
    rect(ctx, row % 5 === 0 ? '#b9717b' : '#dc9b9e', x - 10 - half, 167 + row, half * 2, 1);
    for (let rib = -1; rib <= 1; rib++) rect(ctx, '#f0bdb5', x - 10 + rib * row * 1.3, 167 + row, 1, 1);
  }
  rect(ctx, '#a46770', x - 46, 184, 72, 2);
  rect(ctx, INK, x - 11, 164, 3, 4);
  oval(ctx, '#9d785c', x + 40, 229, 6, 4);
  rect(ctx, '#e5d8b7', x + 37, 225, 6, 2);
}

function streamProps(ctx: CanvasRenderingContext2D, width: number, assets: Sprites): void {
  const x = width * 0.78;
  rect(ctx, '#717c70', x - 17, 225, 34, 6);
  rect(ctx, STONE, x - 14, 216, 28, 9);
  rect(ctx, '#c0bba3', x - 14, 216, 28, 2);
  sprite(ctx, assets.fox, x, 216, 1.45);
  for (let i = 0; i < 5; i++) {
    const y = 215 + i * 8;
    const span = waterSpan(SCENES[3], y, width);
    if (!span) continue;
    const sx = span[0] + (span[1] - span[0]) * (0.2 + i * 0.14);
    oval(ctx, '#576d69', sx, y + 2, 9, 4);
    oval(ctx, '#b5b5a1', sx, y, 9, 3);
    rect(ctx, '#d7cbb2', sx - 4, y - 2, 6, 1);
  }
  const wheelX = width * WHEEL_U;
  rect(ctx, '#79664e', wheelX - 12, 189, 24, 26);
  for (let i = 0; i < 5; i++) rect(ctx, '#a29473', wheelX - 11 + i * 5, 190, 2, 24);
  rect(ctx, '#b8aa85', wheelX - 16, 187, 33, 3);
  rect(ctx, '#79664e', wheelX, 197, width * (0.29 - WHEEL_U), 4);
  rect(ctx, '#a0b3a6', wheelX, 197, width * (0.29 - WHEEL_U), 1);
}

export function buildScenery(width: number, assets: Sprites): Scenery[] {
  return SCENES.map((scene, index) => ({
    mountains: picture(width, (ctx) => mountains(ctx, width, index)),
    grove: picture(width, (ctx) => grove(ctx, width, index, assets)),
    ground: picture(width, (ctx) => ground(ctx, width, scene, index)),
    props: picture(width, (ctx) => {
      if (index === 0) picnic(ctx, width * 0.245);
      if (index === 1) torii(ctx, width * 0.265, 192);
      if (index === 2) pagoda(ctx, width * 0.76, 207);
      if (index === 3) streamProps(ctx, width, assets);
      if (index === 4) {
        // A low tea bench and cups give the lantern clearing a human scale.
        rect(ctx, BARK, width * 0.25 - 27, 218, 54, 5);
        rect(ctx, '#ac8270', width * 0.25 - 27, 218, 54, 1);
        rect(ctx, INK, width * 0.25 - 23, 223, 4, 13);
        rect(ctx, INK, width * 0.25 + 19, 223, 4, 13);
        rect(ctx, CREAM, width * 0.25 - 7, 214, 5, 4);
        rect(ctx, '#c6c9ad', width * 0.25 + 7, 214, 5, 4);
      }
      if (scene.bridge) bridge(ctx, scene.bridge.x * width, scene.bridge.y);
      stoneLantern(ctx, width * (index === 1 ? 0.16 : 0.86), index === 1 ? 243 : 252);
    }),
    foreground: picture(width, (ctx) => {
      for (let i = 0; i < width; i += 4) {
        if (i > width * 0.35 && i < width * 0.65) continue;
        const rise = 3 + hash(i + index) * 12;
        rect(ctx, '#4b6559', i, DESIGN_HEIGHT - rise, 2, rise);
        rect(ctx, '#74896b', i - 2, DESIGN_HEIGHT - rise + 3, 3, 1);
        if (i % 12 === 0) {
          oval(ctx, '#ddabc0', i, DESIGN_HEIGHT - rise - 1, 2, 2);
          rect(ctx, CREAM, i, DESIGN_HEIGHT - rise - 1, 1, 1);
        }
      }
    }),
  }));
}

export function drawWheel(ctx: CanvasRenderingContext2D, width: number, time: number): void {
  const x = width * WHEEL_U;
  const y = WHEEL_ROW;
  const radius = 17;
  // Drawing only the rim and spokes leaves the running water visible between them.
  for (let i = 0; i < 90; i++) {
    const angle = i / 90 * Math.PI * 2;
    rect(ctx, '#74604d', x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 3, 3);
  }
  for (let spoke = 0; spoke < 10; spoke++) {
    const angle = time * 0.18 + spoke / 10 * Math.PI * 2;
    for (let r = 1; r < radius; r++) rect(ctx, '#ac9371', x + Math.cos(angle) * r, y + Math.sin(angle) * r, 2, 2);
    rect(ctx, '#c3a47c', x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 4, 4);
  }
  oval(ctx, '#655547', x + 1, y + 1, 3, 3);
  rect(ctx, '#d3bd8d', x, y, 2, 2);
}
