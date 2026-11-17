import { memoryCanvas } from '../../../render/pixel-stage';
import { drawText } from '../../../render/pixel-font';
import { hash, noise } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import { DESIGN_HEIGHT, HOLLOW_Y, hollowX, hutX, nearPines, STONE_ROWS, stoneX, streamHalfWidth, streamX, type Pine } from './scenes';
import { fernSprite, pineSprite } from './sprites';

const PAD = 12;
const GROUND_ROW = 165;
const FERN_COUNT = 34;
const MIST_BANDS = 9;
const PINE_STRIP = 6;
const TEXTURE_DENSITY = 3;

interface SceneArt {
  far: HTMLCanvasElement;
  middle: HTMLCanvasElement;
  ground: HTMLCanvasElement;
  props: HTMLCanvasElement;
  trees: { pine: Pine; sprite: HTMLCanvasElement }[];
  hits: Pine[];
}

function rect(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function stone(c: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  rect(c, '#354e4d', x - size, y - 2, size * 2, 7);
  rect(c, '#71847a', x - size + 2, y - 5, size * 2 - 4, 6);
  rect(c, '#9da793', x - size + 3, y - 5, size, 1);
  rect(c, '#526f43', x - size, y - 2, size, 2);
  rect(c, '#87a25d', x - size + 1, y - 3, size - 2, 1);
}

function log(c: CanvasRenderingContext2D, x: number, y: number): void {
  rect(c, '#403b2f', x, y, 66, 13);
  rect(c, '#716247', x, y, 63, 9);
  rect(c, '#506843', x + 3, y - 2, 54, 4);
  rect(c, '#8c9b59', x + 4, y - 2, 38, 1);
  rect(c, '#ad9466', x + 60, y + 1, 7, 9);
  rect(c, '#6a553a', x + 62, y + 3, 3, 5);
  for (let i = 0; i < 8; i++) rect(c, '#3c3a2b', x + i * 7 + 2, y + 6 + i % 3, 5, 1);
}

function mushrooms(c: CanvasRenderingContext2D, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const h = 5 + i % 2 * 3;
    rect(c, '#c2b797', x + i * 7, y - h, 2, h);
    rect(c, '#a56642', x + i * 7 - 3, y - h, 8, 2);
    rect(c, '#c08b59', x + i * 7 - 2, y - h - 2, 6, 2);
    rect(c, '#e0c69b', x + i * 7, y - h - 1, 1, 1);
  }
}

export class Scenery {
  private width = 0;
  private art: SceneArt[] = [];
  private fern: HTMLCanvasElement | null = null;

  resize(width: number): void {
    this.width = width;
    this.fern = fernSprite();
    this.art = Array.from({ length: 5 }, (_, scene) => this.build(scene));
  }

  trees(scene: number): readonly Pine[] {
    return this.art[scene]?.hits ?? [];
  }

  private layer(paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const { canvas, ctx } = memoryCanvas(this.width + PAD * 2, DESIGN_HEIGHT);
    ctx.translate(PAD, 0);
    paint(ctx);
    return canvas;
  }

  private build(scene: number): SceneArt {
    const w = this.width;
    const distant: Pine[] = [];
    const far = this.layer((c) => {
      rect(c, '#91afaa', -PAD, 123, w + PAD * 2, 80);
      for (let i = 0; i < Math.ceil(w / 23) + 2; i++) {
        const tall = 116 + Math.floor(hash(i + scene * 17) * 67);
        const sprite = pineSprite(tall, 38, 0.8);
        c.drawImage(sprite, i * 23 - 22, 175 - tall);
        distant.push({ x: i * 23 - 3, base: 175, height: tall, width: 38, depth: 0.2 });
      }
      // Quiet haze over the clock band preserves depth without a hard central silhouette.
      rect(c, 'rgba(175,199,187,0.28)', -PAD, 89, w + PAD * 2, 62);
    });
    const middle = this.layer((c) => {
      for (let i = 0; i < Math.ceil(w / 43) + 2; i++) {
        const x = i * 43 - 22;
        if (x > w * 0.31 && x < w * 0.69) continue;
        const tall = 156 + Math.floor(hash(i * 7 + scene * 11) * 61);
        const sprite = pineSprite(tall, 59, 0.3);
        c.drawImage(sprite, x - 29, 183 - tall);
        distant.unshift({ x, base: 183, height: tall, width: 59, depth: 0.45 });
      }
    });
    const ground = this.layer((c) => {
      for (let x = -PAD; x < w + PAD; x++) {
        const top = Math.round(GROUND_ROW + noise(x * 0.017 + scene * 4) * 13);
        rect(c, scene === 2 ? '#6d8651' : '#405f49', x, top, 1, DESIGN_HEIGHT - top);
        rect(c, '#668063', x, top, 1, 3);
        rect(c, '#324e3e', x, 227 + noise(x * 0.03) * 11, 1, 43);
      }
      for (let i = 0; i < w * TEXTURE_DENSITY; i++) {
        const x = Math.floor(hash(i * 7 + scene) * (w + PAD * 2)) - PAD;
        const y = 183 + Math.floor(hash(i * 13 + 9) * 87);
        const tone = hash(i + 3);
        rect(c, tone < 0.3 ? '#70834e' : tone < 0.6 ? '#4b6d48' : '#2e493d', x, y, 1 + i % 3, 1);
        if (i % 9 === 0) {
          rect(c, '#547548', x, y - 3, 1, 3);
          rect(c, '#7d9157', x - 1, y - 3, 1, 1);
        }
        if (scene === 2 && i % 11 === 0) {
          rect(c, '#416741', x, y - 4, 1, 4);
          rect(c, i % 2 ? '#dfbf71' : '#d4d5b4', x - 1, y - 5, 3, 2);
          rect(c, '#a78743', x, y - 4, 1, 1);
        }
      }
      if (scene === 1) this.paintStream(c);
      if (scene === 4) {
        for (let y = 175; y < DESIGN_HEIGHT; y++) {
          const x = w * 0.47 - (y - 175) * 0.95;
          const span = 8 + (y - 175) * 0.38;
          rect(c, '#8c8060', x, y, span, 1);
          for (let j = 0; j < 3; j++) rect(c, '#aa9870', x + hash(y * 3 + j) * span, y, 1, 1);
        }
      }
    });
    const props = this.layer((c) => {
      if (scene === 0) { log(c, w * 0.64, 226); mushrooms(c, w * 0.69, 229); }
      if (scene === 1) this.bridge(c);
      if (scene === 2) {
        log(c, w * 0.08, 226);
        stone(c, w * 0.8, 218, 17);
        mushrooms(c, w * 0.82, 219);
      }
      if (scene === 3) this.hollow(c);
      if (scene === 4) this.hut(c);
      for (let i = 0; i < 9; i++) {
        const x = hash(i * 17 + scene * 3) * w;
        const y = 206 + hash(i * 29) * 53;
        if (scene === 1 && Math.abs(x - streamX(w, y)) < streamHalfWidth(y) + 7) continue;
        if (i % 3 === 0) mushrooms(c, x, y);
        else stone(c, x, y, 3 + i % 4);
      }
    });
    const near = nearPines(w, scene);
    const oldPine: Pine[] = scene === 3 ? [{ x: hollowX(w), base: 217, height: 230, width: 42, depth: 1 }] : [];
    return { far, middle, ground, props, hits: [...near, ...oldPine, ...distant],
      trees: near.map((pine) => ({ pine, sprite: pineSprite(pine.height, pine.width, 0) })) };
  }

  private paintStream(c: CanvasRenderingContext2D): void {
    for (let y = GROUND_ROW; y < DESIGN_HEIGHT; y++) {
      const cx = streamX(this.width, y);
      const half = streamHalfWidth(y);
      rect(c, '#263f38', cx - half - 4, y, half * 2 + 8, 1);
      rect(c, '#5a8d87', cx - half, y, half * 2, 1);
      rect(c, '#86a79a', cx - half + 2, y, 3, 1);
      for (let j = 0; j < 3; j++) {
        const x = cx - half + hash(y * 5 + j * 11) * half * 2;
        rect(c, j === 0 ? '#8f9e84' : '#48756e', x, y, 2 + j, 1);
      }
    }
    for (const y of STONE_ROWS) stone(c, stoneX(this.width, y), y, 10);
  }

  private bridge(c: CanvasRenderingContext2D): void {
    const x = streamX(this.width, 180) - 42;
    rect(c, '#3d4030', x - 2, 178, 88, 9);
    rect(c, '#9c8860', x - 2, 176, 88, 4);
    for (let i = 0; i < 14; i++) rect(c, '#63573f', x + i * 6, 176, 1, 5);
    rect(c, '#b3a17a', x - 2, 165, 88, 2);
    for (let i = 0; i < 4; i++) {
      rect(c, '#716548', x + i * 28, 162, 3, 23);
      rect(c, '#bdab7a', x + i * 28, 162, 1, 16);
    }
    rect(c, '#5a7750', x + 3, 178, 12, 2);
  }

  private hollow(c: CanvasRenderingContext2D): void {
    const x = hollowX(this.width);
    rect(c, '#403d32', x - 22, -5, 42, 217);
    rect(c, '#675a42', x - 20, -5, 25, 215);
    for (let i = 0; i < 13; i++) {
      rect(c, i % 2 ? '#837150' : '#4b4434', x - 18 + i * 3, hash(i) * 32, 1, 156 + hash(i + 7) * 32);
    }
    for (let i = 0; i < 20; i++) {
      rect(c, '#496243', x - 18 + hash(i * 7) * 34, 179 + hash(i * 17) * 24, 3, 4);
    }
    for (let i = 0; i < 5; i++) {
      rect(c, '#4b4935', x - 32 + i * 12, 205, 9, 12 - Math.abs(i - 2) * 2);
    }
    rect(c, '#927c53', x - 12, HOLLOW_Y - 29, 25, 34);
    rect(c, '#272e2c', x - 10, HOLLOW_Y - 28, 21, 30);
    rect(c, '#1c2929', x - 8, HOLLOW_Y - 30, 17, 34);
    rect(c, '#ab9463', x - 13, HOLLOW_Y + 3, 29, 3);
    rect(c, '#514c36', x - 51, 67, 37, 7);
    rect(c, '#557148', x - 49, 65, 31, 2);
    mushrooms(c, x - 38, 217); mushrooms(c, x + 16, 214);
    log(c, this.width * 0.08, 242);
  }

  private hut(c: CanvasRenderingContext2D): void {
    const x = hutX(this.width);
    rect(c, '#3a4033', x - 5, 200, 94, 6);
    rect(c, '#796c4c', x, 149, 82, 53);
    for (let y = 152; y < 200; y += 5) {
      rect(c, '#504d38', x, y, 82, 1);
      rect(c, '#9b8760', x + 1, y + 1, 80, 1);
    }
    for (let y = 0; y < 25; y++) {
      rect(c, y % 4 === 0 ? '#526250' : '#394e43', x - 9 + y * 0.4, 127 + y, 101 - y * 0.8, 1);
    }
    rect(c, '#9c8e6c', x + 60, 112, 10, 23);
    rect(c, '#494c3e', x + 58, 111, 14, 3);
    rect(c, '#343c32', x + 31, 166, 19, 36);
    rect(c, '#b7a077', x + 34, 167, 13, 33);
    rect(c, '#6d6148', x + 36, 168, 1, 31);
    rect(c, '#e1c77c', x + 44, 184, 2, 2);
    rect(c, '#343f38', x + 9, 161, 16, 18);
    rect(c, '#99b2a0', x + 11, 163, 12, 13);
    rect(c, '#6a6550', x + 16, 161, 2, 18);
    rect(c, '#6a6550', x + 9, 169, 16, 2);
    rect(c, '#3f5038', x - 6, 202, 94, 2);
    const sign = this.width * 0.26;
    rect(c, '#6b6044', sign, 173, 4, 42);
    rect(c, '#b09b6a', sign - 20, 174, 44, 11);
    rect(c, '#796b49', sign - 16, 188, 35, 9);
    drawText(c, 'PINES', sign - 14, 177, '#3c4937');
    drawText(c, '2 KM', sign - 10, 190, '#d0bc8b');
    rect(c, '#303c30', x + 84, 167, 8, 12);
    rect(c, '#dfb968', x + 86, 170, 4, 6);
    rect(c, '#4b4836', x + 83, 166, 10, 2);
    rect(c, '#4b4836', x + 87, 159, 1, 8);
  }

  drawBack(c: CanvasRenderingContext2D, scene: number, px: number, py: number, time: number, state: SkyState): void {
    const art = this.art[scene];
    c.drawImage(art.far, Math.round(-PAD + px * 0.2), Math.round(py * 0.2));
    c.drawImage(art.middle, Math.round(-PAD + px * 0.45), Math.round(py * 0.45));
    c.drawImage(art.ground, Math.round(-PAD + px * 0.7), 0);
    const lowSun = Math.max(0, 1 - state.sun.up / 0.65) * state.day;
    c.fillStyle = `rgba(255,217,151,${state.day * (0.025 + lowSun * 0.065)})`;
    for (let i = 0; i < 3; i++) {
      const x = this.width * (0.21 + i * 0.27) + Math.sin(time * 0.12 + i) * 2;
      for (let y = 5; y < 203; y += 3) {
        if ((y + i) % 2) continue;
        c.fillRect(Math.round(x + y * 0.21), y, 5 + Math.floor(y * 0.04), 1);
      }
    }
    c.drawImage(art.props, Math.round(-PAD + px), Math.round(py * 0.3));
    if (scene === 1) {
      for (let i = 0; i < 28; i++) {
        const y = 184 + ((i * 17 + time * 3) % 84);
        const x = streamX(this.width, y) + (hash(i * 17) - 0.5) * streamHalfWidth(y) * 1.7;
        rect(c, '#a4bca8', x + px * 0.7, y, 2 + i % 5, 1);
      }
    }
    if (scene === 4) {
      for (let i = 0; i < 5; i++) {
        const age = (time * 0.14 + i / 5) % 1;
        const x = hutX(this.width) + 65 + Math.sin(age * 4 + time * 0.2) * age * 12;
        rect(c, `rgba(183,196,178,${(1 - age) * 0.32})`, x + px, 111 - age * 50, 4 + age * 7, 3);
      }
    }
  }

  drawFront(c: CanvasRenderingContext2D, scene: number, px: number, py: number, time: number, pointerX: number | null): void {
    const art = this.art[scene];
    for (const tree of art.trees) {
      const { pine: p, sprite } = tree;
      const bend = Math.sin(time * 0.4 + p.x) * 0.8 + (pointerX === null ? 0 : Math.max(-2, Math.min(2, (pointerX - p.x) * 0.015)));
      for (let sy = 0; sy < p.height; sy += PINE_STRIP) {
        const rows = Math.min(PINE_STRIP, p.height - sy);
        const sway = bend * (1 - sy / p.height);
        c.drawImage(sprite, 0, sy, p.width, rows, Math.round(p.x - p.width / 2 + px * 1.5 + sway),
          Math.round(p.base - p.height + sy + py * 0.4), p.width, rows);
      }
    }
    if (!this.fern) return;
    for (let i = 0; i < FERN_COUNT; i++) {
      const x = hash(i * 23 + scene * 13) * this.width;
      const y = 201 + hash(i * 31 + 4) * 69;
      if (x > this.width * 0.38 && x < this.width * 0.63 && y > 199) continue;
      if (scene === 1 && Math.abs(x - streamX(this.width, y)) < streamHalfWidth(y) + 9) continue;
      const scale = y > 243 ? 1.7 : 1;
      const bend = Math.sin(time * 0.65 + i) + (pointerX === null ? 0 : Math.max(-3, Math.min(3, (pointerX - x) * 0.04)));
      for (let row = 0; row < this.fern.height; row += 3) {
        const rows = Math.min(3, this.fern.height - row);
        c.drawImage(this.fern, 0, row, this.fern.width, rows,
          Math.round(x + px * 2 + bend * (1 - row / this.fern.height)), Math.round(y - (this.fern.height - row) * scale),
          Math.round(this.fern.width * scale), Math.round(rows * scale));
      }
    }
  }

  mist(c: CanvasRenderingContext2D, scene: number, time: number, pointer: { x: number; y: number } | null): void {
    const strength = scene === 0 ? 0.17 : scene === 3 ? 0.1 : 0.055;
    for (let i = 0; i < MIST_BANDS; i++) {
      const y = 131 + i * 9;
      const drift = Math.sin(time * 0.08 + i) * 22;
      c.fillStyle = `rgba(181,208,198,${strength * (0.7 + Math.sin(time * 0.1 + i) * 0.2)})`;
      for (let x = -20; x < this.width + 20; x += 9) {
        if (pointer && Math.hypot(x - pointer.x, y - pointer.y) < 30) continue;
        if (noise((x + drift) * 0.02 + i * 7) < 0.32) continue;
        c.fillRect(x, y + Math.round(Math.sin(x * 0.02 + i + time * 0.1) * 2), 9, 2 + i % 3);
      }
    }
  }
}
