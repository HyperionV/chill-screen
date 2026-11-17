import type { SkyState } from '../../sky';
import { clamp01 } from '../../sky';
import type { SpriteBox } from './cast-sprites';
import type { RooftopInteractions } from './interactions';
import { SCENE_SPACING, WORLD_W, deckTopAt, wrapDelta } from './scenes';
import type { RooftopSprites } from './sprites';

const SWAY_STRIP_PX = 3;

interface StringLightSpan {
  wx1: number;
  y1: number;
  wx2: number;
  y2: number;
  sag: number;
  bulbs: number;
}

const BAR_STRING_LIGHTS: readonly StringLightSpan[] = [
  { wx1: SCENE_SPACING * 2 - 224, y1: 126, wx2: SCENE_SPACING * 2 - 104, y2: 126, sag: 7, bulbs: 9 },
  { wx1: SCENE_SPACING * 2 + 94, y1: 130, wx2: SCENE_SPACING * 2 + 218, y2: 132, sag: 10, bulbs: 10 },
];

/**
 * Draws the foreground rooftop set pieces across all five scenes:
 * water tower, swaying clothesline, potted plants, bar pergola & neon sign,
 * cycling billboard, pigeon coop, greenhouse, vegetable beds, and sprinkler.
 */
export function drawSetPiecesPreTint(
  L: CanvasRenderingContext2D,
  time: number,
  camX: number,
  pxShift: number,
  designW: number,
  unit: number,
  pointerDesign: { x: number; y: number } | null,
  sprites: RooftopSprites,
  interactions: RooftopInteractions,
): void {
  const halfW = designW * 0.5;
  const foreCam = camX + pxShift;
  const toScreenX = (wx: number): number => wrapDelta(wx, foreCam, WORLD_W) + halfW;
  const onScreen = (sx: number, margin = 150): boolean => sx > -margin && sx < designW + margin;

  // Connecting vents between scenes
  for (const vx of [-250, 290, 830, 1410, 1960, 2510]) {
    const sx = toScreenX(vx);
    if (!onScreen(sx, 40)) continue;
    drawStand(L, sprites.ventSmall, sx, deckTopAt(vx), unit);
  }

  // Scene 0: Water Tower Roof
  const s0 = toScreenX(0);
  if (onScreen(s0, 240)) {
    drawStand(L, sprites.waterTower, s0 - 172, 204, unit);
    drawStand(L, sprites.crate, s0 - 114, 206, unit);
    drawStand(L, sprites.ventLarge, s0 + 132, 204, unit);
    drawStand(L, sprites.crate, s0 + 166, 206, unit);

    const plantSpots: readonly { dx: number; y: number; idx: number }[] = [
      { dx: -124, y: 204, idx: 0 },
      { dx: -102, y: 208, idx: 2 },
      { dx: 88, y: 206, idx: 1 },
      { dx: 186, y: 206, idx: 3 },
    ];
    for (const ps of plantSpots) {
      const sp = sprites.plants[ps.idx % sprites.plants.length];
      if (sp) drawSwayingSprite(L, sp, s0 + ps.dx, ps.y, time, unit, pointerDesign, interactions, 0.9);
    }

    const pole1X = s0 + 76;
    const pole2X = s0 + 208;
    L.fillStyle = '#48505e';
    L.fillRect(Math.round(pole1X * unit), Math.round(154 * unit), Math.max(2, Math.round(2 * unit)), Math.round(50 * unit));
    L.fillRect(Math.round(pole2X * unit), Math.round(152 * unit), Math.max(2, Math.round(2 * unit)), Math.round(52 * unit));

    L.fillStyle = '#c8d0dc';
    const lineSteps = 22;
    for (let i = 0; i < lineSteps; i++) {
      const u = i / lineSteps;
      const lx = pole1X + (pole2X - pole1X) * u;
      const ly = 154 + Math.sin(u * Math.PI) * 7;
      L.fillRect(Math.round(lx * unit), Math.round(ly * unit), Math.max(2, Math.round(6 * unit)), Math.max(1, Math.round(unit)));
    }

    const garmentDxs = [92, 114, 138, 162, 188];
    garmentDxs.forEach((gdx, i) => {
      const gSp = sprites.garments[i % sprites.garments.length];
      if (!gSp) return;
      const gx = s0 + gdx;
      const u = (gx - pole1X) / (pole2X - pole1X);
      const topY = 155 + Math.sin(u * Math.PI) * 7;
      drawHangingLaundry(L, gSp, gx, topY, time + i * 0.7, unit, pointerDesign, interactions);
    });
  }

  // Scene 1: Skyline Golden Hour
  const s1 = toScreenX(SCENE_SPACING);
  if (onScreen(s1, 240)) {
    drawStand(L, sprites.ventLarge, s1 - 152, 204, unit);
    const shrub = sprites.plants[1];
    if (shrub) drawSwayingSprite(L, shrub, s1 + 162, 204, time, unit, pointerDesign, interactions, 0.7);
  }

  // Scene 2: Neon Rooftop Bar
  const s2 = toScreenX(SCENE_SPACING * 2);
  if (onScreen(s2, 240)) {
    drawStand(L, sprites.barPergola, s2 - 164, 206, unit);
    drawTopLeft(L, sprites.neonBase, s2 - 192, 130, unit);

    L.fillStyle = '#462c20';
    L.fillRect(Math.round((s2 + 94) * unit), Math.round(130 * unit), Math.max(2, Math.round(3 * unit)), Math.round(76 * unit));
    L.fillRect(Math.round((s2 + 216) * unit), Math.round(132 * unit), Math.max(2, Math.round(3 * unit)), Math.round(74 * unit));

    drawStand(L, sprites.barTable, s2 + 132, 210, unit);
    drawStand(L, sprites.barTable, s2 + 194, 212, unit);

    const barPlantA = sprites.plants[0];
    const barPlantB = sprites.plants[3];
    if (barPlantA) drawSwayingSprite(L, barPlantA, s2 - 90, 206, time, unit, pointerDesign, interactions, 0.75);
    if (barPlantB) drawSwayingSprite(L, barPlantB, s2 + 210, 206, time, unit, pointerDesign, interactions, 0.75);

    L.fillStyle = '#242830';
    for (const span of BAR_STRING_LIGHTS) {
      const x1 = toScreenX(span.wx1);
      const x2 = toScreenX(span.wx2);
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const bx = x1 + (x2 - x1) * u;
        const by = span.y1 + (span.y2 - span.y1) * u + Math.sin(u * Math.PI) * span.sag;
        L.fillRect(Math.round(bx * unit), Math.round(by * unit), Math.max(2, Math.round(5 * unit)), Math.max(1, Math.round(unit)));
      }
    }
  }

  // Scene 3: Billboard Roof
  const s3 = toScreenX(SCENE_SPACING * 3);
  if (onScreen(s3, 240)) {
    const bbLeft = s3 - 226;
    const bbTop = 128;
    drawTopLeft(L, sprites.billboardFrame, bbLeft, bbTop, unit);
    drawBillboardAdvert(L, bbLeft + 6, bbTop + 6, unit, sprites, interactions);
    interactions.setBillboardRect({
      x: bbLeft + 2,
      y: bbTop + 2,
      w: sprites.billboardFrame.w - 4,
      h: sprites.billboardFrame.h - 14,
    });

    drawStand(L, sprites.crate, s3 - 82, 204, unit);
    drawStand(L, sprites.pigeonCoop, s3 + 166, 204, unit);
    drawStand(L, sprites.crate, s3 + 138, 206, unit);
  } else {
    interactions.setBillboardRect(null);
  }

  // Scene 4: Rooftop Garden
  const s4 = toScreenX(SCENE_SPACING * 4);
  if (onScreen(s4, 240)) {
    const bed0 = sprites.vegBeds[0];
    const bed1 = sprites.vegBeds[1];
    if (bed0) drawStand(L, bed0, s4 - 178, 208, unit);
    if (bed1) drawStand(L, bed1, s4 - 114, 210, unit);

    for (const sdx of [-206, -192, -150]) {
      drawSwayingSprite(L, sprites.sunflower, s4 + sdx, 198, time, unit, pointerDesign, interactions, 1.1);
    }
    drawStand(L, sprites.sprinkler, s4 - 144, 205, unit);
    drawStand(L, sprites.greenhouse, s4 + 158, 204, unit);
    drawStand(L, sprites.crate, s4 + 86, 204, unit);
  }
}

/** Draws post-tint glowing neon, string lights, billboard spots, greenhouse glow, and sprinkler spray. */
export function drawSetPiecesPostTint(
  ctx: CanvasRenderingContext2D,
  state: SkyState,
  time: number,
  camX: number,
  pxShift: number,
  designW: number,
  unit: number,
  sprites: RooftopSprites,
  interactions: RooftopInteractions,
): void {
  const halfW = designW * 0.5;
  const foreCam = camX + pxShift;
  const toScreenX = (wx: number): number => wrapDelta(wx, foreCam, WORLD_W) + halfW;
  const night = 1 - state.day;

  const s2 = toScreenX(SCENE_SPACING * 2);
  if (s2 > -240 && s2 < designW + 240) {
    const glowStrength = clamp01(0.45 + night * 0.55);
    ctx.save();
    ctx.globalAlpha = glowStrength;
    drawTopLeft(ctx, sprites.neonGlow, s2 - 192, 130, unit);
    drawStand(ctx, sprites.barTableGlow, s2 + 132, 210, unit);
    drawStand(ctx, sprites.barTableGlow, s2 + 194, 212, unit);
    ctx.restore();

    const u = Math.max(1, Math.round(unit));
    for (const span of BAR_STRING_LIGHTS) {
      const x1 = toScreenX(span.wx1);
      const x2 = toScreenX(span.wx2);
      for (let i = 1; i < span.bulbs; i++) {
        const frac = i / span.bulbs;
        const sway = Math.sin(time * 1.4 + i) * 0.4;
        const bx = Math.round((x1 + (x2 - x1) * frac + sway) * unit);
        const by = Math.round((span.y1 + (span.y2 - span.y1) * frac + Math.sin(frac * Math.PI) * span.sag + 1) * unit);
        const pulse = 0.85 + 0.15 * Math.sin(time * 1.8 + i * 1.3);
        const a = clamp01((0.4 + 0.6 * night) * pulse);
        ctx.fillStyle = `rgba(255, 202, 112, ${(0.22 * a).toFixed(2)})`;
        ctx.fillRect(bx - u, by - u, u * 3, u * 3);
        ctx.fillStyle = `rgba(255, 238, 174, ${a.toFixed(2)})`;
        ctx.fillRect(bx, by, u, u);
      }
    }
  }

  const s3 = toScreenX(SCENE_SPACING * 3);
  if (s3 > -240 && s3 < designW + 240 && night > 0.1) {
    const bbLeft = s3 - 226;
    const bbTop = 128;
    ctx.save();
    ctx.globalAlpha = night * 0.68;
    drawBillboardAdvert(ctx, bbLeft + 6, bbTop + 6, unit, sprites, interactions);
    ctx.restore();

    const u = Math.max(1, Math.round(unit));
    ctx.fillStyle = `rgba(255, 240, 190, ${(0.75 * night).toFixed(2)})`;
    for (const lx of [24, 60, 96]) {
      ctx.fillRect(Math.round((bbLeft + lx) * unit), Math.round((bbTop + 3) * unit), u * 2, u);
    }
  }

  const s4 = toScreenX(SCENE_SPACING * 4);
  if (s4 > -240 && s4 < designW + 240) {
    if (night > 0.12) {
      ctx.save();
      ctx.globalAlpha = clamp01(night * 0.9);
      drawStand(ctx, sprites.greenhouseGlow, s4 + 158, 204, unit);
      ctx.restore();
    }

    const spX = s4 - 144;
    const spY = 200;
    const u = Math.max(1, Math.round(unit));
    ctx.fillStyle = `rgba(196, 236, 255, ${(0.55 + 0.25 * state.day).toFixed(2)})`;
    const sweep = Math.sin(time * 1.1) * 0.35;
    for (let i = 0; i < 16; i++) {
      const phase = (time * 1.6 + i * 0.19) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const dx = side * (6 + 28 * phase) + sweep * 14 * phase;
      const dy = -Math.sin(phase * Math.PI) * 16 + phase * 5;
      ctx.fillRect(Math.round((spX + dx) * unit), Math.round((spY + dy) * unit), u, u);
    }
  }
}

function drawBillboardAdvert(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  topY: number,
  unit: number,
  sprites: RooftopSprites,
  interactions: RooftopInteractions,
): void {
  const { current, previous, wipe } = interactions.advertState;
  const curSp = sprites.adverts[current % sprites.adverts.length];
  if (!curSp) return;
  const dx = Math.round(leftX * unit);
  const dy = Math.round(topY * unit);
  const dw = Math.round(curSp.w * unit);
  const dh = Math.round(curSp.h * unit);

  if (wipe >= 1) {
    ctx.drawImage(curSp.canvas, dx, dy, dw, dh);
    return;
  }

  const prevSp = sprites.adverts[previous % sprites.adverts.length];
  if (prevSp) ctx.drawImage(prevSp.canvas, dx, dy, dw, dh);
  const sliceH = Math.max(1, Math.round(curSp.h * wipe));
  ctx.drawImage(curSp.canvas, 0, 0, curSp.w, sliceH, dx, dy, dw, Math.round(sliceH * unit));
}

function drawSwayingSprite(
  ctx: CanvasRenderingContext2D,
  sp: SpriteBox,
  cx: number,
  feetY: number,
  time: number,
  unit: number,
  pointerDesign: { x: number; y: number } | null,
  interactions: RooftopInteractions,
  swayScale: number,
): void {
  const breeze = interactions.breezeAt(cx, feetY - sp.h * 0.5, pointerDesign);
  const natural = Math.sin(time * 1.6 + cx * 0.05) * 1.1 * swayScale;
  const bend = (natural + breeze) * unit;
  const baseX = Math.round((cx - sp.w * 0.5) * unit);
  const topY = Math.round((feetY - sp.h) * unit);
  const drawW = Math.round(sp.w * unit);

  if (Math.abs(bend) < 0.5) {
    ctx.drawImage(sp.canvas, baseX, topY, drawW, Math.round(sp.h * unit));
    return;
  }

  for (let sy = 0; sy < sp.h; sy += SWAY_STRIP_PX) {
    const rows = Math.min(SWAY_STRIP_PX, sp.h - sy);
    const k = 1 - (sy + rows * 0.5) / sp.h;
    const shift = Math.round(bend * k * k);
    ctx.drawImage(
      sp.canvas,
      0,
      sy,
      sp.w,
      rows,
      baseX + shift,
      topY + Math.round(sy * unit),
      drawW,
      Math.max(1, Math.round(rows * unit)),
    );
  }
}

function drawHangingLaundry(
  ctx: CanvasRenderingContext2D,
  sp: SpriteBox,
  cx: number,
  topY: number,
  time: number,
  unit: number,
  pointerDesign: { x: number; y: number } | null,
  interactions: RooftopInteractions,
): void {
  const breeze = interactions.breezeAt(cx, topY + sp.h * 0.5, pointerDesign);
  const natural = Math.sin(time * 1.8) * 1.4 + Math.sin(time * 0.7) * 0.6;
  const bend = (natural + breeze) * unit;
  const baseX = Math.round((cx - sp.w * 0.5) * unit);
  const y0 = Math.round(topY * unit);
  const drawW = Math.round(sp.w * unit);

  for (let sy = 0; sy < sp.h; sy += SWAY_STRIP_PX) {
    const rows = Math.min(SWAY_STRIP_PX, sp.h - sy);
    const k = (sy + rows * 0.5) / sp.h;
    const shift = Math.round(bend * k * k);
    ctx.drawImage(
      sp.canvas,
      0,
      sy,
      sp.w,
      rows,
      baseX + shift,
      y0 + Math.round(sy * unit),
      drawW,
      Math.max(1, Math.round(rows * unit)),
    );
  }
}

function drawStand(ctx: CanvasRenderingContext2D, sp: SpriteBox, cx: number, feetY: number, unit: number): void {
  ctx.drawImage(
    sp.canvas,
    Math.round((cx - sp.w * 0.5) * unit),
    Math.round((feetY - sp.h) * unit),
    Math.round(sp.w * unit),
    Math.round(sp.h * unit),
  );
}

function drawTopLeft(ctx: CanvasRenderingContext2D, sp: SpriteBox, x: number, y: number, unit: number): void {
  ctx.drawImage(
    sp.canvas,
    Math.round(x * unit),
    Math.round(y * unit),
    Math.round(sp.w * unit),
    Math.round(sp.h * unit),
  );
}
