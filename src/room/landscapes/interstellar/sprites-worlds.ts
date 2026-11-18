import { mix, type RGB } from '../../../render/color';
import { seededRandom } from '../../../world/math';
import { PixelGrid, ditherIndex, hash2, type Sprite } from './sprites-base';

export interface WorldSprites {
  giant: [calm: Sprite, windward: Sprite, leeward: Sprite];
  ringsBack: Sprite;
  ringsFront: Sprite;
  ringsShimmer: Sprite;
  moons: [Sprite, Sprite, Sprite];
  pillarLeft: Sprite;
  pillarRight: Sprite;
  asteroids: Sprite[];
  outpostAsteroid: Sprite;
  iceMoon: Sprite;
  iceMoonShimmer: Sprite;
  sunOrange: Sprite;
  sunBlue: Sprite;
  blackHole: Sprite;
}

const GIANT_PALETTE: readonly RGB[] = [
  [18, 20, 44],
  [44, 42, 74],
  [92, 68, 76],
  [148, 102, 82],
  [196, 146, 102],
  [226, 186, 134],
  [244, 218, 174],
];

const RING_PALETTE: readonly RGB[] = [
  [54, 48, 70],
  [112, 98, 108],
  [168, 146, 134],
  [214, 192, 166],
];

const ICE_PALETTE: readonly RGB[] = [
  [22, 36, 68],
  [56, 86, 128],
  [114, 156, 196],
  [176, 212, 236],
  [224, 242, 252],
];

const ROCK_PALETTE: readonly RGB[] = [
  [28, 28, 38],
  [56, 54, 66],
  [92, 86, 94],
  [136, 126, 124],
  [176, 164, 154],
];

/** Atmospheric bands and the storm can travel this many stage pixels across the giant. */
const GIANT_CLOUD_DRIFT = 3;

function buildGiantBody(r: number, cloudDrift: number): Sprite {
  const size = r * 2 + 2;
  const cx = r + 1;
  const cy = r + 1;
  const px = new PixelGrid(size, size);
  const driftScale = cloudDrift / r;

  // Light comes from upper-left (-0.65, -0.58, 0.49).
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const ndotl = Math.max(0, -dx * 0.65 - dy * 0.58 + nz * 0.49);
      // Slight 14-degree axial tilt for atmospheric bands and subtle storm oval.
      const lat = dy * 0.96 - dx * 0.28;
      // Foreshorten cloud motion toward the limb while keeping the planet's shading fixed.
      const drift = driftScale * nz;
      const cloudLat = lat + drift * Math.sin(dx * Math.PI);
      const band = Math.sin(cloudLat * 15) * 0.5 + Math.cos(cloudLat * 7 + 0.8) * 0.35 + Math.sin(cloudLat * 29) * 0.15;
      const storm = Math.hypot((dx + 0.22 - drift) * 1.4, (cloudLat - 0.28) * 3.1) < 0.24 ? 0.18 : 0;
      const shade01 = Math.min(1, Math.max(0, ndotl * 0.78 + (band * 0.14 + 0.12) + storm));
      let idx = ditherIndex(x, y, shade01, GIANT_PALETTE.length);
      if (r2 > 0.92 && ndotl > 0.55) idx = GIANT_PALETTE.length - 1;
      px.set(x, y, GIANT_PALETTE[idx]);
    }
  }
  return px.toSprite();
}

function buildGasGiant(unit: number): {
  giant: WorldSprites['giant'];
  ringsBack: Sprite;
  ringsFront: Sprite;
  ringsShimmer: Sprite;
} {
  const r = Math.max(24, Math.round(50 * unit));

  // Tilted elliptical rings split cleanly into back half, front half, and shimmer overlay.
  const rw = Math.round(r * 2.15) * 2 + 4;
  const rh = Math.round(r * 0.78) * 2 + 4;
  const rcx = Math.floor(rw / 2);
  const rcy = Math.floor(rh / 2);
  const back = new PixelGrid(rw, rh);
  const front = new PixelGrid(rw, rh);
  const shimmer = new PixelGrid(rw, rh);
  const tilt = -0.3;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const ox = x - rcx;
      const oy = y - rcy;
      const rx = ox * cosT - oy * sinT;
      const ry = (ox * sinT + oy * cosT) * 3.2;
      const dist = Math.hypot(rx, ry) / r;
      if (dist < 1.26 || dist > 2.08) continue;
      // Cassini-like dark gap inside the ring system.
      if (dist > 1.66 && dist < 1.73) continue;

      const density =
        (dist < 1.66 ? 0.65 + 0.3 * Math.sin(dist * 45) : 0.48 + 0.25 * Math.cos(dist * 38)) *
        (1 - Math.abs(dist - 1.67) * 0.15);
      // Planet shadow falls across the lower-right back portion of the rings.
      const inShadow = ry < 0 && rx > r * 0.35;
      const lit = inShadow ? density * 0.22 : density;
      const idx = ditherIndex(x, y, lit, RING_PALETTE.length);
      const alpha = dist > 1.98 ? 175 : 235;
      const target = ry < 0 ? back : front;
      target.set(x, y, RING_PALETTE[idx], alpha);
      if (ditherIndex(x, y, lit * 0.9, 2) === 1 && !inShadow) {
        shimmer.set(x, y, [252, 238, 206], 210);
      }
    }
  }

  return {
    giant: [buildGiantBody(r, 0), buildGiantBody(r, -GIANT_CLOUD_DRIFT), buildGiantBody(r, GIANT_CLOUD_DRIFT)],
    ringsBack: back.toSprite(),
    ringsFront: front.toSprite(),
    ringsShimmer: shimmer.toSprite(),
  };
}

function buildMoon(r: number, palette: readonly RGB[], seed: number): Sprite {
  const size = r * 2 + 2;
  const cx = r + 1;
  const cy = r + 1;
  const px = new PixelGrid(size, size);
  const rnd = seededRandom(seed);
  const craters = Array.from({ length: 4 }, () => ({
    x: (rnd() - 0.5) * 1.1,
    y: (rnd() - 0.5) * 1.1,
    r: 0.16 + rnd() * 0.16,
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      let light = Math.max(0, -dx * 0.65 - dy * 0.58 + nz * 0.49);
      for (const c of craters) {
        const d = Math.hypot(dx - c.x, dy - c.y);
        if (d < c.r) light *= 0.72;
        else if (d < c.r + 0.08 && dx - c.x > 0) light = Math.min(1, light + 0.18);
      }
      const idx = ditherIndex(x, y, light, palette.length);
      px.set(x, y, palette[idx]);
    }
  }
  return px.toSprite();
}

function buildNebulaPillar(w: number, h: number, flip: boolean, seed: number): Sprite {
  const px = new PixelGrid(w, h);
  const darkCore: RGB = [18, 12, 32];
  const plumMid: RGB = [76, 36, 98];
  const magentaRim: RGB = [156, 68, 146];
  const tealRim: RGB = [62, 184, 194];
  const brightEdge: RGB = [178, 244, 240];

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const ux = flip ? (w - 1 - x) / w : x / w;
      // Sculpted tower profile: wider at bottom, knobby crown near top.
      const ridge =
        0.52 * (1 - ny * 0.45) +
        0.16 * Math.sin(ny * 8.5 + seed) +
        0.09 * Math.cos(ny * 17 + seed * 2) +
        (hash2(Math.floor(x / 3), Math.floor(y / 3), seed) - 0.5) * 0.1;
      const dist = ridge - ux;
      if (dist < -0.18) continue;

      if (dist > 0.14) {
        const coreMix = Math.min(1, (dist - 0.14) * 3);
        const idx = ditherIndex(x, y, 1 - coreMix, 2);
        px.set(x, y, idx === 0 ? darkCore : plumMid, 240);
      } else if (dist > 0) {
        const edge01 = 1 - dist / 0.14;
        const glowColor = y < h * 0.45 ? tealRim : magentaRim;
        const c = mix(plumMid, glowColor, edge01);
        const alpha = Math.round(180 + edge01 * 55);
        px.set(x, y, dist < 0.035 && ditherIndex(x, y, 0.75, 2) === 1 ? brightEdge : c, alpha);
      } else {
        const wisp = 1 + dist / 0.18;
        if (ditherIndex(x, y, wisp * 0.7, 2) === 1) {
          px.set(x, y, y < h * 0.5 ? tealRim : magentaRim, Math.round(wisp * 130));
        }
      }
    }
  }
  return px.toSprite();
}

function buildAsteroid(r: number, seed: number): Sprite {
  const size = r * 2 + 4;
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const px = new PixelGrid(size, size);
  const rnd = seededRandom(seed);
  const lobes = Array.from({ length: 5 }, (_, i) => ({
    a: (i / 5) * Math.PI * 2 + rnd() * 0.6,
    amp: 0.1 + rnd() * 0.12,
    freq: 2 + Math.floor(rnd() * 3),
  }));
  const craters = Array.from({ length: 3 }, () => ({
    x: (rnd() - 0.5) * 0.85,
    y: (rnd() - 0.5) * 0.85,
    r: 0.18 + rnd() * 0.16,
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const angle = Math.atan2(dy, dx);
      let radius = 0.82;
      for (const l of lobes) radius += Math.cos(angle * l.freq + l.a) * l.amp;
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;

      const edge = radius - d;
      const nz = Math.sqrt(Math.max(0, 1 - (d / radius) ** 2));
      let light = Math.max(0, -dx * 0.62 - dy * 0.62 + nz * 0.45);
      for (const c of craters) {
        const cd = Math.hypot(dx - c.x, dy - c.y);
        if (cd < c.r) light *= 0.62;
      }
      if (edge < 0.14 && -dx - dy > 0.2) light = Math.min(1, light + 0.3);
      if (edge < 0.1 && -dx - dy < -0.2) light *= 0.45;
      const idx = ditherIndex(x, y, light, ROCK_PALETTE.length);
      px.set(x, y, ROCK_PALETTE[idx]);
    }
  }
  return px.toSprite();
}

function buildOutpostAsteroid(unit: number): Sprite {
  const base = buildAsteroid(Math.max(12, Math.round(22 * unit)), 901);
  const padTop = Math.max(8, Math.round(14 * unit));
  const out = new PixelGrid(base.w, base.h + padTop).toSprite();
  const octx = out.canvas.getContext('2d', { willReadFrequently: true });
  if (!octx) return base;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(base.canvas, 0, padTop);

  const cx = Math.floor(out.w / 2);
  const deckY = padTop + Math.round(4 * unit);
  const u = Math.max(1, Math.round(unit));

  // Terraced metal landing pad & supports.
  octx.fillStyle = '#4e5468';
  octx.fillRect(cx - 10 * u, deckY, 20 * u, 2 * u);
  octx.fillStyle = '#8b93a8';
  octx.fillRect(cx - 10 * u, deckY, 20 * u, 1);

  // Domed habitat pod with sunlit highlight and warm lit viewport pixels.
  octx.fillStyle = '#d4dce6';
  octx.fillRect(cx - 8 * u, deckY - 5 * u, 9 * u, 5 * u);
  octx.fillStyle = '#9aa6ba';
  octx.fillRect(cx - 7 * u, deckY - 6 * u, 7 * u, 1 * u);
  octx.fillStyle = '#ffffff';
  octx.fillRect(cx - 7 * u, deckY - 6 * u, 4 * u, 1);
  octx.fillStyle = '#ffd56b';
  octx.fillRect(cx - 6 * u, deckY - 3 * u, 2 * u, 1 * u);
  octx.fillRect(cx - 3 * u, deckY - 3 * u, 2 * u, 1 * u);

  // Mining lattice derrick + radio mast on the right side of the pad.
  octx.fillStyle = '#7b8296';
  octx.fillRect(cx + 4 * u, deckY - 9 * u, u, 9 * u);
  octx.fillRect(cx + 7 * u, deckY - 7 * u, u, 7 * u);
  octx.fillRect(cx + 4 * u, deckY - 9 * u, 5 * u, u);
  octx.fillStyle = '#c8cfd8';
  octx.fillRect(cx - 4 * u, deckY - 10 * u, 1, 4 * u);

  return out;
}

function buildIceMoon(unit: number): { iceMoon: Sprite; iceMoonShimmer: Sprite } {
  const r = Math.max(22, Math.round(42 * unit));
  const size = r * 2 + 2;
  const cx = r + 1;
  const cy = r + 1;
  const px = new PixelGrid(size, size);
  const shimmer = new PixelGrid(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const light = Math.max(0, -dx * 0.58 - dy * 0.64 + nz * 0.5);

      // Tectonic ice fractures curving across the crust.
      const f1 = Math.abs(dy + 0.18 - Math.sin(dx * 3.8 + 0.4) * 0.22);
      const f2 = Math.abs(dx - 0.12 - Math.cos(dy * 4.2) * 0.18);
      const f3 = Math.abs(dy - dx * 0.65 + 0.25);
      const crack = f1 < 0.045 || f2 < 0.038 || (dx > -0.2 && f3 < 0.032);
      const ridge = !crack && (f1 < 0.08 || f2 < 0.07);

      if (crack) {
        px.set(x, y, [18, 34, 68]);
        shimmer.set(x, y, [168, 242, 255], 235);
      } else {
        const boosted = ridge ? Math.min(1, light + 0.25) : light;
        const idx = ditherIndex(x, y, boosted, ICE_PALETTE.length);
        px.set(x, y, ICE_PALETTE[idx]);
        if (ridge) shimmer.set(x, y, [224, 250, 255], 170);
      }
    }
  }
  return { iceMoon: px.toSprite(), iceMoonShimmer: shimmer.toSprite() };
}

function buildSun(r: number, core: RGB, mid: RGB, edge: RGB): Sprite {
  const pad = Math.round(r * 0.6);
  const size = (r + pad) * 2 + 1;
  const cx = r + pad;
  const cy = r + pad;
  const px = new PixelGrid(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d <= r) {
        const t = d / r;
        const c = t < 0.45 ? mix(core, mid, t / 0.45) : mix(mid, edge, (t - 0.45) / 0.55);
        const gran = (hash2(Math.floor(x / 2), Math.floor(y / 2), r) - 0.5) * 0.14;
        const idx = ditherIndex(x, y, Math.min(1, Math.max(0, 1 - t + gran)), 3);
        px.set(x, y, idx === 2 ? core : idx === 1 ? c : edge);
      } else if (d < r + pad) {
        const falloff = 1 - (d - r) / pad;
        if (ditherIndex(x, y, falloff * 0.72, 2) === 1) {
          px.set(x, y, edge, Math.round(falloff * 140));
        }
      }
    }
  }
  return px.toSprite();
}

function buildBlackHole(unit: number): Sprite {
  const r = Math.max(8, Math.round(12 * unit));
  const w = r * 6 + 4;
  const h = r * 4 + 4;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const px = new PixelGrid(w, h);
  const tilt = -0.22;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ox = x - cx;
      const oy = y - cy;
      const distSphere = Math.hypot(ox, oy) / r;

      // Relativistic lensed ring around the shadow.
      if (distSphere > 1.02 && distSphere < 1.38) {
        const ringGlow = 1 - Math.abs(distSphere - 1.15) / 0.23;
        if (ditherIndex(x, y, ringGlow * 0.9, 2) === 1) {
          px.set(x, y, mix([232, 134, 62], [255, 240, 200], ringGlow), Math.round(140 + ringGlow * 110));
        }
      }

      // Tilted thin bright accretion disc (passing behind above, in front below).
      const rx = ox * cosT - oy * sinT;
      const ry = (ox * sinT + oy * cosT) * 4.2;
      const dDisc = Math.hypot(rx, ry) / r;
      if (dDisc > 1.2 && dDisc < 2.85) {
        const inFront = ry >= 0;
        if (distSphere > 1.02 || inFront) {
          const glow = 1 - (dDisc - 1.2) / 1.65;
          // Doppler beaming: left approaching side slightly brighter.
          const beam = Math.min(1, glow * (rx < 0 ? 1.15 : 0.85));
          const c = mix([172, 72, 42], [255, 242, 208], beam);
          if (ditherIndex(x, y, beam, 2) === 1 || dDisc < 1.65) {
            px.set(x, y, c, Math.round(130 + beam * 125));
          }
        }
      }
    }
  }

  // Event horizon shadow + crisp 1px photon ring.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d <= 0.96) px.set(x, y, [4, 4, 10]);
      else if (d <= 1.06) px.set(x, y, [255, 226, 168], 220);
    }
  }

  return px.toSprite();
}

export function buildWorldSprites(unit: number): WorldSprites {
  const { giant, ringsBack, ringsFront, ringsShimmer } = buildGasGiant(unit);
  const { iceMoon, iceMoonShimmer } = buildIceMoon(unit);
  return {
    giant,
    ringsBack,
    ringsFront,
    ringsShimmer,
    moons: [
      buildMoon(Math.max(5, Math.round(10 * unit)), [[44, 48, 68], [96, 102, 126], [154, 160, 182], [216, 222, 236]], 101),
      buildMoon(Math.max(4, Math.round(7 * unit)), [[54, 34, 30], [116, 68, 52], [176, 108, 76], [224, 162, 114]], 202),
      buildMoon(Math.max(3, Math.round(5 * unit)), [[46, 64, 96], [108, 146, 188], [182, 218, 244], [234, 248, 255]], 303),
    ],
    pillarLeft: buildNebulaPillar(Math.round(135 * unit), Math.round(170 * unit), false, 11),
    pillarRight: buildNebulaPillar(Math.round(130 * unit), Math.round(165 * unit), true, 29),
    asteroids: [
      buildAsteroid(Math.max(4, Math.round(7 * unit)), 401),
      buildAsteroid(Math.max(6, Math.round(11 * unit)), 402),
      buildAsteroid(Math.max(8, Math.round(15 * unit)), 403),
      buildAsteroid(Math.max(10, Math.round(18 * unit)), 404),
      buildAsteroid(Math.max(12, Math.round(21 * unit)), 405),
    ],
    outpostAsteroid: buildOutpostAsteroid(unit),
    iceMoon,
    iceMoonShimmer,
    sunOrange: buildSun(Math.max(12, Math.round(22 * unit)), [255, 248, 214], [255, 174, 74], [218, 86, 42]),
    sunBlue: buildSun(Math.max(8, Math.round(13 * unit)), [245, 252, 255], [134, 206, 255], [64, 126, 226]),
    blackHole: buildBlackHole(unit),
  };
}
