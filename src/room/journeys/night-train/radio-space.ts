// Round outward so scaled scenery cannot leave a bright edge behind the radio.
const RADIO_LEFT = 0.39;
const RADIO_RIGHT = 0.62;
const RADIO_TOP = 0.74;
const RADIO_BOTTOM = 0.97;
const EDGE_MARGIN = 2 / 270; // Leave room for the carriage's one-pixel sway.

/** Call inside save/restore; only ground texture is drawn before this clip. */
export function leaveRadioClear(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const margin = height * EDGE_MARGIN;
  const left = Math.max(0, Math.floor(width * RADIO_LEFT - margin));
  const right = Math.min(width, Math.ceil(width * RADIO_RIGHT + margin));
  const top = Math.max(0, Math.floor(height * RADIO_TOP - margin));
  const bottom = Math.min(height, Math.ceil(height * RADIO_BOTTOM + margin));
  ctx.beginPath();
  ctx.rect(0, 0, width, top);
  ctx.rect(0, top, left, height - top);
  ctx.rect(right, top, width - right, height - top);
  ctx.rect(left, bottom, right - left, height - bottom);
  ctx.clip();
}
