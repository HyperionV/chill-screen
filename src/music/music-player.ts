import { loadScript } from './script-loader';
import type { Track } from './youtube-api';
import { readJson, writeJson } from '../store';

const VOLUME_KEY = 'chillscreen.volume';
const DEFAULT_VOLUME = 60;
const PLAYER_SCRIPT = 'https://www.youtube.com/iframe_api';
/** YouTube's player states that matter here. */
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;

const isVolume = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 100;

/** Resolves once YouTube's player script has loaded and is ready to build players. */
function loadPlayerScript(): Promise<void> {
  if (typeof YT !== 'undefined' && typeof YT.Player === 'function') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    loadScript(PLAYER_SCRIPT).catch(reject);
  });
}

/**
 * Plays a queue of YouTube tracks through YouTube's own embedded player, which stays visible in the page (their
 * rules) and keeps playing while panels come and go. Videos that cannot be embedded are skipped.
 */
export class MusicPlayer {
  /** Where the video shows. The page puts this element wherever the player should appear. */
  readonly el = document.createElement('div');
  private queue: Track[] = [];
  private position = -1;
  private isPlaying = false;
  private player: Promise<YT.Player> | null = null;
  private failuresInARow = 0;
  private level = readJson(VOLUME_KEY, DEFAULT_VOLUME, isVolume);
  private readonly listeners = new Set<() => void>();

  get track(): Track | null {
    return this.queue[this.position] ?? null;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get volume(): number {
    return this.level;
  }

  /** Called whenever the track, the play state or the volume changes. */
  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  async playQueue(tracks: Track[], start = 0): Promise<void> {
    if (!tracks.length) return;
    this.queue = tracks;
    this.failuresInARow = 0;
    await this.playAt(start);
  }

  async next(): Promise<void> {
    if (this.queue.length) await this.playAt(this.position + 1);
  }

  async previous(): Promise<void> {
    if (this.queue.length) await this.playAt(this.position - 1);
  }

  async toggle(): Promise<void> {
    const player = await this.started();
    if (!player || !this.track) return;
    if (this.isPlaying) player.pauseVideo();
    else player.playVideo();
  }

  setVolume(volume: number): void {
    this.level = Math.max(0, Math.min(100, Math.round(volume)));
    writeJson(VOLUME_KEY, this.level);
    void this.started().then((p) => p?.setVolume(this.level));
    this.emit();
  }

  /** Seconds played and the track's length; both 0 until a video has loaded. */
  async progress(): Promise<{ time: number; duration: number }> {
    const player = await this.started();
    return player ? { time: player.getCurrentTime() || 0, duration: player.getDuration() || 0 } : { time: 0, duration: 0 };
  }

  async seek(seconds: number): Promise<void> {
    (await this.started())?.seekTo(seconds, true);
  }

  /** The player if one has been started, without starting one. */
  private started(): Promise<YT.Player | null> {
    return (this.player ?? Promise.resolve(null)).catch(() => null);
  }

  private async playAt(index: number): Promise<void> {
    const n = this.queue.length;
    this.position = ((index % n) + n) % n;
    this.isPlaying = true;
    this.emit();
    const player = await this.ensurePlayer();
    if (player && this.track) player.loadVideoById(this.track.videoId);
  }

  private ensurePlayer(): Promise<YT.Player | null> {
    this.player ??= this.createPlayer();
    return this.player.catch((err: unknown) => {
      console.warn('[music] the player could not start', err);
      this.player = null;
      this.isPlaying = false;
      this.emit();
      return null;
    });
  }

  private async createPlayer(): Promise<YT.Player> {
    await loadPlayerScript();
    return new Promise<YT.Player>((resolve) => {
      const slot = document.createElement('div');
      this.el.append(slot);
      const player = new YT.Player(slot, {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            player.setVolume(this.level);
            resolve(player);
          },
          onStateChange: (e) => this.onState(e.data),
          onError: () => void this.skipUnplayable(),
        },
      });
    });
  }

  private onState(state: number): void {
    if (state === ENDED) {
      void this.next();
      return;
    }
    if (state === PLAYING) this.failuresInARow = 0;
    if (state === PLAYING || state === PAUSED) {
      this.isPlaying = state === PLAYING;
      this.emit();
    }
  }

  /** Some videos cannot be embedded. Move on, and stop only if every track in the queue fails in a row. */
  private async skipUnplayable(): Promise<void> {
    this.failuresInARow++;
    if (this.failuresInARow >= this.queue.length) {
      this.isPlaying = false;
      this.emit();
      return;
    }
    await this.next();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
