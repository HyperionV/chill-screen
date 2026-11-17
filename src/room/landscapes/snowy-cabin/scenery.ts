import { css, mix, type RGB } from '../../../render/color';
import { clamp } from '../../../world/math';
import { fbm, hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import type { Atmosphere } from './atmosphere';
import type { CreatureSprites, SpriteBox } from './creature-sprites';
import type { Creatures, DrawItem } from './creatures';
import { drawPostTintLights, drawSkyExtras, tintLand } from './lighting';
import { HORIZON, type HitBox, type SceneId } from './scenes';
import type { SnowySprites, VillageBuilding } from './sprites';

const SNOW_TOP: RGB = [236, 244, 252];
const SNOW_MID: RGB = [204, 222, 242];
const SNOW_SHADE: RGB = [158, 182, 212];
const RIDGE_BASE: RGB = [142, 168, 200];
const ICE_BASE: RGB = [132, 164, 196];
const ICE_DEEP: RGB = [98, 130, 166];

export interface SceneAnchorInfo {
  chimney: { x: number; y: number } | null;
  chimneyBox: HitBox | null;
  windowBoxes: HitBox[];
  snowmanBox: HitBox | null;
  glowPoint: { x: number; y: number } | null;
}

/** Draws a sprite scaled by `unit` with bottom-centre at (x, y). */
function drawProp(
  ctx: CanvasRenderingContext2D,
  sp: SpriteBox,
  x: number,
  y: number,
  unit: number,
  shadow = true,
): void {
  const dw = Math.max(1, Math.round(sp.w * unit));
  const dh = Math.max(1, Math.round(sp.h * unit));
  const dx = Math.round(x - dw / 2);
  const dy = Math.round(y - dh);
  if (shadow) {
    ctx.fillStyle = 'rgba(26,42,72,0.20)';
    ctx.fillRect(dx + Math.round(dw * 0.1), Math.round(y) - 1, Math.round(dw * 0.8), Math.max(1, Math.round(unit)));
  }
  ctx.drawImage(sp.canvas, dx, dy, dw, dh);
}

/** Draws a pre-sized tree sprite with bottom-centre at (x, y) and gentle crown sway. */
function drawTree(ctx: CanvasRenderingContext2D, sp: SpriteBox, x: number, y: number, swayPx: number): void {
  const dx = Math.round(x - sp.w / 2);
  const top = Math.round(y - sp.h);
  const strip = 6;
  if (Math.abs(swayPx) < 0.5) {
    ctx.drawImage(sp.canvas, dx, top);
    return;
  }
  for (let sy = 0; sy < sp.h; sy += strip) {
    const k = 1 - (sy + strip * 0.5) / sp.h;
    const rows = Math.min(strip, sp.h - sy);
    ctx.drawImage(sp.canvas, 0, sy, sp.w, rows, dx + Math.round(swayPx * k * k), top + sy, sp.w, rows);
  }
}

/** Renders the 5 parallax depth layers, set pieces, snowdrifts, pond ice, village, and warm lighting for any scene. */
export class Scenery {
  private w = 0;
  private h = 0;
  private unit = 1;
  private ridgeTops = new Int16Array(0);
  private iceCracks: { x1: number; y1: number; x2: number; y2: number }[] = [];

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
    this.ridgeTops = new Int16Array(Math.max(1, w));
    for (let x = 0; x < w; x++) {
      const u = x / Math.max(1, w);
      // Dip slightly near centre so the clock band stays serene and open
      const centerDip = 1 - 0.45 * Math.exp(-Math.pow((u - 0.5) / 0.24, 2));
      const height = fbm(u * 3.8 + 1.4) * 0.085 * centerDip;
      this.ridgeTops[x] = Math.round(h * (HORIZON - height));
    }

    this.iceCracks = [];
    for (let i = 0; i < 14; i++) {
      const cx = w * (0.18 + hash(i * 19 + 3) * 0.64);
      const cy = h * (0.67 + hash(i * 19 + 7) * 0.14);
      const len = (10 + hash(i * 19 + 11) * 16) * unit;
      const angle = (hash(i * 19 + 13) - 0.5) * 0.8;
      this.iceCracks.push({
        x1: cx,
        y1: cy,
        x2: cx + Math.cos(angle) * len,
        y2: cy + Math.sin(angle) * len * 0.45,
      });
    }
  }

  /** Computes interactive hitboxes and chimney/lantern anchor coordinates for `scene`. */
  anchors(scene: SceneId, sprites: SnowySprites, px: number): SceneAnchorInfo {
    const u = this.unit;
    const midOff = px * 0.85;
    const windowBoxes: HitBox[] = [];
    let chimney: { x: number; y: number } | null = null;
    let chimneyBox: HitBox | null = null;
    let snowmanBox: HitBox | null = null;
    let glowPoint: { x: number; y: number } | null = null;

    if (scene === 'clearing') {
      const cx = this.w * 0.23 + midOff;
      const cy = this.h * 0.735;
      const spec = sprites.cabinLarge;
      const tlX = cx - (spec.w * u) / 2;
      const tlY = cy - spec.h * u;
      chimney = { x: tlX + spec.chimneyX * u, y: tlY + spec.chimneyY * u };
      chimneyBox = { x: chimney.x - 9 * u, y: chimney.y - 6 * u, w: 18 * u, h: 16 * u };
      for (const win of spec.windows) {
        windowBoxes.push({ x: tlX + win.x * u, y: tlY + win.y * u, w: win.w * u, h: win.h * u });
      }
      if (spec.lanternX !== null && spec.lanternY !== null) {
        glowPoint = { x: tlX + spec.lanternX * u, y: tlY + spec.lanternY * u };
      }
      const smX = this.w * 0.75 + midOff;
      const smY = this.h * 0.80;
      snowmanBox = { x: smX - 12 * u, y: smY - 28 * u, w: 24 * u, h: 28 * u };
    } else if (scene === 'chimney') {
      const cx = this.w * 0.22 + midOff;
      const cy = this.h * 0.78;
      const spec = sprites.cabinClose;
      const tlX = cx - (spec.w * u) / 2;
      const tlY = cy - spec.h * u;
      chimney = { x: tlX + spec.chimneyX * u, y: tlY + spec.chimneyY * u };
      chimneyBox = { x: chimney.x - 11 * u, y: chimney.y - 6 * u, w: 22 * u, h: 20 * u };
      for (const win of spec.windows) {
        windowBoxes.push({ x: tlX + win.x * u, y: tlY + win.y * u, w: win.w * u, h: win.h * u });
        glowPoint = { x: tlX + (win.x + win.w * 0.5) * u, y: tlY + (win.y + win.h * 0.5) * u };
      }
    } else if (scene === 'aurora') {
      const cx = this.w * 0.22 + midOff;
      const cy = this.h * 0.675;
      const spec = sprites.cabinSmall;
      const tlX = cx - (spec.w * u) / 2;
      const tlY = cy - spec.h * u;
      chimney = { x: tlX + spec.chimneyX * u, y: tlY + spec.chimneyY * u };
      chimneyBox = { x: chimney.x - 6 * u, y: chimney.y - 5 * u, w: 12 * u, h: 12 * u };
      for (const win of spec.windows) {
        windowBoxes.push({ x: tlX + win.x * u, y: tlY + win.y * u, w: win.w * u, h: win.h * u });
      }
      glowPoint = { x: cx, y: cy - 10 * u };
    }

    return { chimney, chimneyBox, windowBoxes, snowmanBox, glowPoint };
  }

  /** Draws winter sky washes, aurora curtains, and shooting stars before terrain. */
  drawSkyExtras(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    time: number,
    scene: SceneId,
    atmosphere: Atmosphere,
    px: number,
  ): void {
    drawSkyExtras(ctx, this.w, this.h, state, time, scene, atmosphere, px);
  }

  /** Draws all land layers, props, and cast into offscreen `L`, tints it, and paints post-tint glows. */
  drawScene(
    ctx: CanvasRenderingContext2D,
    L: CanvasRenderingContext2D,
    scene: SceneId,
    state: SkyState,
    time: number,
    sprites: SnowySprites,
    creatureSprites: CreatureSprites,
    creatures: Creatures,
    atmosphere: Atmosphere,
    pointer: { x: number; y: number } | null,
    px: number,
    windowGlow: number,
    snowmanAnim: number,
    cameraGlideX: number,
  ): void {
    L.imageSmoothingEnabled = false;
    L.clearRect(0, 0, this.w, this.h);

    const hy = Math.round(this.h * HORIZON);
    const farOff = Math.round(px * 0.25 + cameraGlideX * 0.25);
    const midFarOff = Math.round(px * 0.45 + cameraGlideX * 0.5);
    const nearOff = Math.round(px * 0.85 + cameraGlideX);
    const fgOff = Math.round(px * 1.25 + cameraGlideX * 1.25);

    const ridgeCol = css(mix(RIDGE_BASE, state.sky.horizon, 0.42));
    const ridgeLit = css(mix(SNOW_TOP, state.sky.horizon, 0.28));
    for (let x = 0; x < this.w; x++) {
      const sx = clamp(x - farOff, 0, this.w - 1);
      const top = this.ridgeTops[sx];
      L.fillStyle = ridgeCol;
      L.fillRect(x, top, 1, this.h - top);
      if (sx + 1 < this.w && this.ridgeTops[sx + 1] > top) {
        L.fillStyle = ridgeLit;
        L.fillRect(x, top, 1, 2);
      }
    }

    this.drawMidFarForest(L, scene, sprites, time, hy, midFarOff);
    if (scene === 'sled') {
      this.drawDistantVillage(L, sprites, midFarOff);
    }

    this.drawGround(L, scene, state, time, nearOff);
    atmosphere.drawFootprints(L, state.day);

    const items: DrawItem[] = [];
    this.collectSceneProps(scene, sprites, time, nearOff, snowmanAnim, items);
    creatures.collectStanding(scene, creatureSprites, sprites.owlSnag, pointer, nearOff, items);
    items.sort((a, b) => a.y - b.y);
    for (const item of items) item.draw(L);

    this.drawForegroundCorners(L, sprites, time, fgOff);
    tintLand(L, this.w, this.h, state, scene);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L.canvas, 0, 0);

    drawPostTintLights(ctx, this.w, this.h, this.unit, scene, state, time, sprites, nearOff, midFarOff, windowGlow);
    creatures.drawSkyOwl(ctx, scene, creatureSprites, nearOff);
  }

  private drawMidFarForest(
    L: CanvasRenderingContext2D,
    scene: SceneId,
    sprites: SnowySprites,
    time: number,
    hy: number,
    midFarOff: number,
  ): void {
    const u = this.unit;
    const count = scene === 'aurora' ? 28 : 22;
    for (let i = 0; i < count; i++) {
      const frac = (i + 0.35 + hash(i * 17) * 0.4) / count;
      if ((scene === 'clearing' || scene === 'chimney') && frac > 0.38 && frac < 0.62) continue;
      if (scene === 'sled' && frac > 0.63 && frac < 0.9) continue;
      const x = Math.round(frac * this.w) + midFarOff;
      const list = i % 3 === 0 ? sprites.pinesMid : sprites.pinesFar;
      const sp = list[Math.floor(hash(i * 31 + 5) * list.length)];
      const slopeBoost = scene === 'sled' ? (1 - frac) * -0.05 * this.h : 0;
      const baseY = Math.round(hy + (6 + hash(i * 23) * 14) * u + slopeBoost);
      const sway = Math.sin(time * 0.6 + i) * 0.8 * u;
      drawTree(L, sp, x, baseY, sway);
    }
  }

  private drawDistantVillage(L: CanvasRenderingContext2D, sprites: SnowySprites, midFarOff: number): void {
    const u = this.unit;
    const baseY = Math.round(this.h * 0.635);
    const layout: { sp: VillageBuilding; x: number; y: number }[] = [
      { sp: sprites.villageHouses[0], x: this.w * 0.69, y: baseY },
      { sp: sprites.villageChurch, x: this.w * 0.77, y: baseY - 2 * u },
      { sp: sprites.villageHouses[1], x: this.w * 0.84, y: baseY + u },
    ];
    for (const item of layout) {
      drawProp(L, item.sp, item.x + midFarOff, item.y, u, false);
    }
  }

  private drawGround(
    L: CanvasRenderingContext2D,
    scene: SceneId,
    state: SkyState,
    time: number,
    nearOff: number,
  ): void {
    const u = this.unit;
    const groundTop = Math.round(this.h * (HORIZON + 0.04));

    for (let x = 0; x < this.w; x++) {
      let top = groundTop + Math.round(fbm((x - nearOff) * 0.015) * 6 * u);
      if (scene === 'sled') {
        const slope = (x / Math.max(1, this.w)) * 0.16 * this.h;
        top = Math.round(this.h * 0.56 + slope + Math.sin(x * 0.03) * 2 * u);
      } else if (scene === 'aurora') {
        top = Math.round(this.h * 0.60 + Math.sin((x / Math.max(1, this.w)) * Math.PI * 2.2) * 5 * u);
      }

      L.fillStyle = css(SNOW_TOP);
      L.fillRect(x, top, 1, Math.max(2, Math.round(6 * u)));
      L.fillStyle = css(SNOW_MID);
      L.fillRect(x, top + Math.round(6 * u), 1, this.h - top);

      const driftY = top + Math.round((16 + fbm((x - nearOff) * 0.02 + 9) * 18) * u);
      if (driftY < this.h) {
        L.fillStyle = css(SNOW_SHADE);
        L.fillRect(x, driftY, 1, Math.max(1, Math.round(2 * u)));
      }
    }

    if (scene === 'pond') {
      const cx = this.w * 0.5 + nearOff;
      const cy = this.h * 0.74;
      const rx = this.w * 0.36;
      const ry = this.h * 0.105;
      for (let py = Math.round(cy - ry); py <= Math.round(cy + ry); py++) {
        const ny = (py - cy) / ry;
        const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ny * ny)));
        if (half <= 0) continue;
        L.fillStyle = css(mix(ICE_BASE, state.sky.horizon, 0.25));
        L.fillRect(Math.round(cx - half), py, half * 2, 1);
        if (ny > 0.35) {
          L.fillStyle = css(ICE_DEEP);
          L.fillRect(Math.round(cx - half + 2), py, Math.max(1, half * 2 - 4), 1);
        }
        L.fillStyle = css(SNOW_TOP);
        L.fillRect(Math.round(cx - half - 2), py, 3, 1);
        L.fillRect(Math.round(cx + half - 1), py, 3, 1);
      }

      for (let i = 0; i < this.iceCracks.length; i++) {
        const c = this.iceCracks[i];
        const steps = 8;
        const glint = Math.sin(time * 1.2 + i * 1.7) > 0.55;
        L.fillStyle = glint ? css([232, 246, 255], 0.9) : css([82, 114, 150], 0.65);
        for (let s = 0; s <= steps; s++) {
          const k = s / steps;
          const kx = Math.round(c.x1 + (c.x2 - c.x1) * k + nearOff);
          const ky = Math.round(c.y1 + (c.y2 - c.y1) * k);
          L.fillRect(kx, ky, 1, 1);
        }
      }
    }

    if (scene === 'sled') {
      L.fillStyle = css(SNOW_SHADE, 0.45);
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const tx = Math.round(this.w * (0.08 + 0.8 * t) + nearOff);
        const ty = Math.round(this.h * (0.63 + 0.17 * t));
        L.fillRect(tx, ty, Math.max(2, Math.round(3 * u)), Math.max(1, Math.round(u)));
      }
    }
  }

  private collectSceneProps(
    scene: SceneId,
    sprites: SnowySprites,
    time: number,
    nearOff: number,
    snowmanAnim: number,
    out: DrawItem[],
  ): void {
    const u = this.unit;

    if (scene === 'clearing') {
      const cabinX = this.w * 0.23 + nearOff;
      const cabinY = this.h * 0.735;
      out.push({ y: cabinY, draw: (L) => drawProp(L, sprites.cabinLarge, cabinX, cabinY, u, true) });
      out.push({ y: this.h * 0.79, draw: (L) => drawProp(L, sprites.woodpile, this.w * 0.09 + nearOff, this.h * 0.79, u) });
      out.push({ y: this.h * 0.82, draw: (L) => drawProp(L, sprites.axeStump, this.w * 0.165 + nearOff, this.h * 0.82, u) });
      const smX = this.w * 0.75 + nearOff;
      const smY = this.h * 0.80;
      out.push({ y: smY, draw: (L) => this.drawAnimatedSnowman(L, sprites, smX, smY, snowmanAnim) });
      out.push({ y: this.h * 0.70, draw: (L) => drawTree(L, sprites.pinesNear[1], this.w * 0.05 + nearOff, this.h * 0.70, Math.sin(time) * u) });
      out.push({ y: this.h * 0.74, draw: (L) => drawTree(L, sprites.birches[1], this.w * 0.88 + nearOff, this.h * 0.74, Math.sin(time + 1) * u) });
      out.push({ y: this.h * 0.81, draw: (L) => drawProp(L, sprites.shrubs[0], this.w * 0.84 + nearOff, this.h * 0.81, u) });
    } else if (scene === 'pond') {
      out.push({ y: this.h * 0.745, draw: (L) => drawProp(L, sprites.rowboat, this.w * 0.14 + nearOff, this.h * 0.745, u) });
      out.push({ y: this.h * 0.735, draw: (L) => drawProp(L, sprites.bench, this.w * 0.79 + nearOff, this.h * 0.735, u) });
      out.push({ y: this.h * 0.78, draw: (L) => drawTree(L, sprites.birches[0], this.w * 0.07 + nearOff, this.h * 0.78, Math.sin(time) * u) });
      out.push({ y: this.h * 0.79, draw: (L) => drawTree(L, sprites.pinesNear[2], this.w * 0.93 + nearOff, this.h * 0.79, Math.sin(time + 2) * u) });
      out.push({ y: this.h * 0.83, draw: (L) => drawProp(L, sprites.shrubs[1], this.w * 0.73 + nearOff, this.h * 0.83, u) });
    } else if (scene === 'sled') {
      const slopeTrees: { x: number; y: number; idx: number }[] = [
        { x: 0.05, y: 0.66, idx: 2 },
        { x: 0.14, y: 0.78, idx: 0 },
        { x: 0.28, y: 0.85, idx: 1 },
        { x: 0.89, y: 0.84, idx: 3 },
        { x: 0.96, y: 0.79, idx: 1 },
      ];
      for (const t of slopeTrees) {
        out.push({ y: this.h * t.y, draw: (L) => drawTree(L, sprites.pinesNear[t.idx], this.w * t.x + nearOff, this.h * t.y, Math.sin(time + t.x * 5) * u) });
      }
      out.push({ y: this.h * 0.83, draw: (L) => drawProp(L, sprites.shrubs[2], this.w * 0.76 + nearOff, this.h * 0.83, u) });
    } else if (scene === 'chimney') {
      const cx = this.w * 0.22 + nearOff;
      const cy = this.h * 0.78;
      out.push({ y: cy, draw: (L) => drawProp(L, sprites.cabinClose, cx, cy, u, true) });
      const grove: { x: number; y: number; idx: number }[] = [
        { x: 0.69, y: 0.72, idx: 1 },
        { x: 0.84, y: 0.74, idx: 3 },
        { x: 0.93, y: 0.80, idx: 2 },
        { x: 0.04, y: 0.82, idx: 0 },
      ];
      for (const t of grove) {
        out.push({ y: this.h * t.y, draw: (L) => drawTree(L, sprites.pinesNear[t.idx], this.w * t.x + nearOff, this.h * t.y, Math.sin(time + t.x * 7) * 0.7 * u) });
      }
    } else {
      out.push({ y: this.h * 0.675, draw: (L) => drawProp(L, sprites.cabinSmall, this.w * 0.22 + nearOff, this.h * 0.675, u, true) });
      out.push({ y: this.h * 0.76, draw: (L) => drawTree(L, sprites.pinesNear[0], this.w * 0.07 + nearOff, this.h * 0.76, Math.sin(time) * 0.7 * u) });
      out.push({ y: this.h * 0.77, draw: (L) => drawTree(L, sprites.pinesNear[2], this.w * 0.92 + nearOff, this.h * 0.77, Math.sin(time + 1.5) * 0.7 * u) });
      out.push({ y: this.h * 0.82, draw: (L) => drawProp(L, sprites.shrubs[0], this.w * 0.30 + nearOff, this.h * 0.82, u) });
      out.push({ y: this.h * 0.82, draw: (L) => drawProp(L, sprites.shrubs[1], this.w * 0.72 + nearOff, this.h * 0.82, u) });
    }
  }

  private drawAnimatedSnowman(
    L: CanvasRenderingContext2D,
    sprites: SnowySprites,
    x: number,
    y: number,
    animTimer: number,
  ): void {
    const u = this.unit;
    drawProp(L, sprites.snowmanBody, x, y, u, true);

    const bodyW = Math.round(sprites.snowmanBody.w * u);
    const bodyH = Math.round(sprites.snowmanBody.h * u);
    const bx = Math.round(x - bodyW / 2);
    const by = Math.round(y - bodyH);

    L.fillStyle = '#5c3c24';
    L.fillRect(bx + Math.round(2 * u), by + Math.round(11 * u), Math.round(4 * u), Math.max(1, Math.round(u)));

    const wave = animTimer > 0 ? Math.sin(animTimer * 6.5) : 0;
    const armX = bx + bodyW - Math.round(5 * u);
    const armY = by + Math.round(11 * u);
    for (let s = 0; s < 5; s++) {
      const ay = Math.round(armY - s * (0.4 + Math.max(0, wave) * 0.8) * u);
      L.fillRect(armX + Math.round(s * u), ay, Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
    }

    const hatLift = animTimer > 0 ? Math.abs(Math.sin(animTimer * 3.2)) * 3.5 * u : 0;
    const hatTilt = animTimer > 0 ? Math.sin(animTimer * 3.2) * 2 * u : 0;
    const hatW = Math.round(sprites.snowmanHat.w * u);
    const hatH = Math.round(sprites.snowmanHat.h * u);
    L.drawImage(
      sprites.snowmanHat.canvas,
      Math.round(x - hatW / 2 + hatTilt),
      Math.round(by - hatH + 2 * u - hatLift),
      hatW,
      hatH,
    );
  }

  private drawForegroundCorners(
    L: CanvasRenderingContext2D,
    sprites: SnowySprites,
    time: number,
    fgOff: number,
  ): void {
    const u = this.unit;
    const sway = Math.sin(time * 0.9) * 1.2 * u;
    drawTree(L, sprites.pinesNear[0], this.w * 0.02 + fgOff, this.h + 18 * u, sway);
    drawTree(L, sprites.pinesNear[1], this.w * 0.98 + fgOff, this.h + 18 * u, -sway);
  }
}
