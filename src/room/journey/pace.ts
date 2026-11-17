export const PACES = ['still', 'slow', 'gentle', 'brisk'] as const;
export type Pace = (typeof PACES)[number];

/** How fast a journey moves at each pace, as a multiple of its normal speed. Every journey uses the same scale. */
export const PACE_SPEED: Record<Pace, number> = { still: 0, slow: 0.4, gentle: 1, brisk: 2.2 };
