import type { InkMode, PenId } from "draw-svelte";

export type DebugState = {
  placement: "bottom" | "left" | "right";
  theme: "light" | "dark" | "auto";
  depth: "flat" | "soft" | "regular" | "strong";
  settings: "bar" | "tool";
  align: "start" | "center" | "end";
  look: "classic" | "studio";
  gauge: boolean;
  shortcuts: boolean;
  ink: InkMode;
  chrome: boolean;
  motion: "rise" | "none";
  tooltips: false | "all" | "tools";
  eraser: boolean;
  transparent: boolean;
  draggable: boolean;
  /** Empty means "all of them". */
  tools: PenId[];
  controls: {
    color: boolean;
    size: boolean;
    opacity: boolean;
    custom: boolean;
    undo: boolean;
    clear: boolean;
    minimize: boolean;
  };
};

export const defaults: DebugState = {
  placement: "bottom",
  theme: "light",
  depth: "regular",
  settings: "bar",
  align: "center",
  look: "classic",
  gauge: false,
  shortcuts: true,
  ink: "auto",
  chrome: true,
  motion: "rise",
  tooltips: "all",
  eraser: true,
  transparent: false,
  draggable: false,
  tools: [],
  controls: {
    color: true,
    size: true,
    opacity: true,
    custom: true,
    undo: true,
    clear: true,
    minimize: true,
  },
};

