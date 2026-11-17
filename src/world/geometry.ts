/** Shape of the tank in world units. The tank is always 1000 units tall. */

export const TANK_HEIGHT = 1000;
export const SURFACE_Y = 70;
/** The back edge of the sand; the front edge sits SAND_DEPTH lower. */
export const SAND_BACK_Y = 842;
export const SAND_DEPTH = 120;
export const WALL_MARGIN = 50;
export const ALGAE_CELLS = 48;

/** Gentle dunes along the sand, stable for a given x. */
export const duneOffset = (x: number): number => Math.sin(x * 0.004) * 10 + Math.sin(x * 0.011 + 1.3) * 5;

/** Height of the sand surface at horizontal position x and depth z (0 back, 1 front). */
export const floorAt = (x: number, z: number): number => SAND_BACK_Y + z * SAND_DEPTH + duneOffset(x);

export const algaeCellAt = (x: number, width: number): number =>
  Math.max(0, Math.min(ALGAE_CELLS - 1, Math.floor((x / width) * ALGAE_CELLS)));

/** Size multiplier for something at depth z, so far things look smaller. */
export const depthScale = (z: number): number => 0.62 + 0.38 * z;
