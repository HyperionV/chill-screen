import { readJson, writeJson } from '../store';

const KEY = 'chillscreen.fonts';

export const FONT_IDS = ['pixel', 'clean', 'serif', 'mono'] as const;
export type FontId = (typeof FONT_IDS)[number];
export const SIZE_IDS = ['small', 'medium', 'large', 'extra'] as const;
export type SizeId = (typeof SIZE_IDS)[number];

/**
 * The typefaces on offer. Fonts differ a lot in how big they look at the same size, so each carries a fit: the pixel
 * font's letters are small and the others' are large, and the fit makes "Medium" look about equally big in all of them.
 */
export const FONTS: Record<FontId, { label: string; family: string; contentFit: number; clockFit: number }> = {
  pixel: { label: 'Pixel', family: "'VT323', 'Courier New', monospace", contentFit: 1, clockFit: 1.3 },
  clean: { label: 'Clean', family: "'Outfit Variable', 'Segoe UI Variable', sans-serif", contentFit: 0.78, clockFit: 1 },
  serif: { label: 'Serif', family: "Georgia, 'Times New Roman', serif", contentFit: 0.72, clockFit: 0.95 },
  mono: { label: 'Mono', family: "Consolas, 'Courier New', monospace", contentFit: 0.74, clockFit: 0.9 },
};

export const SIZES: Record<SizeId, { label: string; scale: number }> = {
  small: { label: 'Small', scale: 0.85 },
  medium: { label: 'Medium', scale: 1 },
  large: { label: 'Large', scale: 1.2 },
  extra: { label: 'Extra', scale: 1.4 },
};

interface Look {
  font: FontId;
  size: SizeId;
}

/** The big clock and everything else (notes, tasks, panels, the player bar) are set separately. */
interface TypeSettings {
  clock: Look;
  content: Look;
}

const DEFAULTS: TypeSettings = { clock: { font: 'clean', size: 'medium' }, content: { font: 'pixel', size: 'medium' } };

const isLook = (v: unknown): v is Look =>
  typeof v === 'object' && v !== null &&
  'font' in v && FONT_IDS.some((f) => f === v.font) &&
  'size' in v && SIZE_IDS.some((s) => s === v.size);
const isSettings = (v: unknown): v is TypeSettings =>
  typeof v === 'object' && v !== null && 'clock' in v && isLook(v.clock) && 'content' in v && isLook(v.content);

let settings = readJson<TypeSettings>(KEY, DEFAULTS, isSettings);
const listeners = new Set<() => void>();

/** Hands the content's font and size to the style sheets, which read them as `--font` and `--content-scale`. */
function applyContentLook(): void {
  const { font, size } = settings.content;
  document.documentElement.style.setProperty('--font', FONTS[font].family);
  document.documentElement.style.setProperty('--content-scale', String(SIZES[size].scale * FONTS[font].contentFit));
}

export const typography = {
  get clock(): Look {
    return settings.clock;
  },
  get content(): Look {
    return settings.content;
  },
  set(part: 'clock' | 'content', change: Partial<Look>): void {
    settings = { ...settings, [part]: { ...settings[part], ...change } };
    writeJson(KEY, settings);
    applyContentLook();
    for (const fn of listeners) fn();
  },
  onChange(fn: () => void): void {
    listeners.add(fn);
  },
};

/** The font family and size multiplier for the big clock. */
export function clockLook(): { family: string; scale: number } {
  const { font, size } = settings.clock;
  return { family: FONTS[font].family, scale: SIZES[size].scale * FONTS[font].clockFit };
}

applyContentLook();
