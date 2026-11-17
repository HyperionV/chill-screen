# Brief: Journey tuning (build, worktree only)

Work only inside this worktree. TypeScript, strict mode, no `as` casts, no new dependencies. Do not run git, npm or any test; the owner's session type-checks and commits after reading your diff.

## What to build

### 1. A speed setting for the Journey
The Journey scrolls at a fixed `SPEED = 9` in `src/room/journey/journey.ts`. Add a person-chosen pace.

- `src/scene/scene-switch.ts`: add `pace` to `ScenerySettings`. Export `PACES = ['still', 'slow', 'gentle', 'brisk'] as const` and `type Pace`. Default `'gentle'`. Load it field by field in `loadSettings()` like the other fields (an unknown saved value falls back to the default). `update()` already saves partial changes; after saving, call `this.journey.setPace(this.settings.pace)`. Also apply the saved pace once in the constructor.
- `src/room/journey/journey.ts`: add `setPace(pace: Pace)` and a private multiplier. Multipliers: still 0, slow 0.4, gentle 1, brisk 2.2. The scroll line (`this.scroll += SPEED * this.unit * frame.dt`) uses the multiplier. Wind sway and animal moods keep their own clocks, so a "still" Journey still has swaying trees, grazing animals and drifting clouds. Animals walk by their own `x`, which is independent of scroll, so nothing else changes. Import `Pace` as a type from `../../scene/scene-switch` only if that causes no import cycle; if it would, define `Pace` and `PACES` in a new tiny file `src/room/journey/pace.ts` and import it from both places (preferred, to keep the Journey independent of the scene switch).
- `src/ui/scenery.ts`: when the scene is `journey`, add a field "Pace" between the Rain field and the hint, using the existing `segmented(...)` helper and the existing `field(...)` helper. Labels: Still, Slow, Gentle, Brisk. Picking one calls `scenery.update({ pace })`. Add no new CSS classes.

### 2. A fox
Add a third land animal, the fox, to `src/room/journey/wildlife.ts` and `biomes.ts`.

- `Kind` gets `'fox'`. `Biome.wildlife` gets a `fox` number; set `fox` to 0.05 in forest, 0.04 in autumn, 0.03 in meadow, 0 at the lake.
- Sprite: a 14 wide by 7 tall string-map facing right, in the same style as `RABBIT` and `DEER_*`: orange-russet body (`o` [214,112,48]), white chest and tail tip (`w`), dark legs and ear tips (`k` [34,22,18]), pointed snout, bushy tail pointing back (left). Two frames: stand and trot (legs differ). Bake them like the others.
- Behaviour: moods `sit`, `walk` (speed 11), `flee` (speed 70, trotting frames at rate 10). Starts `walk`. A fox walks mostly, sits for 2 to 5 seconds now and then. It flees from the pointer by the same rule as the deer. `maybeSpawn` treats it like deer and rabbit (not near the lake, `lake < 0.25`), with the probability ranges adding up the same way.
- Keep `MAX_ANIMALS = 8`.

## Do not touch
`src/ui/app.ts`, `src/ui/icons.ts`, anything in `src/music/`, any CSS file, `index.html`, other scenes.

## Style rules
Plain names, no magic numbers (named constants with a one-line reason), no dead code, no comments that restate code, keep each file under 1000 lines. Update the Journey hint text in `src/ui/scenery.ts` only if it becomes wrong.

## Answer
Reply first with the list of files changed, one line each, then anything you could not check. Do not paste code.
