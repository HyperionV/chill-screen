import { memoryCanvas } from '../../../render/pixel-stage';
import { drawText } from '../../../render/pixel-font';
import { hash, noise } from '../../journeys/noise';
import { breeze } from '../../wind';
import { paintFloor } from './floor';
import { luminousMushrooms } from './lighting';
import { dither, rect } from './pixels';
import {
  CHAPTERS, DESIGN_HEIGHT, GROUND_ROW, HOLLOW_SCENE, HOLLOW_Y, hollowX, hutX, MEADOW_SCENE,
  MISTY_SCENE, mushroomPatches, nearPines, STONE_ROWS, stoneX, STREAM_SCENE, streamHalfWidth, streamX, TRAIL_SCENE,
  type MushroomPatch, type Pine,
} from './scenes';
import { pineSprite } from './sprites';

const PINE_STRIP = 5;
const PINE_BEND = 3;
const STREAM_GLINTS = 26;
const STREAM_GLINT_RUN = 80;

interface SceneArt {
  back: HTMLCanvasElement;
  props: HTMLCanvasElement;
  trees: { pine: Pine; sprite: HTMLCanvasElement }[];
  hits: Pine[];
}

function stone(c: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  rect(c, '#354e4d', x - size, y - 2, size * 2, 7);
  rect(c, '#71847a', x - size + 2, y - 5, size * 2 - 4, 6);
  rect(c, '#9da793', x - size + 3, y - 5, size, 1);
  rect(c, '#526f43', x - size, y - 2, size, 2);
  rect(c, '#87a25d', x - size + 1, y - 3, size - 2, 1);
  rect(c, '#667b66', x + size * 0.27, y - 3, size * 0.51, 1);
  rect(c, '#91a38b', x + size * 0.31, y - 2, 2, 1);
  rect(c, '#566d61', x + size * 0.27, y + 1, size * 0.54, 1);
}

function log(c: CanvasRenderingContext2D, x: number, y: number): void {
  rect(c, '#403b2f', x, y, 66, 13);
  rect(c, '#716247', x, y, 63, 9);
  rect(c, '#506843', x + 3, y - 2, 54, 4);
  rect(c, '#8c9b59', x + 4, y - 2, 38, 1);
  rect(c, '#ad9466', x + 60, y + 1, 7, 9);
  rect(c, '#6a553a', x + 62, y + 3, 3, 5);
  for (let i = 0; i < 8; i++) rect(c, '#3c3a2b', x + i * 7 + 2, y + 6 + i % 3, 5, 1);
  for (let i = 0; i < 11; i++) {
    const dx = hash(i * 31) * 49 + 4;
    rect(c, '#ab9369', x + dx, y + 2 + i % 3, 3 + i % 4, 1);
    if (i % 3 === 0) rect(c, '#a5ae73', x + dx, y - 2 - i % 2, 4, 2);
  }
  rect(c, '#d0b58a', x + 61, y + 2, 5, 1);
  rect(c, '#967850', x + 64, y + 4, 2, 4);
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
  patches: readonly MushroomPatch[] = [];

  resize(width: number): void {
    this.width = width;
    this.patches = mushroomPatches(width);
    this.art = Array.from({ length: CHAPTERS.length }, (_, scene) => this.build(scene));
  }

  trees(scene: number): readonly Pine[] {
    return this.art[scene]?.hits ?? [];
  }

  private layer(paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const { canvas, ctx } = memoryCanvas(this.width, DESIGN_HEIGHT);
    paint(ctx);
    return canvas;
  }

  private build(scene: number): SceneArt {
    const w = this.width;
    const distant: Pine[] = [];
    const back = this.layer((c) => {
      for (let x = 0; x < w; x++) {
        const crest = Math.round(122 + noise(x * 0.019 + scene * 3) * 14);
        rect(c, '#879e99', x, crest, 1, 78);
        if (dither(x, crest) < 0.65) rect(c, '#9bb3a8', x, crest, 1, 2);
      }
      for (let i = 0; i < Math.ceil(w / 23) + 2; i++) {
        const tall = 116 + Math.floor(hash(i + scene * 17) * 67);
        const x = i * 23 - 3;
        const sprite = pineSprite(tall, 38, 'distant');
        c.drawImage(sprite, x - 19, 175 - tall);
        distant.push({ x, base: 175, height: tall, width: 38 });
      }
      this.paintHaze(c);
      for (let i = 0; i < Math.ceil(w / 43) + 2; i++) {
        const x = i * 43 - 22;
        if (x > w * 0.31 && x < w * 0.69) continue;
        const tall = 156 + Math.floor(hash(i * 7 + scene * 11) * 61);
        const sprite = pineSprite(tall, 59, scene === HOLLOW_SCENE ? 'moonlit' : 'middle');
        c.drawImage(sprite, x - 29, 183 - tall);
        distant.unshift({ x, base: 183, height: tall, width: 59 });
      }
      paintFloor(c, w, scene);
      if (scene === STREAM_SCENE) this.paintStream(c);
    });
    const props = this.layer((c) => {
      if (scene === MISTY_SCENE) { log(c, w * 0.64, 226); mushrooms(c, w * 0.69, 229); }
      if (scene === STREAM_SCENE) {
        this.bridge(c);
        for (const y of STONE_ROWS) stone(c, stoneX(w, y), y, 10);
      }
      if (scene === MEADOW_SCENE) {
        log(c, w * 0.08, 226);
        stone(c, w * 0.8, 218, 17);
        mushrooms(c, w * 0.82, 219);
      }
      if (scene === HOLLOW_SCENE) this.hollow(c);
      if (scene === TRAIL_SCENE) this.hut(c);
      for (let i = 0; i < 9; i++) {
        const x = hash(i * 17 + scene * 3) * w;
        const y = 206 + hash(i * 29) * 53;
        if (scene === STREAM_SCENE && Math.abs(x - streamX(w, y)) < streamHalfWidth(y) + 7) continue;
        if (i % 3 === 0) mushrooms(c, x, y);
        else stone(c, x, y, 3 + i % 4);
      }
    });
    const near = nearPines(w, scene);
    const oldPine: Pine[] = scene === HOLLOW_SCENE ? [{ x: hollowX(w), base: 217, height: 230, width: 42 }] : [];
    return { back, props, hits: [...near, ...oldPine, ...distant],
      trees: near.map((pine) => ({ pine, sprite: pineSprite(pine.height, pine.width, scene === HOLLOW_SCENE ? 'moonlit' : 'near') })) };
  }

  private paintHaze(c: CanvasRenderingContext2D): void {
    // Distant haze feathers into the canopy through the clock band.
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(165,190,181,0.18)';
    for (let x = 0; x < this.width; x++) {
      const edge = Math.round(noise(x * 0.014) * 18);
      for (let y = 76 + edge; y < 164; y++) {
        const coverage = Math.min(1, (y - 76 - edge) / 25, (164 - y) / 22);
        if (dither(x, y) < coverage) c.fillRect(x, y, 1, 1);
      }
    }
    c.restore();
  }

  private paintStream(c: CanvasRenderingContext2D): void {
    for (let y = GROUND_ROW; y < DESIGN_HEIGHT; y++) {
      const cx = streamX(this.width, y);
      const half = streamHalfWidth(y);
      rect(c, '#345449', cx - half - 4, y, half * 2 + 8, 1);
      rect(c, '#5b8983', cx - half, y, half * 2, 1);
      rect(c, '#779f92', cx - half + 2, y, 3 + Math.round(noise(y * 0.15) * 3), 1);
      rect(c, '#4c7773', cx - half * 0.38, y, half * 0.71 + noise(y * 0.12) * 7, 1);
      for (let j = 0; j < 3; j++) {
        const length = 2 + j;
        const x = cx - half + hash(y * 5 + j * 11) * (half * 2 - length);
        rect(c, j === 0 ? '#8f9e84' : '#48756e', x, y, length, 1);
      }
    }
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
    const x = Math.round(hollowX(this.width));
    for (let y = 0; y < 213; y++) {
      const root = Math.round(Math.max(0, (y - 179) / 5));
      const seam = Math.round(noise(y * 0.031) * 3);
      rect(c, '#3d544d', x - 21 - root + seam, y, 41 + root * 2, 1);
      rect(c, '#59675a', x - 20 - root + seam, y, 25 + root, 1);
      rect(c, '#8da691', x - 21 - root + seam, y, y % 11 < 7 ? 2 : 1, 1);
    }
    for (let i = 0; i < 38; i++) {
      const y = Math.round(hash(i * 41 + 3) * 198);
      const dx = Math.round(hash(i * 17 + 6) * 34) - 16;
      const length = 5 + Math.floor(hash(i * 29 + 11) * 19);
      rect(c, i % 3 ? '#485b50' : '#758372', x + dx, y, 1, length);
      if (i % 2) rect(c, '#697869', x + dx + 1, y + 3, 1, length - 4);
    }
    for (let i = 0; i < 20; i++) {
      const dx = x - 18 + hash(i * 7) * 34;
      const y = 179 + hash(i * 17) * 24;
      rect(c, '#52735a', dx, y, 4, 4);
      rect(c, '#89a77b', dx, y, 3, 1);
    }
    for (let i = 0; i < 5; i++) {
      const dx = x - 32 + i * 12;
      rect(c, '#4c5c4d', dx, 205, 9, 12 - Math.abs(i - 2) * 2);
      rect(c, '#75947b', dx, 205, 8, 1);
    }
    for (let row = 0; row < 34; row++) {
      const y = HOLLOW_Y - 30 + row;
      const half = 13 - Math.max(0, Math.floor((8 - row) * 0.85), Math.floor((row - 28) * 0.5));
      rect(c, '#9e8b6e', x - half - 2, y, half * 2 + 4, 1);
      rect(c, '#6e5847', x - half, y, half * 2 + 1, 1);
      rect(c, '#333d37', x - half + 2, y, half * 2 - 3, 1);
      if (row % 3 !== 0) rect(c, '#b8a282', x - half - 1, y, 1, 1);
      if (row > 10 && row % 2 === 0) rect(c, '#504739', x - half + 2, y, 2, 1);
    }
    rect(c, '#baa27c', x - 13, HOLLOW_Y + 3, 29, 2);
    rect(c, '#6b6650', x - 11, HOLLOW_Y + 5, 24, 2);
    rect(c, '#536151', x - 51, 67, 37, 7);
    rect(c, '#7d9d82', x - 49, 65, 31, 2);
    log(c, this.width * 0.08, 242);
    for (const patch of this.patches) luminousMushrooms(c, patch.x, patch.y);
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
  }

  drawBack(c: CanvasRenderingContext2D, scene: number): void {
    c.drawImage(this.art[scene].back, 0, 0);
  }

  drawProps(c: CanvasRenderingContext2D, scene: number, time: number): void {
    if (scene === STREAM_SCENE) {
      c.fillStyle = '#bcd4c3';
      for (let i = 0; i < STREAM_GLINTS; i++) {
        const age = ((i * 17 + time * 3) % STREAM_GLINT_RUN) / STREAM_GLINT_RUN;
        const y = 187 + Math.round(age * STREAM_GLINT_RUN);
        const half = streamHalfWidth(y);
        const length = 2 + i % 5;
        const x = streamX(this.width, y) - half + 2 + hash(i * 17) * (2 * half - 4 - length);
        if (x < -6 || x >= this.width) continue;
        c.globalAlpha = Math.sin(age * Math.PI) * (0.29 + (i % 3) * 0.12);
        c.fillRect(Math.round(x), y, length, 1);
      }
      c.globalAlpha = 1;
    }
    c.drawImage(this.art[scene].props, 0, 0);
  }

  drawPines(c: CanvasRenderingContext2D, scene: number, time: number): void {
    const art = this.art[scene];
    for (const { pine, sprite } of art.trees) {
      const top = pine.base - pine.height;
      const left = Math.round(pine.x - pine.width / 2);
      const bend = breeze(time, pine.x) * PINE_BEND;
      let first = Math.max(0, -top);
      let shift = Math.round(bend * (1 - first / pine.height));
      // Adjacent rows with the same snapped shift can be drawn together.
      for (let row = first + PINE_STRIP; row < pine.height; row += PINE_STRIP) {
        const nextShift = Math.round(bend * (1 - row / pine.height));
        if (nextShift === shift) continue;
        const height = row - first;
        c.drawImage(sprite, 0, first, pine.width, height, left + shift, top + first, pine.width, height);
        first = row;
        shift = nextShift;
      }
      const height = pine.height - first;
      c.drawImage(sprite, 0, first, pine.width, height, left + shift, top + first, pine.width, height);
    }
  }
}
