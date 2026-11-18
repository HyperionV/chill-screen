import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { DESIGN_ROWS, SCENE_SPACING, WORLD_W, deckTopAt, rearCapAt, wrapCoord, wrapDelta } from './scenes';

const TERRACE_TOP = rearCapAt(0);
const REAR_FLASHING_DEPTH = 3;
const DECK_TOP = deckTopAt(0) + REAR_FLASHING_DEPTH;
const FRONT_CAP = 245;
const BRICK_START = 251;
const PAVER_COURSES = [
  { end: 213, color: '#4a505e' },
  { end: 221, color: '#505664' },
  { end: 231, color: '#555b69' },
  { end: FRONT_CAP, color: '#5a606d' },
];
const PAVER_SPACING = SCENE_SPACING / 14;
const PAVER_SPREAD = 0.13;
const QUIET_CENTER = 66;
const REAR_BRICKS = ['#724b47', '#79524c', '#815750', '#6f4746'];
const FRONT_BRICKS = ['#54383c', '#694743', '#5f3b3e', '#734c46'];

/** Blits the visible part of a repeating design-pixel layer, including across the route seam. */
export function drawRoofStrip(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  top: number,
  camX: number,
  width: number,
  unit: number,
): void {
  const y = Math.round(top * unit);
  const h = Math.round((top + art.height) * unit) - y;
  let sourceX = wrapCoord(Math.round(camX - width / 2), art.width);
  for (let x = 0; x < width; sourceX = 0) {
    const span = Math.min(width - x, art.width - sourceX);
    const left = Math.round(x * unit);
    const right = Math.round((x + span) * unit);
    if (right > left && h > 0) {
      ctx.drawImage(art, sourceX, 0, span, art.height, left, y, right - left, h);
    }
    x += span;
  }
}

function paintBrick(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  height: number,
  palette: readonly string[],
  seed: number,
): void {
  const rnd = seededRandom(seed);
  const courseH = 4;
  const brickW = 10;
  ctx.fillStyle = '#392c36';
  ctx.fillRect(0, top, width, height);
  for (let row = 0; row * courseH < height; row++) {
    const y = top + row * courseH;
    const h = Math.min(courseH - 1, top + height - y);
    for (let seam = -(row % 2) * (brickW / 2); seam < width; seam += brickW) {
      const x = Math.max(0, seam);
      const w = Math.min(width, seam + brickW - 1) - x;
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.fillRect(x, y, w, h);
      if (rnd() < 0.43) {
        ctx.fillStyle = '#b5917b38';
        ctx.fillRect(x, y, Math.max(1, w - 2), 1);
      }
    }
  }
}

/** A single baked strip keeps pavers, wall transitions and coping aligned during the glide. */
export class Terrace {
  private readonly art = memoryCanvas(WORLD_W, DESIGN_ROWS - TERRACE_TOP);

  constructor() {
    const { ctx } = this.art;
    ctx.translate(0, -TERRACE_TOP);
    this.paintDeck(ctx);
    this.paintRearWall(ctx);
    this.paintFrontWall(ctx);
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, width: number, unit: number): void {
    drawRoofStrip(ctx, this.art.canvas, TERRACE_TOP, camX, width, unit);
  }

  private paintDeck(ctx: CanvasRenderingContext2D): void {
    const rnd = seededRandom(8123);
    let row = DECK_TOP;
    for (const course of PAVER_COURSES) {
      ctx.fillStyle = course.color;
      ctx.fillRect(0, row, WORLD_W, course.end - row);
      row = course.end;
    }

    // The joints fan away from each scene centre as the slabs approach the viewer.
    for (let y = DECK_TOP; y < FRONT_CAP; y++) {
      const depth = (y - DECK_TOP) / (FRONT_CAP - DECK_TOP);
      for (let seam = 0; seam < WORLD_W; seam += PAVER_SPACING) {
        const fromCenter = wrapDelta(seam, 0, SCENE_SPACING);
        const angle = fromCenter * (1 - Math.abs(fromCenter) / (SCENE_SPACING / 2));
        const x = wrapCoord(seam + Math.round(angle * depth * PAVER_SPREAD), WORLD_W);
        ctx.fillStyle = '#464c59';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#606675';
        ctx.fillRect(wrapCoord(x + 1, WORLD_W), y, 1, 1);
      }
    }
    for (const course of PAVER_COURSES) {
      ctx.fillStyle = '#424855';
      ctx.fillRect(0, course.end - 1, WORLD_W, 1);
    }

    // Gravel, repairs and moss sit outside the clock and radio's quiet centre.
    for (let x = 0; x < WORLD_W; x += 4) {
      const sceneX = wrapCoord(x + SCENE_SPACING / 2, SCENE_SPACING) - SCENE_SPACING / 2;
      if (Math.abs(sceneX) < QUIET_CENTER) continue;
      const y = DECK_TOP + Math.floor(rnd() * (FRONT_CAP - DECK_TOP));
      ctx.fillStyle = rnd() < 0.45 ? '#6b6c78' : '#454a56';
      ctx.fillRect(x + Math.floor(rnd() * 3), y, rnd() < 0.22 ? 2 : 1, 1);
      if (rnd() < 0.06) {
        ctx.fillStyle = '#484d58';
        ctx.fillRect(x + 1, y, 4, 1);
        ctx.fillRect(x + 3, y + 1, 2, 1);
      }
      if (rnd() < 0.13) {
        ctx.fillStyle = '#414d49';
        ctx.fillRect(x, FRONT_CAP - 3, 1 + Math.floor(rnd() * 5), 1);
      }
    }
  }

  private paintRearWall(ctx: CanvasRenderingContext2D): void {
    const capH = 4;
    const wall = memoryCanvas(WORLD_W, DECK_TOP - TERRACE_TOP);
    paintBrick(wall.ctx, WORLD_W, capH, wall.canvas.height - capH, REAR_BRICKS, 1029);
    wall.ctx.fillStyle = '#9c9da9';
    wall.ctx.fillRect(0, 0, WORLD_W, 1);
    wall.ctx.fillStyle = '#777985';
    wall.ctx.fillRect(0, 1, WORLD_W, 2);
    wall.ctx.fillStyle = '#49414b';
    wall.ctx.fillRect(0, 3, WORLD_W, 1);
    for (let x = 0; x < WORLD_W; x += 20) {
      wall.ctx.fillStyle = '#5a5968';
      wall.ctx.fillRect(x, 0, 1, 3);
      wall.ctx.fillStyle = '#abacb5';
      wall.ctx.fillRect(x + 5, 0, 5, 1);
    }

    // The overlook steps down in whole rows. Crop the lowest brick courses as it narrows.
    for (let x = 0; x < WORLD_W; x++) {
      const capY = rearCapAt(x);
      const baseY = deckTopAt(x) + REAR_FLASHING_DEPTH;
      const h = baseY - capY;
      ctx.clearRect(x, TERRACE_TOP, 1, capY - TERRACE_TOP);
      ctx.drawImage(wall.canvas, x, 0, 1, h, x, capY, 1, h);
      ctx.fillStyle = '#414552';
      ctx.fillRect(x, baseY, 1, 2);
    }
  }

  private paintFrontWall(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#343944';
    ctx.fillRect(0, FRONT_CAP - 2, WORLD_W, 2);
    ctx.fillStyle = '#aaa3a4';
    ctx.fillRect(0, FRONT_CAP, WORLD_W, 1);
    ctx.fillStyle = '#77727d';
    ctx.fillRect(0, FRONT_CAP + 1, WORLD_W, 3);
    ctx.fillStyle = '#433744';
    ctx.fillRect(0, FRONT_CAP + 4, WORLD_W, 2);
    for (let x = 0; x < WORLD_W; x += 25) {
      ctx.fillStyle = '#56505c';
      ctx.fillRect(x, FRONT_CAP, 1, 4);
      ctx.fillStyle = '#8f8790';
      ctx.fillRect(x + 4, FRONT_CAP + 2, 8, 1);
    }
    paintBrick(ctx, WORLD_W, BRICK_START, DESIGN_ROWS - BRICK_START, FRONT_BRICKS, 5101);
    ctx.fillStyle = '#221f2c44';
    ctx.fillRect(0, DESIGN_ROWS - 7, WORLD_W, 7);
  }
}
