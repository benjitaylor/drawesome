import { memo, useId } from "react";
import type { PenId } from "../engine/types";

/**
 * The implements themselves, drawn upright so they can sit in a tray with
 * their lower halves clipped — the tool picker is a row of actual pens
 * rather than a row of abstract icons.
 */

export type ToolIconId = PenId | "eraser";

/** How the tools are drawn. */
export type Look = "classic" | "studio";

const W = 30;
const H = 88;
/** Every tip apexes here, and every barrel starts at the shoulder. */
const APEX = 4;
const SHOULDER = 31;

/**
 * Memoised: the bar keeps every panel mounted, so a colour or size change
 * anywhere in the toolbar re-rendered all seven pen drawings. Every prop here
 * is a primitive, so the comparison is exact.
 */
export const ToolIcon = memo(function ToolIcon({
  id,
  color,
  size = 30,
  badge,
  look = "classic",
}: {
  id: ToolIconId;
  color: string;
  size?: number;
  /** How the tool is lit. */
  look?: Look;
  /** A number printed on the barrel, the way a pen carries its gauge. */
  badge?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const studio = look === "studio";
  const g = {
    barrel: `b-${uid}`,
    shade: `s-${uid}`,
    metal: `m-${uid}`,
    wood: `w-${uid}`,
    gold: `g-${uid}`,
    tipShade: `t-${uid}`,
    facet: `f-${uid}`,
    rubber: `r-${uid}`,
  };

  const Tool = TOOLS[id];

  return (
    <svg
      width={size}
      height={(size / W) * H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Cylindrical shading: bright just off-centre, falling away to both
            edges. Applied to every rounded part so they all catch light from
            the same direction. */}
        <linearGradient
          id={g.barrel}
          x1="0"
          x2={W}
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          {studio ? (
            <>
              <stop offset="0.167" stopColor="var(--studio-1)" />
              <stop offset="0.21" stopColor="var(--studio-2)" />
              <stop offset="0.33" stopColor="var(--studio-3)" />
              <stop offset="0.44" stopColor="var(--studio-4)" />
              <stop offset="0.58" stopColor="var(--studio-5)" />
              <stop offset="0.71" stopColor="var(--studio-6)" />
              <stop offset="0.765" stopColor="var(--studio-7)" />
              <stop offset="0.805" stopColor="var(--studio-8)" />
              <stop offset="0.833" stopColor="var(--studio-1)" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="var(--tool-1)" />
              <stop offset="0.1" stopColor="var(--tool-2)" />
              <stop offset="0.34" stopColor="var(--tool-3)" />
              <stop offset="0.68" stopColor="var(--tool-4)" />
              <stop offset="0.9" stopColor="var(--tool-5)" />
              <stop offset="1" stopColor="var(--tool-6)" />
            </>
          )}
        </linearGradient>

        {/* Neutral overlay, so one gradient shades any colour. */}
        <linearGradient
          id={g.shade}
          x1="0"
          x2={W}
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          {studio ? (
            /* The same reading as the barrel, in neutrals so it can sit over
               any tip colour: a tight highlight, a shadow past the middle, and
               the bounce coming back at the far edge. */
            <>
              <stop offset="0.167" stopColor="#000" stopOpacity="0.26" />
              <stop offset="0.22" stopColor="#000" stopOpacity="0.03" />
              <stop offset="0.33" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="0.44" stopColor="#fff" stopOpacity="0.06" />
              <stop offset="0.58" stopColor="#000" stopOpacity="0" />
              <stop offset="0.71" stopColor="#000" stopOpacity="0.12" />
              <stop offset="0.765" stopColor="#000" stopOpacity="0.22" />
              <stop offset="0.805" stopColor="#fff" stopOpacity="0.05" />
              <stop offset="0.833" stopColor="#000" stopOpacity="0.2" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#000" stopOpacity="0.20" />
              <stop offset="0.14" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="0.36" stopColor="#fff" stopOpacity="0.14" />
              <stop offset="0.62" stopColor="#000" stopOpacity="0.03" />
              <stop offset="1" stopColor="#000" stopOpacity="0.24" />
            </>
          )}
        </linearGradient>

        {/*
          The same reading as the barrel, but measured across whatever shape it
          is painted on rather than across the icon.

          A fountain nib is eight units wide in a thirty-unit box, so a gradient
          spanning the box gives it one narrow slice of the ramp — no highlight,
          no shadow, just the flat middle. Every slim part had the same problem,
          which is most of why the tips looked printed on rather than modelled.
          In objectBoundingBox units 0 and 1 are the shape's own edges, so a nib
          gets a nib-width cylinder and the barrel gets a barrel-width one.
        */}
        {/* Hard stops, twice over, so each face ends and the next begins
            rather than blending into it. */}
        <linearGradient
          id={g.facet}
          x1="0"
          x2={W}
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.167" stopColor="var(--pfacet-1)" />
          <stop offset="0.3" stopColor="var(--pfacet-2)" />
          <stop offset="0.387" stopColor="var(--pfacet-2)" />
          <stop offset="0.387" stopColor="var(--pfacet-3)" />
          <stop offset="0.52" stopColor="var(--pfacet-3)" />
          <stop offset="0.613" stopColor="var(--pfacet-4)" />
          <stop offset="0.613" stopColor="var(--pfacet-5)" />
          <stop offset="0.75" stopColor="var(--pfacet-5)" />
          <stop offset="0.833" stopColor="var(--pfacet-6)" />
        </linearGradient>

        <linearGradient id={g.tipShade} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.07" stopColor="#000" stopOpacity="0.02" />
          <stop offset="0.2" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.33" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.52" stopColor="#000" stopOpacity="0" />
          <stop offset="0.72" stopColor="#000" stopOpacity="0.08" />
          <stop offset="0.87" stopColor="#000" stopOpacity="0.15" />
          <stop offset="0.95" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>

        <linearGradient
          id={g.metal}
          x1="0"
          x2={W}
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          {studio ? (
            <>
              <stop offset="0.167" stopColor="var(--smetal-1)" />
              <stop offset="0.24" stopColor="var(--smetal-2)" />
              <stop offset="0.33" stopColor="var(--smetal-3)" />
              <stop offset="0.42" stopColor="var(--smetal-4)" />
              <stop offset="0.58" stopColor="var(--smetal-5)" />
              <stop offset="0.71" stopColor="var(--smetal-6)" />
              <stop offset="0.765" stopColor="var(--smetal-7)" />
              <stop offset="0.805" stopColor="var(--smetal-8)" />
              <stop offset="0.833" stopColor="var(--smetal-1)" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="var(--metal-1)" />
              <stop offset="0.14" stopColor="var(--metal-2)" />
              <stop offset="0.38" stopColor="var(--metal-3)" />
              <stop offset="0.7" stopColor="var(--metal-4)" />
              <stop offset="1" stopColor="var(--metal-5)" />
            </>
          )}
        </linearGradient>

        <linearGradient
          id={g.wood}
          x1="0"
          x2={W}
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#c8a877" />
          <stop offset="0.2" stopColor="#eed9b0" />
          <stop offset="0.5" stopColor="#f6e8c9" />
          <stop offset="0.8" stopColor="#dcc294" />
          <stop offset="1" stopColor="#b9975f" />
        </linearGradient>

        <linearGradient
          id={g.gold}
          {...(studio
            ? { x1: "0", x2: "1", y1: "0", y2: "0" }
            : {
                x1: "0",
                x2: String(W),
                y1: "0",
                y2: "0",
                gradientUnits: "userSpaceOnUse" as const,
              })}
        >
          {studio ? (
            <>
              <stop offset="0" stopColor="#b08c2c" />
              <stop offset="0.12" stopColor="#e6c25c" />
              <stop offset="0.24" stopColor="#fdf2c6" />
              <stop offset="0.36" stopColor="#f3da8c" />
              <stop offset="0.56" stopColor="#e5c25f" />
              <stop offset="0.74" stopColor="#c39c33" />
              <stop offset="0.88" stopColor="#a37f22" />
              <stop offset="0.96" stopColor="#d4ac45" />
              <stop offset="1" stopColor="#997722" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#a37c1e" />
              <stop offset="0.22" stopColor="#e8c352" />
              <stop offset="0.46" stopColor="#f7e08c" />
              <stop offset="0.74" stopColor="#cfa233" />
              <stop offset="1" stopColor="#8f6b16" />
            </>
          )}
        </linearGradient>

        <linearGradient
          id={g.rubber}
          x1="0"
          x2={W}
          y1="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#d08b7c" />
          <stop offset="0.18" stopColor="#f3b8a8" />
          <stop offset="0.46" stopColor="#f8ccbe" />
          <stop offset="0.78" stopColor="#e5a091" />
          <stop offset="1" stopColor="#c9806f" />
        </linearGradient>
      </defs>

      <Tool g={g} color={color} look={look} />

      {badge !== undefined && (
        <g>
          {/*
            Printed on the barrel rather than floated over it: recessed into
            the white, in the barrel's own shadow colour, so it reads as part
            of the pen instead of a tooltip stuck to it.
          */}
          <text
            x={W / 2}
            y={SHOULDER + 21}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="600"
            fill="rgba(0,0,0,0.42)"
            style={{ fontFamily: "var(--font)", letterSpacing: "-0.02em" }}
          >
            {Math.round(badge)}
          </text>
        </g>
      )}
    </svg>
  );
});

type G = Record<string, string>;
type Parts = { g: G; color: string; look: Look };

const u = (id: string) => `url(#${id})`;

/**
 * A shape plus its shading, as one unit — the shading never gets its own
 * edge.
 */
function Shaded({
  d,
  fill,
  g,
  opacity,
  rim,
  look = "classic",
}: {
  d: string;
  fill: string;
  g: G;
  opacity?: number;
  rim?: boolean;
  look?: Look;
}) {
  return (
    <>
      <path d={d} fill={fill} fillOpacity={opacity} />
      <path d={d} fill={u(look === "studio" ? g.tipShade : g.shade)} />
      {rim && (
        <path d={d} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.4" />
      )}
    </>
  );
}

/** The white barrel every tool shares below the shoulder. */
function Barrel({
  g,
  top = SHOULDER,
  fill,
}: {
  g: G;
  top?: number;
  /** Overrides the cylinder ramp, for the one tool that isn't a cylinder. */
  fill?: string;
}) {
  const d = `M5 ${top + 1.5}a1.5 1.5 0 0 1 1.5-1.5h17a1.5 1.5 0 0 1 1.5 1.5V${H}H5Z`;
  return <path d={d} fill={fill ?? u(g.barrel)} />;
}

/** Where the coloured band sits: the top of the barrel, under every tip. */
const BAND_TOP = 32.6;

/** A band of the ink colour, so the barrel reads as "this draws in X". */
function Band({
  g,
  color,
  y = BAND_TOP,
  rim,
  look = "classic",
}: {
  g: G;
  color: string;
  y?: number;
  rim?: boolean;
  look?: Look;
}) {
  return (
    <>
      <Shaded d={`M5 ${y}h20v5H5Z`} fill={color} g={g} look={look} />
      {rim && (
        <path
          d={`M5.3 ${y + 0.3}h19.4v4.4H5.3Z`}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.4"
        />
      )}
    </>
  );
}

/* Two rules hold the set together. */

const BASE = SHOULDER + 2.6;
/** Where a tapering collar must have finished tapering. */
const FLARE = SHOULDER - 1;
/** Dark plastic, shared by every collar so the row reads as one family. */
const COLLAR = "var(--tool-collar)";

/** The exposed core: the wood's cone, cut short. */
const CUT = 17.2;
const GRAPHITE = `M15 ${APEX} ${15 + (10 * (CUT - APEX)) / (FLARE - APEX)} ${CUT}H${15 - (10 * (CUT - APEX)) / (FLARE - APEX)}Z`;

function Pencil({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} fill={look === "studio" ? u(g.facet) : undefined} />
      <Band g={g} color={color} rim look={look} />
      {/* Sharpened wood, running the full width at the shoulder */}
      {look === "studio" ? (
        /*
          The flats keep going.

          Sharpening a hexagonal pencil doesn't turn it round — the faces run
          on up the cone and meet at the point, which is why the wood on a real
          one shows three panels and not a smooth taper. Shading the barrel in
          facets and the cone as a cylinder was the mismatch: the two halves of
          the same object disagreed about its shape.
        */
        <>
          <path
            d={`M5 ${BAND_TOP}V${FLARE}L15 ${APEX} 11.6 ${BAND_TOP}Z`}
            fill="#ead6b2"
          />
          <path
            d={`M11.6 ${BAND_TOP} 15 ${APEX} 18.4 ${BAND_TOP}Z`}
            fill="#f2e4c5"
          />
          <path
            d={`M18.4 ${BAND_TOP} 15 ${APEX} 25 ${FLARE}V${BAND_TOP}Z`}
            fill="#e1c79c"
          />
        </>
      ) : (
        <Shaded
          d={`M15 ${APEX} 25 ${FLARE}V${BAND_TOP}H5V${FLARE}Z`}
          fill={u(g.wood)}
          g={g}
          look={look}
        />
      )}
      {/* Graphite exposed at the point — the same cone, cut short.
          Coloured, like every other tip in the row: the pencil was the one
          tool in the tray that gave no sign of what it would draw with. */}
      {look === "studio" ? (
        /*
          The graphite is faceted too, on the same two edges as the wood.

          Left flat and laid over a faceted cone, it ended in a straight cut
          with the narrow middle face appearing out from behind it — which
          reads as a notch bitten out of the point, and it is the first thing
          you see on the tool. The edges here are the wood's own, continued:
          both pairs run to the apex from x 11.6 and 18.4 at the shoulder, so
          the flats carry through the join instead of stopping at it.
        */
        <>
          <path d={GRAPHITE} fill={color} />
          <path
            d={`M10.6 17.2 15 ${APEX} 13.17 17.2Z`}
            fill="rgba(0,0,0,0.04)"
          />
          <path
            d={`M13.17 ${CUT} 15 ${APEX} 16.83 ${CUT}Z`}
            fill="rgba(255,255,255,0.06)"
          />
          <path
            d={`M16.83 17.2 15 ${APEX} 19.4 17.2Z`}
            fill="rgba(0,0,0,0.09)"
          />
          <path
            d={GRAPHITE}
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="0.4"
          />
        </>
      ) : (
        <Shaded d={GRAPHITE} fill={color} g={g} rim look={look} />
      )}
    </>
  );
}

function Pen({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} />
      <Band g={g} color={color} rim look={look} />
      {/* Slim cone, so it can't be mistaken for the pencil's broad wedge. In
          the ink, like every other working tip — left dark it was the one tool
          in the tray that wouldn't say what it was about to draw with. */}
      <Shaded
        d={`M15 ${APEX} 19.4 25H10.6Z`}
        fill={color}
        g={g}
        rim
        look={look}
      />
      <Shaded
        d={`M5 ${BASE}V${FLARE}L9.4 21.4h11.2L25 ${FLARE}V${BASE}Z`}
        fill={COLLAR}
        g={g}
        look={look}
      />
    </>
  );
}

function Fineliner({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} />
      <Band g={g} color={color} rim look={look} />
      {/* A true needle: parallel-sided and fine, not a cone */}
      <Shaded
        d={`M13.75 24V${APEX + 1.25}a1.25 1.25 0 0 1 2.5 0V24Z`}
        fill={color}
        g={g}
        rim
        look={look}
      />
      {/* A short stepped shoulder, then straight to the barrel */}
      <Shaded d={`M11.6 24h6.8l1 3.4h-8.8Z`} fill="#57534e" g={g} look={look} />
      <Shaded
        d={`M5 ${BASE}V${FLARE}L10.4 27h9.2L25 ${FLARE}V${BASE}Z`}
        fill={COLLAR}
        g={g}
        look={look}
      />
    </>
  );
}

function Marker({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} />
      <Band g={g} color={color} rim look={look} />
      {/* Blunt chisel with softened corners */}
      <Shaded
        d={`M10.6 25 11.5 ${APEX + 2}a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2L19.4 25Z`}
        fill={color}
        g={g}
        look={look}
      />
      <Shaded
        d={`M5 ${BASE}V${FLARE}L9.6 22.6h10.8L25 ${FLARE}V${BASE}Z`}
        fill={COLLAR}
        g={g}
        look={look}
      />
    </>
  );
}

function Highlighter({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} />
      <Band g={g} color={color} rim look={look} />
      {/*
        A flat chisel cut at an angle, which is what a highlighter's felt
        actually is and what makes one recognisable at this size. The old wedge
        came to a soft peak in the middle, so at a glance it was the marker
        again, only wider — and a peak is the one shape a highlighter can't
        have, since the whole point of it is an edge that lays a broad even
        band.
      */}
      <Shaded
        d={`M8.4 24V12.6a1.2 1.2 0 0 1 .8-1.1l11.2-4.1a1.2 1.2 0 0 1 1.2 1.1V24Z`}
        fill={color}
        g={g}
        look={look}
      />
      <Shaded
        d={`M5 ${BASE}V${FLARE}L8.2 22h13.6L25 ${FLARE}V${BASE}Z`}
        fill={COLLAR}
        g={g}
        look={look}
      />
    </>
  );
}

function Brush({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} />
      <Band g={g} color={color} rim look={look} />
      {/*
        A round brush: narrow where it leaves the ferrule, bellying out, then
        drawn to a fine point. That silhouette is the whole reason this tool
        looks different from the pens — they are all straight-sided cones — and
        it's also what the brush actually draws, a stroke that swells through
        the middle and tapers off at both ends.
      */}
      <Shaded
        d={`M15 ${APEX}c2.4 4.6 4.9 9.4 5.6 13.6.6 3.4.2 6.2-.6 8.8H10c-.8-2.6-1.2-5.4-.6-8.8C10.1 13.4 12.6 8.6 15 ${APEX}Z`}
        fill={color}
        g={g}
        rim
        look={look}
      />
      {/* A short crimped ferrule, gripping their base — not a metal block. */}
      <Shaded
        d={`M5 ${BAND_TOP}V26.6a1.4 1.4 0 0 1 1.4-1.4h17.2a1.4 1.4 0 0 1 1.4 1.4V${BAND_TOP}Z`}
        fill={u(g.metal)}
        g={g}
        look={look}
      />
      <path
        d="M5 28.4h20"
        stroke="rgba(0,0,0,0.14)"
        strokeWidth="0.6"
        fill="none"
      />
    </>
  );
}

function Calligraphy({ g, color, look }: Parts) {
  return (
    <>
      <Barrel g={g} />
      <Band g={g} color={color} rim look={look} />
      {/* Gold nib, shouldered and tapering to the point */}
      <Shaded
        d={`M11 25 11.7 11 15 ${APEX} 18.3 11 19 25Z`}
        fill={u(g.gold)}
        g={g}
        look={look}
      />
      {/*
        The slit and its breather hole, as one continuous outline rather than
        a rectangle laid over a circle. Two translucent shapes that overlap
        composite twice where they meet, so the join shows as a darker patch —
        and on a real nib the slit runs *into* the hole anyway, so the keyhole
        is the honest shape as well as the one that renders cleanly.
      */}
      <path
        d="M14.64 8H15.36V13.75A1.3 1.3 0 1 1 14.64 13.75Z"
        fill="rgba(0,0,0,0.34)"
      />
      <Shaded
        d={`M5 ${BASE}V${FLARE}L10.2 23.4h9.6L25 ${FLARE}V${BASE}Z`}
        fill={COLLAR}
        g={g}
        look={look}
      />
    </>
  );
}

function Eraser({ g, look }: Parts) {
  return (
    <>
      <Barrel g={g} top={SHOULDER + 4} />
      {/* Soft block, gripped by a metal collar drawn over its base */}
      <Shaded
        d={`M6.8 ${APEX + 5}a4.8 4.8 0 0 1 4.8-4.8h6.8a4.8 4.8 0 0 1 4.8 4.8V${SHOULDER + 3}H6.8Z`}
        fill={u(g.rubber)}
        g={g}
        look={look}
      />
      <Shaded
        d={`M5 ${SHOULDER - 2}h20v8.4H5Z`}
        fill={u(g.metal)}
        g={g}
        look={look}
      />
      <path d={`M5 ${SHOULDER - 2}h20v0.9H5Z`} fill="rgba(0,0,0,0.14)" />
    </>
  );
}

const TOOLS: Record<ToolIconId, (p: Parts) => React.ReactElement> = {
  pencil: Pencil,
  pen: Pen,
  fineliner: Fineliner,
  marker: Marker,
  highlighter: Highlighter,
  brush: Brush,
  fountain: Calligraphy,
  eraser: Eraser,
};
