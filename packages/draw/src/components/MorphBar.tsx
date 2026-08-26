import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import css from "./MorphBar.module.css";

export type MorphPanel = { id: string; content: ReactNode };

/** A bar that changes shape instead of changing places. */
export function MorphBar({
  panels,
  active,
  vertical = false,
  /** Which edge a vertical rail sits on, so it can clip on its inner side. */
  side,
  collapsed = false,
  collapsedContent,
  onExpand,
  /** Distance to travel when collapsing, so the disc lands in the corner. */
  shift = 0,
  onMeasure,
  className,
}: {
  panels: MorphPanel[];
  active: string;
  vertical?: boolean;
  side?: "left" | "right";
  collapsed?: boolean;
  collapsedContent?: ReactNode;
  onExpand?: () => void;
  shift?: number;
  /** The size the bar is about to animate to. */
  onMeasure?: (w: number, h: number) => void;
  className?: string;
}) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const [extent, setExtent] = useState<number | null>(null);
  // The first measurement is the bar's natural size, not a change — animating
  // into it would make the bar unfurl on mount.
  const settled = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current.get(active);
      if (!el) return;
      const next = vertical ? el.scrollHeight : el.scrollWidth;
      setExtent(next);
      // The other axis is fixed by the stylesheet: 84 tall laid flat, 66 wide
      // on a rail.
      onMeasure?.(vertical ? 66 : next, vertical ? next : 84);
    };
    measure();
    const id = requestAnimationFrame(() => {
      settled.current = true;
    });
    const el = refs.current.get(active);
    if (!el || typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(id);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
    // `panels` is deliberately not a dependency: callers build it inline, so a
    // fresh array every render re-ran this effect every render — a forced
    // scrollWidth read, a setExtent that renders again, and a ResizeObserver
    // recreated. The observer below already covers content-size changes.
  }, [active, vertical, onMeasure]);

  const size =
    extent === null
      ? { visibility: "hidden" as const }
      : collapsed
        ? {}
        : vertical
          ? // Height only. A rail's width is fixed by its stylesheet — measuring
            // it means measuring the pens, which are turned a quarter turn and
            // so are three times longer than the rail is wide. The bar came out
            // a slab, and with it that wide nothing was clipped, so every pen
            // lay across the canvas instead of being seated in the rail.
            { height: extent }
          : { width: extent };

  return (
    <div
      className={[
        css.bar,
        vertical ? css.vertical : "",
        collapsed ? css.collapsed : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-side={side}
      style={{
        ...size,
        /*
          The `translate` property, not `transform`.

          Collapsing also scales the bar down, and the individual properties
          compose as translate then scale — so a shift written into `transform`
          would be multiplied by that scale and land the disc short of the
          corner. Kept apart, the shift stays in the parent's coordinates.
        */
        translate: collapsed
          ? vertical
            ? `0 ${shift}px`
            : `${shift}px 0`
          : undefined,
        transition: settled.current ? undefined : "none",
      }}
    >
      {/*
        A layer the exact size of the bar, for the rails to clip against.

        A panel is as tall as its tools, and while the bar animates between a
        rail and a disc it is shorter than that — with the rail's overflow left
        visible so a pen can lift toward the canvas, the tools at the far end
        carry on being painted outside the bar. Clipping the panel itself does
        nothing, because a panel clips against its own box and the whole
        problem is that its box is bigger than the bar's. This one is pinned to
        the bar's edges, so it is.
      */}
      <div className={css.clip}>
        {panels.map((panel) => (
          <div
            key={panel.id}
            ref={(el) => {
              if (el) refs.current.set(panel.id, el);
              else refs.current.delete(panel.id);
            }}
            className={css.panel}
            data-active={(panel.id === active && !collapsed) || undefined}
            aria-hidden={panel.id === active && !collapsed ? undefined : true}
          >
            {panel.content}
          </div>
        ))}
      </div>

      {collapsedContent && (
        <div
          className={css.collapsedContent}
          data-shown={collapsed || undefined}
        >
          {collapsedContent}
        </div>
      )}

      {/* A real button covering the whole disc. Rendered last so it is above
          everything, and only while collapsed so it can never shadow the
          tools. */}
      {collapsed && (
        <button
          type="button"
          className={css.expandHit}
          onClick={onExpand}
          aria-label="Show drawing tools"
        />
      )}
    </div>
  );
}
