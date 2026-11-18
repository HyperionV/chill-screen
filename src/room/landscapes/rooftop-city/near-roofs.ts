import { memoryCanvas } from '../../../render/pixel-stage';
import { seededRandom } from '../../../world/math';
import { SILHOUETTE_PARALLAX, SILHOUETTE_SPAN, wrapCoord } from './scenes';
import { drawRoofStrip } from './terrace';
import { drawWire } from './wind-motion';

const STRIP_TOP = 168;
const STRIP_BOTTOM = 212;
const OVERLOOK_GAP_LEFT = 358;
const OVERLOOK_GAP_RIGHT = 634;
const END_MARGIN = 48;

interface Roof {
  x: number;
  w: number;
  y: number;
}

/** Cool service roofs overlap the city and leave the overlook's avenue visible between them. */
export class NearRoofs {
  private readonly art = memoryCanvas(SILHOUETTE_SPAN, STRIP_BOTTOM - STRIP_TOP);
  private readonly roofs: Roof[] = [];

  constructor() {
    const rnd = seededRandom(7331);
    const { ctx } = this.art;
    ctx.translate(0, -STRIP_TOP);
    let previous: Roof | undefined;
    for (let x = 12; x < SILHOUETTE_SPAN - END_MARGIN;) {
      const w = 40 + Math.floor(rnd() * 34);
      if (x + w > OVERLOOK_GAP_LEFT && x < OVERLOOK_GAP_RIGHT) {
        x = OVERLOOK_GAP_RIGHT;
        previous = undefined;
        continue;
      }
      const y = 184 + Math.floor(rnd() * 14);
      const variant = Math.floor(rnd() * 4);
      const aerial = rnd() < 0.52;
      const wire = rnd() < 0.65;
      if (previous && wire) {
        drawWire(ctx, previous.x + previous.w - 4, previous.y - 2, x + 4, y - 2, 4, 1, '#363d4b');
      }
      this.paintRoof(ctx, x, y, w, variant, aerial);
      previous = { x, y, w };
      this.roofs.push(previous);
      x += w + 8 + Math.floor(rnd() * 18);
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, width: number, unit: number): void {
    drawRoofStrip(ctx, this.art.canvas, STRIP_TOP, camX * SILHOUETTE_PARALLAX, width, unit);
  }

  covers(x: number, y: number, camX: number, width: number): boolean {
    if (y < STRIP_TOP || y >= STRIP_BOTTOM) return false;
    const wx = wrapCoord(x - width / 2 + camX * SILHOUETTE_PARALLAX, SILHOUETTE_SPAN);
    return this.roofs.some(roof => y >= roof.y && wx >= roof.x && wx < roof.x + roof.w);
  }

  private paintRoof(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, variant: number, aerial: boolean): void {
    ctx.fillStyle = '#323745';
    ctx.fillRect(x, y, w, STRIP_BOTTOM - y);
    ctx.fillStyle = '#282c3b';
    ctx.fillRect(x + w - 6, y, 6, STRIP_BOTTOM - y);
    ctx.fillRect(x, y + 2, w, 2);
    ctx.fillStyle = '#515767';
    ctx.fillRect(x - 1, y, w + 2, 1);
    for (let rib = x + 7; rib < x + w - 8; rib += 12) {
      ctx.fillStyle = '#3d4253';
      ctx.fillRect(rib, y + 5, 1, Math.min(7, STRIP_BOTTOM - y - 5));
      ctx.fillStyle = '#2d3140';
      ctx.fillRect(rib + 1, y + 5, 1, Math.min(7, STRIP_BOTTOM - y - 5));
    }
    for (let row = y + 9; row < STRIP_BOTTOM; row += 5) {
      ctx.fillStyle = '#2e3343';
      ctx.fillRect(x, row, w - 6, 1);
    }

    const equipmentX = x + 8 + variant * 4;
    const equipmentW = [8, 22, 15, 10][variant];
    const equipmentH = [10, 9, 6, 12][variant];
    const equipmentY = y - equipmentH;
    ctx.fillStyle = '#2c3140';
    ctx.fillRect(equipmentX, equipmentY, equipmentW, equipmentH);
    ctx.fillStyle = '#474e61';
    ctx.fillRect(equipmentX - 1, equipmentY, equipmentW + 2, 1);
    ctx.fillStyle = '#373e50';
    for (let vent = 2; vent < equipmentW - 1; vent += 3) {
      ctx.fillRect(equipmentX + vent, equipmentY + 2, 1, equipmentH - 4);
    }

    if (aerial) {
      const ax = x + w - 11;
      ctx.fillStyle = '#43495c';
      ctx.fillRect(ax, y - 14, 1, 14);
      ctx.fillRect(ax - 4, y - 12, 9, 1);
      ctx.fillRect(ax - 2, y - 8, 5, 1);
    }
  }
}
