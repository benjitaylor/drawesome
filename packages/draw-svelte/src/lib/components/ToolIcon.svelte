<script lang="ts">
  import type { PenId } from "../engine/types.js";

  export type ToolIconId = PenId | "eraser";
  export type Look = "classic" | "studio";

  let {
    id,
    color,
    size = 30,
    badge,
    look = "classic",
  }: {
    id: ToolIconId;
    color: string;
    size?: number;
    badge?: number;
    look?: Look;
  } = $props();

  const componentId = $props.id();
  const uid = componentId.replace(/:/g, "");
  const W = 30;
  const H = 88;
  const APEX = 4;
  const SHOULDER = 31;
  const BASE = SHOULDER + 2.6;
  const FLARE = SHOULDER - 1;
  const BAND_TOP = 32.6;
  const CUT = 17.2;
  const COLLAR = "var(--tool-collar)";
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
  const url = (value: string) => `url(#${value})`;
  const graphite = $derived(
    `M15 ${APEX} ${15 + (10 * (CUT - APEX)) / (FLARE - APEX)} ${CUT}H${15 - (10 * (CUT - APEX)) / (FLARE - APEX)}Z`,
  );
</script>

{#snippet shaded(
  d: string,
  fill: string,
  opacity?: number,
  rim = false,
)}
  <path {d} {fill} fill-opacity={opacity} />
  <path {d} fill={url(look === "studio" ? g.tipShade : g.shade)} />
  {#if rim}
    <path
      {d}
      fill="none"
      stroke="rgba(0,0,0,0.1)"
      stroke-width="0.4"
    />
  {/if}
{/snippet}

{#snippet barrel(top = SHOULDER, fill?: string)}
  <path
    d={`M5 ${top + 1.5}a1.5 1.5 0 0 1 1.5-1.5h17a1.5 1.5 0 0 1 1.5 1.5V${H}H5Z`}
    fill={fill ?? url(g.barrel)}
  />
{/snippet}

{#snippet band(rim = false)}
  {@render shaded(`M5 ${BAND_TOP}h20v5H5Z`, color)}
  {#if rim}
    <path
      d={`M5.3 ${BAND_TOP + 0.3}h19.4v4.4H5.3Z`}
      fill="none"
      stroke="rgba(0,0,0,0.1)"
      stroke-width="0.4"
    />
  {/if}
{/snippet}

<svg
  width={size}
  height={(size / W) * H}
  viewBox={`0 0 ${W} ${H}`}
  fill="none"
  aria-hidden="true"
  style="display:block;overflow:visible"
>
  <defs>
    <linearGradient
      id={g.barrel}
      x1="0"
      x2={W}
      y1="0"
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      {#if look === "studio"}
        <stop offset="0.167" stop-color="var(--studio-1)" />
        <stop offset="0.21" stop-color="var(--studio-2)" />
        <stop offset="0.33" stop-color="var(--studio-3)" />
        <stop offset="0.44" stop-color="var(--studio-4)" />
        <stop offset="0.58" stop-color="var(--studio-5)" />
        <stop offset="0.71" stop-color="var(--studio-6)" />
        <stop offset="0.765" stop-color="var(--studio-7)" />
        <stop offset="0.805" stop-color="var(--studio-8)" />
        <stop offset="0.833" stop-color="var(--studio-1)" />
      {:else}
        <stop offset="0" stop-color="var(--tool-1)" />
        <stop offset="0.1" stop-color="var(--tool-2)" />
        <stop offset="0.34" stop-color="var(--tool-3)" />
        <stop offset="0.68" stop-color="var(--tool-4)" />
        <stop offset="0.9" stop-color="var(--tool-5)" />
        <stop offset="1" stop-color="var(--tool-6)" />
      {/if}
    </linearGradient>
    <linearGradient
      id={g.shade}
      x1="0"
      x2={W}
      y1="0"
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      {#if look === "studio"}
        <stop offset="0.167" stop-color="#000" stop-opacity="0.26" />
        <stop offset="0.22" stop-color="#000" stop-opacity="0.03" />
        <stop offset="0.33" stop-color="#fff" stop-opacity="0.22" />
        <stop offset="0.44" stop-color="#fff" stop-opacity="0.06" />
        <stop offset="0.58" stop-color="#000" stop-opacity="0" />
        <stop offset="0.71" stop-color="#000" stop-opacity="0.12" />
        <stop offset="0.765" stop-color="#000" stop-opacity="0.22" />
        <stop offset="0.805" stop-color="#fff" stop-opacity="0.05" />
        <stop offset="0.833" stop-color="#000" stop-opacity="0.2" />
      {:else}
        <stop offset="0" stop-color="#000" stop-opacity="0.20" />
        <stop offset="0.14" stop-color="#fff" stop-opacity="0.22" />
        <stop offset="0.36" stop-color="#fff" stop-opacity="0.14" />
        <stop offset="0.62" stop-color="#000" stop-opacity="0.03" />
        <stop offset="1" stop-color="#000" stop-opacity="0.24" />
      {/if}
    </linearGradient>
    <linearGradient
      id={g.facet}
      x1="0"
      x2={W}
      y1="0"
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0.167" stop-color="var(--pfacet-1)" />
      <stop offset="0.3" stop-color="var(--pfacet-2)" />
      <stop offset="0.387" stop-color="var(--pfacet-2)" />
      <stop offset="0.387" stop-color="var(--pfacet-3)" />
      <stop offset="0.52" stop-color="var(--pfacet-3)" />
      <stop offset="0.613" stop-color="var(--pfacet-4)" />
      <stop offset="0.613" stop-color="var(--pfacet-5)" />
      <stop offset="0.75" stop-color="var(--pfacet-5)" />
      <stop offset="0.833" stop-color="var(--pfacet-6)" />
    </linearGradient>
    <linearGradient id={g.tipShade} x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.16" />
      <stop offset="0.07" stop-color="#000" stop-opacity="0.02" />
      <stop offset="0.2" stop-color="#fff" stop-opacity="0.18" />
      <stop offset="0.33" stop-color="#fff" stop-opacity="0.05" />
      <stop offset="0.52" stop-color="#000" stop-opacity="0" />
      <stop offset="0.72" stop-color="#000" stop-opacity="0.08" />
      <stop offset="0.87" stop-color="#000" stop-opacity="0.15" />
      <stop offset="0.95" stop-color="#fff" stop-opacity="0.05" />
      <stop offset="1" stop-color="#000" stop-opacity="0.14" />
    </linearGradient>
    <linearGradient
      id={g.metal}
      x1="0"
      x2={W}
      y1="0"
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      {#if look === "studio"}
        <stop offset="0.167" stop-color="var(--smetal-1)" />
        <stop offset="0.24" stop-color="var(--smetal-2)" />
        <stop offset="0.33" stop-color="var(--smetal-3)" />
        <stop offset="0.42" stop-color="var(--smetal-4)" />
        <stop offset="0.58" stop-color="var(--smetal-5)" />
        <stop offset="0.71" stop-color="var(--smetal-6)" />
        <stop offset="0.765" stop-color="var(--smetal-7)" />
        <stop offset="0.805" stop-color="var(--smetal-8)" />
        <stop offset="0.833" stop-color="var(--smetal-1)" />
      {:else}
        <stop offset="0" stop-color="var(--metal-1)" />
        <stop offset="0.14" stop-color="var(--metal-2)" />
        <stop offset="0.38" stop-color="var(--metal-3)" />
        <stop offset="0.7" stop-color="var(--metal-4)" />
        <stop offset="1" stop-color="var(--metal-5)" />
      {/if}
    </linearGradient>
    <linearGradient
      id={g.wood}
      x1="0"
      x2={W}
      y1="0"
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stop-color="#c8a877" />
      <stop offset="0.2" stop-color="#eed9b0" />
      <stop offset="0.5" stop-color="#f6e8c9" />
      <stop offset="0.8" stop-color="#dcc294" />
      <stop offset="1" stop-color="#b9975f" />
    </linearGradient>
    <linearGradient
      id={g.gold}
      x1="0"
      x2={look === "studio" ? "1" : W}
      y1="0"
      y2="0"
      gradientUnits={look === "studio" ? undefined : "userSpaceOnUse"}
    >
      {#if look === "studio"}
        <stop offset="0" stop-color="#b08c2c" />
        <stop offset="0.12" stop-color="#e6c25c" />
        <stop offset="0.24" stop-color="#fdf2c6" />
        <stop offset="0.36" stop-color="#f3da8c" />
        <stop offset="0.56" stop-color="#e5c25f" />
        <stop offset="0.74" stop-color="#c39c33" />
        <stop offset="0.88" stop-color="#a37f22" />
        <stop offset="0.96" stop-color="#d4ac45" />
        <stop offset="1" stop-color="#997722" />
      {:else}
        <stop offset="0" stop-color="#a37c1e" />
        <stop offset="0.22" stop-color="#e8c352" />
        <stop offset="0.46" stop-color="#f7e08c" />
        <stop offset="0.74" stop-color="#cfa233" />
        <stop offset="1" stop-color="#8f6b16" />
      {/if}
    </linearGradient>
    <linearGradient
      id={g.rubber}
      x1="0"
      x2={W}
      y1="0"
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stop-color="#d08b7c" />
      <stop offset="0.18" stop-color="#f3b8a8" />
      <stop offset="0.46" stop-color="#f8ccbe" />
      <stop offset="0.78" stop-color="#e5a091" />
      <stop offset="1" stop-color="#c9806f" />
    </linearGradient>
  </defs>

  {#if id === "pencil"}
    {@render barrel(SHOULDER, look === "studio" ? url(g.facet) : undefined)}
    {@render band(true)}
    {#if look === "studio"}
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
      <path d={graphite} fill={color} />
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
        d={graphite}
        fill="none"
        stroke="rgba(0,0,0,0.1)"
        stroke-width="0.4"
      />
    {:else}
      {@render shaded(
        `M15 ${APEX} 25 ${FLARE}V${BAND_TOP}H5V${FLARE}Z`,
        url(g.wood),
      )}
      {@render shaded(graphite, color, undefined, true)}
    {/if}
  {:else if id === "pen"}
    {@render barrel()}
    {@render band(true)}
    {@render shaded(
      `M15 ${APEX} 19.4 25H10.6Z`,
      color,
      undefined,
      true,
    )}
    {@render shaded(
      `M5 ${BASE}V${FLARE}L9.4 21.4h11.2L25 ${FLARE}V${BASE}Z`,
      COLLAR,
    )}
  {:else if id === "fineliner"}
    {@render barrel()}
    {@render band(true)}
    {@render shaded(
      `M13.75 24V${APEX + 1.25}a1.25 1.25 0 0 1 2.5 0V24Z`,
      color,
      undefined,
      true,
    )}
    {@render shaded(`M11.6 24h6.8l1 3.4h-8.8Z`, "#57534e")}
    {@render shaded(
      `M5 ${BASE}V${FLARE}L10.4 27h9.2L25 ${FLARE}V${BASE}Z`,
      COLLAR,
    )}
  {:else if id === "marker"}
    {@render barrel()}
    {@render band(true)}
    {@render shaded(
      `M10.6 25 11.5 ${APEX + 2}a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2L19.4 25Z`,
      color,
    )}
    {@render shaded(
      `M5 ${BASE}V${FLARE}L9.6 22.6h10.8L25 ${FLARE}V${BASE}Z`,
      COLLAR,
    )}
  {:else if id === "highlighter"}
    {@render barrel()}
    {@render band(true)}
    {@render shaded(
      `M8.4 24V12.6a1.2 1.2 0 0 1 .8-1.1l11.2-4.1a1.2 1.2 0 0 1 1.2 1.1V24Z`,
      color,
    )}
    {@render shaded(
      `M5 ${BASE}V${FLARE}L8.2 22h13.6L25 ${FLARE}V${BASE}Z`,
      COLLAR,
    )}
  {:else if id === "brush"}
    {@render barrel()}
    {@render band(true)}
    {@render shaded(
      `M15 ${APEX}c2.4 4.6 4.9 9.4 5.6 13.6.6 3.4.2 6.2-.6 8.8H10c-.8-2.6-1.2-5.4-.6-8.8C10.1 13.4 12.6 8.6 15 ${APEX}Z`,
      color,
      undefined,
      true,
    )}
    {@render shaded(
      `M5 ${BAND_TOP}V26.6a1.4 1.4 0 0 1 1.4-1.4h17.2a1.4 1.4 0 0 1 1.4 1.4V${BAND_TOP}Z`,
      url(g.metal),
    )}
    <path
      d="M5 28.4h20"
      stroke="rgba(0,0,0,0.14)"
      stroke-width="0.6"
      fill="none"
    />
  {:else if id === "fountain"}
    {@render barrel()}
    {@render band(true)}
    {@render shaded(
      `M11 25 11.7 11 15 ${APEX} 18.3 11 19 25Z`,
      url(g.gold),
    )}
    <path
      d="M14.64 8H15.36V13.75A1.3 1.3 0 1 1 14.64 13.75Z"
      fill="rgba(0,0,0,0.34)"
    />
    {@render shaded(
      `M5 ${BASE}V${FLARE}L10.2 23.4h9.6L25 ${FLARE}V${BASE}Z`,
      COLLAR,
    )}
  {:else}
    {@render barrel(SHOULDER + 4)}
    {@render shaded(
      `M6.8 ${APEX + 5}a4.8 4.8 0 0 1 4.8-4.8h6.8a4.8 4.8 0 0 1 4.8 4.8V${SHOULDER + 3}H6.8Z`,
      url(g.rubber),
    )}
    {@render shaded(`M5 ${SHOULDER - 2}h20v8.4H5Z`, url(g.metal))}
    <path
      d={`M5 ${SHOULDER - 2}h20v0.9H5Z`}
      fill="rgba(0,0,0,0.14)"
    />
  {/if}

  {#if badge !== undefined}
    <text
      x={W / 2}
      y={SHOULDER + 21}
      text-anchor="middle"
      font-size="8.5"
      font-weight="600"
      fill="rgba(0,0,0,0.42)"
      style="font-family:var(--font);letter-spacing:-0.02em"
    >
      {Math.round(badge)}
    </text>
  {/if}
</svg>
