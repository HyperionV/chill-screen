import { css, mix, shade } from '../../../render/color';
import { seededRandom } from '../../../world/math';
import { clamp01 } from '../../sky';
import type { SeasideCreatures } from './creatures';
import {
  BOTTLE_POS,
  CORK_DURATION,
  HARBOUR_BOAT_SPOTS,
  drawBottleNote,
  drawFootprints,
} from './interactions';
import type { SeasideSprites } from './sprites';
import {
  HORIZON,
  LAYER_PARALLAX,
  SCENE_BEACH,
  SCENE_HARBOUR,
  SHORE,
  WHITE,
  drawSprite,
  tintLand,
  type SceneBuffers,
  type SceneRenderContext,
} from './types';
import { drawBeachSurf, drawGlitter, drawOpenWater, drawRipplesAndFish } from './water';

const SHELL_SPOTS: readonly { u: number; v: number; kind: number }[] = [
  { u: 0.11, v: 0.76, kind: 0 },
  { u: 0.24, v: 0.88, kind: 1 },
  { u: 0.33, v: 0.74, kind: 2 },
  { u: 0.68, v: 0.74, kind: 1 },
  { u: 0.78, v: 0.90, kind: 0 },
  { u: 0.89, v: 0.84, kind: 2 },
];

const LAMP_SPOTS: readonly number[] = [0.10, 0.33, 0.88];

/** Renders Scene 0: Sandy Beach (upgraded Sea view with footprints, driftwood, shells, sandcastle, umbrella, bottle, crab). */
export function renderBeachScene(
  rc: SceneRenderContext,
  buffers: SceneBuffers,
  sprites: SeasideSprites,
  creatures: SeasideCreatures,
): void {
  const { w, h, unit, time, state, px, py, cameraShiftX, interactions } = rc;
  const { sky, sun, moon, day } = state;
  const S = buffers.scene.ctx;
  const L = buffers.land.ctx;
  S.clearRect(0, 0, w, h);
  L.clearRect(0, 0, w, h);

  const pan = px + cameraShiftX;

  // Layer 2: Distant headland on the left + tiny striped lighthouse
  const hy = Math.round(h * HORIZON);
  const headBase = css(shade(mix(sky.horizon, sky.zenith, 0.5), 0.62));
  const rnd = seededRandom(31);
  const pts: number[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push(Math.sin(Math.PI * Math.min(1, t * 1.25)) * (0.75 + rnd() * 0.25) * (1 - t * 0.6) * 0.04);
  }
  const hx0 = Math.round((-0.05 * w) + pan * LAYER_PARALLAX[1]);
  const hx1 = Math.round((0.33 * w) + pan * LAYER_PARALLAX[1]);
  S.fillStyle = headBase;
  for (let x = Math.max(0, hx0); x <= Math.min(w - 1, hx1); x++) {
    const t = (x - hx0) / Math.max(1, hx1 - hx0);
    const idx = Math.min(19, Math.floor(t * 20));
    const f = t * 20 - idx;
    const rise = pts[idx] * (1 - f) + pts[idx + 1] * f;
    const colH = Math.max(1, Math.round(rise * h));
    S.fillRect(x, hy - colH, 1, colH + 1);
  }

  const lhX = Math.round(w * 0.255 + pan * LAYER_PARALLAX[1]);
  const lhTall = Math.round(7 * unit);
  const lhTop = Math.round(hy - h * 0.03 - lhTall);
  S.fillStyle = css(shade(mix(WHITE, sky.horizon, 0.3), 0.55 + 0.45 * day));
  S.fillRect(lhX, lhTop, 2, lhTall);
  S.fillStyle = css(shade([190, 64, 56], 0.5 + 0.5 * day));
  S.fillRect(lhX, lhTop + 2, 2, 1);
  S.fillRect(lhX, lhTop + 5, 2, 1);

  // Layer 3: Open sea, sun/moon glitter, rolling surf & wet/dry sand
  drawOpenWater(S, w, h, unit, sky, day, time, SHORE, 1, 1, pan);
  drawGlitter(S, w, h, unit, sky, sun, moon, day, time, SHORE, pan);
  const sand = drawBeachSurf(S, w, h, unit, sky, day, time, SHORE, 0, pan);
  drawRipplesAndFish(S, w, h, unit, interactions.ripples, interactions.fishLeaps, sprites, sky, day);
  drawFootprints(S, w, h, unit, interactions.footprints, sand, pan, 19);

  // Layer 4: Beach props on land buffer (tinted cleanly by hour)
  const nearPan = pan * LAYER_PARALLAX[3];
  const nearY = py * 0.5;

  // Umbrella & striped towel by day
  if (day > 0.25) {
    const ux = Math.round(0.18 * w + nearPan);
    const uy = Math.round(0.79 * h + nearY);
    L.fillStyle = 'rgba(20,16,12,0.22)';
    L.fillRect(ux - Math.round(9 * unit), uy - 1, Math.round(18 * unit), Math.max(2, Math.round(2 * unit)));
    drawSprite(L, sprites.towel, ux + Math.round(3 * unit), uy - Math.round(2 * unit), unit);
    drawSprite(L, sprites.umbrella, ux - (sprites.umbrella.width * unit) / 2, uy - sprites.umbrella.height * unit, unit);
  }

  // Sun-bleached driftwood log
  const dwx = Math.round(0.285 * w + nearPan);
  const dwy = Math.round(0.845 * h + nearY);
  L.fillStyle = 'rgba(20,16,12,0.20)';
  L.fillRect(dwx - Math.round(10 * unit), dwy - 1, Math.round(20 * unit), 1);
  drawSprite(L, sprites.driftwood, dwx - (sprites.driftwood.width * unit) / 2, dwy - sprites.driftwood.height * unit, unit);

  // Scattered shells
  for (const sh of SHELL_SPOTS) {
    const sp = sprites.shells[sh.kind % sprites.shells.length];
    drawSprite(L, sp, sh.u * w + nearPan - (sp.width * unit) / 2, sh.v * h + nearY - sp.height * unit, unit);
  }

  // Sandcastle with fluttering pennant flag
  const scx = Math.round(0.81 * w + nearPan);
  const scy = Math.round(0.80 * h + nearY);
  L.fillStyle = 'rgba(20,16,12,0.22)';
  L.fillRect(scx - Math.round(10 * unit), scy - 1, Math.round(20 * unit), 2);
  drawSprite(L, sprites.sandcastle, scx - (sprites.sandcastle.width * unit) / 2, scy - sprites.sandcastle.height * unit, unit);
  const flagSp = Math.floor(time * 4) % 2 === 0 ? sprites.flagA : sprites.flagB;
  drawSprite(L, flagSp, scx - Math.round(1 * unit), scy - (sprites.sandcastle.height + flagSp.height - 1) * unit, unit);

  // Washed-up green glass bottle (closed or open with popped cork)
  const bx = Math.round(BOTTLE_POS.u * w + nearPan);
  const by = Math.round(BOTTLE_POS.v * h + nearY);
  const bottleSp = interactions.bottle.open ? sprites.bottleOpen : sprites.bottleClosed;
  drawSprite(L, bottleSp, bx - (bottleSp.width * unit) / 2, by - bottleSp.height * unit, unit);
  if (interactions.bottle.open) {
    const ct = Math.min(1, interactions.bottle.corkAge / CORK_DURATION);
    const corkX = bx + Math.round((7 + ct * 7) * unit);
    const corkY = by - Math.round((3 + Math.sin(ct * Math.PI) * 6) * unit);
    drawSprite(L, sprites.cork, corkX, corkY, unit);
  }

  // Shore gulls & recurring red crab
  creatures.drawLandCast(L, SCENE_BEACH, w, h, unit, sprites, pan, py);

  // Layer 5: Foreground swaying dune grass tufts at bottom corners
  drawDuneTufts(L, w, h, unit, time, pan * LAYER_PARALLAX[4]);

  tintLand(L, w, h, state);
  S.drawImage(buffers.land.canvas, 0, 0);

  // Post-tint glows: distant lighthouse night lamp / click sweep + sky gulls + bottle note
  const boost = clamp01(interactions.lighthouseBoost / 1.5);
  if (day <= 0.7 || boost > 0.05) {
    const beam = Math.max(
      day <= 0.7 ? Math.max(0, Math.sin((time / 5) * Math.PI * 2)) ** 8 * (1 - day / 0.7) : 0,
      boost * Math.max(0, Math.sin(interactions.lighthouseSweepAngle)),
    );
    S.fillStyle = `rgba(255,232,170,${(0.5 + 0.5 * Math.max(beam, boost)).toFixed(3)})`;
    S.fillRect(lhX, lhTop - 1, 2, 1);
    if (beam >= 0.05) {
      const r = w * 0.12 * beam;
      const g = S.createRadialGradient(lhX + 1, lhTop - 1, 0, lhX + 1, lhTop - 1, r);
      g.addColorStop(0, `rgba(255,232,170,${(0.45 * beam).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,232,170,0)');
      S.fillStyle = g;
      S.fillRect(lhX + 1 - r, lhTop - 1 - r * 0.25, r * 2, r * 0.5);
    }
  }

  creatures.drawSkyGulls(S, day, time, w, h, pan);
  drawBottleNote(S, w, h, unit, interactions.bottle, pan);
}

/** Renders Scene 1: Fishing Harbour (wooden pier, 3 rocking boats, nets, crates, harbour cat, lamps, red crab). */
export function renderHarbourScene(
  rc: SceneRenderContext,
  buffers: SceneBuffers,
  sprites: SeasideSprites,
  creatures: SeasideCreatures,
): void {
  const { w, h, unit, time, state, px, py, cameraShiftX, interactions } = rc;
  const { sky, sun, moon, day } = state;
  const S = buffers.scene.ctx;
  const L = buffers.land.ctx;
  S.clearRect(0, 0, w, h);
  L.clearRect(0, 0, w, h);

  const pan = px + cameraShiftX;
  const hy = Math.round(h * HORIZON);

  // Layer 2: Distant harbour breakwater wall on the right
  const bwX = Math.round(0.70 * w + pan * LAYER_PARALLAX[1]);
  const bwH = Math.max(2, Math.round(4 * unit));
  S.fillStyle = css(shade(mix(sky.horizon, sky.zenith, 0.45), 0.55));
  S.fillRect(bwX, hy - bwH, w - bwX + 10, bwH + 1);
  S.fillRect(bwX + Math.round(4 * unit), hy - bwH - Math.round(3 * unit), Math.max(2, Math.round(2 * unit)), Math.round(3 * unit));

  // Layer 3: Harbour open water & glitter
  drawOpenWater(S, w, h, unit, sky, day, time, 0.96, 1, 0.72, pan);
  drawGlitter(S, w, h, unit, sky, sun, moon, day, time, 0.85, pan);
  drawRipplesAndFish(S, w, h, unit, interactions.ripples, interactions.fishLeaps, sprites, sky, day);

  // Layer 4: Boats, wooden pier, pilings, nets, crates, lamps, cat, red crab, gulls
  const midPan = pan * LAYER_PARALLAX[2];
  const nearPan = pan * LAYER_PARALLAX[3];
  const nearY = py * 0.5;

  // Three rocking fishing boats
  const boatLightsPos: { x: number; y: number; sp: HTMLCanvasElement }[] = [];
  for (let i = 0; i < HARBOUR_BOAT_SPOTS.length; i++) {
    const spot = HARBOUR_BOAT_SPOTS[i];
    const bob = interactions.boatBobs[i];
    const extraBob = bob.age < bob.duration ? Math.sin((bob.age / bob.duration) * Math.PI * 3) * (1 - bob.age / bob.duration) * 3.5 * unit : 0;
    const rock = Math.sin(time * 1.4 + i * 2.1) * 1.1 * unit + extraBob;
    const sp = sprites.boats[i];
    const bx = Math.round(spot.u * w + midPan - (sp.width * unit) / 2);
    const by = Math.round(spot.v * h + rock - sp.height * unit);
    // Subtle dark hull reflection
    S.fillStyle = css(shade(sky.water, 0.6), 0.4);
    S.fillRect(bx + Math.round(3 * unit), Math.round(spot.v * h + rock), Math.round((sp.width - 6) * unit), Math.round(2 * unit));
    drawSprite(L, sp, bx, by, unit);
    boatLightsPos.push({ x: bx, y: by, sp: sprites.boatLights[i] });
  }

  // Wooden pier structure (left quay, right quay, back catwalk)
  drawPier(L, w, h, unit, time, nearPan, nearY);

  // Draped fishing nets along pier edges
  drawPierNets(L, w, h, unit, nearPan, nearY);

  // Crates on left and right pier
  drawSprite(L, sprites.crateStack, Math.round(0.125 * w + nearPan), Math.round(0.70 * h + nearY - sprites.crateStack.height * unit), unit);
  drawSprite(L, sprites.crate, Math.round(0.82 * w + nearPan - (sprites.crate.width * unit) / 2), Math.round(0.70 * h + nearY - sprites.crate.height * unit), unit);

  // Harbour lamp posts
  const lampGlows: { x: number; y: number }[] = [];
  for (const lu of LAMP_SPOTS) {
    const lx = Math.round(lu * w + nearPan - (sprites.lampPost.width * unit) / 2);
    const ly = Math.round(0.70 * h + nearY - sprites.lampPost.height * unit);
    drawSprite(L, sprites.lampPost, lx, ly, unit);
    lampGlows.push({ x: Math.round(lu * w + nearPan), y: ly + Math.round(2 * unit) });
  }

  // Harbour cat, red crab on right crate, perched gulls
  creatures.drawLandCast(L, SCENE_HARBOUR, w, h, unit, sprites, pan, py);

  // Layer 5: Foreground dock corners with bollards & coiled ropes
  const fgPan = pan * LAYER_PARALLAX[4];
  L.fillStyle = '#4a301d';
  L.fillRect(0, Math.round(h * 0.92), Math.round(w * 0.16 + fgPan), Math.round(h * 0.08));
  L.fillRect(Math.round(w * 0.84 + fgPan), Math.round(h * 0.92), Math.round(w * 0.18), Math.round(h * 0.08));
  L.fillStyle = '#6b472c';
  L.fillRect(0, Math.round(h * 0.92), Math.round(w * 0.16 + fgPan), Math.max(2, Math.round(2 * unit)));
  L.fillRect(Math.round(w * 0.84 + fgPan), Math.round(h * 0.92), Math.round(w * 0.18), Math.max(2, Math.round(2 * unit)));
  drawSprite(L, sprites.bollard, Math.round(0.08 * w + fgPan), Math.round(0.92 * h - sprites.bollard.height * unit), unit);
  drawSprite(L, sprites.bollard, Math.round(0.90 * w + fgPan), Math.round(0.92 * h - sprites.bollard.height * unit), unit);

  tintLand(L, w, h, state);
  S.drawImage(buffers.land.canvas, 0, 0);

  // Post-tint warm glows at dusk & night: cabin windows, harbour lamps, water reflections
  const lampPower = clamp01((0.68 - day) / 0.45);
  if (lampPower > 0.04) {
    for (const bl of boatLightsPos) {
      S.save();
      S.globalAlpha = lampPower * 0.95;
      drawSprite(S, bl.sp, bl.x, bl.y, unit);
      S.restore();
    }
    for (const lg of lampGlows) {
      const r = Math.round(14 * unit);
      const g = S.createRadialGradient(lg.x, lg.y, 0, lg.x, lg.y, r);
      g.addColorStop(0, `rgba(255,216,120,${(0.65 * lampPower).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,190,80,0)');
      S.fillStyle = g;
      S.fillRect(lg.x - r, lg.y - r, r * 2, r * 2);
      S.fillStyle = `rgba(255,238,168,${lampPower.toFixed(3)})`;
      S.fillRect(lg.x - 1, lg.y - 1, Math.max(2, Math.round(2 * unit)), Math.max(2, Math.round(2 * unit)));

      // Warm shimmer column on the harbour water below each lamp
      S.fillStyle = `rgba(255,204,104,${(0.35 * lampPower).toFixed(3)})`;
      for (let sy = 0; sy < 7; sy++) {
        const wy = Math.round(0.75 * h + sy * 4 * unit);
        const shift = Math.round(Math.sin(time * 2.2 + sy + lg.x) * 2 * unit);
        S.fillRect(lg.x - Math.round(2 * unit) + shift, wy, Math.max(2, Math.round((4 - sy * 0.3) * unit)), 1);
      }
    }
  }

  creatures.drawSkyGulls(S, day, time, w, h, pan);
}

function drawPier(L: CanvasRenderingContext2D, w: number, h: number, unit: number, time: number, panX: number, panY: number): void {
  const deckY = Math.round(0.70 * h + panY);
  const deckH = Math.max(4, Math.round(6 * unit));
  const leftEnd = Math.round(0.37 * w + panX);
  const rightStart = Math.round(0.63 * w + panX);

  // Far connecting catwalk behind central bay
  L.fillStyle = '#5e3d26';
  L.fillRect(leftEnd - 2, Math.round(0.665 * h + panY), rightStart - leftEnd + 4, Math.max(2, Math.round(3 * unit)));

  // Pilings into water
  const pilings = [0.06, 0.16, 0.27, 0.35, 0.65, 0.74, 0.85, 0.94];
  const pw = Math.max(3, Math.round(4 * unit));
  const pTall = Math.round(18 * unit);
  for (const pu of pilings) {
    const px = Math.round(pu * w + panX);
    L.fillStyle = '#472f1e';
    L.fillRect(px, deckY + deckH - 1, pw, pTall);
    L.fillStyle = '#6e492f';
    L.fillRect(px, deckY + deckH - 1, 1, pTall);
    // Mossy waterline band + subtle water ripple
    L.fillStyle = '#3f5932';
    L.fillRect(px, deckY + deckH + pTall - Math.round(4 * unit), pw, Math.round(3 * unit));
    const rippleShift = Math.round(Math.sin(time * 1.8 + pu * 12) * unit);
    L.fillStyle = 'rgba(210,235,245,0.45)';
    L.fillRect(px - 2 + rippleShift, deckY + deckH + pTall - 1, pw + 4, 1);
  }

  // Main wooden pier planks (left & right wings)
  for (const [x0, x1] of [[0, leftEnd], [rightStart, w]] as const) {
    L.fillStyle = '#875b38';
    L.fillRect(x0, deckY, x1 - x0, deckH);
    L.fillStyle = '#ad7b50';
    L.fillRect(x0, deckY, x1 - x0, Math.max(1, Math.round(2 * unit)));
    L.fillStyle = '#573922';
    L.fillRect(x0, deckY + deckH - 1, x1 - x0, 1);
    for (let px = x0; px < x1; px += Math.max(4, Math.round(6 * unit))) {
      L.fillRect(px, deckY, 1, deckH);
    }
  }
}

function drawPierNets(L: CanvasRenderingContext2D, w: number, h: number, unit: number, panX: number, panY: number): void {
  const y0 = Math.round(0.705 * h + panY);
  const netSpan = Math.round(18 * unit);
  for (const nu of [0.28, 0.72]) {
    const x0 = Math.round(nu * w + panX);
    L.fillStyle = '#36586b';
    for (let dx = 0; dx < netSpan; dx += 2) {
      const sag = Math.round(Math.sin((dx / netSpan) * Math.PI) * 7 * unit);
      L.fillRect(x0 + dx, y0, 1, sag + 2);
      if (dx % 4 === 0) {
        L.fillStyle = '#597f94';
        L.fillRect(x0 + dx, y0 + Math.max(1, Math.floor(sag * 0.5)), 2, 1);
        L.fillStyle = '#36586b';
      }
    }
  }
}

function drawDuneTufts(L: CanvasRenderingContext2D, w: number, h: number, unit: number, time: number, fgPan: number): void {
  const spots = [0.03, 0.06, 0.10, 0.90, 0.94, 0.97];
  for (const su of spots) {
    const bx = Math.round(su * w + fgPan);
    const sway = Math.round(Math.sin(time * 1.4 + su * 20) * 2 * unit);
    for (let b = -2; b <= 2; b++) {
      const bladeH = Math.round((8 + ((Math.abs(b) + Math.round(su * 10)) % 3) * 3) * unit);
      L.fillStyle = b % 2 === 0 ? '#3f6336' : '#568046';
      for (let y = 0; y < bladeH; y++) {
        const lean = Math.round((y / bladeH) * (b * 1.3 + sway));
        L.fillRect(bx + b * Math.round(2 * unit) + lean, h - y - 1, Math.max(1, Math.round(unit)), 1);
      }
    }
  }
}
