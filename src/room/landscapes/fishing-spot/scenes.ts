import { memoryCanvas } from '../../../render/pixel-stage';
import type { SkyState } from '../../sky';
import { breeze, gust } from '../../wind';
import { drawBoxBottom, type FishingCreatures } from './creatures';
import { FarShore } from './far-shore';
import { anchorsForScene, type FishingInteractions } from './interactions';
import { LakeLights } from './lake-lights';
import { NearShore } from './near-shore';
import type { FishingSprites, SpriteBox } from './sprites';
import { buildSceneFlora, drawJetty, drawMooredSkiff, drawPost, drawRod, drawSceneFlora } from './structures';
import type { SceneIndex, SceneLayout } from './types';
import { FishingWater } from './water';
import { drawWindSprite, FOREGROUND_REED_SWAY, lanternBend } from './wind-sprites';

function drawHangingLantern(
  ctx: CanvasRenderingContext2D,
  sp: SpriteBox,
  dx: number,
  dy: number,
  time: number,
  unit: number,
  scale = 1,
): void {
  const sw = Math.max(1, Math.round(sp.w * unit * scale));
  const sh = Math.max(1, Math.round(sp.h * unit * scale));
  const bend = lanternBend(time, dx + sp.w * scale / 2);
  drawWindSprite(ctx, sp, Math.round(dx * unit), Math.round(dy * unit), sw, sh, bend, true);
}

const DECK_FIRST_ROW = 202;
const DECK_CACHE_ROWS = 54;
const SKIFF_LANDING_ROW = 193;
const ROWBOAT_MOORING_ROW = 222;
const DINGHY_LAMP_SCALE = 0.25;
/** Maximum pixel travel at the sail tip and at the end of the overhanging leaves. */
const SAIL_SWAY = 2;
const CORNER_LEAF_SWAY = 2;
/** A few pixels of stove steam rise and bend away from the pot. */
const STEAM_PUFFS = 3;
const STEAM_RISE = 10;
const STEAM_SPEED = 5;
const STEAM_SWAY = 3;
const STEAM_FADE_PORTION = 0.25;
/** Loose leaves fall from the upper branch and drift across the top corner. */
const AIR_LEAF_COUNT = 3;
const AIR_LEAF_X = 12;
const AIR_LEAF_Y = 11;
const AIR_LEAF_SPACING = 6;
const AIR_LEAF_LIFETIME = 8;
const AIR_LEAF_FALL = 27;
const AIR_LEAF_DRIFT = 21;
const AIR_LEAF_GUST_DRIFT = 15;
const AIR_LEAF_FLUTTER = 2;
const AIR_LEAF_OPACITY = 0.45;

function buildDecks(layout: SceneLayout): HTMLCanvasElement[] {
  const j = layout.jettyRight;
  const d = layout.deckY;
  const pierPost = Math.round(j * 0.56);
  const sections = [
    { start: 0, end: j, y: d, posts: [20, 64, 112, j - 14] },
    { start: 12, end: 118, y: d + 2, posts: [24, 68, 110] },
    { start: 8, end: 132, y: d + 4, posts: [18, 66, 120] },
    { start: 0, end: j, y: d, posts: [28, pierPost, j - 8] },
    { start: 0, end: j - 6, y: d, posts: [24, 72, 124, j - 16] },
  ];
  return sections.map(({ start, end, y, posts }) => {
    const { canvas, ctx } = memoryCanvas(Math.ceil(Math.max(1, end)), DECK_CACHE_ROWS);
    ctx.translate(0, -DECK_FIRST_ROW);
    drawJetty(ctx, start, end, y, 1, posts.filter((x) => x >= start && x <= end).sort((a, b) => a - b));
    return canvas;
  });
}

/** Renders the lake, shorelines and five scene compositions. */
export class FishingScenes {
  private readonly water = new FishingWater();
  private readonly farShore = new FarShore();
  private readonly nearShore = new NearShore();
  private readonly lights = new LakeLights();
  private decks: HTMLCanvasElement[] = [];
  private flora: ReturnType<typeof buildSceneFlora> = [];
  private corners: { x: number; idx: number; s: number }[] = [];
  private h = 0;

  resize(w: number, h: number, layout: SceneLayout, sprites: FishingSprites): void {
    this.h = h;
    this.water.resize(w, h, layout);
    this.farShore.resize(layout, sprites);
    this.nearShore.resize(layout, sprites);
    this.decks = buildDecks(layout);
    this.flora = buildSceneFlora(layout);
    this.corners = [
      { x: 6, idx: 0, s: 1.2 },
      { x: 20, idx: 2, s: 1.1 },
      { x: 34, idx: 3, s: 0.95 },
      { x: layout.designW - 36, idx: 3, s: 0.95 },
      { x: layout.designW - 22, idx: 1, s: 1.12 },
      { x: layout.designW - 8, idx: 0, s: 1.2 },
    ];
  }

  stepWind(time: number, dt: number): void {
    this.water.stepMist(time, dt);
  }

  /** Computes the horizontal position of Scene 2's drifting rowboat in design pixels. */
  rowboatX(time: number, layout: SceneLayout): number {
    return layout.rightZone + 32 + Math.sin(time * 0.16) * 14;
  }

  drawBackdrop(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
  ): void {
    this.farShore.draw(ctx, state, scene, layout, time);
  }

  /** Layer 3: layered lake water, shore reflections, wave dashes, sun/moon glitter, and distant sailing dinghy. */
  drawWater(
    L: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
  ): void {
    this.water.drawWater(L, state, scene, layout, time);
    this.farShore.drawReflection(L, scene, layout, time);
    this.nearShore.draw(L, layout, scene, time);

    // Distant sailing dinghy slowly tacking across the far lake (below the clock band)
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));
    const minX = layout.designW * 0.24;
    const maxX = layout.designW * 0.74;
    const span = Math.max(40, maxX - minX);
    const period = span * 2;
    const pos = ((time * 2.2 + 65) % period + period) % period;
    const dir = pos <= span ? 1 : -1;
    const dx = dir === 1 ? minX + pos : maxX - (pos - span);
    const dy = layout.waterTopY + 14 + Math.sin(time * 1.2) * 0.4;
    const sp = dir === 1 ? sprites.sailingDinghy.right : sprites.sailingDinghy.left;
    const sw = Math.max(1, Math.round(sp.w * u));
    const sh = Math.max(1, Math.round(sp.h * u));
    const sail = Math.round(breeze(time, dx) * SAIL_SWAY);
    L.save();
    L.globalAlpha = 0.82;
    drawWindSprite(L, sp, Math.round(dx * u - sw / 2), Math.round(dy * u - sh), sw, sh, sail);
    L.restore();
    if (state.day < 0.38) {
      const lampY = dy - sp.h;
      const halo = sprites.haloEmber;
      const haloWidth = Math.max(1, Math.round(halo.w * DINGHY_LAMP_SCALE * u));
      L.save();
      L.globalAlpha = (0.38 - state.day) * 1.6;
      L.drawImage(halo.canvas, Math.round(dx * u - haloWidth / 2) + sail, Math.round(lampY * u - haloWidth / 2), haloWidth, haloWidth);
      L.fillStyle = 'rgba(255,227,159,0.72)';
      L.fillRect(Math.round(dx * u) + sail, Math.round(lampY * u), dot, dot);
      L.restore();
    }
    L.fillStyle = 'rgba(226,240,248,0.34)';
    L.fillRect(Math.round((dx - dir * 12) * u), Math.round(dy * u), Math.round(8 * u), dot);
    L.fillRect(Math.round((dx - dir * 19) * u), Math.round((dy + 1) * u), Math.round(5 * u), dot);
  }

  /** Layer 4: wooden structures, scene props, recurring angler + dog + cat, birds, and fishing line. */
  drawSceneMidground(
    L: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    interactions: FishingInteractions,
    creatures: FishingCreatures,
  ): void {
    const u = layout.unit;
    L.save();

    creatures.drawFishShadows(L, scene, u, state.day);
    creatures.drawSurfaceLife(L, sprites, scene, layout, time, state.day);
    interactions.drawRings(L, u, state.day);
    const flora = this.flora[scene];
    if (flora) drawSceneFlora(L, sprites, scene, layout, flora, time);

    const anchors = anchorsForScene(scene, layout);
    const dogFrame = Math.floor(time * 3.8) % 2 === 0;
    const dogAlert = interactions.dogAlert > 0.35;
    const catFrame = Math.floor(time * 1.8) % 2 === 0;
    const catAlert = interactions.catAlert > 0.35;

    const deck = this.decks[scene];
    if (deck) {
      L.drawImage(deck, 0, Math.round(DECK_FIRST_ROW * u), Math.round(deck.width * u), Math.round(deck.height * u));
    }
    if (scene === 0) {
      drawBoxBottom(L, sprites.rodRack, 16, layout.deckY, u);
      drawBoxBottom(L, sprites.crates, 38, layout.deckY, u);
      const catSp = catAlert ? sprites.catLook : catFrame ? sprites.catSitA : sprites.catSitB;
      drawBoxBottom(L, catSp, 42, layout.deckY - 11, u);
      drawBoxBottom(L, sprites.tackleBox, 58, layout.deckY, u);
      drawBoxBottom(L, sprites.thermos, 72, layout.deckY, u);
      drawBoxBottom(L, sprites.coiledRope, 86, layout.deckY, u);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.anglerCast.right, layout.jettyRight - 42, layout.deckY, u);
      drawRod(L, layout.jettyRight - 36, layout.deckY - 12, anchors.rodTipX, anchors.rodTipY, 1.5, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);
      drawPost(L, layout.jettyRight - 10, layout.deckY, 29, u);
      drawBoxBottom(L, sprites.netPost, layout.jettyRight - 10, layout.deckY, u);
      drawHangingLantern(L, sprites.lantern, layout.jettyRight - 14, layout.deckY - 26, time, u);

      drawMooredSkiff(L, sprites, layout.rightZone + 10, layout.rightZone + 34, 190, time, u);
      drawPost(L, layout.rightZone + 128, 212, 20, u);
    } else if (scene === 1) {
      drawBoxBottom(L, sprites.rodRack, 19, layout.deckY + 2, u);
      drawBoxBottom(L, sprites.crates, 24, layout.deckY + 2, u);
      drawPost(L, 48, layout.deckY + 2, 34, u);
      drawHangingLantern(L, sprites.lantern, 44, layout.deckY - 30, time, u);
      drawBoxBottom(L, sprites.anglerNap, 58, layout.deckY + 2, u);
      drawRod(L, 64, layout.deckY - 4, anchors.rodTipX, anchors.rodTipY, 0.5, u);
      drawBoxBottom(L, sprites.coiledRope, 80, layout.deckY + 2, u);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.netPost, 112, layout.deckY + 2, u);
      const dogSp = dogAlert
        ? dogFrame
          ? sprites.dogLookA
          : sprites.dogLookB
        : Math.sin(time * 1.4) > 0
          ? sprites.dogRestA
          : sprites.dogRestB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);
      drawMooredSkiff(L, sprites, layout.rightZone + 6, layout.rightZone + 29, SKIFF_LANDING_ROW, time, u);
      drawPost(L, layout.rightZone + 34, 214, 30, u);
      drawPost(L, layout.rightZone + 126, 214, 22, u);
    } else if (scene === 2) {
      drawBoxBottom(L, sprites.rodRack, 15, layout.deckY + 4, u);
      drawBoxBottom(L, sprites.crates, 30, layout.deckY + 4, u);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.coiledRope, 82, layout.deckY + 4, u);
      drawBoxBottom(L, sprites.anglerReel.right, 94, layout.deckY + 4, u);
      drawRod(L, 100, layout.deckY - 6, anchors.rodTipX, anchors.rodTipY, 3.8, u);
      drawPost(L, 124, layout.deckY + 4, 28, u);
      drawBoxBottom(L, sprites.netPost, 124, layout.deckY + 4, u);
      drawHangingLantern(L, sprites.lantern, 120, layout.deckY - 22, time, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);

      const bx = this.rowboatX(time, layout);
      const by = 188 + Math.sin(time * 1.5) * 0.8;
      drawBoxBottom(L, sprites.secondAngler, bx - 4, by - 5, u);
      drawBoxBottom(L, sprites.rowboat, bx, by, u);
      drawRod(L, bx + 2, by - 7, bx + 16, by + 2, 0.5, u);
      L.fillStyle = 'rgba(235,248,255,0.42)';
      const dot = Math.max(1, Math.round(u));
      L.fillRect(Math.round((bx - 24) * u), Math.round(by * u), Math.round(17 * u), dot);
      L.fillRect(Math.round((bx + 9) * u), Math.round((by + 1) * u), Math.round(16 * u), dot);

      drawPost(L, layout.rightZone + 18, 212, 24, u);
      const mooring = layout.designW * 0.85;
      drawMooredSkiff(L, sprites, mooring, mooring + 24, ROWBOAT_MOORING_ROW, time, u);
    } else if (scene === 3) {
      drawPost(L, 28, layout.deckY, 14, u);
      drawPost(L, Math.round(layout.jettyRight * 0.56), layout.deckY, 14, u);
      drawPost(L, layout.jettyRight - 8, layout.deckY, 14, u);
      drawPost(L, layout.rightZone + 36, 214, 28, u);
      drawPost(L, layout.rightZone + 110, 216, 30, u);

      drawBoxBottom(L, sprites.rodRack, 14, layout.deckY, u);
      drawBoxBottom(L, sprites.crates, 42, layout.deckY, u);
      drawBoxBottom(L, sprites.netPost, 61, layout.deckY, u);
      drawBoxBottom(L, sprites.coiledRope, 56, layout.deckY, u);
      drawHangingLantern(L, sprites.lantern, 24, layout.deckY - 12, time, u);
      drawHangingLantern(L, sprites.lantern, layout.jettyRight - 12, layout.deckY - 12, time, u);

      drawBoxBottom(L, sprites.bucketFull, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.stove, layout.jettyRight - 58, layout.deckY, u);
      drawBoxBottom(L, sprites.anglerCook, layout.jettyRight - 36, layout.deckY, u);
      const catSp = catAlert ? sprites.catLook : catFrame ? sprites.catSitA : sprites.catSitB;
      drawBoxBottom(L, catSp, layout.jettyRight - 18, layout.deckY, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);

      drawMooredSkiff(L, sprites, layout.rightZone + 36, layout.rightZone + 62, 191, time, u);
      drawHangingLantern(L, sprites.lantern, layout.rightZone + 32, 190, time, u);

      const steamX = layout.jettyRight - 60;
      const steamY = Math.round((layout.deckY - 14) * u);
      const dot = Math.max(1, Math.round(u));
      L.save();
      L.fillStyle = 'rgb(242,240,232)';
      const wind = breeze(time, steamX) * STEAM_SWAY;
      for (let i = 0; i < STEAM_PUFFS; i++) {
        const age = (time * STEAM_SPEED / STEAM_RISE + i / STEAM_PUFFS) % 1;
        const x = Math.round(steamX * u + age * wind + i * dot);
        L.globalAlpha = 0.45 * Math.min(1, (1 - age) / STEAM_FADE_PORTION);
        L.fillRect(x, Math.round(steamY - age * STEAM_RISE * u), dot, dot * 2);
      }
      L.restore();
    } else {
      drawBoxBottom(L, sprites.rodRack, 16, layout.deckY, u);
      drawBoxBottom(L, sprites.crates, 36, layout.deckY, u);
      const catSp = catAlert ? sprites.catLook : Math.sin(time * 1.3) > 0 ? sprites.catNapA : sprites.catNapB;
      drawBoxBottom(L, catSp, 38, layout.deckY - 11, u);
      drawBoxBottom(L, sprites.coiledRope, 56, layout.deckY, u);
      drawBoxBottom(L, sprites.bucketEmpty, anchors.bucketX, anchors.bucketY, u);
      interactions.drawBucketTally(L, sprites, anchors.bucketX, anchors.bucketY, u);
      drawBoxBottom(L, sprites.anglerLantern, layout.jettyRight - 38, layout.deckY + 6, u);
      drawRod(L, layout.jettyRight - 32, layout.deckY - 4, anchors.rodTipX, anchors.rodTipY, 1.2, u);
      const dogSp = dogAlert ? (dogFrame ? sprites.dogLookA : sprites.dogLookB) : dogFrame ? sprites.dogSitA : sprites.dogSitB;
      drawBoxBottom(L, dogSp, anchors.dogX, anchors.dogY, u);
      drawBoxBottom(L, sprites.netPost, layout.jettyRight - 10, layout.deckY, u);
      drawBoxBottom(L, sprites.lantern, layout.jettyRight - 18, layout.deckY, u);

      drawMooredSkiff(L, sprites, layout.rightZone + 22, layout.rightZone + 48, 190, time, u);
      drawPost(L, layout.rightZone + 31, 188, 17, u);
      drawHangingLantern(L, sprites.lantern, layout.rightZone + 28, 173, time, u, 0.65);
    }

    creatures.drawBirdsAndInsects(L, sprites, scene, time, u, state.day);
    interactions.drawFishingLine(L, sprites, scene, layout, time);
    L.restore();
  }

  drawLights(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
  ): void {
    this.lights.draw(ctx, sprites, state, scene, layout, time);
  }

  /** Draws layered shore mist wisps (delegated to FishingWater). */
  drawLayeredShoreMist(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    hour: number,
  ): void {
    this.water.drawLayeredShoreMist(ctx, state, scene, layout, time, hour);
  }

  /** Layer 5: foreground corner reed silhouettes and subtle upper corner leaves (clear of clock & radio). */
  drawForeground(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    state: SkyState,
    layout: SceneLayout,
    time: number,
  ): void {
    const u = layout.unit;
    const bot = this.h;
    ctx.save();
    ctx.globalAlpha = 0.76 + 0.18 * (1 - state.day);

    for (const c of this.corners) {
      const sp = sprites.reeds[c.idx];
      if (!sp) continue;
      const sway = Math.round(breeze(time, c.x) * FOREGROUND_REED_SWAY);
      const sw = Math.max(1, Math.round(sp.w * u * c.s));
      const sh = Math.max(1, Math.round(sp.h * u * c.s));
      drawWindSprite(ctx, sp, Math.round(c.x * u - sw / 2), bot - sh + Math.round(4 * u), sw, sh, sway);
    }

    ctx.fillStyle = state.day > 0.35 ? 'rgba(34,54,32,0.72)' : 'rgba(18,28,38,0.8)';
    const leafSway = Math.round(breeze(time, 22) * CORNER_LEAF_SWAY);
    const dot = Math.max(1, Math.round(u));
    ctx.fillRect(0, Math.round(8 * u), Math.round(22 * u) + leafSway, dot * 2);
    ctx.fillRect(Math.round(6 * u) + Math.round(leafSway / 2), Math.round(10 * u), Math.round(10 * u), dot * 3);
    ctx.fillRect(Math.round(18 * u) + leafSway, Math.round(7 * u), Math.round(8 * u), dot * 2);

    const strength = gust(time);
    const drift = AIR_LEAF_DRIFT + AIR_LEAF_GUST_DRIFT * strength;
    for (let i = 0; i < AIR_LEAF_COUNT; i++) {
      const leaf = sprites.leaves[i];
      if (!leaf) continue;
      const age = (time / AIR_LEAF_LIFETIME + i / AIR_LEAF_COUNT) % 1;
      const x = AIR_LEAF_X + i * AIR_LEAF_SPACING + age * drift;
      const y = AIR_LEAF_Y + age * AIR_LEAF_FALL;
      const flutter = breeze(time, x) * AIR_LEAF_FLUTTER;
      ctx.globalAlpha = AIR_LEAF_OPACITY * strength * Math.sin(age * Math.PI);
      ctx.drawImage(leaf.canvas, Math.round(x * u), Math.round(y * u + flutter),
        Math.max(1, Math.round(leaf.w * u)), Math.max(1, Math.round(leaf.h * u)));
    }
    ctx.restore();
  }
}
