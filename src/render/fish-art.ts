import { bodyLength } from '../world/fish';
import { SPECIES, growthScale } from '../world/species';
import type { Fish } from '../world/types';
import { css, haze, mix, shade, type RGB } from './color';

const WHITE: RGB = [255, 255, 255];
const EYE: RGB = [12, 14, 18];

const TETRA_BACK: RGB = [104, 104, 82];
const TETRA_FLANK: RGB = [178, 190, 186];
const TETRA_BELLY: RGB = [232, 236, 232];
const NEON: RGB = [58, 214, 255];
const NEON_CORE: RGB = [176, 246, 255];
const TETRA_RED: RGB = [226, 46, 66];

const ANGEL_BODY: RGB = [214, 220, 222];
const ANGEL_SHEEN: RGB = [236, 228, 200];
const ANGEL_BAND: RGB = [36, 38, 46];
const ANGEL_CROWN: RGB = [214, 150, 70];

const RASBORA_BACK: RGB = [150, 118, 96];
const RASBORA_FLANK: RGB = [234, 160, 122];
const RASBORA_BELLY: RGB = [242, 222, 208];
const RASBORA_WEDGE: RGB = [26, 22, 30];
const RASBORA_FIN: RGB = [228, 112, 82];

const GOURAMI_BACK: RGB = [150, 66, 56];
const GOURAMI_RED: RGB = [218, 76, 54];
const GOURAMI_BLUE: RGB = [74, 156, 226];
const GOURAMI_BELLY: RGB = [104, 176, 230];
const GOURAMI_FEELER: RGB = [238, 156, 124];

const CORY_BACK: RGB = [74, 92, 78];
const CORY_FLANK: RGB = [170, 148, 104];
const CORY_SHEEN: RGB = [116, 168, 138];
const CORY_BELLY: RGB = [224, 196, 170];

/** Draws one fish in world units; the caller has set the world transform. */
export function drawFish(ctx: CanvasRenderingContext2D, f: Fish, water: RGB): void {
  const spec = SPECIES[f.species];
  const L = bodyLength(f);
  const young = growthScale(f.age, spec.adultAge);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  ctx.rotate(Math.max(-0.45, Math.min(0.45, Math.atan2(f.vy, Math.abs(f.vx) + 6))));
  ctx.globalAlpha = f.fade * (0.75 + 0.25 * f.z) * (0.7 + 0.3 * young);
  const look: Look = { L, water, z: f.z, tone: 1 + f.tint * 0.06, phase: f.tailPhase };
  switch (f.species) {
    case 'tetra':
      drawTetra(ctx, look);
      break;
    case 'rasbora':
      drawRasbora(ctx, look);
      break;
    case 'angel':
      drawAngel(ctx, look);
      break;
    case 'gourami':
      drawGourami(ctx, look);
      break;
    case 'cory':
      drawCory(ctx, look, f.id);
      break;
    default: {
      const unreachable: never = f.species;
      throw new Error(`No art for ${String(unreachable)}`);
    }
  }
  ctx.restore();
}

interface Look {
  L: number;
  water: RGB;
  z: number;
  tone: number;
  /** Tail beat phase; the tail sweeps toward and away from us, so from the side it narrows and widens. */
  phase: number;
}

const tint = (c: RGB, k: Look, alpha = 1): string => css(haze(shade(c, k.tone), k.water, k.z), alpha);

/** A clear fin with fine rays, swept back from `root`. */
function fin(ctx: CanvasRenderingContext2D, points: [number, number][], color: string, rays: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 2) ctx.quadraticCurveTo(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rays;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  const [rx, ry] = points[0];
  for (let i = 2; i < points.length; i += 2) {
    ctx.moveTo(rx, ry);
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
}

function tail(ctx: CanvasRenderingContext2D, k: Look, baseX: number, length: number, spread: number, fork: number, color: string, rays: string): void {
  ctx.save();
  ctx.translate(baseX, 0);
  ctx.scale(0.55 + 0.45 * Math.abs(Math.cos(k.phase)), 1);
  ctx.rotate(Math.sin(k.phase) * 0.1);
  fin(ctx, [
    [0, 0],
    [-length * 0.5, -spread * 0.5], [-length, -spread],
    [-length * fork, 0], [-length, spread],
    [-length * 0.5, spread * 0.5], [0, 0],
  ], color, rays);
  ctx.restore();
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ring: RGB): void {
  ctx.fillStyle = css(ring);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(EYE);
  ctx.beginPath();
  ctx.arc(x + r * 0.08, y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x + r * 0.32, y - r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

/** Body outline from the nose (+x) to the tail root (-x); h is the half-height, `hump` lifts the back. */
function body(ctx: CanvasRenderingContext2D, L: number, h: number, hump = 1, belly = 1): void {
  ctx.beginPath();
  ctx.moveTo(L * 0.5, h * 0.05);
  ctx.bezierCurveTo(L * 0.44, -h * 0.8 * hump, L * 0.15, -h * 1.05 * hump, -L * 0.1, -h * 0.85 * hump);
  ctx.quadraticCurveTo(-L * 0.3, -h * 0.55, -L * 0.4, -h * 0.2);
  ctx.lineTo(-L * 0.4, h * 0.2);
  ctx.quadraticCurveTo(-L * 0.28, h * 0.6 * belly, -L * 0.05, h * 0.9 * belly);
  ctx.bezierCurveTo(L * 0.2, h * 1.05 * belly, L * 0.42, h * 0.75, L * 0.5, h * 0.05);
  ctx.closePath();
}

/** Countershading: dark back, bright flank, pale belly, the way light falls on a real fish. */
function shadeBody(ctx: CanvasRenderingContext2D, k: Look, h: number, back: RGB, flank: RGB, bellyColor: RGB, alpha = 1): void {
  const g = ctx.createLinearGradient(0, -h, 0, h);
  g.addColorStop(0, tint(back, k, alpha));
  g.addColorStop(0.42, tint(flank, k, alpha));
  g.addColorStop(0.75, tint(mix(flank, bellyColor, 0.6), k, alpha));
  g.addColorStop(1, tint(bellyColor, k, alpha));
  ctx.fillStyle = g;
  ctx.fill();
}

/** A soft highlight along the upper flank where the lamp catches the scales. */
function sheen(ctx: CanvasRenderingContext2D, L: number, h: number, alpha: number): void {
  const g = ctx.createRadialGradient(L * 0.1, -h * 0.35, 0, L * 0.1, -h * 0.35, L * 0.4);
  g.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-L * 0.5, -h * 1.2, L, h * 1.6);
}

function drawTetra(ctx: CanvasRenderingContext2D, k: Look): void {
  const { L } = k;
  const h = L * 0.15;
  const clear = tint(mix(TETRA_FLANK, k.water, 0.3), k, 0.32);
  const rays = tint(TETRA_FLANK, k, 0.25);
  tail(ctx, k, -L * 0.38, L * 0.22, h * 1.15, 0.55, clear, rays);
  fin(ctx, [[-L * 0.02, -h * 0.85], [-L * 0.06, -h * 1.7], [-L * 0.16, -h * 1.55], [-L * 0.16, -h * 1.2], [-L * 0.14, -h * 0.75]], clear, rays);
  fin(ctx, [[-L * 0.05, h * 0.85], [-L * 0.12, h * 1.5], [-L * 0.28, h * 1.2], [-L * 0.3, h * 0.8], [-L * 0.28, h * 0.5]], clear, rays);

  body(ctx, L, h);
  shadeBody(ctx, k, h, TETRA_BACK, TETRA_FLANK, TETRA_BELLY, 0.92);
  ctx.save();
  ctx.clip();
  // The red half: lower rear flank, fading out toward the head.
  const red = ctx.createLinearGradient(L * 0.12, 0, -L * 0.4, 0);
  red.addColorStop(0, tint(TETRA_RED, k, 0));
  red.addColorStop(0.35, tint(TETRA_RED, k, 0.9));
  red.addColorStop(1, tint(shade(TETRA_RED, 0.85), k, 0.95));
  ctx.fillStyle = red;
  ctx.fillRect(-L * 0.45, h * 0.02, L * 0.6, h * 1.1);
  sheen(ctx, L, h, 0.18);
  ctx.restore();

  // The iridescent stripe: a soft glow under a bright core.
  const stripe = (): void => {
    ctx.beginPath();
    ctx.moveTo(L * 0.34, -h * 0.2);
    ctx.quadraticCurveTo(L * 0.02, -h * 0.34, -L * 0.34, -h * 0.1);
  };
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(haze(NEON, k.water, k.z * 0.5 + 0.5), 0.3);
  ctx.lineWidth = h * 0.85;
  stripe();
  ctx.stroke();
  const neon = ctx.createLinearGradient(L * 0.34, 0, -L * 0.34, 0);
  neon.addColorStop(0, css(haze(NEON, k.water, k.z * 0.5 + 0.5), 0.9));
  neon.addColorStop(0.4, css(haze(NEON_CORE, k.water, k.z * 0.5 + 0.5)));
  neon.addColorStop(1, css(haze(NEON, k.water, k.z * 0.5 + 0.5), 0.8));
  ctx.strokeStyle = neon;
  ctx.lineWidth = h * 0.36;
  stripe();
  ctx.stroke();

  eye(ctx, L * 0.36, -h * 0.08, h * 0.4, haze([196, 214, 220], k.water, k.z));
}

/** Copper-pink body with the black wedge from mid-flank to the tail root, and a forked red tail. */
function drawRasbora(ctx: CanvasRenderingContext2D, k: Look): void {
  const { L } = k;
  const h = L * 0.21;
  const finFill = tint(mix(RASBORA_FIN, k.water, 0.25), k, 0.45);
  const rays = tint(RASBORA_FIN, k, 0.3);
  tail(ctx, k, -L * 0.36, L * 0.24, h * 1.1, 0.45, finFill, rays);
  fin(ctx, [[L * 0.02, -h * 0.9], [-L * 0.02, -h * 1.7], [-L * 0.12, -h * 1.55], [-L * 0.14, -h * 1.1], [-L * 0.12, -h * 0.75]], finFill, rays);
  fin(ctx, [[-L * 0.04, h * 0.85], [-L * 0.1, h * 1.4], [-L * 0.22, h * 1.2], [-L * 0.24, h * 0.8], [-L * 0.22, h * 0.5]], finFill, rays);

  body(ctx, L, h, 1.1, 1.05);
  shadeBody(ctx, k, h, RASBORA_BACK, RASBORA_FLANK, RASBORA_BELLY, 0.95);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = tint(RASBORA_WEDGE, k, 0.88);
  ctx.beginPath();
  ctx.moveTo(L * 0.06, -h * 0.55);
  ctx.quadraticCurveTo(L * 0.1, 0, L * 0.02, h * 0.5);
  ctx.quadraticCurveTo(-L * 0.18, h * 0.2, -L * 0.42, h * 0.04);
  ctx.lineTo(-L * 0.42, -h * 0.12);
  ctx.quadraticCurveTo(-L * 0.18, -h * 0.25, L * 0.06, -h * 0.55);
  ctx.fill();
  sheen(ctx, L, h, 0.24);
  ctx.restore();

  eye(ctx, L * 0.34, -h * 0.1, h * 0.32, haze([214, 190, 150], k.water, k.z));
}

/** A deep oval fish in slanting red and blue bars, with a blue throat and two long trailing feelers. */
function drawGourami(ctx: CanvasRenderingContext2D, k: Look): void {
  const { L } = k;
  const h = L * 0.3;
  const finFill = tint(mix(GOURAMI_RED, k.water, 0.3), k, 0.5);
  const rays = tint(GOURAMI_BLUE, k, 0.35);
  tail(ctx, k, -L * 0.34, L * 0.22, h * 0.85, 0.92, finFill, rays);
  fin(ctx, [[L * 0.1, -h * 0.85], [-L * 0.05, -h * 1.45], [-L * 0.36, -h * 1.15], [-L * 0.36, -h * 0.6], [-L * 0.32, -h * 0.3]], finFill, rays);
  fin(ctx, [[L * 0.18, h * 0.8], [-L * 0.05, h * 1.5], [-L * 0.38, h * 1.0], [-L * 0.36, h * 0.55], [-L * 0.3, h * 0.3]], finFill, rays);

  // The feelers drift and wave as it noses around.
  const wave = Math.sin(k.phase * 0.5) * h * 0.25;
  ctx.strokeStyle = tint(GOURAMI_FEELER, k, 0.75);
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(L * 0.26, h * 0.6);
  ctx.bezierCurveTo(L * 0.24, h * 1.4, L * 0.05 + wave * 0.3, h * 2.0, -L * 0.12, h * 2.6 + wave);
  ctx.moveTo(L * 0.24, h * 0.62);
  ctx.bezierCurveTo(L * 0.2, h * 1.3, L * 0.12 - wave * 0.3, h * 1.9, L * 0.02, h * 2.4 - wave);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(L * 0.5, h * 0.05);
  ctx.bezierCurveTo(L * 0.44, -h * 0.8, L * 0.18, -h * 1.02, -L * 0.1, -h * 0.92);
  ctx.quadraticCurveTo(-L * 0.3, -h * 0.65, -L * 0.36, -h * 0.2);
  ctx.lineTo(-L * 0.36, h * 0.2);
  ctx.quadraticCurveTo(-L * 0.3, h * 0.65, -L * 0.1, h * 0.92);
  ctx.bezierCurveTo(L * 0.18, h * 1.02, L * 0.44, h * 0.8, L * 0.5, h * 0.05);
  ctx.closePath();
  shadeBody(ctx, k, h, GOURAMI_BACK, GOURAMI_RED, GOURAMI_BELLY);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = tint(GOURAMI_BLUE, k, 0.72);
  ctx.lineWidth = h * 0.16;
  for (let i = 0; i < 7; i++) {
    const x = L * (0.32 - i * 0.11);
    ctx.beginPath();
    ctx.moveTo(x + L * 0.06, -h * 1.1);
    ctx.quadraticCurveTo(x - L * 0.02, 0, x - L * 0.08, h * 1.1);
    ctx.stroke();
  }
  const throat = ctx.createRadialGradient(L * 0.3, h * 0.55, 0, L * 0.3, h * 0.55, L * 0.3);
  throat.addColorStop(0, tint(GOURAMI_BLUE, k, 0.8));
  throat.addColorStop(1, tint(GOURAMI_BLUE, k, 0));
  ctx.fillStyle = throat;
  ctx.fillRect(0, 0, L * 0.6, h);
  sheen(ctx, L, h, 0.22);
  ctx.restore();

  eye(ctx, L * 0.34, -h * 0.12, h * 0.2, haze([226, 120, 80], k.water, k.z));
}

function drawAngel(ctx: CanvasRenderingContext2D, k: Look): void {
  const { L } = k;
  const h = L * 0.36;
  const sway = Math.sin(k.phase * 0.45) * 0.06;
  const finFill = tint(mix(ANGEL_BODY, k.water, 0.35), k, 0.42);
  const rays = tint(ANGEL_BAND, k, 0.18);

  // Tall swept dorsal and anal fins, carrying the dark bands out to their tips.
  for (const side of [-1, 1]) {
    fin(ctx, [
      [L * 0.14, side * h * 0.78],
      [-L * 0.02, side * h * 1.9], [-L * (0.42 + side * sway), side * h * 2.35],
      [-L * 0.3, side * h * 1.3], [-L * 0.31, side * h * 0.3],
    ], finFill, rays);
  }
  // Long ventral filaments trailing below.
  ctx.strokeStyle = finFill;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const off of [0, 0.05]) {
    ctx.moveTo(L * (0.2 - off), h * 0.62);
    ctx.bezierCurveTo(L * (0.14 - off), h * 1.4, L * (0.04 + sway), h * 2.0, -L * (0.06 + off - sway * 1.6), h * 2.7);
  }
  ctx.stroke();
  tail(ctx, k, -L * 0.33, L * 0.26, h * 0.8, 0.85, finFill, rays);

  ctx.beginPath();
  ctx.moveTo(L * 0.5, 0);
  ctx.bezierCurveTo(L * 0.42, -h * 0.75, L * 0.2, -h * 1.02, -L * 0.08, -h * 0.95);
  ctx.quadraticCurveTo(-L * 0.3, -h * 0.6, -L * 0.35, -h * 0.12);
  ctx.lineTo(-L * 0.35, h * 0.12);
  ctx.quadraticCurveTo(-L * 0.3, h * 0.6, -L * 0.08, h * 0.95);
  ctx.bezierCurveTo(L * 0.2, h * 1.02, L * 0.42, h * 0.75, L * 0.5, 0);
  ctx.closePath();
  shadeBody(ctx, k, h, shade(ANGEL_BODY, 0.82), ANGEL_BODY, mix(ANGEL_BODY, WHITE, 0.4));
  ctx.save();
  ctx.clip();
  const crown = ctx.createRadialGradient(L * 0.3, -h * 0.7, 0, L * 0.3, -h * 0.7, L * 0.3);
  crown.addColorStop(0, tint(ANGEL_CROWN, k, 0.55));
  crown.addColorStop(1, tint(ANGEL_CROWN, k, 0));
  ctx.fillStyle = crown;
  ctx.fillRect(0, -h, L * 0.6, h);
  // Soft-edged vertical bands.
  for (const x of [L * 0.28, L * 0.03, -L * 0.23]) {
    const band = ctx.createLinearGradient(x - L * 0.06, 0, x + L * 0.06, 0);
    band.addColorStop(0, tint(ANGEL_BAND, k, 0));
    band.addColorStop(0.5, tint(ANGEL_BAND, k, 0.78));
    band.addColorStop(1, tint(ANGEL_BAND, k, 0));
    ctx.fillStyle = band;
    ctx.fillRect(x - L * 0.06, -h * 1.1, L * 0.12, h * 2.2);
  }
  const pearl = ctx.createLinearGradient(-L * 0.3, -h, L * 0.3, h);
  pearl.addColorStop(0, tint(ANGEL_SHEEN, k, 0));
  pearl.addColorStop(0.5, tint(ANGEL_SHEEN, k, 0.22));
  pearl.addColorStop(1, tint(ANGEL_SHEEN, k, 0));
  ctx.fillStyle = pearl;
  ctx.fillRect(-L * 0.4, -h, L * 0.9, h * 2);
  sheen(ctx, L, h, 0.22);
  ctx.restore();

  eye(ctx, L * 0.33, -h * 0.16, h * 0.16, haze([196, 58, 44], k.water, k.z));
}

function drawCory(ctx: CanvasRenderingContext2D, k: Look, id: number): void {
  const { L } = k;
  const h = L * 0.22;
  const finFill = tint(mix(CORY_FLANK, k.water, 0.3), k, 0.5);
  const rays = tint(CORY_BACK, k, 0.3);
  tail(ctx, k, -L * 0.36, L * 0.22, h * 0.95, 0.7, finFill, rays);
  // The stiff sail-like dorsal fin with its leading spine.
  fin(ctx, [[L * 0.12, -h * 0.9], [L * 0.06, -h * 2.0], [-L * 0.02, -h * 2.0], [-L * 0.08, -h * 1.4], [-L * 0.14, -h * 0.8]], finFill, rays);
  fin(ctx, [[L * 0.24, h * 0.7], [L * 0.2, h * 1.4], [L * 0.06, h * 1.3], [L * 0.1, h * 0.9], [L * 0.12, h * 0.7]], finFill, rays);

  ctx.beginPath();
  ctx.moveTo(L * 0.5, h * 0.4);
  ctx.bezierCurveTo(L * 0.48, -h * 0.6, L * 0.3, -h * 1.05, L * 0.02, -h);
  ctx.quadraticCurveTo(-L * 0.3, -h * 0.8, -L * 0.38, -h * 0.18);
  ctx.lineTo(-L * 0.38, h * 0.2);
  ctx.quadraticCurveTo(-L * 0.2, h * 0.88, L * 0.2, h * 0.92);
  ctx.quadraticCurveTo(L * 0.46, h * 0.92, L * 0.5, h * 0.4);
  ctx.closePath();
  shadeBody(ctx, k, h, CORY_BACK, CORY_FLANK, CORY_BELLY);
  ctx.save();
  ctx.clip();
  // The green-bronze sheen of the armour plates, and the seams between them.
  const glow = ctx.createLinearGradient(0, -h * 0.6, 0, h * 0.4);
  glow.addColorStop(0, tint(CORY_SHEEN, k, 0));
  glow.addColorStop(0.5, tint(CORY_SHEEN, k, 0.55));
  glow.addColorStop(1, tint(CORY_SHEEN, k, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(-L * 0.4, -h, L * 0.75, h * 1.6);
  ctx.strokeStyle = tint(CORY_BACK, k, 0.28);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const x = L * (0.16 - i * 0.09);
    ctx.moveTo(x + L * 0.03, -h);
    ctx.quadraticCurveTo(x - L * 0.03, 0, x + L * 0.03, h);
  }
  ctx.stroke();
  ctx.fillStyle = tint(CORY_BACK, k, 0.45);
  for (let i = 0; i < 7; i++) {
    const sx = L * (0.22 - ((i * 37 + id * 13) % 55) / 100);
    const sy = h * ((((i * 53 + id * 7) % 100) / 100) * 0.9 - 0.65);
    ctx.beginPath();
    ctx.arc(sx, sy, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  sheen(ctx, L, h, 0.2);
  ctx.restore();

  // Whiskers that feel through the sand.
  ctx.strokeStyle = tint(CORY_BELLY, k, 0.8);
  ctx.lineWidth = 0.8;
  const twitch = Math.sin(k.phase * 0.7) * h * 0.08;
  ctx.beginPath();
  ctx.moveTo(L * 0.48, h * 0.5);
  ctx.quadraticCurveTo(L * 0.54, h * 0.8, L * 0.55, h * 1.05 + twitch);
  ctx.moveTo(L * 0.44, h * 0.6);
  ctx.quadraticCurveTo(L * 0.47, h * 0.9, L * 0.46, h * 1.1 - twitch);
  ctx.stroke();

  eye(ctx, L * 0.3, -h * 0.3, h * 0.24, haze([150, 140, 110], k.water, k.z));
}
