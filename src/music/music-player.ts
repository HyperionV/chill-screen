import { loadScript } from './script-loader';
import type { Track } from './youtube-api';
import { readJson, writeJson } from '../store';

const VOLUME_KEY = 'chillscreen.volume';
const DEFAULT_VOLUME = 60;
const PROGRESS_REFRESH_MS = 1000;
const PLAYER_SCRIPT = 'https://www.youtube.com/iframe_api';
/** YouTube's player states that matter here. */
const ENDED = 0;
/** A playlist link that cannot be played is given up on after this many videos in a row fail. */
const MAX_PLAYLIST_FAILURES = 3;
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
 * Plays a queue of YouTube tracks, or a whole YouTube playlist from its link, through YouTube's own embedded player and keeps playing while panels come and
 * go. Only the sound is wanted, so the page keeps the video out of sight. Videos that cannot be embedded are skipped.
 */
export class MusicPlayer {
  /** Holds YouTube's player; the page keeps it in the document, out of sight. */
  readonly el = document.createElement('div');
  private queue: Track[] = [];
  private position = -1;
  private isPlaying = false;
  private player: Promise<YT.Player> | null = null;
  private failuresInARow = 0;
  /** True while a pasted playlist link plays: YouTube then owns the order and the track names. */
  private listMode = false;
  private listTrack: Track | null = null;
  private problemText = '';
  private played = 0;
  private length = 0;
  private progressTimer = 0;
  private level = readJson(VOLUME_KEY, DEFAULT_VOLUME, isVolume);
  private readonly listeners = new Set<() => void>();

  get track(): Track | null {
    return this.listMode ? this.listTrack : (this.queue[this.position] ?? null);
  }

  /** Why the last thing asked for could not be played; empty when all is well. */
  get problem(): string {
    return this.problemText;
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

  /** Gets YouTube's player ready ahead of time, so the first track starts without waiting for it to load. */
  warm(): void {
    void this.ensurePlayer();
  }

  async playQueue(tracks: Track[], start = 0): Promise<void> {
    if (!tracks.length) return;
    this.listMode = false;
    this.listTrack = null;
    this.problemText = '';
    this.queue = tracks;
    this.failuresInARow = 0;
    await this.playAt(start);
  }

  /** Plays a public or unlisted YouTube playlist by its ID, in order or shuffled. No sign-in is needed. */
  async playPlaylist(listId: string, shuffle: boolean): Promise<void> {
    this.listMode = true;
    this.listTrack = null;
    this.problemText = '';
    this.queue = [];
    this.failuresInARow = 0;
    this.isPlaying = true;
    this.played = 0;
    this.length = 0;
    this.emit();
    const player = await this.ensurePlayer();
    if (!player) return;
    player.loadPlaylist({ list: listId, listType: 'playlist', index: 0 });
    player.setLoop(true);
    player.setShuffle(shuffle);
  }

  async next(): Promise<void> {
    if (this.listMode) (await this.started())?.nextVideo();
    else if (this.queue.length) await this.playAt(this.position + 1);
  }

  async previous(): Promise<void> {
    if (this.listMode) (await this.started())?.previousVideo();
    else if (this.queue.length) await this.playAt(this.position - 1);
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

  /** How far through the current track, 0 to 1; refreshed every second while playing. */
  get fraction(): number {
    return this.played;
  }

  /** Length of the current track in seconds; 0 until the player knows it. */
  get seconds(): number {
    return this.length;
  }

  /** Jumps to a point in the current track, 0 to 1. */
  seek(fraction: number): void {
    if (this.length <= 0) return;
    this.played = Math.max(0, Math.min(1, fraction));
    this.emit();
    void this.started().then((p) => p?.seekTo(this.played * this.length, true));
  }

  private async refreshProgress(): Promise<void> {
    const player = await this.started();
    this.length = player?.getDuration() || 0;
    if (player && this.listMode) this.readListTrack(player);
    this.played = player && this.length > 0 ? Math.min(1, player.getCurrentTime() / this.length) : 0;
    this.emit();
  }

  /** The player if one has been started, without starting one. */
  private started(): Promise<YT.Player | null> {
    return (this.player ?? Promise.resolve(null)).catch(() => null);
  }

  private async playAt(index: number): Promise<void> {
    const n = this.queue.length;
    this.position = ((index % n) + n) % n;
    this.isPlaying = true;
    this.played = 0;
    this.length = 0;
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
          onStateChange: (e) => this.onState(e.data, player),
          onError: () => void this.skipUnplayable(player),
          // The browser refused to start the video by itself; the play button then shows Play and starts it.
          onAutoplayBlocked: () => {
            this.isPlaying = false;
            this.emit();
          },
        },
      });
    });
  }

  /** In a playlist, YouTube picks the tracks, so the name on show is whatever it says is playing. */
  private readListTrack(player: YT.Player): void {
    const { video_id: videoId, title, author } = player.getVideoData();
    if (!videoId || videoId === this.listTrack?.videoId) return;
    this.listTrack = { videoId, title, channel: author, thumb: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` };
    this.played = 0;
  }

  private onState(state: number, player: YT.Player): void {
    // In a playlist YouTube moves on by itself; for a queue this player does.
    if (state === ENDED && !this.listMode) {
      void this.next();
      return;
    }
    if (state === PLAYING) this.failuresInARow = 0;
    if (state === PLAYING && this.listMode) this.readListTrack(player);
    if (state === PLAYING || state === PAUSED) {
      this.isPlaying = state === PLAYING;
      clearInterval(this.progressTimer);
      if (this.isPlaying) this.progressTimer = window.setInterval(() => void this.refreshProgress(), PROGRESS_REFRESH_MS);
      this.emit();
    }
  }

  /** Some videos cannot be embedded. Move on, and stop only if every track in the queue fails in a row. */
  private async skipUnplayable(player: YT.Player): Promise<void> {
    this.failuresInARow++;
    const limit = this.listMode ? MAX_PLAYLIST_FAILURES : this.queue.length;
    if (this.failuresInARow >= limit) {
      this.isPlaying = false;
      if (this.listMode) this.problemText = 'That playlist could not be played. It needs to be public or unlisted, and allow embedding.';
      this.emit();
      return;
    }
    if (this.listMode) player.nextVideo();
    else await this.next();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}
