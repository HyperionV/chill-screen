import { readLook } from './look';

/**
 * The user's wallpapers, kept as image files in the browser's own database so they survive restarts
 * without a server. Images are large, so they live here rather than in local storage.
 */
const DB_NAME = 'chillscreen';
const DB_VERSION = 1;
const STORE = 'wallpapers';

const THUMB_WIDTH = 320;

export interface Wallpaper {
  id: string;
  name: string;
  blob: Blob;
  /** A small copy for the picker, so it never decodes full-size pictures. */
  thumb: Blob;
  /** Average brightness 0..1, used to show darker pictures at night. */
  mean: number;
  added: number;
}

const isWallpaper = (v: unknown): v is Wallpaper =>
  typeof v === 'object' && v !== null &&
  'id' in v && typeof v.id === 'string' &&
  'name' in v && typeof v.name === 'string' &&
  'blob' in v && v.blob instanceof Blob &&
  'thumb' in v && v.thumb instanceof Blob &&
  'mean' in v && typeof v.mean === 'number' &&
  'added' in v && typeof v.added === 'number';

async function thumbnail(bitmap: ImageBitmap): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = THUMB_WIDTH;
  c.height = Math.round((bitmap.height / bitmap.width) * THUMB_WIDTH);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('thumbnail could not be made'))), 'image/webp', 0.8));
}

let opening: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('wallpaper storage could not be opened'));
  });
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const req = work(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('wallpaper storage request failed'));
  }));
}

/** Every saved wallpaper, oldest first. */
export async function listWallpapers(): Promise<Wallpaper[]> {
  const all: unknown[] = await run('readonly', (s) => s.getAll());
  return all.filter(isWallpaper).sort((a, b) => a.added - b.added);
}

/**
 * Saves the image files among `files`. Files that are not images, or that the browser cannot open,
 * are skipped and named in `skipped` so the person can be told.
 */
export async function addWallpapers(files: Iterable<File>): Promise<{ added: number; skipped: string[] }> {
  let added = 0;
  const skipped: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      skipped.push(file.name);
      continue;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (err) {
      console.warn(`[wallpapers] ${file.name} could not be opened`, err);
      skipped.push(file.name);
      continue;
    }
    const item: Wallpaper = {
      id: crypto.randomUUID(), name: file.name, blob: file, thumb: await thumbnail(bitmap),
      mean: readLook(bitmap).mean, added: Date.now() + added,
    };
    bitmap.close();
    await run('readwrite', (s) => s.put(item));
    added++;
  }
  return { added, skipped };
}

export function removeWallpaper(id: string): Promise<undefined> {
  return run('readwrite', (s) => s.delete(id));
}
