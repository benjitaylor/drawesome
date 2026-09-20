import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  dotRadius,
  eraseLayers,
  nextId,
  polylinePath,
  strokePath,
} from "../engine/geometry";
import { PEN_BY_ID } from "../engine/pens";
import type { Board, Point } from "../engine/types";
import type { DrawingController } from "../hooks/use-drawing";

export type Tool =
  | {
      kind: "pen";
      pen: import("../engine/types").PenId;
      color: string;
      size: number;
      opacity: number;
      shape?: import("../engine/types").StrokeShape;
    }
  | { kind: "eraser"; size: number };

export type DrawSurfaceProps = {
  drawing: DrawingController;
  board: Board;
  /** CSS colour, `"transparent"` to paint nothing, or `"checker"`. */
  background?: string;
  tool: Tool;
  /**
   * The stroke in progress, every time it grows: once where it starts and
   * again on each move that extends it, with the tool drawing it.
   *
   * Nothing is reported when the pointer lifts — the finished stroke arrives
   * through `drawing.commit`, and it carries points of its own, so a listener
   * keeping the last array it was given cannot reach inside it.
   */
  onProgress?: (points: readonly Point[], tool: Tool) => void;
  /** Show a ring at the pointer at the brush's true size. Off for touch-only. */
  showBrushCursor?: boolean;
  /** Ignore all input — the surface is inert but still shows the drawing. */
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** The drawing surface itself — pointer handling and rendering, no chrome. */
/** Points laid along a straight run, rather than just its two ends. */
function runPoints(from: Point, to: Point, pressure: number): Point[] {
  const run = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = Math.max(1, Math.round(run / 3));
  const out: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    out.push([
      from[0] + (to[0] - from[0]) * f,
      from[1] + (to[1] - from[1]) * f,
      pressure,
    ]);
  }
  return out;
}

export function DrawSurface({
  drawing,
  board,
  background = "#ffffff",
  tool,
  onProgress,
  showBrushCursor = true,
  disabled = false,
  className,
  style,
}: DrawSurfaceProps) {
  const uid = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);

  const [current, setCurrent] = useState<Point[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const drawingNow = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const activePointer = useRef<number | null>(null);
  /**
   * Palm rejection: once a stylus has been seen on this surface, ignore touch
   * entirely. Resting a hand on a tablet while drawing is the normal way to
   * hold a pen, and without this every drawing gets a smear across it.
   */
  const sawPen = useRef(false);

  /** State for drawing in straight runs while shift is held. */
  const straight = useRef<{
    /** The corner this run grows from. */
    anchor: Point;
    /** The direction it settled into, once it had the length to have one. */
    heading: number | null;
    /** Everything already drawn, up to and including the anchor. */
    settled: Point[];
  } | null>(null);

  /** Whether the stroke in progress carries real hardware pressure. */
  const realPressure = useRef(false);

  const toBoard = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      // The viewBox is letterboxed by preserveAspectRatio, so it does NOT fill
      // the element whenever the aspect ratios differ. Mapping as though it did
      // puts the ink up to ~50px away from the pointer at the edges.
      const scale = Math.min(r.width / board.w, r.height / board.h);
      const offsetX = (r.width - board.w * scale) / 2;
      const offsetY = (r.height - board.h * scale) / 2;
      return {
        x: (clientX - r.left - offsetX) / scale,
        y: (clientY - r.top - offsetY) / scale,
      };
    },
    [board.w, board.h],
  );

  const state = useRef({ tool, drawing });
  state.current = { tool, drawing };

  const ignore = (e: React.PointerEvent) => {
    if (disabled) return true;
    if (e.pointerType === "pen") sawPen.current = true;
    return e.pointerType === "touch" && sawPen.current;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (ignore(e)) return;
    // One pointer at a time: a second finger is a pan/zoom gesture, not a
    // second stroke.
    if (activePointer.current !== null) return;
    e.preventDefault();
    activePointer.current = e.pointerId;
    try {
      ref.current?.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }

    const { x, y } = toBoard(e.clientX, e.clientY);
    drawingNow.current = true;
    straight.current = null;

    // An eraser pass is recorded exactly like a mark — it just subtracts.
    realPressure.current = false;
    const p: Point = [x, y, e.pressure || 0.5];
    pointsRef.current = [p];
    setCurrent([p]);
    onProgress?.(pointsRef.current, tool);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (ignore(e)) return;
    const { x, y } = toBoard(e.clientX, e.clientY);
    if (e.pointerType !== "touch") setHover({ x, y });

    if (!drawingNow.current || e.pointerId !== activePointer.current) return;

    // Anything other than the flat default means the hardware is really
    // measuring it. Pens that report a constant 0.5 are treated as pressureless.
    if (e.pointerType === "pen" && e.pressure > 0 && e.pressure !== 0.5) {
      realPressure.current = true;
    }

    const pts = pointsRef.current;
    const pressure = e.pressure || 0.5;

    if (e.shiftKey) {
      /*
        A straight run, the way Photoshop constrains a brush.

        Movement locks to the nearest of eight directions — the two axes and
        the four diagonals — and everything off that line is discarded, so the
        line is exactly straight however much the hand wobbles. The direction
        is settled once and then left alone: letting it switch mid-stroke means
        a stroke can turn a corner by accident, and the guarantee that shift
        gives you a straight line is worth more than being able to draw an L
        without letting go.
      */
      if (!straight.current) {
        straight.current = {
          anchor: pts[pts.length - 1] ?? [x, y, pressure],
          heading: null,
          settled: pts,
        };
      }

      const st = straight.current;
      const dx = x - st.anchor[0];
      const dy = y - st.anchor[1];

      // Wait for a clear movement before committing. Judge it too early and
      // the direction is decided by the shake of a hand pressing a button —
      // and once locked it is locked, so guessing wrong costs the whole run.
      if (st.heading === null) {
        if (Math.hypot(dx, dy) < 16) return;
        // To the nearest eighth of a turn, so the diagonals are as available
        // as the axes — a 45° line is the one people reach for shift for
        // nearly as often as a level one.
        st.heading =
          (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
      }

      // Projected onto that direction: how far off the line the hand strays is
      // simply discarded, which is what keeps the run perfectly straight.
      const cos = Math.cos(st.heading);
      const sin = Math.sin(st.heading);
      const along = dx * cos + dy * sin;
      const tip: Point = [
        st.anchor[0] + cos * along,
        st.anchor[1] + sin * along,
        pressure,
      ];

      pointsRef.current = [
        ...st.settled,
        ...runPoints(st.anchor, tip, pressure),
      ];
      setCurrent(pointsRef.current);
      onProgress?.(pointsRef.current, tool);
      return;
    }

    straight.current = null;

    // Drop points closer than a screen pixel — at high zoom this is the
    // difference between a smooth line and thousands of redundant samples.
    const last = pts[pts.length - 1];
    if (last && Math.hypot(x - last[0], y - last[1]) < 1.1) return;

    pointsRef.current = [...pts, [x, y, pressure]];
    setCurrent(pointsRef.current);
    onProgress?.(pointsRef.current, tool);
  };

  const endGesture = (e?: React.PointerEvent) => {
    if (e && e.pointerId !== activePointer.current) return;
    activePointer.current = null;

    if (!drawingNow.current) return;
    drawingNow.current = false;
    straight.current = null;

    const pts = pointsRef.current;
    pointsRef.current = [];
    setCurrent([]);
    if (!pts.length) return;

    // A listener was handed this very array on the last move. The stroke gets
    // a copy so that holding on to what onProgress reported can never reach
    // inside a finished one; with no listener nobody has it, so nothing to do.
    const points = onProgress ? [...pts] : pts;

    drawing.commit([
      ...drawing.strokes,
      tool.kind === "eraser"
        ? {
            id: nextId(),
            pen: "pen" as const,
            color: "#000",
            size: tool.size,
            opacity: 1,
            points,
            erase: true,
          }
        : {
            id: nextId(),
            pen: tool.pen,
            color: tool.color,
            size: tool.size,
            opacity: tool.opacity,
            points,
            shape: { ...tool.shape, simulatePressure: !realPressure.current },
          },
    ]);
  };

  // Committed outlines are recomputed only when the stroke set changes, never
  // on a pointer move — otherwise drawing gets slower the more you've drawn.
  const layers = useMemo(() => {
    const all = drawing.strokes;
    return eraseLayers(all).map((layer) => ({
      erasers: layer.erasers.map((i) => ({
        d: polylinePath(all[i].points),
        width: all[i].size,
      })),
      ink: layer.ink.map((i) => {
        const st = all[i];
        return {
          id: st.id,
          d: strokePath(st.pen, st.size, st.points, true, st.shape),
          color: st.color,
          opacity: st.opacity,
          blend: PEN_BY_ID[st.pen].blend === "multiply",
          dot: st.points.length
            ? { x: st.points[0][0], y: st.points[0][1], r: dotRadius(st.size) }
            : null,
        };
      }),
    }));
  }, [drawing.strokes, uid]);

  // Remember where it was so the ring can fade from its last position instead
  // of jumping to the origin as hover clears.
  const lastHover = useRef<{ x: number; y: number } | null>(null);
  if (hover) lastHover.current = hover;

  const overBoard =
    hover &&
    hover.x >= 0 &&
    hover.y >= 0 &&
    hover.x <= board.w &&
    hover.y <= board.h;

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={`0 0 ${board.w} ${board.h}`}
      className={className}
      style={{
        display: "block",
        /*
          A disabled surface gets out of the way completely.
          
          Gating the handler isn't enough when the surface is laid over a page:
          it still swallows every scroll, selection and click underneath it, so
          "drawing is off" reads to the user as "the page is broken". Off means
          the layer isn't there.
        */
        pointerEvents: disabled ? "none" : undefined,
        // Essential on touch: without it the browser scrolls the page instead
        // of letting a finger draw.
        touchAction: disabled ? "auto" : "none",
        WebkitUserSelect: disabled ? "auto" : "none",
        userSelect: disabled ? "auto" : "none",
        WebkitTapHighlightColor: "transparent",
        cursor: disabled ? "default" : showBrushCursor ? "none" : "crosshair",
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onPointerLeave={(e) => {
        setHover(null);
        endGesture(e);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <pattern
          id={`c-${uid}`}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="16" height="16" fill="#fff" />
          <rect width="8" height="8" fill="#ececec" />
          <rect x="8" y="8" width="8" height="8" fill="#ececec" />
        </pattern>
        <clipPath id={`b-${uid}`}>
          <rect x={0} y={0} width={board.w} height={board.h} />
        </clipPath>
      </defs>

      <g>
        <rect
          x={0}
          y={0}
          width={board.w}
          height={board.h}
          fill={
            background === "transparent"
              ? "none"
              : background === "checker"
                ? `url(#c-${uid})`
                : background
          }
        />

        <g clipPath={`url(#b-${uid})`}>
          {layers.map((layer, li) => {
            // The pass in progress subtracts too, so erasing is visible under
            // the nub as it happens rather than only on release.
            const live =
              tool.kind === "eraser" &&
              current.length > 0 &&
              li === layers.length - 1
                ? [{ d: polylinePath(current), width: tool.size }]
                : [];
            const cuts = [...layer.erasers, ...live];
            const maskId = `e-${uid}-${li}`;
            return (
              <g key={li} mask={cuts.length ? `url(#${maskId})` : undefined}>
                {cuts.length > 0 && (
                  <defs>
                    {/* White keeps, black removes. Stroking the eraser's path
                        at the nub's width with round caps describes exactly the
                        area it swept — so it takes a bite out of whatever it
                        touches, including the edge of a thick mark. */}
                    <mask
                      id={maskId}
                      maskUnits="userSpaceOnUse"
                      x={0}
                      y={0}
                      width={board.w}
                      height={board.h}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={board.w}
                        height={board.h}
                        fill="#fff"
                      />
                      {cuts.map((c, ci) => (
                        <path
                          key={ci}
                          d={c.d}
                          fill="none"
                          stroke="#000"
                          strokeWidth={c.width}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </mask>
                  </defs>
                )}
                {layer.ink.map((s) =>
                  s.d ? (
                    <path
                      key={s.id}
                      d={s.d}
                      fill={s.color}
                      fillOpacity={s.opacity}
                      style={s.blend ? { mixBlendMode: "multiply" } : undefined}
                    />
                  ) : s.dot ? (
                    <circle
                      key={s.id}
                      cx={s.dot.x}
                      cy={s.dot.y}
                      r={s.dot.r}
                      fill={s.color}
                      fillOpacity={s.opacity}
                      style={s.blend ? { mixBlendMode: "multiply" } : undefined}
                    />
                  ) : null,
                )}
              </g>
            );
          })}

          {tool.kind === "pen" && current.length > 0 && (
            <path
              d={strokePath(tool.pen, tool.size, current, false, {
                ...tool.shape,
                simulatePressure: !realPressure.current,
              })}
              fill={tool.color}
              fillOpacity={tool.opacity}
              style={
                PEN_BY_ID[tool.pen].blend === "multiply"
                  ? { mixBlendMode: "multiply" }
                  : undefined
              }
            />
          )}
        </g>

        {/* Kept mounted and faded, so crossing onto the toolbar is a soft
            hand-off to the system cursor rather than a blink. */}
        {showBrushCursor && lastHover.current && (
          <g
            opacity={overBoard ? 1 : 0}
            style={{ transition: "opacity 120ms ease" }}
            pointerEvents="none"
          >
            <BrushCursor
              tool={tool}
              at={lastHover.current}
              scale={1}
              background={background}
            />
          </g>
        )}
      </g>
    </svg>
  );
}

/** Whether a colour is light. */
function isPale(hex: string) {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const l =
    0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l / 255 > 0.72;
}

/**
 * The smallest the ring is ever drawn, in screen pixels.
 *
 * The pencil's nib is one unit across, which put the ring at half a pixel: the
 * cursor simply wasn't there for the tool people reach for first. Below this
 * the nib is finer than anything that could be drawn to represent it, so the
 * ring stops reporting size and just says where the point is.
 */
const MIN_RADIUS = 3.5;

/** The pointer, drawn as the mark the tool is about to make. */
function BrushCursor({
  tool,
  at,
  scale,
  background,
}: {
  tool: Tool;
  at: { x: number; y: number };
  scale: number;
  /** Tints the eraser's fill; the rings carry their own contrast. */
  background: string;
}) {
  const hair = 1 / scale;
  const onDark = !isPale(background) && background !== "transparent";
  const r = Math.max(tool.size / 2, MIN_RADIUS / scale);

  /*
   * One ring on a dark canvas, two on a light one.
   *
   * The pale ring exists for the case the background prop can't answer: on
   * paper, the pointer spends most of its time over ink that has already been
   * laid down, and a dark hairline over a black stroke is nothing. Underneath a
   * dark hairline it reads as a sliver of light either side of a dark line.
   *
   * On a dark canvas that same pair reads as a double outline instead — white,
   * dark, white — because there is no dark backdrop for the dark line to
   * disappear into, so both edges of the halo stay visible. Any concentric
   * sandwich does this; it is only invisible when the outer ring matches what
   * is behind it. So on dark there is one pale ring and nothing else, which is
   * legible over dark paper and over dark ink alike.
   */
  const stroke = onDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.62)";
  const halo = onDark ? null : (
    <circle
      cx={at.x}
      cy={at.y}
      r={r}
      fill="none"
      stroke="rgba(255,255,255,0.92)"
      strokeWidth={hair * 3}
    />
  );

  if (tool.kind === "eraser") {
    return (
      <>
        {halo}
        <circle
          cx={at.x}
          cy={at.y}
          r={r}
          fill={onDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
          stroke={stroke}
          strokeWidth={hair}
        />
        {/* A cross-hair marks the centre: an eraser is aimed, not drawn with. */}
        {!onDark && (
          <path
            d={`M${at.x - 3 * hair} ${at.y}h${6 * hair}M${at.x} ${at.y - 3 * hair}v${6 * hair}`}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={hair * 2.5}
          />
        )}
        <path
          d={`M${at.x - 3 * hair} ${at.y}h${6 * hair}M${at.x} ${at.y - 3 * hair}v${6 * hair}`}
          stroke={stroke}
          strokeWidth={hair}
        />
      </>
    );
  }

  /*
   * Every pen gets the same ring, the nib pens included. Drawing the nib's own
   * angled edge is more literal but worse to aim with: it changes length as you
   * turn, so the cursor stops being a reliable indication of where the mark will
   * land and how big it will be.
   *
   * One neutral ring, never the ink. Drawing it in the current colour was the
   * clever version and the wrong one — a pale ink is invisible on pale paper.
   * Which ink is loaded is already answered by the tool standing lit in the
   * tray, by the colour in the bar, and by the mark itself the moment you draw.
   */
  return (
    <>
      {halo}
      <circle
        cx={at.x}
        cy={at.y}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={hair}
      />
    </>
  );
}
