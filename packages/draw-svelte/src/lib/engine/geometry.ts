import { getStroke } from "./freehand.js";
import { PEN_BY_ID } from "./pens.js";
import type { PenId, Point, StrokeShape } from "./types.js";

/** Turn a stroke's rings into an SVG path. */
export function getSvgPathFromStroke(rings: number[][][]): string {
  let d = "";
  for (const ring of rings) {
    if (ring.length < 3) continue;
    d += `M${r(ring[0][0])},${r(ring[0][1])}`;
    for (let i = 1; i < ring.length; i++)
      d += `L${r(ring[i][0])},${r(ring[i][1])}`;
    d += "Z";
  }
  return d;
}

function r(n: number) {
  return Math.round(n * 10) / 10;
}

/** Exponential smoothing, on the same scale the stroke engine uses. */
export function streamline(points: Point[], amount: number): Point[] {
  if (points.length < 3 || amount <= 0) return points;
  const t = 0.15 + (1 - amount) * 0.85;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[i - 1];
    const p = points[i];
    out.push([
      prev[0] + (p[0] - prev[0]) * t,
      prev[1] + (p[1] - prev[1]) * t,
      p[2],
    ]);
  }
  return out;
}

/** Build the filled outline path for a finished or in-progress stroke. */
export function strokePath(
  pen: PenId,
  size: number,
  points: Point[],
  isComplete = true,
  shape?: StrokeShape,
): string {
  const preset = PEN_BY_ID[pen];

  const opts = preset.options(size);

  const outline = getStroke(points, {
    ...opts,
    ...(shape?.simulatePressure === undefined
      ? null
      : { simulatePressure: shape.simulatePressure }),
    // A taper override replaces the preset's own, at both ends.
    ...(shape?.taper === undefined
      ? null
      : { taperStart: shape.taper, taperEnd: shape.taper }),
    ...(shape?.nibAngle === undefined ? null : { nibAngle: shape.nibAngle }),
    last: isComplete,
  });
  return getSvgPathFromStroke(outline);
}

/**
 * Radius to draw for a tap / stroke too short to produce an outline, so a
 * deliberate dot is never silently lost.
 */
export function dotRadius(size: number): number {
  return Math.max(0.75, size / 2);
}

let counter = 0;
/** Monotonic stroke id. Only needs to be unique within a session. */
export const nextId = () => ++counter;

/** A smoothed polyline through the raw points. */
export function polylinePath(points: Point[]): string {
  if (points.length === 0) return "";
  const r = (n: number) => Math.round(n * 100) / 100;
  if (points.length === 1) {
    return `M${r(points[0][0])} ${r(points[0][1])} l0.01 0.01`;
  }
  let d = `M${r(points[0][0])} ${r(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    d += ` Q${r(points[i][0])} ${r(points[i][1])} ${r(mx)} ${r(my)}`;
  }
  const last = points[points.length - 1];
  d += ` L${r(last[0])} ${r(last[1])}`;
  return d;
}

/**
 * Split a drawing into layers that each need the same set of eraser
 * passes.
 */
export function eraseLayers(
  strokes: { erase?: boolean }[],
): { ink: number[]; erasers: number[] }[] {
  const eraserIndices = strokes
    .map((s, i) => (s.erase ? i : -1))
    .filter((i) => i >= 0);

  const layers: { ink: number[]; erasers: number[] }[] = [];
  let ink: number[] = [];

  strokes.forEach((s, i) => {
    if (s.erase) {
      if (ink.length) {
        layers.push({ ink, erasers: eraserIndices.filter((e) => e > i - 1) });
        ink = [];
      }
      return;
    }
    ink.push(i);
  });
  if (ink.length) layers.push({ ink, erasers: [] });
  return layers;
}
