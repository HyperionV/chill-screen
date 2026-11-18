import { css, mix, shade, type RGB } from '../../../render/color';
import { clamp, lerp } from '../../../world/math';
import { hash, noise } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import {
  ALPINE_COLORS,
  SCENE_ANCHORS,
  far1RidgeY,
  far2RidgeY,
  glacierProfile,
  macroTerrainY,
  midMacroY,
  midRidgeY,
  sceneTerrainY,
} from './scenes';
import { drawSwayingPlant, type AlpineSprites } from './sprites';

interface PropPlacement {
  u: number;
  v: number;
  kind: 'boulder' | 'shrub' | 'grass';
  variant: number;
}

const FOREGROUND_PROPS: readonly (readonly PropPlacement[])[] = [
  // Scene 0: Summit Sunrise (bottom corners framing the valley cloud sea, clear of radio)
  [
    { u: 0.05, v: 0.95, kind: 'boulder', variant: 1 },
    { u: 0.11, v: 0.91, kind: 'shrub', variant: 0 },
    { u: 0.16, v: 0.96, kind: 'grass', variant: 0 },
    { u: 0.23, v: 0.94, kind: 'boulder', variant: 2 },
    { u: 0.28, v: 0.97, kind: 'shrub', variant: 2 },
    { u: 0.34, v: 0.96, kind: 'grass', variant: 1 },
    { u: 0.67, v: 0.96, kind: 'grass', variant: 2 },
    { u: 0.72, v: 0.94, kind: 'shrub', variant: 1 },
    { u: 0.79, v: 0.96, kind: 'boulder', variant: 3 },
    { u: 0.87, v: 0.91, kind: 'shrub', variant: 0 },
    { u: 0.94, v: 0.95, kind: 'boulder', variant: 0 },
  ],
  // Scene 1: Glacier Valley (avoiding marmots at 0.165, 0.255, 0.675 and stream at 0.12..0.32)
  [
    { u: 0.04, v: 0.94, kind: 'boulder', variant: 0 },
    { u: 0.09, v: 0.97, kind: 'shrub', variant: 1 },
    { u: 0.21, v: 0.95, kind: 'grass', variant: 0 },
    { u: 0.31, v: 0.96, kind: 'boulder', variant: 3 },
    { u: 0.35, v: 0.94, kind: 'grass', variant: 2 },
    { u: 0.66, v: 0.95, kind: 'grass', variant: 1 },
    { u: 0.72, v: 0.91, kind: 'shrub', variant: 2 },
    { u: 0.78, v: 0.96, kind: 'boulder', variant: 2 },
    { u: 0.86, v: 0.92, kind: 'shrub', variant: 0 },
    { u: 0.93, v: 0.95, kind: 'boulder', variant: 1 },
  ],
  // Scene 2: Ridge Walk (rocky scree shelves below the cloud abyss)
  [
    { u: 0.05, v: 0.96, kind: 'boulder', variant: 1 },
    { u: 0.12, v: 0.93, kind: 'shrub', variant: 2 },
    { u: 0.19, v: 0.96, kind: 'boulder', variant: 3 },
    { u: 0.26, v: 0.94, kind: 'grass', variant: 0 },
    { u: 0.33, v: 0.97, kind: 'shrub', variant: 0 },
    { u: 0.67, v: 0.97, kind: 'grass', variant: 1 },
    { u: 0.74, v: 0.93, kind: 'boulder', variant: 2 },
    { u: 0.82, v: 0.96, kind: 'shrub', variant: 1 },
    { u: 0.90, v: 0.94, kind: 'grass', variant: 2 },
    { u: 0.95, v: 0.96, kind: 'boulder', variant: 0 },
  ],
  // Scene 3: Cable Car Col
  [
    { u: 0.05, v: 0.94, kind: 'boulder', variant: 0 },
    { u: 0.13, v: 0.96, kind: 'shrub', variant: 0 },
    { u: 0.24, v: 0.95, kind: 'grass', variant: 0 },
    { u: 0.33, v: 0.96, kind: 'boulder', variant: 3 },
    { u: 0.67, v: 0.96, kind: 'grass', variant: 2 },
    { u: 0.76, v: 0.94, kind: 'shrub', variant: 1 },
    { u: 0.85, v: 0.96, kind: 'boulder', variant: 2 },
    { u: 0.94, v: 0.94, kind: 'boulder', variant: 1 },
  ],
  // Scene 4: Starry Col (framing left of tent & right of hut, clear of trail)
  [
    { u: 0.04, v: 0.94, kind: 'boulder', variant: 1 },
    { u: 0.10, v: 0.91, kind: 'shrub', variant: 0 },
    { u: 0.17, v: 0.96, kind: 'grass', variant: 1 },
    { u: 0.26, v: 0.95, kind: 'boulder', variant: 3 },
    { u: 0.35, v: 0.96, kind: 'grass', variant: 0 },
    { u: 0.66, v: 0.96, kind: 'grass', variant: 2 },
    { u: 0.74, v: 0.95, kind: 'shrub', variant: 2 },
    { u: 0.83, v: 0.96, kind: 'boulder', variant: 2 },
    { u: 0.91, v: 0.92, kind: 'shrub', variant: 1 },
    { u: 0.96, v: 0.95, kind: 'boulder', variant: 0 },
  ],
];

/** Draws either far hazy range 1 (furthest, lightest) or far range 2 (closer, deeper blue-slate). */
export function drawFarRange(
  L: CanvasRenderingContext2D,
  layer: 1 | 2,
  scene: number,
  w: number,
  h: number,
  unit: number,
  state: SkyState,
  glow: number,
  sunRight: boolean,
): void {
  const { sky, day } = state;
  const alpenglowWarm = mix(ALPINE_COLORS.alpenglowOrange, ALPINE_COLORS.alpenglowPink, 0.45);
  const nightMix = (1 - day) * (1 - glow * 0.5);

  const hazeBase: RGB =
    layer === 1
      ? mix(mix(sky.horizon, [146, 178, 224], 0.52), [32, 46, 86], nightMix * 0.72)
      : mix(mix(sky.horizon, [92, 122, 174], 0.66), [22, 34, 68], nightMix * 0.78);

  const litRgb = mix(hazeBase, mix(ALPINE_COLORS.snowLit, alpenglowWarm, 0.75 * glow), layer === 1 ? 0.26 + 0.32 * glow : 0.32 + 0.44 * glow);
  const shadeRgb = mix(shade(hazeBase, layer === 1 ? 0.90 : 0.82), ALPINE_COLORS.alpenglowShadow, glow * (layer === 1 ? 0.34 : 0.52));
  const rimRgb = mix(litRgb, alpenglowWarm, 0.55 * glow);

  const litStyle = css(litRgb);
  const shadeStyle = css(shadeRgb);
  const rimStyle = css(rimRgb);

  const fn = layer === 1 ? far1RidgeY : far2RidgeY;
  const maxBot = Math.round(h * 0.84);

  for (let x = 0; x < w; x++) {
    const u = x / w;
    const yV = fn(scene, u);
    const top = Math.round(yV * h);
    if (top >= maxBot) continue;

    const slope = fn(scene, clamp(u + 0.014, 0, 1)) - fn(scene, clamp(u - 0.014, 0, 1));
    const lit = sunRight ? slope > 0.001 : slope < -0.001;
    L.fillStyle = lit ? litStyle : shadeStyle;
    L.fillRect(x, top, 1, maxBot - top);

    if (lit) {
      L.fillStyle = rimStyle;
      L.fillRect(x, top, 1, Math.max(1, Math.round(2 * unit)));
    }
  }
}

/** Draws the intermediate rocky/snowy alpine range behind the main peaks. */
export function drawMidRange(
  L: CanvasRenderingContext2D,
  scene: number,
  w: number,
  h: number,
  unit: number,
  state: SkyState,
  glow: number,
  sunRight: boolean,
): void {
  const alpenglowWarm = mix(ALPINE_COLORS.alpenglowOrange, ALPINE_COLORS.alpenglowPink, 0.4);
  const rockLit = css(mix(mix(ALPINE_COLORS.rockMid, state.sky.horizon, 0.24), alpenglowWarm, 0.36 * glow));
  const rockShade = css(mix(mix(ALPINE_COLORS.rockDark, state.sky.horizon, 0.22), ALPINE_COLORS.alpenglowDeep, 0.65 * glow));
  const snowLit = css(mix(mix(ALPINE_COLORS.snowLit, state.sky.horizon, 0.16), alpenglowWarm, 0.72 * glow));
  const snowShade = css(mix(mix(ALPINE_COLORS.snowShade, state.sky.horizon, 0.2), ALPINE_COLORS.alpenglowShadow, 0.78 * glow));

  const maxBot = Math.round(h * 0.86);

  for (let x = 0; x < w; x++) {
    const u = x / w;
    const top = Math.round(midRidgeY(scene, u) * h);
    if (top >= maxBot) continue;

    const slope = midMacroY(scene, clamp(u + 0.016, 0, 1)) - midMacroY(scene, clamp(u - 0.016, 0, 1));
    const lit = sunRight ? slope > 0.001 : slope < -0.001;

    L.fillStyle = lit ? rockLit : rockShade;
    L.fillRect(x, top, 1, maxBot - top);

    const snowThick = Math.round((3 + hash(Math.floor(u * 90) + scene * 13) * 4) * unit);
    L.fillStyle = lit ? snowLit : snowShade;
    L.fillRect(x, top, 1, snowThick);
  }
}

/** Draws main jagged alpine mountains with sunlit/shaded facets, vertical rock cracks, snow gullies, and ledges. */
export function drawMainTerrain(
  L: CanvasRenderingContext2D,
  scene: number,
  w: number,
  h: number,
  unit: number,
  time: number,
  state: SkyState,
  glow: number,
  sunRight: boolean,
  sprites: AlpineSprites,
): void {
  const alpenglowWarm = mix(ALPINE_COLORS.alpenglowOrange, ALPINE_COLORS.alpenglowPink, 0.42);
  const peakHighlight = mix([255, 255, 255], [255, 206, 158], glow);

  const snowLitCol = css(mix(ALPINE_COLORS.snowLit, alpenglowWarm, 0.82 * glow));
  const snowCrestCol = css(mix(ALPINE_COLORS.snowLit, peakHighlight, 0.5 + 0.4 * glow));
  const snowShadeCol = css(mix(mix(ALPINE_COLORS.snowShade, state.sky.horizon, 0.12), ALPINE_COLORS.alpenglowShadow, 0.86 * glow));
  const snowDeepCol = css(mix(ALPINE_COLORS.snowDeep, ALPINE_COLORS.alpenglowDeep, 0.88 * glow));
  const rockLitCol = css(mix(ALPINE_COLORS.rockLit, [178, 118, 108], 0.65 * glow));
  const rockLitMidCol = css(mix(ALPINE_COLORS.rockMid, [128, 86, 94], 0.55 * glow));
  const rockDarkCol = css(mix(ALPINE_COLORS.rockDark, ALPINE_COLORS.alpenglowDeep, 0.72 * glow));
  const rockCrackCol = css(mix(ALPINE_COLORS.rockCrack, [18, 20, 44], 0.7 * glow));
  const valleyCol = css(mix(ALPINE_COLORS.pineValley, state.sky.horizon, 0.2));

  for (let x = 0; x < w; x++) {
    const u = x / w;
    const ridgeV = sceneTerrainY(scene, u);
    const top = Math.round(ridgeV * h);
    const macroSlope = macroTerrainY(scene, clamp(u + 0.015, 0, 1)) - macroTerrainY(scene, clamp(u - 0.015, 0, 1));
    const ribShift = (hash(Math.floor(u * 26) + scene * 19) - 0.5) * 0.008;
    const litFace = sunRight ? macroSlope + ribShift > 0 : macroSlope + ribShift < 0;

    if (scene === 3) {
      const isValley = u > 0.16 && u < 0.72;
      L.fillStyle = isValley ? valleyCol : litFace ? rockLitCol : rockDarkCol;
      L.fillRect(x, top, 1, h - top);
      L.fillStyle = isValley ? snowShadeCol : litFace ? snowLitCol : snowShadeCol;
      L.fillRect(x, top, 1, Math.round((isValley ? 3 : 7) * unit));
      if (!isValley) {
        const crackH = hash(x * 0.37 + scene * 17);
        if (crackH > 0.74) {
          L.fillStyle = rockCrackCol;
          L.fillRect(x, top + Math.round(8 * unit), 1, Math.round((12 + crackH * 14) * unit));
        }
      }
      continue;
    }

    const colBottom = h;
    if (top >= colBottom) continue;

    // 1. Base vertical granite cliff face (lit granite vs deep shaded rock).
    const baseRock = litFace ? (hash(Math.floor(u * 48)) > 0.45 ? rockLitCol : rockLitMidCol) : rockDarkCol;
    L.fillStyle = baseRock;
    L.fillRect(x, top, 1, colBottom - top);

    // 2. Vertical & stepped dark rock crack lines (dihedrals and fissures).
    const crackCell = Math.floor(x / 3);
    const crackRng = hash(crackCell * 41 + scene * 97);
    if (crackRng > 0.56 && (x % 3 === Math.floor(crackRng * 3))) {
      const crackStart = top + Math.round((4 + crackRng * 10) * unit);
      const crackLen = Math.round((12 + hash(crackCell * 53 + 7) * 34) * unit);
      if (crackStart < colBottom) {
        L.fillStyle = rockCrackCol;
        L.fillRect(x, crackStart, 1, Math.min(crackLen, colBottom - crackStart));
      }
    }

    // 3. Steepness-modulated snow cap at the crest with dithered lower edge.
    const steepness = Math.abs(macroSlope) * 18;
    const snowDepth = Math.round(clamp(12 - steepness * 3.5 + (noise(u * 38 + scene * 5) - 0.5) * 6, 3, 16) * unit);
    L.fillStyle = litFace ? snowLitCol : snowShadeCol;
    L.fillRect(x, top, 1, Math.min(snowDepth, colBottom - top));

    // Bright cornice rim on crest + shaded undercut pixel.
    L.fillStyle = litFace ? snowCrestCol : snowShadeCol;
    L.fillRect(x, top, 1, Math.max(1, Math.round(2 * unit)));
    if (top + snowDepth < colBottom && (x & 1) === 0) {
      L.fillStyle = litFace ? snowLitCol : snowDeepCol;
      L.fillRect(x, top + snowDepth, 1, 1);
    }

    // 4. Snow caught in vertical gullies (couloirs) cutting down the cliff face.
    const couloir = Math.sin(u * 44 + scene * 3.7 + noise(u * 14) * 2.2);
    if (couloir > 0.72) {
      const chuteLen = Math.round((16 + (couloir - 0.72) * 90) * unit);
      const chuteY = top + Math.max(1, snowDepth - 1);
      if (chuteY < colBottom) {
        L.fillStyle = litFace ? snowLitCol : snowShadeCol;
        L.fillRect(x, chuteY, 1, Math.min(chuteLen, colBottom - chuteY));
      }
    }

    // 5. Snow caught on horizontal/sloping rock strata ledges with dark rock shadow underneath.
    for (let s = 0; s < 3; s++) {
      const ledgeOffset = (15 + s * 17 + Math.sin(u * 15 + s * 2.4 + scene) * 4.5) * unit;
      const ly = Math.round(top + ledgeOffset);
      if (ly + 3 >= colBottom) continue;
      if (hash(Math.floor(u * 32) + s * 61 + scene * 13) > 0.22) {
        L.fillStyle = litFace ? snowLitCol : snowShadeCol;
        L.fillRect(x, ly, 1, Math.max(1, Math.round(2 * unit)));
        L.fillStyle = rockCrackCol;
        L.fillRect(x, ly + Math.max(1, Math.round(2 * unit)), 1, 1);
      }
    }
  }

  if (scene === 1) {
    drawGlacierAndStream(L, w, h, unit, time, glow);
  } else if (scene === 3) {
    drawPineValley(L, w, h, time, sprites);
  }
}

/** Draws sculpted lower-third foreground snowdrifts, scree, footprints, rocks, and snow-tufted shrubs (off radio). */
export function drawForegroundGround(
  L: CanvasRenderingContext2D,
  scene: number,
  w: number,
  h: number,
  unit: number,
  time: number,
  state: SkyState,
  glow: number,
  sprites: AlpineSprites,
): void {
  const alpenglowWarm = mix(ALPINE_COLORS.alpenglowOrange, ALPINE_COLORS.alpenglowPink, 0.45);
  const fgSnowLit = css(mix(ALPINE_COLORS.snowLit, alpenglowWarm, 0.42 * glow));
  const fgSnowShade = css(mix(mix(ALPINE_COLORS.snowShade, state.sky.horizon, 0.14), ALPINE_COLORS.alpenglowShadow, 0.72 * glow));
  const fgSnowDeep = css(mix(ALPINE_COLORS.snowDeep, ALPINE_COLORS.alpenglowDeep, 0.78 * glow));
  const screeDark = css(mix(ALPINE_COLORS.rockDark, ALPINE_COLORS.alpenglowDeep, 0.65 * glow));
  const screeMid = css(mix(ALPINE_COLORS.rockMid, [110, 82, 92], 0.45 * glow));

  // Sculpted foreground snow & scree banks on bottom-left (u 0..0.38) and bottom-right (u 0.63..1.0).
  for (let x = 0; x < w; x++) {
    const u = x / w;
    const inRadioZone = u >= 0.385 && u <= 0.625;
    if (inRadioZone) continue;

    // Keep the meltwater stream channel open in Glacier Valley (Scene 1).
    const inStream = scene === 1 && u >= 0.09 && u <= 0.21;
    const sideT = u < 0.385 ? clamp((0.385 - u) / 0.385, 0, 1) : clamp((u - 0.625) / 0.375, 0, 1);
    const bankRise = Math.pow(sideT, 0.85) * 0.08 + (noise(u * 18 + scene * 9) - 0.5) * 0.018;
    const bankTop = Math.round((0.96 - bankRise) * h);

    if (!inStream && bankTop < h) {
      L.fillStyle = fgSnowLit;
      L.fillRect(x, bankTop, 1, Math.max(2, Math.round(4 * unit)));
      L.fillStyle = fgSnowShade;
      L.fillRect(x, bankTop + Math.round(4 * unit), 1, h - bankTop);

      const rippleY = bankTop + Math.round((6 + Math.sin(u * 28 + scene) * 2) * unit);
      if (rippleY < h) {
        L.fillStyle = fgSnowDeep;
        L.fillRect(x, rippleY, 1, 2);
      }
    }

    // Scattered angular scree pebbles across the lower third (v 0.80..0.97) outside the stream & radio.
    if (!inStream) {
      const pebbleHash = hash(x * 0.63 + scene * 31);
      if (pebbleHash > 0.72) {
        const pyOff = Math.round((0.81 + hash(x * 1.13 + scene) * 0.15) * h);
        if (pyOff < h - 1) {
          L.fillStyle = pebbleHash > 0.88 ? screeDark : screeMid;
          L.fillRect(x, pyOff, pebbleHash > 0.86 ? 3 : 2, pebbleHash > 0.91 ? 2 : 1);
        }
      }
    }
  }

  // Crisp footprints in the lower-third snow left & right of the radio.
  drawFootprints(L, scene, w, h, unit, fgSnowDeep, fgSnowLit);

  // Foreground rocks, snow-tufted shrubs, and grass tufts.
  const props = FOREGROUND_PROPS[scene] ?? FOREGROUND_PROPS[0];
  for (const p of props) {
    if (p.kind === 'boulder') {
      const sp = sprites.boulders[p.variant % sprites.boulders.length];
      L.drawImage(sp.canvas, Math.round(p.u * w - sp.w / 2), Math.round(p.v * h - sp.h));
      continue;
    }

    const plants = p.kind === 'shrub' ? sprites.shrubs : sprites.grassTufts;
    const sp = plants[p.variant % plants.length];
    drawSwayingPlant(L, sp, Math.round(p.u * w - sp.w / 2), Math.round(p.v * h - sp.h), time);
  }

  if (scene === 1 || scene === 3) {
    const pL = sprites.pinesFg[0];
    const pR = sprites.pinesFg[1];
    drawSwayingPlant(L, pL, Math.round(-pL.w * 0.25), Math.round(h - pL.h + 6), time);
    drawSwayingPlant(L, pR, Math.round(w - pR.w * 0.72), Math.round(h - pR.h + 8), time);
  }
}

function drawFootprints(
  L: CanvasRenderingContext2D,
  scene: number,
  w: number,
  h: number,
  unit: number,
  stepCol: string,
  rimCol: string,
): void {
  const drawTrail = (u0: number, v0: number, u1: number, v1: number, steps: number) => {
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      const stagger = (i % 2 === 0 ? -1 : 1) * 1.5 * unit;
      const sx = Math.round(lerp(u0, u1, t) * w + stagger);
      const sy = Math.round((lerp(v0, v1, t) - Math.sin(Math.PI * t) * 0.014) * h);
      L.fillStyle = stepCol;
      L.fillRect(sx, sy, 2, 1);
      L.fillStyle = rimCol;
      L.fillRect(sx, sy + 1, 2, 1);
    }
  };

  if (scene === 0) {
    drawTrail(0.14, 0.94, 0.31, 0.87, 9);
  } else if (scene === 1) {
    drawTrail(0.11, 0.95, 0.24, 0.89, 7);
    drawTrail(0.68, 0.89, 0.77, 0.85, 6);
  } else if (scene === 2) {
    drawTrail(0.15, 0.94, 0.31, 0.88, 8);
  } else if (scene === 3) {
    drawTrail(0.66, 0.91, 0.80, 0.86, 8);
  } else {
    drawTrail(0.22, 0.84, 0.33, 0.91, 8);
    drawTrail(0.67, 0.89, 0.76, 0.82, 7);
  }
}

function drawGlacierAndStream(
  L: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  time: number,
  glow: number,
): void {
  const alpenglowWarm = mix(ALPINE_COLORS.alpenglowOrange, ALPINE_COLORS.alpenglowPink, 0.4);
  const iceLit = css(mix(ALPINE_COLORS.iceLit, alpenglowWarm, 0.35 * glow));
  const iceMid = css(mix(ALPINE_COLORS.iceMid, ALPINE_COLORS.alpenglowShadow, 0.25 * glow));
  const iceDeep = css(mix(ALPINE_COLORS.iceDeep, ALPINE_COLORS.alpenglowDeep, 0.45 * glow));
  const crev = css(ALPINE_COLORS.crevasse);

  for (let x = Math.round(w * 0.08); x < Math.round(w * 0.88); x++) {
    const u = x / w;
    const g = glacierProfile(u);
    const top = Math.round(g.topV * h);
    const bot = Math.round(g.botV * h);
    const span = Math.max(2, bot - top);

    L.fillStyle = iceLit;
    L.fillRect(x, top, 1, Math.round(span * 0.28));
    L.fillStyle = iceMid;
    L.fillRect(x, top + Math.round(span * 0.28), 1, Math.round(span * 0.48));
    L.fillStyle = iceDeep;
    L.fillRect(x, top + Math.round(span * 0.76), 1, Math.max(1, bot - (top + Math.round(span * 0.76))));

    const crevPhase = ((x * 0.14 + top * 0.08) % 9 + 9) % 9;
    if (crevPhase < 1.3 && u > 0.22 && u < 0.78) {
      L.fillStyle = crev;
      L.fillRect(x, top + Math.round(span * 0.22), 1, Math.round(span * 0.45));
    }
  }

  const snoutX = Math.round(SCENE_ANCHORS.glacierStreamSnout.u * w);
  const snoutY = Math.round(SCENE_ANCHORS.glacierStreamSnout.v * h);
  L.fillStyle = crev;
  L.fillRect(snoutX - 4, snoutY - 3, 8, 5);

  const streamDeep = css(ALPINE_COLORS.streamDeep);
  const streamLit = css(ALPINE_COLORS.streamLit);
  const steps = Math.round(h * 0.22);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const sx = Math.round(lerp(snoutX, w * 0.12, t) + Math.sin(t * 7.5) * 8 * unit);
    const sy = snoutY + i;
    const halfW = Math.round((2 + t * 5.5) * unit);
    L.fillStyle = streamDeep;
    L.fillRect(sx - halfW, sy, halfW * 2, 1);
    if ((i + Math.floor(time * 5)) % 4 === 0) {
      L.fillStyle = streamLit;
      L.fillRect(sx - Math.round(halfW * 0.5), sy, Math.max(1, halfW), 1);
    }
  }
}

function drawPineValley(
  L: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  sprites: AlpineSprites,
): void {
  for (let i = 0; i < 16; i++) {
    const u = 0.16 + (i / 15) * 0.54 + (hash(i * 23 + 1) - 0.5) * 0.02;
    const v = sceneTerrainY(3, u) + 0.015 + hash(i * 23 + 2) * 0.05;
    const sp = sprites.pinesFar[i % sprites.pinesFar.length];
    drawSwayingPlant(L, sp, Math.round(u * w - sp.w / 2), Math.round(v * h - sp.h), time);
  }
  for (let i = 0; i < 14; i++) {
    const u = 0.14 + (i / 13) * 0.56 + (hash(i * 31 + 5) - 0.5) * 0.02;
    const v = sceneTerrainY(3, u) + 0.065 + hash(i * 31 + 6) * 0.05;
    const sp = sprites.pinesMid[i % sprites.pinesMid.length];
    drawSwayingPlant(L, sp, Math.round(u * w - sp.w / 2), Math.round(v * h - sp.h), time);
  }
}
