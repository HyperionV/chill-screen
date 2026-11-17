import { clamp01 } from '../../sky';
import {
  BRIDGE_XS,
  CHAPTER_START,
  HARBOUR_BOAT_SPOTS,
  HARBOUR_HOUSE_SPOTS,
  HARBOUR_LAMP_XS,
  HARBOUR_TOWER_X,
  LOCK,
  WINDMILL_XS,
  lockEntryClosedAt,
  lockGateOpenAt,
  wrapDelta,
} from './chapters';
import { drawScaledSprite, drawWindmillSails, type CanalSprites } from './sprites';

const TULIP_STRIPES = ['#d84444', '#ecc842', '#e474a2', '#9258c0', '#e68436', '#f0ece0'] as const;

const TULIP_FIELD_XS: readonly number[] = [
  CHAPTER_START[3] + 420,
  CHAPTER_START[3] + 1080,
  CHAPTER_START[3] + 1460,
  CHAPTER_START[3] + 1960,
];

const MOORING_POST_XS: readonly number[] = [
  CHAPTER_START[6] + 690,
  CHAPTER_START[6] + 1040,
  CHAPTER_START[6] + 1410,
  CHAPTER_START[6] + 1780,
  CHAPTER_START[6] + 2120,
  CHAPTER_START[6] + 2480,
];

const HARBOUR_CRATE_XS: readonly number[] = [
  CHAPTER_START[6] + 665,
  CHAPTER_START[6] + 1235,
  CHAPTER_START[6] + 1735,
  CHAPTER_START[6] + 2255,
];

const HAYSTACK_XS: readonly number[] = [
  CHAPTER_START[5] + 610,
  CHAPTER_START[5] + 655,
  CHAPTER_START[5] + 1390,
  CHAPTER_START[5] + 1445,
  CHAPTER_START[5] + 1960,
  CHAPTER_START[5] + 2015,
];

const MARKET_STALL_XS: readonly number[] = [
  CHAPTER_START[2] + 520,
  CHAPTER_START[2] + 740,
  CHAPTER_START[2] + 1140,
  CHAPTER_START[2] + 1350,
  CHAPTER_START[2] + 1720,
];

const windAt = (time: number, x: number): number =>
  Math.sin(time * 0.8 + x * 0.005) * 0.55 + Math.sin(time * 0.27 + x * 0.002 + 1.4) * 0.45;

/** Draws the coloured tulip stripe beds in Windmill Meadows (Chapter 4). */
export function drawTulipStripes(
  L: CanvasRenderingContext2D,
  scroll: number,
  designW: number,
  bankTopPx: number,
  shorePx: number,
  unit: number,
): void {
  const dot = Math.max(1, Math.round(unit));
  const fieldTop = bankTopPx + Math.round(2 * unit);
  const fieldH = Math.max(8, shorePx - fieldTop - Math.round(4 * unit));
  const rowH = Math.max(2, Math.floor(fieldH / 5));

  for (let f = 0; f < TULIP_FIELD_XS.length; f++) {
    const dx = wrapDelta(TULIP_FIELD_XS[f], scroll);
    if (dx < -220 || dx > designW + 40) continue;
    const x0 = Math.round(dx * unit);
    const fw = Math.round(168 * unit);

    for (let r = 0; r < 5; r++) {
      const y = fieldTop + r * rowH;
      const slant = Math.round((4 - r) * 5 * unit);
      const stripeColor = TULIP_STRIPES[(f * 2 + r) % TULIP_STRIPES.length];
      // Green tulip leaf bed
      L.fillStyle = '#487d3c';
      L.fillRect(x0 + slant, y, fw, Math.max(1, rowH - dot));
      // Vibrant colour stripe of blooms
      L.fillStyle = stripeColor;
      L.fillRect(x0 + slant + dot, y, fw - dot * 2, Math.max(1, rowH - dot * 2));
      // Crisp pixel blossom pips along top of row
      for (let bx = x0 + slant + dot; bx < x0 + slant + fw - dot * 2; bx += dot * 3) {
        L.fillRect(bx, y - dot, dot * 2, dot);
      }
    }
  }
}

/** Draws all chapter-specific structures on the bank and harbour quay. */
export function drawChapterStructures(
  L: CanvasRenderingContext2D,
  sprites: CanalSprites,
  scroll: number,
  time: number,
  chapter: number,
  chapterT: number,
  w: number,
  designW: number,
  shorePx: number,
  lockLiftDesign: number,
  gateNudge: number,
  windmillAngle: number,
  unit: number,
): void {
  const quayTopPx = shorePx - Math.round(6 * unit);
  const bankBasePx = shorePx - Math.round(2 * unit);

  // Ch 1: Angler's wooden jetty
  const jettyDx = wrapDelta(CHAPTER_START[0] + 1540, scroll);
  if (jettyDx > -45 && jettyDx < designW + 45) {
    drawScaledSprite(L, sprites.jetty, jettyDx * unit, shorePx + Math.round(6 * unit), unit);
  }

  // Ch 2: Lock chamber brick walls, lock-keeper cottage, flower boxes & lock gates
  drawLockChamber(L, sprites, scroll, time, chapter, chapterT, w, designW, shorePx, lockLiftDesign, gateNudge, unit);

  // Ch 3: Village Market — cottages, washing lines, stalls, bunting, footbridge
  const marketCottages = [CHAPTER_START[2] + 920, CHAPTER_START[2] + 1520];
  for (let i = 0; i < marketCottages.length; i++) {
    const dx = wrapDelta(marketCottages[i], scroll);
    if (dx > -65 && dx < designW + 65) {
      drawScaledSprite(L, sprites.cottages[i % 2], dx * unit, quayTopPx, unit);
    }
  }
  const washDx = wrapDelta(CHAPTER_START[2] + 1565, scroll);
  if (washDx > -45 && washDx < designW + 45) {
    const wx = Math.round(washDx * unit);
    const wy = quayTopPx - Math.round(13 * unit);
    L.fillStyle = '#5c4028';
    L.fillRect(wx, wy, 1, Math.round(13 * unit));
    L.fillRect(wx + Math.round(28 * unit), wy, 1, Math.round(13 * unit));
    L.fillStyle = '#c8c0b4';
    L.fillRect(wx, wy + Math.round(2 * unit), Math.round(28 * unit), 1);
    const colors = ['#e6e0d4', '#d85c52', '#5c84b6', '#e2be58'];
    const sway = Math.round(windAt(time, washDx) * 1.4);
    for (let i = 0; i < 4; i++) {
      L.fillStyle = colors[i];
      L.fillRect(
        wx + Math.round((4 + i * 6) * unit) + sway,
        wy + Math.round(3 * unit),
        Math.round(3.5 * unit),
        Math.round(4.5 * unit),
      );
    }
  }
  for (let i = 0; i < MARKET_STALL_XS.length; i++) {
    const dx = wrapDelta(MARKET_STALL_XS[i], scroll);
    if (dx > -45 && dx < designW + 45) {
      drawScaledSprite(L, sprites.stalls[i % sprites.stalls.length], dx * unit, quayTopPx, unit);
      if (i < MARKET_STALL_XS.length - 1) {
        const nextDx = wrapDelta(MARKET_STALL_XS[i + 1], scroll);
        if (nextDx - dx < 260) {
          drawBunting(L, dx * unit, quayTopPx - 23 * unit, nextDx * unit, time, unit);
        }
      }
    }
  }
  const marketBridgeDx = wrapDelta(CHAPTER_START[2] + 2050, scroll);
  if (marketBridgeDx > -75 && marketBridgeDx < designW + 75) {
    drawBankArchBridge(L, marketBridgeDx * unit, shorePx, unit);
  }

  // Ch 4: Windmill Meadows — two pairs of big windmills with 40-stage-px turning sails
  for (let i = 0; i < WINDMILL_XS.length; i++) {
    const dx = wrapDelta(WINDMILL_XS[i], scroll);
    if (dx > -55 && dx < designW + 55) {
      const mx = dx * unit;
      drawScaledSprite(L, sprites.windmillTower, mx, bankBasePx, unit);
      drawWindmillSails(L, mx, bankBasePx - 42 * unit, windmillAngle + i * 0.65, 20 * unit, unit);
    }
  }

  // Ch 5: Bridge abutments along far bank
  for (const bx of BRIDGE_XS) {
    const dx = wrapDelta(bx, scroll);
    if (dx > -75 && dx < designW + 75) {
      drawBankArchBridge(L, dx * unit, shorePx, unit);
    }
  }

  // Ch 6: Haystacks & farmer's bench
  for (const hx of HAYSTACK_XS) {
    const dx = wrapDelta(hx, scroll);
    if (dx > -45 && dx < designW + 45) {
      drawScaledSprite(L, sprites.haystack, dx * unit, bankBasePx - Math.round(3 * unit), unit);
    }
  }
  const benchDx = wrapDelta(CHAPTER_START[5] + 1580, scroll);
  if (benchDx > -35 && benchDx < designW + 35) {
    drawScaledSprite(L, sprites.bench, benchDx * unit, bankBasePx, unit);
  }

  // Ch 7: Harbour Town — rows of tall narrow houses, harbour tower, crates & nets, bollards, lamps, 3 boat types
  drawHarbourTown(L, sprites, scroll, time, designW, shorePx, quayTopPx, unit);
}

function drawHarbourTown(
  L: CanvasRenderingContext2D,
  sprites: CanalSprites,
  scroll: number,
  time: number,
  designW: number,
  shorePx: number,
  quayTopPx: number,
  unit: number,
): void {
  const h = sprites.harbour;

  for (const spot of HARBOUR_HOUSE_SPOTS) {
    const dx = wrapDelta(spot.wx, scroll);
    if (dx > -45 && dx < designW + 45) {
      drawScaledSprite(L, h.houses[spot.variant % h.houses.length], dx * unit, quayTopPx, unit);
    }
  }

  const towerDx = wrapDelta(HARBOUR_TOWER_X, scroll);
  if (towerDx > -45 && towerDx < designW + 45) {
    drawScaledSprite(L, h.tower, towerDx * unit, quayTopPx, unit);
  }

  for (const cx of HARBOUR_CRATE_XS) {
    const dx = wrapDelta(cx, scroll);
    if (dx > -40 && dx < designW + 40) {
      drawScaledSprite(L, h.cratesAndNets, dx * unit, quayTopPx + Math.round(unit), unit);
    }
  }

  for (const px of MOORING_POST_XS) {
    const dx = wrapDelta(px, scroll);
    if (dx > -20 && dx < designW + 20) {
      drawScaledSprite(L, h.mooringPost, dx * unit, shorePx + Math.round(unit), unit);
    }
  }

  for (const lx of HARBOUR_LAMP_XS) {
    const dx = wrapDelta(lx, scroll);
    if (dx > -25 && dx < designW + 25) {
      drawScaledSprite(L, h.lampPost, dx * unit, quayTopPx, unit);
    }
  }

  for (let i = 0; i < HARBOUR_BOAT_SPOTS.length; i++) {
    const spot = HARBOUR_BOAT_SPOTS[i];
    const dx = wrapDelta(spot.wx, scroll);
    if (dx > -70 && dx < designW + 70) {
      const boatSprite = spot.kind === 0 ? h.rowboat : spot.kind === 1 ? h.sailboat : h.fishingBoat;
      const bob = Math.sin(time * 1.45 + i * 1.9) * 1.1 * unit;
      const baseY = shorePx + Math.round(8 * unit + bob);
      drawScaledSprite(L, boatSprite, dx * unit, baseY, unit);
    }
  }
}

function drawLockChamber(
  L: CanvasRenderingContext2D,
  sprites: CanalSprites,
  scroll: number,
  time: number,
  chapter: number,
  chapterT: number,
  w: number,
  designW: number,
  shorePx: number,
  lockLiftDesign: number,
  gateNudge: number,
  unit: number,
): void {
  const leftDx = wrapDelta(LOCK.entryGateX, scroll);
  const rightDx = wrapDelta(LOCK.exitGateX, scroll);
  if (rightDx < -65 || leftDx > designW + 65) return;

  const x0 = Math.max(0, Math.round(leftDx * unit));
  const x1 = Math.min(w, Math.round(rightDx * unit));
  const wallTopPx = shorePx - Math.round((18 + lockLiftDesign) * unit);

  if (x1 > x0) {
    L.fillStyle = '#8d6253';
    L.fillRect(x0, wallTopPx, x1 - x0, shorePx - wallTopPx);
    L.fillStyle = '#734d41';
    for (let y = wallTopPx + 3; y < shorePx; y += Math.max(3, Math.round(4 * unit))) {
      L.fillRect(x0, y, x1 - x0, 1);
    }
    // Stone coping along upper edge
    L.fillStyle = '#bfb7a8';
    L.fillRect(x0, wallTopPx, x1 - x0, Math.max(2, Math.round(2.5 * unit)));
    // Damp moss waterline rising/falling inside chamber
    L.fillStyle = '#486244';
    L.fillRect(x0, shorePx - Math.round(4 * unit), x1 - x0, Math.round(4 * unit));
    // Mooring rings & iron ladder
    L.fillStyle = '#383d44';
    const ladderX = Math.round((leftDx + 92) * unit);
    if (ladderX > 0 && ladderX < w) {
      L.fillRect(ladderX, wallTopPx, 1, shorePx - wallTopPx);
      L.fillRect(ladderX + Math.round(5 * unit), wallTopPx, 1, shorePx - wallTopPx);
      for (let ry = wallTopPx + 3; ry < shorePx; ry += Math.max(3, Math.round(4 * unit))) {
        L.fillRect(ladderX, ry, Math.round(5 * unit), 1);
      }
    }
  }

  const cotDx = wrapDelta(LOCK.cottageX, scroll);
  if (cotDx > -65 && cotDx < designW + 65) {
    drawScaledSprite(L, sprites.lockCottage, cotDx * unit, wallTopPx, unit);
    drawScaledSprite(L, sprites.flowerBox, (cotDx - 18) * unit, wallTopPx, unit);
    drawScaledSprite(L, sprites.flowerBox, (cotDx + 18) * unit, wallTopPx, unit);
  }

  const entryClosed = lockEntryClosedAt(chapter, chapterT);
  const exitOpen = clamp01(lockGateOpenAt(chapter, chapterT) + gateNudge * 0.25);
  drawLockGate(L, leftDx * unit, wallTopPx, shorePx, entryClosed, true, w, unit);
  drawLockGate(L, rightDx * unit, wallTopPx, shorePx, 1 - exitOpen, false, w, unit);

  // Sluice foam pouring into the chamber while rising
  if (chapter === 1 && chapterT >= LOCK.fillStart && chapterT <= LOCK.fillEnd) {
    L.fillStyle = 'rgba(236,248,255,0.82)';
    const gx = Math.round((leftDx + 6) * unit);
    for (let i = 0; i < 12; i++) {
      const fx = gx + Math.round(((time * 28 + i * 8) % 36) * unit);
      const fy = shorePx - Math.round((1 + (i % 4)) * unit);
      L.fillRect(fx, fy, Math.max(2, Math.round(3.5 * unit)), Math.max(1, Math.round(1.5 * unit)));
    }
  }
}

function drawLockGate(
  L: CanvasRenderingContext2D,
  gx: number,
  topPx: number,
  shorePx: number,
  closed: number,
  isLeft: boolean,
  w: number,
  unit: number,
): void {
  const x = Math.round(gx);
  if (x < -35 || x > w + 35) return;
  const width = Math.max(5, Math.round((5 + closed * 13) * unit));
  const drawX = isLeft ? x : x - width;
  L.fillStyle = '#4a3222';
  L.fillRect(drawX, topPx - Math.round(4 * unit), width, shorePx - topPx + Math.round(7 * unit));
  L.fillStyle = '#322015';
  L.fillRect(drawX + 1, topPx, Math.max(1, width - 2), Math.max(2, Math.round(2 * unit)));
  L.fillStyle = '#eee8d8';
  const beamDir = isLeft ? -1 : 1;
  L.fillRect(
    beamDir > 0 ? drawX : drawX - Math.round(12 * unit),
    topPx - Math.round(4 * unit),
    width + Math.round(12 * unit),
    Math.max(2, Math.round(2.5 * unit)),
  );
}

function drawBunting(
  L: CanvasRenderingContext2D,
  x0: number,
  y: number,
  x1: number,
  time: number,
  unit: number,
): void {
  const colors = ['#d64c42', '#ebd052', '#4c84b6', '#e8e2d4'];
  const span = x1 - x0;
  const count = Math.floor(span / (6 * unit));
  for (let i = 1; i < count; i++) {
    const k = i / count;
    const fx = Math.round(x0 + span * k);
    const sag = Math.sin(Math.PI * k) * 4 * unit + Math.sin(time * 2.5 + i) * 0.6 * unit;
    const fy = Math.round(y + sag);
    L.fillStyle = colors[i % colors.length];
    L.fillRect(fx, fy, Math.max(2, Math.round(2 * unit)), Math.max(2, Math.round(2 * unit)));
  }
}

function drawBankArchBridge(L: CanvasRenderingContext2D, cx: number, shorePx: number, unit: number): void {
  const bw = Math.round(64 * unit);
  const bh = Math.round(24 * unit);
  const x0 = Math.round(cx - bw / 2);
  const y0 = shorePx - bh;
  L.fillStyle = '#8b8a82';
  L.fillRect(x0, y0, bw, bh);
  L.fillStyle = '#6c6c66';
  L.fillRect(x0, y0, bw, Math.max(2, Math.round(2.5 * unit)));
  L.fillStyle = '#4e7642';
  L.fillRect(x0 + Math.round(5 * unit), y0 + Math.round(4 * unit), Math.round(5 * unit), Math.round(3 * unit));
  L.fillRect(x0 + bw - Math.round(11 * unit), y0 + Math.round(5 * unit), Math.round(6 * unit), Math.round(4 * unit));
  const archR = Math.round(17 * unit);
  L.fillStyle = '#252b30';
  for (let dy = 0; dy <= archR; dy++) {
    const half = Math.round(Math.sqrt(archR * archR - dy * dy));
    L.fillRect(Math.round(cx) - half, shorePx - dy, half * 2, 1);
  }
}
