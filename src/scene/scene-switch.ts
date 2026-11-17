import { Ambience } from '../audio/ambience';
import { Journey } from '../room/journey/journey';
import { PACES, type Pace } from '../room/journey/pace';
import type { DeckControls } from '../room/music-deck';
import { NightSky } from '../room/night-sky';
import { Sea } from '../room/sea';
import { Slideshow } from '../room/slideshow';
import { WindowScene } from '../room/window-scene';
import { readJson, writeJson } from '../store';
import { addWallpapers, listWallpapers, removeWallpaper, type Wallpaper } from '../wallpapers/store';
import type { TankScene } from './tank-scene';

export const SCENES = ['journey', 'seaside', 'wallpapers', 'aquarium'] as const;
export type SceneKind = (typeof SCENES)[number];
export const ROTATION_MINUTES = [1, 3, 10, 30] as const;

export interface ScenerySettings {
  /** The scene the person chose. Wallpapers fall back to the journey until at least one is added. */
  scene: SceneKind;
  /** Minutes each wallpaper stays before the next one fades in. */
  every: number;
  /** 0 is no rain, 1 a downpour. */
  rain: number;
  pace: Pace;
  /** How loud the background sound is, 0 (off) to 1. */
  ambience: number;
}

const KEY = 'chillscreen.scenery';
const DEFAULTS: ScenerySettings = { scene: 'journey', every: 3, rain: 0, pace: 'gentle', ambience: 0.4 };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Reads saved settings field by field, so a save from an older version keeps whatever is still valid. */
function loadSettings(): ScenerySettings {
  const saved = readJson<Record<string, unknown>>(KEY, {}, isRecord);
  const scene = SCENES.find((s) => s === saved.scene) ?? DEFAULTS.scene;
  const every = ROTATION_MINUTES.find((m) => m === saved.every) ?? DEFAULTS.every;
  const rain = typeof saved.rain === 'number' && saved.rain >= 0 && saved.rain <= 1 ? saved.rain : DEFAULTS.rain;
  const pace = PACES.find((p) => p === saved.pace) ?? DEFAULTS.pace;
  const ambience = typeof saved.ambience === 'number' && saved.ambience >= 0 && saved.ambience <= 1 ? saved.ambience : DEFAULTS.ambience;
  return { scene, every, rain, pace, ambience };
}

/** Decides which scene runs (only one at a time, to stay light), and keeps the wallpaper list and scenery settings. */
export class SceneSwitch {
  settings = loadSettings();
  wallpapers: Wallpaper[] = [];
  private readonly journey: Journey;
  private readonly sea: Sea;
  private readonly slideshow: Slideshow;
  private readonly room: WindowScene;
  private readonly sound = new Ambience();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly tank: TankScene, sceneryCanvas: HTMLCanvasElement) {
    const nightSky = new NightSky();
    this.journey = new Journey(nightSky);
    this.journey.setPace(this.settings.pace);
    this.sea = new Sea(nightSky);
    this.slideshow = new Slideshow(nightSky, this.settings.every);
    this.room = new WindowScene(sceneryCanvas, this.journey, this.settings.rain);
  }

  /** The scene actually on screen. Wallpapers fall back to the journey until at least one is added. */
  get showing(): SceneKind {
    return this.settings.scene === 'wallpapers' && !this.wallpapers.length ? 'journey' : this.settings.scene;
  }

  get frameCost(): number {
    return this.showing === 'aquarium' ? this.tank.frameCost : this.room.frameCost;
  }

  async init(): Promise<void> {
    await this.reload();
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  update(change: Partial<ScenerySettings>): void {
    this.save(change);
    this.journey.setPace(this.settings.pace);
    this.slideshow.setEvery(this.settings.every);
    this.activate();
  }

  /** Puts the music radio on the window sill, wired to the player. */
  setMusic(controls: DeckControls): void {
    this.room.setDeck(controls);
  }

  /** Changes the rain without redrawing the panel, so a slider being dragged is left alone. */
  setRain(rain: number): void {
    this.save({ rain });
    this.room.setRain(rain);
    this.hear();
  }

  /** Changes the loudness of the background sound without redrawing the panel. */
  setAmbience(ambience: number): void {
    this.save({ ambience });
    this.hear();
  }

  async add(files: Iterable<File>): Promise<{ added: number; skipped: string[] }> {
    const result = await addWallpapers(files);
    if (result.added > 0 && this.settings.scene !== 'wallpapers') this.save({ scene: 'wallpapers' });
    await this.reload();
    return result;
  }

  async remove(id: string): Promise<void> {
    await removeWallpaper(id);
    await this.reload();
  }

  next(): void {
    void this.slideshow.next();
  }

  private save(change: Partial<ScenerySettings>): void {
    this.settings = { ...this.settings, ...change };
    writeJson(KEY, this.settings);
  }

  private async reload(): Promise<void> {
    try {
      this.wallpapers = await listWallpapers();
    } catch (err) {
      console.warn('[scenery] saved wallpapers could not be read', err);
      this.wallpapers = [];
    }
    this.slideshow.setWallpapers(this.wallpapers);
    this.activate();
  }

  private hear(): void {
    this.sound.set({ scene: this.showing, rain: this.settings.rain, pace: this.settings.pace, volume: this.settings.ambience });
  }

  private activate(): void {
    const showing = this.showing;
    // The style sheet needs to know: the aquarium has no window sill, so the player shows as a plain bar there.
    document.body.dataset.scene = showing;
    if (showing === 'aquarium') {
      this.room.stop();
      this.tank.start();
    } else {
      this.tank.stop();
      this.room.setView(showing === 'wallpapers' ? this.slideshow : showing === 'seaside' ? this.sea : this.journey);
      this.room.start();
    }
    this.hear();
    for (const fn of this.listeners) fn();
  }
}
