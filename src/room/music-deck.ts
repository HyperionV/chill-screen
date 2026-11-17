import { css, mix, shade, type RGB } from '../render/color';
import { drawText, plainText, textWidth } from '../render/pixel-font';
import type { Look } from '../wallpapers/look';

/** What the deck shows and does. The page wires these to the music player. */
export interface DeckControls {
  /** What is playing ("title - artist"), or null when nothing is chosen. */
  label(): string | null;
  playing(): boolean;
  /** 0 to 100. */
  volume(): number;
  /** How far through the track, 0 to 1. */
  progress(): number;
  previous(): void;
  toggle(): void;
  next(): void;
  setVolume(volume: number): void;
  openLibrary(): void;
}

/** Sizes in stage pixels. The deck is a small radio with a handle: speakers at the sides, a display and buttons between. */
const W = 100;
const H = 28;
const BODY_TOP = 3;
const LCD = { x: 25, y: 6, w: 50, h: 9 };
const TEXT_ROW = LCD.y + 1;
const PROGRESS_ROW = LCD.y + 7;
const BUTTON = { y: 17, w: 7, h: 7, step: 8, firstX: 26 };
const SPEAKER = { y: 16, r: 9, leftX: 12, rightX: W - 12 };
const VOLUME_STEP = 10;
const VOLUME_SHOWN_SECONDS = 1.6;
const PRESS_SECONDS = 0.14;
const SCROLL_SPEED = 11;
const SCROLL_GAP = '    ';
const NOTE_EVERY_SECONDS = 1.5;
const NOTE_LIFE_SECONDS = 3.4;
const NOTE_RISE = 7;
const IDLE_TEXT = 'NO MUSIC';
/** Extra pixels above and below a button that still count as pressing it, so the small buttons are easy to hit. */
const HIT_PAD_Y = 3;

const BODY: RGB = [66, 84, 96];
const BODY_LIGHT: RGB = [104, 128, 140];
const BODY_DARK: RGB = [38, 50, 60];
const PANEL: RGB = [30, 40, 48];
const TRIM: RGB = [214, 112, 48];
const HANDLE: RGB = [34, 40, 48];
const GRILLE: RGB = [26, 30, 36];
const CONE: RGB = [54, 62, 72];
const CAP: RGB = [104, 114, 124];
const KEY: RGB = [226, 214, 190];
const KEY_HOT: RGB = [255, 246, 220];
const INK: RGB = [40, 34, 30];
const LCD_ON: RGB = [158, 196, 112];
const LCD_OFF: RGB = [84, 102, 88];
const LCD_INK: RGB = [20, 32, 22];
const NOTE_COLOR: RGB = [255, 240, 200];

/** Button pictures, five pixels square. */
const ICONS: Record<string, string[]> = {
  previous: ['#...#', '#..##', '#####', '#..##', '#...#'],
  next: ['#...#', '##..#', '#####', '##..#', '#...#'],
  play: ['.#...', '.##..', '.###.', '.##..', '.#...'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##'],
  quieter: ['.....', '.....', '.###.', '.....', '.....'],
  louder: ['..#..', '..#..', '#####', '..#..', '..#..'],
  library: ['..###', '..#..', '..#..', '###..', '###..'],
};
const NOTE_SHAPE = ['.##', '.#.', '##.', '##.'];
const BUTTONS = ['previous', 'play', 'next', 'quieter', 'louder', 'library'] as const;
type ButtonName = (typeof BUTTONS)[number];

interface Note {
  x: number;
  y: number;
  born: number;
  sway: number;
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/**
 * A pixel radio standing on the windowsill that plays the music: its display scrolls what is playing, its buttons
 * work, its speakers pulse and notes drift up from it. It is drawn crisply over the glass, in front of any rain.
 */
export class MusicDeck {
  private x = 0;
  private y = 0;
  private hovered: ButtonName | null = null;
  private pressed: { name: ButtonName; until: number } | null = null;
  private volumeShownUntil = 0;
  private scroll = 0;
  private nextNote = 0;
  private notes: Note[] = [];

  constructor(private readonly controls: DeckControls) {}

  /** `restRow` is the stage row the deck's base stands on. */
  layout(stageW: number, restRow: number): void {
    this.x = Math.max(0, Math.round((stageW - W) / 2));
    this.y = restRow - H;
  }

  /** The button under a stage point, if any. */
  private buttonAt(px: number, py: number): ButtonName | null {
    const top = this.y + BUTTON.y - HIT_PAD_Y;
    if (py < top || py >= this.y + BUTTON.y + BUTTON.h + HIT_PAD_Y) return null;
    const i = Math.floor((px - this.x - BUTTON.firstX) / BUTTON.step);
    return i >= 0 && i < BUTTONS.length ? BUTTONS[i] : null;
  }

  /** Marks the button under the pointer (null when none); returns whether one is there. */
  hover(px: number, py: number): boolean {
    this.hovered = this.buttonAt(px, py);
    return this.hovered !== null;
  }

  leave(): void {
    this.hovered = null;
  }

  /** Presses the button at a stage point. Returns false when the point is not on a button. */
  press(px: number, py: number, now: number): boolean {
    const name = this.buttonAt(px, py);
    if (!name) return false;
    this.pressed = { name, until: now + PRESS_SECONDS };
    const c = this.controls;
    if (name === 'previous') c.previous();
    else if (name === 'next') c.next();
    else if (name === 'play') (c.label() === null ? c.openLibrary : c.toggle)();
    else if (name === 'library') c.openLibrary();
    else {
      c.setVolume(Math.max(0, Math.min(100, c.volume() + (name === 'louder' ? VOLUME_STEP : -VOLUME_STEP))));
      this.volumeShownUntil = now + VOLUME_SHOWN_SECONDS;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, dt: number, time: number, look: Look): void {
    const playing = this.controls.playing();
    const lit = (c: RGB): string => css(shade(mix(c, look.tint, 0.12), 0.62 + look.mean * 0.6));
    const rect = (x: number, y: number, w: number, h: number, color: string): void => {
      ctx.fillStyle = color;
      ctx.fillRect(this.x + x, this.y + y, w, h);
    };
    this.drawBody(rect, lit, look);
    this.drawSpeaker(ctx, SPEAKER.leftX, playing, time, lit);
    this.drawSpeaker(ctx, SPEAKER.rightX, playing, time, lit);
    this.drawDisplay(ctx, rect, dt, time, playing);
    this.drawButtons(ctx, rect, lit, playing, time);
    this.drawNotes(ctx, dt, time, playing);
  }

  private drawBody(rect: (x: number, y: number, w: number, h: number, c: string) => void, lit: (c: RGB) => string, look: Look): void {
    rect(2, H, W - 4, 2, css([0, 0, 0], 0.34 + 0.1 * look.mean));
    rect(24, 0, 52, 1, lit(HANDLE));
    rect(24, 0, 2, BODY_TOP + 1, lit(HANDLE));
    rect(74, 0, 2, BODY_TOP + 1, lit(HANDLE));
    for (let y = BODY_TOP; y < H; y++) {
      const edge = y === BODY_TOP || y === H - 1;
      const inset = edge ? 2 : y === BODY_TOP + 1 || y === H - 2 ? 1 : 0;
      rect(inset, y, W - inset * 2, 1, lit(y === BODY_TOP ? BODY_LIGHT : y === H - 1 ? BODY_DARK : BODY));
    }
    rect(1, BODY_TOP + 2, 1, H - BODY_TOP - 4, lit(BODY_LIGHT));
    rect(W - 2, BODY_TOP + 2, 1, H - BODY_TOP - 4, lit(BODY_DARK));
    rect(23, 5, 54, 21, lit(PANEL));
    rect(6, H - 3, W - 12, 1, lit(TRIM));
  }

  private drawSpeaker(ctx: CanvasRenderingContext2D, cx: number, playing: boolean, time: number, lit: (c: RGB) => string): void {
    const beat = playing && Math.floor(time * 5) % 2 === 0;
    const disc = (radius: number, color: string): void => {
      ctx.fillStyle = color;
      for (let dy = -radius; dy <= radius; dy++) {
        const half = Math.floor(Math.sqrt(radius * radius + radius - dy * dy));
        ctx.fillRect(this.x + cx - half, this.y + SPEAKER.y + dy, half * 2 + 1, 1);
      }
    };
    disc(SPEAKER.r, lit(GRILLE));
    disc(beat ? 5 : 6, lit(CONE));
    disc(beat ? 2 : 3, lit(CAP));
  }

  private drawDisplay(ctx: CanvasRenderingContext2D, rect: (x: number, y: number, w: number, h: number, c: string) => void, dt: number, time: number, playing: boolean): void {
    const label = this.controls.label();
    rect(LCD.x, LCD.y, LCD.w, LCD.h, css(label === null && time > this.volumeShownUntil ? LCD_OFF : LCD_ON));
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x + LCD.x + 1, this.y + LCD.y, LCD.w - 2, LCD.h);
    ctx.clip();
    const ink = css(LCD_INK);
    if (time < this.volumeShownUntil) {
      const text = `VOL ${Math.round(this.controls.volume())}`;
      drawText(ctx, text, this.x + LCD.x + Math.floor((LCD.w - textWidth(text)) / 2), this.y + TEXT_ROW, ink);
    } else if (label === null) {
      drawText(ctx, IDLE_TEXT, this.x + LCD.x + Math.floor((LCD.w - textWidth(IDLE_TEXT)) / 2), this.y + TEXT_ROW, ink);
    } else {
      this.drawMarquee(ctx, plainText(label), dt, playing, ink);
    }
    ctx.restore();
    if (label !== null) rect(LCD.x + 1, PROGRESS_ROW, Math.round((LCD.w - 2) * Math.max(0, Math.min(1, this.controls.progress()))), 1, css(LCD_INK));
  }

  /** Short names stand still in the middle; long ones scroll past while the music plays. */
  private drawMarquee(ctx: CanvasRenderingContext2D, text: string, dt: number, playing: boolean, ink: string): void {
    const room = LCD.w - 2;
    const left = this.x + LCD.x + 1;
    if (textWidth(text) <= room) {
      drawText(ctx, text, left + Math.floor((room - textWidth(text)) / 2), this.y + TEXT_ROW, ink);
      this.scroll = 0;
      return;
    }
    const loop = `${text}${SCROLL_GAP}`;
    const period = loop.length * 4;
    if (playing) this.scroll = (this.scroll + SCROLL_SPEED * dt) % period;
    const at = Math.round(this.scroll);
    drawText(ctx, loop, left - at, this.y + TEXT_ROW, ink);
    drawText(ctx, loop, left - at + period, this.y + TEXT_ROW, ink);
  }

  private drawButtons(ctx: CanvasRenderingContext2D, rect: (x: number, y: number, w: number, h: number, c: string) => void, lit: (c: RGB) => string, playing: boolean, time: number): void {
    BUTTONS.forEach((name, i) => {
      const x = BUTTON.firstX + i * BUTTON.step;
      const down = this.pressed !== null && this.pressed.name === name && time < this.pressed.until;
      const base = name === 'play' ? TRIM : this.hovered === name ? KEY_HOT : KEY;
      rect(x, BUTTON.y + (down ? 1 : 0), BUTTON.w, BUTTON.h - (down ? 1 : 0), lit(base));
      const picture = ICONS[name === 'play' && playing ? 'pause' : name];
      ctx.fillStyle = css(INK);
      picture.forEach((row, ry) => [...row].forEach((ch, rx) => {
        if (ch === '#') ctx.fillRect(this.x + x + 1 + rx, this.y + BUTTON.y + 1 + ry + (down ? 1 : 0), 1, 1);
      }));
    });
  }

  private drawNotes(ctx: CanvasRenderingContext2D, dt: number, time: number, playing: boolean): void {
    if (playing && time >= this.nextNote) {
      this.notes.push({ x: this.x + rand(W * 0.3, W * 0.7), y: this.y - 2, born: time, sway: rand(0, 6.3) });
      this.nextNote = time + NOTE_EVERY_SECONDS;
    }
    this.notes = this.notes.filter((n) => time - n.born < NOTE_LIFE_SECONDS);
    for (const n of this.notes) {
      n.y -= NOTE_RISE * dt;
      const age = (time - n.born) / NOTE_LIFE_SECONDS;
      ctx.fillStyle = css(NOTE_COLOR, 0.85 * Math.sin(Math.PI * age));
      const x = Math.round(n.x + Math.sin(time * 1.6 + n.sway) * 3);
      NOTE_SHAPE.forEach((row, ry) => [...row].forEach((ch, rx) => {
        if (ch === '#') ctx.fillRect(x + rx, Math.round(n.y) + ry, 1, 1);
      }));
    }
  }
}
