/**
 * Water Tower Hill, the town scene of the Gravity Falls landscape: a hazy late-afternoon view from the grassy hill
 * down over the rooftops, with the water tower on the right hill. Builds the picture layers once for a design width
 * and hands the view everything it needs (layers, who stands where, clues, moving parts, lights, click reactions).
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { buildGrass, drawGrass, drawSwayTree } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, ScenePlan } from '../../gravity-falls/types';
import { DESIGN_HEIGHT, type SceneArt, type SceneBuilder } from './scene-art';
import { paintTownBack, buildTrees } from './town-art';
import { paintTownFront } from './town-front';
import { HUM_SECONDS, drawTownGlow } from './town-glow';
import { dinerDoorX } from './town-landmarks';
import { townLayout, type TownLayout } from './town-layout';
import { buildPigeons, drawFlags, drawFlock, drawHedgeEyes, drawPigeons, drawSmoke, scatterTufts, type Pigeon, type Tuft } from './town-life';
import { hollowCentre, noteCentre, pageCentre, starCentre } from './town-props';

const GRASS_BODY = '#6f9553';
const GRASS_TIP = '#c2c779';
const BEHIND_SWAY = 1;
const AHEAD_SWAY = 2;
/** Extra pixels around the tower and a pigeon that still count as a click on them. */
const CLICK_SLACK = 3;
const PIGEON_HIT = 6;
/** How far above the tank the tower's roof and beacon reach, for clicks. */
const TOWER_TOP = 14;

/** Who stands where (the waitress at the diner door, the twins by the sheriff's car), where they gather, what can be found. */
function townPlan(layout: TownLayout): ScenePlan {
  const { width } = layout;
  const at = (share: number): number => Math.round(width * share);
  const door = dinerDoorX(layout.diner);
  const gideon = Math.max(at(0.245), door + 10);
  const homes: PerformerHome[] = [
    { id: 'dipper', x: door - 10, y: 234, facing: 1 },
    { id: 'susan', x: door, y: 227, facing: 1 },
    { id: 'gideon', x: gideon, y: 235, facing: 1 },
    { id: 'mcgucket', x: Math.max(at(0.315), gideon + 10), y: 231, facing: -1 },
    { id: 'blubs', x: at(0.655), y: 234, facing: 1 },
    { id: 'durland', x: at(0.735), y: 236, facing: -1 },
    { id: 'mabel', x: at(0.81), y: 235, facing: -1 },
    { id: 'waddles', x: at(0.865), y: 238, facing: -1 },
    { id: 'pacifica', x: at(0.915), y: 227, facing: -1 },
  ];
  const symbol = starCentre(layout);
  const note = noteCentre(layout);
  const page = pageCentre(layout);
  const peek = hollowCentre(layout);
  const clues: Clue[] = [
    { id: 'town-symbol', kind: 'symbol', place: 'town', x: symbol.x, y: symbol.y, w: 14, h: 14 },
    { id: 'town-note', kind: 'note', place: 'town', x: note.x, y: note.y, w: 12, h: 14 },
    { id: 'town-page', kind: 'page', place: 'town', x: page.x, y: page.y, w: 14, h: 14 },
    { id: 'town-peek', kind: 'peek', place: 'town', x: peek.x, y: peek.y, w: 16, h: 14 },
  ];
  return { homes, spots: [{ x: at(0.2), y: 236 }, { x: at(0.73), y: 238 }, { x: at(0.89), y: 236 }], clues };
}

/** 1 right after a click, falling to 0 over `HUM_SECONDS`. */
const fadeSince = (time: number, pressedAt: number): number => Math.max(0, 1 - (time - pressedAt) / HUM_SECONDS);

function drawTufts(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, tufts: readonly Tuft[], time: number, amount: number): void {
  for (const t of tufts) drawGrass(ctx, sheet, t.x, t.y, t.variant, time, amount);
}

const onTower = (layout: TownLayout, x: number, y: number): boolean => {
  const { tank, tower } = layout;
  return x >= tank.x - CLICK_SLACK && x <= tank.x + tank.w + CLICK_SLACK && y >= tank.y - TOWER_TOP && y <= tower.y;
};

const onPigeon = (pigeons: readonly Pigeon[], x: number, y: number): boolean =>
  pigeons.some((p) => Math.abs(x - p.x) <= PIGEON_HIT && Math.abs(y - (p.y - 2)) <= PIGEON_HIT);

export const buildTown: SceneBuilder = (width): SceneArt => {
  const layout = townLayout(width);
  const back = memoryCanvas(width, DESIGN_HEIGHT);
  const front = memoryCanvas(width, DESIGN_HEIGHT);
  for (const layer of [back, front]) layer.ctx.imageSmoothingEnabled = false;
  const statics = paintTownBack(back.ctx, layout);
  paintTownFront(front.ctx, width);
  const trees = buildTrees(width);
  const tufts = scatterTufts(width);
  const grass = buildGrass(GRASS_BODY, GRASS_TIP);
  const pigeons = buildPigeons(layout);
  let humAt = -Infinity;
  let scaredAt = -Infinity;

  return {
    back: back.canvas,
    front: front.canvas,
    plan: townPlan(layout),
    drawBehind(ctx, time, night) {
      for (const t of trees) drawSwayTree(ctx, t.sprite, t.x, t.y, time, t.amount);
      drawTufts(ctx, grass, tufts.behind, time, BEHIND_SWAY);
      drawSmoke(ctx, statics.lights.chimneys, time);
      drawFlags(ctx, layout, time);
      drawPigeons(ctx, pigeons, time, scaredAt);
      drawHedgeEyes(ctx, layout, time, night);
      drawFlock(ctx, width, time, night);
    },
    drawAhead(ctx, time) {
      drawTufts(ctx, grass, tufts.ahead, time, AHEAD_SWAY);
    },
    press(x, y, time) {
      if (onTower(layout, x, y)) {
        humAt = time;
        return true;
      }
      if (onPigeon(pigeons, x, y)) {
        scaredAt = time;
        return true;
      }
      return false;
    },
    drawGlow(ctx, time, night) {
      drawTownGlow(ctx, layout, statics, time, night, fadeSince(time, humAt));
    },
  };
};
