<script lang="ts">
  import {
    dotRadius,
    eraseLayers,
    nextId,
    polylinePath,
    strokePath,
  } from "../engine/geometry.js";
  import { PEN_BY_ID } from "../engine/pens.js";
  import type {
    Board,
    PenId,
    Point,
    StrokeShape,
  } from "../engine/types.js";
  import type { DrawingController } from "../state/drawing.svelte.js";

  export type Tool =
    | {
        kind: "pen";
        pen: PenId;
        color: string;
        size: number;
        opacity: number;
        shape?: StrokeShape;
      }
    | { kind: "eraser"; size: number };

  export type DrawSurfaceProps = {
    drawing: DrawingController;
    board: Board;
    background?: string;
    tool: Tool;
    showBrushCursor?: boolean;
    disabled?: boolean;
    class?: string;
    style?: string;
  };

  let {
    drawing,
    board,
    background = "#ffffff",
    tool,
    showBrushCursor = true,
    disabled = false,
    class: className,
    style,
  }: DrawSurfaceProps = $props();

  const componentId = $props.id();
  const uid = componentId.replace(/:/g, "");
  let surface: SVGSVGElement;
  let current = $state.raw<Point[]>([]);
  let hover = $state<{ x: number; y: number } | null>(null);
  let lastHover = $state<{ x: number; y: number } | null>(null);
  let drawingNow = false;
  let points: Point[] = [];
  let activePointer: number | null = null;
  let sawPen = false;
  let realPressure = $state(false);
  let straight: {
    anchor: Point;
    heading: number | null;
    settled: Point[];
  } | null = null;

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

  function toBoard(clientX: number, clientY: number) {
    if (!surface) return { x: 0, y: 0 };
    const r = surface.getBoundingClientRect();
    const scale = Math.min(r.width / board.w, r.height / board.h);
    const offsetX = (r.width - board.w * scale) / 2;
    const offsetY = (r.height - board.h * scale) / 2;
    return {
      x: (clientX - r.left - offsetX) / scale,
      y: (clientY - r.top - offsetY) / scale,
    };
  }

  function ignore(event: PointerEvent) {
    if (disabled) return true;
    if (event.pointerType === "pen") sawPen = true;
    return event.pointerType === "touch" && sawPen;
  }

  function pointerDown(event: PointerEvent) {
    if (ignore(event) || activePointer !== null) return;
    event.preventDefault();
    activePointer = event.pointerId;
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }
    const { x, y } = toBoard(event.clientX, event.clientY);
    drawingNow = true;
    straight = null;
    realPressure = false;
    const point: Point = [x, y, event.pressure || 0.5];
    points = [point];
    current = [point];
  }

  function pointerMove(event: PointerEvent) {
    if (ignore(event)) return;
    const { x, y } = toBoard(event.clientX, event.clientY);
    if (event.pointerType !== "touch") {
      hover = { x, y };
      lastHover = hover;
    }
    if (!drawingNow || event.pointerId !== activePointer) return;

    if (
      event.pointerType === "pen" &&
      event.pressure > 0 &&
      event.pressure !== 0.5
    ) {
      realPressure = true;
    }

    const pressure = event.pressure || 0.5;
    if (event.shiftKey) {
      if (!straight) {
        straight = {
          anchor: points[points.length - 1] ?? [x, y, pressure],
          heading: null,
          settled: points,
        };
      }
      const dx = x - straight.anchor[0];
      const dy = y - straight.anchor[1];
      if (straight.heading === null) {
        if (Math.hypot(dx, dy) < 16) return;
        straight.heading =
          (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI) / 4;
      }
      const cos = Math.cos(straight.heading);
      const sin = Math.sin(straight.heading);
      const along = dx * cos + dy * sin;
      const tip: Point = [
        straight.anchor[0] + cos * along,
        straight.anchor[1] + sin * along,
        pressure,
      ];
      points = [
        ...straight.settled,
        ...runPoints(straight.anchor, tip, pressure),
      ];
      current = points;
      return;
    }

    straight = null;
    const last = points[points.length - 1];
    if (last && Math.hypot(x - last[0], y - last[1]) < 1.1) return;
    points = [...points, [x, y, pressure]];
    current = points;
  }

  function endGesture(event?: PointerEvent) {
    if (event && event.pointerId !== activePointer) return;
    activePointer = null;
    if (!drawingNow) return;
    drawingNow = false;
    straight = null;
    const sampled = points;
    points = [];
    current = [];
    if (!sampled.length) return;

    drawing.commit([
      ...drawing.strokes,
      tool.kind === "eraser"
        ? {
            id: nextId(),
            pen: "pen",
            color: "#000",
            size: tool.size,
            opacity: 1,
            points: sampled,
            erase: true,
          }
        : {
            id: nextId(),
            pen: tool.pen,
            color: tool.color,
            size: tool.size,
            opacity: tool.opacity,
            points: sampled,
            shape: {
              ...tool.shape,
              simulatePressure: !realPressure,
            },
          },
    ]);
  }

  const layers = $derived.by(() => {
    const all = drawing.strokes;
    return eraseLayers(all).map((layer) => ({
      erasers: layer.erasers.map((index) => ({
        d: polylinePath(all[index].points),
        width: all[index].size,
      })),
      ink: layer.ink.map((index) => {
        const stroke = all[index];
        return {
          id: stroke.id,
          d: strokePath(
            stroke.pen,
            stroke.size,
            stroke.points,
            true,
            stroke.shape,
          ),
          color: stroke.color,
          opacity: stroke.opacity,
          blend: PEN_BY_ID[stroke.pen].blend === "multiply",
          dot: stroke.points.length
            ? {
                x: stroke.points[0][0],
                y: stroke.points[0][1],
                r: dotRadius(stroke.size),
              }
            : null,
        };
      }),
    }));
  });

  const overBoard = $derived(
    hover !== null &&
      hover.x >= 0 &&
      hover.y >= 0 &&
      hover.x <= board.w &&
      hover.y <= board.h,
  );

  function isPale(color: string) {
    const match = /^#?([\da-f]{6})$/i.exec(color.trim());
    if (!match) return false;
    const value = parseInt(match[1], 16);
    const lightness =
      0.299 * ((value >> 16) & 255) +
      0.587 * ((value >> 8) & 255) +
      0.114 * (value & 255);
    return lightness / 255 > 0.72;
  }

  const onDark = $derived(
    !isPale(background) && background !== "transparent",
  );
  const cursorRadius = $derived(Math.max(tool.size / 2, 3.5));
  const cursorStroke = $derived(
    onDark ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.62)",
  );
</script>

<svg
  bind:this={surface}
  role="application"
  aria-label="Drawing surface"
  width="100%"
  height="100%"
  viewBox={`0 0 ${board.w} ${board.h}`}
  class={className}
  style:display="block"
  style:pointer-events={disabled ? "none" : undefined}
  style:touch-action={disabled ? "auto" : "none"}
  style:-webkit-user-select={disabled ? "auto" : "none"}
  style:user-select={disabled ? "auto" : "none"}
  style:-webkit-tap-highlight-color="transparent"
  style:cursor={disabled ? "default" : showBrushCursor ? "none" : "crosshair"}
  {style}
  onpointerdown={pointerDown}
  onpointermove={pointerMove}
  onpointerup={endGesture}
  onpointercancel={endGesture}
  onpointerleave={(event) => {
    hover = null;
    endGesture(event);
  }}
  oncontextmenu={(event) => event.preventDefault()}
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
      <rect x="0" y="0" width={board.w} height={board.h} />
    </clipPath>
  </defs>

  <rect
    x="0"
    y="0"
    width={board.w}
    height={board.h}
    fill={background === "transparent"
      ? "none"
      : background === "checker"
        ? `url(#c-${uid})`
        : background}
  />

  <g clip-path={`url(#b-${uid})`}>
    {#each layers as layer, layerIndex (layerIndex)}
      {@const live =
        tool.kind === "eraser" &&
        current.length > 0 &&
        layerIndex === layers.length - 1
          ? [{ d: polylinePath(current), width: tool.size }]
          : []}
      {@const cuts = [...layer.erasers, ...live]}
      {@const maskId = `e-${uid}-${layerIndex}`}
      <g mask={cuts.length ? `url(#${maskId})` : undefined}>
        {#if cuts.length}
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={board.w}
              height={board.h}
            >
              <rect
                x="0"
                y="0"
                width={board.w}
                height={board.h}
                fill="#fff"
              />
              {#each cuts as cut, cutIndex (cutIndex)}
                <path
                  d={cut.d}
                  fill="none"
                  stroke="#000"
                  stroke-width={cut.width}
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              {/each}
            </mask>
          </defs>
        {/if}
        {#each layer.ink as stroke (stroke.id)}
          {#if stroke.d}
            <path
              d={stroke.d}
              fill={stroke.color}
              fill-opacity={stroke.opacity}
              style:mix-blend-mode={stroke.blend ? "multiply" : undefined}
            />
          {:else if stroke.dot}
            <circle
              cx={stroke.dot.x}
              cy={stroke.dot.y}
              r={stroke.dot.r}
              fill={stroke.color}
              fill-opacity={stroke.opacity}
              style:mix-blend-mode={stroke.blend ? "multiply" : undefined}
            />
          {/if}
        {/each}
      </g>
    {/each}

    {#if tool.kind === "pen" && current.length > 0}
      <path
        d={strokePath(tool.pen, tool.size, current, false, {
          ...tool.shape,
          simulatePressure: !realPressure,
        })}
        fill={tool.color}
        fill-opacity={tool.opacity}
        style:mix-blend-mode={PEN_BY_ID[tool.pen].blend === "multiply"
          ? "multiply"
          : undefined}
      />
    {/if}
  </g>

  {#if showBrushCursor && lastHover}
    <g
      opacity={overBoard ? 1 : 0}
      style="transition: opacity 120ms ease"
      pointer-events="none"
    >
      {#if !onDark}
        <circle
          cx={lastHover.x}
          cy={lastHover.y}
          r={cursorRadius}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          stroke-width="3"
        />
      {/if}
      {#if tool.kind === "eraser"}
        <circle
          cx={lastHover.x}
          cy={lastHover.y}
          r={cursorRadius}
          fill={onDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}
          stroke={cursorStroke}
          stroke-width="1"
        />
        {#if !onDark}
          <path
            d={`M${lastHover.x - 3} ${lastHover.y}h6M${lastHover.x} ${lastHover.y - 3}v6`}
            stroke="rgba(255,255,255,0.9)"
            stroke-width="2.5"
          />
        {/if}
        <path
          d={`M${lastHover.x - 3} ${lastHover.y}h6M${lastHover.x} ${lastHover.y - 3}v6`}
          stroke={cursorStroke}
          stroke-width="1"
        />
      {:else}
        <circle
          cx={lastHover.x}
          cy={lastHover.y}
          r={cursorRadius}
          fill="none"
          stroke={cursorStroke}
          stroke-width="1"
        />
      {/if}
    </g>
  {/if}
</svg>
