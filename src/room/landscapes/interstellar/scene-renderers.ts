import { css, mix, type RGB } from '../../../render/color';
import type { DockingTraffic, CargoFreighter, PatrolDrone, TetheredAstronaut } from './cast';
import type { SpaceInteractions } from './interactions';
import type { InterstellarSprites, Sprite } from './sprites';

const NEBULA_STARS = 22;
const GEYSER_DROPS = 18;

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
  pxMid: number;
  pyMid: number;
  pxNear: number;
  pyNear: number;
  sprites: InterstellarSprites;
  interactions: SpaceInteractions;
  freighter: CargoFreighter;
  astronaut: TetheredAstronaut;
  drone: PatrolDrone;
  docking: DockingTraffic;
  asteroids: readonly AsteroidBody[];
}

export function moonCenters(w: number, h: number, px: number, py: number): [number, number][] {
  return [
    [w * 0.2 + px, h * 0.22 + py],
    [w * 0.68 + px, h * 0.21 + py],
    [w * 0.85 + px, h * 0.28 + py],
  ];
}

export function drawRingedGiantScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, pxMid, pyMid, pxNear, pyNear, sprites, interactions, freighter } = rc;
  const { giant, ringsBack, ringsFront, ringsShimmer, moons } = sprites.worlds;
  const gx = Math.round(w * 0.8 + pxMid);
  const gy = Math.round(h * 0.75 + pyMid + Math.sin(time * 0.2) * 1.2 * unit);

  ctx.save();
  ctx.globalAlpha = alpha;
  const centers = moonCenters(w, h, pxMid * 0.65, pyMid * 0.65);
  for (let i = 0; i < 3; i++) {
    const m = moons[i];
    const mx = Math.round(centers[i][0] - m.w / 2);
    const my = Math.round(centers[i][1] + Math.sin(time * 0.35 + i * 2) * 1.5 * unit - m.h / 2);
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
  ctx.drawImage(giant.canvas, Math.round(gx - giant.w / 2), Math.round(gy - giant.h / 2));
  ctx.drawImage(ringsFront.canvas, rbx, rby);

  if (interactions.giantShimmer > 0) {
    const wave = Math.sin((interactions.giantShimmer / 1.6) * Math.PI);
    ctx.globalAlpha = alpha * wave * 0.85;
    ctx.drawImage(ringsShimmer.canvas, rbx, rby);
  }
  ctx.restore();

  freighter.draw(ctx, sprites.craft, w, h, time, unit, pxNear, pyNear, alpha);
}

export function drawNebulaScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, pxMid, pyMid, sprites, astronaut } = rc;
  const { pillarLeft, pillarRight } = sprites.worlds;
  ctx.save();
  ctx.globalAlpha = alpha;

  const drawGlow = (cx: number, cy: number, r: number, color: RGB) => {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, css(color, 0.38 * alpha));
    grad.addColorStop(1, css(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.round(r * 2));
  };
  drawGlow(w * 0.17 + pxMid, h * 0.68 + pyMid, 90 * unit, [156, 62, 168]);
  drawGlow(w * 0.83 + pxMid, h * 0.65 + pyMid, 95 * unit, [44, 188, 198]);
  drawGlow(w * 0.78 + pxMid, h * 0.22 + pyMid, 62 * unit, [120, 74, 178]);

  ctx.drawImage(pillarLeft.canvas, Math.round(-12 * unit + pxMid), Math.round(h - pillarLeft.h + 8 * unit + pyMid));
  ctx.drawImage(
    pillarRight.canvas,
    Math.round(w - pillarRight.w + 14 * unit + pxMid),
    Math.round(h - pillarRight.h + 6 * unit + pyMid),
  );

  for (let i = 0; i < NEBULA_STARS; i++) {
    const leftSide = i % 2 === 0;
    const sx = Math.round((leftSide ? w * (0.06 + (i * 0.017) % 0.22) : w * (0.72 + (i * 0.019) % 0.22)) + pxMid);
    const sy = Math.round(h * (0.2 + ((i * 37) % 58) * 0.01) + pyMid);
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
  const { w, h, unit, time, alpha, pxMid, pyMid, pxNear, pyNear, sprites, asteroids, drone } = rc;
  const { asteroids: rockSprites, outpostAsteroid } = sprites.worlds;
  ctx.save();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i];
    const sp: Sprite = rockSprites[a.variant % rockSprites.length];
    const u = (((a.u + time * a.driftX) % 1.16) + 1.16) % 1.16 - 0.08;
    const v = a.v + Math.sin(time * 0.3 + a.bobPhase) * 0.014 + Math.cos(time * 0.15 + i) * a.driftY;
    if (u > 0.37 && u < 0.64 && v > 0.72) continue;
    ctx.drawImage(sp.canvas, Math.round(u * w + pxMid - sp.w / 2), Math.round(v * h + pyMid - sp.h / 2));
  }

  const ox = Math.round(w * 0.22 + pxMid - outpostAsteroid.w / 2);
  const oy = Math.round(h * 0.73 + Math.sin(time * 0.35) * 1.5 * unit + pyMid - outpostAsteroid.h / 2);
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

  drone.draw(ctx, sprites.craft, w, h, time, unit, pxNear, pyNear, alpha);
}

export function drawIceAndStationScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, pxMid, pyMid, pxNear, pyNear, sprites, interactions, docking } = rc;
  const { iceMoon, iceMoonShimmer } = sprites.worlds;
  const { stationFrames } = sprites.craft;

  ctx.save();
  ctx.globalAlpha = alpha;

  const ix = Math.round(w * 0.21 + pxMid);
  const iy = Math.round(h * 0.77 + pyMid);
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
  for (let i = 0; i < GEYSER_DROPS; i++) {
    const p = (time * 0.55 + i / GEYSER_DROPS) % 1;
    const spread = (Math.sin(i * 4.1) * 4 + (p - 0.5) * 3) * p * unit;
    const gx = Math.round(ventX + spread);
    const gy = Math.round(ventY - p * 34 * unit);
    const gAlpha = Math.sin(p * Math.PI) * 0.75 * alpha;
    ctx.fillStyle = `rgba(210,246,255,${gAlpha.toFixed(3)})`;
    ctx.fillRect(gx, gy, p > 0.55 ? 2 : 1, 1);
  }

  const stX = Math.round(w * 0.79 + pxMid);
  const stY = Math.round(h * 0.67 + Math.sin(time * 0.28) * 1.5 * unit + pyMid);
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

  docking.draw(ctx, sprites.craft, w, h, pxNear, pyNear, alpha);
}

export function drawBinarySunScene(ctx: CanvasRenderingContext2D, rc: SceneRenderContext): void {
  const { w, h, unit, time, alpha, pxMid, pyMid, sprites } = rc;
  const { sunOrange, sunBlue, blackHole } = sprites.worlds;
  ctx.save();
  ctx.globalAlpha = alpha;

  const ox = Math.round(w * 0.18 + pxMid * 0.55);
  const oy = Math.round(h * 0.2 + pyMid * 0.55);
  const bx = Math.round(w * 0.29 + Math.sin(time * 0.18) * 3 * unit + pxMid * 0.65);
  const by = Math.round(h * 0.15 + Math.cos(time * 0.18) * 1.8 * unit + pyMid * 0.65);

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
    const dx = Math.round((w * (0.04 + t * 0.32) + pxMid * 0.8 + Math.sin(time * 0.2 + i) * 3) | 0);
    const dy = Math.round(h * (0.63 + t * 0.16) + Math.sin(t * 7 + time * 0.25) * 4 * unit + pyMid);
    ctx.fillStyle = css(mix([210, 128, 72], [92, 152, 226], t), 0.22 * alpha);
    ctx.fillRect(dx, dy, Math.round(12 * unit), Math.max(1, Math.round(2 * unit)));
  }

  const bhX = Math.round(w * 0.79 + pxMid);
  const bhY = Math.round(h * 0.72 + pyMid);
  ctx.drawImage(blackHole.canvas, Math.round(bhX - blackHole.w / 2), Math.round(bhY - blackHole.h / 2));
  ctx.restore();
}
