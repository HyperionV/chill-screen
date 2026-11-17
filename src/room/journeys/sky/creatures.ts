import type { ViewFrame } from '../../view';
import { hash, lerp } from '../noise';
import { wrap } from './chapters';
import { picture, type Sprites } from './sprites';

const BIRD_COUNT = 84;
const FLOCK_SIZE = 14;
const POINTER_RADIUS = 33;
const WHALE_CALL_PERIOD = 24;
const WHALE_CALL_LENGTH = 6;
const WHALE_ROW = 132;
const PIGEON_APPROACH_SECONDS = 24;

interface Bird { x: number; y: number; vx: number; vy: number }
interface PigeonPose { x: number; y: number; scale: number; perched: number; wet: number; letter: number }

export class Creatures {
  private readonly birds: Bird[] = [];
  private width = 0;
  private readonly visits = new Float64Array(6);
  private readonly poses: PigeonPose[] = Array.from({ length: 6 }, () => ({ x: 0, y: 0, scale: 1, perched: 0, wet: 0, letter: 0 }));
  private delivery: { x: number; y: number } | null = null;
  private startled = 0;

  resize(width: number): void {
    this.width = width;
    this.birds.length = 0;
    for (let i = 0; i < BIRD_COUNT; i++) this.birds.push({ x: hash(i + 20) * width, y: 20 + hash(i + 71) * 45, vx: 8, vy: 0 });
  }

  draw(ctx: CanvasRenderingContext2D, sprites: Sprites, frame: ViewFrame, scroll: number,
    weights: Float32Array, chapter: number, lift: number, delivery: { x: number; y: number } | null): void {
    if (delivery) {
      if (!this.delivery) this.delivery = { x: delivery.x, y: delivery.y };
      else {
        const ease = 1 - Math.exp(-frame.dt * 0.7);
        this.delivery.x = lerp(this.delivery.x, delivery.x, ease);
        this.delivery.y = lerp(this.delivery.y, delivery.y, ease);
      }
    }
    for (let i = 0; i < weights.length; i++) this.visits[i] = weights[i] > 0 ? this.visits[i] + frame.dt : 0;
    this.flock(ctx, frame, weights[2]);
    this.whales(ctx, sprites, frame.time, scroll, weights[2], lift);
    this.cloudFish(ctx, sprites, frame, weights, lift);
    this.pigeon(ctx, sprites, frame, weights, chapter);
  }

  private flock(ctx: CanvasRenderingContext2D, frame: ViewFrame, migration: number): void {
    const count = Math.round(10 + migration * (BIRD_COUNT - 10));
    ctx.fillStyle = '#526c7a';
    for (let i = 0; i < count; i++) {
      const bird = this.birds[i];
      const group = Math.floor(i / FLOCK_SIZE);
      const rank = i % FLOCK_SIZE;
      const cycle = this.width * 0.32 + frame.time * (8 + group) + group * 113;
      const leadX = wrap(cycle, this.width + 170) - 85;
      const swirl = (Math.sin(frame.time * 0.06 + group) + 1) / 2;
      const angle = rank * 0.55 + frame.time * 0.18;
      const targetX = leadX - Math.ceil(rank / 2) * 6 + Math.cos(angle) * swirl * 14;
      const targetY = 24 + group * 7 + (rank % 2 ? -1 : 1) * Math.ceil(rank / 2) * 2 + Math.sin(angle) * swirl * 12;
      let ax = (targetX - bird.x) * 0.9;
      let ay = (targetY - bird.y) * 0.9;
      // Neighbours steer together, but keep a few pixels of breathing room.
      const start = group * FLOCK_SIZE;
      let centerX = 0;
      let centerY = 0;
      let neighbours = 0;
      for (let j = start; j < Math.min(start + FLOCK_SIZE, count); j++) {
        if (i === j) continue;
        const other = this.birds[j];
        const dx = bird.x - other.x;
        const dy = bird.y - other.y;
        const distance = dx * dx + dy * dy;
        if (distance < 400) {
          centerX += other.x;
          centerY += other.y;
          neighbours++;
        }
        if (distance > 0 && distance < 25) {
          ax += dx * 3;
          ay += dy * 3;
        }
      }
      if (neighbours) {
        ax += (centerX / neighbours - bird.x) * 0.15;
        ay += (centerY / neighbours - bird.y) * 0.15;
      }
      const pointer = frame.pointer;
      if (pointer) {
        const dx = bird.x - pointer.x;
        const dy = bird.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < POINTER_RADIUS) {
          ax += (dx || 1) / Math.max(1, distance) * 120;
          ay += (dy || -1) / Math.max(1, distance) * 120;
        }
      }
      const damping = Math.exp(-frame.dt * 2);
      bird.vx = bird.vx * damping + ax * frame.dt;
      bird.vy = bird.vy * damping + ay * frame.dt;
      bird.x += Math.max(-35, Math.min(35, bird.vx)) * frame.dt;
      bird.y += Math.max(-25, Math.min(25, bird.vy)) * frame.dt;
      if (Math.abs(targetX - bird.x) > this.width * 0.8) bird.x = targetX;
      const beat = Math.sin(frame.time * 5 + i) > 0 ? -1 : 1;
      const x = Math.round(bird.x);
      const y = Math.round(bird.y);
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x - 2, y + beat, 2, 1);
      ctx.fillRect(x + 1, y + beat, 2, 1);
    }
  }

  private whales(ctx: CanvasRenderingContext2D, sprites: Sprites, time: number, scroll: number, presence: number, lift: number): void {
    if (presence < 0.01) return;
    ctx.save();
    ctx.globalAlpha = presence;
    const x = wrap(this.width * 0.8 - time * 1.5 - scroll * 0.12, this.width + 260) - 130;
    const y = WHALE_ROW + Math.sin(time * 0.15) * 5 + lift;
    picture(ctx, sprites.whale, x, y, 2);
    const call = wrap(time, WHALE_CALL_PERIOD);
    // A call travels through the cloud tops as two broken pixel rings.
    if (call < WHALE_CALL_LENGTH) {
      ctx.save();
      ctx.globalAlpha *= Math.sin(call / WHALE_CALL_LENGTH * Math.PI) * 0.5;
      ctx.fillStyle = '#e3e8dc';
      for (let ring = 0; ring < 2; ring++) {
        const radius = 24 + call * 12 + ring * 15;
        for (let i = 0; i < 64; i++) {
          const angle = i / 64 * Math.PI * 2;
          ctx.fillRect(Math.round(x + 46 + Math.cos(angle) * radius), Math.round(y + 38 + Math.sin(angle) * radius * 0.17), 3, 1);
        }
      }
      ctx.restore();
    }
    picture(ctx, sprites.whale, x + 125 + Math.sin(time * 0.35) * 4, y + 26, 0.8);
    // The calf noses toward its parent between independent little dives.
    ctx.fillStyle = '#648b9f';
    ctx.fillRect(Math.round(x + 52), Math.round(y + 37 + Math.sin(time * 0.8) * 2), 15, 2);
    ctx.restore();
  }

  private cloudFish(ctx: CanvasRenderingContext2D, sprites: Sprites, frame: ViewFrame, weights: Float32Array, lift: number): void {
    const presence = 0.25 + weights[5] * 0.75;
    ctx.save();
    ctx.globalAlpha = presence;
    for (let i = 0; i < 7; i++) {
      let x = wrap(frame.time * (2 + hash(i) * 2) + hash(i + 90) * this.width, this.width + 30) - 15;
      let y = 181 + Math.sin(frame.time * 0.7 + i) * 9 + lift;
      const pointer = frame.pointer;
      if (pointer && Math.hypot(x - pointer.x, y - pointer.y) < 24) {
        x += Math.sign(x - pointer.x || 1) * 5;
        y += 5;
      }
      const dive = Math.max(0, Math.sin(frame.time * 0.2 + i));
      ctx.save();
      ctx.globalAlpha *= 1 - dive * dive;
      picture(ctx, sprites.fish, x, y + dive * 8, 0.7 + hash(i + 7) * 0.4);
      ctx.restore();
    }
    ctx.restore();
  }

  private pose(chapter: number, time: number, age: number): PigeonPose {
    const right = this.width - 43;
    const pose = this.poses[chapter];
    pose.x = right;
    pose.y = 181;
    pose.scale = 1.5;
    pose.perched = 1;
    pose.wet = 0;
    pose.letter = 0;
    switch (chapter) {
      case 0: {
        const approach = Math.min(1, age / PIGEON_APPROACH_SECONDS);
        pose.x = lerp(this.width * 0.74, right - 24, approach) + Math.sin(time * 0.1) * 9;
        pose.y = lerp(42, 58, approach) + Math.sin(time * 0.5) * 2;
        pose.scale = lerp(0.25, 1.5, approach);
        pose.perched = 0;
        break;
      }
      case 1: {
        const arrive = Math.min(1, age / 9);
        pose.x = lerp(this.width + 12, right, arrive);
        pose.y = lerp(153, 171, arrive) + Math.sin(time * 3) * 2;
        pose.perched = 0;
        pose.letter = 1;
        break;
      }
      case 2: {
        const cycle = wrap(age, 110) / 55;
        const trip = cycle < 1 ? cycle : 2 - cycle;
        const destination = this.delivery;
        pose.x = lerp(right, destination?.x ?? this.width * 0.18, Math.min(1, trip / 0.88));
        pose.y = lerp(170, destination?.y ?? 161, trip) - Math.sin(trip * Math.PI) * 16;
        pose.scale = 1.15;
        pose.perched = trip > 0.88 ? 1 : 0;
        pose.letter = cycle < 0.88 ? 1 : 0;
        break;
      }
      case 3:
        pose.y = 177 + Math.sin(time * 0.5);
        pose.wet = 1;
        break;
      case 4:
        pose.x = right - 16;
        pose.y = 174 + Math.sin(time * 0.35) * 2;
        pose.scale = 1.4;
        break;
    }
    return pose;
  }

  private pigeon(ctx: CanvasRenderingContext2D, sprites: Sprites, frame: ViewFrame, weights: Float32Array, current: number): void {
    this.startled = Math.max(0, this.startled - frame.dt);
    const main = this.pose(current, frame.time, this.visits[current]);
    if (frame.pointer && Math.hypot(frame.pointer.x - main.x, frame.pointer.y - main.y) < 20) this.startled = 1;
    for (let chapter = 0; chapter < weights.length; chapter++) {
      if (weights[chapter] < 0.01) continue;
      const pose = this.pose(chapter, frame.time, this.visits[chapter]);
      const sleeping = chapter === 5 && this.startled === 0;
      const shake = pose.wet > 0 && wrap(frame.time, 12) < 2;
      const x = Math.round(pose.x + (shake ? Math.sin(frame.time * 9) : 0));
      const y = Math.round(pose.y - (this.startled > 0 ? 2 : 0));
      ctx.save();
      ctx.globalAlpha = weights[chapter];
      if (chapter === 4) picture(ctx, sprites.lantern, x + 5, y + 10, 1.5);
      const flying = pose.perched < 0.5 && Math.sin(frame.time * 6) > -0.3;
      picture(ctx, flying ? sprites.flying : sprites.perched, x, y, pose.scale);
      if (pose.letter) {
        ctx.fillStyle = '#e8cf92';
        ctx.fillRect(x + 9, y + 9, 5, 2);
        ctx.fillStyle = '#a67f61';
        ctx.fillRect(x + 11, y + 9, 1, 2);
      }
      if (pose.wet) {
        ctx.fillStyle = '#96b8cb';
        for (let i = 0; i < 3; i++) ctx.fillRect(x + i * 4, y + 10 + Math.round(wrap(frame.time * 6 + i * 3, 9)), 1, 2);
      }
      if (sleeping) {
        ctx.fillStyle = '#637a8e';
        ctx.fillRect(x + 9, y + 2, 3, 2);
      }
      if (this.startled > 0) {
        ctx.fillStyle = '#eef0d8';
        ctx.fillRect(x + 9, y + 3, 1, 1);
      }
      ctx.restore();
    }
  }
}
