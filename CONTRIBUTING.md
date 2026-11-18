# Contributing to ChillScreen

Thank you for wanting to make a calm thing calmer. ChillScreen is a small project with a strong taste, so a few ground rules keep it that way.

## The bar

- **Calm first.** Nothing flashes, nothing jumps, nothing nags. Motion is slow and slight. If a feature makes the screen busier, it probably does not belong.
- **Pixel art, drawn in code.** Scenes are Canvas 2D drawings made from small pixel sprites and fills: no image files, no extra fonts, no new runtime dependencies, no network calls for visuals.
- **Light enough to leave open all day.** 30 frames a second with a budget of about 8 ms per frame. Build sprites once into offscreen canvases, never read pixels back per frame, cap how many things move.
- **The pointer never shifts the picture.** Clicks and hovers may make a creature react, but the background must not slide when the mouse moves.
- **Wind is shared.** Plants, leaves, flags and smoke sway with `breeze()` and `gust()` from `src/room/wind.ts`, so every scene moves with one breeze.

## Setup

```bash
git clone https://github.com/HyperionV/chill-screen.git
cd chill-screen
npm install
npm run dev        # http://localhost:4173
```

## Before you open a pull request

```bash
npm run check      # strict TypeScript, no unused code
npm test           # unit tests
npm run build      # production build
```

For anything visual, include screenshots at a wide size (about 1280 px) and a phone size (about 390 px), in light and in night hours (the Time control in Settings jumps the clock). Scenes must look good at sunrise, noon, sunset and deep night.

## Code style

- TypeScript in strict mode: no `any`, avoid `as`, no unused code, no commented-out code.
- No magic numbers: give constants a name and a short comment saying why.
- One clear job per file; split a file that passes about 600 lines.
- Comments explain why, in plain words.

## Adding a scene

- A **journey** (travels along a route) lives in `src/room/journeys/<name>/` and is registered in `journeys/registry.ts`.
- A **landscape** (a place that stays still but is deep and alive) lives in `src/room/landscapes/<name>/` and is registered in `landscapes/registry.ts`.

Look at an existing one for the pieces every scene has: a route of named chapters, a chapter title, layered depth, a small cast with their own behaviour, and a few gentle interactions.

## Reporting bugs

Open an issue with the browser, what you did, what you expected, and a screenshot if it is visual. For security problems see [SECURITY.md](SECURITY.md).
