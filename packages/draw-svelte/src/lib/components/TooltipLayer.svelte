<script lang="ts">
  import { tick } from "svelte";
  import type { TooltipController } from "../state/tooltip.svelte.js";
  import css from "./Tooltip.module.css";

  let { controller }: { controller: TooltipController } = $props();

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  $effect(() => {
    controller.shown?.label;
    controller.shown?.hint;
    tick().then(() => controller.measure());
  });
</script>

{#if controller.shown}
  <div
    use:portal
    class={css.anchor}
    style:transform={`translate3d(${controller.shown.x}px, ${controller.shown.y}px, 0)`}
  >
    <div
      class={css.tip}
      data-at={controller.shown.at}
      data-closing={controller.closing || undefined}
      style={`width:${controller.width === null ? "auto" : `${controller.width}px`};${controller.style ?? ""}`}
      role="tooltip"
    >
      {#key controller.swap}
        {#if controller.leaving}
          <div
            class={css.face}
            data-leaving
          >
            <span class={css.label}>{controller.leaving.label}</span>
            {#if controller.leaving.hint}
              <kbd class={css.hint}>{controller.leaving.hint}</kbd>
            {/if}
          </div>
        {/if}
        <div
          class={css.face}
          bind:this={controller.face}
        >
          <span class={css.label}>{controller.shown.label}</span>
          {#if controller.shown.hint}
            <kbd class={css.hint}>{controller.shown.hint}</kbd>
          {/if}
        </div>
      {/key}
    </div>
  </div>
{/if}
