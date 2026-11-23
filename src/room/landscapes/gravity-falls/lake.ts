/**
 * The Lake scene of the Gravity Falls landscape: a still blue-green mirror under a hazy far shore, a dock with a
 * rowboat and a rod, a boathouse on the right bank, the neighbours' glass house across the water, reeds, lily pads,
 * ducks, mist, and the lake monster's rings. This file builds the layers once for a width, hands the view the plan
 * (who stands where, where they meet, what can be found) and draws the moving parts in order.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { buildGrass, drawGrass, drawSwayTree, pineTree, PINE_FOREST } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, ScenePlan } from '../../gravity-falls/types';
import { bobberOf, boathouseOrigin, buildBoathouse, paintDock } from './lake-art';
import { drawLakeGlow, buildLights } from './lake-glow';
import { DECK_TOP, ISLET_BASE, WATERLINE, lakeLayout, type LakeLayout } from './lake-layout';
import { paintBank, paintBoathouseFooting, paintFarShore, paintFront, paintIslet, scatterTufts } from './lake-land';
import { drawDragonflies, drawBobber, drawDucks, drawFish, drawMist, drawSwallows, buildMist } from './lake-life';
import { buildBranch, buildDucks, buildHeron, buildLilies, buildReeds, drawHanging, drawHeron } from './lake-nature';
import {
  buildGlints, drawGlints, drawMonsterRings, drawPressRings, paintReflection, paintWater, type PressRing,
} from './lake-water';
import { DESIGN_HEIGHT, type SceneArt, type SceneBuilder } from './scene-art';

const GRASS_BODY = '#4f8a3f';
const GRASS_TIP = '#9cc765';
const GRASS_SWAY = 1;
const PINE_SWAY = 1.6;
const REED_SWAY = 1.4;
const BRANCH_SWAY = 2;
/** The big pines at the picture's edges: slim, long-trunked, standing behind the dock and behind the boathouse. */
const SIDE_PINE_VARIANT = 3;
const LEFT_PINE = { size: 104, share: 0.025, foot: 222 };
const RIGHT_PINE = { size: 100, share: 0.975, foot: 218 };
/** Branches hang from the top corners, just inside the window frame. */
const BRANCH_TOP = 44;
const BRANCH_INSET = 0.05;
const BRANCH_ROWS = 23;

/** Each lily pad: share of the width, row, and which of the three pictures. */
const LILY_PADS: readonly (readonly [number, number, number])[] = [
  [0.28, 234, 0], [0.325, 230, 1], [0.36, 235, 2], [0.19, 213, 1], [0.43, 202, 0], [0.575, 198, 2], [0.6, 206, 0],
];
const LILY_BOB = 0.7;

const RING_SLOTS = 3;
const BOBBER_REACH = 5;
const BOBBER_SECONDS = 1.2;
/** A click this many rows above the shore still counts as a click on the water. */
const SHORE_SLACK = 3;
const DOCK_SLACK = 2;
const BOATHOUSE_SLACK = 12;

interface Sway {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
}

/** Who stands where, where they gather, and where the four clues are. Everyone stands on the right bank, so no walk ever crosses the water or the radio; the monster surfaces just off that bank. */
function lakePlan(layout: LakeLayout): ScenePlan {
  const at = (share: number): number => Math.round(layout.width * share);
  const homes: PerformerHome[] = [
    { id: 'lake-monster', x: layout.monster.x, y: layout.monster.y, facing: 1 },
    { id: 'wendy', x: at(0.835), y: 236, facing: -1 },
    { id: 'pacifica', x: at(0.88), y: 233, facing: -1 },
    { id: 'dipper', x: at(0.685), y: 240, facing: -1 },
    { id: 'mabel', x: at(0.79), y: 238, facing: -1 },
    { id: 'waddles', x: at(0.735), y: 240, facing: 1 },
  ];
  const clues: Clue[] = [
    { id: 'lake-symbol', kind: 'symbol', place: 'lake', x: layout.symbol.x, y: layout.symbol.y, w: 14, h: 14 },
    { id: 'lake-note', kind: 'note', place: 'lake', x: layout.note.x, y: layout.note.y, w: 12, h: 14 },
    { id: 'lake-page', kind: 'page', place: 'lake', x: layout.page.x, y: layout.page.y, w: 14, h: 14 },
    { id: 'lake-peek', kind: 'peek', place: 'lake', x: layout.peek.x, y: layout.peek.y, w: 16, h: 14 },
  ];
  return { homes, spots: [{ x: at(0.75), y: 240 }, { x: at(0.86), y: 237 }], clues };
}

/** True when a point is on open water: not on the shore, the dock or the boathouse. */
function onOpenWater(layout: LakeLayout, x: number, y: number): boolean {
  const { boathouse } = layout;
  if (y <= WATERLINE + SHORE_SLACK || y >= layout.landTop(x) - SHORE_SLACK) return false;
  if (x < layout.dockEnd + DOCK_SLACK && y > DECK_TOP - DOCK_SLACK) return false;
  return !(x > boathouse.x - DOCK_SLACK && x < boathouse.x + boathouse.w + DOCK_SLACK && y > boathouse.y - BOATHOUSE_SLACK);
}

/** Reed clumps that stand in the water behind the cast: round the islet and along the right shore's edge. */
function backReeds(layout: LakeLayout): Sway[] {
  const { islet, width } = layout;
  const shore = (share: number): number => layout.landTop(Math.round(width * share)) + 2;
  return [
    { sprite: buildReeds(16, 1), x: islet.x - 5, y: ISLET_BASE + 1 },
    { sprite: buildReeds(20, 2), x: islet.x + 3, y: ISLET_BASE + 1 },
    { sprite: buildReeds(14, 3), x: islet.x + 9, y: ISLET_BASE + 2 },
    { sprite: buildReeds(18, 4), x: Math.round(width * 0.64), y: shore(0.64) },
    { sprite: buildReeds(14, 5), x: Math.round(width * 0.665), y: shore(0.665) },
  ];
}

export const buildLake: SceneBuilder = (width): SceneArt => {
  const layout = lakeLayout(width);
  const back = memoryCanvas(width, DESIGN_HEIGHT);
  const far = memoryCanvas(width, WATERLINE);
  const structures = memoryCanvas(width, DESIGN_HEIGHT);
  const front = memoryCanvas(width, DESIGN_HEIGHT);
  for (const layer of [back, far, structures, front]) layer.ctx.imageSmoothingEnabled = false;
  paintFarShore(far.ctx, width, layout);
  back.ctx.drawImage(far.canvas, 0, 0);
  paintWater(back.ctx, width);
  paintReflection(back.ctx, far.canvas, width);
  paintIslet(back.ctx, layout);
  paintBank(structures.ctx, width, layout);
  const origin = boathouseOrigin(layout.boathouse);
  structures.ctx.drawImage(buildBoathouse(), origin.x, origin.y);
  paintBoathouseFooting(structures.ctx, layout);
  paintDock(structures.ctx, layout);
  paintFront(front.ctx, layout);

  const glints = buildGlints(width);
  const lights = buildLights(width, layout);
  const grass = buildGrass(GRASS_BODY, GRASS_TIP);
  const tufts = scatterTufts(width, layout);
  const ducks = buildDucks();
  const heron = buildHeron();
  const lilies = buildLilies();
  const mist = buildMist();
  const reedsBehind = backReeds(layout);
  const reedsFront: Sway[] = [
    { sprite: buildReeds(11, 6), x: Math.round(width * 0.272), y: 236 },
    { sprite: buildReeds(16, 7), x: Math.round(width * 0.358), y: 237 },
  ];
  const pines: Sway[] = [LEFT_PINE, RIGHT_PINE].map((p) => ({
    sprite: pineTree(SIDE_PINE_VARIANT, p.size, PINE_FOREST), x: Math.round(width * p.share), y: p.foot,
  }));
  const branchLeft = buildBranch(44, BRANCH_ROWS, false, 3);
  const branchRight = buildBranch(40, BRANCH_ROWS - 4, true, 9);
  const branchLeftX = Math.round(width * BRANCH_INSET);
  const branchRightX = Math.round(width * (1 - BRANCH_INSET)) - branchRight.width;
  const rings: PressRing[] = Array.from({ length: RING_SLOTS }, () => ({ x: 0, y: 0, at: -Infinity }));
  let nextRing = 0;
  let bobberPressedAt = -Infinity;

  const startRing = (x: number, y: number, time: number): void => {
    rings[nextRing] = { x, y, at: time };
    nextRing = (nextRing + 1) % RING_SLOTS;
  };

  return {
    back: back.canvas,
    front: front.canvas,
    plan: lakePlan(layout),
    drawBehind(ctx, time, night) {
      drawGlints(ctx, glints, time);
      drawMist(ctx, mist, width, time, night);
      drawMonsterRings(ctx, layout.monster, time);
      drawPressRings(ctx, rings, time);
      drawDucks(ctx, ducks, width, time, night);
      drawFish(ctx, width, time);
      for (let i = 0; i < LILY_PADS.length; i++) {
        const [share, row, kind] = LILY_PADS[i];
        const pad = lilies[kind];
        ctx.drawImage(pad, Math.round(width * share - pad.width / 2), row - pad.height + Math.round(Math.sin(time * 0.5 + i * 1.7) * LILY_BOB));
      }
      for (const p of pines) drawSwayTree(ctx, p.sprite, p.x, p.y, time, PINE_SWAY);
      ctx.drawImage(structures.canvas, 0, 0);
      for (const t of tufts) drawGrass(ctx, grass, t.x, t.y, t.variant, time, GRASS_SWAY);
      for (const r of reedsBehind) drawSwayTree(ctx, r.sprite, r.x, r.y, time, REED_SWAY);
      drawHeron(ctx, heron, layout.islet.x - 6, ISLET_BASE, time);
      drawBobber(ctx, layout, time, Math.max(0, 1 - (time - bobberPressedAt) / BOBBER_SECONDS));
      drawSwallows(ctx, width, time, night);
      drawDragonflies(ctx, layout, time, night);
    },
    drawAhead(ctx, time) {
      for (const r of reedsFront) drawSwayTree(ctx, r.sprite, r.x, r.y, time, REED_SWAY);
      drawHanging(ctx, branchLeft, branchLeftX, BRANCH_TOP, time, BRANCH_SWAY);
      drawHanging(ctx, branchRight, branchRightX, BRANCH_TOP, time, BRANCH_SWAY);
    },
    press(x, y, time) {
      const bobber = bobberOf(layout);
      if (Math.abs(x - bobber.x) <= BOBBER_REACH && Math.abs(y - bobber.y) <= BOBBER_REACH) {
        bobberPressedAt = time;
        startRing(bobber.x, bobber.y + 3, time);
        return true;
      }
      if (!onOpenWater(layout, x, y)) return false;
      startRing(x, y, time);
      return true;
    },
    drawGlow(ctx, time, night) {
      drawLakeGlow(ctx, layout, lights, time, night);
    },
  };
};
