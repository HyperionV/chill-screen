// The same ordered pattern keeps edges consistent across light, mist and moss.
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export function dither(x: number, y: number): number {
  return (BAYER[((y & 3) << 2) + (x & 3)] + 0.5) / BAYER.length;
}

export function rect(c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
