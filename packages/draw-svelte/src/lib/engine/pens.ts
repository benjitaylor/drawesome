import type { Pen, PenId } from "./types.js";

/**
 * Adds contrast to the pressure response without changing the width at
 * rest.
 */
const contrast = (t: number) => t * t * (3 - 2 * t);

/**
 * Ordered as they sit in the tray, softest to sharpest character. `key` is
 * the single-press shortcut.
 */
export const PENS: Pen[] = [
  {
    id: "pencil",
    name: "Pencil",
    key: "c",
    defaultSize: 1,
    defaultOpacity: 0.85,
    options: (size) => ({
      size,
      thinning: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      // Graphite is grainy and never lays down evenly.
      variance: 0.85,
    }),
  },
  {
    id: "pen",
    name: "Pen",
    key: "p",
    defaultSize: 6,
    defaultOpacity: 1,
    options: (size) => ({
      size,
      thinning: 0.5,
      streamline: 0.5,
      simulatePressure: true,
      easing: contrast,
      // Ballpoints skip and pool a little; dead-uniform reads as printed.
      variance: 0.3,
    }),
  },
  {
    id: "fineliner",
    name: "Fineliner",
    key: "f",
    defaultSize: 2,
    defaultOpacity: 1,
    options: (size) => ({
      // A technical pen puts down the same line however it's held.
      size,
      thinning: 0,
      streamline: 0.55,
      simulatePressure: false,
    }),
  },
  {
    id: "marker",
    name: "Marker",
    key: "m",
    defaultSize: 18,
    defaultOpacity: 1,
    options: (size) => ({
      size,
      thinning: 0.12,
      streamline: 0.5,
      simulatePressure: true,
      // Felt tips run wet then dry out across a stroke.
      variance: 0.5,
    }),
  },
  {
    id: "highlighter",
    name: "Highlighter",
    key: "h",
    defaultSize: 28,
    defaultOpacity: 0.75,
    defaultColor: "#fff01f",
    blend: "multiply",
    options: (size) => ({
      size,
      thinning: 0,
      streamline: 0.6,
      simulatePressure: false,
      // A chisel laid down and dragged starts and stops on its flat edge.
      // Rounded, a highlight reads as a fat line rather than a swipe.
      flatEnds: true,
    }),
  },
  {
    id: "brush",
    name: "Brush",
    key: "b",
    defaultSize: 14,
    defaultOpacity: 1,
    options: (size) => ({
      size,
      // Wide range, but not so wide that the two ends of it look like
      // different tools.
      thinning: 0.42,
      streamline: 0.55,
      simulatePressure: true,
      /* Opens mid-range rather than at full width. */
      openAt: 0.5,
      easing: contrast,
      /* No opening taper, and a short one at the lift. */
      taperStart: 0,
      taperEnd: size * 1.15,
      // No two loads of a brush are the same, and a stroke that comes to an
      // identical point at both ends every time reads as a stamp.
      variance: 0.9,
    }),
  },
  {
    id: "fountain",
    name: "Fountain Pen",
    key: "g",
    // A broad nib gets its weight from the thick-and-thin, not from the width
    // it starts at: at 13 the thin strokes were already as heavy as the marker
    // and the contrast had nowhere to show.
    defaultSize: 8,
    defaultOpacity: 1,
    options: (size) => ({
      size,
      // Thick-and-thin comes from the nib's angle, not from speed: 45° is the
      // classic hand, thin along that diagonal and full width across it. The
      // nib is round, so the ends stay rounded and a dab is a dot rather than
      // the chisel slab a flat nib would leave.
      nibAngle: 45,
      nibContrast: 0.85,
      // Kept low on purpose. A broad nib's thick-and-thin is a property of
      // which way the hand is going, not of how fast — let speed in as well
      // and the two fight, so neither reads clearly and the hand looks
      // accidental rather than written.
      thinning: 0.1,
      streamline: 0.5,
      simulatePressure: true,
      variance: 0.45,
    }),
  },
];

export const PEN_BY_ID = Object.fromEntries(
  PENS.map((p) => [p.id, p]),
) as Record<PenId, Pen>;
