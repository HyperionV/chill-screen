import { css, mix, type RGB } from '../../../render/color';
import type { Look } from '../../../wallpapers/look';
import type { SkyState } from '../../sky';

/** Where the sky meets the land, as a share of the height: the sky is painted down to here, so it must reach below the lowest hills (the town's ridges end near row 194 of 270) or a dark band shows between them. */
export const SKY_HORIZON = 0.72;

/** The average colour of the land by day, and the cool moonlit blue it is pulled towards at night. */
const LAND_LIGHT: RGB = [156, 164, 132];
const NIGHT_LIGHT: RGB = [30, 42, 84];
/** How far night pulls the land towards blue: lifted, so the pines stay readable. */
const NIGHT_SHADE = 0.46;
/** Warm orange laid over the land while the sun is low. */
const DUSK_ORANGE: RGB = [238, 146, 88];
const DUSK_SHADE = 0.16;
/** How much of the sky's own light colour is stirred into the orange. */
const DUSK_SKY_MIX = 0.45;
/** The sun counts as "low" until it is this high (0..1 of its sky arc) times the factor below. */
const SUN_HIGH_FACTOR = 2;
const SUN_VISIBLE_FROM = -0.02;
const SUN_GLOW_STRENGTH = 0.65;
const SKY_SHARE_IN_MEAN = 0.4;
const LAND_TINT_SHARE = 0.6;
const AIR_MIX = 0.55;

const luma = (color: RGB): number => (color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722) / 255;

/** How bright and what colour the picture is right now: the room's light follows it. */
export function updateLook(look: Look, state: SkyState): void {
  const { sky, day, sun } = state;
  const night = 1 - day;
  const air = mix(sky.zenith, sky.horizon, AIR_MIX);
  const land = mix(LAND_LIGHT, NIGHT_LIGHT, night * NIGHT_SHADE);
  look.mean = luma(air) * SKY_SHARE_IN_MEAN + luma(land) * (1 - SKY_SHARE_IN_MEAN);
  look.night = night;
  look.tint = mix(air, land, LAND_TINT_SHARE);
  look.sun = sun.up > SUN_VISIBLE_FROM ? { u: sun.u, v: sun.v, strength: SUN_GLOW_STRENGTH, color: sky.light } : null;
}

/** Lays the night blue and the sunset orange over what is already drawn on the buffer (and only over drawn pixels). */
export function tintLand(ctx: CanvasRenderingContext2D, width: number, height: number, state: SkyState): void {
  const night = 1 - state.day;
  const orange = (1 - Math.min(1, Math.max(0, state.sun.up) * SUN_HIGH_FACTOR)) * state.day;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = css(NIGHT_LIGHT, night * NIGHT_SHADE);
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = css(mix(DUSK_ORANGE, state.sky.light, DUSK_SKY_MIX), orange * DUSK_SHADE);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
