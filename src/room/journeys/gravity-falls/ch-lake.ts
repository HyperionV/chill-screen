/**
 * Journey chapter 4, "The Lakeshore": a cool blue-green walk along a wide glassy lake. Five strips scroll at different
 * speeds (blue hills, the far shore with its mirror, floating things, the reed bed, and the ground with the boathouse
 * and the long boardwalk); this file adds everything that moves (glints, ducks, dragonflies, swallows, cattails, willows,
 * the fishing float, the rowboat, foam, rings round the monster, smoke), the cast's places, the four clues, and the
 * lights that come up at dusk. The pictures are painted in ch-lake-art.ts and ch-lake-art2.ts.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { drawHalo, ellipse, rect, type Ctx } from '../../gravity-falls/art-kit';
import { buildGrass, drawGrass, drawSwayTree } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, Point, ScenePlan } from '../../gravity-falls/types';
import { drawPressRings, drawRing, type PressRing } from '../../landscapes/gravity-falls/lake-water';
import { breeze } from '../../wind';
import { hash, ramp } from '../noise';
import {
  AT_DOCK, AT_SHORE, BOARD_BACK, SHORE_FAR, buildCattail, buildFarShore, buildHills, buildMidWater, buildReedBed, houseWindow, layoutLake, stripWidth,
  type LakeLayout,
} from './ch-lake-art';
import { buildGround, buildRowboat, buildWillow, type LakeAnchors } from './ch-lake-art2';
import { type ChapterWorld, type Station, type WorldBuilder, type WorldLayer } from './world';

/** How fast each strip scrolls as a share of the camera; the ground is 1 because the cast walks on it. */
const FACTOR_HILLS = 0.15;
const FACTOR_SHORE = 0.3;
const FACTOR_MID = 0.5;
const FACTOR_REEDS = 0.75;
const FACTOR_FOREGROUND = 1.2;

/** The walk rests at the shore path (Wendy, Pacifica) and at the dock end (the monster). */
const STATIONS: readonly Station[] = [
  { at: AT_SHORE, from: 0.18, to: 0.4 },
  { at: AT_DOCK, from: 0.6, to: 0.82 },
];

/** Lake houses on the far shore: where they show at each rest (shares of the view), and the gap to a third one for the walk on. */
const HOUSE_SHORE_SHARE = 0.18;
const HOUSE_DOCK_SHARE = 0.86;
const HOUSE_THIRD_GAP = 320;

/** The party (dipper, mabel, waddles) keeps these shares of the view width right of the camera. */
const PARTY_SHARES = [{ id: 'dipper', share: 0.12, y: 233 }, { id: 'mabel', share: 0.2, y: 235 }, { id: 'waddles', share: 0.26, y: 237 }] as const;
const WENDY_ROW = 230;
const PACIFICA_ROW = 233;
const SPOT_SHARES = [0.66, 0.78, 0.92] as const;
const SPOT_ROWS = [234, 236, 234] as const;

const CLUE_SIZE = 12;
const SYMBOL_DX = 10;
const SYMBOL_ROW = 212;
const NOTE_ROW = 214;
const PAGE_ROW = 212;
const PEEK_ROW = 214;
/** The reeds the shy watcher hides in: their foot row, 16 below the clue so only the top of its head shows. */
const PEEK_BASE = PEEK_ROW + 16;
const HIT_PAD = 2;

const GRASS_BODY = '#4f8f55';
const GRASS_TIP = '#bfe08a';
const GRASS_SPACING = 30;
const GRASS_ROW = 241;

/** Glints on the water: how many, and how far down the lake they twinkle. */
const GLINT_COUNT = 30;
const GLINT_TOP = SHORE_FAR + 6;
const GLINT_DEPTH = 50;
const GLINT_COLOR = '#e6f6f4';

const DUCK_ROWS = [201, 210] as const;
const DUCK_SPEED = 2.2;
const DUCK_SPACING = 260;
const DRAGONFLY_COUNT = 3;
const SWALLOW_COUNT = 3;
const SWALLOW_SPEED = 14;
const SWALLOW_ROW = 178;
/** Birds and insects are out until this much night. */
const CREATURES_UNTIL = 0.7;

const CATTAIL_ROWS = [20, 24, 28] as const;
const CATTAIL_SPACING = 64;
const CATTAIL_BASE = 217;
const WILLOW_BASE = 224;
const WILLOW_SWAY = 3;
const FOAM_GAP = 8;
const FOAM_COLOR = '#f1f8f6';
const LINE_COLOR = '#e9e2cf';
const LINE_STEPS = 12;
const SMOKE_PUFFS = 4;
const SMOKE_RISE = 22;
const SMOKE_COLOR = '#e8efe8';
const NEVER = -1e9;

const RING_POOL = 4;
/** A click ring spreads for this long (the same life the shared water code draws it for). */
const CLICK_RING_SECONDS = 2.2;
const BELL_TEXT = 'DING!';
const BELL_SECONDS = 1.3;
const ROCK_SECONDS = 2;
const ROCK_SWING = 2;
const BOAT_HALF = 18;

/** Lights: they come up between these two levels of `night`. */
const LIGHT_FROM = 0.1;
const LIGHT_FULL = 0.6;
const LIGHT = '#ffcf6e';
const LIGHT_CORE = '#ffe9b0';
const FIRE_LIGHT = '#ff9a4a';
const FIREFLY_COUNT = 12;
const FIREFLY_COLOR = '#eaff6a';

/** `x` wrapped into 0..span, also for negative values. */
const wrap = (x: number, span: number): number => ((x % span) + span) % span;

/** The place of item `k` in an endless field with one item about every `spacing` pixels (a little jittered, always the same). */
const fieldX = (k: number, spacing: number): number => k * spacing + (hash(k * 3.1 + 0.5) - 0.5) * spacing * 0.5;

/** Whole-pixel box test in world pixels. */
function inside(x: number, y: number, box: { x: number; y: number; w: number; h: number }): boolean {
  return x >= box.x - HIT_PAD && x <= box.x + box.w + HIT_PAD && y >= box.y - HIT_PAD && y <= box.y + box.h + HIT_PAD;
}

/** A thick clump of reeds, the hiding place of the peeking watcher. */
function buildPeekClump(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(30, 16);
  ellipse(ctx, '#27432f', 15, 11, 14, 5);
  ellipse(ctx, '#3d6a45', 14, 10, 11, 4);
  for (let x = 2; x < 28; x += 2) rect(ctx, x % 4 === 0 ? '#4f7a3a' : '#8fb85f', x, 2 + Math.floor(hash(x * 1.3) * 6), 1, 8);
  for (const x of [6, 14, 22]) rect(ctx, '#6b4630', x, 0, 2, 4);
  return canvas;
}

class LakeWorld implements ChapterWorld {
  readonly worldWidth: number;
  readonly layers: readonly WorldLayer[];
  readonly stations = STATIONS;
  readonly plan: ScenePlan;
  private readonly layout: LakeLayout;
  private readonly anchors: LakeAnchors;
  private readonly ground: HTMLCanvasElement;
  private readonly houseXs: readonly number[];
  private readonly cattails = CATTAIL_ROWS.map(buildCattail);
  private readonly willow = buildWillow();
  private readonly willowXs: readonly number[];
  private readonly boat = buildRowboat();
  private readonly boatBox: { x: number; y: number; w: number; h: number };
  private readonly peekClump = buildPeekClump();
  private readonly grass = buildGrass(GRASS_BODY, GRASS_TIP);
  private readonly tufts: readonly number[];
  private readonly rings: PressRing[] = Array.from({ length: RING_POOL }, () => ({ x: 0, y: 0, at: NEVER }));
  private nextRing = 0;
  private bellAt = NEVER;
  private rockAt = NEVER;

  constructor(private readonly view: number) {
    const layout = layoutLake(view);
    const { canvas, anchors } = buildGround(layout);
    const { worldWidth } = layout;
    this.layout = layout;
    this.anchors = anchors;
    this.ground = canvas;
    this.worldWidth = worldWidth;
    const third = Math.round(AT_DOCK * FACTOR_SHORE + view * HOUSE_DOCK_SHARE);
    this.houseXs = [Math.round(AT_SHORE * FACTOR_SHORE + view * HOUSE_SHORE_SHARE), third, third + HOUSE_THIRD_GAP];
    this.willowXs = [70, layout.boardEnd + 10];
    this.boatBox = { x: anchors.boat.x - BOAT_HALF, y: anchors.boat.y - 16, w: BOAT_HALF * 2, h: 18 };
    this.tufts = Array.from({ length: Math.ceil((worldWidth * FACTOR_FOREGROUND) / GRASS_SPACING) }, (_, k) => fieldX(k, GRASS_SPACING));
    this.layers = [
      { canvas: buildHills(stripWidth(worldWidth, FACTOR_HILLS, view)), factor: FACTOR_HILLS },
      { canvas: buildFarShore(stripWidth(worldWidth, FACTOR_SHORE, view), this.houseXs), factor: FACTOR_SHORE },
      { canvas: buildMidWater(stripWidth(worldWidth, FACTOR_MID, view)), factor: FACTOR_MID },
      { canvas: buildReedBed(stripWidth(worldWidth, FACTOR_REEDS, view)), factor: FACTOR_REEDS },
      { canvas, factor: 1 },
    ];
    this.plan = this.makePlan();
  }

  /** Wendy and Pacifica on the shore, the monster in its slip at the dock end, the party beside the camera; spots at both rests; four clues. */
  private makePlan(): ScenePlan {
    const { layout, anchors, view } = this;
    const { slip } = anchors;
    const homes: PerformerHome[] = [
      { id: 'wendy', x: layout.wendyX, y: WENDY_ROW, facing: -1 },
      { id: 'pacifica', x: layout.pacificaX, y: PACIFICA_ROW, facing: -1 },
      { id: 'lake-monster', x: layout.monsterX, y: slip.y + slip.h - 1, facing: -1 },
      ...PARTY_SHARES.map((p): PerformerHome => ({ id: p.id, x: Math.round(view * p.share), y: p.y, facing: 1, followDx: Math.round(view * p.share) })),
    ];
    const spots: Point[] = STATIONS.flatMap((station) => SPOT_SHARES.map((share, i) => ({ x: station.at + Math.round(view * share), y: SPOT_ROWS[i] })));
    const clue = (id: string, kind: Clue['kind'], x: number, y: number): Clue => ({ id: `lake-${id}`, kind, place: 'lake', x, y, w: CLUE_SIZE, h: CLUE_SIZE });
    const clues: Clue[] = [
      clue('symbol', 'symbol', layout.boathouseX + SYMBOL_DX, SYMBOL_ROW),
      clue('note', 'note', layout.noteX, NOTE_ROW),
      clue('page', 'page', layout.pageX, PAGE_ROW),
      clue('peek', 'peek', layout.peekX, PEEK_ROW),
    ];
    return { homes, spots, clues };
  }

  drawBehind(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const cam = Math.round(cameraX);
    this.drawGlints(ctx, cam, time, night);
    this.drawSwallows(ctx, cam, time, night);
    this.drawDucks(ctx, cam, time);
    this.drawBoat(ctx, cam, time);
    this.drawWater(ctx, cam, time);
    this.drawWillows(ctx, cam, time);
    this.drawCattails(ctx, cam, time);
    this.drawFoam(ctx, cam, time);
    this.drawFishing(ctx, cam, time);
    this.drawSmoke(ctx, cam, time);
    this.drawDragonflies(ctx, cam, time, night);
    this.drawBell(ctx, cam, time);
  }

  drawAhead(ctx: Ctx, cameraX: number, time: number): void {
    const cam = Math.round(cameraX);
    drawSwayTree(ctx, this.peekClump, this.layout.peekX - cam, PEEK_BASE, time, 1);
    const { tufts, view } = this;
    for (let i = 0; i < tufts.length; i++) {
      const x = tufts[i] - cam * FACTOR_FOREGROUND;
      if (x > -GRASS_SPACING && x < view + GRASS_SPACING) drawGrass(ctx, this.grass, x, GRASS_ROW, i, time, 2);
    }
  }

  drawGlow(ctx: Ctx, cameraX: number, time: number, night: number): void {
    const lit = ramp(LIGHT_FROM, LIGHT_FULL, night);
    if (lit <= 0) return;
    const cam = Math.round(cameraX);
    const breath = lit * (1 + Math.sin(time * 1.1) * 0.04 + Math.sin(time * 0.37 + 1) * 0.03);
    const { lamps, boathouseWindow: bw, fire } = this.anchors;
    for (const lamp of lamps) {
      const sx = lamp.x - cam;
      if (sx < -32 || sx > this.view + 32) continue;
      drawHalo(ctx, sx, lamp.y, 30, LIGHT, breath * 0.8);
      drawHalo(ctx, sx, lamp.y, 14, LIGHT, breath);
      rect(ctx, LIGHT_CORE, sx - 1, lamp.y - 1, 3, 3);
    }
    ctx.globalAlpha = lit * 0.85;
    rect(ctx, LIGHT, bw.x - cam, bw.y, bw.w, bw.h);
    ctx.globalAlpha = 1;
    drawHalo(ctx, bw.x + bw.w / 2 - cam, bw.y + bw.h / 2, 24, LIGHT, breath * 0.7);
    for (const x of this.houseXs) {
      const w = houseWindow(x);
      const sx = w.x - Math.round(cameraX * FACTOR_SHORE);
      ctx.globalAlpha = lit * 0.75;
      rect(ctx, LIGHT, sx, w.y, w.w, w.h);
      ctx.globalAlpha = 1;
      drawHalo(ctx, sx + w.w / 2, w.y + w.h / 2, 18, LIGHT, breath * 0.5);
    }
    const flicker = 0.8 + 0.2 * Math.sin(time * 2.3) * Math.sin(time * 0.9 + 2);
    drawHalo(ctx, fire.x - cam, fire.y, 26, FIRE_LIGHT, lit * flicker * 0.8);
    this.drawFireflies(ctx, cam, time, lit);
  }

  /** The bell, the rowboat and the open water answer a click; the water answers with a ring. */
  press(x: number, y: number, time: number): boolean {
    if (inside(x, y, this.anchors.bell)) {
      this.bellAt = time;
      return true;
    }
    if (inside(x, y, this.boatBox)) {
      this.rockAt = time;
      return true;
    }
    if (y > SHORE_FAR + 2 && y < this.layout.landTop(x) - 1) {
      const ring = this.rings[this.nextRing];
      ring.x = x;
      ring.y = y;
      ring.at = time;
      this.nextRing = (this.nextRing + 1) % RING_POOL;
      return true;
    }
    return false;
  }

  /** Bright dashes twinkling on the lake, each on its own slow beat; dimmer after dark. */
  private drawGlints(ctx: Ctx, cam: number, time: number, night: number): void {
    ctx.fillStyle = GLINT_COLOR;
    const span = this.view + 20;
    for (let i = 0; i < GLINT_COUNT; i++) {
      const beat = 0.5 + 0.5 * Math.sin(time * (0.7 + hash(i * 2.9) * 0.6) + i * 1.9);
      if (beat < 0.55) continue;
      const depth = hash(i * 5.3);
      ctx.globalAlpha = (0.35 + 0.4 * depth) * (1 - 0.6 * night);
      const x = wrap(hash(i * 1.9) * span - cam * (FACTOR_SHORE + 0.2 * depth) + Math.round(breeze(time, i * 30) * 2), span) - 10;
      ctx.fillRect(Math.round(x), Math.round(GLINT_TOP + depth * GLINT_DEPTH), 2 + Math.floor(depth * 4), 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Swallows skimming low over the water by day, wings flicking between two poses. */
  private drawSwallows(ctx: Ctx, cam: number, time: number, night: number): void {
    if (night > CREATURES_UNTIL) return;
    ctx.fillStyle = '#2f3a44';
    const span = this.view + 60;
    for (let i = 0; i < SWALLOW_COUNT; i++) {
      const x = Math.round(wrap(time * SWALLOW_SPEED + i * 140 - cam * 0.2, span) - 30);
      const y = Math.round(SWALLOW_ROW + i * 8 + Math.sin(time * 1.3 + i * 2) * 6);
      const up = Math.floor(time * 6 + i) % 2 === 0;
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x - 2, y + (up ? -1 : 1), 2, 1);
      ctx.fillRect(x + 2, y + (up ? -1 : 1), 2, 1);
    }
  }

  /** Two mallards paddling slowly across the water, each trailing a faint wake. */
  private drawDucks(ctx: Ctx, cam: number, time: number): void {
    const span = this.view + 80;
    for (let i = 0; i < DUCK_ROWS.length; i++) {
      const x = Math.round(wrap(i * DUCK_SPACING + time * DUCK_SPEED - cam * FACTOR_MID, span) - 40);
      const y = DUCK_ROWS[i] + Math.round(Math.sin(time * 0.9 + i * 2));
      rect(ctx, '#dff4f4', x - 8, y + 2, 5, 1);
      ellipse(ctx, '#8a7a5a', x, y, 4, 2);
      rect(ctx, '#c9b98e', x - 3, y, 5, 1);
      rect(ctx, '#2f7a52', x + 3, y - 3, 3, 3);
      rect(ctx, '#e89a3a', x + 6, y - 2, 2, 1);
      rect(ctx, '#1b1b1b', x + 5, y - 2, 1, 1);
    }
  }

  /** The rowboat tied behind the boardwalk's rail: it bobs, rocks when clicked, and the rail's posts are put back in front of it. */
  private drawBoat(ctx: Ctx, cam: number, time: number): void {
    const { boat } = this.anchors;
    const sx = boat.x - cam;
    if (sx < -BOAT_HALF - 8 || sx > this.view + BOAT_HALF + 8) return;
    const age = time - this.rockAt;
    const rock = age < ROCK_SECONDS ? Math.round(Math.sin(age * 9) * ROCK_SWING * (1 - age / ROCK_SECONDS)) : 0;
    ctx.drawImage(this.boat, sx - BOAT_HALF + rock, boat.y - this.boat.height + 2 + Math.round(Math.sin(time * 0.9) * 1));
    ctx.drawImage(this.ground, boat.x - 24, 204, 48, 30, sx - 24, 204, 48, 30);
  }

  /** Rings widening round the monster inside its slip, a bigger slow wake out in the lake, and the rings a click started. */
  private drawWater(ctx: Ctx, cam: number, time: number): void {
    const { monsterX } = this.layout;
    const { slip } = this.anchors;
    const rings = this.rings.some((r) => time - r.at < CLICK_RING_SECONDS);
    const near = Math.abs(monsterX - cam - this.view / 2) < this.view;
    if (!near && !rings) return;
    ctx.save();
    ctx.translate(-cam, 0);
    if (near) {
      for (let k = 0; k < 3; k++) {
        const p = (time / 5 + k / 3) % 1;
        drawRing(ctx, monsterX - 70 - k * 12, 205 + k * 3, 6 + p * 22, 0.2, 0.5 * (1 - p));
      }
      ctx.beginPath();
      ctx.rect(slip.x, slip.y, slip.w, slip.h);
      ctx.clip();
      for (let k = 0; k < 2; k++) {
        const p = (time / 4 + k / 2) % 1;
        drawRing(ctx, monsterX + 4, slip.y + 5, 2 + p * 9, 0.3, 0.7 * (1 - p));
      }
    }
    ctx.restore();
    ctx.save();
    ctx.translate(-cam, 0);
    drawPressRings(ctx, this.rings, time);
    ctx.restore();
  }

  private drawWillows(ctx: Ctx, cam: number, time: number): void {
    for (const x of this.willowXs) {
      const sx = x - cam;
      if (sx > -this.willow.width && sx < this.view + this.willow.width) drawSwayTree(ctx, this.willow, sx, WILLOW_BASE, time, WILLOW_SWAY);
    }
  }

  /** Tall cattails along the water's edge, sliding at the reed bed's speed and swaying in the wind. */
  private drawCattails(ctx: Ctx, cam: number, time: number): void {
    const offset = cam * FACTOR_REEDS;
    for (let k = Math.floor(offset / CATTAIL_SPACING) - 1; k * CATTAIL_SPACING - offset < this.view + CATTAIL_SPACING; k++) {
      const sx = fieldX(k, CATTAIL_SPACING) - offset;
      if (sx < -CATTAIL_SPACING || sx > this.view + CATTAIL_SPACING) continue;
      drawSwayTree(ctx, this.cattails[((k % 3) + 3) % 3], sx, CATTAIL_BASE, time, 2);
    }
  }

  /** Little waves lapping the sand: a white dash that comes and goes along the water's edge (not under the boardwalk). */
  private drawFoam(ctx: Ctx, cam: number, time: number): void {
    for (let k = Math.floor(cam / FOAM_GAP); k * FOAM_GAP < cam + this.view; k++) {
      const wx = k * FOAM_GAP + Math.floor(hash(k) * 3);
      const top = this.layout.landTop(wx);
      const wave = Math.sin(time * 0.8 + k * 1.9);
      if (top >= BOARD_BACK - 1 || wave < 0.2) continue;
      ctx.globalAlpha = 0.7 * wave;
      rect(ctx, FOAM_COLOR, wx - cam, top - 1, 3 + (k % 2), 1);
    }
    ctx.globalAlpha = 1;
  }

  /** Wendy's fishing line from the rod tip down to a red and white float that bobs, with a tiny ring around it. */
  private drawFishing(ctx: Ctx, cam: number, time: number): void {
    const { tip, bobber } = this.anchors.rod;
    const bx = bobber.x - cam;
    if (bx < -20 || bx > this.view + 20) return;
    const by = bobber.y + Math.round(Math.sin(time * 1.6));
    const tx = tip.x - cam;
    for (let i = 0; i <= LINE_STEPS; i++) {
      const t = i / LINE_STEPS;
      rect(ctx, LINE_COLOR, tx + (bx - tx) * t, tip.y + (by - tip.y) * t + Math.sin(Math.PI * t) * 2, 1, 1);
    }
    rect(ctx, '#c4473b', bx - 1, by - 1, 2, 2);
    rect(ctx, '#f6f1e0', bx - 1, by - 2, 2, 1);
    const p = (time * 0.5) % 1;
    drawRing(ctx, bx, by + 1, 2 + p * 5, 0.3, 0.6 * (1 - p));
  }

  /** Smoke rising from the fire ring, leaning with the wind as it climbs. */
  private drawSmoke(ctx: Ctx, cam: number, time: number): void {
    const { fire } = this.anchors;
    const sx = fire.x - cam;
    if (sx < -SMOKE_RISE || sx > this.view + SMOKE_RISE) return;
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const u = (time * 0.2 + i / SMOKE_PUFFS) % 1;
      const size = 2 + Math.floor(u * 3);
      ctx.globalAlpha = (1 - u) * 0.45;
      rect(ctx, SMOKE_COLOR, sx + breeze(time, fire.x) * 5 * u + Math.sin(u * 6 + i) - size / 2, fire.y - 4 - u * SMOKE_RISE, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /** Dragonflies hovering over the reeds, now and then darting; they sleep at night. */
  private drawDragonflies(ctx: Ctx, cam: number, time: number, night: number): void {
    if (night > CREATURES_UNTIL) return;
    const span = this.view + 40;
    for (let i = 0; i < DRAGONFLY_COUNT; i++) {
      const x = wrap(hash(i * 3.7) * span + Math.sin(time * 0.4 + i * 2) * 30 + time * 3 - cam * FACTOR_REEDS, span) - 20;
      const y = 196 + hash(i * 5.1) * 14 + Math.sin(time * 1.7 + i) * 3;
      rect(ctx, '#2f8fbf', x - 1, y, 3, 1);
      rect(ctx, '#bfe6ff', x, y + (Math.floor(time * 12 + i) % 2 === 0 ? -1 : 1), 1, 1);
    }
  }

  /** "DING!" rises above the bell for a moment after a click. */
  private drawBell(ctx: Ctx, cam: number, time: number): void {
    const age = time - this.bellAt;
    if (age < 0 || age >= BELL_SECONDS) return;
    const { bell } = this.anchors;
    const x = bell.x + bell.w / 2 - textWidth(BELL_TEXT) / 2 - cam;
    const y = bell.y - 6 - Math.min(6, age * 10);
    drawText(ctx, BELL_TEXT, x + 1, y + 1, '#3a2418');
    drawText(ctx, BELL_TEXT, x, y, '#fff3c4');
  }

  /** Fireflies wandering over the reeds after dusk, each blinking on its own slow beat. */
  private drawFireflies(ctx: Ctx, cam: number, time: number, lit: number): void {
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const x = wrap(hash(i * 2.3) * this.view + Math.sin(time * 0.35 + i * 1.7) * 14 - cam * 0.9, this.view);
      const y = 190 + hash(i * 5.9) * 36 + Math.sin(time * 0.5 + i * 2.3) * 6;
      const blink = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 2.1);
      ctx.globalAlpha = lit * blink;
      rect(ctx, FIREFLY_COLOR, x, y, 1, 1);
      drawHalo(ctx, x, y, 3, FIREFLY_COLOR, lit * blink * 0.5);
    }
    ctx.globalAlpha = 1;
  }
}

export const buildLakeWorld: WorldBuilder = (designWidth) => new LakeWorld(designWidth);
