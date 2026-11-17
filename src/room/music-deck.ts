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
  /** Length of the track in seconds; 0 while not known yet. */
  duration(): number;
  previous(): void;
  toggle(): void;
  next(): void;
  setVolume(volume: number): void;
  /** Jumps to a point in the track, 0 to 1. */
  seek(fraction: number): void;
  openLibrary(): void;
}

/** Sizes in stage pixels. The deck is a small radio with a handle: a wide display over a row of buttons. */
const W = 100;
const H = 32;
const BODY_TOP = 3;
const PANEL = { x: 5, y: 5, w: 90, h: 23 };
const LCD = { x: 8, y: 7, w: 84, h: 11 };
/** Where the song name and the slider sit inside the display. */
const TEXT_ROW = LCD.y + 2;
const CENTRED_TEXT_ROW = LCD.y + 4;
const SLIDER = { x: LCD.x + 3, w: LCD.w - 6, y: LCD.y + 8 };
const KNOB = { w: 3, h: 3 };
const BUTTON = { y: 20, w: 11, h: 7, step: 14, firstX: 9 };
const VOLUME_STEP = 10;
const VOLUME_SHOWN_SECONDS = 1.6;
const PRESS_SECONDS = 0.14;
const SCROLL_SPEED = 11;
const SCROLL_GAP = '    ';
const NOTE_EVERY_SECONDS = 1.5;
const NOTE_LIFE_SECONDS = 3.4;
const NOTE_RISE = 7;
const IDLE_TEXT = 'NO MUSIC';
/** One pixel of lettering on the display is this many screen pixels, so the song name is small and still sharp. */
const LETTER_SCREEN_PIXELS = 2;
/** Extra pixels above and below a button that still count as pressing it, so the buttons are easy to hit. */
const HIT_PAD_Y = 3;

const BODY: RGB = [66, 84, 96];
const BODY_LIGHT: RGB = [104, 128, 140];
const BODY_DARK: RGB = [38, 50, 60];
const PANEL_COLOR: RGB = [30, 40, 48];
const TRIM: RGB = [214, 112, 48];
const HANDLE: RGB = [34, 40, 48];
const KEY: RGB = [226, 214, 190];
const KEY_HOT: RGB = [255, 246, 220];
const INK: RGB = [40, 34, 30];
const LCD_ON: RGB = [158, 196, 112];
const LCD_OFF: RGB = [84, 102, 88];
const LCD_INK: RGB = [20, 32, 22];
const LCD_TRACK: RGB = [122, 160, 88];
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
const ICON_SIZE = 5;
const NOTE_SHAPE = ['.##', '.#.', '##.', '##.'];
const BUTTONS = ['previous', 'play', 'next', 'quieter', 'louder', 'library'] as const;
type ButtonName = (typeof BUTTONS)[number];

interface Note {
  x: number;
  y: number;
  born: number;
  sway: number;
}

type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * A pixel radio standing on the windowsill that plays the music: its display scrolls what is playing, its buttons
 * work, and notes drift up from it. Pointing at the display brings up a slider to skip through the track. It is drawn
 * crisply over the glass, in front of any rain.
 */
export class MusicDeck {
  private x = 0;
  private y = 0;
  /** Stage units per pixel of lettering: set each frame from the stage scale. */
  private letter = 1;
  private hovered: ButtonName | null = null;
  private overDisplay = false;
  /** While the slider is being dragged: where it points, 0 to 1. */
  private seeking: number | null = null;
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

  /** Whether a stage point is on the display while a track with a known length is chosen, so it can be skipped through. */
  private onSeekable(px: number, py: number): boolean {
    return this.controls.label() !== null && this.controls.duration() > 0 &&
      px >= this.x + LCD.x && px < this.x + LCD.x + LCD.w && py >= this.y + LCD.y && py < this.y + LCD.y + LCD.h;
  }

  private fractionAt(px: number): number {
    return clamp01((px - this.x - SLIDER.x) / SLIDER.w);
  }

  /** Marks what is under the pointer; returns whether it is something to press or drag. */
  hover(px: number, py: number): boolean {
    this.hovered = this.buttonAt(px, py);
    this.overDisplay = this.onSeekable(px, py);
    return this.hovered !== null || this.overDisplay;
  }

  leave(): void {
    this.hovered = null;
    this.overDisplay = false;
  }

  /** Starts dragging the slider if the point is on the display. */
  beginSeek(px: number, py: number): boolean {
    if (!this.onSeekable(px, py)) return false;
    this.seeking = this.fractionAt(px);
    return true;
  }

  dragTo(px: number): void {
    if (this.seeking !== null) this.seeking = this.fractionAt(px);
  }

  /** Lets go of the slider and jumps there. */
  endSeek(): void {
    if (this.seeking === null) return;
    this.controls.seek(this.seeking);
    this.seeking = null;
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

  /** `scale` is the stage's screen pixels per stage pixel. */
  draw(ctx: CanvasRenderingContext2D, dt: number, time: number, look: Look, scale: number): void {
    const playing = this.controls.playing();
    this.letter = LETTER_SCREEN_PIXELS / scale;
    const lit = (c: RGB): string => css(shade(mix(c, look.tint, 0.12), 0.62 + look.mean * 0.6));
    const rect: Rect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(this.x + x, this.y + y, w, h);
    };
    this.drawBody(rect, lit, look);
    this.drawDisplay(ctx, rect, dt, time, playing);
    this.drawButtons(ctx, rect, lit, playing, time);
    this.drawNotes(ctx, dt, time, playing);
  }

  private drawBody(rect: Rect, lit: (c: RGB) => string, look: Look): void {
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
    rect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, lit(PANEL_COLOR));
    rect(6, H - 3, W - 12, 1, lit(TRIM));
  }

  /** Lettering on the display, finer than a stage pixel so long titles stay readable. */
  private text(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
    drawText(ctx, text, x, y, color, this.letter);
  }

  private textSpan(text: string): number {
    return textWidth(text) * this.letter;
  }

  private drawDisplay(ctx: CanvasRenderingContext2D, rect: Rect, dt: number, time: number, playing: boolean): void {
    const label = this.controls.label();
    rect(LCD.x, LCD.y, LCD.w, LCD.h, css(label === null && time > this.volumeShownUntil ? LCD_OFF : LCD_ON));
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x + LCD.x + 1, this.y + LCD.y, LCD.w - 2, LCD.h);
    ctx.clip();
    const ink = css(LCD_INK);
    const middle = (text: string, row: number): void => this.text(ctx, text, this.x + LCD.x + Math.floor((LCD.w - this.textSpan(text)) / 2), this.y + row, ink);
    if (time < this.volumeShownUntil) middle(`VOL ${Math.round(this.controls.volume())}`, CENTRED_TEXT_ROW);
    else if (label === null) middle(IDLE_TEXT, CENTRED_TEXT_ROW);
    else if (this.seeking !== null) middle(`${clock(this.seeking * this.controls.duration())} / ${clock(this.controls.duration())}`, TEXT_ROW);
    else this.drawMarquee(ctx, plainText(label), dt, playing, ink);
    ctx.restore();
    if (label !== null) this.drawSlider(rect);
  }

  /** A thin progress line; pointing at the display (or dragging) widens it into a slider with a knob. */
  private drawSlider(rect: Rect): void {
    const open = this.overDisplay || this.seeking !== null;
    const at = this.seeking ?? clamp01(this.controls.progress());
    const filled = Math.round(SLIDER.w * at);
    if (open) rect(SLIDER.x, SLIDER.y, SLIDER.w, 1, css(LCD_TRACK));
    rect(SLIDER.x, SLIDER.y, filled, 1, css(LCD_INK));
    if (open) rect(SLIDER.x + Math.min(SLIDER.w - KNOB.w, Math.max(0, filled - 1)), SLIDER.y - 1, KNOB.w, KNOB.h, css(LCD_INK));
  }

  /** Short names stand still in the middle; long ones scroll past while the music plays. */
  private drawMarquee(ctx: CanvasRenderingContext2D, text: string, dt: number, playing: boolean, ink: string): void {
    const room = LCD.w - 4;
    const left = this.x + LCD.x + 2;
    const span = this.textSpan(text);
    if (span <= room) {
      this.text(ctx, text, left + Math.floor((room - span) / 2), this.y + TEXT_ROW, ink);
      this.scroll = 0;
      return;
    }
    const loop = `${text}${SCROLL_GAP}`;
    const period = this.textSpan(loop) + this.letter;
    if (playing) this.scroll = (this.scroll + SCROLL_SPEED * dt) % period;
    const at = Math.round(this.scroll);
    this.text(ctx, loop, left - at, this.y + TEXT_ROW, ink);
    this.text(ctx, loop, left - at + period, this.y + TEXT_ROW, ink);
  }

  private drawButtons(ctx: CanvasRenderingContext2D, rect: Rect, lit: (c: RGB) => string, playing: boolean, time: number): void {
    BUTTONS.forEach((name, i) => {
      const x = BUTTON.firstX + i * BUTTON.step;
      const down = this.pressed !== null && this.pressed.name === name && time < this.pressed.until;
      const base = name === 'play' ? TRIM : this.hovered === name ? KEY_HOT : KEY;
      rect(x, BUTTON.y + (down ? 1 : 0), BUTTON.w, BUTTON.h - (down ? 1 : 0), lit(base));
      const picture = ICONS[name === 'play' && playing ? 'pause' : name];
      const left = x + Math.floor((BUTTON.w - ICON_SIZE) / 2);
      ctx.fillStyle = css(INK);
      picture.forEach((row, ry) => [...row].forEach((ch, rx) => {
        if (ch === '#') ctx.fillRect(this.x + left + rx, this.y + BUTTON.y + 1 + ry + (down ? 1 : 0), 1, 1);
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
