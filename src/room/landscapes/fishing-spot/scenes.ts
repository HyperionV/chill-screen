import { css, mix, shade, type RGB } from '../../../render/color';
import { fbm, hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import { drawBoxBottom, type FishingCreatures } from './creatures';
import { anchorsForScene, type FishingInteractions } from './interactions';
import type { FishingSprites, SpriteBox } from './sprites';
import { HORIZON, WATER_TOP, type SceneIndex, type SceneLayout } from './types';

const WHITE: RGB = [255, 255, 255];
const PLANK_LIT: RGB = [152, 114, 78];
const PLANK_MID: RGB = [118, 86, 58];
const PLANK_DARK: RGB = [76, 54, 36];
const PILING: RGB = [68, 48, 34];
const PILING_SHADE: RGB = [44, 32, 22];

function drawScaled(
  ctx: CanvasRenderingContext2D,
  sp: SpriteBox,
  dx: number,
  dy: number,
  unit: number,
): void {
  const sw = Math.max(1, Math.round(sp.w * unit));
  const sh = Math.max(1, Math.round(sp.h * unit));
  ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(dx * unit), Math.round(dy * unit), sw, sh);
}

/** Draws a timber fishing rod extending from `(x0, y0)` to `(x1, y1)` with optional bend. */
function drawRod(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  unit: number,
): void {
  const dot = Math.max(1, Math.round(unit));
  ctx.fillStyle = '#4e3522';
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const rx = x0 + (x1 - x0) * k;
    const ry = y0 + (y1 - y0) * k + k * k * bend;
    ctx.fillRect(Math.round(rx * unit), Math.round(ry * unit), dot, dot);
  }
}

/** Renders backdrop ridges, water layers, five scene compositions, props, cast, and foreground framing. */
export class FishingScenes {
  private ridgeTops = new Int16Array(0);
  private w = 0;
  private h = 0;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.ridgeTops = new Int16Array(w);
    const hy = h * HORIZON;
    const reach = h * 0.065;
    for (let x = 0; x < w; x++) {
      this.ridgeTops[x] = Math.round(hy - (0.2 + 0.8 * fbm(x * 0.008 + 4.2)) * reach);
    }
  }

  /** Computes the horizontal position of Scene 2's drifting rowboat in design pixels. */
  rowboatX(time: number, layout: SceneLayout): number {
    return layout.rightZone + 32 + Math.sin(time * 0.16) * 14;
  }

  /** Layer 1 & 2: distant misty shoreline ridges, far pines, mid trees, and distant boathouse. */
  drawBackdrop(
    L: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    parallaxX: number,
    time: number,
  ): void {
    const u = layout.unit;
    const hy = Math.round(this.h * HORIZON);
    const waterTop = Math.round(this.h * WATER_TOP);
    const ridgeCol = css(mix(mix([68, 92, 96], state.sky.horizon, 0.58), state.sky.zenith, 0.15));
    const bankCol = css(mix([54, 80, 62], state.sky.horizon, 0.35));

    const farShift = Math.round(parallaxX * 1.5 * u);
    const midShift = Math.round(parallaxX * 3.0 * u);

    // Distant ridge silhouette (kept low-contrast under the clock band)
    L.fillStyle = ridgeCol;
    for (let x = 0; x < this.w; x++) {
      const sx = Math.max(0, Math.min(this.w - 1, x - farShift));
      const top = this.ridgeTops[sx] ?? hy;
      L.fillRect(x, top, 1, waterTop - top + 1);
    }

    // Distant pine silhouettes along the far ridge
    const pineStep = Math.round(22 * u);
    for (let px = -pineStep; px < this.w + pineStep; px += pineStep) {
      const seed = Math.round(px * 13 + scene * 31);
      if (hash(seed) < 0.32) continue;
      const sx = px + farShift + Math.round((hash(seed + 1) - 0.5) * 8 * u);
      const sp = sprites.farPines[Math.floor(hash(seed + 2) * sprites.farPines.length)];
      if (!sp) continue;
      const baseY = (this.ridgeTops[Math.max(0, Math.min(this.w - 1, sx))] ?? hy) + Math.round(4 * u);
      L.save();
      L.globalAlpha = 0.45;
      L.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(sx - (sp.w * u) / 2), Math.round(baseY - sp.h * u), Math.round(sp.w * u), Math.round(sp.h * u));
      L.restore();
    }

    // Mid-distance far shore strip & lakeside trees
    L.fillStyle = bankCol;
    L.fillRect(0, waterTop - Math.round(3 * u), this.w, Math.round(5 * u));

    const treeStep = Math.round(46 * u);
    for (let tx = 0; tx < this.w + treeStep; tx += treeStep) {
      const seed = tx * 17 + scene * 73;
      if (hash(seed) < 0.35) continue;
      const sx = tx + midShift + Math.round((hash(seed + 1) - 0.5) * 14 * u);
      const sp = sprites.midTrees[Math.floor(hash(seed + 2) * sprites.midTrees.length)];
      if (!sp) continue;
      const sway = Math.round(Math.sin(time * 0.6 + tx * 0.03) * 0.8 * u);
      const sw = Math.round(sp.w * u * 0.85);
      const sh = Math.round(sp.h * u * 0.85);
      L.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(sx - sw / 2) + sway, waterTop - sh + Math.round(2 * u), sw, sh);
    }

    // Distant boathouse on the far shore in Scenes 0 and 4
    if (scene === 0 || scene === 4) {
      const bx = (layout.rightZone + 54) * u + midShift;
      const by = waterTop - Math.round((sprites.boathouse.h - 2) * u);
      L.drawImage(
        sprites.boathouse.canvas,
        0,
        0,
        sprites.boathouse.w,
        sprites.boathouse.h,
        Math.round(bx),
        by,
        Math.round(sprites.boathouse.w * u),
        Math.round(sprites.boathouse.h * u),
      );
    }
  }

  /** Layer 3: layered lake water, wave dashes, sun/moon glitter, and star reflections. */
  drawWater(
    L: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    parallaxX: number,
  ): void {
    const u = layout.unit;
    const top = Math.round(this.h * WATER_TOP);
    const bot = this.h;
    const span = Math.max(1, bot - top);

    const eveningWarm = scene === 3 ? 0.28 : 0;
    const nightCalm = scene === 4 ? 0.25 : 0;
    let topCol = mix(state.sky.horizon, state.sky.water, 0.48);
    let deepCol = shade(state.sky.water, 0.72);
    if (eveningWarm > 0) {
      topCol = mix(topCol, [214, 134, 88], eveningWarm * 0.65);
      deepCol = mix(deepCol, [78, 56, 76], eveningWarm * 0.55);
    }
    if (nightCalm > 0) {
      topCol = mix(topCol, [24, 34, 62], nightCalm);
      deepCol = mix(deepCol, [12, 18, 38], nightCalm);
    }

    const g = L.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, css(topCol));
    g.addColorStop(0.32, css(mix(topCol, deepCol, 0.55)));
    g.addColorStop(1, css(deepCol));
    L.fillStyle = g;
    L.fillRect(0, top, this.w, span);

    // Subtle shoreline reflection band
    const shoreReflect = css(mix(topCol, [46, 68, 58], 0.5), 0.35);
    L.fillStyle = shoreReflect;
    L.fillRect(0, top, this.w, Math.round(8 * u));

    // Gentle horizontal pixel wave dashes
    const crest = css(mix(topCol, WHITE, 0.14 + 0.16 * state.day), 0.34 + 0.2 * state.day);
    const trough = css(shade(deepCol, 0.78), 0.45);
    const pShift = parallaxX * 3.5 * u;
    for (let y = top + 3; y < bot; y += Math.max(2, Math.round(2 * u))) {
      const f = (y - top) / span;
      const spacing = (14 + 34 * f * f) * u;
      const len = Math.max(2, Math.round((2 + 8 * f * f) * u));
      const drift = (hash(y) - 0.5) * 2.4 * u;
      const count = Math.ceil(this.w / spacing) + 1;
      for (let j = 0; j < count; j++) {
        const seed = y * 131 + j;
        if (Math.sin(time * (0.45 + hash(seed) * 0.55) + hash(seed + 0.3) * 6.28) < 0.25) continue;
        const x = (((((j + hash(seed + 0.7)) * spacing + time * drift + pShift * (0.4 + f)) % this.w) + this.w) % this.w);
        L.fillStyle = hash(seed + 0.9) < 0.4 ? trough : crest;
        L.fillRect(Math.round(x), y, len, Math.max(1, Math.round(u)));
      }
    }

    // Sun or moon glitter path
    const body = state.sun.up > -0.02 ? state.sun : state.moon;
    if (body.up > -0.02) {
      const isSun = state.sun.up > -0.02;
      const strength = isSun ? 0.55 : 0.45 * (1 - state.day);
      const col = isSun ? mix(state.sky.light, WHITE, 0.5) : ([216, 226, 252] satisfies RGB);
      const cx = body.u * this.w + pShift * 0.5;
      L.save();
      L.fillStyle = css(col);
      for (let i = 0; i < 42; i++) {
        const period = 0.9 + hash(i) * 1.1;
        const clk = time / period + hash(i + 0.5);
        const n = Math.floor(clk);
        const seed = i * 7919 + n * 104729;
        const f = hash(seed) ** 0.85;
        const gy = Math.round(top + 2 + (span - 8) * f * f);
        const spread = this.w * (0.015 + 0.09 * f);
        const gx = cx + (hash(seed + 1) + hash(seed + 2) - 1) * spread;
        const glen = Math.max(2, Math.round((1 + 4 * f) * u));
        L.globalAlpha = Math.sin(Math.PI * (clk - n)) ** 2 * strength;
        L.fillRect(Math.round(gx - glen / 2), gy, glen, Math.max(1, Math.round(u)));
      }
      L.restore();
    }

    // Reflected stars on calm water at night or in Scene 4 (Night Fishing)
    const starShow = scene === 4 ? Math.max(0.55, 1 - state.day) : Math.max(0, 1 - state.day * 1.3);
    if (starShow > 0.08) {
      const dot = Math.max(1, Math.round(u));
      for (let i = 0; i < 28; i++) {
        const sx = Math.round(hash(i * 41 + 3) * this.w + pShift * 0.5);
        const sy = Math.round(top + 6 * u + hash(i * 41 + 7) * (span * 0.52));
        const tw = 0.45 + 0.55 * Math.sin(time * (1.2 + hash(i) * 1.4) + i);
        L.fillStyle = `rgba(226,236,255,${(0.45 * starShow * tw).toFixed(3)})`;
        L.fillRect(sx, sy, dot, dot);
        if (tw > 0.72) L.fillRect(sx, sy + dot * 2, dot, dot);
      }
    }
  }

  /** Layer 4: wooden structures, scene props, recurring angler + dog, birds, and fishing line. */
  drawSceneMidground(
    L: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    interactions: FishingInteractions,
    creatures: FishingCreatures,
    parallaxX: number,
  ): void {
    const u = layout.unit;
    const shift = parallaxX * 5.5;
    L.save();
    L.translate(Math.round(shift * u), 0);

    // Draw underwater shadows and water rings before pier/jetty structures
    creatures.drawFishShadows(L, scene, u, state.day);
    interactions.drawRings(L, u, state.day);

    const anchors = anchorsForScene(scene, layout);
    const dogFrame = Math.floor(time * 3.8) % 2 === 0;
    const dogAlert = interactions.dogAlert > 0.35;

    if (scene === 0) {
      this.drawJetty(L, 0, layout.jettyRight, layout.deckY, u, [22, 68, 114, layout.jettyRight - 14]);
      drawBoxBottom(L, sprites.tackleBox, 56, layout.deckY, u);
      drawBoxBottom(L, sprites.thermos, 72, layout.deckY, u);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.anglerCast.right, layout.jettyRight - 42, layout.deckY, u);
      drawRod(L, layout.jettyRight - 36, layout.deckY - 12, anchors.rodTipX, anchors.rodTipY, 1.5, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);
    } else if (scene === 1) {
      this.drawReedShallows(L, sprites, layout, u, time);
      this.drawJetty(L, 12, 116, layout.deckY + 2, u, [24, 68, 108]);
      // Backrest post for the napping angler
      this.drawPost(L, 48, layout.deckY + 2, 22, u);
      drawBoxBottom(L, sprites.anglerNap, 58, layout.deckY + 2, u);
      drawRod(L, 64, layout.deckY - 4, anchors.rodTipX, anchors.rodTipY, 0.5, u);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      const dogSp = dogAlert
        ? dogFrame
          ? sprites.dogLookA
          : sprites.dogLookB
        : Math.sin(time * 1.4) > 0
          ? sprites.dogRestA
          : sprites.dogRestB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);
      // Weathered post on right for kingfisher
      this.drawPost(L, layout.rightZone + 34, 214, 30, u);
    } else if (scene === 2) {
      this.drawJetty(L, 8, 130, layout.deckY + 4, u, [18, 66, 120]);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.anglerReel.right, 94, layout.deckY + 4, u);
      drawRod(L, 100, layout.deckY - 6, anchors.rodTipX, anchors.rodTipY, 3.8, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);

      // Morning rowboat with second angler
      const bx = this.rowboatX(time, layout);
      const by = 188 + Math.sin(time * 1.5) * 0.8;
      drawBoxBottom(L, sprites.secondAngler, bx - 4, by - 5, u);
      drawBoxBottom(L, sprites.rowboat, bx, by, u);
      // Oar dipping into water
      drawRod(L, bx + 2, by - 7, bx + 16, by + 2, 0.5, u);
      L.fillStyle = 'rgba(235,248,255,0.42)';
      L.fillRect(Math.round((bx - 24) * u), Math.round(by * u), Math.round(48 * u), Math.max(1, Math.round(u)));
    } else if (scene === 3) {
      this.drawJetty(L, 0, layout.jettyRight, layout.deckY, u, [28, Math.round(layout.jettyRight * 0.56), layout.jettyRight - 8]);
      // Tall pier posts & right mooring posts for gulls
      const postXs = [28, Math.round(layout.jettyRight * 0.56), layout.jettyRight - 8];
      for (const px of postXs) this.drawPost(L, px, layout.deckY, 14, u);
      this.drawPost(L, layout.rightZone + 36, 214, 28, u);
      this.drawPost(L, layout.rightZone + 110, 216, 30, u);

      // Lanterns mounted on posts (warm housing drawn pre-tint, glow drawn post-tint)
      drawScaled(L, sprites.lantern, 24, layout.deckY - 12, u);
      drawScaled(L, sprites.lantern, layout.jettyRight - 12, layout.deckY - 12, u);
      drawScaled(L, sprites.lantern, layout.rightZone + 32, 190, u);

      // Bucket brimming with caught fish + catch tally + camp stove + cooking angler + eager dog
      drawBoxBottom(L, sprites.bucketFull, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.stove, layout.jettyRight - 58, layout.deckY, u);
      drawBoxBottom(L, sprites.anglerCook, layout.jettyRight - 36, layout.deckY, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);

      // Gentle steam wisps rising from the skillet
      const steamX = Math.round((layout.jettyRight - 60) * u);
      const steamY = Math.round((layout.deckY - 14) * u);
      const dot = Math.max(1, Math.round(u));
      L.fillStyle = 'rgba(242,240,232,0.45)';
      for (let i = 0; i < 3; i++) {
        const lift = ((time * 5 + i * 4) % 10) * u;
        const sway = Math.sin(time * 2 + i) * 1.5 * u;
        L.fillRect(Math.round(steamX + sway + i * dot), Math.round(steamY - lift), dot, dot * 2);
      }
    } else {
      // Scene 4: Night Fishing
      this.drawJetty(L, 0, layout.jettyRight - 6, layout.deckY, u, [24, 72, 124, layout.jettyRight - 16]);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.anglerLantern, layout.jettyRight - 38, layout.deckY + 6, u);
      drawRod(L, layout.jettyRight - 32, layout.deckY - 4, anchors.rodTipX, anchors.rodTipY, 1.2, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);
      drawBoxBottom(L, sprites.lantern, layout.jettyRight - 18, layout.deckY, u);
    }

    // Birds and active cast fishing line
    creatures.drawBirds(L, sprites, scene, time, u);
    interactions.drawFishingLine(L, sprites, scene, layout, time);

    L.restore();
  }

  /** Draws post-tint lantern glows, warm water pools, and evening sunset haze so lights shine warmly. */
  drawPostTintGlows(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    parallaxX: number,
  ): void {
    const u = layout.unit;
    const shift = Math.round(parallaxX * 5.5 * u);

    if (scene === 3) {
      const spots = [
        { x: 28, y: layout.deckY - 7 },
        { x: layout.jettyRight - 8, y: layout.deckY - 7 },
        { x: layout.rightZone + 36, y: 195 },
      ];
      const strength = 0.6 + 0.4 * (1 - state.day);
      for (const s of spots) {
        this.drawLanternHalo(ctx, s.x * u + shift, s.y * u, 16 * u, strength, time + s.x);
      }
      // Small ember glow under camp stove
      this.drawLanternHalo(ctx, (layout.jettyRight - 58) * u + shift, (layout.deckY - 3) * u, 10 * u, 0.7, time * 1.4);
    } else if (scene === 4) {
      const lx = (layout.jettyRight - 18) * u + shift;
      const ly = (layout.deckY - 6) * u;
      const strength = Math.max(0.75, 1 - state.day * 0.4);
      this.drawLanternHalo(ctx, lx, ly, 26 * u, strength, time);

      // Warm golden light pool reflected on the water beneath the jetty end
      const pulse = 0.88 + 0.12 * Math.sin(time * 2.1);
      const dot = Math.max(1, Math.round(u));
      ctx.fillStyle = `rgba(255,198,92,${(0.24 * strength * pulse).toFixed(3)})`;
      for (let row = 0; row < 12; row++) {
        const wy = Math.round((layout.deckY + 8 + row * 3.5) * u);
        const halfW = Math.round((12 + row * 1.2 + Math.sin(time * 2.4 + row) * 2) * u);
        ctx.fillRect(Math.round(lx - halfW), wy, halfW * 2, dot);
      }
    }
  }

  private drawLanternHalo(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    strength: number,
    phase: number,
  ): void {
    const flicker = 0.92 + 0.08 * Math.sin(phase * 3.2);
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, `rgba(255,228,136,${(0.55 * strength * flicker).toFixed(3)})`);
    g.addColorStop(0.45, `rgba(255,176,72,${(0.24 * strength * flicker).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.round(r * 2));
  }

  /** Layer 5: foreground corner reed silhouettes (clear of clock and radio). */
  drawForeground(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    layout: SceneLayout,
    time: number,
    parallaxX: number,
  ): void {
    const u = layout.unit;
    const shift = Math.round(parallaxX * 8.5 * u);
    const bot = this.h;
    ctx.save();
    ctx.globalAlpha = 0.72 + 0.2 * (1 - state.day);

    // Far bottom-left and bottom-right corner reed tufts (strictly outside 0.39w..0.62w radio zone)
    const corners = [
      { x: 6, idx: 0 },
      { x: 20, idx: 2 },
      { x: layout.designW - 24, idx: 1 },
      { x: layout.designW - 10, idx: 0 },
    ];
    for (const c of corners) {
      const sp = sprites.reeds[c.idx];
      if (!sp) continue;
      const sway = Math.round(Math.sin(time * 1.4 + c.x * 0.05) * 1.4 * u);
      const sw = Math.round(sp.w * u * 1.15);
      const sh = Math.round(sp.h * u * 1.15);
      ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(c.x * u - sw / 2) + shift + sway, bot - sh + Math.round(4 * u), sw, sh);
    }
    ctx.restore();
  }

  private drawJetty(
    L: CanvasRenderingContext2D,
    startX: number,
    endX: number,
    deckY: number,
    u: number,
    pilings: readonly number[],
  ): void {
    const sx = Math.round(startX * u);
    const ex = Math.round(endX * u);
    const dy = Math.round(deckY * u);
    const w = Math.max(4, ex - sx);
    const deckH = Math.max(3, Math.round(5 * u));

    // Submerged shadow & pilings
    for (const px of pilings) {
      const x = Math.round(px * u);
      const pw = Math.max(2, Math.round(4 * u));
      const ph = Math.round(28 * u);
      L.fillStyle = css(PILING);
      L.fillRect(x - Math.floor(pw / 2), dy + deckH - 1, pw, ph);
      L.fillStyle = css(PILING_SHADE);
      L.fillRect(x, dy + deckH - 1, Math.max(1, Math.floor(pw / 2)), ph);
      // Waterline ripple around piling
      L.fillStyle = 'rgba(220,242,250,0.42)';
      L.fillRect(x - pw, dy + ph - Math.round(2 * u), pw * 2, Math.max(1, Math.round(u)));
    }

    // Timber crossbeam & plank deck
    L.fillStyle = css(PLANK_DARK);
    L.fillRect(sx, dy + deckH - Math.max(1, Math.round(2 * u)), w, Math.max(2, Math.round(3 * u)));
    L.fillStyle = css(PLANK_MID);
    L.fillRect(sx, dy, w, deckH - Math.max(1, Math.round(u)));
    L.fillStyle = css(PLANK_LIT);
    L.fillRect(sx, dy, w, Math.max(1, Math.round(u)));

    // Plank seam ticks
    const step = Math.max(4, Math.round(7 * u));
    L.fillStyle = css(PLANK_DARK);
    for (let x = sx + step; x < ex - 2; x += step) {
      L.fillRect(x, dy, Math.max(1, Math.round(u)), Math.max(2, Math.round(2.5 * u)));
    }
  }

  private drawPost(L: CanvasRenderingContext2D, xDesign: number, baseY: number, height: number, u: number): void {
    const x = Math.round(xDesign * u);
    const pw = Math.max(2, Math.round(4 * u));
    const ph = Math.round(height * u);
    const top = Math.round(baseY * u) - ph;
    L.fillStyle = css(PILING);
    L.fillRect(x - Math.floor(pw / 2), top, pw, ph);
    L.fillStyle = css(PILING_SHADE);
    L.fillRect(x, top, Math.max(1, Math.floor(pw / 2)), ph);
    L.fillStyle = css(PLANK_LIT);
    L.fillRect(x - Math.floor(pw / 2), top, pw, Math.max(1, Math.round(u)));
  }

  private drawReedShallows(
    L: CanvasRenderingContext2D,
    sprites: FishingSprites,
    layout: SceneLayout,
    u: number,
    time: number,
  ): void {
    // Shallow sandy shoal edge on the right and left
    L.fillStyle = 'rgba(136,128,88,0.45)';
    L.fillRect(Math.round((layout.rightZone + 24) * u), Math.round(202 * u), Math.round(140 * u), Math.round(26 * u));

    // Floating lily pads (clear of the radio area)
    const pads = [
      { x: 136, y: 196, bloom: 1 },
      { x: 158, y: 204, bloom: 0 },
      { x: 146, y: 214, bloom: 0 },
      { x: layout.rightZone + 10, y: 202, bloom: 1 },
      { x: layout.rightZone + 32, y: 212, bloom: 0 },
      { x: layout.rightZone + 56, y: 222, bloom: 1 },
    ];
    for (const p of pads) {
      const sp = sprites.lilyPads[p.bloom];
      if (!sp) continue;
      const bob = Math.sin(time * 1.4 + p.x * 0.1) * 0.4;
      drawBoxBottom(L, sp, p.x, p.y + bob, u);
    }

    // Swaying reed clumps along left bank & right shallows
    const reedSpots = [
      { x: 10, y: 208, idx: 0 },
      { x: 24, y: 216, idx: 1 },
      { x: 38, y: 212, idx: 2 },
      { x: layout.rightZone + 22, y: 206, idx: 1 },
      { x: layout.rightZone + 44, y: 216, idx: 0 },
      { x: layout.rightZone + 66, y: 210, idx: 2 },
      { x: layout.rightZone + 84, y: 222, idx: 1 },
      { x: layout.rightZone + 118, y: 214, idx: 0 },
      { x: layout.rightZone + 136, y: 220, idx: 2 },
    ];
    for (const r of reedSpots) {
      const sp = sprites.reeds[r.idx];
      if (!sp) continue;
      const sway = Math.sin(time * 1.5 + r.x * 0.04) * 1.2;
      drawBoxBottom(L, sp, r.x + sway, r.y, u);
    }
  }
}
