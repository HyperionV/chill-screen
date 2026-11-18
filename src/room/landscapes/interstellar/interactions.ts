import { css, type RGB } from '../../../render/color';
import { seededRandom } from '../../../world/math';
import type { CastPoint } from './cast';

const MAX_STARDUST = 54;
const MAX_COMETS = 6;
const COMET_DURATION = 2.6;
const SHIMMER_SECONDS = 1.6;
const STATION_FLASH_SECONDS = 2.0;
/** Leftward dust drift in pixels per second at the design size. */
const DUST_DRIFT_CALM = 2.2;
const DUST_DRIFT_GUST = 3.8;

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  warm: boolean;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
  hue: RGB;
}

/** Ambient cosmic stardust that gently streams away from a moving pointer. */
export class StardustField {
  private readonly motes: DustMote[] = [];
  private lastPointerX = 0;
  private lastPointerY = 0;
  private hadPointer = false;
  private cursor = 0;

  resize(w: number, h: number): void {
    this.motes.length = 0;
    const rnd = seededRandom(8123);
    for (let i = 0; i < MAX_STARDUST; i++) {
      const maxLife = 4 + rnd() * 5;
      this.motes.push({
        x: rnd() * w,
        y: rnd() * h,
        vx: (rnd() - 0.5) * 4,
        vy: (rnd() - 0.5) * 2.5,
        life: rnd() * maxLife,
        maxLife,
        warm: rnd() < 0.35,
      });
    }
  }

  update(dt: number, w: number, h: number, unit: number, pointer: CastPoint | null, windStrength: number): void {
    const pushRadius = 46 * unit;
    if (pointer) {
      const dx = pointer.x - this.lastPointerX;
      const dy = pointer.y - this.lastPointerY;
      if (this.hadPointer && Math.hypot(dx, dy) > 1.2 * unit) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.4;
        const speed = (16 + Math.random() * 16) * unit;
        const m = this.motes[this.cursor];
        this.cursor = (this.cursor + 1) % this.motes.length;
        m.x = pointer.x + Math.cos(angle) * 4 * unit;
        m.y = pointer.y + Math.sin(angle) * 4 * unit;
        m.vx = -Math.cos(angle) * speed * 0.65 + (Math.random() - 0.5) * 8 * unit;
        m.vy = -Math.sin(angle) * speed * 0.65 + (Math.random() - 0.5) * 8 * unit;
        m.life = 0;
        m.maxLife = 1.6 + Math.random() * 1.2;
      }
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;
    }
    this.hadPointer = pointer !== null;

    const drift = (DUST_DRIFT_CALM + (DUST_DRIFT_GUST - DUST_DRIFT_CALM) * windStrength) * unit;
    const damping = Math.exp(-1.5 * dt);
    for (const m of this.motes) {
      if (pointer) {
        const dx = m.x - pointer.x;
        const dy = m.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.5 && d < pushRadius) {
          const force = (1 - d / pushRadius) * 58 * unit * dt;
          m.vx += (dx / d) * force;
          m.vy += (dy / d) * force;
        }
      }

      // Gentle ambient cosmic drift + velocity damping.
      m.vx *= damping;
      m.vy *= damping;
      m.x += (m.vx - drift) * dt;
      m.y += m.vy * dt;
      m.life += dt;

      if (m.life >= m.maxLife || m.x < -8 || m.x > w + 8 || m.y < -8 || m.y > h + 8) {
        m.x = Math.random() * w;
        m.y = Math.random() * h;
        m.vx = (Math.random() - 0.5) * 3 * unit;
        m.vy = (Math.random() - 0.5) * 2 * unit;
        m.life = 0;
        m.maxLife = 4 + Math.random() * 4;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, tint: RGB): void {
    for (const m of this.motes) {
      const fade = Math.sin(Math.PI * Math.min(1, m.life / m.maxLife));
      if (fade < 0.08) continue;
      const x = Math.round(m.x);
      const y = Math.round(m.y);
      const c: RGB = m.warm
        ? [Math.min(255, tint[0] + 150), Math.min(255, tint[1] + 135), Math.min(255, tint[2] + 95)]
        : [Math.min(255, tint[0] + 115), Math.min(255, tint[1] + 155), Math.min(255, tint[2] + 175)];
      ctx.fillStyle = css(c, fade * 0.65);
      ctx.fillRect(x, y, 1, 1);
      if (Math.hypot(m.vx, m.vy) > 10) {
        ctx.fillStyle = css(c, fade * 0.3);
        ctx.fillRect(x - Math.sign(m.vx), y - Math.sign(m.vy), 1, 1);
      }
    }
  }
}

/** Comets launched when clicking empty space, plus planet/station shimmer timers. */
export class SpaceInteractions {
  readonly stardust = new StardustField();
  private readonly comets: Comet[] = [];

  giantShimmer = 0;
  iceMoonShimmer = 0;
  readonly moonShimmers: [number, number, number] = [0, 0, 0];
  stationFlash = 0;

  resize(w: number, h: number): void {
    this.stardust.resize(w, h);
  }

  launchComet(x: number, y: number, w: number, unit: number): void {
    if (this.comets.length >= MAX_COMETS) this.comets.shift();
    const goRight = x < w * 0.55;
    const angle = goRight ? 0.24 + Math.random() * 0.28 : Math.PI - (0.24 + Math.random() * 0.28);
    const speed = (68 + Math.random() * 28) * unit;
    const warm = Math.random() < 0.4;
    this.comets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      duration: COMET_DURATION,
      hue: warm ? [255, 224, 168] : [178, 236, 255],
    });
  }

  triggerGiantShimmer(): void {
    this.giantShimmer = SHIMMER_SECONDS;
  }

  triggerMoonShimmer(idx: 0 | 1 | 2): void {
    this.moonShimmers[idx] = SHIMMER_SECONDS;
  }

  triggerIceMoonShimmer(): void {
    this.iceMoonShimmer = SHIMMER_SECONDS;
  }

  triggerStationFlash(): void {
    this.stationFlash = STATION_FLASH_SECONDS;
  }

  update(dt: number, w: number, h: number, unit: number, pointer: CastPoint | null, windStrength: number): void {
    this.stardust.update(dt, w, h, unit, pointer, windStrength);
    this.giantShimmer = Math.max(0, this.giantShimmer - dt);
    this.iceMoonShimmer = Math.max(0, this.iceMoonShimmer - dt);
    this.stationFlash = Math.max(0, this.stationFlash - dt);
    for (let i = 0; i < 3; i++) this.moonShimmers[i] = Math.max(0, this.moonShimmers[i] - dt);

    for (let i = this.comets.length - 1; i >= 0; i--) {
      const c = this.comets[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.age >= c.duration) this.comets.splice(i, 1);
    }
  }

  drawComets(ctx: CanvasRenderingContext2D, unit: number): void {
    if (!this.comets.length) return;
    for (const c of this.comets) {
      const life01 = c.age / c.duration;
      // Fast rise within 0.15 s so clicks react immediately, then smooth tail fade.
      const envelope = Math.min(1, c.age / 0.14) * (1 - life01 * life01);
      if (envelope <= 0.02) continue;

      const hx = Math.round(c.x);
      const hy = Math.round(c.y);
      const tailLen = Math.round((16 + 14 * Math.min(1, c.age / 0.5)) * unit);
      const speed = Math.max(1, Math.hypot(c.vx, c.vy));
      const nx = -c.vx / speed;
      const ny = -c.vy / speed;

      // Tapering pixel tail behind the comet head.
      for (let i = tailLen; i >= 1; i--) {
        const k = 1 - i / tailLen;
        const tx = Math.round(c.x + nx * i);
        const ty = Math.round(c.y + ny * i);
        ctx.fillStyle = css(c.hue, envelope * k * k * 0.72);
        ctx.fillRect(tx, ty, 1, 1);
        if (i < tailLen * 0.4 && i % 2 === 0) {
          ctx.fillRect(tx, ty + 1, 1, 1);
        }
      }

      // Bright comet nucleus + 1px coma cross.
      ctx.fillStyle = css(c.hue, envelope * 0.55);
      ctx.fillRect(hx - 1, hy, 3, 1);
      ctx.fillRect(hx, hy - 1, 1, 3);
      ctx.fillStyle = css([255, 255, 255], envelope);
      ctx.fillRect(hx, hy, 1, 1);

      // Brief launch sparkle ring on click.
      if (c.age < 0.35) {
        const r = Math.round((2 + (c.age / 0.35) * 5) * unit);
        const sa = (1 - c.age / 0.35) * 0.7;
        ctx.fillStyle = css(c.hue, sa);
        ctx.fillRect(hx - r, hy, 1, 1);
        ctx.fillRect(hx + r, hy, 1, 1);
        ctx.fillRect(hx, hy - r, 1, 1);
        ctx.fillRect(hx, hy + r, 1, 1);
      }
    }
  }
}
