import { memoryCanvas } from '../../../render/pixel-stage';
import { clamp, lerp, seededRandom } from '../../../world/math';
import { fbm } from '../../journeys/noise';
import { SKY_HORIZON } from './scenes';

const EXTRA_STARRY_STARS = 140;

const BAYER_4X4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export interface ExtraStar {
  u: number;
  v: number;
  bright: boolean;
  phase: number;
  speed: number;
}

/** Pre-renders a pale diagonal band of 4x4-Bayer-dithered Milky Way star dust for the sky layer. */
export function buildMilkyWayCanvas(w: number, h: number): HTMLCanvasElement {
  const skyH = Math.max(1, Math.round(h * SKY_HORIZON));
  const { canvas, ctx } = memoryCanvas(w, skyH);
  const img = ctx.createImageData(w, skyH);
  const data = img.data;

  const ax = 0.08;
  const ay = 0.88;
  const bx = 0.90;
  const by = 0.04;
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;

  for (let y = 0; y < skyH; y++) {
    const nv = y / skyH;
    const edgeFade = clamp((0.96 - nv) / 0.25, 0, 1);
    for (let x = 0; x < w; x++) {
      const nu = x / w;
      const t = clamp(((nu - ax) * vx + (nv - ay) * vy) / lenSq, 0, 1);
      const px = ax + vx * t;
      const py = ay + vy * t;
      const signedDist = (nu - px) * -vy + (nv - py) * vx;
      const wobble = (fbm(t * 7.5 + 2.1) - 0.5) * 0.06;
      const d = Math.abs(signedDist + wobble);

      const bandWidth = 0.145 + fbm(t * 4.2 + 9.4) * 0.05;
      const core = clamp(1 - d / bandWidth, 0, 1);
      if (core <= 0.02) continue;

      // Subtle Great Rift dust lane running slightly off-center along the band.
      const riftDist = Math.abs(signedDist + wobble * 0.6 - 0.014);
      const rift = 1 - 0.48 * clamp(1 - riftDist / 0.026, 0, 1);
      const cloudNoise = 0.65 + 0.55 * fbm(nu * 14 + nv * 11 + 3.7);
      const density = clamp(core * core * rift * cloudNoise * edgeFade * 0.88, 0, 1);

      const bayer = (BAYER_4X4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      if (density <= bayer * 0.82 + 0.08) continue;

      const bright = density > 0.52;
      const o = (y * w + x) * 4;
      data[o] = bright ? 214 : 154;
      data[o + 1] = bright ? 226 : 176;
      data[o + 2] = bright ? 255 : 230;
      data[o + 3] = bright ? 175 : 125;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Deterministic extra starfield for Starry Col, concentrated along the Milky Way band. */
export function buildExtraStars(): ExtraStar[] {
  const rnd = seededRandom(4219);
  const stars: ExtraStar[] = [];
  for (let i = 0; i < EXTRA_STARRY_STARS; i++) {
    const onBand = i < EXTRA_STARRY_STARS * 0.55;
    const t = rnd();
    const u = onBand
      ? clamp(lerp(0.08, 0.90, t) + (rnd() + rnd() - 1) * 0.11, 0.02, 0.98)
      : 0.02 + rnd() * 0.96;
    const v = onBand
      ? clamp(lerp(0.54, 0.03, t) + (rnd() + rnd() - 1) * 0.08, 0.02, 0.56)
      : 0.02 + rnd() * 0.52;
    stars.push({
      u,
      v,
      bright: rnd() < 0.14,
      phase: rnd() * Math.PI * 2,
      speed: 0.55 + rnd() * 1.1,
    });
  }
  return stars;
}
