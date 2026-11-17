/** Screen pixels per icon pixel. Whole numbers keep the squares crisp. */
const ICON_SCALE = 2;
/** The small control icons are drawn on a 7 by 7 grid at this scale, so they all share one size and weight. */
const CONTROL_SCALE = 2;

/** Turns rows of `#` and `.` into an SVG of square pixels in the current text colour. */
function pixels(rows: string[], scale = ICON_SCALE): string {
  const w = rows[0].length;
  const runs: string[] = [];
  rows.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g)) runs.push(`M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`);
  });
  return `<svg viewBox="0 0 ${w} ${rows.length}" width="${w * scale}" height="${rows.length * scale}" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path d="${runs.join('')}"/></svg>`;
}

export const ICONS = {
  settings: pixels(['.........', '.....##..', '#########', '.....##..', '.........', '.##......', '#########', '.##......']),
  timer: pixels(['..#####..', '.#.....#.', '#...#...#', '#...#...#', '#...##..#', '#.......#', '.#.....#.', '..#####..']),
  close: pixels(['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']),
  next: pixels(['#.....##', '##....##', '###...##', '####..##', '#####.##', '####..##', '###...##', '##....##', '#.....##']),
  prev: pixels(['##.....#', '##....##', '##...###', '##..####', '##.#####', '##..####', '##...###', '##....##', '##.....#']),
  volume: pixels(['...#.....', '..##...#.', '####..#.#', '####..#.#', '####..#.#', '..##...#.', '...#.....']),
  search: pixels(['..####...', '.#....#..', '#......#.', '#......#.', '#......#.', '.#....##.', '..####.##', '.......##']),
  back: pixels(['....#', '...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.', '....#']),
  // Control icons: one 7 by 7 grid, chunky, so they sit together in a row without looking mismatched.
  plus: pixels(['...#...', '...#...', '...#...', '#######', '...#...', '...#...', '...#...'], CONTROL_SCALE),
  trash: pixels(['..###..', '#######', '.#####.', '.#.#.#.', '.#.#.#.', '.#.#.#.', '.#####.'], CONTROL_SCALE),
  play: pixels(['##.....', '####...', '######.', '#######', '######.', '####...', '##.....'], CONTROL_SCALE),
  pause: pixels(['.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.'], CONTROL_SCALE),
  restart: pixels(['#....##', '#...###', '#..####', '#.#####', '#..####', '#...###', '#....##'], CONTROL_SCALE),
  gear: pixels(['..#.#..', '.#####.', '#######', '###.###', '#######', '.#####.', '..#.#..'], CONTROL_SCALE),
  link: pixels(['.......', '.##.##.', '#..#..#', '#.###.#', '#..#..#', '.##.##.', '.......'], CONTROL_SCALE),
  fonts: pixels(['#######', '#..#..#', '...#...', '...#...', '...#...', '...#...', '..###..'], CONTROL_SCALE),
  view: pixels(['.......', '..###..', '.#...#.', '#.###.#', '.#...#.', '..###..', '.......'], CONTROL_SCALE),
  clock: pixels(['..###..', '.#...#.', '#..#..#', '#..####', '#.....#', '.#...#.', '..###..'], CONTROL_SCALE),
  edit: pixels(['.....#.', '....###', '...###.', '..###..', '.###...', '###....', '#......'], CONTROL_SCALE),
} as const;
