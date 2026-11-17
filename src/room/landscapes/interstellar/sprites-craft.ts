import type { RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { mirrored, pixmap } from '../../journeys/pixmap';
import { PixelGrid, type Sprite } from './sprites-base';

export interface CraftSprites {
  /** 4 rotation angles: front, right, back, left. */
  probe: [Sprite, Sprite, Sprite, Sprite];
  astronautIdle: Sprite;
  astronautLookRight: Sprite;
  astronautWaveA: Sprite;
  astronautWaveB: Sprite;
  freighterRight: Sprite;
  freighterLeft: Sprite;
  droneRight: Sprite;
  droneLeft: Sprite;
  shuttleRight: Sprite;
  shuttleLeft: Sprite;
  stationFrames: Sprite[];
}

const PROBE_PALETTE: Record<string, string> = {
  W: '#f4f7ff',
  L: '#cfd8ea',
  S: '#7f8da8',
  D: '#3b445c',
  A: '#dce4f4',
  B: '#52ecff',
  G: '#2092e4',
  T: '#92a0bc',
};

const PROBE_FRONT = [
  '.....AAAAA.....',
  '.......A.......',
  '.....WWWWW.....',
  '....WWWWLLL....',
  '...WWLLGGLLL...',
  '...WLLGBBGLL...',
  '...WLLGBBGSS...',
  '...LLLGGGGSS...',
  '....LLLSSSS....',
  '....SSSDDDD....',
  '.....DDDDD.....',
  '....T..T..T....',
  '...T...T...T...',
  '..T.........T..',
];

const PROBE_SIDE = [
  '.....AAAAA.....',
  '.......A.......',
  '.....WWWWW.....',
  '....WWWWLLL....',
  '...WWLLLGGGL...',
  '...WLLLLGBBGL..',
  '...WLLLLGBBGS..',
  '...LLLLLGGGSS..',
  '....LLLSSSS....',
  '....SSSDDDD....',
  '.....DDDDD.....',
  '....T..T..T....',
  '...T...T...T...',
  '..T.........T..',
];

const PROBE_BACK = [
  '.....AAAAA.....',
  '.......A.......',
  '.....LLSSS.....',
  '....LLLSSSS....',
  '...LLLDDDDSS...',
  '...LLDDDDDDSS..',
  '...LLDDTTDDSS..',
  '...LLLDDDDSS...',
  '....SSSSSSS....',
  '....SSDDDDD....',
  '.....DDDDD.....',
  '....T..T..T....',
  '...T...T...T...',
  '..T.........T..',
];

const ASTRO_PALETTE: Record<string, string> = {
  W: '#f4f7fc',
  L: '#ccd5e6',
  S: '#7e8ba4',
  D: '#323a50',
  V: '#f0b83c',
  H: '#fff0a8',
  P: '#aeb9ce',
  O: '#e6783e',
};

const ASTRO_IDLE = [
  '....WWWWWW....',
  '...WWVVVVWW...',
  '...WVVHHVVW...',
  '...WVVVVVVW...',
  '...LLDDDDLL...',
  '..PPWWOWWPP...',
  '..PPWWWWWWPP..',
  '.WW.WWLLWW.WW.',
  '.W..WWLLWW..W.',
  '.L..LLSSLL..L.',
  '....LLSSLL....',
  '....WWSSWW....',
  '....WW..WW....',
  '....LL..LL....',
  '....LL..LL....',
  '....SS..SS....',
  '...WWL..LWW...',
  '...SSD..DSS...',
];

const ASTRO_LOOK_RIGHT = [
  '....WWWWWW....',
  '...WWWVVVVW...',
  '...WWVVHHVW...',
  '...WWWVVVVW...',
  '...LLDDDDLL...',
  '..PPWWOWWPP...',
  '..PPWWWWWWPP..',
  '.WW.WWLLWW.WW.',
  '.W..WWLLWW..W.',
  '.L..LLSSLL..L.',
  '....LLSSLL....',
  '....WWSSWW....',
  '....WW..WW....',
  '....LL..LL....',
  '....LL..LL....',
  '....SS..SS....',
  '...WWL..LWW...',
  '...SSD..DSS...',
];

const ASTRO_WAVE_A = [
  '...........WW.',
  '....WWWWWW.WL.',
  '...WWVVVVW.W..',
  '...WVVHHVWLL..',
  '...WVVVVVWW...',
  '...LLDDDDL....',
  '..PPWWOWW.....',
  '..PPWWWWWW....',
  '.WW.WWLLWW....',
  '.W..WWLLWW....',
  '.L..LLSSLL....',
  '....LLSSLL....',
  '....WWSSWW....',
  '....WW..WW....',
  '....LL..LL....',
  '....LL..LL....',
  '....SS..SS....',
  '...WWL..LWW...',
];

const ASTRO_WAVE_B = [
  '.............W',
  '....WWWWWW..WW',
  '...WWVVVVW.WL.',
  '...WVVHHVWWL..',
  '...WVVVVVWW...',
  '...LLDDDDL....',
  '..PPWWOWW.....',
  '..PPWWWWWW....',
  '.WW.WWLLWW....',
  '.W..WWLLWW....',
  '.L..LLSSLL....',
  '....LLSSLL....',
  '....WWSSWW....',
  '....WW..WW....',
  '....LL..LL....',
  '....LL..LL....',
  '....SS..SS....',
  '...WWL..LWW...',
];

const FREIGHTER_PALETTE: Record<string, string> = {
  L: '#ccd4e2',
  M: '#8490a6',
  D: '#3e465a',
  C: '#d47e46',
  T: '#48909e',
  W: '#9ceeff',
  E: '#586276',
};

const FREIGHTER_ROWS = [
  '..................LLLL....',
  '...EEE..CCCC.TTTT.LLWWLL..',
  '..EMMML.CCCC.TTTT.MMMMMML.',
  '.EEMMMMMMMMMMMMMMMMMMMMMMM',
  '..EDDDDDDDDDDDDDDDDDDDDDDD',
  '...EEE..DDDD.DDDD..DDDD...',
];

const DRONE_PALETTE: Record<string, string> = {
  L: '#d6deec',
  M: '#7e8aa2',
  D: '#3a4256',
  B: '#58eaff',
  A: '#f2b046',
};

const DRONE_ROWS = [
  '....LLLLLL....',
  '..LLMMMMMMLL..',
  '.LMDDDDDDDDML.',
  '.LDMMBBBBBMDL.',
  '..LDDDDDDDDL..',
  '...AA....AA...',
];

const SHUTTLE_PALETTE: Record<string, string> = {
  W: '#f0f4fc',
  L: '#b8c4d8',
  D: '#445066',
  K: '#243044',
  A: '#e89844',
  B: '#66ecff',
};

const SHUTTLE_ROWS = [
  '.....LLL..........',
  '....WWWWWLLL......',
  '..LWWWWWWWWKKK....',
  '.DWWWWAAAABKKKKL..',
  '..DDDDDDDDDDDDD...',
];

function scaleCanvas(source: HTMLCanvasElement, scale: number): Sprite {
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const { canvas, ctx } = memoryCanvas(w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, w, h);
  return { canvas, w, h };
}

function buildStationFrame(radius: number, angle: number): Sprite {
  const size = radius * 2 + 6;
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const px = new PixelGrid(size, size);

  const outerR = radius;
  const innerR = radius * 0.72;
  const hubR = radius * 0.24;
  const ringDark: RGB = [72, 84, 108];
  const ringMid: RGB = [138, 152, 178];
  const ringLight: RGB = [212, 224, 240];
  const windowWarm: RGB = [255, 214, 120];
  const windowCyan: RGB = [140, 232, 255];

  // Radial spokes + solar radiator fins rotating with `angle`.
  for (let s = 0; s < 4; s++) {
    const a = angle + (s * Math.PI) / 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const steps = Math.ceil(innerR);
    for (let i = Math.floor(hubR); i <= steps; i++) {
      const sx = cx + Math.round(ca * i);
      const sy = cy + Math.round(sa * i);
      px.set(sx, sy, ringMid);
      px.set(sx + (Math.abs(ca) < 0.7 ? 1 : 0), sy + (Math.abs(sa) < 0.7 ? 1 : 0), ringDark);
    }
  }

  // Torus ring with 1px sunlit upper-left rim and lit habitat viewports.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d >= innerR && d <= outerR) {
        const midBand = Math.abs(d - (innerR + outerR) * 0.5) < 1.3;
        const litTopLeft = dx + dy < -radius * 0.25;
        const color = litTopLeft ? ringLight : dx + dy > radius * 0.35 ? ringDark : ringMid;
        px.set(x, y, color);
        if (midBand) {
          const theta = Math.atan2(dy, dx) - angle;
          const cell = Math.floor((((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / 0.26);
          if (cell % 2 === 0 && (x + y) % 2 === 0) {
            px.set(x, y, cell % 4 === 0 ? windowWarm : windowCyan);
          }
        }
      } else if (d <= hubR) {
        const edgeLit = dx + dy < -hubR * 0.3;
        px.set(x, y, d < hubR * 0.45 ? [56, 66, 88] : edgeLit ? ringLight : ringMid);
      }
    }
  }

  return px.toSprite();
}

export function buildCraftSprites(unit: number): CraftSprites {
  const charScale = Math.max(1, unit * 1.25);
  const shipScale = Math.max(1, unit * 1.15);

  const probeFrontRaw = pixmap(PROBE_FRONT, PROBE_PALETTE);
  const probeSideRightRaw = pixmap(PROBE_SIDE, PROBE_PALETTE);
  const probeBackRaw = pixmap(PROBE_BACK, PROBE_PALETTE);
  const probeSideLeftRaw = mirrored(probeSideRightRaw);

  const astroIdleRaw = pixmap(ASTRO_IDLE, ASTRO_PALETTE);
  const astroRightRaw = pixmap(ASTRO_LOOK_RIGHT, ASTRO_PALETTE);
  const astroWaveARaw = pixmap(ASTRO_WAVE_A, ASTRO_PALETTE);
  const astroWaveBRaw = pixmap(ASTRO_WAVE_B, ASTRO_PALETTE);

  const freighterRightRaw = pixmap(FREIGHTER_ROWS, FREIGHTER_PALETTE);
  const freighterLeftRaw = mirrored(freighterRightRaw);

  const droneRightRaw = pixmap(DRONE_ROWS, DRONE_PALETTE);
  const droneLeftRaw = mirrored(droneRightRaw);

  const shuttleRightRaw = pixmap(SHUTTLE_ROWS, SHUTTLE_PALETTE);
  const shuttleLeftRaw = mirrored(shuttleRightRaw);

  const stationRadius = Math.max(20, Math.round(36 * unit));
  const stationFrames = Array.from({ length: 12 }, (_, i) =>
    buildStationFrame(stationRadius, (i / 12) * (Math.PI / 2)),
  );

  return {
    probe: [
      scaleCanvas(probeFrontRaw, charScale * 0.9),
      scaleCanvas(probeSideRightRaw, charScale * 0.9),
      scaleCanvas(probeBackRaw, charScale * 0.9),
      scaleCanvas(probeSideLeftRaw, charScale * 0.9),
    ],
    astronautIdle: scaleCanvas(astroIdleRaw, charScale),
    astronautLookRight: scaleCanvas(astroRightRaw, charScale),
    astronautWaveA: scaleCanvas(astroWaveARaw, charScale),
    astronautWaveB: scaleCanvas(astroWaveBRaw, charScale),
    freighterRight: scaleCanvas(freighterRightRaw, shipScale),
    freighterLeft: scaleCanvas(freighterLeftRaw, shipScale),
    droneRight: scaleCanvas(droneRightRaw, shipScale),
    droneLeft: scaleCanvas(droneLeftRaw, shipScale),
    shuttleRight: scaleCanvas(shuttleRightRaw, shipScale),
    shuttleLeft: scaleCanvas(shuttleLeftRaw, shipScale),
    stationFrames,
  };
}
