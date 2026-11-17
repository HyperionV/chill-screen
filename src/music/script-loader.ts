const loading = new Map<string, Promise<void>>();

/** Loads an outside script once; later calls share the same wait. */
export function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      loading.delete(src);
      reject(new Error(`Could not load ${new URL(src).host}. Check the internet connection.`));
    };
    document.head.append(el);
  });
  loading.set(src, promise);
  return promise;
}
