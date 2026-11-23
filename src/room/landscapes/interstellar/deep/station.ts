/** A slowly rotating ring station with a hub and spokes. */
export class Station {
  /** The offset from the station's centre where a ship docks. */
  readonly dock: { dx: number; dy: number } = { dx: 0, dy: 0 };

  /** The ring radius is in stage pixels at design size. */
  constructor(_unit: number, _ringRadius: number) {}

  draw(_ctx: CanvasRenderingContext2D, _cx: number, _cy: number, _time: number, _alpha: number): void {}

  contains(_x: number, _y: number, _cx: number, _cy: number): boolean {
    return false;
  }
}

/** A tiny ship about ten stage pixels long, drawn at x, y and pointing along heading in radians. */
export class Shuttle {
  constructor(_unit: number) {}

  draw(_ctx: CanvasRenderingContext2D, _x: number, _y: number, _heading: number, _time: number, _alpha: number): void {}
}
