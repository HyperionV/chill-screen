import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import { DESIGN_HEIGHT, SCENES, WATERLINE } from './scenes';

const RIDGE_STEP = 13;
const SNOWLINE = 0.34;
const WATER_EDGE = 2;

interface Palette {
  body: string;
  face: string;
  cleft: string;
  ridge: string;
  snow: string;
}

const DAY_RIDGES: readonly Palette[] = [
  { body: '#95adb2', face: '#a8bdc1', cleft: '#889fa9', ridge: '#bfd1d1', snow: '#dce8e2' },
  { body: '#829ea7', face: '#8ea9ae', cleft: '#77939e', ridge: '#a0b6b9', snow: '#c9d8d9' },
  { body: '#708f99', face: '#7d9ba4', cleft: '#64848e', ridge: '#91abb2', snow: '#bacdd0' },
];
const NIGHT_RIDGES: readonly Palette[] = [
  { body: '#394864', face: '#465772', cleft: '#35435e', ridge: '#586884', snow: '#748297' },
  { body: '#34465c', face: '#40556b', cleft: '#2e3e54', ridge: '#4b6078', snow: '#5f738b' },
  { body: '#293b50', face: '#33485e', cleft: '#26374c', ridge: '#415870', snow: '#526a81' },
];

interface TerrainSlice {
  top: number;
  day: HTMLCanvasElement;
  night: HTMLCanvasElement;
}

interface TerrainScene {
  ridge: Int16Array;
  layers: TerrainSlice[];
}

function ridgeHeights(w: number, h: number, peak: number, scene: number, depth: number): Int16Array {
  const unit = h / DESIGN_HEIGHT;
  const columns = new Int16Array(w);
  for (let x = 0; x < w; x++) {
    const u = x / w;
    const left = Math.max(0, 1 - Math.abs(u - 0.17 - scene * 0.014) * 3.7);
    const right = Math.max(0, 1 - Math.abs(u - 0.76) * 4.5);
    const center = Math.max(0, 1 - Math.abs(u - 0.48) * 5.3) * 0.55;
    const brokenRock = (noise(x / (13 * unit)) - 0.5) * 5 + noise(x * 0.15) * 2;
    const base = h * (0.49 - Math.max(left, right, center) * (0.17 + peak));
    const terrace = depth * (RIDGE_STEP + noise(x * 0.02 + depth * 17) * 5);
    columns[x] = Math.round(base + (terrace - brokenRock) * unit);
  }
  return columns;
}

function paintRidge(columns: Int16Array, h: number, top: number, palette: Palette, depth: number): HTMLCanvasElement {
  const unit = h / DESIGN_HEIGHT;
  const horizon = Math.round(h * WATERLINE);
  const { canvas, ctx } = memoryCanvas(columns.length, Math.max(1, horizon - top));
  for (let x = 0; x < columns.length; x++) {
    const y = columns[x];
    if (y >= horizon) continue;
    const seam = noise(x * 0.05 + depth * 21);
    const flank = y < columns[Math.min(columns.length - 1, x + 4)] ? palette.face : palette.body;
    ctx.fillStyle = flank;
    ctx.fillRect(x, y - top, 1, horizon - y);
    if (seam > 0.58) {
      const cut = y + Math.round((4 + seam * 12) * unit);
      ctx.fillStyle = palette.cleft;
      ctx.fillRect(x, cut - top, 1, Math.max(0, Math.min(horizon - cut, Math.round(seam * 19 * unit))));
    }
    if (depth !== 0 || y >= h * SNOWLINE) continue;
    const snow = Math.min((h * SNOWLINE - y) * 0.55, (3 + noise(x * 0.11) * 8) * unit);
    ctx.fillStyle = palette.snow;
    ctx.fillRect(x, y - top, 1, Math.round(snow));
    if (hash(x + 141) < 0.65) {
      ctx.fillStyle = palette.ridge;
      ctx.fillRect(x, y - top + Math.round(snow), 1, 1);
    }
  }
  return canvas;
}

function paintTreeline(w: number, height: number, unit: number, night: boolean): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, height);
  const floor = height - WATER_EDGE;
  ctx.fillStyle = night ? '#304b61' : '#70978c';
  for (let x = 0; x < canvas.width; x++) {
    const y = Math.round(floor - (7 + noise(x * 0.045) * 8 + hash(x) * 3) * unit);
    ctx.fillRect(x, y, 1, height - y);
  }
  for (let x = 0; x < canvas.width; x += Math.max(2, Math.round(3 * unit))) {
    const ht = Math.max(2, Math.round((4 + noise(x * 0.039 + 9) * 7 + hash(x + 821) * 5) * unit));
    ctx.fillStyle = night ? '#263f4f' : '#527668';
    for (let y = 0; y < ht; y++) {
      const half = Math.floor(y * 0.23);
      ctx.fillRect(x - half, floor - ht + y, half * 2 + 1, 1);
    }
  }
  ctx.fillStyle = night ? '#3e5767' : '#829582';
  ctx.fillRect(0, floor, canvas.width, WATER_EDGE);
  ctx.fillStyle = night ? '#4c6573' : '#a0ae95';
  for (let x = 0; x < canvas.width; x += 4) if (hash(x + 21) > 0.45) ctx.fillRect(x, floor, 2, 1);
  return canvas;
}

function drawSlice(ctx: CanvasRenderingContext2D, slice: TerrainSlice, day: number): void {
  if (day < 1) ctx.drawImage(slice.night, 0, slice.top);
  if (day > 0) {
    ctx.globalAlpha = day;
    ctx.drawImage(slice.day, 0, slice.top);
    ctx.globalAlpha = 1;
  }
}

export class LakeTerrain {
  private scenes: TerrainScene[] = [];
  private forest: TerrainSlice | null = null;

  resize(w: number, h: number): void {
    const unit = h / DESIGN_HEIGHT;
    this.scenes = SCENES.map(({ peak }, scene) => {
      const ridge = ridgeHeights(w, h, peak, scene, 0);
      const layers = DAY_RIDGES.map((palette, depth) => {
        const columns = depth === 0 ? ridge : ridgeHeights(w, h, peak, scene, depth);
        let top = columns[0];
        for (const y of columns) top = Math.min(top, y);
        return { top, day: paintRidge(columns, h, top, palette, depth), night: paintRidge(columns, h, top, NIGHT_RIDGES[depth], depth) };
      });
      return { ridge, layers };
    });
    const height = Math.ceil(22 * unit) + WATER_EDGE;
    this.forest = {
      top: Math.round(h * WATERLINE) - height,
      day: paintTreeline(w, height, unit, false),
      night: paintTreeline(w, height, unit, true),
    };
  }

  draw(ctx: CanvasRenderingContext2D, scene: number, day: number): void {
    const { layers } = this.scenes[scene];
    for (const layer of layers) drawSlice(ctx, layer, day);
    if (this.forest) drawSlice(ctx, this.forest, day);
  }

  ridgeAt(scene: number, x: number): number {
    const { ridge } = this.scenes[scene];
    const column = Math.round(x);
    return ridge[Math.max(0, Math.min(ridge.length - 1, column))];
  }
}
