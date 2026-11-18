import { memoryCanvas } from '../../../render/pixel-stage';
import type { SpriteBox } from './creature-sprites';

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CabinSpec extends SpriteBox {
  chimneyX: number;
  chimneyY: number;
  windows: readonly WindowRect[];
  lanternX: number | null;
  lanternY: number | null;
}

export interface VillageBuilding extends SpriteBox {
  windows: readonly WindowRect[];
}

/** Draws notched horizontal logs inside a rectangular wall area. */
function drawLogWall(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  shadeRight: number,
): void {
  const rows = Math.floor(h / 4);
  for (let r = 0; r < rows; r++) {
    const ly = y0 + r * 4;
    ctx.fillStyle = '#8b5a3a';
    ctx.fillRect(x0, ly, w, 1);
    ctx.fillStyle = '#6e4329';
    ctx.fillRect(x0, ly + 1, w, 2);
    ctx.fillStyle = '#472a18';
    ctx.fillRect(x0, ly + 3, w, 1);
    if (shadeRight > 0) {
      ctx.fillStyle = 'rgba(20,12,8,0.28)';
      ctx.fillRect(x0 + w - shadeRight, ly, shadeRight, 4);
    }
    ctx.fillStyle = '#a6744e';
    ctx.fillRect(x0 - 1, ly + 1, 2, 2);
    ctx.fillRect(x0 + w - 1, ly + 1, 2, 2);
  }
}

/** Draws a dark wood-framed multi-pane window with snowy sill. */
function drawWindowBase(ctx: CanvasRenderingContext2D, win: WindowRect): void {
  ctx.fillStyle = '#2d1c12';
  ctx.fillRect(win.x - 1, win.y - 1, win.w + 2, win.h + 2);
  ctx.fillStyle = '#28364a';
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = '#435870';
  ctx.fillRect(win.x + 1, win.y + 1, win.w - 2, win.h - 2);
  ctx.fillStyle = '#edf4fc';
  ctx.fillRect(win.x - 1, win.y + win.h + 1, win.w + 2, 2);
}

/** Large cosy log cabin with porch, stone chimney, gable roof, and snow-laden eaves. */
export function buildCabinLarge(): CabinSpec {
  const w = 116;
  const h = 76;
  const { canvas, ctx } = memoryCanvas(w, h);

  const chX = 24;
  const chY = 3;
  ctx.fillStyle = '#7c828c';
  ctx.fillRect(chX, chY, 10, 26);
  ctx.fillStyle = '#5e646e';
  ctx.fillRect(chX + 7, chY, 3, 26);
  for (let sy = chY + 2; sy < chY + 24; sy += 3) {
    ctx.fillStyle = '#464b54';
    ctx.fillRect(chX + ((sy % 2) * 3), sy, 4, 1);
  }
  ctx.fillStyle = '#4a4f58';
  ctx.fillRect(chX - 1, chY, 12, 2);
  ctx.fillStyle = '#edf5fc';
  ctx.fillRect(chX - 1, chY - 1, 12, 2);

  const ridgeY = 12;
  const roofBottom = 38;
  for (let ry = 0; ry <= roofBottom - ridgeY; ry++) {
    const y = ridgeY + ry;
    const x0 = Math.max(4, 38 - Math.round(ry * 1.35));
    const x1 = Math.min(w - 6, 44 + Math.round(ry * 2.5));
    ctx.fillStyle = '#3a2b28';
    ctx.fillRect(x0, y, x1 - x0, 1);
    if (ry < 22) {
      ctx.fillStyle = '#eef5fc';
      ctx.fillRect(x0 + 1, y, Math.max(1, x1 - x0 - 3), 1);
      if (ry % 4 === 3) {
        ctx.fillStyle = '#cbdcf0';
        ctx.fillRect(x0 + 2, y, Math.max(1, x1 - x0 - 6), 1);
      }
    } else if (ry < 26) {
      ctx.fillStyle = '#cbdcf0';
      ctx.fillRect(x0, y, x1 - x0, 1);
    }
  }

  ctx.fillStyle = '#f2f7fd';
  ctx.fillRect(4, roofBottom - 2, w - 10, 3);
  ctx.fillStyle = '#b4cde6';
  for (let ix = 8; ix < w - 10; ix += 7) {
    ctx.fillRect(ix, roofBottom + 1, 1, (ix % 3) + 2);
  }

  drawLogWall(ctx, 12, 39, 64, 33, 4);
  for (let gy = 0; gy < 16; gy++) {
    const span = Math.round(gy * 2.1);
    ctx.fillStyle = gy % 4 === 3 ? '#472a18' : '#6e4329';
    ctx.fillRect(40 - span, 22 + gy, span * 2, 1);
  }

  ctx.fillStyle = '#4a3020';
  ctx.fillRect(76, 40, 32, 3);
  ctx.fillStyle = '#eef5fc';
  ctx.fillRect(75, 37, 34, 3);
  ctx.fillStyle = '#633d27';
  ctx.fillRect(103, 43, 3, 28);
  ctx.fillRect(76, 43, 3, 28);
  ctx.fillStyle = '#7d5034';
  ctx.fillRect(79, 59, 24, 2);
  for (let rx = 81; rx < 103; rx += 4) ctx.fillRect(rx, 61, 1, 8);
  ctx.fillStyle = '#573621';
  ctx.fillRect(76, 69, 32, 4);
  ctx.fillStyle = '#734a2e';
  ctx.fillRect(82, 72, 18, 2);
  ctx.fillRect(84, 74, 18, 2);
  ctx.fillStyle = '#e4eff9';
  ctx.fillRect(83, 71, 16, 1);

  ctx.fillStyle = '#4d2c19';
  ctx.fillRect(83, 48, 11, 21);
  ctx.fillStyle = '#693d24';
  ctx.fillRect(84, 49, 9, 19);
  ctx.fillStyle = '#2d5c40';
  ctx.fillRect(87, 52, 3, 3);
  ctx.fillStyle = '#c93c36';
  ctx.fillRect(88, 52, 1, 1);
  ctx.fillStyle = '#deb452';
  ctx.fillRect(91, 58, 1, 2);

  const windows: WindowRect[] = [
    { x: 22, y: 47, w: 12, h: 11 },
    { x: 50, y: 47, w: 12, h: 11 },
  ];
  for (const win of windows) drawWindowBase(ctx, win);

  ctx.fillStyle = '#262b34';
  ctx.fillRect(98, 43, 4, 1);

  ctx.fillStyle = '#e8f1fa';
  ctx.fillRect(8, 71, 68, 4);
  ctx.fillStyle = '#c4d8ee';
  ctx.fillRect(10, 74, 66, 2);

  return {
    canvas,
    w,
    h,
    chimneyX: chX + 5,
    chimneyY: chY - 1,
    windows,
    lanternX: 100,
    lanternY: 48,
  };
}

/** Close-up hearth wall & tall chimney for Night Chimney scene. */
export function buildCabinClose(): CabinSpec {
  const w = 128;
  const h = 86;
  const { canvas, ctx } = memoryCanvas(w, h);

  const chX = 28;
  const chY = 2;
  ctx.fillStyle = '#68707c';
  ctx.fillRect(chX, chY, 15, 40);
  ctx.fillStyle = '#4e545e';
  ctx.fillRect(chX + 11, chY, 4, 40);
  for (let sy = chY + 3; sy < 38; sy += 4) {
    ctx.fillStyle = '#3b404a';
    ctx.fillRect(chX + ((sy % 3) * 3), sy, 5, 1);
  }
  ctx.fillStyle = '#3e434d';
  ctx.fillRect(chX - 2, chY, 19, 3);
  ctx.fillStyle = '#edf5fc';
  ctx.fillRect(chX - 2, chY - 1, 19, 2);

  for (let ry = 0; ry < 26; ry++) {
    const y = 16 + ry;
    const x1 = 42 + Math.round(ry * 2.9);
    ctx.fillStyle = '#362724';
    ctx.fillRect(0, y, x1, 1);
    if (ry < 22) {
      ctx.fillStyle = ry % 5 === 4 ? '#c4d7ec' : '#edf5fc';
      ctx.fillRect(0, y, Math.max(1, x1 - 3), 1);
    }
  }
  ctx.fillStyle = '#f2f7fd';
  ctx.fillRect(0, 40, 120, 3);
  ctx.fillStyle = '#aac4e0';
  for (let ix = 6; ix < 118; ix += 9) {
    ctx.fillRect(ix, 43, 1, (ix % 3) + 2);
  }

  drawLogWall(ctx, 4, 42, 108, 40, 8);

  const windows: WindowRect[] = [{ x: 48, y: 50, w: 26, h: 17 }];
  drawWindowBase(ctx, windows[0]);

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = '#5c3c24';
      ctx.fillRect(10 + c * 5, 72 - r * 4, 4, 3);
      ctx.fillStyle = '#d4aa72';
      ctx.fillRect(11 + c * 5, 73 - r * 4, 2, 2);
    }
  }

  ctx.fillStyle = '#e8f1fa';
  ctx.fillRect(2, 81, 114, 5);

  return {
    canvas,
    w,
    h,
    chimneyX: chX + 7,
    chimneyY: chY - 1,
    windows,
    lanternX: null,
    lanternY: null,
  };
}

/** Small distant cabin for Aurora Night panorama. */
export function buildCabinSmall(): CabinSpec {
  const w = 48;
  const h = 34;
  const { canvas, ctx } = memoryCanvas(w, h);

  ctx.fillStyle = '#6c727c';
  ctx.fillRect(32, 2, 5, 12);
  ctx.fillStyle = '#eef5fc';
  ctx.fillRect(31, 1, 7, 2);

  for (let ry = 0; ry < 11; ry++) {
    const x0 = 14 - ry;
    const x1 = 33 + ry;
    ctx.fillStyle = ry < 9 ? '#eaf3fc' : '#42302a';
    ctx.fillRect(x0, 7 + ry, x1 - x0, 1);
  }

  drawLogWall(ctx, 7, 18, 34, 14, 4);
  ctx.fillStyle = '#472a18';
  ctx.fillRect(22, 23, 5, 9);

  const windows: WindowRect[] = [
    { x: 11, y: 22, w: 6, h: 5 },
    { x: 31, y: 22, w: 6, h: 5 },
  ];
  for (const win of windows) drawWindowBase(ctx, win);

  ctx.fillStyle = '#e2eef8';
  ctx.fillRect(5, 31, 38, 3);

  return {
    canvas,
    w,
    h,
    chimneyX: 34,
    chimneyY: 1,
    windows,
    lanternX: null,
    lanternY: null,
  };
}

export function buildVillageChurch(): VillageBuilding {
  const w = 22;
  const h = 36;
  const { canvas, ctx } = memoryCanvas(w, h);
  for (let y = 0; y < 16; y++) {
    const half = Math.floor((y / 16) * 4);
    ctx.fillStyle = y < 4 ? '#cad9ea' : '#4a5568';
    ctx.fillRect(11 - half, y, half * 2 + 1, 1);
  }
  ctx.fillStyle = '#e2edf8';
  ctx.fillRect(11, 0, 1, 2);
  ctx.fillStyle = '#7e8694';
  ctx.fillRect(7, 16, 9, 20);
  ctx.fillStyle = '#626a78';
  ctx.fillRect(14, 16, 2, 20);
  ctx.fillStyle = '#8b92a0';
  ctx.fillRect(1, 24, 19, 12);
  ctx.fillStyle = '#eaf3fc';
  ctx.fillRect(1, 22, 19, 2);

  const windows: WindowRect[] = [
    { x: 10, y: 19, w: 3, h: 4 },
    { x: 4, y: 28, w: 3, h: 4 },
    { x: 15, y: 28, w: 3, h: 4 },
  ];
  for (const win of windows) {
    ctx.fillStyle = '#2a3342';
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  return { canvas, w, h, windows };
}

export function buildVillageHouse(wallColor: string): VillageBuilding {
  const w = 18;
  const h = 15;
  const { canvas, ctx } = memoryCanvas(w, h);
  for (let ry = 0; ry < 6; ry++) {
    ctx.fillStyle = ry < 4 ? '#eaf3fc' : '#4d3b38';
    ctx.fillRect(6 - ry, ry, 6 + ry * 2, 1);
  }
  ctx.fillStyle = wallColor;
  ctx.fillRect(2, 6, 14, 9);
  const windows: WindowRect[] = [
    { x: 4, y: 9, w: 3, h: 3 },
    { x: 11, y: 9, w: 3, h: 3 },
  ];
  for (const win of windows) {
    ctx.fillStyle = '#2a3342';
    ctx.fillRect(win.x, win.y, win.w, win.h);
  }
  return { canvas, w, h, windows };
}
