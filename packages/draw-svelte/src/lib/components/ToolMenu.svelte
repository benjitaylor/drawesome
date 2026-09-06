<script lang="ts">
  import BarSlider from "./BarSlider.svelte";
  import css from "./ToolMenu.module.css";

  let {
    anchor,
    size,
    maxSize,
    opacity,
    color,
    showOpacity = true,
    theme = "light",
    closing = false,
    onSize,
    onOpacity,
    onClose,
  }: {
    anchor: HTMLElement;
    size: number;
    maxSize: number;
    opacity: number;
    color: string;
    showOpacity?: boolean;
    theme?: "light" | "dark" | "auto";
    closing?: boolean;
    onSize: (value: number) => void;
    onOpacity: (value: number) => void;
    onClose: () => void;
  } = $props();

  let menu: HTMLDivElement;
  let at = $state<{ x: number; y: number; beak: number } | null>(null);

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  $effect(() => {
    const currentAnchor = anchor;
    function place() {
      const box = currentAnchor.getBoundingClientRect();
      const width = menu?.offsetWidth ?? 240;
      const art = currentAnchor.querySelector("svg");
      const drawn = art ? art.getBoundingClientRect() : box;
      const half = width / 2;
      const centre = drawn.left + drawn.width / 2;
      const x = Math.min(
        Math.max(centre, half + 8),
        window.innerWidth - half - 8,
      );
      const beak = Math.min(Math.max(centre - (x - half), 22), width - 22);
      at = { x, y: box.top - 12, beak };
    }
    function away(event: PointerEvent) {
      const target = event.target as Node;
      if (menu?.contains(target) || currentAnchor.contains(target)) return;
      onClose();
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", key);
    };
  });
</script>

<div
  use:portal
  bind:this={menu}
  class={`sd ${css.menu}`}
  data-theme={theme}
  data-closing={closing || undefined}
  style:left={at ? `${at.x}px` : undefined}
  style:top={at ? `${at.y}px` : undefined}
  style:--beak-x={at ? `${at.beak}px` : undefined}
  style:opacity={at ? undefined : "0"}
  role="dialog"
  aria-label="Tool settings"
>
  <div class={css.rows}>
    <BarSlider
      label="Size"
      value={size}
      min={1}
      max={maxSize}
      curve={2}
      display={String(Math.round(size))}
      {color}
      onChange={onSize}
    />
    {#if showOpacity}
      <BarSlider
        label="Opacity"
        value={opacity}
        min={0.05}
        max={1}
        display={`${Math.round(opacity * 100)}%`}
        {color}
        checker
        onChange={onOpacity}
      />
    {/if}
  </div>
  <span class={css.beak} aria-hidden="true"></span>
</div>
