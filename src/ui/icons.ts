const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  notes: svg('<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8.5 12h7M8.5 15.5h5"/>'),
  tasks: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.2l2.4 2.4 4.8-5"/>'),
  timer: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.4 1.6M9.5 2.8h5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  play: svg('<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5.5v13M16 5.5v13" stroke-width="2.6"/>'),
  next: svg('<path d="M6 6v12l8.5-6z" fill="currentColor"/><path d="M18 6v12" stroke-width="2.2"/>'),
  prev: svg('<path d="M18 6v12l-8.5-6z" fill="currentColor"/><path d="M6 6v12" stroke-width="2.2"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  trash: svg('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>'),
  back: svg('<path d="M14.5 6L8.5 12l6 6"/>'),
  shuffle: svg('<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.6 3.4-3.4M13.1 9.4C13.9 7.6 14.9 7 16.5 7H20M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>'),
  volume: svg('<path d="M5 9.5h3l4-3.5v12l-4-3.5H5z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>'),
  reset: svg('<path d="M5 12a7 7 0 107-7H9"/><path d="M11 2.5L8.5 5 11 7.5"/>'),
  scenery: svg('<path d="M3 18.5l5.5-7 4 5 2.5-3 6 5z"/><circle cx="16.5" cy="7" r="2.2"/>'),
  skip: svg('<path d="M6 6v12l8.5-6z"/><path d="M18 6v12"/>'),
} as const;
