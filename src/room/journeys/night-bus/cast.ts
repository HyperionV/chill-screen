import type { ViewFrame } from '../../view';
import { reflection } from './scenery';
import { ROAD_TOP, trafficPhase, wrap } from './route';
import { buildSprites, sprite, type Sprites } from './sprites';

type Mood = 'walk' | 'wait' | 'look';
interface Walker { walk: number; age: number; mood: Mood; tilt: number; reaction: number }
interface Vehicle { x: number; speed: number; kind: 'taxi' | 'car' | 'scooter' | 'bike'; lane: 0 | 1 }

const UMBRELLAS = ['#ff4f8b', '#32dce8', '#ffbe3b', '#6ad48a'] as const;
const CAT_ROUTINE = 36;
const CAT_REACTION = 3.5;
const CAT_COOLDOWN = 0.5;
const WALKERS = 6;
const CAT_BASES = [162, 190, 229, 184, 201, 193, 201];
const TRAFFIC_TILE = 168;

/** A small cast is kept alive at a still pace; drawing a chapter never advances its state twice. */
export class Cast {
  private readonly pictures: Sprites = buildSprites();
  private readonly walkers: Walker[] = Array.from({ length: WALKERS }, (_, i) => ({ walk: i * 62, age: i * 1.7, mood: 'walk', tilt: 0, reaction: 0 }));
  private readonly vehicles: Vehicle[] = [
    { x: 24, speed: 15, kind: 'taxi', lane: 1 },
    { x: 184, speed: 19, kind: 'scooter', lane: 1 },
    { x: 310, speed: 14, kind: 'car', lane: 1 },
    { x: 430, speed: 9, kind: 'bike', lane: 1 },
    { x: 110, speed: -16, kind: 'taxi', lane: 0 },
    { x: 360, speed: -14, kind: 'car', lane: 0 },
  ];
  private time = 0;
  private catAge = CAT_REACTION;
  private catCooldown = 0;
  private catX = 0;
  private catY = 0;
  private catVisible = false;
  private pointer: ViewFrame['pointer'] = null;

  update(dt: number, pointer: ViewFrame['pointer'], chapter: number): void {
    this.time += dt;
    this.pointer = pointer;
    this.catAge = Math.min(CAT_REACTION, this.catAge + dt);
    this.catCooldown = Math.max(0, this.catCooldown - dt);
    this.catVisible = false;
    for (let i = 0; i < this.walkers.length; i++) {
      const person = this.walkers[i];
      person.age += dt;
      person.reaction = Math.max(0, person.reaction - dt);
      if (person.age > 6 + i) {
        person.age = 0;
        person.mood = person.mood === 'walk' ? 'wait' : person.mood === 'wait' ? 'look' : 'walk';
      }
      if (person.mood === 'walk') person.walk += dt * (2 + i % 3);
      if (person.reaction === 0) person.tilt *= Math.max(0, 1 - dt * 2);
    }
    for (const car of this.vehicles) {
      if (car.speed >= 0) {
        const light = Math.floor((car.x + 24) / TRAFFIC_TILE) * TRAFFIC_TILE + 158;
        const target = car.x + car.speed * dt;
        const stopping = chapter === 0 && trafficPhase(this.time) !== 2 && car.x <= light - 24;
        car.x = stopping ? Math.min(target, light - 24) : target;
      } else {
        car.x += car.speed * dt;
      }
    }
  }

  press(x: number, y: number): boolean {
    if (!this.catVisible || Math.abs(x - this.catX) > 16 || Math.abs(y - (this.catY - 7)) > 16) return false;
    if (this.catCooldown === 0) {
      this.catAge = 0;
      this.catCooldown = CAT_COOLDOWN;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, chapter: number, w: number, scroll: number, active: boolean): void {
    const near = scroll * 0.65;
    if (chapter !== 2 && chapter !== 3 && chapter !== 5) this.people(ctx, chapter, w, near, active);
    this.traffic(ctx, chapter, w, near);
    if (chapter === 4) this.dog(ctx, w, near);
    if (chapter === 1 || chapter === 6) this.pigeons(ctx, w, near);
    if (chapter === 6) this.sweeper(ctx, w, near);
    this.cat(ctx, chapter, w, near, active);
  }

  private people(ctx: CanvasRenderingContext2D, chapter: number, w: number, offset: number, active: boolean): void {
    const count = chapter === 4 ? 2 : chapter === 6 ? 3 : WALKERS;
    for (let i = 0; i < count; i++) {
      const person = this.walkers[i];
      const waiting = (chapter === 4 && i === 0) || person.mood !== 'walk';
      const walk = chapter === 4 && i === 0 ? 0 : person.walk;
      const x = chapter === 4 && i === 0
        ? wrap(244 - offset + 30, 576) - 30
        : wrap(i * 79 + walk - offset, w + 70) - 35;
      const y = ROAD_TOP + 2 + i % 2 * 3;
      const pointer = this.pointer;
      if (active && pointer && Math.hypot(pointer.x - x, pointer.y - (y - 16)) < 32) {
        person.tilt = Math.max(-4, Math.min(4, (pointer.x - x) / 5));
        person.reaction = 1.5;
      }
      const pose = waiting ? 0 : Math.floor(this.time * 3 + i) % 2;
      sprite(ctx, this.pictures.person[pose], x, y);
      // 21px-wide stepped canopy at y - 22 makes each commuter 22 stage pixels tall.
      const ux = Math.round(x + person.tilt);
      const uy = y - 22;
      const canopy = UMBRELLAS[i % UMBRELLAS.length];
      ctx.fillStyle = canopy;
      ctx.fillRect(ux - 4, uy, 9, 1);
      ctx.fillRect(ux - 7, uy + 1, 15, 2);
      ctx.fillRect(ux - 10, uy + 3, 21, 2);
      ctx.fillStyle = '#ece8da';
      ctx.fillRect(ux - 3, uy, 4, 1);
      ctx.fillStyle = '#6b6573';
      ctx.fillRect(ux, uy + 5, 1, 9);
      ctx.fillRect(ux - 1, uy + 13, 2, 1);
      if (person.mood === 'look') {
        ctx.fillStyle = '#dfbfa8';
        ctx.fillRect(Math.round(x + 2), y - 12, 1, 2);
      }
      reflection(ctx, x, y + 2, canopy, 22, 8, this.time, 0.28);
    }
  }

  private traffic(ctx: CanvasRenderingContext2D, chapter: number, w: number, offset: number): void {
    if (chapter === 3 || chapter === 5 || chapter === 6) return;
    const span = Math.ceil((w + TRAFFIC_TILE) / TRAFFIC_TILE) * TRAFFIC_TILE;
    for (const car of this.vehicles) {
      if (chapter === 4 && car.kind !== 'bike') continue;
      if (chapter === 1 && car.kind === 'car') continue;
      const x = wrap(car.x - offset + 40, span) - 40;
      const y = car.lane === 0 ? 228 : 248;
      const right = car.speed >= 0;
      const image = car.kind === 'taxi'
        ? (right ? this.pictures.taxiRight : this.pictures.taxiLeft)
        : car.kind === 'car'
          ? (right ? this.pictures.carRight : this.pictures.carLeft)
          : car.kind === 'scooter'
            ? (right ? this.pictures.scooterRight : this.pictures.scooterLeft)
            : this.pictures.bike;
      sprite(ctx, image, x, y);

      if (car.kind === 'bike') {
        const frontX = x + 9;
        ctx.fillStyle = 'rgba(255,240,156,0.24)';
        ctx.fillRect(Math.round(frontX), y - 8, 8, 3);
        reflection(ctx, frontX, y + 1, '#fff09c', 18, 4, this.time, 0.34);
        continue;
      }

      const dir = right ? 1 : -1;
      const halfW = Math.floor(image.width / 2);
      const frontX = Math.round(x + dir * halfW);
      const rearX = Math.round(x - dir * halfW);

      // Warm headlight beam cast onto the wet asphalt ahead.
      ctx.fillStyle = 'rgba(255,238,150,0.16)';
      ctx.fillRect(dir > 0 ? frontX : frontX - 20, y - 7, 20, 6);
      ctx.fillStyle = 'rgba(255,246,196,0.28)';
      ctx.fillRect(dir > 0 ? frontX : frontX - 9, y - 6, 9, 3);
      reflection(ctx, frontX + dir * 2, y + 1, '#ffe88a', 24, 7, this.time, 0.42);

      // Red tail-light bokeh halo behind the rear lamps.
      const ty = y - 6;
      ctx.fillStyle = 'rgba(255,48,80,0.26)';
      ctx.fillRect(rearX - 3, ty - 2, 7, 5);
      ctx.fillRect(rearX - 2, ty - 3, 5, 7);
      ctx.fillStyle = 'rgba(255,96,124,0.44)';
      ctx.fillRect(rearX - 1, ty - 1, 3, 3);
      reflection(ctx, rearX, y + 1, '#ff3b58', 26, 7, this.time, 0.45);
    }
  }

  private cat(ctx: CanvasRenderingContext2D, chapter: number, w: number, offset: number, active: boolean): void {
    const routine = wrap(this.time, CAT_ROUTINE);
    const outward = routine >= 25 && routine < 27;
    const returning = routine >= 33 && routine < 35;
    const jump = chapter === 3 && (outward || returning);
    const jumpT = outward ? (routine - 25) / 2 : returning ? (routine - 33) / 2 : 0;
    const across = routine < 25 || routine >= 35 ? 0 : outward ? jumpT : returning ? 1 - jumpT : 1;
    const baseX = Math.round(wrap(w * 0.72 - offset + 64, w + 128) - 64);
    const x = baseX + (chapter === 3 ? Math.round(across * 29) : 0);
    let y = CAT_BASES[chapter];
    if (jump) y -= Math.round(Math.sin(jumpT * Math.PI) * 14);
    const reacting = this.catAge < CAT_REACTION;
    const sleeping = chapter === 6 && !reacting;
    const washing = chapter === 3 && routine >= 10 && routine < 18;
    const stretching = chapter === 3 && routine >= 18 && routine < 25;
    const pose = sleeping ? 3 : reacting ? 4 : jump || stretching ? 2 : washing ? Math.floor(this.time * 2) % 2 : 0;
    ctx.fillStyle = chapter === 4 ? '#6d5e62' : '#535260';
    if (chapter === 3) {
      ctx.fillStyle = '#202a36';
      ctx.fillRect(baseX + 12, 183, 15, 24);
      ctx.fillStyle = '#535260';
      ctx.fillRect(baseX - 23, 184, 35, 3);
      ctx.fillRect(baseX + 27, 184, 33, 3);
      ctx.fillStyle = '#333a48';
      ctx.fillRect(baseX - 21, 187, 31, 20);
      ctx.fillRect(baseX + 29, 187, 29, 20);
    } else if (chapter === 5) {
      ctx.fillRect(baseX - 4, 193, 8, 23);
    } else {
      ctx.fillRect(baseX - 18, CAT_BASES[chapter], 37, 3);
      if (chapter === 4) {
        ctx.fillRect(baseX - 18, 204, 37, 10);
        ctx.fillStyle = '#85706e';
        ctx.fillRect(baseX - 18, 207, 37, 1);
        ctx.fillRect(baseX - 18, 212, 37, 1);
        for (let brick = 0; brick < 4; brick++) ctx.fillRect(baseX - 15 + brick * 9, 204, 1, 9);
      } else if (chapter !== 2) {
        ctx.fillRect(baseX - 15, CAT_BASES[chapter] + 3, 2, 12);
        ctx.fillRect(baseX + 13, CAT_BASES[chapter] + 3, 2, 12);
      }
      if (chapter === 1) {
        ctx.fillStyle = '#ba8385';
        for (let stripe = 0; stripe < 5; stripe++) ctx.fillRect(baseX - 17 + stripe * 8, 190, 4, 3);
      }
    }
    sprite(ctx, this.pictures.cat[pose], x, y);
    if (reacting) {
      if (this.catAge > 0.45 && this.catAge < 1.25) {
        ctx.fillStyle = '#665c60';
        ctx.fillRect(x - 4, y - 10, 8, 1);
      }
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = Math.min(1, (CAT_REACTION - this.catAge) * 0.9);
      sprite(ctx, this.pictures.heart, x, y - 16 - this.catAge * 5);
      ctx.globalAlpha = prevAlpha;
    }
    if (chapter === 2) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.translate(0, 460);
      ctx.scale(1, -1);
      sprite(ctx, this.pictures.cat[pose], x, y);
      ctx.restore();
    }
    if (active) {
      this.catX = x;
      this.catY = y;
      this.catVisible = true;
    }
    if (chapter === 6 && sleeping && Math.floor(this.time / 3) % 2 === 0) {
      ctx.fillStyle = '#b4b0b1';
      ctx.fillRect(x + 10, y - 7, 2, 1);
    }
    if (chapter === 2) {
      ctx.fillStyle = '#8a8a94';
      ctx.fillRect(Math.round(wrap(offset, w)), 229, 3, 1);
    }
  }

  private dog(ctx: CanvasRenderingContext2D, w: number, offset: number): void {
    const phase = wrap(this.time, 22);
    const walking = phase > 11 && phase < 18;
    const stroll = walking ? Math.sin((phase - 11) / 7 * Math.PI) * 9 : 0;
    const x = wrap(210 - offset + stroll, w + 30) - 15;
    const pointer = this.pointer;
    const looking = pointer && Math.hypot(pointer.x - x, pointer.y - 210) < 32;
    sprite(ctx, this.pictures.dog[looking || walking || phase < 5 ? 0 : 1], x, 213 - (walking ? Math.floor(this.time * 3) % 2 : 0));
    if (looking) {
      ctx.fillStyle = '#d4b89c';
      ctx.fillRect(Math.round(x + 9), 203, 1, 3);
    }
  }

  private pigeons(ctx: CanvasRenderingContext2D, w: number, offset: number): void {
    for (let i = 0; i < 4; i++) {
      const phase = wrap(this.time + i * 3, 17);
      const x = wrap(60 + i * 16 - offset + Math.sin(phase / 17 * Math.PI * 2) * 3, w + 30) - 15;
      const pointer = this.pointer;
      const near = pointer && Math.hypot(pointer.x - x, pointer.y - 211) < 26;
      const y = 212 - (near ? Math.round(Math.abs(Math.sin(this.time * 3 + i)) * 4) : 0);
      sprite(ctx, this.pictures.pigeon[phase > 6 && phase < 13 && !near ? 1 : 0], x, y);
    }
  }

  private sweeper(ctx: CanvasRenderingContext2D, w: number, offset: number): void {
    const x = wrap(w * 0.32 - offset + this.time * 0.6, w + 40) - 20;
    const stroke = Math.sin(this.time * 1.4) * 3;
    sprite(ctx, this.pictures.person[Math.floor(this.time / 5) % 2], x, 220);
    ctx.fillStyle = '#cfb788';
    ctx.fillRect(Math.round(x + 5), 204, 1, 16);
    ctx.fillStyle = '#aba688';
    ctx.fillRect(Math.round(x + 3 + stroke), 219, 8, 2);
    ctx.fillStyle = '#7e8c98';
    ctx.fillRect(Math.round(x + 9 + stroke), 223, 10, 1);
    reflection(ctx, x, 222, '#8ea89f', 16, 4, this.time, 0.3);
  }
}
