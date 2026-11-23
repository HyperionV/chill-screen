import { css, type RGB } from '../../../../render/color';
import { ditherIndex, PixelGrid, type Sprite } from '../sprites-base';

const ORIGIN = 0;
const PIXEL = 1;
const HALF = 0.5;
const DIAMETER = 2;
const FULL_TURN = Math.PI * DIAMETER;

// The wall is thick enough to hold windows even on the small station in the last chapter.
const RIM_ASPECT = 0.62;
const RIM_DEPTH_SHARE = 0.17;
const MIN_RIM_DEPTH = 3;
const MAX_RIM_DEPTH_SHARE = 0.45;
const INNER_RAIL_GAP = 2;
const MAX_RAIL_GAP_SHARE = 0.12;
const HALF_RAIL_STROKE = 0.55;
const PANEL_COUNT = 24;
const PANEL_SEAM_SHARE = 0.055;
const SUNWARD_START = 0.12;
const RIM_WINDOW_DEPTH = 0.55;

const COOL_RIM: RGB = [57, 69, 91];
const COOL_PANEL: RGB = [70, 83, 103];
const WARM_RIM: RGB = [122, 95, 85];
const WARM_PANEL: RGB = [148, 119, 100];
const COOL_SEAM: RGB = [39, 47, 66];
const WARM_SEAM: RGB = [86, 66, 65];
const COOL_RAIL: RGB = [91, 106, 126];
const WARM_RAIL: RGB = [171, 135, 110];
const COOL_EDGE: RGB = [92, 108, 135];
const WARM_EDGE: RGB = [208, 165, 123];
const SPOKE_SHADOW = css(COOL_SEAM);
const SPOKE_COOL = css(COOL_RAIL);
const SPOKE_WARM = css(WARM_RAIL);
const RIM_GLINT = '#ffe2b8';

const ROTATION_SECONDS = 60;
const SPOKE_COUNT = 4;
const WINDOW_COUNT = 36;
const WINDOW_SPACING = 4;
const MIN_WINDOWS = 6;
const FAR_WINDOW_LIGHT = 0.34;
const NEAR_WINDOW_GAIN = 0.58;
const GLINT_BIAS = -0.22;
const GLINT_TRAVEL = 0.67;
const GLINT_HALF_WIDTH = 0.27;
const GLINT_STRENGTH = 0.8;
const NAV_SECONDS = 1.5;
const NAV_ON_SHARE = 0.22;
const NAV_HALO_RADIUS = 2;

// The slightly rising solar wings frame the hub and leave the collar clear.
const WING_REACH = 0.78;
const WING_RISE = -0.17;
const WING_PANEL_START = 0.32;
const WING_HALF_HEIGHT = 0.055;
const WING_CELL_WIDTH = 0.085;
const MIN_CELL_WIDTH = 2;
const HUB_HALF_WIDTH = 0.17;
const HUB_HALF_HEIGHT = 0.09;
const MIN_HUB_WIDTH = 2;
const HUB_BEVEL = 1.55;
const HUB_UNDERSIDE = 0.3;
const MAST_HEIGHT = 0.29;
const MAST_OFFSET = -0.045;
const MAST_CROSSBAR = 3;
const COLLAR_OFFSET_X = 0.235;
const COLLAR_OFFSET_Y = -0.042;
const COLLAR_HALF_WIDTH = 0.052;
const COLLAR_HALF_HEIGHT = 0.078;
const COLLAR_APERTURE = 0.58;
const DOCK_SLEEVE_HEIGHT = 3;
const MIN_HIT_RADIUS = 16;
const HIT_PADDING = 4;

const PANEL_FRAME: RGB = [37, 49, 69];
const PANEL_CELL: RGB = [55, 76, 105];
const PANEL_CELL_LIT: RGB = [77, 99, 126];
const HUB_METAL: RGB = [139, 143, 155];
const HUB_UNDER: RGB = [64, 71, 91];
const HUB_TOP: RGB = [186, 186, 188];
const COLLAR_METAL: RGB = [178, 133, 107];
const COLLAR_LIP: RGB = [241, 200, 153];
const COLLAR_HOLE: RGB = [29, 34, 49];

// Glow sprites share a solid core, a mid ring and a thin dithered falloff.
const WINDOW_CORE: RGB = [255, 229, 177];
const WINDOW_HALO: RGB = [237, 148, 78];
const RED_CORE: RGB = [255, 138, 118];
const RED_HALO: RGB = [212, 68, 64];
const GREEN_CORE: RGB = [178, 249, 192];
const GREEN_HALO: RGB = [77, 183, 113];
const MIN_GLOW_RADIUS = 2;
const WINDOW_GLOW_SHARE = 0.1;
const MAX_WINDOW_GLOW = 4;
const MID_GLOW_ALPHA = 69;
const OUTER_GLOW_ALPHA = 27;
const DITHER_STEPS = 2;

const SHUTTLE_HEADINGS = 16;
const SHUTTLE_HALF_LENGTH = 5;
const SHUTTLE_MIN_SCALE = 0.52;
const HULL_HALF_HEIGHT = 1.55;
const HULL_NOSE_SLOPE = 0.69;
const HULL_TAIL_SLOPE = 0.9;
const HULL_TIP_HEIGHT = 0.36;
const HULL_SHADE_START = 0.58;
const HULL_BRIGHT_NOSE = 4;
const SHUTTLE_WING_START = -3.75;
const SHUTTLE_WING_END = 1.2;
const SHUTTLE_WING_SPAN = 3.05;
const SHUTTLE_WING_SWEEP = 0.82;
const SHUTTLE_WING_EDGE = 0.85;
const CANOPY_START = 1.3;
const CANOPY_END = 3.65;
const CANOPY_HALF_HEIGHT = 0.86;
const CANOPY_GLINT_X = 2.45;
const CANOPY_GLINT_Y = -0.3;
const ENGINE_OFFSET = 5.4;
const ENGINE_GLOW_RADIUS = 2;
const ENGINE_PULSE_BASE = 0.71;
const ENGINE_PULSE_GAIN = 0.2;
const ENGINE_SECONDS = 1;
const SHIP_RIM: RGB = [225, 234, 242];
const SHIP_HULL: RGB = [174, 188, 203];
const SHIP_UNDER: RGB = [76, 91, 116];
const SHIP_WING: RGB = [111, 127, 149];
const CANOPY_GLASS: RGB = [62, 112, 152];
const CANOPY_GLINT: RGB = [180, 223, 245];
const ENGINE_CORE: RGB = [255, 210, 147];
const ENGINE_HALO: RGB = [230, 125, 66];

type RimEdgePixel = { x: number; y: number; angle: number };
type ShuttleHeading = { hull: Sprite; engineX: number; engineY: number };

function centeredGrid(radius: number): PixelGrid {
  const size = radius * DIAMETER + PIXEL;
  return new PixelGrid(size, size);
}

function buildGlow(radius: number, core: RGB, halo: RGB): Sprite {
  const grid = centeredGrid(radius);
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const distance = Math.hypot(x, y);
      if (distance === ORIGIN) {
        grid.set(radius + x, radius + y, core);
      } else if (distance <= radius * HALF) {
        grid.set(radius + x, radius + y, halo, MID_GLOW_ALPHA);
      } else if (distance <= radius) {
        const fade = (PIXEL - distance / radius) / HALF;
        if (ditherIndex(x, y, fade, DITHER_STEPS) > ORIGIN) {
          grid.set(radius + x, radius + y, halo, OUTER_GLOW_ALPHA);
        }
      }
    }
  }
  return grid.toSprite();
}

function buildRim(
  center: number, radius: number, depth: number, railGap: number, litEdge: RimEdgePixel[],
): Sprite {
  const grid = centeredGrid(center);
  const halfHeight = Math.ceil(radius * RIM_ASPECT);
  for (let y = -halfHeight; y <= halfHeight; y++) {
    const flattenedY = y / RIM_ASPECT;
    for (let x = -center; x <= center; x++) {
      const radial = Math.hypot(x, flattenedY);
      const inset = radius - radial;
      if (radial === ORIGIN || inset < ORIGIN) continue;
      const nextToRail = inset - depth - railGap;
      // Convert the radial depth into screen pixels so the edge stays thin around the ellipse.
      const screenScale = radial / Math.hypot(x, flattenedY / RIM_ASPECT);
      const sunward = x > radial * SUNWARD_START;
      if (inset <= depth) {
        const angle = Math.atan2(flattenedY, x);
        const panel = ((angle + FULL_TURN) % FULL_TURN) * PANEL_COUNT / FULL_TURN + HALF;
        const seam = Math.abs(panel - Math.round(panel)) < PANEL_SEAM_SHARE;
        const alternate = Math.floor(panel) % DIAMETER === ORIGIN;
        let color = sunward ? (alternate ? WARM_PANEL : WARM_RIM) : (alternate ? COOL_PANEL : COOL_RIM);
        if (inset * screenScale < PIXEL) {
          color = sunward ? WARM_EDGE : COOL_EDGE;
          if (sunward) litEdge.push({ x, y, angle });
        } else if (seam) {
          color = sunward ? WARM_SEAM : COOL_SEAM;
        }
        grid.set(center + x, center + y, color);
      } else if (Math.abs(nextToRail) * screenScale < HALF_RAIL_STROKE) {
        grid.set(center + x, center + y, sunward ? WARM_RAIL : COOL_RAIL);
      }
    }
  }
  return grid.toSprite();
}

function buildHub(center: number, radius: number, tip: number, dockX: number, dockY: number): Sprite {
  const grid = centeredGrid(center);
  const panelStart = Math.max(PIXEL, Math.round(radius * WING_PANEL_START));
  const panelHeight = Math.max(PIXEL, Math.round(radius * WING_HALF_HEIGHT));
  const cellWidth = Math.max(MIN_CELL_WIDTH, Math.round(radius * WING_CELL_WIDTH));
  for (let x = -tip; x <= tip; x++) {
    const column = Math.abs(x);
    const y = center + Math.round(x * WING_RISE);
    if (column < panelStart) {
      grid.set(center + x, y, COOL_RAIL);
      continue;
    }
    for (let row = -panelHeight; row <= panelHeight; row++) {
      const border = Math.abs(row) === panelHeight || column === tip;
      const seam = (column - panelStart) % cellWidth === ORIGIN || row === ORIGIN && panelHeight > PIXEL;
      grid.set(center + x, y + row, border || seam ? PANEL_FRAME : row < ORIGIN ? PANEL_CELL_LIT : PANEL_CELL);
    }
  }

  const hubX = Math.max(MIN_HUB_WIDTH, Math.round(radius * HUB_HALF_WIDTH));
  const hubY = Math.max(PIXEL, Math.round(radius * HUB_HALF_HEIGHT));
  const mastX = center + Math.round(radius * MAST_OFFSET);
  const mastY = center - Math.round(radius * MAST_HEIGHT);
  grid.fillRect(mastX, mastY, PIXEL, center - mastY, COOL_RAIL);
  grid.fillRect(mastX - PIXEL, mastY + PIXEL, MAST_CROSSBAR, PIXEL, HUB_METAL);
  grid.set(mastX, mastY, COLLAR_LIP);

  for (let y = -hubY; y <= hubY; y++) {
    for (let x = -hubX; x <= hubX; x++) {
      if (Math.abs(x) / hubX + Math.abs(y) / hubY > HUB_BEVEL) continue;
      const color = y > hubY * HUB_UNDERSIDE ? HUB_UNDER : y === -hubY ? HUB_TOP : HUB_METAL;
      grid.set(center + x, center + y, color);
    }
  }

  const collarX = Math.max(PIXEL, Math.round(radius * COLLAR_HALF_WIDTH));
  const collarY = Math.max(PIXEL, Math.round(radius * COLLAR_HALF_HEIGHT));
  grid.fillRect(center + hubX - PIXEL, center + dockY - PIXEL, dockX - hubX + DIAMETER, DOCK_SLEEVE_HEIGHT, COLLAR_METAL);
  for (let y = -collarY; y <= collarY; y++) {
    for (let x = -collarX; x <= collarX; x++) {
      const radial = Math.hypot(x / collarX, y / collarY);
      if (radial > PIXEL) continue;
      const color = radial < COLLAR_APERTURE ? COLLAR_HOLE : x < ORIGIN ? COLLAR_METAL : COLLAR_LIP;
      grid.set(center + dockX + x, center + dockY + y, color);
    }
  }
  return grid.toSprite();
}

function drawPixelLine(ctx: CanvasRenderingContext2D, x: number, y: number, endX: number, endY: number): void {
  const dx = endX - x;
  const dy = endY - y;
  const steps = Math.max(PIXEL, Math.abs(dx), Math.abs(dy));
  for (let step = ORIGIN; step <= steps; step++) {
    ctx.fillRect(x + Math.round(step * dx / steps), y + Math.round(step * dy / steps), PIXEL, PIXEL);
  }
}

function drawGlow(ctx: CanvasRenderingContext2D, glow: Sprite, x: number, y: number): void {
  ctx.drawImage(glow.canvas, x - (glow.w - PIXEL) * HALF, y - (glow.h - PIXEL) * HALF);
}

function navPulse(phase: number): number {
  return phase < NAV_ON_SHARE ? Math.sin(Math.PI * phase / NAV_ON_SHARE) : ORIGIN;
}

/** A slowly rotating ring station with a hub and spokes. */
export class Station {
  /** The offset from the station's centre where a ship docks. */
  readonly dock: { dx: number; dy: number };

  private readonly center: number;
  private readonly windowRadius: number;
  private readonly windowCount: number;
  private readonly wingTip: number;
  private readonly hitX: number;
  private readonly hitY: number;
  private readonly rim: Sprite;
  private readonly hub: Sprite;
  private readonly windowGlow: Sprite;
  private readonly redGlow: Sprite;
  private readonly greenGlow: Sprite;
  private readonly litEdge: RimEdgePixel[] = [];

  /** The ring radius is in stage pixels at design size. */
  constructor(unit: number, ringRadius: number) {
    const radius = Math.max(PIXEL, ringRadius * unit);
    const rimDepth = Math.min(radius * MAX_RIM_DEPTH_SHARE, Math.max(MIN_RIM_DEPTH, radius * RIM_DEPTH_SHARE));
    const railGap = Math.min(radius * MAX_RAIL_GAP_SHARE, INNER_RAIL_GAP * unit);
    const glowRadius = Math.max(MIN_GLOW_RADIUS, Math.round(Math.min(radius * WINDOW_GLOW_SHARE, MAX_WINDOW_GLOW * unit)));
    this.center = Math.ceil(radius) + glowRadius;
    this.dock = { dx: ringRadius * COLLAR_OFFSET_X * unit, dy: ringRadius * COLLAR_OFFSET_Y * unit };
    this.windowRadius = radius - rimDepth * RIM_WINDOW_DEPTH;
    // Keep nearby lights separate when the same design is drawn at a small radius.
    this.windowCount = Math.min(WINDOW_COUNT, Math.max(MIN_WINDOWS, Math.round(FULL_TURN * this.windowRadius / WINDOW_SPACING)));
    this.wingTip = Math.max(PIXEL, Math.round(radius * WING_REACH));
    this.hitX = Math.max(MIN_HIT_RADIUS * unit, radius + HIT_PADDING * unit);
    this.hitY = Math.max(MIN_HIT_RADIUS * unit, radius * RIM_ASPECT + HIT_PADDING * unit);
    this.rim = buildRim(this.center, radius, rimDepth, railGap, this.litEdge);
    this.hub = buildHub(this.center, radius, this.wingTip, Math.round(this.dock.dx), Math.round(this.dock.dy));
    this.windowGlow = buildGlow(glowRadius, WINDOW_CORE, WINDOW_HALO);
    this.redGlow = buildGlow(NAV_HALO_RADIUS, RED_CORE, RED_HALO);
    this.greenGlow = buildGlow(NAV_HALO_RADIUS, GREEN_CORE, GREEN_HALO);
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, alpha: number): void {
    const x = Math.round(cx);
    const y = Math.round(cy);
    if (alpha <= ORIGIN || x + this.center < ORIGIN || y + this.center < ORIGIN ||
        x - this.center >= ctx.canvas.width || y - this.center >= ctx.canvas.height) return;

    const turn = (time % ROTATION_SECONDS) * FULL_TURN / ROTATION_SECONDS;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const opacity = ctx.globalAlpha * alpha;
    ctx.globalAlpha = opacity;
    for (let i = ORIGIN; i < SPOKE_COUNT; i++) {
      const angle = turn + i * FULL_TURN / SPOKE_COUNT;
      const dx = Math.round(this.windowRadius * Math.cos(angle));
      const dy = Math.round(this.windowRadius * RIM_ASPECT * Math.sin(angle));
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const shadowX = horizontal ? x : x - PIXEL;
      const shadowY = horizontal ? y + PIXEL : y;
      ctx.fillStyle = SPOKE_SHADOW;
      drawPixelLine(ctx, shadowX, shadowY, shadowX + dx, shadowY + dy);
      ctx.fillStyle = dx > ORIGIN ? SPOKE_WARM : SPOKE_COOL;
      drawPixelLine(ctx, x, y, x + dx, y + dy);
    }
    ctx.drawImage(this.rim.canvas, x - this.center, y - this.center);

    const gleam = GLINT_BIAS + GLINT_TRAVEL * Math.sin(turn);
    ctx.fillStyle = RIM_GLINT;
    for (let i = ORIGIN; i < this.litEdge.length; i++) {
      const pixel = this.litEdge[i];
      const distance = Math.abs(pixel.angle - gleam);
      if (distance >= GLINT_HALF_WIDTH) continue;
      ctx.globalAlpha = opacity * GLINT_STRENGTH * (PIXEL - distance / GLINT_HALF_WIDTH);
      ctx.fillRect(x + pixel.x, y + pixel.y, PIXEL, PIXEL);
    }

    for (let i = ORIGIN; i < this.windowCount; i++) {
      const angle = turn + i * FULL_TURN / this.windowCount;
      const sin = Math.sin(angle);
      const windowX = x + Math.round(this.windowRadius * Math.cos(angle));
      const windowY = y + Math.round(this.windowRadius * RIM_ASPECT * sin);
      ctx.globalAlpha = opacity * (FAR_WINDOW_LIGHT + NEAR_WINDOW_GAIN * (HALF + HALF * sin));
      drawGlow(ctx, this.windowGlow, windowX, windowY);
    }

    ctx.globalAlpha = opacity;
    ctx.drawImage(this.hub.canvas, x - this.center, y - this.center);
    const phase = ((time / NAV_SECONDS) % PIXEL + PIXEL) % PIXEL;
    this.drawNav(ctx, x, y, -this.wingTip, this.redGlow, opacity * navPulse(phase));
    this.drawNav(ctx, x, y, this.wingTip, this.greenGlow, opacity * navPulse((phase + HALF) % PIXEL));
    ctx.restore();
  }

  contains(x: number, y: number, cx: number, cy: number): boolean {
    return Math.hypot((x - Math.round(cx)) / this.hitX, (y - Math.round(cy)) / this.hitY) <= PIXEL;
  }

  private drawNav(ctx: CanvasRenderingContext2D, cx: number, cy: number, offset: number, glow: Sprite, alpha: number): void {
    if (alpha <= ORIGIN) return;
    ctx.globalAlpha = alpha;
    drawGlow(ctx, glow, cx + offset, cy + Math.round(offset * WING_RISE));
  }
}

function buildShuttleHeading(scale: number, center: number, angle: number): ShuttleHeading {
  const grid = centeredGrid(center);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Sample the hull in its own coordinates to keep each heading crisp with no gaps from rotating pixels.
  for (let y = -center; y <= center; y++) {
    for (let x = -center; x <= center; x++) {
      const along = (x * cos + y * sin) / scale;
      const across = (y * cos - x * sin) / scale;
      const span = Math.abs(across);
      if (along <= -SHUTTLE_HALF_LENGTH || along > SHUTTLE_HALF_LENGTH) continue;
      const hullHeight = Math.min(
        HULL_HALF_HEIGHT,
        (SHUTTLE_HALF_LENGTH - along) * HULL_NOSE_SLOPE + HULL_TIP_HEIGHT,
        (along + SHUTTLE_HALF_LENGTH) * HULL_TAIL_SLOPE + HULL_TIP_HEIGHT,
      );
      if (span <= hullHeight) {
        let color = SHIP_HULL;
        if (along >= CANOPY_START && along <= CANOPY_END && span < CANOPY_HALF_HEIGHT) color = CANOPY_GLASS;
        else if (along > HULL_BRIGHT_NOSE || across < -HULL_SHADE_START) color = SHIP_RIM;
        else if (across > HULL_SHADE_START) color = SHIP_UNDER;
        grid.set(center + x, center + y, color);
      } else if (along >= SHUTTLE_WING_START && along <= SHUTTLE_WING_END) {
        const wingSpan = Math.min(SHUTTLE_WING_SPAN, (SHUTTLE_WING_END - along) * SHUTTLE_WING_SWEEP);
        if (span <= wingSpan) {
          const edge = span > wingSpan - SHUTTLE_WING_EDGE;
          grid.set(center + x, center + y, edge && across < ORIGIN ? SHIP_RIM : SHIP_WING);
        }
      }
    }
  }
  grid.set(
    center + (CANOPY_GLINT_X * cos - CANOPY_GLINT_Y * sin) * scale,
    center + (CANOPY_GLINT_X * sin + CANOPY_GLINT_Y * cos) * scale,
    CANOPY_GLINT,
  );
  return {
    hull: grid.toSprite(),
    engineX: Math.round(-ENGINE_OFFSET * scale * cos),
    engineY: Math.round(-ENGINE_OFFSET * scale * sin),
  };
}

/** A tiny ship about ten stage pixels long, drawn at x, y and pointing along heading in radians. */
export class Shuttle {
  private readonly headings: ShuttleHeading[];
  private readonly center: number;
  private readonly engineGlow: Sprite;
  private readonly extent: number;

  constructor(unit: number) {
    const scale = Math.max(SHUTTLE_MIN_SCALE, unit);
    this.center = Math.ceil(SHUTTLE_HALF_LENGTH * scale);
    const glowRadius = Math.max(MIN_GLOW_RADIUS, Math.round(ENGINE_GLOW_RADIUS * scale));
    this.engineGlow = buildGlow(glowRadius, ENGINE_CORE, ENGINE_HALO);
    this.extent = Math.ceil(ENGINE_OFFSET * scale) + glowRadius;
    this.headings = Array.from({ length: SHUTTLE_HEADINGS }, (_, i) =>
      buildShuttleHeading(scale, this.center, i * FULL_TURN / SHUTTLE_HEADINGS),
    );
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, time: number, alpha: number): void {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (alpha <= ORIGIN || cx + this.extent < ORIGIN || cy + this.extent < ORIGIN ||
        cx - this.extent >= ctx.canvas.width || cy - this.extent >= ctx.canvas.height) return;

    const index = Math.round((heading % FULL_TURN) * SHUTTLE_HEADINGS / FULL_TURN);
    const sprite = this.headings[(index + SHUTTLE_HEADINGS) % SHUTTLE_HEADINGS];
    const pulse = ENGINE_PULSE_BASE + ENGINE_PULSE_GAIN * Math.sin((time % ENGINE_SECONDS) * FULL_TURN / ENGINE_SECONDS);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const opacity = ctx.globalAlpha * alpha;
    ctx.globalAlpha = opacity * pulse;
    drawGlow(ctx, this.engineGlow, cx + sprite.engineX, cy + sprite.engineY);
    ctx.globalAlpha = opacity;
    ctx.drawImage(sprite.hull.canvas, cx - this.center, cy - this.center);
    ctx.restore();
  }
}
