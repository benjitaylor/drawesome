export { default as Draw } from "./components/Draw.svelte";
export type {
  DrawControls,
  DrawProps,
  InkMode,
  MotionOptions,
  MotionPreset,
} from "./components/Draw.svelte";
export { default as DrawSurface } from "./components/DrawSurface.svelte";
export type {
  DrawSurfaceProps,
  Tool,
} from "./components/DrawSurface.svelte";
export { default as Toolbar } from "./components/Toolbar.svelte";
export type {
  ToolbarProps,
  ToolState,
  TooltipOptions,
} from "./components/Toolbar.svelte";
export { default as ToolIcon } from "./components/ToolIcon.svelte";
export type {
  Look,
  ToolIconId,
} from "./components/ToolIcon.svelte";
export {
  DrawingController,
  createDrawing,
} from "./state/drawing.svelte.js";

export { PENS, PEN_BY_ID } from "./engine/pens.js";
export { getStroke } from "./engine/freehand.js";
export type { FreehandOptions } from "./engine/freehand.js";
export {
  dotRadius,
  eraseLayers,
  nextId,
  polylinePath,
  strokePath,
} from "./engine/geometry.js";
export { toPng, toSvg } from "./engine/serialize.js";
export {
  MAX_SWATCHES,
  MAX_SWATCHES_COMPACT,
  SWATCHES,
  SWATCHES_COMPACT,
} from "./palette.js";
export type {
  Board,
  Pen,
  PenId,
  Point,
  Stroke,
  StrokeShape,
  ToolId,
} from "./engine/types.js";

/** The public instance exposed by `bind:this` on Draw. */
export type DrawHandle = import("./components/Draw.svelte").default;
