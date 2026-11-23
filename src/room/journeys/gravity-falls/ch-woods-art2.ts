/**
 * The Gnome Trail, part two: the ground strip the cast walks on, with the dirt trail, the forest floor, the stream
 * crossing and every set piece (fallen log, carved tree, signpost, sock line, village gate, the old village tree,
 * toadstool tavern, mushroom ring, council stump). Painted once; it also hands back where the animated parts go.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { plainText, textWidth } from '../../../render/pixel-font';
import { bayer, disc, drawSign, ellipse, fenceRun, line, lampPost, mix, mushroom, rect, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { FOREST, buildFern, buildLog, buildRootTree, buildStump, buildTavern } from '../../landscapes/gravity-falls/woods-art';
import { noise } from '../noise';
import { FLOOR_DARK, FLOOR_TOP, PATH_TOP, paintTrunk, type WoodsLayout } from './ch-woods-art';
import { DESIGN_ROWS } from './world';

/** A lit spot: where the halo goes at dusk, and how far it reaches. */
export interface Light {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** The two ends of the string the socks hang from. */
export interface SockLine {
  readonly x0: number;
  readonly x1: number;
  readonly y: number;
}

/** What the animated parts need to know about the painted ground (all in world pixels). */
export interface Anchors {
  readonly lights: readonly Light[];
  readonly chimney: Point;
  readonly tavernFlag: Point;
  /** Poles that fly a pennant: the gate posts and the council pole. */
  readonly pennants: readonly Point[];
  readonly socks: SockLine;
  /** Tall set pieces (left and right edge): a watcher in the far gaps is hidden when it would show through one. */
  readonly occluders: readonly (readonly [number, number])[];
}

/** The ground of the stream crossing: left and right edge of the water on a row, for the ripples. */
export function streamAt(ford: number, y: number): { left: number; right: number } {
  const t = Math.max(0, y - STREAM_TOP);
  const centre = ford + t * STREAM_DRIFT;
  const half = STREAM_HALF + t * STREAM_SPREAD;
  return { left: Math.round(centre - half), right: Math.round(centre + half) };
}

const GROUND_SEED = 5;
const FLOOR_GREEN = '#2f5238';
const MOSS_LIGHT = '#4f8148';
const MOSS_DARK = '#244230';
const LITTER = ['#7a5030', '#a7743a', '#5d3f26'] as const;
const DIRT = '#8a6a44';
const DIRT_LIGHT = '#a98a5c';
const DIRT_DARK = '#684d30';
const WATER = '#3c86a0';
const WATER_DARK = '#27607a';
const WATER_LIGHT = '#8fd0d8';
const STONE = { base: '#8a948c', light: '#b9c4b8', dark: '#4f5a54' };
const FLOWERS = ['#f4ecd2', '#f4d35e', '#e58fb0', '#9ab8ee'] as const;
const LANTERN_GLASS = '#ffcf70';
const LANTERN_METAL = '#3a2e22';

const STREAM_TOP = FLOOR_TOP + 2;
const STREAM_DRIFT = 0.18;
const STREAM_HALF = 6;
const STREAM_SPREAD = 0.45;
const STONE_ROWS = [235, 237, 236] as const;
const STONE_OFFSETS = [-7, 5, 17] as const;
const REED_ROWS_FROM = 216;

/** The row the set pieces behind the trail stand on, a little above the dirt. */
const VERGE_BASE = PATH_TOP;
/** The row the gate stands on: it spans the trail itself. */
const GATE_BASE = 233;
const GATE_POST_X = 17;
const GATE_POST_HEIGHT = 52;
const VILLAGE_BASE = 226;
const VILLAGE_TREE_ROWS = 120;
const VILLAGE_TREE_GAP = 24;
const TAVERN_BASE = 226;
const TAVERN_HALF = 18;
const TAVERN_ROWS = 44;
const COUNCIL_BASE = 226;
const COUNCIL_ROWS = 34;
const RING_ROW = 217;
const RING_RX = 27;
const RING_RY = 5.5;
const RING_MUSHROOMS = 15;
const TREE_BASE = 226;
const TREE_WIDTH = 30;
const CARVING_ROW = 190;
const BOULDER_BASE = 224;
const SIGN_POST_TOP = 178;
const SOCK_POST_TOP = 196;
const SOCK_SPAN = 44;
const CLEAR_MARGIN = 26;

/** Forest floor: moss green, dithered into the undergrowth's dark along its top edge, with moss, leaf litter and flowers. */
function paintFloor(ctx: Ctx, width: number, rand: () => number): void {
  rect(ctx, FLOOR_GREEN, 0, FLOOR_TOP, width, DESIGN_ROWS - FLOOR_TOP);
  const fade = 5;
  ctx.fillStyle = FLOOR_DARK;
  for (let y = FLOOR_TOP; y < FLOOR_TOP + fade; y++) {
    for (let x = 0; x < width; x++) if (bayer(x, y) < 1 - (y - FLOOR_TOP) / fade) ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < width / 5; i++) {
    const y = FLOOR_TOP + 4 + rand() * (PATH_TOP - FLOOR_TOP);
    rect(ctx, rand() < 0.5 ? MOSS_LIGHT : MOSS_DARK, rand() * width, y, 3 + rand() * 4, 1 + (rand() < 0.3 ? 1 : 0));
    if (rand() < 0.5) rect(ctx, LITTER[Math.floor(rand() * LITTER.length)], rand() * width, FLOOR_TOP + 6 + rand() * 18, 2, 1);
  }
  for (let x = 6; x < width; x += 24 + rand() * 22) {
    const y = FLOOR_TOP + 8 + rand() * 10;
    rect(ctx, MOSS_DARK, x, y + 1, 1, 2);
    rect(ctx, FLOWERS[Math.floor(rand() * FLOWERS.length)], x - 1, y - 1, 2, 2);
  }
}

/** The dirt trail: a wavering top edge, ruts, a lighter middle, pebbles, leaf litter, acorns and a few roots crossing it. */
function paintPath(ctx: Ctx, width: number, rand: () => number): void {
  for (let x = 0; x < width; x++) {
    const edge = PATH_TOP + Math.round(noise(x / 13 + 3) * 5);
    rect(ctx, DIRT, x, edge, 1, DESIGN_ROWS - edge);
    if (bayer(x, edge - 1) < 0.5) rect(ctx, DIRT_DARK, x, edge - 1, 1, 1);
    if (noise(x / 38 + 40) > 0.3) rect(ctx, DIRT_DARK, x, 241, 1, 1);
    if (noise(x / 30 + 90) > 0.35) rect(ctx, DIRT_LIGHT, x, 236, 1, 1);
    if (noise(x / 52 + 140) > 0.3) rect(ctx, DIRT_DARK, x, 230, 1, 1);
  }
  for (let i = 0; i < width / 4; i++) {
    const tone = rand();
    rect(ctx, tone < 0.4 ? DIRT_LIGHT : tone < 0.8 ? DIRT_DARK : STONE.base, rand() * width, PATH_TOP + 4 + rand() * 24, 1 + (rand() < 0.3 ? 1 : 0), 1);
  }
  for (let x = 14; x < width; x += 30 + rand() * 30) {
    const y = PATH_TOP + 6 + rand() * 16;
    rect(ctx, LITTER[Math.floor(rand() * LITTER.length)], x, y, 3, 1);
    rect(ctx, LITTER[0], x + 1, y + 1, 2, 1);
  }
  for (let x = 40; x < width; x += 90 + rand() * 80) {
    const y = PATH_TOP + 2 + rand() * 4;
    line(ctx, FOREST.barkDark, x, y + 1, x + 13, y + 6, 2);
    line(ctx, FOREST.bark, x, y, x + 13, y + 5, 2);
    rect(ctx, FOREST.barkLight, x + 2, y, 4, 1);
  }
  for (let x = 20; x < width; x += 46 + rand() * 40) disc(ctx, '#6a4a2a', x, PATH_TOP + 12 + rand() * 12, 1);
}

/** A cattail: a green stem with a brown spike on top. */
function reed(ctx: Ctx, x: number, base: number, rise: number): void {
  rect(ctx, '#3f7a4a', x, base - rise, 1, rise);
  rect(ctx, '#6e4a2e', x - 1, base - rise - 3, 3, 4);
  rect(ctx, '#9a7650', x - 1, base - rise - 3, 1, 4);
}

/**
 * The stream across the trail. It runs from the back of the forest toward the walker and widens as it comes, so the
 * crossing is a row of flat stepping stones at the height the party's feet are, with water between them.
 */
function paintFord(ctx: Ctx, ford: number): void {
  for (let y = STREAM_TOP; y < DESIGN_ROWS; y++) {
    const { left, right } = streamAt(ford, y);
    rect(ctx, WATER, left, y, right - left + 1, 1);
    for (let x = left; x <= right; x++) {
      if ((x * 3 + y * 7) % 11 === 0) rect(ctx, WATER_LIGHT, x, y, 2, 1);
      else if ((x + y * 2) % 9 === 0 && bayer(x, y) < 0.5) rect(ctx, WATER_DARK, x, y, 1, 1);
    }
    rect(ctx, WATER_DARK, left, y, 1, 1);
    rect(ctx, WATER_DARK, right, y, 1, 1);
    rect(ctx, '#7a6a52', left - 1, y, 1, 1);
    rect(ctx, '#7a6a52', right + 1, y, 1, 1);
  }
  STONE_OFFSETS.forEach((dx, i) => {
    const y = STONE_ROWS[i];
    const x = ford + dx;
    ellipse(ctx, WATER_DARK, x, y + 2, 8, 2);
    ellipse(ctx, STONE.dark, x, y, 7, 3);
    ellipse(ctx, STONE.base, x, y - 1, 6, 2);
    rect(ctx, STONE.light, x - 4, y - 2, 4, 1);
  });
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const y = REED_ROWS_FROM + k * 3;
      const { left, right } = streamAt(ford, y);
      reed(ctx, (side < 0 ? left - 3 : right + 3) + side * (k % 2) * 2, y + 4, 10 + k * 2);
    }
  }
}

/** The fallen log tunnel: a huge mossy log with a round-topped hollow through its belly, a spot of light at the far end. */
function paintLogTunnel(ctx: Ctx, cx: number): void {
  const w = 96;
  const h = 30;
  const left = cx - w / 2;
  const top = VERGE_BASE + 3 - h;
  const r = h / 2;
  rect(ctx, FOREST.bark, left + r, top, w - r, h);
  rect(ctx, FOREST.barkLight, left + r, top, w - r, 2);
  rect(ctx, FOREST.barkDark, left + r, top + h - 2, w - r, 2);
  for (let x = left + r + 3; x < left + w - 4; x += 4) rect(ctx, FOREST.barkDark, x + Math.floor(noise(x) * 3), top + 3, 1, 8 + Math.floor(noise(x + 9) * 8));
  for (let x = left + r + 6; x < left + w - 8; x += 9) {
    rect(ctx, FOREST.moss, x, top - 1, 6, 3);
    rect(ctx, FOREST.mossLight, x + 1, top - 1, 3, 1);
  }
  ellipse(ctx, FOREST.woodDark, left + r, top + r, r, r);
  ellipse(ctx, FOREST.wood, left + r, top + r, r - 1, r - 1);
  ellipse(ctx, FOREST.woodRing, left + r, top + r, Math.round(r * 0.55), Math.round(r * 0.55));
  ellipse(ctx, FOREST.wood, left + r, top + r, Math.round(r * 0.55) - 1, Math.round(r * 0.55) - 1);
  const holeX = cx + 14;
  const holeHeight = 17;
  const holeHalf = 11;
  for (let dy = 0; dy < holeHeight; dy++) {
    const half = Math.floor(holeHalf * Math.sqrt(1 - (dy / holeHeight) * (dy / holeHeight)));
    rect(ctx, '#0b1a16', holeX - half, top + h - 3 - dy, half * 2 + 1, 1);
  }
  for (let i = 0; i < 6; i++) rect(ctx, '#1d3a31', holeX - 6 + i * 2, top + h - 6 - (i % 3), 1, 1);
  rect(ctx, '#9ccf8f', holeX + 2, top + h - 7, 2, 2);
  rect(ctx, '#ee9a3c', cx + 36, top + 12, 5, 1);
  rect(ctx, '#f4b86a', cx + 36, top + 11, 4, 1);
  ctx.drawImage(buildFern(10), Math.round(cx + w / 2 - 4), VERGE_BASE - 10);
  ctx.drawImage(buildLog(38, 9), Math.round(cx - w / 2 - 36), VERGE_BASE - 8);
}

/** A huge trunk with a smooth patch of bark for the carved symbol at row `CARVING_ROW`. */
function paintCarvedTree(ctx: Ctx, cx: number, rand: () => number): void {
  paintTrunk(ctx, cx, TREE_WIDTH, TREE_BASE, rand, 0);
  rect(ctx, FOREST.barkDark, cx - 10, CARVING_ROW - 11, 20, 22);
  rect(ctx, '#7a563a', cx - 9, CARVING_ROW - 10, 18, 20);
  rect(ctx, '#8d6644', cx - 9, CARVING_ROW - 10, 18, 2);
  ctx.drawImage(buildFern(9), cx - 22, TREE_BASE - 9);
}

/** The boulder the journal page comes to rest on. */
function paintBoulder(ctx: Ctx, cx: number): void {
  const stone = rock(26, 18, 5, STONE);
  ctx.drawImage(stone, cx - 13, BOULDER_BASE - stone.height);
  rect(ctx, FOREST.moss, cx - 8, BOULDER_BASE - stone.height + 1, 9, 2);
  rect(ctx, FOREST.mossLight, cx - 7, BOULDER_BASE - stone.height + 1, 4, 1);
}

/** A trail post with a painted plank at its top and a pointing plank below it; the coded note is pinned on the post. */
function paintSignpost(ctx: Ctx, cx: number): void {
  rect(ctx, FOREST.barkDark, cx - 3, SIGN_POST_TOP, 6, TREE_BASE + 6 - SIGN_POST_TOP);
  rect(ctx, FOREST.wood, cx - 2, SIGN_POST_TOP, 4, TREE_BASE + 6 - SIGN_POST_TOP);
  rect(ctx, FOREST.woodDark, cx + 1, SIGN_POST_TOP, 1, TREE_BASE + 6 - SIGN_POST_TOP);
  const label = 'GNOME TRAIL';
  const boardW = textWidth(plainText(label)) + 4;
  drawSign(ctx, label, cx - Math.floor(boardW / 2), SIGN_POST_TOP - 4, 1, FOREST.ink, FOREST.cream);
  rect(ctx, FOREST.ink, cx - 7, SIGN_POST_TOP + 6, 14, 6);
  rect(ctx, FOREST.wood, cx - 6, SIGN_POST_TOP + 7, 12, 4);
  rect(ctx, FOREST.ink, cx - 4, SIGN_POST_TOP + 9, 8, 1);
  rect(ctx, FOREST.ink, cx + 2, SIGN_POST_TOP + 8, 1, 3);
  rect(ctx, FOREST.ink, cx + 3, SIGN_POST_TOP + 9, 1, 1);
  for (const dx of [-8, 6]) rect(ctx, FOREST.moss, cx + dx, TREE_BASE + 4, 3, 2);
}

/** Two sticks the gnomes hang their socks between, and a basket of more socks at the foot of one. */
function paintSockPosts(ctx: Ctx, x: number): void {
  for (const px of [x, x + SOCK_SPAN]) {
    rect(ctx, FOREST.bark, px, SOCK_POST_TOP, 3, VERGE_BASE + 2 - SOCK_POST_TOP);
    rect(ctx, FOREST.barkDark, px + 2, SOCK_POST_TOP, 1, VERGE_BASE + 2 - SOCK_POST_TOP);
    rect(ctx, FOREST.barkLight, px, SOCK_POST_TOP - 1, 1, 1);
  }
  rect(ctx, FOREST.woodDark, x + 6, VERGE_BASE - 6, 10, 8);
  rect(ctx, FOREST.wood, x + 7, VERGE_BASE - 5, 8, 6);
  rect(ctx, '#d8584f', x + 8, VERGE_BASE - 8, 3, 3);
  rect(ctx, '#5aa3d8', x + 11, VERGE_BASE - 7, 3, 2);
}

/** A lantern hung at (x, y): a dark cap, a warm pane, a short chain. Returns nothing; the glow is added by the caller. */
function hangLantern(ctx: Ctx, x: number, y: number): void {
  rect(ctx, LANTERN_METAL, x, y - 4, 1, 4);
  rect(ctx, LANTERN_METAL, x - 2, y, 5, 1);
  rect(ctx, LANTERN_GLASS, x - 1, y + 1, 3, 4);
  rect(ctx, '#fff0b0', x - 1, y + 1, 1, 1);
  rect(ctx, LANTERN_METAL, x - 2, y + 5, 5, 1);
}

/** A post of two twisting twigs, `GATE_POST_HEIGHT` tall, its foot on `GATE_BASE`. */
function twigPost(ctx: Ctx, x: number): void {
  for (let row = 0; row < GATE_POST_HEIGHT; row++) {
    const bend = Math.round(Math.sin(row * 0.35) * 1.2);
    rect(ctx, FOREST.bark, x - 2 + bend, GATE_BASE - row, 4, 1);
    rect(ctx, FOREST.barkLight, x - 2 + bend, GATE_BASE - row, 1, 1);
    rect(ctx, FOREST.barkDark, x + 1 + bend, GATE_BASE - row, 1, 1);
  }
  rect(ctx, FOREST.mossDark, x - 3, GATE_BASE - 2, 6, 3);
  rect(ctx, FOREST.moss, x - 3, GATE_BASE - 3, 3, 1);
}

/** The village gate: twig posts, a twig arch with a 'KEEP OUT' plank hung from it, two lanterns, and a twig fence either side. */
function paintGate(ctx: Ctx, gate: number, lights: Light[]): void {
  const fence = { wood: FOREST.bark, light: FOREST.barkLight, dark: FOREST.barkDark };
  fenceRun(ctx, gate - GATE_POST_X - 58, GATE_BASE - 1, 56, fence, 13, 7);
  const left = gate - GATE_POST_X;
  const right = gate + GATE_POST_X;
  const shoulder = GATE_BASE - GATE_POST_HEIGHT;
  twigPost(ctx, left);
  twigPost(ctx, right);
  for (const [a, b] of [[left, right], [right, left]]) {
    line(ctx, FOREST.barkDark, a, shoulder + 1, (a + gate) / 2, shoulder - 8, 2);
    line(ctx, FOREST.bark, a, shoulder, (a + gate) / 2, shoulder - 9, 2);
    line(ctx, FOREST.bark, (a + gate) / 2, shoulder - 9, gate, shoulder - 12, 2);
    rect(ctx, FOREST.barkLight, a + (b < a ? -1 : 1), shoulder - 1, 1, 1);
  }
  for (let i = -2; i <= 2; i++) line(ctx, FOREST.barkDark, gate + i * 6, shoulder - 11 + Math.abs(i) * 2, gate + i * 6 + 2, shoulder - 6 + Math.abs(i) * 2);
  const label = 'KEEP OUT';
  const boardW = textWidth(plainText(label)) + 4;
  rect(ctx, FOREST.ink, gate - 8, shoulder - 3, 1, 5);
  rect(ctx, FOREST.ink, gate + 8, shoulder - 3, 1, 5);
  drawSign(ctx, label, gate - Math.floor(boardW / 2), shoulder + 2, 1, FOREST.ink, FOREST.wood);
  for (const dx of [-GATE_POST_X + 5, GATE_POST_X - 5]) {
    hangLantern(ctx, gate + dx, shoulder + 14);
    lights.push({ x: gate + dx, y: shoulder + 17, radius: 16 });
  }
}

/** The old village tree, its leafy crown laid over the cut top, and its tiny lit windows added to the lights. */
function paintVillageTree(ctx: Ctx, left: number, lights: Light[]): Point {
  const tree = buildRootTree();
  const top = VILLAGE_BASE - VILLAGE_TREE_ROWS;
  ctx.drawImage(tree.canvas, left, top);
  const cx = left + 26;
  ellipse(ctx, FOREST.leafDark, cx, top + 2, 32, 16);
  ellipse(ctx, FOREST.leaf, cx - 7, top - 1, 25, 12);
  ellipse(ctx, FOREST.leafLight, cx - 14, top - 6, 10, 4);
  for (const dx of [-22, -8, 6, 20]) disc(ctx, FOREST.mossLight, cx + dx, top - 4 + Math.abs(dx) / 6, 1);
  for (const dx of [-26, 24]) line(ctx, FOREST.leaf, cx + dx, top + 10, cx + dx, top + 24);
  for (const p of tree.windows) lights.push({ x: left + p.x, y: top + p.y, radius: 9 });
  return { x: left + tree.chimney.x, y: top + tree.chimney.y };
}

/** The toadstool tavern with a barrel, a bench and a post lantern; its window and lantern join the lights. */
function paintTavern(ctx: Ctx, cx: number, lights: Light[]): Point {
  const tavern = buildTavern();
  const left = cx - TAVERN_HALF;
  const top = TAVERN_BASE - TAVERN_ROWS;
  ctx.drawImage(tavern.canvas, left, top);
  lights.push({ x: left + tavern.window.x, y: top + tavern.window.y, radius: 14 });
  for (const dx of [-30, -22]) {
    rect(ctx, FOREST.ink, cx + dx - 1, TAVERN_BASE - 10, 9, 11);
    rect(ctx, FOREST.woodDark, cx + dx, TAVERN_BASE - 9, 7, 9);
    rect(ctx, FOREST.wood, cx + dx, TAVERN_BASE - 9, 2, 9);
    rect(ctx, '#5a626a', cx + dx, TAVERN_BASE - 6, 7, 1);
    rect(ctx, '#5a626a', cx + dx, TAVERN_BASE - 2, 7, 1);
  }
  rect(ctx, FOREST.woodDark, cx + 20, TAVERN_BASE - 6, 14, 2);
  rect(ctx, FOREST.barkDark, cx + 21, TAVERN_BASE - 4, 2, 5);
  rect(ctx, FOREST.barkDark, cx + 31, TAVERN_BASE - 4, 2, 5);
  const lantern = lampPost(ctx, cx + 40, TAVERN_BASE + 1, 22, LANTERN_METAL, LANTERN_GLASS);
  lights.push({ x: lantern.x, y: lantern.y, radius: 14 });
  return { x: left + tavern.flag.x, y: top + tavern.flag.y };
}

/** The fairy ring: a lighter patch of floor with toadstools standing round its edge, the near ones bigger. */
function paintRing(ctx: Ctx, cx: number): void {
  ellipse(ctx, mix(FLOOR_GREEN, '#8cc070', 0.3), cx, RING_ROW, RING_RX - 2, RING_RY - 1);
  const caps = [mushroom(5, FOREST.red, FOREST.cream, FOREST.cream), mushroom(7, FOREST.red, FOREST.cream, FOREST.cream)];
  const places: { x: number; y: number; big: boolean }[] = [];
  for (let k = 0; k < RING_MUSHROOMS; k++) {
    const angle = (k * 2 * Math.PI) / RING_MUSHROOMS;
    const y = RING_ROW + Math.sin(angle) * RING_RY;
    places.push({ x: cx + Math.cos(angle) * RING_RX, y, big: y > RING_ROW });
  }
  places.sort((a, b) => a.y - b.y);
  for (const p of places) {
    const cap = caps[p.big ? 1 : 0];
    ctx.drawImage(cap, Math.round(p.x - cap.width / 2), Math.round(p.y - cap.height + 1));
  }
}

/** The council: a giant stump with small stump seats either side, and a pole for the council's pennant. Returns the pole's top. */
function paintCouncil(ctx: Ctx, cx: number): Point {
  const seat = buildStump(20, 12);
  for (const dx of [-52, -76, 52, 76]) ctx.drawImage(seat.canvas, cx + dx - 10, COUNCIL_BASE - (Math.abs(dx) > 60 ? 10 : 12));
  const stump = buildStump(56, COUNCIL_ROWS);
  ctx.drawImage(stump.canvas, cx - 28, COUNCIL_BASE - COUNCIL_ROWS);
  const poleX = cx - 38;
  rect(ctx, FOREST.barkDark, poleX, COUNCIL_BASE - COUNCIL_ROWS - 6, 2, COUNCIL_ROWS + 6);
  rect(ctx, FOREST.barkLight, poleX, COUNCIL_BASE - COUNCIL_ROWS - 6, 1, COUNCIL_ROWS + 6);
  return { x: poleX + 2, y: COUNCIL_BASE - COUNCIL_ROWS - 5 };
}

/** Ferns and little logs along the back of the trail, kept clear of the set pieces. */
function paintVerge(ctx: Ctx, width: number, rand: () => number, keepClear: readonly number[]): void {
  const ferns = [buildFern(7), buildFern(11)];
  const logs = [buildLog(30, 7), buildLog(38, 9)];
  for (let x = 12; x < width; x += 34 + rand() * 40) {
    if (keepClear.some((c) => Math.abs(x - c) < CLEAR_MARGIN)) continue;
    if (rand() < 0.7) {
      const fern = ferns[Math.floor(rand() * ferns.length)];
      ctx.drawImage(fern, Math.round(x - fern.width / 2), VERGE_BASE - fern.height + 2);
    } else {
      const log = logs[Math.floor(rand() * logs.length)];
      ctx.drawImage(log, Math.round(x - log.width / 2), VERGE_BASE - log.height + 3);
    }
  }
}

/**
 * The whole ground strip, `layout.worldWidth` wide: floor, trail, stream, then the set pieces from back to front.
 * The cast stands on rows 226 to 240, so everything here is drawn to sit behind them.
 */
export function buildGround(layout: WoodsLayout): { canvas: HTMLCanvasElement; anchors: Anchors } {
  const { canvas, ctx } = memoryCanvas(layout.worldWidth, DESIGN_ROWS);
  const rand = seeded(GROUND_SEED);
  const lights: Light[] = [];
  paintFloor(ctx, layout.worldWidth, rand);
  paintPath(ctx, layout.worldWidth, rand);
  const villageLeft = layout.gate + VILLAGE_TREE_GAP;
  const piecePlaces = [layout.ford, layout.log, layout.symbol, layout.page, layout.note, layout.socks + SOCK_SPAN / 2, layout.gate, villageLeft + 26, layout.tavern, layout.ring, layout.council];
  paintVerge(ctx, layout.worldWidth, rand, piecePlaces);
  paintFord(ctx, layout.ford);
  paintLogTunnel(ctx, layout.log);
  paintCarvedTree(ctx, layout.symbol, rand);
  paintBoulder(ctx, layout.page);
  paintSignpost(ctx, layout.note);
  paintSockPosts(ctx, layout.socks);
  const chimney = paintVillageTree(ctx, villageLeft, lights);
  paintGate(ctx, layout.gate, lights);
  const tavernFlag = paintTavern(ctx, layout.tavern, lights);
  paintRing(ctx, layout.ring);
  const councilPole = paintCouncil(ctx, layout.council);
  const gatePosts: Point[] = [
    { x: layout.gate - GATE_POST_X, y: GATE_BASE - GATE_POST_HEIGHT },
    { x: layout.gate + GATE_POST_X, y: GATE_BASE - GATE_POST_HEIGHT },
  ];
  return {
    canvas,
    anchors: {
      lights,
      chimney,
      tavernFlag,
      pennants: [...gatePosts, councilPole],
      socks: { x0: layout.socks + 1, x1: layout.socks + SOCK_SPAN + 1, y: SOCK_POST_TOP + 1 },
      occluders: [
        [layout.symbol - TREE_WIDTH / 2 - 3, layout.symbol + TREE_WIDTH / 2 + 3],
        [layout.note - 24, layout.note + 24],
        [layout.gate - 22, layout.gate + 22],
        [villageLeft - 4, villageLeft + 58],
        [layout.tavern - TAVERN_HALF - 2, layout.tavern + TAVERN_HALF + 2],
      ],
    },
  };
}
