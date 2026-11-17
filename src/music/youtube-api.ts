import { GoogleAuth } from './google-auth';

const API = 'https://www.googleapis.com/youtube/v3';
/** Most tracks read from one playlist; longer ones are cut so a start stays quick. */
const MAX_PLAYLIST_TRACKS = 300;

export interface Track {
  videoId: string;
  title: string;
  channel: string;
  thumb: string;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  count: number;
  thumb: string;
}

export class YouTubeError extends Error {}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const thumbOf = (snippet: Json): string => {
  const t = obj(snippet.thumbnails);
  return str(obj(t.medium).url) || str(obj(t.default).url);
};

/** YouTube search titles arrive with HTML escapes such as &amp; and &#39;. */
const decode = (s: string): string => new DOMParser().parseFromString(s, 'text/html').documentElement.textContent ?? s;

/** Read-only calls to YouTube for the signed-in account. */
export class YouTubeApi {
  constructor(private readonly auth: GoogleAuth) {}

  async myPlaylists(): Promise<PlaylistSummary[]> {
    const [channels, lists] = await Promise.all([
      this.get('channels', { part: 'contentDetails', mine: 'true' }),
      this.get('playlists', { part: 'snippet,contentDetails', mine: 'true', maxResults: '50' }),
    ]);
    const result: PlaylistSummary[] = [];
    const likes = str(obj(obj(obj(arr(channels.items)[0]).contentDetails).relatedPlaylists).likes);
    if (likes) result.push({ id: likes, title: 'Liked videos', count: -1, thumb: '' });
    for (const item of arr(lists.items).map(obj)) {
      const snippet = obj(item.snippet);
      const id = str(item.id);
      if (!id) continue;
      result.push({ id, title: str(snippet.title) || 'Untitled playlist', count: Number(obj(item.contentDetails).itemCount) || 0, thumb: thumbOf(snippet) });
    }
    return result;
  }

  async playlistTracks(playlistId: string): Promise<Track[]> {
    const tracks: Track[] = [];
    let pageToken = '';
    do {
      const page = await this.get('playlistItems', { part: 'snippet,contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      for (const item of arr(page.items).map(obj)) {
        const snippet = obj(item.snippet);
        const videoId = str(obj(item.contentDetails).videoId);
        const channel = str(snippet.videoOwnerChannelTitle);
        // Deleted and private videos stay in playlists without an owner; they cannot play.
        if (!videoId || !channel) continue;
        tracks.push({ videoId, title: str(snippet.title), channel: channel.replace(/ - Topic$/, ''), thumb: thumbOf(snippet) });
      }
      pageToken = str(page.nextPageToken);
    } while (pageToken && tracks.length < MAX_PLAYLIST_TRACKS);
    return tracks;
  }

  async search(query: string): Promise<Track[]> {
    const page = await this.get('search', { part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '20', q: query });
    const tracks: Track[] = [];
    for (const item of arr(page.items).map(obj)) {
      const snippet = obj(item.snippet);
      const videoId = str(obj(item.id).videoId);
      if (!videoId) continue;
      tracks.push({ videoId, title: decode(str(snippet.title)), channel: decode(str(snippet.channelTitle)), thumb: thumbOf(snippet) });
    }
    return tracks;
  }

  private async get(path: string, params: Record<string, string>, retried = false): Promise<Json> {
    const token = await this.auth.getToken();
    const res = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 && !retried) {
      this.auth.expire();
      return this.get(path, params, true);
    }
    const body = obj(await res.json().catch(() => ({})));
    if (res.ok) return body;
    const error = obj(body.error);
    const reason = str(obj(arr(error.errors)[0]).reason);
    if (reason === 'quotaExceeded') throw new YouTubeError('YouTube’s daily allowance for this app is used up. It resets at midnight Pacific time.');
    if (reason === 'youtubeSignupRequired' || reason === 'channelNotFound') throw new YouTubeError('This Google account has no YouTube channel, so it has no playlists. Search still works.');
    throw new YouTubeError(`YouTube refused the request (${res.status}${reason ? `, ${reason}` : ''}). ${str(error.message)}`.trim());
  }
}
