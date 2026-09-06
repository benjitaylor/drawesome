<script lang="ts">
  import { onDestroy, type Snippet } from "svelte";
  import { PENS, type Draw } from "draw-svelte";
  import type { DebugState } from "./debug";
  import css from "./Debug.module.css";

  let { value, onChange, draw }: {
    value: DebugState;
    onChange: (next: DebugState) => void;
    draw: Draw | undefined;
  } = $props();

  const set = <K extends keyof DebugState>(key: K, next: DebugState[K]) =>
    onChange({ ...value, [key]: next });
  const choices = {
    placement: ["bottom", "left", "right"],
    theme: ["light", "dark", "auto"],
    depth: ["flat", "soft", "regular", "strong"],
    settings: ["bar", "tool"],
    align: ["start", "center", "end"],
  } as const;
  const controls = ["color", "size", "opacity", "custom", "undo", "clear", "minimize"] as const;
  let replay: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(replay));
</script>

{#snippet row(label: string, children: Snippet)}
  <div class={css.group}>
    <span class={css.label}>{label}</span>
    <div class={css.row}>{@render children()}</div>
  </div>
{/snippet}

{#snippet toggle(label: string, on: boolean, onclick: () => void)}
  <button type="button" class={css.chip} data-active={on || undefined} {onclick}>{label}</button>
{/snippet}

<div class={css.panel}>
  <span class={css.tag}>demo</span>
  {#each Object.keys(choices) as key}
    {@const field = key as keyof typeof choices}
    {#snippet options()}
      {#each choices[field] as option}
        {@render toggle(option, value[field] === option, () => set(field, option))}
      {/each}
    {/snippet}
    {@render row(field, options)}
  {/each}
  {#snippet looks()}
    {#each ["classic", "studio"] as look}
      {@render toggle(look, value.look === look, () => set("look", look as DebugState["look"]))}
    {/each}
    {@render toggle("gauge", value.gauge, () => set("gauge", !value.gauge))}
    {@render toggle("keys", value.shortcuts, () => set("shortcuts", !value.shortcuts))}
  {/snippet}
  {@render row("Tools", looks)}
  {#snippet inks()}
    {#each ["auto", "shared", "per-tool"] as ink}
      {@render toggle(ink, value.ink === ink, () => set("ink", ink as DebugState["ink"]))}
    {/each}
  {/snippet}
  {@render row("Ink", inks)}
  {#snippet controlOptions()}
    {#each controls as control}
      {@render toggle(control, value.controls[control], () => set("controls", { ...value.controls, [control]: !value.controls[control] }))}
    {/each}
  {/snippet}
  {@render row("Controls", controlOptions)}
  {#snippet tools()}
    {#each PENS as pen (pen.id)}
      {@const on = value.tools.length === 0 || value.tools.includes(pen.id)}
      {@render toggle(pen.name, on, () => {
        const current = value.tools.length ? value.tools : PENS.map((p) => p.id);
        set("tools", on ? current.filter((id) => id !== pen.id) : [...current, pen.id]);
      })}
    {/each}
  {/snippet}
  {@render row("Tools", tools)}
  {#snippet motions()}
    {#each ["rise", "none"] as motion}
      {@render toggle(motion, value.motion === motion, () => set("motion", motion as DebugState["motion"]))}
    {/each}
    {@render toggle("replay", false, () => {
      clearTimeout(replay);
      set("chrome", false);
      replay = setTimeout(() => set("chrome", true), 900);
    })}
    {@render toggle(value.chrome ? "hide" : "show", value.chrome, () => set("chrome", !value.chrome))}
  {/snippet}
  {@render row("Motion", motions)}
  {#snippet extras()}
    {@render toggle("toolbar", value.chrome, () => set("chrome", !value.chrome))}
    {@render toggle("eraser", value.eraser, () => set("eraser", !value.eraser))}
    {@render toggle(`tips: ${value.tooltips === false ? "off" : value.tooltips}`, value.tooltips !== false, () => set("tooltips", value.tooltips === "all" ? "tools" : value.tooltips === "tools" ? false : "all"))}
    {@render toggle("transparent", value.transparent, () => set("transparent", !value.transparent))}
    {@render toggle("draggable", value.draggable, () => set("draggable", !value.draggable))}
  {/snippet}
  {@render row("Also", extras)}
  {#snippet exports()}
    {@render toggle(".svg", false, () => { void draw?.download("drawing", "svg"); })}
    {@render toggle(".png @2x", false, () => { void draw?.download("drawing", "png", 2); })}
    {@render toggle("copy svg", false, () => {
      const svg = draw?.toSvg() ?? "";
      console.log(svg);
      void navigator.clipboard?.writeText(svg);
    })}
  {/snippet}
  {@render row("Export", exports)}
</div>
