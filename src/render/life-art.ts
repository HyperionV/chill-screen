import { depthScale, floorAt } from '../world/geometry';
import type { Food, Plant, Shrimp, Snail } from '../world/types';
import { css, haze, hsl, mix, type RGB } from './color';

const SEGMENTS = 12;

/**
 * Draws a plant. `bend` is the extra lean from the pointer or a current, in world units at the tip.
 */
export function drawPlant(ctx: CanvasRenderingContext2D, p: Plant, time: number, bend: number, water: RGB): void {
  const root = floorAt(p.x, p.z) + 4;
  const s = depthScale(p.z);
  // A slow lean, a quicker flutter, and a ripple that travels up toward the tip.
  const sway = (t: number, i: number): number =>
    ((Math.sin(time * 0.55 + p.seed + i * 0.9) * 16 + Math.sin(time * 1.25 + p.seed * 2 + i) * 5) * (p.height / 400) + bend) * t * t +
    Math.sin(time * 1.7 - t * 5 + p.seed + i * 1.3) * 5 * t * (p.height / 400);
  switch (p.kind) {
    case 'ribbon':
      drawRibbons(ctx, p, root, s, sway, water, time);
      break;
    case 'stem':
      drawStems(ctx, p, root, s, sway, water, time);
      break;
    case 'fern':
      drawFern(ctx, p, root, s, time, bend, water);
      break;
    default: {
      const unreachable: never = p.kind;
      throw new Error(`No art for ${String(unreachable)}`);
    }
  }
}

type Sway = (t: number, i: number) => number;

/** Ribbon grass: long blades that twist as they rise, darker at the base and glowing at the tips. */
function drawRibbons(ctx: CanvasRenderingContext2D, p: Plant, root: number, s: number, sway: Sway, water: RGB, time: number): void {
  for (let b = 0; b < p.blades; b++) {
    const k = ((b * 7919 + Math.floor(p.seed)) % 100) / 100;
    const h = p.height * (0.7 + 0.3 * k) * s;
    const baseX = p.x + (b - (p.blades - 1) / 2) * 4 * s;
    const lean = (b - (p.blades - 1) / 2) * 9 * s;
    const width = (8 + k * 5) * s;
    const left: number[] = [];
    const right: number[] = [];
    const mid: number[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const x = baseX + lean * t + sway(t, b);
      const y = root - h * t;
      // The blade turns edge-on and back as it twists, which reads as a narrowing.
      const twist = 0.3 + 0.7 * Math.abs(Math.cos(t * 2.4 + k * 6 + time * 0.25));
      const w = width * (1 - t * 0.7) * 0.5 * twist;
      left.push(x - w, y);
      right.push(x + w, y);
      mid.push(x, y);
    }
    const g = ctx.createLinearGradient(0, root, 0, root - h);
    g.addColorStop(0, css(haze(hsl(p.hue, 0.42, 0.17), water, p.z), 0.95));
    g.addColorStop(0.6, css(haze(hsl(p.hue + k * 14, 0.46, 0.3 + k * 0.08), water, p.z), 0.92));
    g.addColorStop(1, css(haze(hsl(p.hue + 16, 0.55, 0.45), water, p.z), 0.75));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left[0], left[1]);
    for (let i = 2; i < left.length; i += 2) ctx.lineTo(left[i], left[i + 1]);
    for (let i = right.length - 2; i >= 0; i -= 2) ctx.lineTo(right[i], right[i + 1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(haze(hsl(p.hue + 20, 0.5, 0.55), water, p.z), 0.18);
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(mid[0], mid[1]);
    for (let i = 2; i < mid.length; i += 2) ctx.lineTo(mid[i], mid[i + 1]);
    ctx.stroke();
  }
}

/** Plants of this hue and below grow red toward the light, like rotala in a bright tank. */
const RED_TIP_HUE = 104;

/** Stem plants: upright stems with pairs of leaves that flutter in the flow. */
function drawStems(ctx: CanvasRenderingContext2D, p: Plant, root: number, s: number, sway: Sway, water: RGB, time: number): void {
  const redTip = p.hue <= RED_TIP_HUE;
  for (let b = 0; b < p.blades; b++) {
    const h = p.height * (0.8 + 0.2 * ((b + 1) % 2)) * s;
    const baseX = p.x + (b - (p.blades - 1) / 2) * 12 * s;
    ctx.strokeStyle = css(haze(hsl(redTip ? 20 : p.hue - 10, 0.35, 0.26), water, p.z));
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(baseX, root);
    for (let i = 1; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      ctx.lineTo(baseX + sway(t, b), root - h * t);
    }
    ctx.stroke();
    const pairs = Math.floor(h / (14 * s));
    for (let i = 1; i <= pairs; i++) {
      const t = i / (pairs + 1);
      const x = baseX + sway(t, b);
      const y = root - h * t;
      const len = (15 - t * 6) * s;
      const hue = redTip ? p.hue + (12 - p.hue) * Math.pow(t, 1.8) : p.hue + 6 + t * 8;
      ctx.fillStyle = css(haze(hsl((hue + 360) % 360, redTip && t > 0.5 ? 0.6 : 0.5, 0.24 + t * 0.18), water, p.z), 0.92);
      const flutter = Math.sin(time * 2.1 + i * 0.7 + b + p.seed) * 0.16;
      for (const side of [-1, 1]) {
        const ang = side * (1.05 - t * 0.35) + flutter;
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(ang) * len * 0.5, y - Math.cos(ang) * len * 0.5, len * 0.2, len * 0.55, ang, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** A rosette of broad, ribbed leaves like java fern, each leaf rocking on its own. */
function drawFern(ctx: CanvasRenderingContext2D, p: Plant, root: number, s: number, time: number, bend: number, water: RGB): void {
  for (let b = 0; b < p.blades; b++) {
    const spread = (b / Math.max(1, p.blades - 1) - 0.5) * 1.6 + Math.sin(time * 0.7 + p.seed + b * 1.4) * 0.07 + bend * 0.004;
    const len = p.height * (0.75 + 0.25 * Math.cos(spread)) * s;
    const droop = Math.abs(spread) * len * 0.25;
    const tipX = p.x + Math.sin(spread) * len;
    const tipY = root - Math.cos(spread) * len + droop;
    const midX = (p.x + tipX) / 2 + Math.sin(spread) * droop * 0.4;
    const midY = (root + tipY) / 2 - droop * 0.6;
    const nx = -(tipY - root) / len;
    const ny = (tipX - p.x) / len;
    const w = len * 0.22;
    const light = 0.2 + (b % 2) * 0.05;
    const g = ctx.createLinearGradient(p.x, root, tipX, tipY);
    g.addColorStop(0, css(haze(hsl(p.hue - 6, 0.42, light - 0.06), water, p.z)));
    g.addColorStop(1, css(haze(hsl(p.hue + 4, 0.5, light + 0.1), water, p.z)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x, root);
    ctx.quadraticCurveTo(midX + nx * w * 2, midY + ny * w * 2, tipX, tipY);
    ctx.quadraticCurveTo(midX - nx * w * 2, midY - ny * w * 2, p.x, root);
    ctx.fill();
    ctx.strokeStyle = css(haze(hsl(p.hue + 10, 0.4, 0.42), water, p.z), 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, root);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    // Side veins.
    for (let v = 1; v < 5; v++) {
      const t = v / 5;
      const vx = p.x + (midX - p.x) * 2 * t * (1 - t) + (tipX - p.x) * t * t;
      const vy = root + (midY - root) * 2 * t * (1 - t) + (tipY - root) * t * t;
      for (const side of [-1, 1]) {
        ctx.moveTo(vx, vy);
        ctx.lineTo(vx + side * nx * w * (1.2 - t) + (tipX - p.x) * 0.08, vy + side * ny * w * (1.2 - t) + (tipY - root) * 0.08);
      }
    }
    ctx.stroke();
  }
}

export function drawSnail(ctx: CanvasRenderingContext2D, sn: Snail, time: number, water: RGB): void {
  const s = depthScale(sn.z);
  const y = floorAt(sn.x, sn.z);
  const r = 11 * s;
  ctx.save();
  ctx.globalAlpha = sn.fade;
  ctx.translate(sn.x, y);
  ctx.scale(sn.dir, 1);
  if (sn.hide <= 0) {
    ctx.fillStyle = css(haze([212, 198, 170], water, sn.z), 0.9);
    ctx.beginPath();
    ctx.ellipse(r * 0.4, -r * 0.25, r * 1.25, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(haze([212, 198, 170], water, sn.z), 0.9);
    ctx.lineWidth = 1.4 * s;
    const wave = Math.sin(time * 2 + sn.id) * 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.4, -r * 0.4);
    ctx.lineTo(r * 1.9, -r * 1.2 + wave);
    ctx.moveTo(r * 1.3, -r * 0.4);
    ctx.lineTo(r * 1.6, -r * 1.3 - wave);
    ctx.stroke();
  }
  const shell = ctx.createRadialGradient(-r * 0.3, -r * 1.4, r * 0.1, 0, -r, r * 1.1);
  const base = mix([196, 140, 64], [120, 92, 60], sn.tint);
  shell.addColorStop(0, css(haze(mix(base, [255, 230, 180], 0.4), water, sn.z)));
  shell.addColorStop(1, css(haze(mix(base, [40, 24, 10], 0.4), water, sn.z)));
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(0, -r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = css(haze([70, 44, 20], water, sn.z), 0.6);
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 4; a += 0.3) {
    const rr = r * 0.85 * (1 - a / (Math.PI * 4.4));
    const px = Math.cos(a) * rr;
    const py = -r + Math.sin(a) * rr;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawShrimp(ctx: CanvasRenderingContext2D, sh: Shrimp, time: number, water: RGB): void {
  const s = depthScale(sh.z) * (0.6 + 0.4 * Math.min(1, sh.age / 3600));
  const color = haze([214, 64, 58], water, sh.z);
  ctx.save();
  ctx.globalAlpha = sh.fade * 0.9;
  ctx.translate(sh.x, sh.y - 5 * s);
  ctx.scale(sh.dir * s, s);
  const curl = sh.airborne ? 0.2 : 0;
  ctx.fillStyle = css(color, 0.85);
  for (let i = 0; i < 5; i++) {
    const a = -0.5 + i * (0.32 + curl * 0.1);
    ctx.beginPath();
    ctx.arc(6 - i * 4.2, -Math.sin(a) * 3 - 2, 3.8 - i * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-13, -1);
  ctx.lineTo(-19, -5 + curl * 6);
  ctx.lineTo(-19, 3 + curl * 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = css(color, 0.6);
  ctx.lineWidth = 0.7;
  const flick = Math.sin(time * 5 + sh.id) * 3;
  ctx.beginPath();
  ctx.moveTo(9, -3);
  ctx.quadraticCurveTo(18, -12, 26, -6 + flick);
  ctx.moveTo(9, -2);
  ctx.quadraticCurveTo(16, -8, 24, 0 - flick);
  for (let i = 0; i < 4; i++) {
    const leg = Math.sin(time * 10 + i + sh.id) * (sh.airborne ? 2 : 1);
    ctx.moveTo(4 - i * 3, 1);
    ctx.lineTo(4 - i * 3 + leg, 5);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawFood(ctx: CanvasRenderingContext2D, food: Food[], water: RGB): void {
  for (const p of food) {
    const fade = p.onFloor ? Math.max(0.25, 1 - p.age / 240) : 1;
    ctx.fillStyle = css(haze([178, 112, 62], water, p.z), 0.9 * fade);
    ctx.beginPath();
    ctx.arc(p.x, p.y - 1, 2.6 * depthScale(p.z), 0, Math.PI * 2);
    ctx.fill();
  }
}
