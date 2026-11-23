/**
 * The foreground frame of Water Tower Hill: two leafy branches reaching in from the top corners, in front of
 * everything. They stay in the top rows and the outer fifth of the width, clear of the clock and the cast.
 */
import { ellipse, line, rect, type Ctx } from '../../gravity-falls/art-kit';

/** Top row of the branches: just inside the part of the picture the window shows. */
const BRANCH_TOP = 48;
const BRANCH_REACH = 0.2;
const BRANCH_DROOP = 12;
const CLUSTER_GAP = 6;
const BARK = '#4a3428';
const LEAF = { dark: '#2f5a44', mid: '#4f8a4f', light: '#9fc468', gold: '#d9b85a' } as const;

export function paintTownFront(ctx: Ctx, width: number): void {
  const reach = Math.round(width * BRANCH_REACH);
  for (const side of [1, -1] as const) {
    const edge = side === 1 ? 0 : width;
    line(ctx, BARK, edge, BRANCH_TOP + 2, edge + side * reach, BRANCH_TOP + 2 + BRANCH_DROOP, 2);
    for (let d = 3, i = 0; d <= reach; d += CLUSTER_GAP, i++) {
      const x = edge + side * d;
      const y = BRANCH_TOP + 2 + Math.round((d / reach) * BRANCH_DROOP);
      ellipse(ctx, LEAF.dark, x, y + 3, 5, 4);
      ellipse(ctx, LEAF.mid, x - side, y + 2, 4, 3);
      rect(ctx, LEAF.light, x - 2 * side, y, 2, 1);
      rect(ctx, i % 3 === 0 ? LEAF.gold : LEAF.light, x + side, y + 6, 1, 2);
      rect(ctx, LEAF.dark, x, y + 7, 1, 2 + (i % 2));
    }
  }
}
