import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import { DESIGN_HEIGHT, layout } from './scenes';
import { line, oval, PALETTE, type GardenSprites } from './sprites';

const HEIGHT = DESIGN_HEIGHT;

export interface Scenery {
  layers: HTMLCanvasElement[];
  pondSteps: HTMLCanvasElement | null;
}

function rock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  oval(ctx, x + 3, y + 2, size + 6, size * 0.28, '#aaa68b');
  oval(ctx, x, y, size, size * 0.65, '#555e55');
  oval(ctx, x - size * 0.2, y - size * 0.2, size * 0.8, size * 0.48, '#7d8676');
  for (let i = 0; i < size * 3; i++) {
    const px = x + (hash(i + x) - 0.5) * size * 1.5;
    const py = y - size * 0.43 + hash(i + y) * size * 0.42;
    line(ctx, px, py, px + 2, py, i % 3 ? '#687564' : '#a6ad8c');
  }
  oval(ctx, x - size * 0.25, y - size * 0.48, size * 0.62, size * 0.15, '#657b49');
  line(ctx, x - size * 0.7, y - size * 0.45, x, y - size * 0.55, '#99a46c');
}

export function lantern(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  oval(ctx, x, y, 13, 3, '#5f695b');
  ctx.fillStyle = '#969b80';
  ctx.fillRect(Math.round(x - 3), y - 25, 6, 24);
  ctx.fillStyle = '#606c5b';
  ctx.fillRect(Math.round(x + 2), y - 25, 2, 24);
  ctx.fillStyle = '#b4b69b';
  ctx.fillRect(Math.round(x - 9), y - 32, 18, 12);
  ctx.fillStyle = '#414f46';
  ctx.fillRect(Math.round(x - 5), y - 29, 10, 7);
  for (let row = 0; row < 7; row++) {
    const half = 5 + row * 2;
    line(ctx, x - half, y - 40 + row, x + half, y - 40 + row, row % 2 ? '#778671' : '#a0ab8b');
  }
  oval(ctx, x, y - 42, 3, 3, '#b1b69a');
  line(ctx, x - 10, y - 31, x + 10, y - 31, '#d0cdb0');
}

function bridge(ctx: CanvasRenderingContext2D, x: number, y: number, span: number): void {
  for (let n = 0; n <= span; n++) {
    const rise = Math.sin(n / span * Math.PI) * 16;
    const py = y - rise;
    ctx.fillStyle = '#70503a';
    ctx.fillRect(Math.round(x + n), Math.round(py), 1, 8);
    ctx.fillStyle = n % 7 === 0 ? '#624632' : '#c09b6b';
    ctx.fillRect(Math.round(x + n), Math.round(py), 1, 2);
    line(ctx, x + n, py - 12, x + n, py - 10, '#a97c50');
    if (n % 17 === 0) {
      ctx.fillStyle = '#684832';
      ctx.fillRect(Math.round(x + n), Math.round(py - 14), 3, 20);
      line(ctx, x + n, py - 14, x + n + 3, py - 14, '#dbb580');
    }
  }
}

function house(ctx: CanvasRenderingContext2D, width: number, veranda: boolean): void {
  const left = veranda ? width * 0.60 : width * 0.66;
  const top = veranda ? 75 : 126;
  const span = veranda ? width * 0.42 : width * 0.26;
  const bottom = veranda ? 204 : 175;
  ctx.fillStyle = '#594c38';
  ctx.fillRect(Math.round(left), top, Math.ceil(span), bottom - top);
  ctx.fillStyle = '#b9b49a';
  ctx.fillRect(Math.round(left + 6), top + 12, Math.round(span - 13), bottom - top - 24);
  for (let x = left + 7; x < left + span - 6; x += 12) {
    line(ctx, x, top + 12, x, bottom - 12, '#827e63');
  }
  for (let y = top + 20; y < bottom - 12; y += 14) {
    line(ctx, left + 6, y, left + span - 6, y, '#928d70');
  }
  for (let i = 0; i < 3; i++) {
    const post = left + i * span / 2;
    ctx.fillStyle = '#554332';
    ctx.fillRect(Math.round(post), top, 5, bottom - top + 3);
    line(ctx, post, top, post, bottom, '#a18358');
  }
  for (let row = 0; row < 18; row++) {
    const overhang = row * 1.5;
    line(ctx, left - overhang, top - 18 + row, left + span + overhang, top - 18 + row,
      row % 4 === 0 ? '#7c8070' : '#444e46');
  }
  line(ctx, left - 27, top, left + span + 27, top, '#333e36');
  if (!veranda) return;
  ctx.fillStyle = '#8a6748';
  ctx.fillRect(Math.round(left - 16), bottom, Math.ceil(span + 30), 50);
  for (let y = bottom; y < 255; y += 7) {
    line(ctx, left - 16, y, left + span + 14, y, '#bb9163');
    line(ctx, left - 16, y + 1, left + span + 14, y + 1, '#634c38');
  }
  for (let x = left; x < width; x += 23) {
    line(ctx, x, bottom, x - 9, 255, '#78563e');
  }
}

/** All dense grain, sand contours and architecture are painted only on resize. */
export function buildScenery(scene: number, width: number, sprites: GardenSprites): Scenery {
  const layers: HTMLCanvasElement[] = [];
  const p = layout(scene, width);
  // Moon Viewing steps are painted over the floating plants.
  const pondSteps = scene === 4 ? memoryCanvas(width, HEIGHT) : null;
  for (let depth = 0; depth < 5; depth++) {
    const buffer = memoryCanvas(width, HEIGHT);
    const ctx = buffer.ctx;
    if (depth === 0) {
      for (let x = 0; x < width; x++) {
        const top = 119 + noise(x / 80 + scene * 7) * 20;
        ctx.fillStyle = '#8eaa96';
        ctx.fillRect(x, Math.round(top), 1, HEIGHT - top);
        const nearTop = 141 + noise(x / 36 + scene) * 11;
        ctx.fillStyle = '#728d75';
        ctx.fillRect(x, Math.round(nearTop), 1, HEIGHT - nearTop);
      }
    }
    if (depth === 1) {
      ctx.fillStyle = '#a9ac92';
      ctx.fillRect(0, 154, width, 30);
      line(ctx, 0, 153, width, 153, '#636f5a');
      line(ctx, 0, 157, width, 157, '#c6c3a6');
      for (let y = 162; y < 183; y += 9) {
        line(ctx, 0, y, width, y, '#929c82');
        for (let x = (y % 2) * 12; x < width; x += 28) line(ctx, x, y, x, y + 9, '#929c82');
      }
      if (scene !== 3) house(ctx, width, false);
    }
    if (depth === 2) {
      ctx.fillStyle = scene === 0 ? '#d4cfb4' : '#7e8b61';
      ctx.fillRect(0, 181, width, HEIGHT - 181);
      for (let i = 0; i < width * 3; i++) {
        const x = Math.floor(hash(i + 9) * width);
        const y = 183 + Math.floor(hash(i + 333) * 87);
        ctx.fillStyle = scene === 0 ? (i % 2 ? '#bbb99e' : '#e2dbc1') : (i % 2 ? '#6a7d51' : '#98a272');
        ctx.fillRect(x, y, i % 4 === 0 ? 3 : 1, 1);
      }
      if (scene === 0) {
        for (let row = 186; row < HEIGHT; row += 5) {
          for (let x = 0; x < width; x++) {
            const y = row + Math.round(Math.sin(x / 33 + row / 24) * 2);
            ctx.fillStyle = '#b4b39b'; ctx.fillRect(x, y, 1, 1);
            ctx.fillStyle = '#e8dfc4'; ctx.fillRect(x, y + 1, 1, 1);
          }
        }
        for (let ring = 1; ring <= 7; ring++) {
          const rx = 26 + ring * 5;
          const ry = 9 + ring * 2;
          for (let n = 0; n < 180; n++) {
            const a = n / 180 * Math.PI * 2;
            ctx.fillStyle = '#b0af95';
            ctx.fillRect(Math.round(width * 0.62 + Math.cos(a) * rx), Math.round(213 + Math.sin(a) * ry), 1, 1);
          }
        }
      }
      if (scene === 1 || scene === 4) {
        oval(ctx, p.pond.x, p.pond.y, p.pond.rx + 6, p.pond.ry + 4, '#a9aa8b');
        oval(ctx, p.pond.x, p.pond.y, p.pond.rx + 3, p.pond.ry + 2, '#515f52');
        oval(ctx, p.pond.x, p.pond.y, p.pond.rx, p.pond.ry, '#527d73');
        for (let i = 0; i < 16; i++) {
          const x = p.pond.x + Math.cos(i * 0.71) * p.pond.rx;
          const y = p.pond.y + Math.sin(i * 0.71) * p.pond.ry;
          rock(ctx, x, y, 4 + hash(i) * 4);
        }
      }
      if (scene === 2 || scene === 3 || scene === 4) {
        const steps = pondSteps?.ctx ?? ctx;
        for (let i = 0; i < 9; i++) {
          const x = width * 0.24 + Math.sin(i * 0.5) * 22;
          oval(steps, x, 181 + i * 10, 10 + i, 3 + i * 0.4, '#596454');
          line(steps, x - 6 - i, 179 + i * 10, x + 6 + i, 179 + i * 10, '#b2b29a');
        }
      }
    }
    if (depth === 3) {
      if (scene === 0) {
        rock(ctx, width * 0.62, 213, 23);
        rock(ctx, width * 0.70, 221, 10);
        rock(ctx, width * 0.35, 194, 11);
        rock(ctx, width * 0.12, 244, 16);
      }
      if (scene === 1) {
        bridge(ctx, width * 0.37, 177, width * 0.32);
        const statue = width * 0.77;
        rock(ctx, statue, 169, 8);
        ctx.drawImage(sprites.heron, Math.round(statue - 7), 140, 12, 25);
      }
      if (scene !== 3) lantern(ctx, p.lantern.x, p.lantern.y);
      if (scene === 4) lantern(ctx, width * 0.12, 196);
      if (scene === 2) {
        oval(ctx, p.feature.x, p.feature.y + 13, 28, 11, '#a3a78b');
        oval(ctx, p.feature.x, p.feature.y + 11, 22, 7, '#3e6155');
        ctx.fillStyle = '#596b47';
        ctx.fillRect(Math.round(p.feature.x - 27), p.feature.y - 34, 6, 43);
        line(ctx, p.feature.x - 26, p.feature.y - 34, p.feature.x - 8, p.feature.y - 34, '#9aab70');
        ctx.fillStyle = '#8f9f64'; ctx.fillRect(Math.round(p.feature.x + 1), p.feature.y - 8, 5, 20);
        rock(ctx, p.feature.x + 21, p.feature.y + 8, 8);
      }
      if (scene === 3) {
        house(ctx, width, true);
        const tx = width * 0.88;
        ctx.fillStyle = '#514331'; ctx.fillRect(Math.round(tx - 20), 220, 40, 4);
        ctx.fillRect(Math.round(tx - 17), 224, 3, 9); ctx.fillRect(Math.round(tx + 14), 224, 3, 9);
        oval(ctx, tx, 216, 6, 4, '#6c8064');
        line(ctx, tx + 4, 214, tx + 10, 212, '#b4bd8d');
        line(ctx, tx - 4, 213, tx - 9, 211, '#6c8064');
        for (let i = -1; i <= 1; i += 2) {
          oval(ctx, tx + i * 13, 218, 4, 2, '#ddd1a9');
          line(ctx, tx + i * 13 - 2, 216, tx + i * 13 + 2, 216, '#74806a');
        }
      }
    }
    if (depth === 4) {
      for (let i = 0; i < 15; i++) {
        const x = hash(i + 323) * width;
        if (x > width * 0.38 && x < width * 0.63) continue;
        oval(ctx, x, 265 + hash(i) * 5, 8 + hash(i + 3) * 8, 3, PALETTE.m);
      }
    }
    layers.push(buffer.canvas);
  }
  return { layers, pondSteps: pondSteps?.canvas ?? null };
}
