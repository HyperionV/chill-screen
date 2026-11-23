import type { RGB } from '../../../../render/color';
import { memoryCanvas } from '../../../../render/pixel-stage';
import { clamp, lerp, seededRandom } from '../../../../world/math';
import { ditherIndex, hash2, PixelGrid, type Sprite } from '../sprites-base';
import type { DeepRenderContext, DeepScene } from './deep-scene';
import { SpiralGalaxy, type GalaxyLook, type GalaxyPose } from './galaxy';

const PIXEL = 1;
const TAU = Math.PI + Math.PI;
const OPAQUE = 255;
const OPACITY_STEPS = 17;
const BINARY_DITHER_STEPS = 2;
const PAIR = 2;
const HALF = 0.5;
const MASK_COLOR: RGB = [0, 0, 0];

// The clock mask dims the galaxy's lower wisps, while the radio stays outside the lit limb.
const CLOCK = { left: 0.26, right: 0.74, top: 0.30, bottom: 0.56, feather: 0.055, shade: 0.82 };
const STORY = { left: 0.32, right: 0.68, top: 0.12, bottom: 0.17, feather: 0.032, shade: 0.49 };
// The far objects travel half as far as the foreground as chapters dissolve.
const FAR_SLIDE = 0.5;
const SKY_HEIGHT = 0.52;

const BIG_SPIRAL = { u: 0.72, v: 0.27, radius: 0.26, tilt: -0.5, squash: 0.5, period: 240, spin: 0.3, seed: 381 };
const SMALL_SPIRAL = { u: 0.52, v: 0.14, radius: 0.07, tilt: 0.68, squash: 0.69, period: -176, spin: 1.2, seed: 793 };
const BIG_LOOK: GalaxyLook = {
  core: [255, 243, 212], arm: [192, 182, 231], dust: [16, 12, 32],
  knotBlue: [145, 197, 255], knotPink: [251, 157, 213], halo: [114, 108, 172],
};
const SMALL_LOOK: GalaxyLook = {
  core: [255, 238, 205], arm: [165, 177, 225], dust: [20, 16, 34],
  knotBlue: [157, 205, 255], knotPink: [240, 171, 211], halo: [89, 108, 165],
};

// The limb rises into the lower pane near the left edge and fades as it reaches the radio.
const LIMB = {
  left: 0.90, end: 0.78, endU: 0.50, curvature: 6.5, fadeStart: 0.37, fadeEnd: 0.43, fadePower: 3,
  thickness: 2.5, minThickness: 2, maxThickness: 3, haloWidth: 25, haloOpacity: 0.40,
};
const LIMB_WHITE: RGB = [230, 245, 255];
const LIMB_BLUE: RGB = [135, 188, 240];
const HALO_BLUE: RGB = [101, 156, 221];
const SURFACE: readonly RGB[] = [[16, 25, 41], [26, 38, 56], [40, 53, 73], [57, 73, 96], [78, 99, 124]];
const CLOUDS = { base: 0.24, wave: 0.14, curl: 0.17, curlRate: 31, span: 22, fine: 0.075, fineRate: 67,
  slant: 8, grain: 0.14, seed: 31, scatteredLight: 0.22, scatterDepth: 25 };

const GIANT = { u: 0.20, v: 0.66, radius: 0.12, maxWidthShare: 0.18, baseSpeed: 0.68, wispSpeed: -1.15,
  swirlSeconds: 3, boost: 9 };
const BAND_COLORS: readonly RGB[] = [
  [51, 79, 126], [77, 108, 156], [119, 150, 186], [171, 185, 190], [213, 205, 176], [241, 223, 187],
];
const BAND = { breadth: 0.18, sweep: 0.11, warp: 0.032, curl: 0.018, mainRate: 15, broadRate: 8,
  fineRate: 36, broadWeight: 0.22, fineWeight: 0.15, grain: 0.10, seed: 817, tone: 0.57 };
const WISPS = { warp: 0.14, fineRate: 53, mainRate: 24, grain: 0.19, threshold: 0.55, seed: 362, opacity: 0.55 };
const LIGHT = { x: 0.52, y: -0.47, z: 0.71, softness: 0.76, maxShade: 0.85, crescent: -0.26,
  crescentShade: 0.92, rimWidth: 1.7, rimStart: 0.27, rimOpacity: 0.54 };
const NIGHT: RGB = [10, 18, 40];
const RIM: RGB = [198, 226, 252];
const MOON = { period: 70, start: 0.065, crossing: 0.19, latitude: 0.26, slope: 0.25, span: 0.92, radius: 1.25 };
const MOON_BODY: RGB = [137, 160, 184];
const MOON_LIGHT: RGB = [224, 232, 228];

const STAR_POSITIONS: readonly (readonly [number, number])[] = [
  [0.08, 0.11], [0.90, 0.35], [0.15, 0.30], [0.66, 0.07], [0.87, 0.12], [0.25, 0.19], [0.80, 0.45],
  [0.04, 0.45], [0.94, 0.53], [0.42, 0.055], [0.22, 0.39], [0.96, 0.22], [0.07, 0.64], [0.83, 0.62],
];
const STAR = { seconds: 3, idleAlpha: 0.46, idleRayAlpha: 0.21, peakRayAlpha: 0.56, extraRay: 0.5 };
const WARM_STAR = '#fff1d5';
const COOL_STAR = '#c8e4ff';
const STAR_RAY = '#c2d5f6';
const COMET = { period: 60, initial: 0.27, startU: -0.05, endU: 0.28, startV: 0.075, endV: 0.235,
  tail: 13, slope: 0.32, opacity: 0.72 };
const COMET_TAIL = '#8cbbe7';
const MOTES = { count: 8, seed: 490, left: 0.03, right: 0.79, width: 0.18, top: 0.18, height: 0.47,
  rate: 0.13, travel: 3, opacity: 0.24 };
const MOTE_COLOR = '#7d9ac2';
const FLASH = { seconds: 1.05, size: 0.14, halo: 0.54 };
const RIPPLE = { seconds: 2.8, start: 0.045, end: 0.94, opacity: 0.69, color: '#d4e1ff' };

interface GalaxyBody {
  picture: SpiralGalaxy;
  pose: GalaxyPose;
  flare: Sprite;
  radius: number;
  homeX: number;
  x: number;
  y: number;
  spin: number;
  spinRate: number;
  cosTilt: number;
  sinTilt: number;
  rippleAge: number;
}

interface BandedGiant {
  buffer: ReturnType<typeof memoryCanvas>;
  base: Sprite;
  wisps: Sprite;
  light: Sprite;
  disc: Path2D;
  moon: Sprite;
  moonOffset: number;
  radius: number;
  diameter: number;
  homeX: number;
  restingY: number;
  x: number;
  y: number;
  baseOffset: number;
  wispOffset: number;
}

interface ChapterLayout {
  limb: Sprite;
  limbY: number;
  big: GalaxyBody;
  small: GalaxyBody;
  sky: ReturnType<typeof memoryCanvas>;
  skyShade: Sprite;
  giant: BandedGiant;
}

function limbRow(u: number, h: number): number {
  const span = 1 - u / LIMB.endU;
  return Math.round(h * lerp(LIMB.end, LIMB.left, span ** LIMB.curvature));
}

function buildLimb(w: number, h: number, unit: number): { sprite: Sprite; top: number } {
  const width = Math.max(PIXEL, Math.ceil(w * LIMB.fadeEnd));
  const haloWidth = Math.max(PIXEL, Math.round(LIMB.haloWidth * unit));
  const lineWidth = clamp(Math.round(LIMB.thickness * unit), LIMB.minThickness, LIMB.maxThickness);
  const top = Math.max(0, Math.floor(h * LIMB.end) - haloWidth);
  const grid = new PixelGrid(width, Math.max(PIXEL, h - top));

  for (let x = 0; x < grid.w; x++) {
    const u = x / w;
    const horizon = limbRow(u, h) - top;
    const fade = clamp((LIMB.fadeEnd - u) / (LIMB.fadeEnd - LIMB.fadeStart), 0, 1) ** LIMB.fadePower;
    const curl = Math.sin(u * CLOUDS.curlRate) * CLOUDS.curl;
    for (let y = Math.max(0, horizon - haloWidth); y < grid.h; y++) {
      const depth = y - horizon;
      if (depth < 0) {
        const falloff = 1 + depth / haloWidth;
        const glow = falloff * falloff * fade * LIMB.haloOpacity;
        const alpha = ditherIndex(x, y, glow, OPACITY_STEPS) / (OPACITY_STEPS - 1);
        if (alpha > 0) grid.set(x, y, HALO_BLUE, OPAQUE * alpha);
      } else if (depth < lineWidth) {
        grid.set(x, y, depth === 0 ? LIMB_WHITE : LIMB_BLUE, OPAQUE * fade);
      } else {
        const v = depth / h;
        const cloud = Math.sin(v * CLOUDS.span + curl + u * CLOUDS.slant) * CLOUDS.wave
          + Math.sin(v * CLOUDS.fineRate - curl + u * CLOUDS.curlRate) * CLOUDS.fine
          + hash2(x, y, CLOUDS.seed) * CLOUDS.grain;
        const nearLimb = CLOUDS.scatteredLight * Math.exp(-depth / (unit * CLOUDS.scatterDepth));
        const tone = ditherIndex(x, y, CLOUDS.base + cloud + nearLimb, SURFACE.length);
        grid.set(x, y, SURFACE[tone], OPAQUE * fade);
      }
    }
  }
  return { sprite: grid.toSprite(), top };
}

function buildGiant(w: number, h: number, unit: number): BandedGiant {
  const radius = Math.max(PIXEL, Math.round(Math.min(h * GIANT.radius, w * GIANT.maxWidthShare)));
  const diameter = radius + radius + PIXEL;
  const tileWidth = diameter + diameter;
  const base = new PixelGrid(tileWidth, diameter);
  const wisps = new PixelGrid(tileWidth, diameter);
  const light = new PixelGrid(diameter, diameter);
  const disc = new Path2D();
  const rimWidth = Math.max(PIXEL, Math.round(LIGHT.rimWidth * unit));

  for (let y = 0; y < diameter; y++) {
    const dy = (y - radius) / radius;
    for (let x = 0; x < tileWidth; x++) {
      const tileX = x % diameter;
      const longitude = tileX / diameter * TAU;
      const grain = hash2(tileX, y, BAND.seed) - HALF;
      const latitude = dy + BAND.warp * Math.sin(longitude + dy * BAND.broadRate)
        + BAND.curl * Math.sin(longitude + longitude - dy * BAND.mainRate);
      const bands = BAND.tone + BAND.breadth * Math.sin(latitude * BAND.mainRate)
        + BAND.broadWeight * Math.cos(latitude * BAND.broadRate) + BAND.fineWeight * Math.sin(latitude * BAND.fineRate)
        + BAND.grain * grain;
      base.set(x, y, BAND_COLORS[ditherIndex(tileX, y, bands, BAND_COLORS.length)]);

      const wispLat = dy + WISPS.warp * Math.sin(longitude) * Math.cos(dy * BAND.broadRate);
      const filaments = Math.sin(wispLat * WISPS.mainRate + Math.cos(longitude) * BAND.sweep)
        + Math.sin(wispLat * WISPS.fineRate) * BAND.broadWeight + hash2(tileX, y, WISPS.seed) * WISPS.grain;
      const opacity = ditherIndex(tileX, y, (filaments - WISPS.threshold) * WISPS.opacity, OPACITY_STEPS);
      if (opacity > 0) wisps.set(x, y, RIM, OPAQUE * opacity / (OPACITY_STEPS - 1));
    }

    const row = y - radius;
    const half = Math.floor(Math.sqrt(radius * radius - row * row));
    disc.rect(radius - half, y, half + half + PIXEL, PIXEL);
    for (let x = radius - half; x <= radius + half; x++) {
      const dx = (x - radius) / radius;
      const distance = Math.hypot(dx, dy);
      const z = Math.sqrt(Math.max(0, 1 - distance * distance));
      const sun = dx * LIGHT.x + dy * LIGHT.y + z * LIGHT.z;
      const rim = distance >= 1 - rimWidth / radius && sun > LIGHT.rimStart;
      const shade = sun < LIGHT.crescent ? LIGHT.crescentShade : LIGHT.maxShade * (1 - clamp(sun / LIGHT.softness, 0, 1));
      const amount = rim ? LIGHT.rimOpacity * clamp(sun, 0, 1) : shade;
      const opacity = ditherIndex(x, y, amount, OPACITY_STEPS) / (OPACITY_STEPS - 1);
      light.set(x, y, rim ? RIM : NIGHT, OPAQUE * opacity);
    }
  }

  const moonRadius = Math.max(PIXEL, Math.round(unit * MOON.radius));
  const moon = new PixelGrid(moonRadius + moonRadius + PIXEL, moonRadius + moonRadius + PIXEL);
  moon.disc(moonRadius, moonRadius, moonRadius, MOON_BODY);
  moon.set(moonRadius, moonRadius - PIXEL, MOON_LIGHT);
  moon.set(moonRadius + PIXEL, moonRadius, MOON_LIGHT);

  const homeX = Math.round(w * GIANT.u);
  const restingY = Math.max(Math.round(h * GIANT.v), limbRow(homeX / w, h) - radius + PIXEL);
  return { buffer: memoryCanvas(diameter, diameter), base: base.toSprite(), wisps: wisps.toSprite(),
    light: light.toSprite(), disc, moon: moon.toSprite(), moonOffset: moonRadius, radius, diameter,
    homeX, restingY, x: homeX, y: giantY(w, h, homeX, radius, restingY), baseOffset: -PIXEL, wispOffset: -PIXEL };
}

function giantY(w: number, h: number, x: number, radius: number, restingY: number): number {
  // Lower the disc only as far as needed to clear the clock on narrow stages.
  const distance = Math.max(0, Math.floor(w * CLOCK.left - x));
  if (distance > radius) return restingY;
  const overlap = Math.sqrt(radius * radius - distance * distance);
  return Math.max(restingY, Math.ceil(h * CLOCK.bottom + overlap));
}

function rebuildGiant(giant: BandedGiant, baseOffset: number, wispOffset: number): void {
  if (baseOffset === giant.baseOffset && wispOffset === giant.wispOffset) return;
  giant.baseOffset = baseOffset;
  giant.wispOffset = wispOffset;
  const { ctx } = giant.buffer;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.clip(giant.disc);
  ctx.drawImage(giant.base.canvas, -baseOffset, 0);
  ctx.drawImage(giant.wisps.canvas, -wispOffset, 0);
  ctx.drawImage(giant.light.canvas, 0, 0);
  ctx.restore();
}

function buildGalaxy(w: number, h: number, unit: number, design: typeof BIG_SPIRAL, look: GalaxyLook): GalaxyBody {
  const radius = Math.max(PIXEL, Math.round(h * design.radius));
  const flareRadius = Math.max(PIXEL, Math.round(radius * FLASH.size));
  const size = flareRadius + flareRadius + PIXEL;
  const flare = new PixelGrid(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - flareRadius, y - flareRadius) / flareRadius;
      if (distance >= 1) continue;
      const falloff = 1 - distance;
      const glow = x === flareRadius || y === flareRadius ? falloff : FLASH.halo * falloff * falloff;
      const opacity = ditherIndex(x, y, glow, OPACITY_STEPS) / (OPACITY_STEPS - 1);
      if (opacity > 0) flare.set(x, y, look.core, OPAQUE * opacity);
    }
  }
  const homeX = w * design.u;
  return { picture: new SpiralGalaxy(unit, radius / unit, look, design.seed),
    pose: { spin: design.spin, tilt: design.tilt, squash: design.squash, alpha: 1 }, flare: flare.toSprite(), radius,
    homeX, x: Math.round(homeX), y: Math.round(h * design.v), spin: design.spin, spinRate: TAU / design.period,
    cosTilt: Math.cos(design.tilt), sinTilt: Math.sin(design.tilt), rippleAge: RIPPLE.seconds };
}

function overlayShade(x: number, y: number, area: typeof CLOCK): number {
  const edge = Math.min(x - area.left, area.right - x, y - area.top, area.bottom - y);
  return clamp(1 + edge / area.feather, 0, 1) * area.shade;
}

function buildSkyShade(w: number, h: number, height: number): Sprite {
  const grid = new PixelGrid(w, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < w; x++) {
      const shade = Math.max(overlayShade(x / w, y / h, CLOCK), overlayShade(x / w, y / h, STORY));
      if (shade > 0) grid.set(x, y, MASK_COLOR, OPAQUE * shade);
    }
  }
  return grid.toSprite();
}

function drawGalaxy(ctx: CanvasRenderingContext2D, galaxy: GalaxyBody, slide: number, elapsed: number): void {
  const { radius, y, pose, rippleAge } = galaxy;
  const x = Math.round(galaxy.homeX + slide);
  galaxy.x = x;
  pose.spin = (galaxy.spin + elapsed * galaxy.spinRate) % TAU;
  galaxy.picture.draw(ctx, x, y, pose);

  if (rippleAge >= RIPPLE.seconds) return;
  const progress = rippleAge / RIPPLE.seconds;
  const ringRadius = radius * lerp(RIPPLE.start, RIPPLE.end, progress);
  const count = Math.max(PIXEL, Math.ceil(TAU * ringRadius));
  ctx.fillStyle = RIPPLE.color;
  ctx.globalAlpha = RIPPLE.opacity * (1 - progress);
  for (let i = 0; i < count; i++) {
    const angle = i / count * TAU;
    const dx = Math.cos(angle) * ringRadius;
    const dy = Math.sin(angle) * ringRadius * pose.squash;
    const px = Math.round(x + dx * galaxy.cosTilt - dy * galaxy.sinTilt);
    const py = Math.round(y + dx * galaxy.sinTilt + dy * galaxy.cosTilt);
    if (ditherIndex(px, py, 1 - progress, BINARY_DITHER_STEPS) > 0) ctx.fillRect(px, py, PIXEL, PIXEL);
  }
  if (rippleAge < FLASH.seconds) {
    ctx.globalAlpha = Math.sin(Math.PI * rippleAge / FLASH.seconds);
    ctx.drawImage(galaxy.flare.canvas, x - Math.floor(galaxy.flare.w * HALF), y - Math.floor(galaxy.flare.h * HALF));
  }
  ctx.globalAlpha = 1;
}

function drawGiant(ctx: CanvasRenderingContext2D, giant: BandedGiant, elapsed: number): void {
  const { x, y, radius, moon, moonOffset } = giant;
  ctx.drawImage(giant.buffer.canvas, x - radius, y - radius);
  const phase = (elapsed / MOON.period + MOON.start) % 1;
  if (phase >= MOON.crossing) return;
  const crossing = phase / MOON.crossing;
  const dx = lerp(-MOON.span, MOON.span, crossing);
  const dy = MOON.latitude - MOON.slope * dx;
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha *= Math.sin(Math.PI * crossing);
  ctx.drawImage(moon.canvas, Math.round(x + dx * radius) - moonOffset, Math.round(y + dy * radius) - moonOffset);
  ctx.globalAlpha = alpha;
}

function drawSkyDetails(ctx: CanvasRenderingContext2D, rc: DeepRenderContext, elapsed: number, motes: readonly number[]): void {
  const slide = rc.chapterSlide * FAR_SLIDE;
  const turn = elapsed / STAR.seconds;
  const active = Math.floor(turn) % STAR_POSITIONS.length;
  for (let i = 0; i < STAR_POSITIONS.length; i++) {
    const position = STAR_POSITIONS[i];
    const x = Math.round(position[0] * rc.w + slide);
    const y = Math.round(position[1] * rc.h);
    const pulse = i === active ? Math.sin(Math.PI * (turn % 1)) : 0;
    const ray = Math.max(PIXEL, Math.round(rc.unit * (1 + STAR.extraRay * pulse)));
    const rays = ray + ray + PIXEL;
    ctx.globalAlpha = rc.alpha * lerp(STAR.idleRayAlpha, STAR.peakRayAlpha, pulse);
    ctx.fillStyle = STAR_RAY;
    ctx.fillRect(x - ray, y, rays, PIXEL);
    ctx.fillRect(x, y - ray, PIXEL, rays);
    ctx.globalAlpha = rc.alpha * lerp(STAR.idleAlpha, 1, pulse);
    ctx.fillStyle = i % PAIR === 0 ? COOL_STAR : WARM_STAR;
    ctx.fillRect(x, y, PIXEL, PIXEL);
  }

  const progress = (elapsed / COMET.period + COMET.initial) % 1;
  const headX = Math.round(lerp(COMET.startU, COMET.endU, progress) * rc.w + slide);
  const headY = Math.round(lerp(COMET.startV, COMET.endV, progress) * rc.h);
  const life = Math.sin(Math.PI * progress);
  const length = Math.max(PIXEL, Math.round(COMET.tail * rc.unit));
  ctx.fillStyle = COMET_TAIL;
  for (let i = length; i > 0; i--) {
    const x = headX - i;
    const y = headY - Math.round(i * COMET.slope);
    const tail = 1 - i / length;
    if (x >= 0 && ditherIndex(x, y, tail, BINARY_DITHER_STEPS) > 0) {
      ctx.globalAlpha = rc.alpha * life * tail * COMET.opacity;
      ctx.fillRect(x, y, PIXEL, PIXEL);
    }
  }
  ctx.fillStyle = COOL_STAR;
  ctx.globalAlpha = rc.alpha * life;
  ctx.fillRect(headX, headY, PIXEL, PIXEL);

  ctx.fillStyle = MOTE_COLOR;
  ctx.globalAlpha = rc.alpha * MOTES.opacity;
  for (let i = 0; i < motes.length; i++) {
    const phase = motes[i];
    const side = i % PAIR === 0 ? MOTES.left : MOTES.right;
    const drift = Math.sin(elapsed * MOTES.rate + phase * TAU) * rc.unit * MOTES.travel;
    const x = Math.round((side + phase * MOTES.width) * rc.w + slide + drift);
    const y = Math.round((MOTES.top + motes[(i + PIXEL) % motes.length] * MOTES.height) * rc.h - drift);
    ctx.fillRect(x, y, PIXEL, PIXEL);
  }
}

function galaxyHit(galaxy: GalaxyBody, x: number, y: number): boolean {
  const dx = x - galaxy.x;
  const dy = y - galaxy.y;
  const along = dx * galaxy.cosTilt + dy * galaxy.sinTilt;
  const across = (-dx * galaxy.sinTilt + dy * galaxy.cosTilt) / galaxy.pose.squash;
  if (Math.hypot(along, across) > galaxy.radius) return false;
  galaxy.rippleAge = 0;
  return true;
}

/** Builds the Giant and Galaxy chapter, where the ship passes a giant planet and an old spiral. */
export function createGiantAndGalaxy(): DeepScene {
  let layout: ChapterLayout | null = null;
  let elapsed = 0;
  let swirl = 0;
  let basePhase = 0;
  let wispPhase = 0;
  const random = seededRandom(MOTES.seed);
  const motes = Array.from({ length: MOTES.count }, () => random());

  return {
    resize(w, h, unit) {
      if (w <= 0 || h <= 0 || unit <= 0) {
        layout = null;
        return;
      }
      const { sprite, top } = buildLimb(w, h, unit);
      const skyHeight = Math.max(PIXEL, Math.ceil(h * SKY_HEIGHT));
      layout = { limb: sprite, limbY: top, sky: memoryCanvas(w, skyHeight), skyShade: buildSkyShade(w, h, skyHeight),
        big: buildGalaxy(w, h, unit, BIG_SPIRAL, BIG_LOOK), small: buildGalaxy(w, h, unit, SMALL_SPIRAL, SMALL_LOOK),
        giant: buildGiant(w, h, unit) };
    },
    update(dt) {
      elapsed += dt;
      const boostedTime = Math.min(dt, swirl);
      swirl -= boostedTime;
      // Average the fading boost over this update so a frame that ends the swirl moves the right distance.
      const bandTime = dt + GIANT.boost * boostedTime * (swirl + boostedTime * HALF) / GIANT.swirlSeconds;
      basePhase += bandTime * GIANT.baseSpeed;
      wispPhase += bandTime * GIANT.wispSpeed;
      if (layout) {
        layout.big.rippleAge = Math.min(RIPPLE.seconds, layout.big.rippleAge + dt);
        layout.small.rippleAge = Math.min(RIPPLE.seconds, layout.small.rippleAge + dt);
      }
    },
    draw(ctx, rc) {
      if (!layout) return;
      const { big, small, sky, skyShade, limb, limbY, giant } = layout;
      const farSlide = rc.chapterSlide * FAR_SLIDE;
      sky.ctx.clearRect(0, 0, sky.canvas.width, sky.canvas.height);
      sky.ctx.imageSmoothingEnabled = false;
      drawGalaxy(sky.ctx, big, farSlide, elapsed);
      drawGalaxy(sky.ctx, small, farSlide, elapsed);
      sky.ctx.globalCompositeOperation = 'destination-out';
      sky.ctx.drawImage(skyShade.canvas, 0, 0);
      sky.ctx.globalCompositeOperation = 'source-over';

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = rc.alpha;
      ctx.drawImage(sky.canvas, 0, 0);
      drawSkyDetails(ctx, rc, elapsed, motes);

      const slide = Math.round(rc.chapterSlide);
      ctx.globalAlpha = rc.alpha;
      const { diameter } = giant;
      const baseOffset = ((Math.round(basePhase * rc.unit) % diameter) + diameter) % diameter;
      const wispOffset = ((Math.round(wispPhase * rc.unit) % diameter) + diameter) % diameter;
      rebuildGiant(giant, baseOffset, wispOffset);
      giant.x = giant.homeX + slide;
      giant.y = giantY(rc.w, rc.h, giant.x, giant.radius, giant.restingY);
      drawGiant(ctx, giant, elapsed);

      const limbWidth = Math.min(limb.w, Math.ceil(rc.w * LIMB.fadeEnd) - slide);
      if (limbWidth > 0) ctx.drawImage(limb.canvas, 0, 0, limbWidth, limb.h, slide, limbY, limbWidth, limb.h);
      ctx.restore();
    },
    press(x, y) {
      if (!layout) return false;
      const { giant, big, small } = layout;
      if (Math.hypot(x - giant.x, y - giant.y) <= giant.radius) {
        swirl = GIANT.swirlSeconds;
        return true;
      }
      return galaxyHit(small, x, y) || galaxyHit(big, x, y);
    },
  };
}
