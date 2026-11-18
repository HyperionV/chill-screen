import { css, mix, type RGB } from '../../../render/color';
import { breeze } from '../../wind';
import type { DockingTraffic, CargoFreighter, PatrolDrone, TetheredAstronaut } from './cast';
import type { SpaceInteractions } from './interactions';
import type { InterstellarSprites, Sprite } from './sprites';

const NEBULA_STARS = 22;
const GEYSER_DROPS = 18;
/** Peak movement in stage pixels for loose dust, and at the tips of pillars and vapor. */
const WIND_BEND = 3;
/** Draw short bands from the cached pillar so its base stays anchored. */
const PILLAR_BANDS = 5;
/** Cloud drift is slower than the wave through the pillars and vapor. */
const CLOUD_DRIFT_RATE = 0.09;
const CLOUD_PHASE_PER_PIXEL = 0.021;
const CLOUD_CALM_FRACTION = 0.3;
/** Different parts of the glow change at different rates. */
const HAZE_SHAPE_RATE = 0.7;
const HAZE_CORE_DRIFT = 2;
/** Chapter travel is reduced for farther objects. */
const MOON_SLIDE_SHARE = 0.65;
const ORANGE_SUN_SLIDE_SHARE = 0.55;
const BLUE_SUN_SLIDE_SHARE = 0.65;
const DUST_SLIDE_SHARE = 0.8;

const NEBULA_PLUM: RGB = [156, 62, 168];
const NEBULA_TEAL: RGB = [44, 188, 198];
const NEBULA_VIOLET: RGB = [120, 74, 178];

export const MOON_POSITIONS: readonly [number, number][] = [[0.2, 0.22], [0.68, 0.21], [0.85, 0.28]];

export interface AsteroidBody {
  u: number;
  v: number;
  variant: number;
  driftX: number;
  driftY: number;
  bobPhase: number;
}

export interface SceneRenderContext {
  w: number;
  h: number;
  unit: number;
  time: number;
  alpha: number;
  chapterSlide: number;
  windStrength: number;
  sprites: InterstellarSprites;
  interactions: SpaceInteractions;
  freighter: CargoFreighter;
  astronaut: TetheredAstronaut;
  drone: PatrolDrone;
  docking: DockingTraffic;
  asteroids: readonly AsteroidBody[];
}

function cloudWave(time: number, x: number, windStrength: number): number {
  const strength = CLOUD_CALM_FRACTION + (1 - CLOUD_CALM_FRACTION) * windStrength;
  return Math.sin(time * CLOUD_DRIFT_RATE + x * CLOUD_PHASE_PER_PIXEL) * strength;
}

export function drawHaze(
  ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: RGB, alpha: number,
  time: number, windStrength: number,
): void {
  const drift = cloudWave(time, x, windStrength);
  const shape = cloudWave(time * HAZE_SHAPE_RATE, y, windStrength);
  const cx = Math.round(x + drift * WIND_BEND);
  const cy = Math.round(y);
  const r = Math.max(1, Math.round(radius + shape * WIND_BEND));
  const coreX = cx + Math.round(shape * Math.min(HAZE_CORE_DRIFT, r / 2));
  const grad = ctx.createRadialGradient(coreX, cy, 0, cx, cy, r);
  grad.addColorStop(0, css(color, alpha));
  grad.addColorStop(1, css(color, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

export function drawRingedGiantScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, chapterSlide, windStrength, sprites, interactions, freighter } = rc;
  const { giant, ringsBack, ringsFront, ringsShimmer, moons } = sprites.worlds;
  const gx = Math.round(w * 0.8 + chapterSlide);
  const gy = Math.round(h * 0.75 + Math.sin(time * 0.2) * 1.2 * unit);

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < MOON_POSITIONS.length; i++) {
    const [u, v] = MOON_POSITIONS[i];
    const m = moons[i];
    const mx = Math.round(u * w + chapterSlide * MOON_SLIDE_SHARE - m.w / 2);
    const my = Math.round(v * h + Math.sin(time * 0.35 + i * 2) * 1.5 * unit - m.h / 2);
    ctx.drawImage(m.canvas, mx, my);
    const shim = interactions.moonShimmers[i];
    if (shim > 0) {
      const wave = Math.sin((shim / 1.6) * Math.PI);
      ctx.fillStyle = `rgba(230,244,255,${(0.45 * wave * alpha).toFixed(3)})`;
      ctx.fillRect(mx + 1, my + 1, Math.max(2, m.w - 2), 1);
    }
  }

  const rbx = Math.round(gx - ringsBack.w / 2);
  const rby = Math.round(gy - ringsBack.h / 2);
  ctx.drawImage(ringsBack.canvas, rbx, rby);
  const [still, windward, leeward] = giant;
  const planetX = Math.round(gx - still.w / 2);
  const planetY = Math.round(gy - still.h / 2);
  const wave = cloudWave(time, w * 0.8, windStrength);
  const cloudAlpha = Math.abs(wave) * alpha;
  // Keep the planet's opacity tied to the chapter fade when blending the two cloud shapes.
  ctx.globalAlpha = cloudAlpha < 1 ? (alpha - cloudAlpha) / (1 - cloudAlpha) : 0;
  ctx.drawImage(still.canvas, planetX, planetY);
  ctx.globalAlpha = cloudAlpha;
  ctx.drawImage(wave < 0 ? windward.canvas : leeward.canvas, planetX, planetY);
  ctx.globalAlpha = alpha;
  ctx.drawImage(ringsFront.canvas, rbx, rby);

  if (interactions.giantShimmer > 0) {
    const wave = Math.sin((interactions.giantShimmer / 1.6) * Math.PI);
    ctx.globalAlpha = alpha * wave * 0.85;
    ctx.drawImage(ringsShimmer.canvas, rbx, rby);
  }
  ctx.restore();

  freighter.draw(ctx, sprites.craft, w, h, time, unit, chapterSlide, alpha);
}

function drawNebulaPillar(ctx: CanvasRenderingContext2D, sprite: Sprite, x: number, y: number, wind: number): void {
  const tip = wind * WIND_BEND;
  if (Math.round(tip) === 0) {
    ctx.drawImage(sprite.canvas, x, y);
    return;
  }

  let row = 0;
  for (let band = 0; band < PILLAR_BANDS; band++) {
    const end = Math.round(sprite.h * (band + 1) / PILLAR_BANDS);
    const height = end - row;
    const fromBase = 1 - band / (PILLAR_BANDS - 1);
    const sway = Math.round(tip * fromBase * fromBase);
    ctx.drawImage(sprite.canvas, 0, row, sprite.w, height, x + sway, y + row, sprite.w, height);
    row = end;
  }
}

export function drawNebulaScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, chapterSlide, windStrength, sprites, astronaut } = rc;
  const { pillarLeft, pillarRight } = sprites.worlds;
  ctx.save();
  ctx.globalAlpha = alpha;

  const glow = 0.38 * alpha;
  drawHaze(ctx, w * 0.17 + chapterSlide, h * 0.68, 90 * unit, NEBULA_PLUM, glow, time, windStrength);
  drawHaze(ctx, w * 0.83 + chapterSlide, h * 0.65, 95 * unit, NEBULA_TEAL, glow, time, windStrength);
  drawHaze(ctx, w * 0.78 + chapterSlide, h * 0.22, 62 * unit, NEBULA_VIOLET, glow, time, windStrength);

  const leftX = Math.round(-12 * unit + chapterSlide);
  const rightX = Math.round(w - pillarRight.w + 14 * unit + chapterSlide);
  drawNebulaPillar(ctx, pillarLeft, leftX, Math.round(h - pillarLeft.h + 8 * unit), breeze(time, leftX + pillarLeft.w / 2));
  drawNebulaPillar(ctx, pillarRight, rightX, Math.round(h - pillarRight.h + 6 * unit), breeze(time, rightX + pillarRight.w / 2));

  for (let i = 0; i < NEBULA_STARS; i++) {
    const leftSide = i % 2 === 0;
    const sx = Math.round((leftSide ? w * (0.06 + (i * 0.017) % 0.22) : w * (0.72 + (i * 0.019) % 0.22)) + chapterSlide);
    const sy = Math.round(h * (0.2 + ((i * 37) % 58) * 0.01));
    const pulse = 0.4 + 0.6 * Math.sin(time * (0.9 + (i % 4) * 0.25) + i * 1.7);
    ctx.fillStyle = css(i % 3 === 0 ? [255, 240, 190] : [182, 248, 255], pulse * alpha);
    ctx.fillRect(sx, sy, 1, 1);
    if (pulse > 0.82) {
      ctx.fillStyle = css([220, 252, 255], 0.35 * pulse * alpha);
      ctx.fillRect(sx - 1, sy, 3, 1);
      ctx.fillRect(sx, sy - 1, 1, 3);
    }
  }
  ctx.restore();

  astronaut.draw(ctx, sprites.craft, time, unit, alpha);
}

export function drawAsteroidScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, chapterSlide, sprites, asteroids, drone } = rc;
  const { asteroids: rockSprites, outpostAsteroid } = sprites.worlds;
  ctx.save();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    const sp: Sprite = rockSprites[a.variant % rockSprites.length];
    const u = (((a.u + time * a.driftX) % 1.16) + 1.16) % 1.16 - 0.08;
    const v = a.v + Math.sin(time * 0.3 + a.bobPhase) * 0.014 + Math.cos(time * 0.15 + i) * a.driftY;
    if (u > 0.37 && u < 0.64 && v > 0.72) continue;
    ctx.drawImage(sp.canvas, Math.round(u * w + chapterSlide - sp.w / 2), Math.round(v * h - sp.h / 2));
  }

  const ox = Math.round(w * 0.22 + chapterSlide - outpostAsteroid.w / 2);
  const oy = Math.round(h * 0.73 + Math.sin(time * 0.35) * 1.5 * unit - outpostAsteroid.h / 2);
  ctx.drawImage(outpostAsteroid.canvas, ox, oy);

  if (Math.sin(time * 3.4) > 0.15) {
    const bx = ox + Math.round(outpostAsteroid.w * 0.41);
    const by = oy + Math.round(4 * unit);
    ctx.fillStyle = `rgba(255,146,84,${alpha.toFixed(3)})`;
    ctx.fillRect(bx, by, 2, 2);
    ctx.fillStyle = `rgba(110,238,255,${alpha.toFixed(3)})`;
    ctx.fillRect(ox + Math.round(outpostAsteroid.w * 0.61), by + Math.round(2 * unit), 1, 1);
  }
  ctx.restore();

  drone.draw(ctx, sprites.craft, w, h, time, unit, chapterSlide, alpha);
}

export function drawIceAndStationScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, chapterSlide, sprites, interactions, docking } = rc;
  const { iceMoon, iceMoonShimmer } = sprites.worlds;
  const { stationFrames } = sprites.craft;

  ctx.save();
  ctx.globalAlpha = alpha;

  const ix = Math.round(w * 0.21 + chapterSlide);
  const iy = Math.round(h * 0.77);
  const imx = Math.round(ix - iceMoon.w / 2);
  const imy = Math.round(iy - iceMoon.h / 2);
  ctx.drawImage(iceMoon.canvas, imx, imy);

  if (interactions.iceMoonShimmer > 0) {
    const wave = Math.sin((interactions.iceMoonShimmer / 1.6) * Math.PI);
    ctx.globalAlpha = alpha * wave * 0.9;
    ctx.drawImage(iceMoonShimmer.canvas, imx, imy);
    ctx.globalAlpha = alpha;
  }

  const ventX = ix - Math.round(12 * unit);
  const ventY = iy - Math.round(iceMoon.h * 0.45);
  const ventWind = breeze(time, ventX) * WIND_BEND;
  for (let i = 0; i < GEYSER_DROPS; i++) {
    const p = (time * 0.55 + i / GEYSER_DROPS) % 1;
    const spread = (Math.sin(i * 4.1) * 4 + (p - 0.5) * 3) * p * unit;
    const gx = Math.round(ventX + spread + ventWind * p * p);
    const gy = Math.round(ventY - p * 34 * unit);
    const gAlpha = Math.sin(p * Math.PI) * 0.75 * alpha;
    ctx.fillStyle = `rgba(210,246,255,${gAlpha.toFixed(3)})`;
    ctx.fillRect(gx, gy, p > 0.55 ? 2 : 1, 1);
  }

  const stX = Math.round(w * 0.79 + chapterSlide);
  const stY = Math.round(h * 0.67 + Math.sin(time * 0.28) * 1.5 * unit);
  const st = stationFrames[Math.floor(time * 2.2) % stationFrames.length];
  ctx.drawImage(st.canvas, Math.round(stX - st.w / 2), Math.round(stY - st.h / 2));

  const flashTimer = Math.max(interactions.stationFlash, docking.dockBeaconActive());
  if (flashTimer > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4.5);
    const glowAlpha = Math.min(1, flashTimer / 0.4) * pulse * alpha;
    ctx.fillStyle = `rgba(128,244,255,${(glowAlpha * 0.55).toFixed(3)})`;
    ctx.fillRect(stX - 3, stY - 3, 6, 6);
    ctx.fillStyle = `rgba(255,244,176,${glowAlpha.toFixed(3)})`;
    ctx.fillRect(stX - 1, stY - 1, 2, 2);
  }
  ctx.restore();

  docking.draw(ctx, sprites.craft, w, h, chapterSlide, alpha);
}

export function drawBinarySunScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, chapterSlide, windStrength, sprites } = rc;
  const { sunOrange, sunBlue, blackHole } = sprites.worlds;
  ctx.save();
  ctx.globalAlpha = alpha;

  const ox = Math.round(w * 0.18 + chapterSlide * ORANGE_SUN_SLIDE_SHARE);
  const oy = Math.round(h * 0.2);
  const bx = Math.round(w * 0.29 + Math.sin(time * 0.18) * 3 * unit + chapterSlide * BLUE_SUN_SLIDE_SHARE);
  const by = Math.round(h * 0.15 + Math.cos(time * 0.18) * 1.8 * unit);

  const drawFlare = (cx: number, cy: number, r: number, c: RGB) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, css(c, 0.34 * alpha));
    g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.round(r * 2));
  };
  drawFlare(ox, oy, 64 * unit, [255, 148, 62]);
  drawFlare(bx, by, 42 * unit, [110, 190, 255]);

  ctx.drawImage(sunOrange.canvas, Math.round(ox - sunOrange.w / 2), Math.round(oy - sunOrange.h / 2));
  ctx.drawImage(sunBlue.canvas, Math.round(bx - sunBlue.w / 2), Math.round(by - sunBlue.h / 2));

  const rayLen = Math.round((20 + Math.sin(time * 1.1) * 3) * unit);
  ctx.fillStyle = `rgba(255,228,176,${(0.35 * alpha).toFixed(3)})`;
  ctx.fillRect(ox - rayLen, oy, rayLen * 2, 1);
  ctx.fillRect(ox, oy - rayLen, 1, rayLen * 2);

  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const x = w * (0.04 + t * 0.32) + chapterSlide * DUST_SLIDE_SHARE;
    const dx = Math.round(x + cloudWave(time, x, windStrength) * WIND_BEND);
    const dy = Math.round(h * (0.63 + t * 0.16) + Math.sin(t * 7) * 4 * unit + breeze(time, x) * WIND_BEND);
    ctx.fillStyle = css(mix([210, 128, 72], [92, 152, 226], t), 0.22 * alpha);
    ctx.fillRect(dx, dy, Math.round(12 * unit), Math.max(1, Math.round(2 * unit)));
  }

  const bhX = Math.round(w * 0.79 + chapterSlide);
  const bhY = Math.round(h * 0.72);
  ctx.drawImage(blackHole.canvas, Math.round(bhX - blackHole.w / 2), Math.round(bhY - blackHole.h / 2));
  ctx.restore();
}
