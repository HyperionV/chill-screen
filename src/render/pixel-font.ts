/** A tiny pixel font: letters are 3 pixels wide and 5 tall, one pixel apart. Rows are joined with a slash. */
const GLYPHS: Record<string, string> = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.',
  E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '###/.#./.#./.#./###', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###',
  M: '#.#/###/###/#.#/#.#', N: '##./#.#/#.#/#.#/#.#', O: '.#./#.#/#.#/#.#/.#.', P: '##./#.#/##./#../#..',
  Q: '.#./#.#/#.#/##./.##', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.', T: '###/.#./.#./.#./.#.',
  U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#.#/#.#/###/###/#.#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###',
  0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.',
  4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.', 6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.',
  8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.',
  ' ': '.../.../.../.../...', '.': '.../.../.../.../.#.', ',': '.../.../.../.#./#..', '-': '.../.../###/.../...',
  ':': '.../.#./.../.#./...', '!': '.#./.#./.#./.../.#.', '?': '##./..#/.#./.../.#.', "'": '.#./.#./.../.../...',
  '(': '.#./#../#../#../.#.', ')': '.#./..#/..#/..#/.#.', '&': '.#./#.#/.#./#.#/.##', '/': '..#/..#/.#./#../#..',
  '+': '.../.#./###/.#./...', _: '.../.../.../.../###', '*': '.../#.#/.#./#.#/...', '[': '##./#../#../#../##.',
  ']': '.##/..#/..#/..#/.##',
};
const UNKNOWN = '?';
const GLYPH_W = 3;
const GLYPH_H = 5;
const ADVANCE = GLYPH_W + 1;
const ROWS: Record<string, string[]> = Object.fromEntries(Object.entries(GLYPHS).map(([ch, rows]) => [ch, rows.split('/')]));

/** Upper-cases and strips accents so most titles can be spelled with the font; anything else becomes a question mark. */
export function plainText(text: string): string {
  const stripped = text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toUpperCase();
  return [...stripped].map((ch) => (ch in ROWS ? ch : UNKNOWN)).join('');
}

/** How wide the text is in pixels, without the trailing gap. */
export const textWidth = (text: string): number => (text.length ? text.length * ADVANCE - 1 : 0);

/** Draws already-plain text with its top-left corner at (x, y), one fillRect per lit pixel. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text) {
    const rows = ROWS[ch] ?? ROWS[UNKNOWN];
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) if (rows[row][col] === '#') ctx.fillRect(cx + col, y + row, 1, 1);
    }
    cx += ADVANCE;
  }
}
