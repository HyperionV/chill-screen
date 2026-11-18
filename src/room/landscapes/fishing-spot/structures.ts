import { css, type RGB } from '../../../render/color';
import { hash } from '../../journeys/noise';
import { drawBoxBottom } from './creatures';
import type { FishingSprites } from './sprites';
import type { SceneIndex, SceneLayout } from './types';

const PLANK_LIT: RGB = [164, 124, 86];
const PLANK_MID: RGB = [124, 90, 60];
const PLANK_ALT: RGB = [110, 78, 52];
const PLANK_DARK: RGB = [74, 52, 34];
const PLANK_DEEP: RGB = [48, 32, 20];
const PILING: RGB = [72, 52, 36];
const PILING_SHADE: RGB = [44, 30, 20];
const MOSS_WATERLINE: RGB = [62, 94, 52];
const PLANK_DEPTH = 10;
const PLANK_WIDTH = 9;
const PILE_REFLECTION_ROWS = 5;

/** Draws a timber fishing rod or diagonal strut extending from `(x0, y0)` to `(x1, y1)`. */
export function drawRod(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  unit: number,
  color = '#4e3522',
): void {
  const dot = Math.max(1, Math.round(unit));
  ctx.fillStyle = color;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const rx = x0 + (x1 - x0) * k;
    const ry = y0 + (y1 - y0) * k + k * k * bend;
    ctx.fillRect(Math.round(rx * unit), Math.round(ry * unit), dot, dot);
  }
}

/** Draws a curved mooring rope hanging between two points. */
export function drawRopeArc(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
  unit: number,
): void {
  const dot = Math.max(1, Math.round(unit));
  ctx.fillStyle = '#b49460';
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const rx = x0 + (x1 - x0) * k;
    const ry = y0 + (y1 - y0) * k + Math.sin(Math.PI * k) * sag;
    ctx.fillRect(Math.round(rx * unit), Math.round(ry * unit), dot, dot);
  }
}

/** Draws a weathered wooden post with lit top cap and shaded right face. */
export function drawPost(
  L: CanvasRenderingContext2D,
  xDesign: number,
  baseY: number,
  height: number,
  u: number,
): void {
  const x = Math.round(xDesign * u);
  const pw = Math.max(3, Math.round(4 * u));
  const ph = Math.round(height * u);
  const top = Math.round(baseY * u) - ph;
  L.fillStyle = css(PILING);
  L.fillRect(x - Math.floor(pw / 2), top, pw, ph);
  L.fillStyle = css(PILING_SHADE);
  L.fillRect(x, top, Math.max(1, Math.floor(pw / 2)), ph);
  L.fillStyle = css(PLANK_LIT);
  L.fillRect(x - Math.floor(pw / 2), top, pw, Math.max(1, Math.round(u)));
}

/** Draws a moored wooden skiff tied by rope to a piling, gently rocking on the water. */
export function drawMooredSkiff(
  L: CanvasRenderingContext2D,
  sprites: FishingSprites,
  postX: number,
  boatX: number,
  boatY: number,
  time: number,
  u: number,
): void {
  drawPost(L, postX, boatY + 22, 26, u);
  drawBoxBottom(L, sprites.mooringPost, postX, boatY + 7, u);
  const bob = Math.sin(time * 1.4 + boatX * 0.05) * 0.7;
  drawRopeArc(L, postX, boatY - 2, boatX - 15, boatY - 2 + bob, 3, u);
  const dot = Math.max(1, Math.round(u));
  L.fillStyle = 'rgba(40,66,77,0.38)';
  L.fillRect(Math.round((boatX - 14) * u), Math.round((boatY + bob + 1) * u), Math.round(29 * u), dot * 2);
  L.fillRect(Math.round((boatX - 9) * u), Math.round((boatY + bob + 4) * u), Math.round(18 * u), dot);
  drawBoxBottom(L, sprites.mooredSkiff, boatX, boatY + bob, u);
  L.fillStyle = 'rgba(225,244,252,0.36)';
  L.fillRect(Math.round((boatX - 17) * u), Math.round((boatY + bob) * u), Math.round(11 * u), dot);
  L.fillRect(Math.round((boatX + 7) * u), Math.round((boatY + bob + 1) * u), Math.round(12 * u), dot);
}

/** Draws a weathered plank jetty with iron nails, cross-bracing, mossy piling collars, and water shadow. */
export function drawJetty(
  L: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  deckY: number,
  u: number,
  pilings: readonly number[],
): void {
  const dot = Math.max(1, Math.round(u));
  const sx = Math.round(startX * u);
  const ex = Math.round(endX * u);
  const dy = Math.round(deckY * u);
  const w = Math.max(4, ex - sx);
  const deckH = Math.max(4, Math.round(PLANK_DEPTH * u));

  // Dithered under-jetty water shadow
  L.fillStyle = 'rgba(22,38,44,0.23)';
  for (let x = sx; x < ex; x += dot * 3) {
    const rippleY = dy + Math.round((27 + hash(x) * 3) * u);
    L.fillRect(x, rippleY, dot * (hash(x + 1) > 0.4 ? 3 : 2), dot * 2);
  }

  // Diagonal timber cross-braces between pilings
  for (let i = 0; i < pilings.length - 1; i++) {
    const p0 = pilings[i];
    const p1 = pilings[i + 1];
    if (p0 !== undefined && p1 !== undefined) {
      drawRod(L, p0, deckY + 6, p1, deckY + 24, 0, u, css(PILING_SHADE));
    }
  }

  // Pilings with lit edge, shade, mossy waterline collar, and water ripples
  for (const px of pilings) {
    const x = Math.round(px * u);
    const pw = Math.max(3, Math.round(5 * u));
    const ph = Math.round(28 * u);
    const foot = dy + deckH + ph - dot;
    L.fillStyle = 'rgba(39,58,57,0.36)';
    for (let row = 0; row < PILE_REFLECTION_ROWS; row++) {
      const sway = Math.round((hash(px * 13 + row) - 0.5) * 5 * u);
      L.fillRect(x - dot + sway, foot + row * 2 * dot, Math.max(dot, pw - row * dot), dot);
    }
    L.fillStyle = css(PILING);
    L.fillRect(x - Math.floor(pw / 2), dy + deckH - 1, pw, ph);
    L.fillStyle = css(PILING_SHADE);
    L.fillRect(x, dy + deckH - 1, Math.max(1, Math.ceil(pw / 2)), ph);
    L.fillStyle = css(MOSS_WATERLINE);
    L.fillRect(x - Math.floor(pw / 2), foot - dot * 3, pw, dot * 2);
    L.fillStyle = '#8b9b66';
    L.fillRect(x - dot, foot - dot * 3, dot, dot);
    L.fillStyle = 'rgba(220,242,250,0.35)';
    L.fillRect(x - pw, foot, pw, dot);
    L.fillRect(x + dot * 2, foot + dot, pw - dot, dot);
  }

  // Under-beam & staggered plank deck with seams and iron nail heads
  L.fillStyle = css(PLANK_DEEP);
  L.fillRect(sx, dy + deckH - dot * 2, w, dot * 2);

  const plankStep = Math.max(5, Math.round(PLANK_WIDTH * u));
  for (let px = sx, idx = 0; px < ex; px += plankStep, idx++) {
    const pw = Math.min(plankStep - dot, ex - px);
    if (pw <= 0) break;
    L.fillStyle = css(idx % 2 === 0 ? PLANK_MID : PLANK_ALT);
    L.fillRect(px, dy + dot, pw, deckH - dot * 3);
    L.fillStyle = css(PLANK_LIT);
    L.fillRect(px, dy, pw, dot);
    L.fillStyle = css(PLANK_DARK);
    L.fillRect(px + pw, dy, dot, deckH - dot);
    // The broken grain follows the board, with a small light chip beside the knot.
    const grainX = px + Math.round(pw * (0.25 + hash(idx * 13) * 0.42));
    const grainY = dy + dot * (3 + idx % 3);
    L.fillRect(grainX, grainY, dot, dot * 2);
    L.fillStyle = css(PLANK_LIT);
    L.fillRect(grainX + dot, grainY + dot, dot, dot);
    L.fillStyle = '#2a2420';
    L.fillRect(px + dot, dy + dot, dot, dot);
    if (pw > dot * 4) {
      L.fillRect(px + pw - dot * 2, dy + dot, dot, dot);
      L.fillStyle = '#beb39b';
      L.fillRect(px + pw - dot * 2, dy + dot * 2, dot, dot);
    }
  }
}

/** Draws layered reeds, cattails, organic shoals, and lily pad clusters tailored to each scene. */
export function drawSceneFlora(
  L: CanvasRenderingContext2D,
  sprites: FishingSprites,
  scene: SceneIndex,
  layout: SceneLayout,
  u: number,
  time: number,
): void {
  const rZone = layout.rightZone;

  // Scene 1 stepped organic sandbar & submerged stones on right shallows (never a flat rectangle)
  if (scene === 1) {
    const dot = Math.max(1, Math.round(u));
    const sx = Math.round((rZone + 22) * u);
    const sy = Math.round(202 * u);
    const sw = Math.round(138 * u);
    L.fillStyle = 'rgba(138,130,90,0.34)';
    L.fillRect(sx + dot * 12, sy, sw - dot * 12, Math.round(4 * u));
    L.fillRect(sx + dot * 6, sy + Math.round(4 * u), sw - dot * 6, Math.round(6 * u));
    L.fillRect(sx + dot * 2, sy + Math.round(10 * u), sw - dot * 2, Math.round(8 * u));
    L.fillStyle = 'rgba(116,110,76,0.38)';
    for (let i = 0; i < 28; i++) {
      const px = sx + Math.round(((i * 9) % 132) * u);
      const py = sy + Math.round(((i % 6) * 3.5) * u);
      L.fillRect(px, py, dot * (2 + (i % 3)), dot);
    }
  }

  const pads =
    scene === 1
      ? [
          { x: 134, y: 192, v: 1 },
          { x: 152, y: 198, v: 2 },
          { x: 164, y: 204, v: 0 },
          { x: 146, y: 214, v: 3 },
          { x: rZone + 8, y: 198, v: 1 },
          { x: rZone + 26, y: 208, v: 2 },
          { x: rZone + 46, y: 218, v: 0 },
          { x: rZone + 66, y: 224, v: 3 },
          { x: rZone + 88, y: 206, v: 2 },
        ]
      : scene === 2
        ? [
            { x: 138, y: 194, v: 0 },
            { x: 154, y: 202, v: 2 },
            { x: rZone + 12, y: 208, v: 1 },
            { x: rZone + 34, y: 216, v: 2 },
            { x: rZone + 62, y: 224, v: 0 },
          ]
        : [
            { x: 12, y: 238, v: 2 },
            { x: rZone + 4, y: 214, v: 0 },
            { x: rZone + 24, y: 222, v: scene === 0 ? 1 : 2 },
            { x: rZone + 96, y: 220, v: 3 },
            { x: rZone + 116, y: 226, v: 0 },
          ];

  for (const p of pads) {
    const sp = sprites.lilyPads[p.v];
    if (!sp) continue;
    const bob = Math.sin(time * 1.4 + p.x * 0.1) * 0.4;
    drawBoxBottom(L, sp, p.x, p.y + bob, u);
  }

  const reedSpots =
    scene === 1
      ? [
          { x: 8, y: 206, idx: 0 },
          { x: 22, y: 214, idx: 3 },
          { x: 36, y: 218, idx: 1 },
          { x: rZone + 18, y: 204, idx: 1 },
          { x: rZone + 36, y: 214, idx: 3 },
          { x: rZone + 56, y: 208, idx: 0 },
          { x: rZone + 74, y: 220, idx: 2 },
          { x: rZone + 98, y: 212, idx: 3 },
          { x: rZone + 118, y: 216, idx: 0 },
          { x: rZone + 138, y: 222, idx: 2 },
          { x: rZone + 154, y: 218, idx: 1 },
        ]
      : [
          { x: 8, y: 228, idx: 2 },
          { x: 24, y: 234, idx: 0 },
          { x: rZone + 82, y: 224, idx: 3 },
          { x: rZone + 102, y: 218, idx: 1 },
          { x: rZone + 122, y: 226, idx: 0 },
          { x: rZone + 142, y: 220, idx: 2 },
          { x: rZone + 156, y: 228, idx: 3 },
        ];

  for (const r of reedSpots) {
    const sp = sprites.reeds[r.idx];
    if (!sp) continue;
    const sway = Math.sin(time * 1.5 + r.x * 0.04) * 1.1;
    drawBoxBottom(L, sp, r.x + sway, r.y, u);
  }
}
