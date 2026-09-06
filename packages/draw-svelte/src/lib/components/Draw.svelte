<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { PENS, PEN_BY_ID } from "../engine/pens.js";
  import { toPng as rasterise, toSvg as serialise } from "../engine/serialize.js";
  import type { Board, PenId, Stroke, ToolId } from "../engine/types.js";
  import { DrawingController } from "../state/drawing.svelte.js";
  import DrawSurface, { type Tool } from "./DrawSurface.svelte";
  import Toolbar, {
    type ToolState,
    type TooltipOptions,
  } from "./Toolbar.svelte";
  import css from "./Draw.module.css";
  import "./tokens.css";

  export type DrawControls = {
    color?: boolean;
    size?: boolean;
    opacity?: boolean;
    undo?: boolean;
    clear?: boolean;
    custom?: boolean;
    minimize?: boolean;
  };

  export type InkMode = "shared" | "per-tool" | "auto";

  /**
   * `rise` comes in off whichever edge the bar is on and leaves back through it.
   * `none` is instant, and is also what a reduced-motion setting falls back to.
   */
  export type MotionPreset = "rise" | "none";

  export type MotionOptions = {
    in?: MotionPreset;
    out?: MotionPreset;
    /** Milliseconds, for both directions. */
    duration?: number;
  };

  export type DrawProps = {
    board?: Board;
    background?: string;
    initialStrokes?: Stroke[];
    onChange?: (strokes: Stroke[]) => void;
    chrome?: boolean;
    /**
     * How the bar arrives and leaves when `chrome` is switched.
     *
     * A single name sets both directions; the object form is for when they
     * differ. `duration` is milliseconds and covers whichever way is playing.
     */
    motion?: MotionPreset | MotionOptions;
    placement?: "bottom" | "left" | "right";
    inset?: number | string;
    align?: "start" | "center" | "end";
    theme?: "light" | "dark" | "auto";
    drawWhenMinimized?: boolean;
    startMinimized?: boolean;
    shortcuts?: boolean;
    swatches?: string[];
    tooltips?: boolean | TooltipOptions;
    tools?: PenId[];
    eraser?: boolean;
    controls?: DrawControls;
    settings?: "bar" | "tool";
    look?: "classic" | "studio";
    gauge?: boolean;
    draggable?: boolean;
    ink?: InkMode;
    depth?: "flat" | "soft" | "regular" | "strong";
    class?: string;
    className?: string;
    style?: string;
  };

  let {
    board,
    background = "#ffffff",
    initialStrokes = [],
    onChange,
    chrome = true,
    motion,
    placement = "bottom",
    inset,
    align = "center",
    theme = "light",
    drawWhenMinimized = false,
    startMinimized = false,
    shortcuts = true,
    swatches,
    tooltips = true,
    tools,
    eraser = true,
    controls,
    settings = "bar",
    look = "classic",
    gauge = false,
    draggable = false,
    ink: inkMode = "auto",
    depth = "regular",
    class: className,
    className: reactClassName,
    style,
  }: DrawProps = $props();

  // These are intentionally initial-value props, matching the React package:
  // later changes are made through the public controller methods.
  // svelte-ignore state_referenced_locally
  const drawing = new DrawingController(initialStrokes);
  let root: HTMLDivElement;
  let barElement = $state() as HTMLDivElement;
  // svelte-ignore state_referenced_locally
  let collapsed = $state(startMinimized);
  let measured = $state<Board>({ w: 1600, h: 1000 });
  let inks = $state<Partial<Record<PenId, string>>>({});
  // svelte-ignore state_referenced_locally
  let ink = $state(theme === "dark" ? "#f2f1ef" : "#111111");
  let chosen = false;
  const tuned: Partial<
    Record<PenId, { size: number; opacity: number }>
  > = {};
  // svelte-ignore state_referenced_locally
  let tool = $state<ToolState>({
    active: "pen",
    color: theme === "dark" ? "#f2f1ef" : "#111111",
    size: PEN_BY_ID.pen.defaultSize,
    opacity: PEN_BY_ID.pen.defaultOpacity,
    eraserSize: 28,
  });
  let pin = $state<{
    x: { side: "left" | "right"; gap: number };
    y: { side: "top" | "bottom"; gap: number };
  } | null>(null);
  let held = $state(false);
  let holding = false;
  let grab = { dx: 0, dy: 0 };
  let fold = $state(0);
  let foldOrigin = $state("center");
  // svelte-ignore state_referenced_locally
  let live = $state(chrome);
  let leaving = $state(false);

  const startingInk = $derived(theme === "dark" ? "#f2f1ef" : "#111111");
  const paint = $derived(
    background === "transparent" || background === "checker"
      ? null
      : background,
  );
  const surfaceBoard = $derived(board ?? measured);
  const pens = $derived(
    tools ? tools.map((id) => PEN_BY_ID[id]).filter(Boolean) : PENS,
  );
  const surfaceTool = $derived<Tool>(
    tool.active === "eraser"
      ? { kind: "eraser", size: tool.eraserSize }
      : {
          kind: "pen",
          pen: tool.active,
          color: tool.color,
          size: tool.size,
          opacity: tool.opacity,
        },
  );
  const insetValue = $derived(
    typeof inset === "number" ? `${inset}px` : inset,
  );
  const move = $derived<MotionOptions>(
    typeof motion === "string"
      ? { in: motion, out: motion }
      : (motion ?? {}),
  );
  const enterWith = $derived(move.in ?? "rise");
  const exitWith = $derived(move.out ?? move.in ?? "rise");
  const pinnedStyle = $derived(
    pin
      ? [
          `left:${pin.x.side === "left" ? `${pin.x.gap}px` : "auto"}`,
          `right:${pin.x.side === "right" ? `${pin.x.gap}px` : "auto"}`,
          `top:${pin.y.side === "top" ? `${pin.y.gap}px` : "auto"}`,
          `bottom:${pin.y.side === "bottom" ? `${pin.y.gap}px` : "auto"}`,
          "translate:none",
          "max-width:none",
          "max-height:none",
          `--fold-origin:${pin.x.side} ${pin.y.side}`,
        ].join(";")
      : `--fold-origin:${foldOrigin}`,
  );

  function inkFor(id: PenId) {
    return inkMode === "shared"
      ? ink
      : (inks[id] ??
          (inkMode === "auto" ? PEN_BY_ID[id].defaultColor : undefined) ??
          ink);
  }

  function select(id: ToolId) {
    if (id === "eraser") {
      tool = { ...tool, active: "eraser" };
      return;
    }
    const preset = PEN_BY_ID[id];
    const last = tuned[id];
    tool = {
      ...tool,
      active: id,
      size: last?.size ?? preset.defaultSize,
      opacity: last?.opacity ?? preset.defaultOpacity,
      color: inkFor(id),
    };
  }

  function patch(change: Partial<ToolState>) {
    if (change.color && tool.active !== "eraser") {
      chosen = true;
      const own =
        inkMode === "per-tool" ||
        (inkMode === "auto" && Boolean(PEN_BY_ID[tool.active].defaultColor));
      if (own) inks = { ...inks, [tool.active]: change.color };
      else ink = change.color;
    }
    if (
      (change.size !== undefined || change.opacity !== undefined) &&
      tool.active !== "eraser"
    ) {
      tuned[tool.active] = {
        size: change.size ?? tool.size,
        opacity: change.opacity ?? tool.opacity,
      };
    }
    tool = { ...tool, ...change };
  }

  function nudgeSize(delta: number) {
    if (tool.active === "eraser") {
      tool = {
        ...tool,
        eraserSize: Math.max(
          1,
          Math.min(120, tool.eraserSize + delta),
        ),
      };
      return;
    }
    const size = Math.max(1, Math.min(80, tool.size + delta));
    tuned[tool.active] = { size, opacity: tool.opacity };
    tool = { ...tool, size };
  }

  export function toSvg() {
    return serialise(
      drawing.strokes,
      surfaceBoard.w,
      surfaceBoard.h,
      paint,
    );
  }

  export function toPng(scale = 2) {
    return rasterise(
      drawing.strokes,
      surfaceBoard.w,
      surfaceBoard.h,
      paint,
      scale,
    );
  }

  export async function download(
    name = "drawing",
    format: "svg" | "png" = "svg",
    scale = 2,
  ) {
    const blob =
      format === "png"
        ? await toPng(scale)
        : new Blob([toSvg()], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.${format}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  export function getStrokes() {
    return drawing.strokes;
  }

  export function setStrokes(strokes: Stroke[]) {
    drawing.commit(strokes);
  }

  export function undo() {
    drawing.undo();
  }

  export function redo() {
    drawing.redo();
  }

  export function clear() {
    drawing.clear();
  }

  export function getSize() {
    return surfaceBoard;
  }

  function pinTo(left: number, top: number) {
    if (!root || !barElement) return;
    const rect = root.getBoundingClientRect();
    const width = barElement.offsetWidth;
    const height = barElement.offsetHeight;
    const padding = 8;
    const x = Math.min(
      Math.max(left, padding),
      Math.max(padding, rect.width - padding - width),
    );
    const y = Math.min(
      Math.max(top, padding),
      Math.max(padding, rect.height - padding - height),
    );
    const right = rect.width - x - width;
    const bottom = rect.height - y - height;
    pin = {
      x:
        x <= right
          ? { side: "left", gap: x }
          : { side: "right", gap: right },
      y:
        y <= bottom
          ? { side: "top", gap: y }
          : { side: "bottom", gap: bottom },
    };
  }

  function barDown(event: PointerEvent) {
    if (!draggable || collapsed) return;
    if (
      (event.target as HTMLElement).closest("button,input,[role='slider']")
    ) {
      return;
    }
    event.preventDefault();
    try {
      barElement.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }
    const bar = barElement.getBoundingClientRect();
    const rect = root.getBoundingClientRect();
    grab = {
      dx: event.clientX - bar.left,
      dy: event.clientY - bar.top,
    };
    pinTo(bar.left - rect.left, bar.top - rect.top);
    holding = true;
    held = true;
  }

  function barMove(event: PointerEvent) {
    if (!held) return;
    const rect = root.getBoundingClientRect();
    pinTo(
      event.clientX - rect.left - grab.dx,
      event.clientY - rect.top - grab.dy,
    );
  }

  function barUp(event: PointerEvent) {
    if (!held) return;
    try {
      barElement.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }
    holding = false;
    held = false;
  }

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        measured = { w: Math.round(width), h: Math.round(height) };
      }
    });
    observer.observe(root);
    return () => observer.disconnect();
  });

  $effect(() => {
    onChange?.(drawing.strokes);
  });

  $effect(() => {
    if (chosen) return;
    ink = startingInk;
    tool = { ...untrack(() => tool), color: startingInk };
  });

  $effect(() => {
    if (
      theme !== "auto" ||
      chosen ||
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ) {
      return;
    }
    ink = "#f2f1ef";
    tool = { ...untrack(() => tool), color: "#f2f1ef" };
  });

  $effect(() => {
    if (!shortcuts || typeof window === "undefined") return;
    function key(event: KeyboardEvent) {
      if (
        !root.contains(document.activeElement) &&
        document.activeElement !== document.body
      ) {
        return;
      }
      const meta = event.metaKey || event.ctrlKey;
      const value = event.key.toLowerCase();
      if (meta && value === "z") {
        event.preventDefault();
        if (event.shiftKey) drawing.redo();
        else drawing.undo();
        return;
      }
      if (meta && value === "y") {
        event.preventDefault();
        drawing.redo();
        return;
      }
      if (meta) return;
      if (value === "e" && eraser) select("eraser");
      else if (value === "[") nudgeSize(-1);
      else if (value === "]") nudgeSize(1);
      else {
        const pen = pens.find((candidate) => candidate.key === value);
        if (pen) select(pen.id);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  $effect(() => {
    if (!pin || !barElement || typeof ResizeObserver === "undefined") return;
    function settle() {
      if (holding) return;
      const rect = root.getBoundingClientRect();
      const bar = barElement.getBoundingClientRect();
      pinTo(bar.left - rect.left, bar.top - rect.top);
    }
    const observer = new ResizeObserver(settle);
    observer.observe(barElement);
    window.addEventListener("resize", settle);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", settle);
    };
  });

  $effect(() => {
    collapsed;
    placement;
    pin;
    if (!collapsed || pin || !root || !barElement) {
      fold = 0;
      return;
    }
    const rect = root.getBoundingClientRect();
    const bar = barElement.getBoundingClientRect();
    const horizontal = placement === "bottom";
    const span = horizontal ? rect.width : rect.height;
    const centre = horizontal
      ? bar.left + bar.width / 2 - rect.left
      : bar.top + bar.height / 2 - rect.top;
    const direction = centre / span < 0.48 ? -1 : 1;
    const gap = horizontal
      ? rect.bottom - bar.bottom
      : bar.left - rect.left;
    const half = horizontal ? 28 : 33;
    const target =
      direction < 0 ? gap + half : span - gap - half;
    fold = target - centre;
    foldOrigin = horizontal
      ? "center"
      : direction < 0
        ? "center top"
        : "center bottom";
  });

  /* Keep the toolbar mounted while its exit animation plays. */
  $effect(() => {
    if (chrome) {
      leaving = false;
      live = true;
    } else if (exitWith === "none") {
      live = false;
      leaving = false;
    } else {
      leaving = true;
    }
  });
</script>

<div
  bind:this={root}
  class={`sd ${css.root} ${className ?? reactClassName ?? ""}`}
  data-theme={theme}
  data-placement={placement}
  data-depth={depth}
  data-background={background === "transparent" ? "none" : undefined}
  {style}
  tabindex="-1"
>
  <DrawSurface
    drawing={drawing}
    board={surfaceBoard}
    {background}
    tool={surfaceTool}
    disabled={chrome && collapsed && !drawWhenMinimized}
    class={css.surface}
  />

  {#if live}
    <div
      bind:this={barElement}
      role="group"
      aria-label="Drawing tools"
      class={css.toolbar}
      data-placement={placement}
      data-align={align}
      data-motion-in={enterWith}
      data-motion-out={exitWith}
      data-leaving={leaving || undefined}
      data-draggable={draggable && !collapsed ? "" : undefined}
      data-held={held ? "" : undefined}
      style={`--sd-inset:${insetValue ?? "20px"};${move.duration ? `--sd-motion:${move.duration}ms;` : ""}${pinnedStyle}`}
      onanimationend={(event) => {
        if (event.target !== event.currentTarget) return;
        if (leaving) {
          live = false;
          leaving = false;
        }
      }}
      onpointerdown={barDown}
      onpointermove={barMove}
      onpointerup={barUp}
      onpointercancel={barUp}
    >
      <Toolbar
        {placement}
        {collapsed}
        onCollapse={() => {
          collapsed = true;
        }}
        onExpand={() => {
          collapsed = false;
        }}
        shift={fold}
        {tool}
        {inkFor}
        {tooltips}
        {pens}
        {eraser}
        {controls}
        {settings}
        {look}
        {gauge}
        {shortcuts}
        {swatches}
        {theme}
        onSelect={select}
        onChange={patch}
        canUndo={drawing.canUndo}
        canRedo={drawing.canRedo}
        onUndo={drawing.undo}
        onRedo={drawing.redo}
        onClear={drawing.clear}
        hasStrokes={drawing.strokes.length > 0}
      />
    </div>
  {/if}
</div>
