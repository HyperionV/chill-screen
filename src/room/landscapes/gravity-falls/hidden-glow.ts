/**
 * Every light of the Hidden Hollow, added after the night tint so it stays bright: the shack's tiny window and the
 * valley's roofs far below, the old iron lamp and its moths, glowing toadstools and crystals, the runes in the stones,
 * floating sparks, and the golden light that pours from the round door once it is open (`open` runs 0 shut to 1 open).
 */
import { drawHalo, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { valleyLights, valleyWindow } from './hidden-art';
import { GOLD, TEAL, WARM, type HiddenLayout } from './hidden-layout';
import { drawRunes, type Rune, type RuneSheets } from './hidden-stones';
import { litAmount } from './shack-life';

/** Everything the lights need that is made once when the scene is built. */
export interface GlowKit {
  layout: HiddenLayout;
  /** Where the iron lamp shines from. */
  lamp: Point;
  runes: readonly Rune[];
  sheets: RuneSheets;
}

const HALO_WARM = '#ffa94a';
const HALO_LAMP = '#ffc060';
const HALO_CRYSTAL = '#b48aff';
const FLICKER_SPEED = 2.1;
/** The far window is a little lit even by day, so the eye finds it; it takes the rest of its strength at dusk. */
const WINDOW_DAY = 0.35;
/** The lamp and toadstools have a trace of light before dusk. */
const LAMP_DAY = 0.12;
const SHROOM_DAY = 0.25;
const CRYSTAL_DAY = 0.3;
const MOTHS = 2;
const SPARKS = 18;
const SPARK_ROW = 225;
const SPARK_RISE = 70;
const SPARK_DAY = 0.35;
/** Sparks in the clearing keep to this stretch of the width (the stones and the lawn at the right). */
const SPARK_FROM = 0.55;
const SPARK_SPAN = 0.4;
const DOOR_MOTES = 8;
const DOOR_HALO_FAR = 34;
const DOOR_HALO_NEAR = 18;
const DOOR_POOL = 26;
const DOOR_DAY = 0.6;
const DOOR_PULSE_SPEED = 0.9;

const flicker = (time: number, seed: number): number => 0.88 + 0.12 * Math.sin(time * FLICKER_SPEED + seed * 5.3);

function glowRect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, alpha: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, alpha);
  rect(ctx, color, x, y, w, h);
  ctx.globalAlpha = before;
}

/** The shack's window and the roofs far down in the valley. */
function drawValley(ctx: Ctx, layout: HiddenLayout, time: number, lit: number): void {
  const pane = valleyWindow(layout);
  const strength = WINDOW_DAY + (1 - WINDOW_DAY) * lit;
  glowRect(ctx, WARM, pane.x, pane.y, 2, 2, strength);
  drawHalo(ctx, pane.x + 1, pane.y + 1, 7, HALO_WARM, 0.5 * strength * flicker(time, 1));
  if (lit <= 0) return;
  valleyLights(layout).forEach((p, i) => {
    glowRect(ctx, WARM, p.x, p.y, 1, 1, 0.9 * lit * flicker(time, i + 3));
    drawHalo(ctx, p.x, p.y, 3, HALO_WARM, 0.3 * lit);
  });
}

/** The old lamp's halo and two moths circling it. */
function drawLamp(ctx: Ctx, lamp: Point, time: number, lit: number): void {
  const strength = LAMP_DAY + (1 - LAMP_DAY) * lit;
  drawHalo(ctx, lamp.x, lamp.y, 20, HALO_LAMP, 0.75 * strength * flicker(time, 7));
  glowRect(ctx, '#fff3c4', lamp.x - 1, lamp.y - 1, 3, 3, strength);
  if (lit <= 0) return;
  for (let i = 0; i < MOTHS; i++) {
    const a = time * (1.6 + i * 0.5) + i * 3;
    rect(ctx, '#f2ead0', lamp.x + Math.cos(a) * (6 + i * 2), lamp.y + Math.sin(a * 1.3) * 5, lit > 0.5 ? 2 : 1, 1);
  }
}

/** Glowing toadstool caps and crystals: soft halos that deepen towards night. */
function drawGlowers(ctx: Ctx, layout: HiddenLayout, time: number, night: number): void {
  const shroom = SHROOM_DAY + (1 - SHROOM_DAY) * night;
  layout.shrooms.forEach((p, i) => {
    drawHalo(ctx, p.x, p.y - 4, 6, TEAL, 0.45 * shroom * flicker(time, i + 2));
    glowRect(ctx, TEAL, p.x - 1, p.y - 5, 3, 1, shroom);
  });
  const crystal = CRYSTAL_DAY + (1 - CRYSTAL_DAY) * night;
  layout.crystals.forEach((p, i) => {
    drawHalo(ctx, p.x, p.y - 5, 8, HALO_CRYSTAL, 0.4 * crystal * flicker(time, i + 5));
    glowRect(ctx, '#ffffff', p.x - 1, p.y - 9 - (i % 2) * 3, 1, 1, crystal * (0.5 + 0.5 * Math.sin(time * 0.7 + i * 2)));
  });
}

/** Sparks that rise slowly out of the clearing, gold and teal, swaying on the wind, fading in and out. */
function drawSparks(ctx: Ctx, layout: HiddenLayout, time: number, night: number): void {
  const strength = SPARK_DAY + (1 - SPARK_DAY) * night;
  const before = ctx.globalAlpha;
  for (let i = 0; i < SPARKS; i++) {
    const phase = (time * (0.02 + hash(i) * 0.015) + hash(i + 40)) % 1;
    const x = layout.width * (SPARK_FROM + SPARK_SPAN * hash(i + 7)) + Math.sin(time * 0.4 + i * 2) * 5 + breeze(time, i * 30) * 4;
    const y = SPARK_ROW - phase * SPARK_RISE;
    const color = i % 2 === 0 ? GOLD : TEAL;
    ctx.globalAlpha = before * strength * Math.sin(phase * Math.PI);
    rect(ctx, color, x, y, 1, 1);
    if (i % 3 === 0) drawHalo(ctx, x, y, 4, color, 0.5);
  }
  ctx.globalAlpha = before;
}

/** Light from the open door: a wide halo, a bright core, a pool on the steps and lawn, and gold motes drifting up out of the doorway. */
function drawDoorGlow(ctx: Ctx, layout: HiddenLayout, time: number, night: number, open: number): void {
  if (open <= 0) return;
  const { door } = layout;
  const strength = open * (DOOR_DAY + (1 - DOOR_DAY) * night) * (0.92 + 0.08 * Math.sin(time * DOOR_PULSE_SPEED));
  drawHalo(ctx, door.x, door.y, DOOR_HALO_FAR, GOLD, 0.45 * strength);
  drawHalo(ctx, door.x, door.y, DOOR_HALO_NEAR, '#fff0b0', 0.55 * strength);
  drawHalo(ctx, door.x + 2, door.y + 22, DOOR_POOL, GOLD, 0.35 * strength);
  const before = ctx.globalAlpha;
  for (let i = 0; i < DOOR_MOTES; i++) {
    const phase = (time * 0.12 + hash(i + 60)) % 1;
    ctx.globalAlpha = before * strength * Math.sin(phase * Math.PI);
    rect(ctx, '#fff0b0', door.x + Math.sin(time * 0.6 + i * 1.9) * 9, door.y + 4 - phase * 40, 1, 1);
  }
  ctx.globalAlpha = before;
}

/**
 * Draws every light. `night` is 0 in daylight and 1 in deep night; `open` is how far the door has opened (0 to 1);
 * `flare` is 1 right after a click on a standing stone and falls to 0: the runes shine like an open door's for a moment.
 */
export function drawHiddenGlow(ctx: Ctx, kit: GlowKit, time: number, night: number, open: number, flare: number): void {
  const lit = litAmount(night);
  drawValley(ctx, kit.layout, time, lit);
  drawLamp(ctx, kit.lamp, time, lit);
  drawGlowers(ctx, kit.layout, time, night);
  drawRunes(ctx, kit.sheets, kit.runes, time, night, Math.max(open, flare));
  drawDoorGlow(ctx, kit.layout, time, night, open);
  drawSparks(ctx, kit.layout, time, night);
}
