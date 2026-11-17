import { Ambience } from '../audio/ambience';
import { PACES, type Pace } from '../room/journey/pace';
import type { JourneyView } from '../room/journeys/journey-view';
import { DEFAULT_JOURNEY, JOURNEYS, JOURNEY_ENTRIES, type JourneyId } from '../room/journeys/registry';
import type { DeckControls } from '../room/music-deck';
import { NightSky } from '../room/night-sky';
import { DEFAULT_LANDSCAPE, LANDSCAPES, LANDSCAPE_ENTRIES, type LandscapeId } from '../room/landscapes/registry';
import type { OutsideView } from '../room/view';
import { Slideshow, type Rotation } from '../room/slideshow';
import { WindowScene } from '../room/window-scene';
import { readJson, writeJson } from '../store';
import { addWallpapers, listWallpapers, removeWallpaper, type Wallpaper } from '../wallpapers/store';
import type { TankScene } from './tank-scene';

export const SCENES = ['journey', 'landscape', 'wallpapers', 'aquarium'] as const;
export type SceneKind = (typeof SCENES)[number];
export const ROTATION_MINUTES = [1, 3, 10, 30] as const;
export const ROTATIONS = ['stay', 'shuffle', 'order'] as const;

export interface ScenerySettings {
  /** The scene the person chose. Wallpapers fall back to the journey until at least one is added. */
  scene: SceneKind;
  /** Which journey the Journey scene shows. */
  journey: JourneyId;
  /** Which landscape the Landscape scene shows. */
  landscape: LandscapeId;
  /** Minutes each wallpaper stays before the next one fades in. */
  every: number;
  /** Whether the wallpaper changes by itself, and in what order. */
  rotation: Rotation;
  /** The wallpaper last on screen, or null before one has been shown. */
  wallpaper: string | null;
  /** 0 is no rain, 1 a downpour. */
  rain: number;
  pace: Pace;
  /** How loud the background sound is, 0 (off) to 1. */
  ambience: number;
}

const KEY = 'chillscreen.scenery';
const DEFAULTS: ScenerySettings = { scene: 'journey', journey: DEFAULT_JOURNEY, landscape: DEFAULT_LANDSCAPE, every: 3, rotation: 'shuffle', wallpaper: null, rain: 0, pace: 'gentle', ambience: 0.4 };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Reads saved settings field by field, so a save from an older version keeps whatever is still valid. */
function loadSettings(): ScenerySettings {
  const saved = readJson<Record<string, unknown>>(KEY, {}, isRecord);
  // The Landscape scene used to be called Seaside; a saved choice of it carries over.
  const savedScene = saved.scene === 'seaside' ? 'landscape' : saved.scene;
  const scene = SCENES.find((s) => s === savedScene) ?? DEFAULTS.scene;
  // `?journey=night-train` in the address picks one for this visit, handy for sharing and checking.
  const asked = new URLSearchParams(location.search).get('journey');
  const journey = JOURNEYS.find((j) => j === asked) ?? JOURNEYS.find((j) => j === saved.journey) ?? DEFAULTS.journey;
  const askedLandscape = new URLSearchParams(location.search).get('landscape');
  const landscape = LANDSCAPES.find((l) => l === askedLandscape) ?? LANDSCAPES.find((l) => l === saved.landscape) ?? DEFAULTS.landscape;
  const every = ROTATION_MINUTES.find((m) => m === saved.every) ?? DEFAULTS.every;
  const rotation = ROTATIONS.find((r) => r === saved.rotation) ?? DEFAULTS.rotation;
  const wallpaper = typeof saved.wallpaper === 'string' ? saved.wallpaper : DEFAULTS.wallpaper;
  const rain = typeof saved.rain === 'number' && saved.rain >= 0 && saved.rain <= 1 ? saved.rain : DEFAULTS.rain;
  const pace = PACES.find((p) => p === saved.pace) ?? DEFAULTS.pace;
  const ambience = typeof saved.ambience === 'number' && saved.ambience >= 0 && saved.ambience <= 1 ? saved.ambience : DEFAULTS.ambience;
  return { scene, journey, landscape, every, rotation, wallpaper, rain, pace, ambience };
}

/** Decides which scene runs (only one at a time, to stay light), and keeps the wallpaper list and scenery settings. */
export class SceneSwitch {
  settings = loadSettings();
  wallpapers: Wallpaper[] = [];
  private readonly nightSky = new NightSky();
  private readonly journeys = new Map<JourneyId, JourneyView>();
  private readonly landscapes = new Map<LandscapeId, OutsideView>();
  private readonly slideshow: Slideshow;
  private readonly room: WindowScene;
  private readonly sound = new Ambience();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly tank: TankScene, sceneryCanvas: HTMLCanvasElement) {
    this.slideshow = new Slideshow(this.nightSky, this.settings.every, this.settings.rotation);
    this.slideshow.onShown = (id) => {
      this.save({ wallpaper: id });
      for (const fn of this.listeners) fn();
    };
    this.room = new WindowScene(sceneryCanvas, this.journeyView(), this.settings.rain);
  }

  /** The chosen journey, built the first time it is shown so the others cost nothing. */
  private journeyView(): JourneyView {
    const id = this.settings.journey;
    let view = this.journeys.get(id);
    if (!view) {
      view = JOURNEY_ENTRIES[id].create(this.nightSky);
      this.journeys.set(id, view);
    }
    view.setPace(this.settings.pace);
    return view;
  }

  /** The chosen landscape, built the first time it is shown so the others cost nothing. */
  private landscapeView(): OutsideView {
    const id = this.settings.landscape;
    let view = this.landscapes.get(id);
    if (!view) {
      view = LANDSCAPE_ENTRIES[id].create(this.nightSky);
      this.landscapes.set(id, view);
    }
    return view;
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
    this.slideshow.configure(this.settings.every, this.settings.rotation);
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

  /** Shows this wallpaper now. */
  choose(id: string): void {
    void this.slideshow.show(id);
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
    this.slideshow.setWallpapers(this.wallpapers, this.settings.wallpaper);
    this.activate();
  }

  private hear(): void {
    this.sound.set({ scene: this.showing, landscape: this.settings.landscape, rain: this.settings.rain, pace: this.settings.pace, volume: this.settings.ambience });
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
      this.room.setView(showing === 'wallpapers' ? this.slideshow : showing === 'landscape' ? this.landscapeView() : this.journeyView());
      this.room.start();
    }
    this.hear();
    for (const fn of this.listeners) fn();
  }
}
