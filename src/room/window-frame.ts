import { css, mix, type RGB } from '../render/color';
import type { Look } from '../wallpapers/look';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The warm light of a lamp in the room, which takes over from daylight at night. */
const LAMP_WALL: RGB = [56, 42, 33];
const DAY_WALL: RGB = [66, 62, 60];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

const scale = (c: RGB, k: number): RGB => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];

/**
 * The window seen from inside the room, in pixels: the wall around it, the painted casing, sash and bars, the sill,
 * and a faint shine on the glass. Everything is lit by the view outside, and by a lamp at night.
 * Positions are whole stage pixels.
 */
export class WindowFrame {
  opening: Rect = { x: 0, y: 0, w: 0, h: 0 };
  panes: Rect[] = [];
  private w = 0;
  private h = 0;
  private casing = 0;

  layout(w: number, h: number): void {
    this.w = w;
    this.h = h;
    const side = Math.round(Math.max(6, Math.min(w * 0.05, h * 0.09)));
    const top = Math.round(h * 0.065);
    const sillTop = Math.round(h * 0.835);
    this.casing = Math.max(3, Math.round(h * 0.026));
    this.opening = { x: side, y: top, w: w - side * 2, h: sillTop - top };
    const o = this.opening;
    const frame = Math.max(2, Math.round(h * 0.016));
    const bar = Math.max(2, Math.round(h * 0.011));
    const transom = Math.round(o.y + o.h * 0.21);
    const left = o.x + frame;
    const right = o.x + o.w - frame;
    const upperCount = w > h ? 3 : 2;
    const upperW = Math.floor((right - left - bar * (upperCount - 1)) / upperCount);
    this.panes = [];
    for (let i = 0; i < upperCount; i++) {
      const x = left + i * (upperW + bar);
      const pw = i === upperCount - 1 ? right - x : upperW;
      this.panes.push({ x, y: o.y + frame, w: pw, h: transom - (o.y + frame) });
    }
    this.panes.push({ x: left, y: transom + bar, w: right - left, h: sillTop - frame - (transom + bar) });
  }

  /** Limits drawing to the glass, so drops and mist never land on the frame. */
  clipToGlass(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    for (const p of this.panes) ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
  }

  draw(ctx: CanvasRenderingContext2D, look: Look): void {
    const { w, h } = this;
    const o = this.opening;
    const day = 1 - look.night;
    const light = mix(look.tint, WHITE, 0.35);
    const wall = mix(scale(mix(DAY_WALL, look.tint, 0.22), 0.5 + look.mean * 0.95), LAMP_WALL, look.night);
    const trim = scale(wall, 1.55);
    const sash = scale(wall, 1.3);
    const rim = (0.25 + look.mean * 0.55) * (0.35 + day * 0.65);

    ctx.save();
    // The wall, darker than the view because the window is behind it, with light spilling from the glass.
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.rect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = css(wall);
    ctx.fill('evenodd');
    ctx.save();
    ctx.clip('evenodd');
    const spill = ctx.createRadialGradient(o.x + o.w / 2, o.y + o.h * 0.8, o.h * 0.2, o.x + o.w / 2, o.y + o.h * 0.8, w * 0.75);
    spill.addColorStop(0, css(light, 0.18 * (0.3 + look.mean)));
    spill.addColorStop(1, css(light, 0));
    ctx.fillStyle = spill;
    ctx.fillRect(0, 0, w, h);
    const corners = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    corners.addColorStop(0, 'rgba(0,0,0,0)');
    corners.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = corners;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // The casing: painted trim around the opening, with a hard shadow on the wall below and right.
    const c = this.casing;
    ctx.fillStyle = css(BLACK, 0.28);
    ctx.fillRect(o.x - c + 2, o.y - c + 2, o.w + c * 2, c);
    ctx.fillRect(o.x + o.w + c, o.y - c + 2, 2, o.h + c);
    ctx.fillStyle = css(trim);
    ctx.fillRect(o.x - c, o.y - c, o.w + c * 2, c);
    ctx.fillRect(o.x - c, o.y, c, o.h);
    ctx.fillRect(o.x + o.w, o.y, c, o.h);
    ctx.fillStyle = css(scale(trim, 1.18));
    ctx.fillRect(o.x - c, o.y - c, o.w + c * 2, 1);
    ctx.fillRect(o.x - c, o.y - c, 1, o.h + c);
    ctx.fillStyle = css(scale(trim, 0.78));
    ctx.fillRect(o.x - 1, o.y, 1, o.h);
    ctx.fillRect(o.x + o.w + c - 1, o.y - c, 1, o.h + c);

    // The sash and bars around the panes.
    ctx.beginPath();
    ctx.rect(o.x, o.y, o.w, o.h);
    for (const p of this.panes) ctx.rect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = css(sash);
    ctx.fill('evenodd');

    // Each pane's edge: light from outside catches the bottom and right, the top and left sit in shadow.
    for (const p of this.panes) {
      const { x, y } = p;
      ctx.fillStyle = css(scale(sash, 0.68));
      ctx.fillRect(x - 1, y - 1, p.w + 2, 1);
      ctx.fillRect(x - 1, y, 1, p.h);
      ctx.fillStyle = css(light, rim);
      ctx.fillRect(x - 1, y + p.h, p.w + 2, 1);
      ctx.fillRect(x + p.w, y, 1, p.h);
      ctx.fillStyle = css(BLACK, 0.22);
      ctx.fillRect(x, y, p.w, 2);
    }

    this.drawSill(ctx, o, trim, light, look);
    this.drawShine(ctx, look);
    ctx.restore();
  }

  /** The ledge under the window: its top catches the window light, its face and the wall below are in shade. */
  private drawSill(ctx: CanvasRenderingContext2D, o: Rect, trim: RGB, light: RGB, look: Look): void {
    const c = this.casing;
    const top = o.y + o.h;
    const depth = Math.max(4, Math.round(this.h * 0.042));
    const face = Math.max(3, Math.round(this.h * 0.022));
    const backL = o.x - c;
    const backR = o.x + o.w + c;

    const under = ctx.createLinearGradient(0, top + depth + face, 0, top + depth + face + this.h * 0.07);
    under.addColorStop(0, 'rgba(0,0,0,0.4)');
    under.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = under;
    ctx.fillRect(backL - c * 2, top + depth + face, backR - backL + c * 4, Math.ceil(this.h * 0.07));

    // The top, row by row so its slanted ends stay crisp.
    const lit = mix(trim, light, 0.3);
    for (let r = 0; r < depth; r++) {
      const spread = Math.round((r / depth) * c);
      ctx.fillStyle = css(scale(lit, 1.28 + look.mean * 0.45 - (r / depth) * 0.3));
      ctx.fillRect(backL - spread, top + r, backR - backL + spread * 2, 1);
    }
    if (look.sun) {
      const sx = o.x + look.sun.u * o.w;
      const pool = ctx.createRadialGradient(sx, top + depth * 0.4, 0, sx, top + depth * 0.4, o.w * 0.22);
      pool.addColorStop(0, css(mix(look.sun.color, WHITE, 0.4), 0.3 * look.sun.strength));
      pool.addColorStop(1, css(look.sun.color, 0));
      ctx.fillStyle = pool;
      ctx.fillRect(backL - c, top, backR - backL + c * 2, depth);
    }
    ctx.fillStyle = css(scale(trim, 0.72));
    ctx.fillRect(backL - c, top + depth, backR - backL + c * 2, face);
    ctx.fillStyle = css(light, 0.22);
    ctx.fillRect(backL - c, top + depth, backR - backL + c * 2, 1);
  }

  /** A faint shine on the glass: two slanted bands of light by day, the room's lamp reflected by night. */
  private drawShine(ctx: CanvasRenderingContext2D, look: Look): void {
    ctx.save();
    this.clipToGlass(ctx);
    if (look.night > 0.05) {
      ctx.fillStyle = css(LAMP_WALL, 0.24 * look.night);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalCompositeOperation = 'source-over';
    }
    const o = this.opening;
    const slant = o.h * 0.6;
    ctx.fillStyle = `rgba(255,255,255,${(0.05 * (1 - 0.6 * look.night)).toFixed(3)})`;
    for (const [at, width] of [[0.58, 0.05], [0.66, 0.018]]) {
      const x = o.x + o.w * at;
      const bw = o.w * width;
      ctx.beginPath();
      ctx.moveTo(x, o.y);
      ctx.lineTo(x + bw, o.y);
      ctx.lineTo(x + bw - slant, o.y + o.h);
      ctx.lineTo(x - slant, o.y + o.h);
      ctx.fill();
    }
    ctx.restore();
  }
}
