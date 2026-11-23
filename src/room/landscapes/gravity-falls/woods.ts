/**
 * Gnome Woods: deep pines and mist, a giant mossy stump, a ring of toadstools, and a tiny gnome village in the roots
 * of an old tree, with a toadstool tavern. The still painting is in `woods-art.ts` and `woods-art2.ts`; this file
 * adds the swaying pines, pollen, smoke, watchers in the dark, fireflies and lit windows, and hands the view the plan.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { clamp } from '../../../world/math';
import { drawHalo, rect, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { buildGrass, drawGrass, drawSwayTree, pineTree, type PinePalette } from '../../gravity-falls/art-trees';
import type { Clue, ClueKind, PerformerHome, Point, ScenePlan } from '../../gravity-falls/types';
import { breeze } from '../../wind';
import { DESIGN_HEIGHT, type SceneArt, type SceneBuilder } from './scene-art';
import { FOREST, buildWoodsSprites, type WoodsSprites } from './woods-art';
import {
  LANTERN_RISE, NEAR_PINES, PEEK_BUSH_TOP, PAGE_BUSH_BASE, POST_BASE, ROOT_BASE, STUMP_BASE, TAVERN_BASE,
  buildBeam, buildWisp, inRadioBand, layoutWoods, paintFarForest, paintFront, paintGround, paintSet, standing, widthScale,
  type SockLine, type WoodsLayout,
} from './woods-art2';

/** Pines that frame the picture are darker and sit a little outside its edges. */
const FRAME_PINES: PinePalette = { dark: '#0f2a25', mid: '#1b463c', light: '#3f7a5a', trunk: '#3a281f', trunkShade: '#2a1c16' };
const FRAME_SLIP = 18;
const FRAME_MAX_SIZE = 200;
const FRAME_BASE_SIZE = 60;
const FRAME_WIDTH_SHARE = 0.45;
/** The mid pines stand on the edge of the clearing, above the tavern and the stump, so their trunks never cross them. */
const PINE_FOOT = 196;
const CLEAR_FROM = 0.33;
const CLEAR_TO = 0.67;
const VILLAGE_CLEARANCE = 46;
const SWAY_MID = 1.6;
const SWAY_CROWN = 2;
const SWAY_FRAME = 2;
const GRASS_SWAY = 2;
/** The old tree's crown: its trunk foot sits this many rows below the top of the village tree's picture. */
const CROWN_SIZE = 112;
const CROWN_FOOT_BELOW_TOP = 34;
const VILLAGE_TREE_ROWS = 120;

const BEAM_SHARES = [0.06, 0.2, 0.74, 0.86, 0.95];
const BEAM_TOP = 50;
const BEAM_ALPHA = 0.2;
const WISP_ROWS = [206, 222, 236, 250];
const WISP_SPEEDS = [3.5, 2.2, 4.4, 2.8];
const WISP_ALPHA = 0.28;
const SMOKE_PUFFS = 5;
const SMOKE_RISE = 26;
const SMOKE_RATE = 0.18;
const SMOKE_COLOR = '#e8efe8';
const PENNANT_LENGTH = 7;
const SOCK_COLORS = ['#d8584f', '#5aa3d8', '#e8c84a', '#7bd88f'];
const SOCK_CUFF = '#f1ece0';

const EYE_COLOR = '#eaff6a';
const EYE_DAY_STRENGTH = 0.4;
const EYE_PERIOD = 22;
/** Share of each period (from, to) in which a pair is out in the open, and the share spent fading in and out. */
const EYE_OUT_FROM = 0.1;
const EYE_OUT_TO = 0.8;
const EYE_FADE = 0.1;
const BLINK_PERIOD = 6;
const BLINK_SECONDS = 0.18;

const POLLEN_COLOR = '#fff6b8';
const POLLEN_ALPHA = 0.55;
const NEEDLE_TOP = 30;
const NEEDLE_FALL = 200;
const NEEDLE_COLORS = ['#b8933e', '#4f8a4b'];
const FIREFLY_COLOR = '#c6ff6a';
const FIREFLY_CORE = '#f2ffa0';
const GLOW_FROM_NIGHT = 0.05;

const LIGHT_COLOR = '#ffc766';
const PANE_COLOR = '#ffe6a0';
const LIGHT_DAY_SHARE = 0.3;
const PULSE_SECONDS = 1.6;
const MUSHROOM_GLOW = '#8cf0d0';
const MUSHROOM_GLOW_SHARE = 0.45;
const LONG_AGO = -1e9;

interface Pine {
  tree: HTMLCanvasElement;
  x: number;
  baseY: number;
  amount: number;
}

interface Tuft {
  x: number;
  y: number;
  variant: number;
}

/** A drifting speck: `x` and `y` are its home, `speed` how fast it travels, `phase` where it is in its wobble. */
interface Mote {
  x: number;
  y: number;
  speed: number;
  phase: number;
}

interface Watcher {
  x: number;
  y: number;
  offset: number;
}

interface Light {
  x: number;
  y: number;
  radius: number;
  phase: number;
  /** True for the tavern window: a click makes it flare. */
  pulses: boolean;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Everything that moves, worked out once for the width. */
interface WoodsLife {
  width: number;
  midPines: readonly Pine[];
  crown: Pine;
  framePines: readonly Pine[];
  backGrass: readonly Tuft[];
  frontGrass: readonly Tuft[];
  grassSheet: HTMLCanvasElement;
  frontSheet: HTMLCanvasElement;
  beam: HTMLCanvasElement;
  wisp: HTMLCanvasElement;
  watchers: readonly Watcher[];
  motes: readonly Mote[];
  needles: readonly Mote[];
  flies: readonly Mote[];
  lights: readonly Light[];
  smoke: Point;
  flag: Point;
  sockLine: SockLine | null;
  tavernBox: Box;
}

function buildMidPines(layout: WoodsLayout): Pine[] {
  const rnd = seeded(61);
  const pines: Pine[] = [];
  for (let x = -4; x < layout.width + 30; x += 38 + Math.floor(rnd() * 30)) {
    const share = x / layout.width;
    const size = 130 + Math.floor(rnd() * 46);
    const baseY = PINE_FOOT + Math.floor(rnd() * 5);
    if ((share > CLEAR_FROM && share < CLEAR_TO) || Math.abs(x - layout.rootX) < VILLAGE_CLEARANCE) continue;
    pines.push({ tree: pineTree(pines.length, size, NEAR_PINES), x, baseY, amount: SWAY_MID });
  }
  return pines;
}

function buildFramePines(width: number): Pine[] {
  const size = Math.min(FRAME_MAX_SIZE, Math.round(width * FRAME_WIDTH_SHARE) + FRAME_BASE_SIZE);
  const baseY = DESIGN_HEIGHT + FRAME_SLIP / 2;
  return [-FRAME_SLIP, width + FRAME_SLIP].map((x, i) => ({ tree: pineTree(1 + i, size, FRAME_PINES), x, baseY, amount: SWAY_FRAME }));
}

function scatterTufts(width: number, count: number, top: number, bottom: number, seed: number): Tuft[] {
  const rnd = seeded(seed);
  const tufts: Tuft[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rnd() * width);
    const y = Math.round(top + rnd() * (bottom - top));
    const variant = Math.floor(rnd() * 6);
    if (!inRadioBand(width, x, y)) tufts.push({ x, y, variant });
  }
  return tufts;
}

/** Specks whose home is anywhere across the width within a band of rows; `speed` runs between the two limits. */
function scatterMotes(width: number, count: number, top: number, bottom: number, speeds: readonly [number, number], seed: number): Mote[] {
  const rnd = seeded(seed);
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({ x: rnd() * width, y: top + rnd() * (bottom - top), speed: speeds[0] + rnd() * (speeds[1] - speeds[0]), phase: rnd() * Math.PI * 2 });
  }
  return motes;
}

/** Falling pine needles: home x is kept off the middle (the clock), `speed` is how many falls a second, `phase` the head start. */
function scatterNeedles(width: number, count: number): Mote[] {
  const rnd = seeded(83);
  const needles: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const side = rnd() < 0.5 ? rnd() * CLEAR_FROM : CLEAR_TO + rnd() * (1 - CLEAR_TO);
    needles.push({ x: side * width, y: 0, speed: 1 / (20 + rnd() * 12), phase: rnd() });
  }
  return needles;
}

function buildLife(layout: WoodsLayout, sprites: WoodsSprites): WoodsLife {
  const { width } = layout;
  const scale = widthScale(width);
  const rootOrigin = standing(sprites.rootTree.canvas, layout.rootX, ROOT_BASE);
  const tavernOrigin = standing(sprites.tavern.canvas, layout.tavernX, TAVERN_BASE);
  const lights: Light[] = sprites.rootTree.windows.map((w, i) => ({ x: rootOrigin.x + w.x, y: rootOrigin.y + w.y, radius: 7, phase: i * 2.1, pulses: false }));
  lights.push({ x: tavernOrigin.x + sprites.tavern.window.x, y: tavernOrigin.y + sprites.tavern.window.y, radius: 10, phase: 0.7, pulses: true });
  lights.push({ x: layout.postX + 1, y: POST_BASE - LANTERN_RISE, radius: 10, phase: 4.2, pulses: false });
  const crownFoot = ROOT_BASE - VILLAGE_TREE_ROWS + CROWN_FOOT_BELOW_TOP;
  return {
    width,
    midPines: buildMidPines(layout),
    crown: { tree: pineTree(2, CROWN_SIZE, NEAR_PINES), x: layout.rootX, baseY: crownFoot, amount: SWAY_CROWN },
    framePines: buildFramePines(width),
    backGrass: scatterTufts(width, Math.round(70 * scale) + 12, 208, 250, 17),
    frontGrass: scatterTufts(width, Math.round(34 * scale) + 8, 264, 269, 19),
    grassSheet: buildGrass('#3f8a4f', '#8cc474'),
    frontSheet: buildGrass('#2b6b45', '#6fb064'),
    beam: buildBeam(),
    wisp: buildWisp(),
    watchers: layout.gaps.map((gap, i) => ({ x: gap.x, y: gap.y - 2, offset: i * 7.3 })),
    motes: scatterMotes(width, Math.round(26 * scale) + 8, 140, 250, [2, 5], 29),
    needles: scatterNeedles(width, Math.round(6 * scale) + 3),
    flies: scatterMotes(width, Math.round(14 * scale) + 6, 150, 260, [0.3, 0.7], 37),
    lights,
    smoke: { x: rootOrigin.x + sprites.rootTree.chimney.x, y: rootOrigin.y + sprites.rootTree.chimney.y },
    flag: { x: tavernOrigin.x + sprites.tavern.flag.x, y: tavernOrigin.y + sprites.tavern.flag.y },
    sockLine: layout.sockLine,
    tavernBox: { x: tavernOrigin.x, y: tavernOrigin.y, w: sprites.tavern.canvas.width, h: sprites.tavern.canvas.height },
  };
}

/** Pairs of eyes in the dark gaps between far trunks: each pair opens, stares, blinks and fades again, brighter at night. */
function drawEyes(ctx: Ctx, life: WoodsLife, time: number, night: number): void {
  const strength = EYE_DAY_STRENGTH + (1 - EYE_DAY_STRENGTH) * night;
  ctx.fillStyle = EYE_COLOR;
  for (const watcher of life.watchers) {
    const phase = ((time + watcher.offset) % EYE_PERIOD) / EYE_PERIOD;
    const visible = Math.min(clamp((phase - EYE_OUT_FROM) / EYE_FADE, 0, 1), clamp((EYE_OUT_TO - phase) / EYE_FADE, 0, 1));
    if (visible <= 0 || (time + watcher.offset * 0.7) % BLINK_PERIOD < BLINK_SECONDS) continue;
    ctx.globalAlpha = visible * strength;
    ctx.fillRect(watcher.x - 3, watcher.y, 2, 2);
    ctx.fillRect(watcher.x + 2, watcher.y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

/** Slanted shafts of daylight, laid only over what is already painted so none of it lands on the sky. */
function drawBeams(ctx: Ctx, life: WoodsLife, time: number, night: number): void {
  const day = 1 - night;
  if (day < GLOW_FROM_NIGHT) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  BEAM_SHARES.forEach((share, i) => {
    ctx.globalAlpha = BEAM_ALPHA * day * (0.75 + 0.25 * Math.sin(time * 0.4 + i * 2.1));
    ctx.drawImage(life.beam, Math.round(share * life.width), BEAM_TOP);
  });
  ctx.restore();
}

/** Long wisps of mist sliding slowly across the forest floor. */
function drawWisps(ctx: Ctx, life: WoodsLife, time: number, night: number): void {
  ctx.globalAlpha = WISP_ALPHA + 0.12 * night;
  WISP_ROWS.forEach((row, i) => {
    const span = life.width + life.wisp.width;
    const x = ((time * WISP_SPEEDS[i] + i * 97) % span) - life.wisp.width;
    ctx.drawImage(life.wisp, Math.round(x), row);
  });
  ctx.globalAlpha = 1;
}

/** Smoke from the village chimney: a few puffs that rise, widen, fade, and lean with the wind. */
function drawSmoke(ctx: Ctx, life: WoodsLife, time: number): void {
  ctx.fillStyle = SMOKE_COLOR;
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const age = (time * SMOKE_RATE + i / SMOKE_PUFFS) % 1;
    const size = age < 0.3 ? 2 : 3;
    ctx.globalAlpha = (1 - age) * 0.55;
    ctx.fillRect(Math.round(life.smoke.x + breeze(time, life.smoke.x) * age * 5 + Math.sin(age * 6 + i)), Math.round(life.smoke.y - age * SMOKE_RISE), size, size);
  }
  ctx.globalAlpha = 1;
}

/** The pennant on the tavern flagpole, rippling in the breeze. */
function drawPennant(ctx: Ctx, life: WoodsLife, time: number): void {
  const wave = breeze(time, life.flag.x) * 1.2;
  for (let i = 0; i < PENNANT_LENGTH; i++) {
    const height = 3 - Math.floor(i / 2);
    if (height > 0) rect(ctx, FOREST.redLight, life.flag.x + i, life.flag.y + Math.round((wave * i) / PENNANT_LENGTH), 1, height);
  }
}

/** Tiny socks pegged on the washing line, swinging a pixel with the wind. */
function drawSocks(ctx: Ctx, life: WoodsLife, time: number): void {
  const line = life.sockLine;
  if (!line) return;
  SOCK_COLORS.forEach((color, i) => {
    const t = (i + 1) / (SOCK_COLORS.length + 1);
    const x = line.ax + (line.bx - line.ax) * t + Math.round(breeze(time, line.ax) * 1.2);
    const y = line.ay + (line.by - line.ay) * t + Math.sin(Math.PI * t) * 3 + 1;
    rect(ctx, color, x, y, 2, 3);
    rect(ctx, color, x + 1, y + 3, 1, 1);
    rect(ctx, SOCK_CUFF, x, y, 2, 1);
  });
}

function drawTufts(ctx: Ctx, sheet: HTMLCanvasElement, tufts: readonly Tuft[], time: number): void {
  for (const tuft of tufts) drawGrass(ctx, sheet, tuft.x, tuft.y, tuft.variant, time, GRASS_SWAY);
}

function drawPines(ctx: Ctx, pines: readonly Pine[], time: number): void {
  for (const pine of pines) drawSwayTree(ctx, pine.tree, pine.x, pine.baseY, time, pine.amount);
}

/** Pollen floating through the shafts of light in the day. */
function drawPollen(ctx: Ctx, life: WoodsLife, time: number, night: number): void {
  const day = 1 - night;
  if (day < GLOW_FROM_NIGHT) return;
  ctx.fillStyle = POLLEN_COLOR;
  ctx.globalAlpha = POLLEN_ALPHA * day;
  for (const mote of life.motes) {
    const x = ((mote.x + time * mote.speed) % (life.width + 20)) - 10;
    ctx.fillRect(Math.round(x), Math.round(mote.y + Math.sin(time * 0.7 + mote.phase) * 4), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** A few pine needles spiralling down on the sides of the view, never across the clock. */
function drawNeedles(ctx: Ctx, life: WoodsLife, time: number): void {
  life.needles.forEach((needle, i) => {
    const fall = (time * needle.speed + needle.phase) % 1;
    const x = needle.x + Math.sin(time * 0.8 + needle.phase * 6) * 6 + breeze(time, needle.x) * 8 * fall;
    rect(ctx, NEEDLE_COLORS[i % NEEDLE_COLORS.length], x, NEEDLE_TOP + fall * NEEDLE_FALL, 2, 1);
  });
}

/** Lit windows and the signpost lantern: halos that rise at dusk, flicker slowly, and flare when the tavern is clicked. */
function drawLights(ctx: Ctx, life: WoodsLife, time: number, night: number, pressedAt: number): void {
  const pulse = Math.max(0, 1 - (time - pressedAt) / PULSE_SECONDS);
  for (const light of life.lights) {
    const flicker = 0.9 + 0.1 * Math.sin(time * 0.9 + light.phase);
    const strength = Math.min(1, (LIGHT_DAY_SHARE + (1 - LIGHT_DAY_SHARE) * night) * flicker + (light.pulses ? pulse : 0));
    drawHalo(ctx, light.x, light.y, light.radius, LIGHT_COLOR, strength);
    ctx.globalAlpha = strength;
    rect(ctx, PANE_COLOR, light.x - 1, light.y - 1, 3, 3);
    ctx.globalAlpha = 1;
  }
}

/** Fireflies wandering slowly over the forest floor, blinking about once every seven seconds each. */
function drawFireflies(ctx: Ctx, life: WoodsLife, time: number, night: number): void {
  if (night < GLOW_FROM_NIGHT) return;
  for (const fly of life.flies) {
    const blink = (0.5 + 0.5 * Math.sin(time * 0.9 + fly.phase * 2)) * night;
    const x = fly.x + Math.sin(time * fly.speed + fly.phase) * 10;
    const y = fly.y + Math.cos(time * fly.speed * 1.3 + fly.phase) * 6;
    drawHalo(ctx, x, y, 3, FIREFLY_COLOR, blink * 0.55);
    ctx.globalAlpha = blink;
    rect(ctx, FIREFLY_CORE, x, y, 1, 1);
    ctx.globalAlpha = 1;
  }
}

function buildPlan(layout: WoodsLayout, sprites: WoodsSprites): ScenePlan {
  const at = (share: number): number => Math.round(layout.width * share);
  const stumpTop = STUMP_BASE - sprites.stump.canvas.height + sprites.stump.topY;
  const homes: PerformerHome[] = [
    { id: 'gnome-chief', x: layout.stumpX, y: stumpTop + 1, facing: -1 },
    { id: 'gnome-a', x: at(0.145), y: 240, facing: 1 },
    { id: 'gnome-b', x: layout.tavernX + 2, y: TAVERN_BASE, facing: -1 },
    { id: 'dipper', x: at(0.72), y: 236, facing: -1 },
    { id: 'mabel', x: at(0.78), y: 242, facing: 1 },
    { id: 'waddles', x: at(0.84), y: 244, facing: -1 },
  ];
  const spots: Point[] = [{ x: at(0.255), y: 246 }, { x: at(0.36), y: 240 }, { x: at(0.675), y: 246 }];
  const clue = (kind: ClueKind, x: number, y: number): Clue => ({ id: `woods-${kind}`, kind, place: 'woods', x, y, w: 14, h: 14 });
  const clues: Clue[] = [
    clue('symbol', layout.stumpX, STUMP_BASE - 12),
    clue('note', layout.postX + 1, POST_BASE - 13),
    clue('page', layout.pageBushX, PAGE_BUSH_BASE - 9),
    clue('peek', layout.peekX, PEEK_BUSH_TOP - 3),
  ];
  return { homes, spots, clues };
}

/** Builds Gnome Woods for a design width. */
export const buildWoods: SceneBuilder = (designWidth: number): SceneArt => {
  const layout = layoutWoods(designWidth);
  const sprites = buildWoodsSprites();
  const back = memoryCanvas(designWidth, DESIGN_HEIGHT);
  const front = memoryCanvas(designWidth, DESIGN_HEIGHT);
  paintFarForest(back.ctx, layout);
  paintGround(back.ctx, layout, sprites.ferns);
  paintSet(back.ctx, layout, sprites);
  paintFront(front.ctx, layout, sprites);
  const life = buildLife(layout, sprites);
  let pressedAt = LONG_AGO;
  return {
    back: back.canvas,
    front: front.canvas,
    plan: buildPlan(layout, sprites),
    drawBehind(ctx, time, night) {
      drawEyes(ctx, life, time, night);
      drawPines(ctx, life.midPines, time);
      drawPines(ctx, [life.crown], time);
      drawBeams(ctx, life, time, night);
      drawWisps(ctx, life, time, night);
      drawSmoke(ctx, life, time);
      drawPennant(ctx, life, time);
      drawSocks(ctx, life, time);
      drawTufts(ctx, life.grassSheet, life.backGrass, time);
    },
    drawAhead(ctx, time, night) {
      drawTufts(ctx, life.frontSheet, life.frontGrass, time);
      drawPines(ctx, life.framePines, time);
      drawPollen(ctx, life, time, night);
      drawNeedles(ctx, life, time);
    },
    press(x, y, time) {
      const box = life.tavernBox;
      if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) return false;
      pressedAt = time;
      return true;
    },
    drawGlow(ctx, time, night) {
      drawLights(ctx, life, time, night, pressedAt);
      drawFireflies(ctx, life, time, night);
      if (night < GLOW_FROM_NIGHT) return;
      for (const mushroom of layout.ring) drawHalo(ctx, mushroom.x, mushroom.y - 3, 5, MUSHROOM_GLOW, MUSHROOM_GLOW_SHARE * night);
    },
  };
};
