import type { Point } from "./types.js";

/** Variable-width stroke outlines. */

export type FreehandOptions = {
  /** Width of the stroke at rest. */
  size?: number;
  /** 0–1: how much speed (or pressure) narrows the line. 0 is a fixed width. */
  thinning?: number;
  /** 0–1: how much the input is smoothed before it's used. */
  streamline?: number;
  /** Reshapes pressure before it becomes a width. */
  easing?: (t: number) => number;
  /** Derive pressure from speed, for input that reports none. */
  simulatePressure?: boolean;
  /** How wide the stroke opens, as a fraction of full pressure. Default 1. */
  openAt?: number;
  /** Square the ends off instead of rounding them. Default false. */
  flatEnds?: boolean;
  /** Distance over which the line fades in at the start, in px. */
  taperStart?: number;
  /** Distance over which the line fades out at the end, in px. */
  taperEnd?: number;
  /**
   * Angle of the nib, in degrees. Travel along it draws thin, travel across it
   * draws thick — which is where a fountain pen's thick-and-thin comes from.
   */
  nibAngle?: number;
  /** 0–1: how much narrower travel along the nib gets. 0 is a round nib. */
  nibContrast?: number;
  /**
   * 0–1: how much this stroke is allowed to differ from a perfectly regular
   * one. Two strokes of the same gesture come out identical otherwise, which
   * is what makes a row of brush marks read as stamped rather than drawn.
   */
  variance?: number;
  /** Whether the stroke is finished. */
  last?: boolean;
};

type Vec = [number, number];

/**
 * The speed, in px between input events, at which a stroke is drawn as
 * thin as `thinning` allows.
 */
const FAST = 26;

/**
 * The distance, in px, over which the width catches up with a change of
 * speed.
 */
const RESPONSE_DISTANCE = 14;

/** Nothing is allowed to thin away to nothing; a stroke always leaves a mark. */
const MIN_RADIUS = 0.4;

/**
 * How narrow a taper is allowed to pull the line, as a fraction of its
 * width.
 */
const TAPER_FLOOR = 0.2;
/** How thin a taper is allowed to get at the very tip. */
const TAPER_TIP = 0.1;

/** How far each band reaches past its own segment. */
const OVERLAP = 0.35;

const dist = (a: Point | Vec, b: Point | Vec) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

/** A repeatable stream of numbers for one stroke. */
function noise(from: Point) {
  let h =
    (Math.round(from[0] * 16) * 374761393 +
      Math.round(from[1] * 16) * 668265263) |
    0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add a ring, turning it the same way as every other ring. */
function add(ring: Vec[], into: Vec[][]) {
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    twice += a[0] * b[1] - b[0] * a[1];
  }
  into.push(twice < 0 ? ring.reverse() : ring);
}

/** Points of a circle. */
function disc(cx: number, cy: number, r: number, into: Vec[][]) {
  // Enough segments that the flat between two of them stays well under a
  // pixel, and never more than that needs.
  const steps = Math.max(
    10,
    Math.min(40, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - 0.12 / r)))),
  );
  // Pushed out so the polygon's *edges* sit on the circle rather than its
  // corners. Drawn the usual way round, every flat falls slightly inside the
  // true radius — while the straight bands between joints run exactly along
  // it, so each disc bites a shallow notch out of the silhouette and a curve
  // comes out visibly scalloped. The overshoot is a fraction of a pixel.
  const rr = r / Math.cos(Math.PI / steps);
  const ring: Vec[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  add(ring, into);
}

/** Smooth the raw input, then walk it at a fixed spacing. */
function walk(points: Point[], streamline: number, step: number) {
  const t = 0.15 + (1 - streamline) * 0.85;

  const smooth: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = smooth[smooth.length - 1];
    smooth.push([
      p[0] + (points[i][0] - p[0]) * t,
      p[1] + (points[i][1] - p[1]) * t,
      points[i][2],
    ]);
  }

  // Speed belongs to the input, so it's measured on the input and carried
  // across. Read off the resampled spacing instead and every stroke would
  // report the same speed, whatever the hand was doing.
  // The first point is a standing start, and stays one. Backfilling it with
  // the speed of the movement that followed means the beginning of the stroke
  // is rewritten thinner the moment the hand moves — the mark you put down is
  // not the mark you are left with, which is what reads as a strange start.
  const speed: number[] = [0];
  for (let i = 1; i < smooth.length; i++)
    speed.push(dist(smooth[i], smooth[i - 1]));

  const out: { p: Vec; pressure: number; speed: number; along: number }[] = [];
  let along = 0;
  out.push({
    p: [smooth[0][0], smooth[0][1]],
    pressure: smooth[0][2] >= 0 ? smooth[0][2] : 0.5,
    speed: speed[0],
    along: 0,
  });

  let carry = 0;
  for (let i = 1; i < smooth.length; i++) {
    const a = smooth[i - 1];
    const b = smooth[i];
    const seg = dist(a, b);
    if (seg === 0) continue;
    let d = step - carry;
    while (d <= seg) {
      const f = d / seg;
      along += step;
      out.push({
        p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        pressure: b[2] >= 0 ? b[2] : 0.5,
        speed: speed[i],
        along,
      });
      d += step;
    }
    carry = seg - (d - step);
  }

  // Always finish on the real last point, so the line ends under the pointer
  // rather than up to a step short of it.
  const last = smooth[smooth.length - 1];
  const tail = out[out.length - 1];
  if (dist(tail.p, last) > 0.01) {
    out.push({
      p: [last[0], last[1]],
      pressure: last[2] >= 0 ? last[2] : 0.5,
      speed: speed[speed.length - 1],
      along: tail.along + dist(tail.p, last),
    });
  }
  return out;
}

/** Build the fillable outline of a stroke. */
export function getStroke(
  raw: Point[],
  options: FreehandOptions = {},
): Vec[][] {
  const {
    size = 16,
    thinning = 0.5,
    streamline = 0.5,
    easing = (t) => t,
    simulatePressure = true,
    taperStart = 0,
    taperEnd = 0,
    variance = 0,
    nibAngle = 0,
    nibContrast = 0,
    openAt = 1,
    flatEnds = false,
  } = options;

  if (size <= 0 || raw.length === 0) return [];

  const nib = size / 2;
  const rings: Vec[][] = [];

  // Fine enough that the discs overlap heavily whatever the nib, so the
  // silhouette reads as a swept edge rather than a row of beads.
  const step = Math.max(0.6, Math.min(3, nib / 3));
  const pts = walk(raw, streamline, step);

  // A tap. One disc — which is also what the first sample of any stroke draws,
  // so beginning to move can only ever extend the mark, never resize it. A pen
  // that tapers in puts down the narrow end of that taper, for the same reason.
  if (pts.length === 1) {
    // Put down what the stroke is about to start at, not the full nib. A pen
    // that opens mid-range and dabs at maximum width jumps the moment you move.
    const open = simulatePressure
      ? 1 - thinning + thinning * easing(Math.max(0, Math.min(1, openAt)))
      : 1;
    const r = taperStart > 0 ? nib * TAPER_FLOOR : nib * open;
    disc(pts[0].p[0], pts[0].p[1], Math.max(MIN_RADIUS, r), rings);
    return rings;
  }

  const total = pts[pts.length - 1].along;

  /*
    Per-stroke variation.

    A real brush is never loaded quite the same way twice: it runs a little fat
    or a little lean, comes to its point sooner at one end than the other, and
    the ink pulses as it goes down. All three are applied here, and all three
    are constants of the stroke rather than of the frame, so nothing shifts
    under the hand while it's being drawn.
  */
  let scale = 1;
  let fadeIn = taperStart;
  let fadeOut = taperEnd;
  let bite = thinning;
  let pulse = (_along: number) => 1;

  if (variance > 0) {
    const rnd = noise(raw[0]);
    // How heavily this one is loaded.
    scale = 1 + (rnd() - 0.5) * 0.2 * variance;
    // Where it comes to its point, differently at each end, so no two strokes
    // are the same symmetrical leaf.
    fadeIn = taperStart * (0.55 + rnd() * 0.9);
    fadeOut = taperEnd * (0.55 + rnd() * 0.9);
    // And how sharply it answers a change of speed. Varying this is what makes
    // one stroke drag and the next one flick, rather than the whole set being
    // the same stroke at slightly different weights.
    bite = Math.min(1, thinning * (0.7 + rnd() * 0.62));
    const phase1 = rnd() * Math.PI * 2;
    const phase2 = rnd() * Math.PI * 2;
    const phase3 = rnd() * Math.PI * 2;
    const wave1 = 60 + rnd() * 90;
    const wave2 = 26 + rnd() * 28;
    const wave3 = 11 + rnd() * 10;
    const depth = 0.115 * variance;
    pulse = (along: number) =>
      1 +
      depth *
        (Math.sin(along / wave1 + phase1) * 0.5 +
          Math.sin(along / wave2 + phase2) * 0.32 +
          Math.sin(along / wave3 + phase3) * 0.18);
  }

  /* Width along the stroke. */
  const radius: number[] = new Array(pts.length);
  const chase = 1 - Math.exp(-step / RESPONSE_DISTANCE);
  // Every stroke opens at rest and thins as the hand gets going, which is both
  // what a real pen does and the only version that leaves the start alone once
  // it has been drawn.
  let pressure = simulatePressure ? openAt : pts[0].pressure;

  for (let i = 0; i < pts.length; i++) {
    if (simulatePressure) {
      // Slow presses hard. Chased rather than applied outright, so a change of
      // pace thickens the line over a few points instead of stepping.
      const target = 1 - Math.min(1, pts[i].speed / FAST);
      pressure += (target - pressure) * chase;
    } else {
      pressure = pts[i].pressure;
    }
    const shaped = easing(Math.max(0, Math.min(1, pressure)));
    let r = nib * (1 - bite + bite * shaped) * scale * pulse(pts[i].along);

    if (nibContrast > 0) {
      // How square-on the stroke is running to the nib. A nib laid at 45° is
      // at its narrowest along that diagonal and its widest across it, which
      // is the whole of the thick-and-thin: it comes from the direction of
      // travel, not from pressure.
      // Measured across several samples, not the two either side. The line is
      // resampled every couple of pixels, so a one-step difference is mostly
      // rounding — and since the nib's width comes straight off this angle,
      // that noise lands directly on the edge of the stroke as a wobble.
      const span = Math.max(2, Math.round(nib / step));
      const prev = pts[Math.max(0, i - span)];
      const next = pts[Math.min(pts.length - 1, i + span)];
      const dx = next.p[0] - prev.p[0];
      const dy = next.p[1] - prev.p[1];
      const l = Math.hypot(dx, dy);
      if (l > 0) {
        const a = Math.atan2(dy, dx) - (nibAngle * Math.PI) / 180;
        r *= 1 - nibContrast * (1 - Math.abs(Math.sin(a)));
      }
    }

    radius[i] = r;
  }

  // Taper the ends. The end taper is only applied once the stroke is finished:
  // while it's being drawn the end is wherever the pointer is, and tapering to
  // it would drag a thin patch around under the cursor and re-cut it on every
  // frame.
  /*
    Smooth the width profile.

    Everything feeding it — simulated pressure, the nib angle, the per-stroke
    pulse — is sampled per point and each carries a little noise. A width that
    steps about from one sample to the next puts every one of those steps on
    the outline as a lump, so the profile is blurred along the stroke before
    any geometry is built from it. It's a blur along the line, not across it:
    the shape of the stroke is untouched, only how fast its width may change.

    Done before the tapers, not after. A taper is already a smooth ramp and
    needs no help — but it's anchored to the ends of the stroke, and the far
    end moves while the line is being drawn. Blur across it and the head of a
    short stroke starts averaging in values that are still changing, so the
    beginning of the mark creeps as the stroke gets longer.
  */
  const window = Math.max(1, Math.round(nib / step));
  for (let pass = 0; pass < 2; pass++) {
    const src = radius.slice();
    for (let i = 0; i < radius.length; i++) {
      let sum = 0;
      let n = 0;
      for (let k = -window; k <= window; k++) {
        const j = i + k;
        if (j < 0 || j >= src.length) continue;
        sum += src[j];
        n++;
      }
      radius[i] = sum / n;
    }
  }

  // Both distances are fixed, never scaled to the length of the stroke. Clamp
  // them to what has been drawn so far and the ramp gets recut on every frame,
  // which makes the line pulse under the hand as it's drawn.
  //
  // The lift-off taper is applied while the stroke is still being drawn, not
  // just once it's finished. The tip of a tapering pen is thin wherever the
  // tip currently is, and it simply travels with the hand. Hold it back until
  // release and the last stretch of the line silently re-cuts itself the
  // instant the pointer comes up, which is the snap on letting go.
  /* Never longer than half of what has been drawn. */
  const inLen = Math.min(fadeIn, total * 0.5);
  const outLen = Math.min(fadeOut, total * 0.5);

  if (inLen > 0 || outLen > 0) {
    for (let i = 0; i < pts.length; i++) {
      const a = inLen > 0 ? Math.min(1, pts[i].along / inLen) : 1;
      const b = outLen > 0 ? Math.min(1, (total - pts[i].along) / outLen) : 1;
      const t = Math.min(a, b);
      /* Rises fast out of the tip, then flattens. */
      const s = Math.pow(t, 0.55);
      radius[i] *= TAPER_TIP + (1 - TAPER_TIP) * s;
    }
  }

  for (let i = 0; i < radius.length; i++)
    radius[i] = Math.max(MIN_RADIUS, radius[i]);

  /* The swept shape. */
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i].p;
    const [x1, y1] = pts[i + 1].p;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l = Math.hypot(dx, dy);
    if (l === 0) continue;

    // The band between this point and the next, reaching a little past both
    // ends so it overlaps its neighbours rather than meeting them edge to edge.
    const nx = -dy / l;
    const ny = dx / l;
    const ex = (dx / l) * OVERLAP;
    const ey = (dy / l) * OVERLAP;
    const ax = x0 - ex;
    const ay = y0 - ey;
    const bx = x1 + ex;
    const by = y1 + ey;
    const r0 = radius[i];
    const r1 = radius[i + 1];
    add(
      [
        [ax + nx * r0, ay + ny * r0],
        [bx + nx * r1, by + ny * r1],
        [bx - nx * r1, by - ny * r1],
        [ax - nx * r0, ay - ny * r0],
      ],
      rings,
    );

    /*
      A disc at the joint fills the wedge that a turn opens on the outside of
      the bend, and rounds both ends of the stroke without either being a
      special case.

      Only where it's actually needed, though. Two bands meeting almost in line
      leave a gap of about `radius x turn`, and below a fraction of a pixel
      there is nothing there to fill — the bands already meet. Emitting one
      regardless is most of the geometry in a straight line, and it lands in
      every exported file.
    */
    const dxPrev = x0 - (pts[i - 1]?.p[0] ?? x0 - dx);
    const dyPrev = y0 - (pts[i - 1]?.p[1] ?? y0 - dy);
    const lPrev = Math.hypot(dxPrev, dyPrev) || 1;
    const turn = Math.abs(
      Math.atan2(dy / l, dx / l) - Math.atan2(dyPrev / lPrev, dxPrev / lPrev),
    );
    const bend = Math.min(turn, Math.PI * 2 - turn);
    // The cap at the very start is the disc that rounds it; a flat-ended tool
    // skips it and keeps the square edge the band already has. The joints in
    // between are still filled, or every turn opens a wedge.
    const cap = i === 0 && !flatEnds;
    if (
      cap ||
      (i > 0 && Math.max(r0, r1) * bend > 0.12) ||
      Math.abs(r1 - r0) > 0.4
    ) {
      disc(x0, y0, r0, rings);
    }
  }

  if (!flatEnds) {
    const end = pts[pts.length - 1];
    disc(end.p[0], end.p[1], radius[radius.length - 1], rings);
  }

  return rings;
}
