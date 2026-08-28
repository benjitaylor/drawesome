import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { PENS, PEN_BY_ID } from "../engine/pens";
import { toPng, toSvg } from "../engine/serialize";
import type { TooltipOptions } from "./Tooltip";
import type { Board, PenId, Stroke, ToolId } from "../engine/types";
import { useDrawing } from "../hooks/use-drawing";
import { DrawSurface, type Tool } from "./DrawSurface";
import { Toolbar, type ToolState } from "./Toolbar";
import { ToolIcon } from "./ToolIcon";
import css from "./Draw.module.css";
import "./tokens.css";

/** Which of the built-in controls the toolbar offers. */
export type DrawControls = {
  /** Ink colour: the swatches, and the hex/eyedropper panel behind them. */
  color?: boolean;
  /** The size slider, and the opacity slider, separately. */
  size?: boolean;
  opacity?: boolean;
  undo?: boolean;
  clear?: boolean;
  /**
   * The swatch that opens the hex field and the spectrum.
   *
   * On by default, and worth turning off on a phone, where a brand palette is
   * usually the whole point and picking an arbitrary colour on a small screen
   * is fiddly enough that nobody does it.
   */
  custom?: boolean;
  /** The button that collapses the bar into a disc. */
  minimize?: boolean;
};

/** How ink colour is shared between the tools. */
export type InkMode =
  /** One colour for everything. The highlighter is yellow like anything else. */
  | "shared"
  /** Every tool remembers its own, and the tray shows what each will draw with. */
  | "per-tool"
  /**
   * Shared, except where a tool only makes sense in its own colour — which in
   * practice means the highlighter starts yellow. The default.
   */
  | "auto";

/** What `Draw` exposes to the code that mounts it. */
export type DrawHandle = {
  /** The drawing as a standalone SVG string. */
  toSvg: () => string;
  /** The drawing rasterised. `scale` is a device-pixel multiplier. */
  toPng: (scale?: number) => Promise<Blob>;
  /** Save straight to a file. Extension picked from the format. */
  download: (
    name?: string,
    format?: "svg" | "png",
    scale?: number,
  ) => Promise<void>;
  getStrokes: () => Stroke[];
  setStrokes: (strokes: Stroke[]) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  /** The surface size the drawing is being made at. */
  getSize: () => Board;
};

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
  /** Fixed surface size. Omit and it matches the element, which is usually
   * what you want — a fixed board letterboxes inside its container. */
  board?: Board;
  /** The canvas colour. */
  background?: string;
  /** Strokes to start from. */
  initialStrokes?: Stroke[];
  onChange?: (strokes: Stroke[]) => void;
  /** Turn the built-in chrome off and drive it yourself. */
  chrome?: boolean;
  /**
   * How the bar arrives and leaves when `chrome` is switched.
   *
   * A single name sets both directions; the object form is for when they
   * differ. `duration` is milliseconds and covers whichever way is playing.
   */
  motion?: MotionPreset | MotionOptions;
  /** Which edge the toolbar sits on. */
  placement?: "bottom" | "left" | "right";
  /** How far the bar sits from its edge. A number is pixels. */
  inset?: number | string;
  /** Where along that edge it sits. */
  align?: "start" | "center" | "end";
  /**
   * Which end of that edge the bar folds into when it is minimised.
   *
   * A centred bar has no nearer end and picks one. Name the other when the
   * app keeps a control of its own in that corner.
   */
  minimizeAlign?: "start" | "end";
  /** "auto" follows the OS; the others force it. */
  theme?: "light" | "dark" | "auto";
  /**
   * Whether the surface still accepts strokes while the toolbar is
   * minimised.
   */
  drawWhenMinimized?: boolean;
  /** Whether the bar starts collapsed. */
  startMinimized?: boolean;
  /** Whether the keyboard shortcuts are live. */
  shortcuts?: boolean;
  /** The colours offered in the picker, in place of the built-in palette. */
  swatches?: string[];
  /** Hover labels. */
  tooltips?: boolean | TooltipOptions;
  /** Which tools appear, and in what order. */
  tools?: PenId[];
  /** Whether the eraser is offered. */
  eraser?: boolean;
  /** Which of the built-in controls to show. All of them by default. */
  controls?: DrawControls;
  /** Where size and opacity live. */
  settings?: "bar" | "tool";
  /** How the tools are drawn. */
  look?: "classic" | "studio";
  /** Print the current size on the barrel of the pen in hand. */
  gauge?: boolean;
  /** Let the toolbar be picked up and moved around the surface. */
  draggable?: boolean;
  /** How ink colour is shared between tools. */
  ink?: InkMode;
  /** How much the toolbar reads as a physical object. */
  depth?: "flat" | "soft" | "regular" | "strong";
  className?: string;
  style?: React.CSSProperties;
};

/** Drawing, with everything switched on. */
export const Draw = forwardRef<DrawHandle, DrawProps>(function Draw(
  {
    board,
    background = "#ffffff",
    initialStrokes,
    onChange,
    chrome = true,
    motion,
    placement = "bottom",
    inset,
    align = "center",
    minimizeAlign,
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
    className,
    style,
  },
  ref,
) {
  const drawing = useDrawing(initialStrokes);
  const root = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(startMinimized);
  const [measured, setMeasured] = useState<Board>({ w: 1600, h: 1000 });

  /** The ink to start with. */
  const startingInk = theme === "dark" ? "#f2f1ef" : "#111111";

  /** The colour to actually lay down, or nothing. */
  const paint =
    background === "transparent" || background === "checker"
      ? null
      : background;

  const [tool, setTool] = useState<ToolState>({
    active: "pen",
    color: startingInk,
    size: PEN_BY_ID.pen.defaultSize,
    opacity: PEN_BY_ID.pen.defaultOpacity,
    eraserSize: 28,
  });

  // The surface is the element. Matching the board to it means no letterboxing,
  // so pointer and ink agree everywhere, and the whole area is drawable.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setMeasured({ w: Math.round(width), h: Math.round(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const surfaceBoard = board ?? measured;

  /** The pens on offer, in the order asked for. */
  const pens = useMemo(
    () => (tools ? tools.map((id) => PEN_BY_ID[id]).filter(Boolean) : PENS),
    [tools],
  );

  // Report changes without making the caller own the state.
  const changed = useRef(onChange);
  changed.current = onChange;
  useEffect(() => {
    changed.current?.(drawing.strokes);
  }, [drawing.strokes]);

  /** The ink each pen was last used in. */
  const [inks, setInks] = useState<Partial<Record<PenId, string>>>({});
  /**
   * What each pen was last set to, for pens that have been adjusted.
   *
   * Held as a ref rather than state: nothing renders from it, it's only read
   * when a tool is picked up again. A pen that's never been touched isn't in
   * here at all, so it still opens at its own default.
   */
  const tuned = useRef<Partial<Record<PenId, { size: number; opacity: number }>>>(
    {},
  );
  /** The colour shared by every pen that doesn't keep one of its own. */
  const [ink, setInk] = useState(startingInk);
  /** Whether a colour has actually been chosen. */
  const chosen = useRef(false);

  useEffect(() => {
    if (chosen.current) return;
    setInk(startingInk);
    setTool((t) => ({ ...t, color: startingInk }));
  }, [startingInk]);

  /** `auto` resolves after mount, never during render. */
  useEffect(() => {
    if (theme !== "auto" || chosen.current) return;
    if (!window.matchMedia?.("(prefers-color-scheme: dark)").matches) return;
    setInk("#f2f1ef");
    setTool((t) => ({ ...t, color: "#f2f1ef" }));
  }, [theme]);

  const inkFor = useCallback(
    (id: PenId) =>
      inkMode === "shared"
        ? ink
        : (inks[id] ??
          (inkMode === "auto" ? PEN_BY_ID[id].defaultColor : undefined) ??
          ink),
    [inks, ink, inkMode],
  );

  const select = useCallback(
    (id: ToolId) => {
      if (id === "eraser") return setTool((t) => ({ ...t, active: "eraser" }));
      const preset = PEN_BY_ID[id];
      // Whatever you last set this pen to, or its default if you never have.
      // Sizes belong to the tool, not to the toolbar: a highlighter set broad
      // and a fineliner set fine are two different decisions, and resetting
      // them on every switch means making the same one repeatedly.
      const last = tuned.current[id];
      setTool((t) => ({
        ...t,
        active: id,
        size: last?.size ?? preset.defaultSize,
        opacity: last?.opacity ?? preset.defaultOpacity,
        color: inkFor(id),
      }));
    },
    [inkFor],
  );

  const patch = useCallback(
    (p: Partial<ToolState>) =>
      setTool((t) => {
        if (p.color && t.active !== "eraser") {
          chosen.current = true;
          // A pen that came with a colour of its own keeps its own; recolouring
          // a highlighter shouldn't reach across and recolour the pencil. Every
          // other pen writes to the shared ink, so choosing a colour once still
          // applies to all of them.
          const own =
            inkMode === "per-tool" ||
            (inkMode === "auto" && Boolean(PEN_BY_ID[t.active].defaultColor));
          if (own)
            setInks((m) => ({ ...m, [t.active as PenId]: p.color as string }));
          else setInk(p.color);
        }
        if ((p.size !== undefined || p.opacity !== undefined) && t.active !== "eraser") {
          const id = t.active as PenId;
          tuned.current[id] = {
            size: p.size ?? t.size,
            opacity: p.opacity ?? t.opacity,
          };
        }
        return { ...t, ...p };
      }),
    [inkMode],
  );

  /**
   * Step the size of whatever is in hand.
   *
   * Reads through the updater rather than the render's `tool`, because the key
   * handler is bound once and would otherwise nudge a stale size. The eraser
   * has its own width and its own ceiling, and used to be ignored here: the
   * shortcuts moved the pen's size while the eraser carried on at whatever it
   * was.
   */
  const nudgeSize = useCallback((delta: number) => {
    setTool((t) => {
      if (t.active === "eraser") {
        return {
          ...t,
          eraserSize: Math.max(1, Math.min(120, t.eraserSize + delta)),
        };
      }
      const size = Math.max(1, Math.min(80, t.size + delta));
      tuned.current[t.active] = { size, opacity: t.opacity };
      return { ...t, size };
    });
  }, []);

  useImperativeHandle(ref, (): DrawHandle => {
    const svg = () =>
      toSvg(drawing.strokes, surfaceBoard.w, surfaceBoard.h, paint);
    return {
      toSvg: svg,
      toPng: (scale = 2) =>
        toPng(drawing.strokes, surfaceBoard.w, surfaceBoard.h, paint, scale),
      async download(name = "drawing", format = "svg", scale = 2) {
        const blob =
          format === "png"
            ? await toPng(
                drawing.strokes,
                surfaceBoard.w,
                surfaceBoard.h,
                paint,
                scale,
              )
            : new Blob([svg()], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name}.${format}`;
        a.click();
        // Freed on the next turn: revoking it straight away can beat the
        // browser to actually reading it.
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      getStrokes: () => drawing.strokes,
      setStrokes: (next) => drawing.commit(next),
      undo: drawing.undo,
      redo: drawing.redo,
      clear: drawing.clear,
      getSize: () => surfaceBoard,
    };
  }, [drawing, surfaceBoard, background]);

  const surfaceTool: Tool = useMemo(
    () =>
      tool.active === "eraser"
        ? { kind: "eraser", size: tool.eraserSize }
        : {
            kind: "pen",
            pen: tool.active,
            color: tool.color,
            size: tool.size,
            opacity: tool.opacity,
          },
    [tool],
  );

  // Shortcuts are scoped to focus-within, so a drawing embedded in a page
  // never swallows the host's typing.
  useEffect(() => {
    const el = root.current;
    if (!el || !shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        !el.contains(document.activeElement) &&
        document.activeElement !== document.body
      )
        return;
      const meta = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (meta && k === "z") {
        e.preventDefault();
        return e.shiftKey ? drawing.redo() : drawing.undo();
      }
      // The other redo chord, which Windows and a lot of muscle memory expect.
      if (meta && k === "y") {
        e.preventDefault();
        return drawing.redo();
      }
      if (meta) return;
      if (k === "e" && eraser) return select("eraser");
      if (k === "[") return nudgeSize(-1);
      if (k === "]") return nudgeSize(1);
      const pen = pens.find((p) => p.key === k);
      if (pen) select(pen.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, select, pens, eraser, shortcuts, nudgeSize]);

  /*
    Dragging the toolbar.

    The offset is kept separate from where the bar is anchored, so the
    placement rules still decide where it starts and this only says how far it
    has been carried from there. Grabbing anywhere on the bar that isn't a
    control counts — a bar full of buttons has very little bare surface, and
    hunting for a dedicated handle on something this size is worse than the
    occasional missed grab.
  */
  /** Where a dragged bar is pinned, as a gap from two edges of the surface. */
  const [pin, setPin] = useState<{
    x: { side: "left" | "right"; gap: number };
    y: { side: "top" | "bottom"; gap: number };
  } | null>(null);

  const [held, setHeld] = useState(false);
  const barEl = useRef<HTMLDivElement>(null);
  const grab = useRef({ dx: 0, dy: 0 });
  /** Mirrors `held` for the resize watcher, which must not re-subscribe. */
  const holding = useRef(false);

  /** Pin the bar by whichever edges it is nearest, clamped onto the surface. */
  const pinTo = useCallback((left: number, top: number) => {
    const el = root.current;
    const bar = barEl.current;
    if (!el || !bar) return;
    const r = el.getBoundingClientRect();
    // Layout size, not the painted box: the bar is scaled up while it's held,
    // and measuring through that transform overstates it by a few per cent —
    // enough that the clamp stops it short of the edge and the gap it reports
    // is wrong.
    const w = bar.offsetWidth;
    const h = bar.offsetHeight;
    const pad = 8;
    const x = Math.min(Math.max(left, pad), Math.max(pad, r.width - pad - w));
    const y = Math.min(Math.max(top, pad), Math.max(pad, r.height - pad - h));
    const right = r.width - x - w;
    const bottom = r.height - y - h;
    setPin({
      x: x <= right ? { side: "left", gap: x } : { side: "right", gap: right },
      y:
        y <= bottom ? { side: "top", gap: y } : { side: "bottom", gap: bottom },
    });
  }, []);

  const onBarDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || collapsed) return;
    // Anything you could click is not a handle.
    if ((e.target as HTMLElement).closest("button,input,[role='slider']"))
      return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const el = root.current;
    const b = e.currentTarget.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    grab.current = { dx: e.clientX - b.left, dy: e.clientY - b.top };
    // Take over positioning at exactly where it already is, so it can't jump
    // on the first move.
    if (r) pinTo(b.left - r.left, b.top - r.top);
    holding.current = true;
    setHeld(true);
  };

  const onBarMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!held) return;
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pinTo(
      e.clientX - r.left - grab.current.dx,
      e.clientY - r.top - grab.current.dy,
    );
  };

  const onBarUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!held) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    holding.current = false;
    setHeld(false);
  };

  /*
    Keep it on the surface when it changes size.

    Anchoring holds the pinned edges by itself, but a bar that grows can still
    run its *other* edge off the far side. Re-pinning from where it now sits
    catches that, and covers the window resizing too.
  */
  useEffect(() => {
    const bar = barEl.current;
    if (!bar || !pin || typeof ResizeObserver === "undefined") return;
    const settle = () => {
      const el = root.current;
      // Never while it's being carried. The bar is scaled up in the hand, and
      // this reads its painted box — so each pass re-pinned it a few pixels
      // further along the scale's own offset, and a straight drag down the
      // screen crept sideways as it went.
      if (!el || holding.current) return;
      const r = el.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      pinTo(b.left - r.left, b.top - r.top);
    };
    const ro = new ResizeObserver(settle);
    ro.observe(bar);
    window.addEventListener("resize", settle);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", settle);
    };
  }, [pin, pinTo]);

  /*
    How far the disc travels when the bar folds down.

    A bar still sitting where it was put folds all the way to the corner, which
    is where a minimised control belongs and is what it has always done.

    A dragged bar travels nowhere at all. It is anchored by one of its edges,
    so shrinking already leaves the disc at that edge — the end of its own
    footprint, which is where it should end up. Adding the corner journey on
    top moves it a second time, and the two together are the lurch you see.

    A rail folds the same way, to the same place, but it needs help to read
    right. It is most of the height it sits in, so the corner is a long way and
    a bar that only translates there looks like it is sliding down the screen.
    Scaling it toward the end it's heading for turns that into the bar rolling
    up into the corner, which is what it should have looked like all along.
  */
  const [fold, setFold] = useState(0);
  const [foldOrigin, setFoldOrigin] = useState("center");

  useEffect(() => {
    if (!collapsed || pin) {
      setFold(0);
      return;
    }
    const el = root.current;
    const bar = barEl.current;
    if (!el || !bar) return;
    const r = el.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const horizontal = placement === "bottom";
    const span = horizontal ? r.width : r.height;
    const centre = horizontal
      ? b.left + b.width / 2 - r.left
      : b.top + b.height / 2 - r.top;
    // A bar square in the middle has no nearer end, so it keeps the one it has
    // always folded to — unless the host names the end itself.
    const nearest = centre / span < 0.48 ? "start" : "end";
    const dir = (minimizeAlign ?? nearest) === "start" ? -1 : 1;
    /*
     * Aimed at a point, not moved by a guessed distance.
     *
     * The disc should end up exactly as far off its edge as the open bar sits
     * off it. Computed as an offset from the middle it lands close but not
     * on, because the bar isn't always centred in the first place, and being
     * a few pixels deeper into the corner than the inset is visible against a
     * rounded frame.
     */
    /*
     * Measured, not parsed.
     *
     * `--sd-inset` is a CSS length and can be anything: `1.25rem`, `4vw`, a
     * calc. Read as a number it silently becomes 1.25, and the disc ends up
     * against the edge. The distance the open bar already keeps from its own
     * edge is the same distance, and it's in pixels by definition.
     */
    const gap = horizontal ? r.bottom - b.bottom : b.left - r.left;
    /*
     * Half the collapsed bar *before* it scales.
     *
     * A rail folds about its end rather than its middle, so that edge is the
     * fixed point and the box still measures its full 66 when the translate is
     * applied. Aiming with the scaled 56 leaves it a few pixels deeper into the
     * corner than the open bar ever sits, which shows against a rounded frame.
     */
    const half = horizontal ? 28 : 33;
    const target = dir < 0 ? gap + half : span - gap - half;
    setFold(target - centre);
    setFoldOrigin(
      horizontal ? "center" : dir < 0 ? "center top" : "center bottom",
    );

    // Only when the collapse itself begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, minimizeAlign, placement, pin]);

  /*
   * The bar has to outlive `chrome` going false, or there is nothing left to
   * animate: React would take the element away on the same frame the prop
   * changed. `live` is what's mounted, `leaving` is what's playing out, and the
   * animation itself says when it's over.
   */
  const move: MotionOptions = typeof motion === "string" ? { in: motion, out: motion } : (motion ?? {});
  const enterWith = move.in ?? "rise";
  const exitWith = move.out ?? move.in ?? "rise";
  const [live, setLive] = useState(chrome);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (chrome) {
      setLeaving(false);
      setLive(true);
    } else if (exitWith === "none") {
      setLive(false);
    } else {
      setLeaving(true);
    }
  }, [chrome, exitWith]);

  return (
    <div
      ref={root}
      className={`sd ${css.root} ${className ?? ""}`}
      data-theme={theme}
      data-placement={placement}
      data-depth={depth}
      data-background={background === "transparent" ? "none" : undefined}
      style={style}
      tabIndex={-1}
    >
      <DrawSurface
        drawing={drawing}
        board={surfaceBoard}
        background={background}
        tool={surfaceTool}
        disabled={chrome && collapsed && !drawWhenMinimized}
        className={css.surface}
      />

      {live && (
        <div
          ref={barEl}
          className={css.toolbar}
          data-placement={placement}
          data-align={align}
          data-motion-in={enterWith}
          data-motion-out={exitWith}
          data-leaving={leaving || undefined}
          onAnimationEnd={(e) => {
            // Only the bar's own arrival or departure, not a tool's.
            if (e.target !== e.currentTarget) return;
            if (leaving) {
              setLive(false);
              setLeaving(false);
            }
          }}
          data-draggable={draggable && !collapsed ? "" : undefined}
          data-held={held ? "" : undefined}
          style={
            pin
              ? ({
                  "--sd-inset":
                    typeof inset === "number" ? `${inset}px` : inset,
                  left: pin.x.side === "left" ? pin.x.gap : "auto",
                  right: pin.x.side === "right" ? pin.x.gap : "auto",
                  top: pin.y.side === "top" ? pin.y.gap : "auto",
                  bottom: pin.y.side === "bottom" ? pin.y.gap : "auto",
                  // The stylesheet centres with a percentage translate; an
                  // anchored bar is positioned outright and must not also be
                  // pulled back by half its own size.
                  translate: "none",
                  maxWidth: "none",
                  maxHeight: "none",
                  // Inherited by the bar, which closes toward this corner.
                  "--fold-origin": `${pin.x.side} ${pin.y.side}`,
                } as React.CSSProperties)
              : ({
                  "--sd-inset":
                    typeof inset === "number" ? `${inset}px` : inset,
                  ...(move.duration ? { "--sd-motion": `${move.duration}ms` } : null),
                  // The end the bar is folding toward, so its scale pulls that
                  // way instead of back toward its own middle.
                  "--fold-origin": foldOrigin,
                } as React.CSSProperties)
          }
          onPointerDown={onBarDown}
          onPointerMove={onBarMove}
          onPointerUp={onBarUp}
          onPointerCancel={onBarUp}
        >
          <Toolbar
            placement={placement}
            collapsed={collapsed}
            onCollapse={() => setCollapsed(true)}
            onExpand={() => setCollapsed(false)}
            shift={fold}
            /* Half the bar's length, less half the disc it closes into, less
               the margin it keeps from the corner. The disc ends up 56 across
               whichever way the bar is laid, so this is the same either way. */
            icon={
              <ToolIcon
                id={tool.active === "eraser" ? "eraser" : tool.active}
                color={tool.color}
                /* The same pen the row was holding, so it has to be drawn the
                   same way. Left off, the tool changed style as the bar closed
                   around it — the one moment it's the only thing on screen. */
                look={look}
                /* Drawn at 42 because the disc it sits in is the bar scaled to
                   two thirds — which takes the tool down with it. This lands
                   it back at the 28 it reads as. */
                size={42}
              />
            }
            tool={tool}
            inkFor={inkFor}
            tooltips={tooltips}
            pens={pens}
            eraser={eraser}
            controls={controls}
            settings={settings}
            look={look}
            gauge={gauge}
            shortcuts={shortcuts}
            swatches={swatches}
            theme={theme}
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
      )}
    </div>
  );
});
