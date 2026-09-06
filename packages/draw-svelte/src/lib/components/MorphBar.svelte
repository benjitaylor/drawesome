<script lang="ts">
  import type { Snippet } from "svelte";
  import { tick } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import css from "./MorphBar.module.css";

  export type MorphPanel = { id: string; content: Snippet };

  let {
    panels,
    active,
    vertical = false,
    side,
    collapsed = false,
    collapsedContent,
    onExpand,
    shift = 0,
    onMeasure,
    class: className,
  }: {
    panels: MorphPanel[];
    active: string;
    vertical?: boolean;
    side?: "left" | "right";
    collapsed?: boolean;
    collapsedContent?: Snippet;
    onExpand?: () => void;
    shift?: number;
    onMeasure?: (width: number, height: number) => void;
    class?: string;
  } = $props();

  const refs = new SvelteMap<string, HTMLDivElement>();
  let extent = $state<number | null>(null);
  let settled = $state(false);

  function panelRef(node: HTMLDivElement, id: string) {
    refs.set(id, node);
    return {
      destroy() {
        refs.delete(id);
      },
    };
  }

  $effect(() => {
    active;
    panels;
    vertical;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let cancelled = false;

    tick().then(() => {
      if (cancelled) return;
      const element = refs.get(active);
      if (!element) return;
      const measure = () => {
        const next = vertical ? element.scrollHeight : element.scrollWidth;
        extent = next;
        onMeasure?.(vertical ? 66 : next, vertical ? next : 84);
      };
      measure();
      frame = requestAnimationFrame(() => {
        settled = true;
      });
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(measure);
        observer.observe(element);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  });

  const dimensionStyle = $derived(
    extent === null || collapsed
      ? ""
      : vertical
        ? `height:${extent}px`
        : `width:${extent}px`,
  );
  const translateStyle = $derived(
    collapsed
      ? `translate:${vertical ? `0 ${shift}px` : `${shift}px 0`}`
      : "",
  );
</script>

<div
  class={[
    css.bar,
    vertical ? css.vertical : "",
    collapsed ? css.collapsed : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ")}
  data-side={side}
  style={`${extent === null ? "visibility:hidden;" : ""}${dimensionStyle};${translateStyle};${settled ? "" : "transition:none;"}`}
>
  <div class={css.clip}>
    {#each panels as panel (panel.id)}
      <div
        use:panelRef={panel.id}
        class={css.panel}
        data-active={(panel.id === active && !collapsed) || undefined}
        aria-hidden={panel.id === active && !collapsed ? undefined : "true"}
        inert={panel.id === active && !collapsed ? undefined : true}
      >
        {@render panel.content()}
      </div>
    {/each}
  </div>

  {#if collapsedContent}
    <div
      class={css.collapsedContent}
      data-shown={collapsed || undefined}
    >
      {@render collapsedContent()}
    </div>
  {/if}

  {#if collapsed}
    <button
      type="button"
      class={css.expandHit}
      onclick={onExpand}
      aria-label="Show drawing tools"
    ></button>
  {/if}
</div>
