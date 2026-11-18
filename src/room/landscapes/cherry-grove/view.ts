import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hourNow } from '../../../scene/clock';
import type { Look } from '../../../wallpapers/look';
import { ChapterTitle } from '../../journeys/chapter-title';
import { ramp } from '../../journeys/noise';
import { Route } from '../../journeys/route';
import type { NightSky } from '../../night-sky';
import { SkyDome, type SkyState } from '../../sky';
import type { OutsideView, ViewFrame } from '../../view';
import { GroveInteractions } from './interactions';
import { GroveLife } from './life';
import { CHAPTERS, DESIGN_HEIGHT, DISSOLVE_SECONDS, GROUND_DEPTH, SCENES, SCENE_SECONDS, type Point } from './scenes';
import { buildScenery, drawWheel, type Scenery } from './scenery';
import { buildSprites, type Sprites } from './sprites';

const HORIZON = 0.65;
const PARALLAX_X = 3;
const PARALLAX_Y = 1.5;
const SWAY_STRIP = 5;
const NIGHT_SHADE = 0.53;
const SUNSET_SHADE = 0.17;
const GROVE_LIGHT: RGB = [181, 161, 173];
const NIGHT_LIGHT: RGB = [32, 40, 77];
const DUSK_ROSE: RGB = [224, 115, 143];
const CLOCK_LEFT = 0.30;
const CLOCK_RIGHT = 0.70;
const luma = (color: RGB): number => (color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722) / 255;

export class CherryGrove implements OutsideView {
  private width = 0;
  private height = 0;
  private designWidth = 1;
  private unit = 1;
  private parallaxX = 0;
  private parallaxY = 0;
  private activeChapter = 0;
  private readonly route = new Route('landscape-cherry-grove', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly dome: SkyDome;
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [195, 169, 175] };
  private readonly sky = memoryCanvas(1, 1);
  private readonly land = memoryCanvas(1, 1);
  private readonly picture = memoryCanvas(1, 1);
  private readonly nextPicture = memoryCanvas(1, 1);
  private readonly life = new GroveLife();
  private readonly interactions = new GroveInteractions();
  private readonly pointer: Point = { x: 0, y: 0 };
  private assets: Sprites | null = null;
  private scenery: Scenery[] = [];

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
  }

  resize(w: number, h: number): void {
    this.width = Math.max(0, Math.round(w));
    this.height = Math.max(0, Math.round(h));
    if (this.width === 0 || this.height === 0) return;
    this.unit = this.height / DESIGN_HEIGHT;
    this.designWidth = Math.max(1, Math.round(this.width / this.unit));
    this.dome.resize(this.width, this.height);
    this.sky.canvas.width = this.width;
    this.sky.canvas.height = this.height;
    for (const buffer of [this.land, this.picture, this.nextPicture]) {
      buffer.canvas.width = this.designWidth;
      buffer.canvas.height = DESIGN_HEIGHT;
      buffer.ctx.imageSmoothingEnabled = false;
    }
    this.assets ??= buildSprites();
    this.scenery = buildScenery(this.designWidth, this.assets);
    this.interactions.resize(this.designWidth);
    this.parallaxX = 0;
    this.parallaxY = 0;
  }

  press(x: number, y: number): void {
    if (!this.assets || this.width === 0 || this.height === 0) return;
    this.interactions.press(x * this.designWidth / this.width, y / this.unit, this.activeChapter, this.parallaxX, this.parallaxY, this.life);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    if (!this.assets || this.width === 0 || this.height === 0) return this.look;
    const dt = Math.min(0.1, Math.max(0, frame.dt));
    this.route.advance(dt, 1);
    const now = this.route.now;
    const fade = ramp(SCENE_SECONDS - DISSOLVE_SECONDS, SCENE_SECONDS, now.t * SCENE_SECONDS);
    this.activeChapter = fade > 0.5 ? now.next : now.index;
    let pointer: Point | null = null;
    if (frame.pointer) {
      this.pointer.x = frame.pointer.x * this.designWidth / this.width;
      this.pointer.y = frame.pointer.y / this.unit;
      pointer = this.pointer;
    }
    const targetX = pointer ? (pointer.x / this.designWidth - 0.5) * PARALLAX_X * 2 : 0;
    const targetY = pointer ? (pointer.y / DESIGN_HEIGHT - 0.5) * PARALLAX_Y * 2 : 0;
    this.parallaxX += (targetX - this.parallaxX) * Math.min(1, dt * 3);
    this.parallaxY += (targetY - this.parallaxY) * Math.min(1, dt * 3);
    this.interactions.update(dt, frame.time, pointer);
    this.life.update(dt, frame.time, this.designWidth, this.activeChapter, pointer);
    const state = this.dome.stateAt(hourNow());
    this.updateLook(state);
    this.dome.draw(this.sky.ctx, state, frame, this.look);
    this.render(this.picture.ctx, now.index, state, frame.time, this.assets);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.picture.canvas, 0, 0, this.width, this.height);
    if (fade > 0) {
      this.render(this.nextPicture.ctx, now.next, state, frame.time, this.assets);
      ctx.globalAlpha = fade;
      ctx.drawImage(this.nextPicture.canvas, 0, 0, this.width, this.height);
    }
    ctx.restore();
    this.title.draw(ctx, dt, this.width, this.height, CHAPTERS[this.activeChapter].name);
    return this.look;
  }

  private updateLook(state: SkyState): void {
    const { sky, day, sun } = state;
    const night = 1 - day;
    const air = mix(sky.zenith, sky.horizon, 0.55);
    const grove = mix(GROVE_LIGHT, NIGHT_LIGHT, night * NIGHT_SHADE);
    this.look.mean = luma(air) * 0.4 + luma(grove) * 0.6;
    this.look.night = night;
    this.look.tint = mix(air, grove, 0.6);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.65, color: sky.light } : null;
  }

  private layer(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, depth: number, time: number): void {
    const x = Math.round(this.parallaxX * depth + Math.sin(time * 0.14) * depth * 0.4);
    const y = Math.round(this.parallaxY * depth);
    ctx.drawImage(image, x, y);
    // Repeat the edge pixels so parallax never opens a seam at the sides.
    if (x > 0) ctx.drawImage(image, 0, 0, 1, DESIGN_HEIGHT, 0, y, x, DESIGN_HEIGHT);
    if (x < 0) ctx.drawImage(image, image.width - 1, 0, 1, DESIGN_HEIGHT, image.width + x, y, -x, DESIGN_HEIGHT);
    if (y < 0) ctx.drawImage(image, 0, DESIGN_HEIGHT - 1, image.width, 1, x, DESIGN_HEIGHT + y, image.width, -y);
  }

  private render(ctx: CanvasRenderingContext2D, chapter: number, state: SkyState, time: number, assets: Sprites): void {
    const scene = SCENES[chapter];
    const art = this.scenery[chapter];
    const land = this.land.ctx;
    const night = 1 - state.day;
    const lighting = this.interactions.lighting;
    const groundX = Math.round(this.parallaxX * GROUND_DEPTH);
    const groundY = Math.round(this.parallaxY * GROUND_DEPTH);
    lighting.prepare(chapter, time, night, this.interactions.gust);
    ctx.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    ctx.drawImage(this.sky.canvas, 0, 0, this.designWidth, DESIGN_HEIGHT);
    land.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    this.layer(land, art.mountains, 0.18, time);
    this.layer(land, art.grove, 0.4, time);
    this.layer(land, art.ground, GROUND_DEPTH, 0);
    land.save();
    land.translate(groundX, groundY);
    if (chapter === 1) this.life.drawFish(land, this.designWidth, time);
    this.interactions.drawWater(land, scene, chapter, time);
    lighting.drawWater(land, time);
    land.drawImage(art.props, 0, 0);
    if (chapter === 3) drawWheel(land, this.designWidth, time);
    if (chapter === 0) this.life.drawPerson(land, this.designWidth, assets);
    this.life.drawCat(land, scene, this.designWidth, assets, time);
    land.restore();
    const moonlight = night * (0.68 + Math.max(0, state.moon.up) * 0.32);
    for (const tree of scene.trees) {
      const { image, moonRim } = assets.trees[tree.variant];
      const width = Math.round(image.width * tree.size);
      const height = Math.round(image.height * tree.size);
      const x = Math.round(tree.u * this.designWidth - width / 2 + this.parallaxX);
      const y = Math.round(tree.y - height + this.parallaxY);
      const bend = Math.sin(time * 0.55 + tree.u * 8) * 1.2 + this.interactions.gust * 0.34 + this.interactions.gustY * 0.1;
      const rim = moonlight * (tree.u > CLOCK_LEFT && tree.u < CLOCK_RIGHT ? 0.4 : 1);
      for (let row = 0; row < image.height; row += SWAY_STRIP) {
        const rows = Math.min(SWAY_STRIP, image.height - row);
        const lean = Math.round(bend * (1 - row / image.height) ** 2);
        const top = Math.round(row * tree.size);
        const bottom = Math.round((row + rows) * tree.size);
        land.drawImage(image, 0, row, image.width, rows, x + lean, y + top, width, bottom - top);
        if (rim > 0 && row < image.height / 2) {
          land.globalAlpha = rim;
          land.drawImage(moonRim, 0, row, image.width, rows, x + lean, y + top, width, bottom - top);
          land.globalAlpha = 1;
        }
      }
    }
    this.layer(land, art.foreground, 1.3, time);
    land.save();
    land.globalCompositeOperation = 'source-atop';
    land.fillStyle = css(NIGHT_LIGHT, night * NIGHT_SHADE);
    land.fillRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    const rose = (1 - Math.min(1, Math.max(0, state.sun.up) * 2)) * state.day;
    land.fillStyle = css(mix(DUSK_ROSE, state.sky.light, 0.45), rose * SUNSET_SHADE);
    land.fillRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    land.restore();
    land.save();
    land.translate(groundX, groundY);
    lighting.drawSpill(land);
    land.restore();
    ctx.drawImage(this.land.canvas, 0, 0);
    if (chapter === 2) this.life.drawCranes(ctx, time);
    ctx.save();
    ctx.translate(groundX, groundY);
    lighting.drawLanterns(ctx, assets);
    ctx.restore();
    this.interactions.drawPetals(ctx, chapter, time, night, groundX, groundY);
    this.life.drawFireflies(ctx, time, night, chapter, this.designWidth);
  }
}
