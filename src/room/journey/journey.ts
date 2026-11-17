import { css, mix, type RGB } from '../../render/color';
import { memoryCanvas } from '../../render/pixel-stage';
import { hourNow } from '../../scene/clock';
import { readJson, writeJson } from '../../store';
import type { Look } from '../../wallpapers/look';
import { ChapterTitle } from '../journeys/chapter-title';
import type { JourneyView } from '../journeys/journey-view';
import { fbm, hash } from '../journeys/noise';
import type { NightSky } from '../night-sky';
import { SkyDome, clamp01, type SkyState } from '../sky';
import type { ViewFrame } from '../view';
import { Birds, Butterflies, Fireflies } from './air';
import {
  BIOMES,
  OLD_WOOD_BIOME,
  ROAD_LENGTH,
  SEGMENT,
  blend,
  blendNumber,
  weightsAt,
  type Biome,
  type TreeKind,
} from './biomes';
import { Clearing } from './clearing';
import { PACE_SPEED, type Pace } from './pace';
import { buildPlants, drawSwaying, wind, type PlantSet, type Sprite } from './sprites';
import { Wildlife, type Rows, type Standing } from './wildlife';

/** Rows as shares of the view's height. The sky ends at the horizon; the land runs from the far mountains down. */
const HORIZON = 0.645;
const MOUNTAIN = { base: 0.6, height: 0.17, speed: 0.05, scale: 0.0042 };
const HILL = { base: 0.645, height: 0.06, speed: 0.15, scale: 0.011 };
/** Where the near ground begins, how far a lake lifts the water above it and lowers the shore below it. */
const GROUND = 0.672;
const LAKE_RISE = 0.055;
const LAKE_DROP = 0.085;
/** The band the near trees and animals stand in, and the row the foreground grass ends on. */
const NEAR_ROWS: [number, number] = [0.75, 0.815];
const TUFT_BASE = 0.832;
const MID_BASE = 0.665;
/** How fast the near ground slides past, in stage pixels a second at the design size of 270 rows. */
const SPEED = 9;
const DESIGN_ROWS = 270;
/** Colours are worked out once per this many columns: they change too slowly across the view to show. */
const BLOCK = 8;
const SAND = css([196, 178, 124]);
const ROUTE_KEY = 'chillscreen.route.wildwood';
const SAVE_EVERY_SECONDS = 5;
const CAMP_TREE_CLEARANCE = 105;
/** How far the crown of each kind leans in a full gust, as a share of its height. */
const SWAY: Record<TreeKind | 'reed' | 'tuft' | 'fern' | 'mushroom', number> = {
  pine: 0.035,
  oak: 0.06,
  autumn: 0.06,
  bush: 0.05,
  autumnBush: 0.05,
  tallPine: 0.03,
  gnarledOak: 0.045,
  mossBush: 0.05,
  reed: 0.12,
  tuft: 0.22,
  fern: 0.09,
  mushroom: 0,
};
const WHITE: RGB = [255, 255, 255];

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const isRoadPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** The colours for one run of columns, as ready-made strings. */
interface Block {
  mountain: string;
  mountainLit: string;
  hill: string;
  grass: string;
  grassLight: string;
  dark: string;
  waterTop: string;
  waterDeep: string;
}

/** The chosen start of the road: `?biome=2` wins, else saved road position, else where the clock says. */
function startOfRoad(unit: number): number {
  const asked = new URLSearchParams(location.search).get('biome');
  if (asked !== null && asked.trim() !== '' && Number.isFinite(Number(asked))) {
    return Number(asked) * SEGMENT + SEGMENT * 0.25;
  }
  const saved = readJson<number>(ROUTE_KEY, -1, isRoadPos);
  if (saved >= 0) return saved % ROAD_LENGTH;
  return ((Date.now() / 1000) * SPEED * unit) % ROAD_LENGTH;
}

/**
 * A slow journey past the window, in pixels: mountains, hills and trees drifting by at their own speeds, through
 * forest, meadow, lakeside, autumn woods, a campfire clearing and the old wood, blending without a seam. Trees sway
 * in the wind, animals roam and react to the pointer and tossed food, and a recurring fox follows along the road.
 */
export class Journey implements JourneyView {
  private w = 0;
  private h = 0;
  private unit = 1;
  private scroll = 0;
  private started = false;
  private sinceSave = 0;
  private multiplier = PACE_SPEED.gentle;
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };
  private readonly dome: SkyDome;
  private readonly land = memoryCanvas(1, 1);
  private plants: { near: PlantSet; mid: PlantSet } | null = null;
  /** For each column, the share of each biome there, and where the lake's water begins and the shore sits. */
  private shares = new Float32Array(0);
  private lake = new Float32Array(0);
  private shore = new Int16Array(0);
  private blocks: Block[] = [];
  private maxOldWood = 0;
  private readonly wildlife = new Wildlife();
  private readonly clearing = new Clearing();
  private readonly chapterTitle = new ChapterTitle();
  private readonly birds = new Birds();
  private readonly butterflies = new Butterflies();
  private readonly fireflies = new Fireflies();
  private readonly scratch: number[] = new Array<number>(BIOMES.length).fill(0);

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  setPace(pace: Pace): void {
    this.multiplier = PACE_SPEED[pace];
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_ROWS;
    this.dome.resize(w, h);
    this.land.canvas.width = w;
    this.land.canvas.height = h;
    this.land.ctx.imageSmoothingEnabled = false;
    this.shares = new Float32Array(w * BIOMES.length);
    this.lake = new Float32Array(w);
    this.shore = new Int16Array(w);
    const grasses = BIOMES.map((b) => b.grass);
    this.plants = { near: buildPlants(this.unit, 0, grasses), mid: buildPlants(this.unit * 0.5, 0.45, grasses) };
    if (!this.started) {
      this.started = true;
      this.scroll = startOfRoad(this.unit);
      this.wildlife.reset(this.scroll, w, this.rows(), this.clearing.campWorldX(this.scroll, w));
    }
  }

  press(x: number, y: number): void {
    if (this.w <= 0 || this.h <= 0) return;
    const rows = this.rows();
    if (this.clearing.tryStoke(x, y, this.scroll, this.w, rows)) return;
    if (y < this.h * HORIZON) return;
    const col = Math.max(0, Math.min(this.w - 1, Math.round(x)));
    if (this.lake[col] > 0.35) return;
    const minY = Math.max(rows.dryTop, this.shore[col] + 2);
    const targetY = Math.max(minY, Math.min(rows.dryBottom, Math.round(y)));
    this.wildlife.tossFood(this.scroll + x, targetY);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const state = this.dome.stateAt(hourNow());
    const roadSpeed = SPEED * this.multiplier * this.unit;
    this.scroll += roadSpeed * frame.dt;
    if (this.multiplier > 0) {
      this.sinceSave += frame.dt;
      if (this.sinceSave >= SAVE_EVERY_SECONDS) {
        this.sinceSave = 0;
        writeJson(ROUTE_KEY, Math.round(((this.scroll % ROAD_LENGTH) + ROAD_LENGTH) % ROAD_LENGTH));
      }
    }

    this.prepare(state);
    this.updateLook(state);
    this.dome.draw(ctx, state, frame, this.look);
    this.birds.draw(ctx, frame.dt, frame.time, state.day, this.w, this.h);

    const L = this.land.ctx;
    L.imageSmoothingEnabled = false;
    L.clearRect(0, 0, this.w, this.h);
    this.paintMountains(L, 'mountain', MOUNTAIN);
    this.paintMountains(L, 'hill', HILL);
    const mid: Standing[] = [];
    this.plantTrees(
      this.plants?.mid,
      0.4,
      28,
      1.5,
      0.25,
      (r) => Math.round(this.h * MID_BASE) + Math.round(r * 3),
      frame.time,
      11,
      mid,
    );
    this.paintStanding(L, mid);
    this.paintGround(L, state, frame.time);

    const rows = this.rows();
    const campX = this.clearing.campWorldX(this.scroll, this.w);
    this.clearing.update(frame.dt, this.scroll, this.w, frame.pointer, rows);
    this.wildlife.update(frame.dt, {
      scroll: this.scroll,
      screenW: this.w,
      screenH: this.h,
      rows,
      pointer: frame.pointer,
      campWorldX: campX,
      travellerWaving: this.clearing.isTravellerWaving(),
      day: state.day,
      roadSpeed,
    });

    const near: Standing[] = [
      ...this.wildlife.standing(this.scroll, frame.pointer),
      ...this.clearing.standing(this.scroll, this.w, rows, frame.time),
    ];
    this.plantTrees(
      this.plants?.near,
      1,
      50,
      1,
      0.35,
      (r) => Math.round(this.h * (NEAR_ROWS[0] + (NEAR_ROWS[1] - NEAR_ROWS[0]) * r)),
      frame.time,
      29,
      near,
    );
    this.plantReeds(frame.time, near);
    this.plantOldWoodFloor(frame.time, near);
    this.paintFlowers(L);
    this.paintStanding(L, near);
    this.paintTufts(L, frame.time);
    this.paintOldWoodFog(L, frame.time);
    this.butterflies.draw(
      L,
      frame.dt,
      frame.time,
      this.butterflyPresence(state),
      this.w,
      [this.h * 0.6, this.h * 0.8],
      frame.pointer,
    );
    this.tintLand(L, state);
    this.clearing.drawGlow(L, this.scroll, this.w, rows, state.day, frame.time);
    this.clearing.drawFlamesAndParticles(L, this.scroll, this.w, rows, frame.time);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.land.canvas, 0, 0);
    this.wildlife.drawCanopyOwl(ctx);
    const centerOldWood = this.shares[Math.floor(this.w / 2) * BIOMES.length + OLD_WOOD_BIOME];
    this.fireflies.draw(
      ctx,
      frame.dt,
      frame.time,
      1 - state.day,
      this.w,
      [this.h * 0.62, this.h * 0.82],
      centerOldWood,
    );
    const chapter = this.dominant(Math.floor(this.w / 2)).name;
    this.chapterTitle.draw(ctx, frame.dt, this.w, this.h, chapter);
    return this.look;
  }

  private rows(): Rows {
    const g = Math.round(this.h * GROUND);
    return {
      dryTop: g + Math.round(this.h * 0.06),
      dryBottom: Math.round(this.h * NEAR_ROWS[1]),
      lakeTop: g - Math.round(this.h * 0.005),
      lakeBottom: g + Math.round(this.h * 0.06),
    };
  }

  /** Works out, for every column, the mix of countries, the lake and the shore, and the colours for each run of columns. */
  private prepare(state: SkyState): void {
    const n = BIOMES.length;
    const g = Math.round(this.h * GROUND);
    let maxOldWood = 0;
    for (let x = 0; x < this.w; x++) {
      weightsAt(this.scroll + x, this.scratch);
      this.shares.set(this.scratch, x * n);
      if (this.scratch[OLD_WOOD_BIOME] > maxOldWood) maxOldWood = this.scratch[OLD_WOOD_BIOME];
      this.lake[x] = blendNumber(this.shares, x * n, (b) => b.lake);
      this.shore[x] = g + Math.round(this.lake[x] * LAKE_DROP * this.h);
    }
    this.maxOldWood = maxOldWood;
    const horizon = state.sky.horizon;
    const count = Math.ceil(this.w / BLOCK);
    this.blocks.length = count;
    for (let i = 0; i < count; i++) {
      const o = Math.min(this.w - 1, i * BLOCK + BLOCK / 2) * n;
      const grass = blend(this.shares, o, (b) => b.grass);
      const mountain = mix(blend(this.shares, o, (b) => b.mountain), horizon, 0.45);
      this.blocks[i] = {
        mountain: css(mountain),
        mountainLit: css(mix(mountain, WHITE, 0.2)),
        hill: css(mix(blend(this.shares, o, (b) => b.hill), horizon, 0.2)),
        grass: css(grass),
        grassLight: css(mix(grass, WHITE, 0.14)),
        dark: css(blend(this.shares, o, (b) => b.grassDark)),
        waterTop: css(mix(horizon, [78, 146, 176], 0.55)),
        waterDeep: css(mix(state.sky.zenith, [40, 104, 142], 0.55)),
      };
    }
  }

  private updateLook(state: SkyState): void {
    const { sky, sun, day } = state;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const o = Math.floor(this.w / 2) * BIOMES.length;
    const ground = blend(this.shares, o, (b) => b.grass);
    const lit = mix([40, 56, 90], ground, day);
    this.look.mean = luma(air) * 0.65 + luma(lit) * 0.35;
    this.look.night = 1 - day;
    let tint = mix(air, lit, 0.3);
    const campX = this.clearing.campWorldX(this.scroll, this.w);
    if (campX !== null && 1 - day > 0.25) {
      const dist = Math.abs(campX - this.scroll - this.w * 0.5);
      const nearCenter = clamp01(1 - dist / (this.w * 0.5));
      tint = mix(tint, [235, 142, 62], 0.14 * nearCenter * (1 - day));
    }
    this.look.tint = tint;
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.7, color: sky.light } : null;
  }

  /** A ridge of far mountains or low hills, drifting slowly, lit on the slopes that face the sun. */
  private paintMountains(
    L: CanvasRenderingContext2D,
    key: 'mountain' | 'hill',
    spec: { base: number; height: number; speed: number; scale: number },
  ): void {
    const ground = Math.round(this.h * GROUND);
    const base = Math.round(this.h * spec.base);
    const reach = this.h * spec.height;
    const lit = key === 'mountain' ? 'mountainLit' : 'grassLight';
    for (let x = 0; x < this.w; x++) {
      const at = (this.scroll * spec.speed + x) * spec.scale;
      const rise = clamp01((fbm(at) - 0.28) * 1.9);
      const top = base - Math.round((0.1 + 0.9 * rise) * reach);
      const block = this.blocks[x >> 3];
      L.fillStyle = block[key];
      L.fillRect(x, top, 1, ground - top + 3);
      if (key === 'mountain' && fbm(at + spec.scale) < rise) {
        L.fillStyle = block[lit];
        L.fillRect(x, top, 1, 2);
      }
    }
  }

  /** Where each plant at this distance stands this frame, and how to draw it. */
  private plantTrees(
    set: PlantSet | undefined,
    speed: number,
    cell: number,
    crowding: number,
    lakeLimit: number,
    rowOf: (r: number) => number,
    time: number,
    salt: number,
    out: Standing[],
  ): void {
    if (!set) return;
    const n = BIOMES.length;
    const campX = speed === 1 ? this.clearing.campWorldX(this.scroll, this.w) : null;
    const first = Math.floor((this.scroll * speed - 70) / cell);
    const last = Math.ceil((this.scroll * speed + this.w + 70) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 7919 + salt;
      const col = Math.max(0, Math.min(this.w - 1, Math.round((k + 0.5) * cell - this.scroll * speed)));
      if (this.lake[col] > lakeLimit) continue;
      const expected = (blendNumber(this.shares, col * n, (b) => b.trees) * cell * crowding) / 100;
      const count = Math.floor(expected) + (hash(seed) < expected % 1 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const lx = (k + hash(seed + i * 3 + 1)) * cell;
        if (campX !== null && Math.abs(lx - campX) < CAMP_TREE_CLEARANCE) continue;
        const sx = lx - this.scroll * speed;
        const kind = this.kindAt(Math.max(0, Math.min(this.w - 1, Math.round(sx))), hash(seed + i * 3 + 2));
        const variants = set.trees[kind];
        const sprite = variants[Math.floor(hash(seed + i * 3 + 3) * variants.length)];
        const baseY = rowOf(hash(seed + i * 3 + 4));
        out.push(this.plantStanding(sprite, sx, baseY, lx, time, SWAY[kind], speed === 1));
      }
    }
  }

  private plantStanding(
    sprite: Sprite,
    sx: number,
    baseY: number,
    lx: number,
    time: number,
    sway: number,
    shadow: boolean,
  ): Standing {
    return {
      y: baseY,
      paint: (L) => {
        const x = Math.round(sx - sprite.w / 2);
        if (shadow) {
          L.fillStyle = 'rgba(0,0,0,0.22)';
          L.fillRect(x + Math.round(sprite.w * 0.15), baseY - 1, Math.round(sprite.w * 0.7), 2);
        }
        drawSwaying(L, sprite, x, baseY, wind(time, lx) * sprite.h * sway);
      },
    };
  }

  /** Reeds along the lake shore, standing in the shallows. */
  private plantReeds(time: number, out: Standing[]): void {
    const set = this.plants?.near;
    if (!set) return;
    const cell = 12;
    const first = Math.floor((this.scroll - 20) / cell);
    const last = Math.ceil((this.scroll + this.w + 20) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 4177 + 5;
      const col = Math.max(0, Math.min(this.w - 1, Math.round((k + 0.5) * cell - this.scroll)));
      const lake = this.lake[col];
      if (lake < 0.35 || hash(seed) > lake * 0.32) continue;
      const lx = (k + hash(seed + 1)) * cell;
      const sx = lx - this.scroll;
      const sprite = set.reeds[Math.floor(hash(seed + 2) * set.reeds.length)];
      const baseY = this.shore[Math.max(0, Math.min(this.w - 1, Math.round(sx)))] - 1 - Math.round(hash(seed + 3) * 6);
      out.push(this.plantStanding(sprite, sx, baseY, lx, time, SWAY.reed, false));
    }
  }

  /** Ferns and woodland mushroom clusters growing across the floor of the Old Wood. */
  private plantOldWoodFloor(time: number, out: Standing[]): void {
    const set = this.plants?.near;
    if (!set || this.maxOldWood < 0.2) return;
    const n = BIOMES.length;
    const cell = 18;
    const first = Math.floor((this.scroll - 20) / cell);
    const last = Math.ceil((this.scroll + this.w + 20) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 5297 + 13;
      const col = Math.max(0, Math.min(this.w - 1, Math.round((k + 0.5) * cell - this.scroll)));
      const oldWood = this.shares[col * n + OLD_WOOD_BIOME];
      if (oldWood < 0.25 || hash(seed) > oldWood * 0.65) continue;
      const lx = (k + hash(seed + 1)) * cell;
      const sx = lx - this.scroll;
      const isFern = hash(seed + 2) < 0.68;
      const list = isFern ? set.ferns : set.mushrooms;
      const sprite = list[Math.floor(hash(seed + 3) * list.length)];
      const baseY = Math.round(this.h * (NEAR_ROWS[0] + (NEAR_ROWS[1] - NEAR_ROWS[0]) * hash(seed + 4)));
      out.push(this.plantStanding(sprite, sx, baseY, lx, time, isFern ? SWAY.fern : SWAY.mushroom, false));
    }
  }

  /** Which kind of tree grows at a column, given a random number: first the country, then the kind within it. */
  private kindAt(col: number, r: number): TreeKind {
    const n = BIOMES.length;
    let upTo = 0;
    for (let i = 0; i < n; i++) {
      const share = this.shares[col * n + i];
      if (share <= 0) continue;
      upTo += share;
      if (r < upTo || i === n - 1) {
        const within = Math.min(0.999, (r - (upTo - share)) / share);
        let acc = 0;
        for (const [kind, part] of BIOMES[i].kinds) {
          acc += part;
          if (within < acc) return kind;
        }
        return BIOMES[i].kinds[0][0];
      }
    }
    return 'oak';
  }

  private paintStanding(L: CanvasRenderingContext2D, list: Standing[]): void {
    list.sort((a, b) => a.y - b.y);
    for (const s of list) s.paint(L);
  }

  /** The lake's water, the grass with its shore, and the texture of the grass moving at the speed of its distance. */
  private paintGround(L: CanvasRenderingContext2D, state: SkyState, time: number): void {
    const g = Math.round(this.h * GROUND);
    for (let x = 0; x < this.w; x++) {
      const block = this.blocks[x >> 3];
      const shore = this.shore[x];
      if (this.lake[x] > 0.04) {
        const top = g - Math.round(this.lake[x] * LAKE_RISE * this.h);
        const half = Math.ceil((shore - top) * 0.5);
        L.fillStyle = block.waterTop;
        L.fillRect(x, top, 1, half);
        L.fillStyle = block.waterDeep;
        L.fillRect(x, top + half, 1, shore - top - half);
      }
      L.fillStyle = block.grass;
      L.fillRect(x, shore, 1, this.h - shore);
      L.fillStyle = this.lake[x] > 0.1 ? SAND : block.grassLight;
      L.fillRect(x, shore, 1, 2);
    }
    this.paintGlints(L, state, time, g);
    const span = this.h - g;
    for (let r = g + 4; r < this.h; r += 3) {
      const depth = (r - g) / span;
      const speed = 0.55 + 0.9 * depth;
      const spacing = 11 + 20 * depth;
      const length = 1 + Math.round(2 * depth);
      const offset = this.scroll * speed;
      for (let j = Math.floor(offset / spacing) - 1; j * spacing - offset < this.w; j++) {
        const seed = r * 131 + j;
        if (hash(seed) < 0.35) continue;
        const x = Math.round((j + hash(seed + 0.7)) * spacing - offset);
        if (x < 0 || x >= this.w || r < this.shore[x] + 2) continue;
        const block = this.blocks[x >> 3];
        L.fillStyle = hash(seed + 0.3) < 0.5 ? block.dark : block.grassLight;
        L.fillRect(x, r, length, 1);
      }
    }
  }

  /** Low drifting mist bands hugging the Old Wood floor. */
  private paintOldWoodFog(L: CanvasRenderingContext2D, time: number): void {
    if (this.maxOldWood < 0.06) return;
    const n = BIOMES.length;
    const bands = [
      { row: 0.705, h: 3, drift: 4, alpha: 0.16, scale: 0.021 },
      { row: 0.755, h: 4, drift: -6, alpha: 0.2, scale: 0.017 },
      { row: 0.805, h: 4, drift: 7, alpha: 0.22, scale: 0.014 },
    ];
    for (const band of bands) {
      const baseY = Math.round(this.h * band.row);
      for (let x = 0; x < this.w; x += BLOCK) {
        const col = Math.min(this.w - 1, x + BLOCK / 2);
        const ow = this.shares[col * n + OLD_WOOD_BIOME];
        if (ow < 0.05) continue;
        const sample = (this.scroll + x + time * band.drift) * band.scale;
        const density = Math.max(0, fbm(sample) - 0.32) * 1.4;
        if (density < 0.08) continue;
        const a = Math.min(0.28, band.alpha * ow * density);
        const y = baseY + Math.round(Math.sin(sample * 1.8) * 1.5);
        L.fillStyle = `rgba(182,204,196,${a.toFixed(3)})`;
        L.fillRect(x, y, BLOCK, band.h);
      }
    }
  }

  /** Light glinting on the lake. */
  private paintGlints(L: CanvasRenderingContext2D, state: SkyState, time: number, g: number): void {
    L.fillStyle = css(mix(state.sky.horizon, WHITE, 0.5), 0.7);
    for (let q = 0; q < 46; q++) {
      const pulse = Math.max(0, Math.sin(time * (0.8 + hash(q) * 1.4) + hash(q + 9) * 6.28));
      if (pulse < 0.5) continue;
      const x = (((hash(q + 3) * this.w * 1.3 - this.scroll * 0.9) % this.w) + this.w) % this.w | 0;
      const lake = this.lake[x];
      if (lake < 0.4) continue;
      const top = g - Math.round(lake * LAKE_RISE * this.h);
      const y = top + Math.round(hash(q + 5) * (this.shore[x] - top - 2));
      L.fillRect(x, y, 2 + Math.round(hash(q + 7) * 3), 1);
    }
  }

  /** Wildflowers dotted over the meadow grass, near ones bigger. */
  private paintFlowers(L: CanvasRenderingContext2D): void {
    const n = BIOMES.length;
    const cell = 9;
    const first = Math.floor(this.scroll / cell) - 1;
    const last = Math.ceil((this.scroll + this.w) / cell);
    const top = Math.round(this.h * GROUND);
    for (let k = first; k <= last; k++) {
      const seed = k * 3571 + 1;
      const sx = (k + hash(seed)) * cell - this.scroll;
      const col = Math.round(sx);
      if (col < 0 || col >= this.w) continue;
      if (hash(seed + 1) > blendNumber(this.shares, col * n, (b) => b.flowerDensity)) continue;
      const y = top + 6 + Math.round(hash(seed + 2) * (this.h * 0.8 - top - 8));
      if (y < this.shore[col] + 3) continue;
      const biome = this.dominant(col);
      if (!biome.flowers.length) continue;
      const c = biome.flowers[Math.floor(hash(seed + 3) * biome.flowers.length)];
      L.fillStyle = 'rgb(60,110,48)';
      L.fillRect(col, y + 1, 1, 1);
      L.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      L.fillRect(col, y, 1, 1);
      if (y > this.h * 0.72) {
        L.fillRect(col - 1, y, 1, 1);
        L.fillRect(col + 1, y, 1, 1);
        L.fillRect(col, y - 1, 1, 1);
        L.fillStyle = 'rgb(250,214,72)';
        L.fillRect(col, y, 1, 1);
      }
    }
  }

  private dominant(col: number): Biome {
    const n = BIOMES.length;
    let best = 0;
    for (let i = 1; i < n; i++) if (this.shares[col * n + i] > this.shares[col * n + best]) best = i;
    return BIOMES[best];
  }

  /** Grass in the foreground, passing faster than anything else and bending most in the wind. */
  private paintTufts(L: CanvasRenderingContext2D, time: number): void {
    const set = this.plants?.near;
    if (!set) return;
    const cell = 22;
    const speed = 1.35;
    const first = Math.floor((this.scroll * speed - 20) / cell);
    const last = Math.ceil((this.scroll * speed + this.w + 20) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 6143 + 3;
      const lx = (k + hash(seed)) * cell;
      const sx = lx - this.scroll * speed;
      const col = Math.max(0, Math.min(this.w - 1, Math.round(sx)));
      if (this.lake[col] > 0.3 || hash(seed + 1) > 0.75) continue;
      const biome = BIOMES.indexOf(this.dominant(col));
      const variants = set.tufts[biome];
      const sprite = variants[Math.floor(hash(seed + 2) * variants.length)];
      drawSwaying(
        L,
        sprite,
        Math.round(sx - sprite.w / 2),
        Math.round(this.h * TUFT_BASE),
        wind(time * 1.3, lx) * sprite.h * SWAY.tuft,
      );
    }
  }

  /** How many butterflies are about: they like the sun, and the meadow most (indices 0..2). */
  private butterflyPresence(state: SkyState): number {
    const o = Math.floor(this.w / 2) * BIOMES.length;
    const open = this.shares[o + 1] + 0.5 * this.shares[o + 2] + 0.25 * this.shares[o];
    return clamp01(state.day * 1.4 - 0.4) * Math.min(1, open);
  }

  /** Dims and colours everything on the land to the hour: dark and blue at night, gold near sunset. */
  private tintLand(L: CanvasRenderingContext2D, state: SkyState): void {
    const { sky, sun, day } = state;
    const night = 1 - day;
    L.save();
    L.globalCompositeOperation = 'source-atop';
    if (night > 0.02) {
      L.fillStyle = css([8, 14, 44], 0.55 * night);
      L.fillRect(0, 0, this.w, this.h);
      L.fillStyle = css([40, 70, 150], 0.16 * night);
      L.fillRect(0, 0, this.w, this.h);
    }
    const low = clamp01(1 - sun.up / 0.55) * day;
    if (low > 0.02) {
      L.fillStyle = css(sky.light, 0.26 * low);
      L.fillRect(0, 0, this.w, this.h);
    }
    L.restore();
  }
}
