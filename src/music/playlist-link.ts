/** A playlist ID is a long run of letters, digits, dashes and underscores (e.g. PLabc123...). */
const PLAYLIST_ID = /^[\w-]{13,}$/;

/**
 * The playlist ID in whatever the person pasted: a youtube.com or music.youtube.com link with `list=`, or the bare ID.
 * Returns null when nothing in it looks like a playlist.
 */
export function playlistIdFrom(pasted: string): string | null {
  const text = pasted.trim();
  if (!text) return null;
  try {
    const id = new URL(text).searchParams.get('list');
    return id && PLAYLIST_ID.test(id) ? id : null;
  } catch {
    return PLAYLIST_ID.test(text) ? text : null;
  }
}
