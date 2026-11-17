/**
 * Small wrapper over the browser's local storage. Storage can be unavailable (private windows,
 * blocked site data); reads then return the fallback and the failure is logged, never thrown.
 */
export function readJson<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch (err) {
    console.warn(`[store] could not read ${key}`, err);
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[store] could not save ${key}`, err);
  }
}
