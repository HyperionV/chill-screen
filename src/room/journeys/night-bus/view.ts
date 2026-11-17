import { memoryCanvas } from '../../../render/pixel-stage';
import type { Look } from '../../../wallpapers/look';
import type { NightSky } from '../../night-sky';
import type { ViewFrame } from '../../view';
import { PACE_SPEED, type Pace } from '../../journey/pace';
import { ChapterTitle } from '../chapter-title';
import type { JourneyView } from '../journey-view';
import { ramp } from '../noise';
import { Route } from '../route';
import { Cast } from './cast';
import { BLEND_START, BUS_SPEED, CHAPTERS, DESIGN_HEIGHT, crossingWait } from './route';
import { Scenery } from './scenery';
import { BusSky } from './sky';
import { Weather } from './weather';

type Surface = ReturnType<typeof memoryCanvas>;

export class NightBus implements JourneyView {
  private readonly route = new Route('night-bus', CHAPTERS);
  private readonly title = new ChapterTitle();
  private readonly sky: BusSky;
  private readonly weather = new Weather();
  private scenery: Scenery | null = null;
  private cast: Cast | null = null;
  private current: Surface | null = null;
  private next: Surface | null = null;
  private width = 0;
  private height = 0;
  private designWidth = 0;
  private unit = 1;
  private speed = PACE_SPEED.gentle;
  private scroll = 0;
  private time = 0;
  private readonly pointer = { x: 0, y: 0 };

  constructor(nightSky: NightSky) { this.sky = new BusSky(nightSky); }

  setPace(pace: Pace): void { this.speed = PACE_SPEED[pace]; }

  resize(w: number, h: number): void {
    this.width = w; this.height = h;
    this.unit = Math.max(1 / DESIGN_HEIGHT, h / DESIGN_HEIGHT);
    this.designWidth = Math.max(1, Math.ceil(w / this.unit));
    this.current = memoryCanvas(this.designWidth, DESIGN_HEIGHT);
    this.next = memoryCanvas(this.designWidth, DESIGN_HEIGHT);
    this.scenery ??= new Scenery();
    this.cast ??= new Cast();
    this.weather.resize(this.designWidth);
    this.sky.resize(this.designWidth);
  }

  press(x: number, y: number): void {
    const px = x / this.unit; const py = y / this.unit;
    if (this.cast?.press(px, py)) return;
    if (this.scenery?.press(px, py)) return;
    this.weather.press(px, py);
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const current = this.current; const next = this.next;
    const scenery = this.scenery; const cast = this.cast;
    if (!current || !next || !scenery || !cast) return this.sky.look;
    const before = this.route.now;
    this.route.advance(frame.dt, this.speed);
    const chapter = this.route.now;
    this.time += frame.dt;
    if (!crossingWait(before.index, before.t)) this.scroll += BUS_SPEED * this.speed * frame.dt;
    this.sky.update(this.route.progress, frame.dt);
    let pointer: ViewFrame['pointer'] = null;
    if (frame.pointer) {
      this.pointer.x = frame.pointer.x / this.unit; this.pointer.y = frame.pointer.y / this.unit;
      pointer = this.pointer;
    }
    const fade = ramp(BLEND_START, 1, chapter.t);
    const activeChapter = fade < 0.5 ? chapter.index : chapter.next;
    cast.update(frame.dt, pointer, activeChapter);
    scenery.update(frame.dt, chapter.index, chapter.t, this.speed === 0);
    this.weather.update(frame.dt, pointer);
    this.paint(current.ctx, chapter.index, chapter.t, activeChapter === chapter.index, scenery, cast);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(current.canvas, 0, 0, this.width, this.height);
    if (fade > 0) {
      this.paint(next.ctx, chapter.next, 0, activeChapter === chapter.next, scenery, cast);
      ctx.globalAlpha = fade; ctx.drawImage(next.canvas, 0, 0, this.width, this.height);
    }
    ctx.restore();
    // Rain and fog share the design canvas, so they remain crisp after every resize.
    current.ctx.clearRect(0, 0, this.designWidth, DESIGN_HEIGHT);
    this.weather.drawStreet(current.ctx, this.time, this.sky.dawn, this.scroll);
    this.weather.drawFog(current.ctx);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(current.canvas, 0, 0, this.width, this.height); ctx.restore();
    this.title.draw(ctx, frame.dt, this.width, this.height, chapter.name);
    return this.sky.look;
  }

  private paint(ctx: CanvasRenderingContext2D, chapter: number, progress: number, active: boolean, scenery: Scenery, cast: Cast): void {
    ctx.imageSmoothingEnabled = false;
    this.sky.draw(ctx, this.designWidth, this.time);
    scenery.draw(ctx, chapter, this.designWidth, this.scroll, this.time, this.sky.dawn, progress, active);
    cast.draw(ctx, chapter, this.designWidth, this.scroll, active);
  }
}
