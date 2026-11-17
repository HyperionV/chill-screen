import { seededRandom } from '../world/math';
import { depthScale, floorAt } from '../world/geometry';
import type { Rock, Tank } from '../world/types';
import { css, haze, hsl, mix, shade, type RGB } from './color';

/** One straight piece of driftwood; pieces join end to start into branching wood. */
export interface Branch {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w0: number;
  w1: number;
  depth: number;
}

/** Depth the driftwood stands at: behind most rocks, in front of the background planting. */
export const DRIFTWOOD_Z = 0.3;
const MAX_BRANCH_DEPTH = 4;
const WOOD: RGB = [104, 78, 56];
const WOOD_LIT: RGB = [176, 142, 104];
const WOOD_DARK: RGB = [34, 24, 18];
const STONE: RGB = [118, 122, 126];

/** The driftwood's shape, the same every time for a given tank layout and width. */
export function driftwood(tank: Tank): Branch[] {
  const rnd = seededRandom(tank.layoutSeed + 7);
  const out: Branch[] = [];
  const grow = (x: number, y: number, angle: number, length: number, width: number, depth: number): void => {
    // Each limb bends once partway, so the wood looks grown rather than ruled.
    const bent = angle + (rnd() - 0.5) * 0.55;
    const xm = x + Math.sin(angle) * length * 0.5;
    const ym = y - Math.cos(angle) * length * 0.5;
    const x1 = xm + Math.sin(bent) * length * 0.5;
    const y1 = ym - Math.cos(bent) * length * 0.5;
    const wm = width * 0.82;
    const w1 = Math.max(2.5, width * 0.64);
    out.push({ x0: x, y0: y, x1: xm, y1: ym, w0: width, w1: wm, depth }, { x0: xm, y0: ym, x1, y1, w0: wm, w1, depth });
    if (depth === MAX_BRANCH_DEPTH) return;
    const kids = depth === 0 ? 2 : rnd() < 0.45 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const side = (i / (kids - 1) - 0.5) * 2;
      grow(x1, y1, bent * 0.55 + side * (0.3 + rnd() * 0.35), length * (0.6 + rnd() * 0.16), w1, depth + 1);
    }
  };
  const pieces = [
    { at: 0.2 + rnd() * 0.08, lean: 1 },
    { at: 0.66 + rnd() * 0.08, lean: -1 },
  ];
  for (const p of pieces) {
    const x = p.at * tank.width;
    grow(x, floorAt(x, DRIFTWOOD_Z) + 10, p.lean * (0.5 + rnd() * 0.25), 200 + rnd() * 60, 46 + rnd() * 10, 0);
  }
  return out;
}

/** Points on the wood where moss has taken hold, with how far out on the wood they are. */
export const mossAnchors = (branches: Branch[]): { x: number; y: number; depth: number }[] =>
  branches.filter((b) => b.depth >= 2).map((b) => ({ x: b.x1, y: b.y1, depth: b.depth }));

export function paintDriftwood(ctx: CanvasRenderingContext2D, branches: Branch[], water: RGB): void {
  const lit = haze(WOOD_LIT, water, DRIFTWOOD_Z);
  const mid = haze(WOOD, water, DRIFTWOOD_Z);
  const dark = haze(WOOD_DARK, water, DRIFTWOOD_Z);
  const bark = css(dark, 0.3);
  ctx.lineCap = 'round';
  for (const b of [...branches].sort((a, c) => a.depth - c.depth)) {
    const dx = b.x1 - b.x0;
    const dy = b.y1 - b.y0;
    const len = Math.hypot(dx, dy) || 1;
    // Unit normal pointing upward: that side faces the light.
    let nx = -dy / len;
    let ny = dx / len;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const w = (b.w0 + b.w1) / 2;
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const g = ctx.createLinearGradient(cx + (nx * w) / 2, cy + (ny * w) / 2, cx - (nx * w) / 2, cy - (ny * w) / 2);
    g.addColorStop(0, css(mid));
    g.addColorStop(0.2, css(lit));
    g.addColorStop(0.55, css(mid));
    g.addColorStop(1, css(dark));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(b.x0 + (nx * b.w0) / 2, b.y0 + (ny * b.w0) / 2);
    ctx.lineTo(b.x1 + (nx * b.w1) / 2, b.y1 + (ny * b.w1) / 2);
    ctx.lineTo(b.x1 - (nx * b.w1) / 2, b.y1 - (ny * b.w1) / 2);
    ctx.lineTo(b.x0 - (nx * b.w0) / 2, b.y0 - (ny * b.w0) / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x1, b.y1, b.w1 / 2, 0, Math.PI * 2);
    ctx.fill();

    // Grain running along the wood.
    ctx.strokeStyle = bark;
    ctx.lineWidth = 1;
    for (const k of [-0.28, -0.05, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(b.x0 + nx * b.w0 * k, b.y0 + ny * b.w0 * k);
      ctx.quadraticCurveTo(cx + nx * w * (k + 0.06), cy + ny * w * (k + 0.06), b.x1 + nx * b.w1 * k, b.y1 + ny * b.w1 * k);
      ctx.stroke();
    }
  }
  paintMossTufts(ctx, mossAnchors(branches), water);
}

/**
 * Java moss on the wood: soft dense cushions of tiny green specks. Out at the twig tips the cushions
 * are large and run together into a canopy, so the wood reads as a small underwater tree.
 */
function paintMossTufts(ctx: CanvasRenderingContext2D, anchors: { x: number; y: number; depth: number }[], water: RGB): void {
  const rnd = seededRandom(anchors.length * 131 + 3);
  for (const a of anchors) {
    const canopy = a.depth === MAX_BRANCH_DEPTH;
    if (!canopy && rnd() < 0.5) continue;
    const size = canopy ? 18 + rnd() * 16 : 8 + rnd() * 8;
    for (let i = 0; i < size * 7; i++) {
      const ang = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * size;
      const x = a.x + Math.cos(ang) * r * 1.3;
      const y = a.y + Math.sin(ang) * r * 0.75;
      // Lit from above: the crown of each cushion is lighter, the underside falls into shade.
      const top = (a.y - y) / size;
      const light = 0.1 + rnd() * 0.08 + Math.max(0, top) * 0.1;
      ctx.fillStyle = css(haze(hsl(98 + rnd() * 20, 0.38, light), water, DRIFTWOOD_Z - 0.1), r > size * 0.8 ? 0.55 : 0.9);
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + rnd() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A ridged, layered stone lit from above, with its soft shadow on the sand. */
export function paintRock(ctx: CanvasRenderingContext2D, rock: Rock, water: RGB, sand: RGB): void {
  const rnd = seededRandom(Math.floor(rock.seed * 1000) + 1);
  const s = depthScale(rock.z) * 1.45;
  const w = rock.w * s;
  const h = rock.h * s * 1.3;
  const baseY = floorAt(rock.x, rock.z) + 8;
  const stone = mix(STONE, sand, 0.18);

  paintShadowEllipse(ctx, rock.x, baseY, w * 0.75, w * 0.15);

  // The top edge: a jagged ridge with one dominant peak, like a weathered layered stone.
  const peakT = 0.3 + rnd() * 0.4;
  const top: [number, number][] = [];
  const points = 14;
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const rise = t < peakT ? t / peakT : (1 - t) / (1 - peakT);
    // Broad weathered shoulders rather than a spike.
    const y = baseY - h * Math.pow(Math.max(0, rise), 0.38) * (0.8 + rnd() * 0.22);
    top.push([rock.x - w / 2 + t * w, i === 0 || i === points ? baseY : y]);
  }
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(top[0][0] - 4, baseY + 2);
    for (const [x, y] of top) ctx.lineTo(x, y);
    ctx.lineTo(top[points][0] + 4, baseY + 2);
    ctx.closePath();
  };

  outline();
  const body = ctx.createLinearGradient(0, baseY - h, 0, baseY);
  body.addColorStop(0, css(haze(mix(stone, [236, 240, 236], 0.25), water, rock.z)));
  body.addColorStop(0.6, css(haze(stone, water, rock.z)));
  body.addColorStop(1, css(haze(shade(stone, 0.45), water, rock.z)));
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  outline();
  ctx.clip();
  // The face turned away from the light.
  const peak = top[Math.round(peakT * points)];
  ctx.fillStyle = css(haze(shade(stone, 0.35), water, rock.z), 0.42);
  ctx.beginPath();
  ctx.moveTo(peak[0], peak[1]);
  ctx.lineTo(peak[0] + w * 0.12, baseY + 4);
  ctx.lineTo(rock.x + w, baseY + 4);
  ctx.lineTo(rock.x + w, baseY - h * 2);
  ctx.closePath();
  ctx.fill();
  // Layers in the stone, following the ridge line down.
  for (let k = 1; k <= 4; k++) {
    const drop = k * h * 0.17;
    ctx.beginPath();
    top.forEach(([x, y], i) => {
      const yy = Math.min(baseY, y + drop + Math.sin(i * 1.7 + k) * 2);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    });
    ctx.strokeStyle = css(haze(shade(stone, 0.4), water, rock.z), 0.35);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.translate(0, -1.2);
    ctx.strokeStyle = css(haze(mix(stone, [255, 255, 255], 0.4), water, rock.z), 0.18);
    ctx.stroke();
    ctx.translate(0, 1.2);
  }
  // Pitted texture.
  for (let i = 0; i < w * 0.6; i++) {
    const x = rock.x + (rnd() - 0.5) * w;
    const y = baseY - rnd() * h;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 1.5);
  }
  ctx.restore();

  // Light catching the ridge.
  ctx.beginPath();
  top.slice(1, -1).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y + 1) : ctx.lineTo(x, y + 1)));
  ctx.strokeStyle = css(haze([226, 236, 232], water, rock.z), 0.45);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** A soft dark oval where something sits on or hovers over the sand. */
export function paintShadowEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, strength = 0.38): void {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,8,10,${strength.toFixed(3)})`);
  g.addColorStop(1, 'rgba(0,8,10,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
