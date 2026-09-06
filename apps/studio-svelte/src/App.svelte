<script lang="ts">
  import { onMount } from "svelte";
  import { Draw } from "draw-svelte";
  import Debug from "./Debug.svelte";
  import { defaults, type DebugState } from "./debug";
  import css from "./App.module.css";

  const query = new URLSearchParams(window.location.search);
  let debug = $state<DebugState>({
    ...defaults,
    placement: query.get("placement") === "left" || query.get("placement") === "right"
      ? query.get("placement") as DebugState["placement"] : defaults.placement,
    theme: query.get("theme") === "dark" ? "dark" : defaults.theme,
    settings: query.get("settings") === "tool" ? "tool" : defaults.settings,
    motion: query.get("motion") === "none" ? "none" : defaults.motion,
    chrome: query.get("chrome") !== "false",
  });
  let draw = $state<Draw>();

  onMount(() => {
    if (query.get("replay") !== "true") return;
    const hide = setTimeout(() => { debug.chrome = false; }, 250);
    const show = setTimeout(() => { debug.chrome = true; }, 1_000);
    return () => { clearTimeout(hide); clearTimeout(show); };
  });
</script>

<div class={css.page}>
  <Draw
    bind:this={draw}
    placement={debug.placement}
    theme={debug.theme}
    chrome={debug.chrome}
    motion={debug.motion}
    depth={debug.depth}
    ink={debug.ink}
    tooltips={debug.tooltips === false ? false : { scope: debug.tooltips }}
    eraser={debug.eraser}
    tools={debug.tools.length ? debug.tools : undefined}
    controls={debug.controls}
    settings={debug.settings}
    align={debug.align}
    look={debug.look}
    gauge={debug.gauge}
    shortcuts={debug.shortcuts}
    draggable={debug.draggable}
    background={debug.transparent ? "checker" : debug.theme === "dark" ? "#17171a" : "#ffffff"}
  />
  {#if query.get("debug") !== "false"}
    <Debug value={debug} onChange={(next) => { debug = next; }} {draw} />
  {/if}
</div>
