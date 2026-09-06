import type { FreehandOptions } from "./freehand.js";

/** A sampled input point: x, y, pressure (0–1). */
export type Point = [number, number, number];

export type PenId =
  | "pencil"
  | "pen"
  | "fineliner"
  | "marker"
  | "highlighter"
  | "brush"
  | "fountain";

/** Anything the toolbar can be holding. */
export type ToolId = PenId | "eraser";

/**
 * A broad-nib pen: a flat edge held at a fixed angle. Width comes from the
 * angle between the nib and the direction of travel, not from pressure, which
 * is what gives calligraphy its thick-and-thin character. The freehand engine
 * has no concept of nib angle, so these strokes use their own outline builder.
 */
export type Pen = {
  id: PenId;
  name: string;
  /** single-key keyboard shortcut */
  key: string;
  defaultSize: number;
  /** default stroke opacity (0–1) */
  defaultOpacity: number;
  /**
   * Colour to switch to when this pen is picked, if it only makes sense in
   * one. Left unset, a pen keeps whatever ink is already selected.
   */
  defaultColor?: string;
  /** SVG mix-blend-mode for the stroke */
  blend?: "normal" | "multiply";
  /** freehand engine options for a given brush size */
  options: (size: number) => FreehandOptions;
};

/** Per-stroke overrides of the pen's shape. Absent fields fall back to it. */
export type StrokeShape = {
  /** nib angle in degrees; only meaningful on a broad-nib pen */
  nibAngle?: number;
  /** how far the stroke tapers in at each end */
  taper?: number;
  /** Whether width came from velocity rather than from the hardware. */
  simulatePressure?: boolean;
};

/** One committed mark. */
export type Stroke = {
  id: number;
  pen: PenId;
  color: string;
  size: number;
  opacity: number;
  points: Point[];
  shape?: StrokeShape;
  /**
   * An eraser pass. Kept in the same list, in order, because erasing must only
   * affect ink already on the page — draw again afterwards and the new mark is
   * untouched, exactly as it would be on paper.
   */
  erase?: boolean;
};

/** The fixed-size surface strokes are drawn onto. */
export type Board = { w: number; h: number };
