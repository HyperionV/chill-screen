export const PACES = ['still', 'slow', 'gentle', 'brisk'] as const;
export type Pace = (typeof PACES)[number];
