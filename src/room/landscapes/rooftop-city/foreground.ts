import { clamp01, type SkyState } from '../../sky';
import { breeze, gust } from '../../wind';
import type { SpriteBox } from './cast-sprites';
import {
  AC_SPOTS,
  ANTENNA_SPOTS,
  CABLE_SPANS,
  CHAIR_TABLE_SPOTS,
  CRATE_PLANTER_SPOTS,
  DRAIN_XS,
  FRONT_PIER_XS,
  LADDER_SPOTS,
  REAR_PIER_XS,
  SCENE_STRING_SPANS,
  SECONDARY_LAUNDRY,
  VENT_STACK_SPOTS,
} from './foreground-layout';
import type { ForegroundSprites } from './foreground-sprites';
import type { RooftopInteractions } from './interactions';
import { drawDitheredSpill, drawHalo, type HaloSprites } from './light-halos';
import { NearRoofs } from './near-roofs';
import { PuddleLayer } from './puddles';
import { SCENE_SPACING, WORLD_W, deckTopAt, rearCapAt, wrapDelta } from './scenes';
import { Terrace } from './terrace';
import { drawWindBent, drawWire, windSag, wireHeight } from './wind-motion';

const LEAF_ORIGINS = [-126, -140, -100, 94, -104];
const MAX_LEAF_TRAVEL = 42;
const STEAM_WISPS = 3;
const CLOTH_TIP_BEND = 2.6;
const CRATE_TIP_BEND = 2.4;

/**
 * Manages the darker near-foreground roof silhouette layer, the deep multi-plane
 * foreground rooftop (rear parapet, terrace pavers, puddles, front brick parapet),
 * and lived-in props (AC units, vent stacks, ladders, crate planters, chairs/tables,
 * antennas with blinking beacons, cables, string lights, and secondary laundry).
 */
export class ForegroundLayer {
  private readonly nearRoofs = new NearRoofs();
  private readonly terrace = new Terrace();
  private readonly puddles = new PuddleLayer();
  private leafCycle = 0;

  update(dt: number, time: number): void {
    this.puddles.update(dt);
    this.leafCycle = (this.leafCycle + dt * (0.08 + 0.18 * gust(time))) % 1;
  }

  coversSkyline(x: number, y: number, camX: number, width: number): boolean {
    return y >= rearCapAt(camX + x - width / 2) || this.nearRoofs.covers(x, y, camX, width);
  }

  /** Spawns a water ripple if `(dx, dy)` lands inside a terrace puddle. */
  tryClickPuddle(dx: number, dy: number): boolean {
    return this.puddles.tryClick(dx, dy);
  }

  drawSilhouetteLayer(ctx: CanvasRenderingContext2D, camX: number, designW: number, unit: number): void {
    this.nearRoofs.draw(ctx, camX, designW, unit);
  }

  /** Draws the deep rooftop terrace, rear & front brick parapets, overlook railing, drains, and puddles. */
  drawTerraceAndParapet(
    L: CanvasRenderingContext2D,
    state: SkyState,
    time: number,
    camX: number,
    designW: number,
    unit: number,
    fgSprites: ForegroundSprites,
  ): void {
    const halfW = designW * 0.5;
    this.terrace.draw(L, camX, designW, unit);
    // Overlook wrought-iron railing in Scene 1
    const overlookSx = wrapDelta(SCENE_SPACING, camX, WORLD_W) + halfW;
    if (overlookSx > -200 && overlookSx < designW + 200) {
      const railLeft = Math.round((overlookSx - 148) * unit);
      const railW = Math.round(296 * unit);
      const railTop = Math.round(202 * unit);
      const railThick = Math.max(1, Math.round(unit));
      L.fillStyle = '#363d4a';
      L.fillRect(railLeft, railTop, railW, railThick);
      L.fillRect(railLeft, railTop + Math.round(5 * unit), railW, railThick);
      L.fillStyle = '#5a6476';
      L.fillRect(railLeft, railTop, railW, Math.max(1, Math.round(0.5 * unit)));
      for (let rx = overlookSx - 144; rx <= overlookSx + 144; rx += 16) {
        L.fillStyle = '#363d4a';
        L.fillRect(Math.round(rx * unit), railTop, railThick, Math.round(13 * unit));
      }
    }

    // Rear parapet brick piers & front corner brick piers (off the central radio band)
    for (const px of REAR_PIER_XS) {
      const psx = wrapDelta(px, camX, WORLD_W) + halfW;
      if (psx < -20 || psx > designW + 20) continue;
      const dx = Math.round((psx - fgSprites.brickPier.w * 0.5) * unit);
      const dy = Math.round((rearCapAt(px) - 6) * unit);
      L.drawImage(
        fgSprites.brickPier.canvas,
        0,
        0,
        fgSprites.brickPier.w,
        17,
        dx,
        dy,
        Math.round(fgSprites.brickPier.w * unit),
        Math.round(17 * unit),
      );
    }

    for (const px of FRONT_PIER_XS) {
      const psx = wrapDelta(px, camX, WORLD_W) + halfW;
      if (psx < -20 || psx > designW + 20) continue;
      if (psx > designW * 0.34 && psx < designW * 0.66) continue;
      const dx = Math.round((psx - fgSprites.brickPier.w * 0.5) * unit);
      const dy = Math.round(236 * unit);
      L.drawImage(
        fgSprites.brickPier.canvas,
        0,
        0,
        fgSprites.brickPier.w,
        34,
        dx,
        dy,
        Math.round(fgSprites.brickPier.w * unit),
        Math.round(34 * unit),
      );
    }

    // Terrace drain grates
    for (const dxPos of DRAIN_XS) {
      const psx = wrapDelta(dxPos, camX, WORLD_W) + halfW;
      if (psx < -20 || psx > designW + 20) continue;
      drawStand(L, fgSprites.drainGrate, psx, 222, unit);
    }

    // Rainwater puddles on the terrace (sky & ambient reflection base)
    this.puddles.drawPreTint(L, state, time, camX, halfW, designW, unit);
  }

  /** Draws foreground rooftop props (AC units, pipes, cables, ladders, vent stacks, crates, tables, antennas, laundry). */
  drawPropsPreTint(
    L: CanvasRenderingContext2D,
    time: number,
    camX: number,
    designW: number,
    unit: number,
    pointerDesign: { x: number; y: number } | null,
    fgSprites: ForegroundSprites,
    interactions: RooftopInteractions,
  ): void {
    const halfW = designW * 0.5;
    const toScreenX = (wx: number): number => wrapDelta(wx, camX, WORLD_W) + halfW;
    const onScreen = (sx: number, margin: number): boolean => sx > -margin && sx < designW + margin;
    const u = Math.max(1, Math.round(unit));

    const wind = gust(time);
    // Short, broken wisps thin out as they rise and drift downwind.
    for (const vs of VENT_STACK_SPOTS) {
      const sx = toScreenX(vs.wx);
      if (!onScreen(sx, 30)) continue;
      const sp = fgSprites.ventStacks[vs.variant % fgSprites.ventStacks.length];
      if (!sp) continue;
      drawGrounded(L, sp, sx, vs.feetY, unit);
      const lean = breeze(time, vs.wx);
      for (let i = 0; i < STEAM_WISPS; i++) {
        const age = (time * 0.29 + i / STEAM_WISPS + (vs.wx & 7) * 0.1) % 1;
        const px = Math.round((sx + age * (3 + 9 * wind + 2 * lean)) * unit);
        const py = Math.round((vs.feetY - sp.h - 2 - age * 12) * unit);
        L.globalAlpha = Math.sin(age * Math.PI) * 0.31;
        L.fillStyle = '#c6cbd8';
        L.fillRect(px, py, 2 * u, u);
        L.fillRect(px + 2 * u, py - u, u, u);
      }
      L.globalAlpha = 1;
    }

    // Antennas with mast & crossbars
    for (const ant of ANTENNA_SPOTS) {
      const sx = toScreenX(ant.wx);
      if (!onScreen(sx, 30)) continue;
      const sp = fgSprites.antennaMasts[ant.variant % fgSprites.antennaMasts.length];
      if (sp) drawStand(L, sp, sx, ant.feetY, unit);
    }

    // Sagging rooftop cables
    for (const c of CABLE_SPANS) {
      const x1 = toScreenX(c.wx1);
      const x2 = x1 + c.wx2 - c.wx1;
      if (Math.max(x1, x2) < -20 || Math.min(x1, x2) > designW + 20) continue;
      drawWire(L, x1, c.y1, x2, c.y2, windSag(time, c.wx1, c.sag), unit, '#252a34');
    }

    // String light wires (for scenes 0, 1, 3, 4; scene 2 uses bar string lights)
    for (const span of SCENE_STRING_SPANS) {
      const x1 = toScreenX(span.wx1);
      const x2 = x1 + span.wx2 - span.wx1;
      if (Math.max(x1, x2) < -20 || Math.min(x1, x2) > designW + 20) continue;
      drawPost(L, x1, span.y1, deckTopAt(span.wx1) + 4, unit);
      drawPost(L, x2, span.y2, deckTopAt(span.wx2) + 4, unit);
      drawWire(L, x1, span.y1, x2, span.y2, windSag(time, span.wx1, span.sag), unit, '#242832');
    }

    // Secondary laundry lines in Scenes 1..4
    for (const line of SECONDARY_LAUNDRY) {
      const x1 = toScreenX(line.wx1);
      const x2 = x1 + line.wx2 - line.wx1;
      if (Math.max(x1, x2) < -20 || Math.min(x1, x2) > designW + 20) continue;
      const sag = windSag(time, line.wx1, line.sag);
      drawPost(L, x1, line.y, deckTopAt(line.wx1) + 4, unit);
      drawPost(L, x2, line.y, deckTopAt(line.wx2) + 4, unit);
      drawWire(L, x1, line.y, x2, line.y, sag, unit, '#acafbb');
      for (let i = 0; i < line.count; i++) {
        const frac = (i + 0.5) / line.count;
        const gx = x1 + (x2 - x1) * frac;
        const gy = wireHeight(line.y, line.y, sag, frac) + 1;
        const sp = fgSprites.shortGarments[(i + line.seedOffset) % fgSprites.shortGarments.length];
        const air = breeze(time, line.wx1 + gx - x1) * CLOTH_TIP_BEND;
        const nearPointer = interactions.breezeAt(gx, gy + sp.h / 2, pointerDesign);
        drawWindBent(L, sp, gx, gy, unit, air + nearPointer, true);
      }
    }

    // Ladders
    for (const ld of LADDER_SPOTS) {
      const sx = toScreenX(ld.wx);
      if (!onScreen(sx, 30)) continue;
      const sp = fgSprites.ladders[ld.variant % fgSprites.ladders.length];
      if (sp) drawGrounded(L, sp, sx, ld.feetY, unit);
    }

    // AC units + pipe runs to rear parapet + spinning fan blades
    for (const ac of AC_SPOTS) {
      const sx = toScreenX(ac.wx);
      if (!onScreen(sx, 40)) continue;
      const sp = fgSprites.acUnits[ac.variant % fgSprites.acUnits.length];
      if (!sp) continue;

      // Insulated pipe run from AC junction back to rear parapet
      const pipeX = Math.round((sx + sp.w * 0.45) * unit);
      const pipeTop = Math.round((deckTopAt(ac.wx) - 4) * unit);
      const pipeBot = Math.round((ac.feetY - 6) * unit);
      L.fillStyle = '#636a7a';
      L.fillRect(pipeX, pipeTop, u * 2, pipeBot - pipeTop);
      L.fillStyle = '#b4744c';
      L.fillRect(pipeX + u * 2, pipeTop + u, u, pipeBot - pipeTop - u);
      L.fillRect(pipeX - 3 * u, pipeTop + u, 5 * u, u);
      L.fillStyle = '#a3a9b7';
      L.fillRect(pipeX - u, pipeTop + 6 * u, 4 * u, u);
      L.fillRect(pipeX - u, pipeBot - 3 * u, 4 * u, u);

      drawGrounded(L, sp, sx, ac.feetY, unit);

      // Animated pixel fan blades inside circular grille
      const fanCx = Math.round((sx - sp.w / 2 + sp.fanX) * unit);
      const fanCy = Math.round((ac.feetY - sp.h + sp.fanY) * unit);
      const step = Math.floor(time * 6) % 2;
      L.fillStyle = '#6b7688';
      if (step === 0) {
        L.fillRect(fanCx - u * 2, fanCy, u * 5, u);
        L.fillRect(fanCx, fanCy - u * 2, u, u * 5);
      } else {
        L.fillRect(fanCx - u * 2, fanCy - u * 2, u, u);
        L.fillRect(fanCx + u * 2, fanCy - u * 2, u, u);
        L.fillRect(fanCx - u * 2, fanCy + u * 2, u, u);
        L.fillRect(fanCx + u * 2, fanCy + u * 2, u, u);
      }
    }

    // Foliage bends above the crate, with a small local reaction to the pointer.
    for (const cp of CRATE_PLANTER_SPOTS) {
      const sx = toScreenX(cp.wx);
      if (!onScreen(sx, 30)) continue;
      const sp = fgSprites.cratePlanters[cp.variant % fgSprites.cratePlanters.length];
      const top = cp.feetY - sp.h;
      const air = breeze(time, cp.wx) * CRATE_TIP_BEND;
      const nearPointer = interactions.breezeAt(sx, top + sp.h / 2, pointerDesign);
      drawContactShadow(L, sx, cp.feetY, sp.w, unit);
      const crateRows = sp.h === 10 ? 5 : 6;
      drawWindBent(L, sp, sx, top, unit, air + nearPointer, false, crateRows);
    }

    // Chairs & small tables
    for (const ct of CHAIR_TABLE_SPOTS) {
      const sx = toScreenX(ct.wx);
      if (!onScreen(sx, 40)) continue;
      const sp = fgSprites.chairsTables[ct.variant % fgSprites.chairsTables.length];
      if (sp) drawGrounded(L, sp, sx, ct.feetY, unit);
    }

    this.drawLooseLeaves(L, time, camX, designW, unit);
  }

  private drawLooseLeaves(ctx: CanvasRenderingContext2D, time: number, camX: number, width: number, unit: number): void {
    const u = Math.max(1, Math.round(unit));
    ctx.save();
    for (let scene = 0; scene < LEAF_ORIGINS.length; scene++) {
      const origin = scene * SCENE_SPACING + LEAF_ORIGINS[scene];
      for (let i = 0; i < 2; i++) {
        const phase = (this.leafCycle + scene * 0.19 + i * 0.31) % 1;
        if (phase >= 0.46) continue;
        const age = phase / 0.46;
        const wx = origin + age * MAX_LEAF_TRAVEL + i * 5;
        const sx = wrapDelta(wx, camX, WORLD_W) + width / 2;
        if (sx < -3 || sx > width + 3 || Math.abs(sx - width / 2) < width * 0.14) continue;
        const y = 226 + i * 4 - Math.sin(age * Math.PI) * (8 + breeze(time, wx) * 3);
        ctx.globalAlpha = Math.sin(age * Math.PI) * 0.9;
        ctx.fillStyle = i === 0 ? '#9b9d65' : '#b08560';
        const px = Math.round(sx * unit);
        const py = Math.round(y * unit);
        ctx.fillRect(px, py, 2 * u, u);
        ctx.fillRect(px + Math.round(age) * u, py - u, u, u);
      }
    }
    ctx.restore();
  }

  /** Draws post-tint string light halos, blinking antenna beacons, table lantern glows, and puddle reflections. */
  drawPropsPostTint(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    time: number,
    camX: number,
    designW: number,
    unit: number,
    fgSprites: ForegroundSprites,
    halos: HaloSprites,
  ): void {
    const halfW = designW * 0.5;
    const toScreenX = (wx: number): number => wrapDelta(wx, camX, WORLD_W) + halfW;
    const night = 1 - state.day;

    // Puddle night/sunset reflections + click ripples
    this.puddles.drawPostTint(ctx, state, time, camX, halfW, designW, unit);

    // Table lantern warm halos & table-top spill
    for (const ct of CHAIR_TABLE_SPOTS) {
      const sx = toScreenX(ct.wx);
      if (sx < -40 || sx > designW + 40) continue;
      const glowSp = fgSprites.chairsTableGlows[ct.variant % fgSprites.chairsTableGlows.length];
      const glowAlpha = clamp01(0.28 + night * 0.72);
      if (glowSp) {
        ctx.save();
        ctx.globalAlpha = glowAlpha;
        drawStand(ctx, glowSp, sx, ct.feetY, unit);
        ctx.restore();
      }
      const flicker = 0.88 + 0.12 * Math.sin(time * 2.1 + ct.wx * 0.05);
      const lampY = ct.feetY - (ct.variant === 0 ? 10 : 8);
      drawHalo(ctx, halos.lanternWarm, sx - 1, lampY, unit, glowAlpha * 0.78 * flicker);
      if (night > 0.15) {
        drawDitheredSpill(ctx, halos.tableSpill, sx, Math.min(242, ct.feetY + 1), night * 0.30, unit);
      }
    }

    // String lights across Scenes 0, 1, 3, 4 with layered dithered halos + terrace spill
    for (const span of SCENE_STRING_SPANS) {
      const x1 = toScreenX(span.wx1);
      const x2 = x1 + span.wx2 - span.wx1;
      if (Math.max(x1, x2) < -24 || Math.min(x1, x2) > designW + 24) continue;
      const sag = windSag(time, span.wx1, span.sag);
      for (let i = 1; i < span.bulbs; i++) {
        const frac = i / span.bulbs;
        const bx = x1 + (x2 - x1) * frac;
        if (bx < -8 || bx > designW + 8) continue;
        const by = wireHeight(span.y1, span.y2, sag, frac) + 1;
        const pulse = 0.88 + 0.12 * Math.sin(time * 1.9 + i * 1.2);
        const alpha = clamp01((0.35 + 0.65 * night) * pulse);
        drawHalo(ctx, halos.bulbAmber, bx, by, unit, alpha);
      }
      if (night > 0.2) {
        const midX = (x1 + x2) * 0.5;
        const midWx = (span.wx1 + span.wx2) * 0.5;
        drawDitheredSpill(ctx, halos.stringSpill, midX, deckTopAt(midWx) + 9, night * 0.24, unit);
      }
    }

    // Blinking red aviation lights on rooftop antennas (calm ~0.35 Hz pulse)
    for (const ant of ANTENNA_SPOTS) {
      const sx = toScreenX(ant.wx);
      if (sx < -20 || sx > designW + 20) continue;
      const sp = fgSprites.antennaMasts[ant.variant % fgSprites.antennaMasts.length];
      if (!sp) continue;
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + ant.phase);
      if (pulse < 0.32) continue;
      const strength = ((pulse - 0.32) / 0.68) * clamp01(0.42 + night * 0.58);
      drawHalo(ctx, halos.beaconRed, sx, ant.feetY - sp.h + 1, unit, strength);
    }
  }
}

function drawPost(ctx: CanvasRenderingContext2D, sx: number, top: number, foot: number, unit: number): void {
  const x = Math.round(sx * unit);
  const y = Math.round(top * unit);
  const h = Math.round(foot * unit) - y;
  const u = Math.max(1, Math.round(unit));
  ctx.fillStyle = '#343947';
  ctx.fillRect(x, y, 2 * u, h);
  ctx.fillStyle = '#5c616f';
  ctx.fillRect(x, y, u, h);
}

function drawContactShadow(ctx: CanvasRenderingContext2D, sx: number, foot: number, width: number, unit: number): void {
  const x = Math.round((sx - width / 2) * unit);
  const y = Math.round((foot - 2) * unit);
  const u = Math.max(1, Math.round(unit));
  const w = Math.round(width * unit);
  ctx.fillStyle = '#252a3a62';
  ctx.fillRect(x + u, y, w, 2 * u);
  ctx.fillRect(x + 2 * u, y + 2 * u, w - 2 * u, u);
}

function drawGrounded(ctx: CanvasRenderingContext2D, sp: SpriteBox, sx: number, foot: number, unit: number): void {
  drawContactShadow(ctx, sx, foot, sp.w, unit);
  drawStand(ctx, sp, sx, foot, unit);
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
