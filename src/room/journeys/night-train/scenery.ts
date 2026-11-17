import { drawText } from '../../../render/pixel-font';
import { hash, noise, ramp } from '../noise';
import { sprite, type Sprites } from './sprites';
import { farms, fences, fields, foregroundPines, mountains, passCutting } from './country';
import { leaveRadioClear } from './radio-space';

const GROUND = 183;
const POST_SPACING = 115;
const TREE_SPACING = 31;
const MOUNTAIN_HEIGHT = [12, 16, 39, 71, 35, 24, 37];

export interface SceneryFrame {
  width: number;
  scroll: number;
  time: number;
  chapter: number;
  progress: number;
  alarm: number;
  pointer: { x: number; y: number } | null;
}

export class Scenery {
  private wave = 0;
  private deerFlight = 0;
  private deerOffset = 0;

  update(dt: number, alarm: number): void {
    this.wave = Math.max(0, this.wave - dt);
    this.deerFlight = Math.max(0, this.deerFlight - dt);
    if (alarm > 0.8) this.deerFlight = 3;
    this.deerOffset = this.deerFlight > 0 ? Math.min(64, this.deerOffset + dt * 15) : Math.max(0, this.deerOffset - dt * 2);
  }

  draw(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    const { width: w, chapter: c, scroll: s, time } = f;
    if (c === 4) {
      this.tunnel(ctx, f);
      return;
    }
    // Separate ridge, hill, village, trees and track speeds give the country its depth.
    if (c >= 1 && c <= 3) mountains(ctx, f, art);
    else for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? '#74869b' : '#85969e';
      const speed = layer === 0 ? 0.035 : 0.11;
      const height = (MOUNTAIN_HEIGHT[c] ?? 20) * (layer === 0 ? 1 : 0.36);
      for (let x = 0; x < w; x++) {
        const rise = noise((x + s * speed) * (layer === 0 ? 0.009 : 0.024));
        const y = Math.round(173 + layer * 7 - rise * height);
        ctx.fillRect(x, y, 1, GROUND - y + 1);
        if (layer === 0 && rise > 0.55) {
          ctx.fillStyle = '#c6d2d6';
          ctx.fillRect(x, y, 1, 2 + Math.round(rise * 5));
          ctx.fillStyle = '#74869b';
        }
      }
    }
    ctx.fillStyle = '#c7d3d7';
    ctx.fillRect(0, GROUND, w, 87);
    ctx.fillStyle = '#b1c2cc';
    for (let row = 191; row < 270; row += 9) {
      const offset = s * (0.25 + (row - GROUND) / 70);
      for (let k = Math.floor(offset / 35); k * 35 - offset < w; k++) {
        const x = Math.round(k * 35 - offset + hash(k + row) * 12);
        ctx.fillRect(x, row, 5 + Math.round(hash(k) * 9), 1);
      }
    }
    if (c >= 1 && c <= 3) fields(ctx, f);
    ctx.save();
    leaveRadioClear(ctx, w, 270);
    if (c === 0) this.city(ctx, f);
    if (c >= 1 && c <= 3) {
      farms(ctx, f, art);
    }
    if (c === 2 || c === 6) this.river(ctx, f);
    if (c === 2 || c === 3 || c === 6) this.pines(ctx, f, art);
    if (c === 5) this.station(ctx, f, art);
    if (c === 1) this.crossing(ctx, f, art);
    if (c === 6) this.farm(ctx, f, art);
    if (c === 0) this.person(ctx, w * 0.7 + Math.sin(s * 0.003) * w * 0.14, 229, 1.5, f, art);
    if (c === 2) this.deer(ctx, f, art);
    if (c >= 1 && c <= 3) fences(ctx, f);
    if (c === 3) passCutting(ctx, f);
    if (c === 1 || c === 2 || c === 3) this.poles(ctx, f, art);
    if (c !== 5) this.signal(ctx, f);
    if (c >= 1 && c <= 3) foregroundPines(ctx, f, art);
    ctx.fillStyle = '#586774';
    ctx.fillRect(0, 257, w, 2);
    ctx.fillStyle = '#8a9aab';
    ctx.fillRect(0, 260, w, 1);
    for (let k = Math.floor(s * 2 / 18); k * 18 - s * 2 < w; k++) {
      ctx.fillStyle = '#6a7885';
      ctx.fillRect(Math.round(k * 18 - s * 2), 263, 4, 7);
    }
    // A few birds rest, then lift away when the whistle sounds.
    for (let i = 0; i < 4; i++) {
      const flight = Math.max(f.alarm, this.deerFlight / 3);
      const x = Math.round(w * 0.24 + i * 9 + Math.sin(time * 0.5 + i) * 4 + flight * 28);
      const y = Math.round(176 - flight * (28 + i * 6));
      ctx.fillStyle = '#3e505b';
      ctx.fillRect(x, y, 3, 1);
      ctx.fillRect(x - 1, y - (Math.sin(time * 5 + i) > 0 ? 1 : -1), 1, 1);
      ctx.fillRect(x + 3, y - 1, 1, 1);
    }
    ctx.restore();
  }

  private building(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, seed: number): void {
    x = Math.round(x);
    ctx.fillStyle = '#4a5a69';
    ctx.fillRect(x, y - height, width, height);
    ctx.fillStyle = '#344653';
    ctx.fillRect(x + width - 3, y - height, 3, height);
    ctx.fillStyle = '#e0e6df';
    ctx.fillRect(x - 2, y - height - 2, width + 4, 2);
    for (let row = y - height + 6; row < y - 4; row += 10) {
      for (let col = 4; col < width - 4; col += 9) {
        ctx.fillStyle = hash(seed + row + col) > 0.3 ? '#efc88a' : '#314351';
        ctx.fillRect(x + col, row, 3, 4);
      }
    }
    ctx.fillStyle = '#354550';
    ctx.fillRect(x + 6, y - height - 7, 4, 5);
  }

  private city(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
    for (let layer = 0; layer < 2; layer++) {
      const offset = f.scroll * (0.16 + layer * 0.23);
      const spacing = 42 + layer * 17;
      for (let k = Math.floor(offset / spacing) - 1; k * spacing - offset < f.width; k++) {
        const x = k * spacing - offset;
        const y = 187 + layer * 17;
        const height = 18 + Math.round(hash(k + layer * 88) * 23);
        this.building(ctx, x, y, spacing - 6, height, k);
        this.steam(ctx, x + 8, y - height - 9, f.time + k, 0.35);
      }
    }
    ctx.fillStyle = '#485866';
    ctx.fillRect(0, 205, f.width, 4);
    for (let x = 0; x < f.width; x += 64) ctx.fillRect(x, 209, 6, 23);
    const tram = Math.round(((f.time * 5 - f.scroll * 0.3) % (f.width + 100) + f.width + 100) % (f.width + 100) - 60);
    ctx.fillStyle = '#a66d54';
    ctx.fillRect(tram, 193, 55, 11);
    ctx.fillStyle = '#ffda92';
    for (let x = 4; x < 52; x += 8) ctx.fillRect(tram + x, 195, 5, 4);
    this.platformLamps(ctx, f.scroll, f.width);
  }

  private river(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
    for (let x = 0; x < f.width; x++) {
      const y = Math.round(192 + Math.sin((x + f.scroll * 0.24) * 0.014) * 7);
      ctx.fillStyle = f.chapter === 2 ? '#98b8c7' : '#879fac';
      ctx.fillRect(x, y, 1, 15);
      ctx.fillStyle = '#e1e8e5';
      if (x % 11 < 5) ctx.fillRect(x, y + 3 + Math.round(Math.sin(f.time + x * 0.03)), 1, 1);
    }
    if (f.chapter === 2) {
      ctx.fillStyle = '#677c89';
      ctx.fillRect(0, 207, f.width, 4);
      ctx.fillStyle = '#e3eded';
      ctx.fillRect(0, 206, f.width, 1);
      ctx.fillStyle = '#677c89';
      for (let x = -Math.round(f.scroll % 33); x < f.width; x += 33) {
        ctx.fillRect(x, 196, 2, 31);
        ctx.fillRect(x, 198, 28, 1);
        for (let d = 0; d < 26; d++) ctx.fillRect(x + d, 199 + Math.round(d * 0.25), 1, 1);
      }
    }
  }

  private pines(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    for (let layer = 0; layer < 2; layer++) {
      const speed = layer === 0 ? 0.32 : 0.75;
      const offset = f.scroll * speed;
      for (let k = Math.floor(offset / TREE_SPACING) - 1; k * TREE_SPACING - offset < f.width + 20; k++) {
        if (hash(k + layer) < (f.chapter === 6 ? 0.7 : 0.23)) continue;
        const x = k * TREE_SPACING - offset;
        const y = layer === 0 ? 187 : 221 + hash(k + 7) * 10;
        const sway = Math.round(Math.sin(f.time * 0.7 + k) * 1);
        sprite(ctx, art.pine, x + sway, y, layer === 0 ? 0.8 : 1.7);
      }
    }
  }

  private person(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, f: SceneryFrame, art: Sprites): void {
    if (x < -20 || x > f.width + 20) return;
    if (f.pointer && Math.abs(f.pointer.x - x) < 14 * size && Math.abs(f.pointer.y - y + 9 * size) < 19 * size) this.wave = 2.4;
    const walking = f.chapter === 5 && Math.sin(f.time * 0.12) > 0.25 && this.wave === 0;
    const bob = walking ? Math.round(Math.sin(f.time * 3)) : 0;
    sprite(ctx, art.master, x, y + bob, size);
    ctx.save();
    ctx.globalAlpha = 0.22;
    const lanternX = Math.round(x + 5 * size);
    const lanternY = Math.round(y - 4 * size + bob);
    ctx.drawImage(art.lanternGlow, lanternX - 7, lanternY - 7);
    ctx.restore();
    const arm = this.wave > 0 || f.chapter === 1;
    if (arm) {
      ctx.fillStyle = '#344b53';
      const lift = Math.round(Math.sin(f.time * 4) * size * 2);
      ctx.fillRect(Math.round(x - 7 * size), Math.round(y - 9 * size + lift), Math.max(1, Math.round(4 * size)), Math.max(1, Math.round(2 * size)));
      ctx.fillStyle = '#e0dcd0';
      ctx.fillRect(Math.round(x - 8 * size), Math.round(y - 11 * size + lift), Math.max(1, Math.round(2 * size)), Math.max(1, Math.round(3 * size)));
    }
    ctx.fillStyle = '#ffe1a0';
    ctx.fillRect(Math.round(x + 4 * size), Math.round(y - 5 * size + bob), Math.max(1, Math.round(size * 2)), Math.max(1, Math.round(size * 2)));
  }

  private crossing(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    // A long roadside view keeps the crossing readable even when travel is paused.
    const x = Math.round(f.width * 0.80 + Math.sin(f.scroll * 0.002) * f.width * 0.05);
    ctx.fillStyle = '#7c8b96';
    ctx.fillRect(x - 12, 185, 26, 66);
    ctx.fillStyle = '#dadcd3';
    ctx.fillRect(x - 40, 220, 83, 3);
    ctx.fillStyle = '#aa6258';
    for (let k = 0; k < 8; k++) ctx.fillRect(x - 40 + k * 11, 220, 5, 3);
    ctx.fillStyle = '#dadcd3';
    ctx.fillRect(x - 40, 233, 83, 3);
    ctx.fillStyle = '#aa6258';
    for (let k = 0; k < 8; k++) ctx.fillRect(x - 40 + k * 11, 233, 5, 3);
    ctx.fillStyle = '#43545f';
    ctx.fillRect(x + 35, 197, 3, 34);
    ctx.fillRect(x + 29, 200, 15, 6);
    ctx.fillStyle = Math.sin(f.time * Math.PI) > 0 ? '#e18a76' : '#864f50';
    ctx.fillRect(x + 30, 201, 3, 3);
    ctx.fillStyle = Math.sin(f.time * Math.PI) <= 0 ? '#e18a76' : '#864f50';
    ctx.fillRect(x + 39, 201, 3, 3);
    ctx.fillStyle = '#b99b66';
    ctx.fillRect(x + 34 + Math.round(Math.sin(f.time * 2) * 2), 193, 6, 4);
    ctx.fillStyle = '#71545a';
    ctx.fillRect(x - 4, 199, 15, 8);
    ctx.fillRect(x - 1, 195, 9, 5);
    ctx.fillStyle = '#eed8ab';
    ctx.fillRect(x - 4, 204, 2, 2);
    ctx.fillRect(x + 9, 204, 2, 2);
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffe8b7';
    ctx.fillRect(x - 7, 206, 5, 12);
    ctx.fillRect(x + 8, 206, 5, 12);
    ctx.restore();
    this.person(ctx, x + 54, 231, 1.5, f, art);
    // The waiting passenger can wave back independently of the moving train.
    this.person(ctx, x - 22, 213, 1, f, art);
  }

  private station(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    const arrive = 1 - ramp(0, 0.13, f.progress);
    const depart = ramp(0.82, 1, f.progress);
    const x = Math.round(f.width * 0.52 + arrive * f.width * 0.55 - depart * f.width * 0.95);
    this.building(ctx, x - 86, 214, 175, 49, 99);
    ctx.fillStyle = '#33434e';
    ctx.fillRect(x - 96, 161, 195, 5);
    ctx.fillStyle = '#e9e9dd';
    ctx.fillRect(x - 97, 159, 197, 2);
    ctx.fillStyle = '#263b46';
    ctx.fillRect(x - 31, 177, 64, 10);
    drawText(ctx, 'PINE HOLLOW', x - 20, 180, '#e3dcc3');
    ctx.fillStyle = '#e5ddc0';
    ctx.fillRect(x + 5, 191, 9, 9);
    ctx.fillStyle = '#40505a';
    ctx.fillRect(x + 9, 193, 1, 4);
    ctx.fillRect(x + 9, 196, 3, 1);
    ctx.fillStyle = '#8f8171';
    ctx.fillRect(x - 72, 222, 34, 3);
    ctx.fillRect(x - 70, 217, 30, 2);
    ctx.fillRect(x - 70, 225, 2, 6);
    ctx.fillRect(x - 42, 225, 2, 6);
    ctx.fillStyle = '#a3b0b7';
    ctx.fillRect(0, 235, f.width, 20);
    ctx.fillStyle = '#e3e6de';
    ctx.fillRect(0, 234, f.width, 2);
    const walk = Math.sin(f.time * 0.12) * 9;
    this.person(ctx, x + 48 + walk, 233, 1.55, f, art);
    const dogNear = f.pointer && Math.abs(f.pointer.x - x + 52) < 23 && Math.abs(f.pointer.y - 230) < 18;
    sprite(ctx, art.dog, x - 52, 232, 0.9);
    ctx.fillStyle = '#c3ab87';
    if (dogNear || f.alarm > 0) ctx.fillRect(x - 47, 224, 2, 1);
    else if (Math.sin(f.time * 0.7) > 0) ctx.fillRect(x - 56, 226, 4, 1);
    this.steam(ctx, x + 92, 232, f.time, 1);
    this.platformLamps(ctx, -x, f.width);
  }

  private farm(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    const x = Math.round(f.width * 0.65 - f.scroll * 0.3 % (f.width + 200) + 100);
    this.building(ctx, x - 18, 202, 56, 22, 41);
    ctx.fillStyle = '#9e8070';
    for (let i = 0; i < 10; i++) ctx.fillRect(x - 23 + i * 3, 180 - i, 66 - i * 6, 1);
    this.steam(ctx, x - 7, 176, f.time, 0.7);
    ctx.fillStyle = '#817d70';
    ctx.fillRect(x + 45, 218, 36, 2);
    ctx.fillRect(x + 45, 212, 2, 17);
    ctx.fillRect(x + 79, 212, 2, 17);
    this.person(ctx, f.width * 0.73 + Math.sin(f.scroll * 0.003) * 20, 229, 1.5, f, art);
  }

  private deer(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    for (let i = 0; i < 3; i++) {
      const x = f.width * 0.56 + i * 33 + Math.sin(f.scroll * 0.003) * 22;
      const near = f.pointer && Math.abs(f.pointer.x - x - this.deerOffset) < 30 && Math.abs(f.pointer.y - 222 + i * 3) < 24;
      if (near) this.deerFlight = 3;
      const flight = this.deerFlight;
      const grazing = flight === 0 && Math.sin(f.time * 0.4 + i) > 0.2;
      sprite(ctx, art.deer, x + this.deerOffset, 232 - i * 3 - (flight > 0 ? Math.round(Math.abs(Math.sin(f.time * 7)) * 3) : 0), 1.5);
      if (f.alarm > 0) {
        // A raised head reads immediately before the small retreat begins.
        ctx.fillStyle = '#c7ae8d';
        ctx.fillRect(Math.round(x + this.deerOffset + 5), 210 - i * 3, 3, 6);
        ctx.fillRect(Math.round(x + this.deerOffset + 6), 208 - i * 3, 5, 3);
      }
      if (grazing) {
        ctx.fillStyle = '#a98668';
        ctx.fillRect(Math.round(x + 7), 225 - i * 3, 3, 5);
      }
    }
  }

  private poles(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
    const offset = f.scroll * 1.5;
    for (let k = Math.floor(offset / POST_SPACING) - 1; k * POST_SPACING - offset < f.width + POST_SPACING; k++) {
      const x = Math.round(k * POST_SPACING - offset);
      ctx.fillStyle = '#59636a';
      ctx.fillRect(x, 157, 3, 96);
      ctx.fillRect(x - 9, 161, 21, 2);
      ctx.fillStyle = '#6e7a82';
      for (let d = 0; d < POST_SPACING; d += 2) {
        const y = 162 + Math.round(Math.sin(d / POST_SPACING * Math.PI) * 9);
        ctx.fillRect(x + d, y, 2, 1);
      }
      if (k % 4 === 0) {
        const fly = this.deerFlight > 0 || (f.pointer !== null && Math.abs(f.pointer.x - x) < 22 && Math.abs(f.pointer.y - 153) < 20);
        sprite(ctx, art.owl, x + (fly ? 15 : 0), 157 - (fly ? 12 : 0));
        if (!fly && Math.sin(f.time * 0.6) > 0.98) {
          ctx.fillStyle = '#ada995';
          ctx.fillRect(x - 1, 151, 3, 1);
        }
      }
      ctx.fillStyle = '#7a858b';
      ctx.fillRect(x + 42, 239, 2, 16);
      ctx.fillRect(x + 42, 244, 34, 1);
    }
  }

  private signal(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
    const x = Math.round(f.width - (f.scroll * 1.1 % (f.width + 230)));
    ctx.fillStyle = '#3e505c';
    ctx.fillRect(x, 202, 2, 48);
    ctx.fillRect(x - 3, 194, 8, 14);
    ctx.fillStyle = '#be7766';
    ctx.fillRect(x - 1, 197, 3, 3);
    ctx.fillStyle = '#96bf99';
    ctx.fillRect(x - 1, 203, 3, 3);
  }

  private platformLamps(ctx: CanvasRenderingContext2D, offset: number, width: number): void {
    for (let k = Math.floor(offset / 110) - 1; k * 110 - offset < width; k++) {
      const x = Math.round(k * 110 - offset);
      ctx.fillStyle = '#4d5c64';
      ctx.fillRect(x, 184, 2, 49);
      ctx.fillRect(x - 5, 183, 12, 2);
      ctx.fillStyle = '#f5d7a0';
      ctx.fillRect(x - 4, 185, 10, 3);
    }
  }

  steam(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, strength: number): void {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const age = (time * 0.22 + i / 7) % 1;
      ctx.globalAlpha = (1 - age) * 0.35 * strength;
      ctx.fillStyle = '#e2e7e6';
      const size = 3 + Math.round(age * 10);
      ctx.fillRect(Math.round(x + Math.sin(i + time * 0.3) * age * 10 - size / 2), Math.round(y - age * 32), size, Math.max(2, Math.round(size * 0.5)));
    }
    ctx.restore();
  }

  private tunnel(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
    ctx.fillStyle = '#070c13';
    ctx.fillRect(0, 0, f.width, 270);
    ctx.fillStyle = '#10191f';
    ctx.fillRect(0, 218, f.width, 52);
    ctx.save();
    leaveRadioClear(ctx, f.width, 270);
    const offset = f.scroll * 2;
    for (let k = Math.floor(offset / 145); k * 145 - offset < f.width + 12; k++) {
      const x = Math.round(k * 145 - offset);
      ctx.fillStyle = '#19242b';
      ctx.fillRect(x - 2, 46, 4, 191);
      ctx.fillStyle = '#9a8563';
      ctx.fillRect(x - 3, 54, 7, 3);
      ctx.fillStyle = '#cfb887';
      ctx.fillRect(x - 1, 55, 3, 1);
    }
    ctx.restore();
  }
}


