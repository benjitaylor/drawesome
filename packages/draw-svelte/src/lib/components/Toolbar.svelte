<script lang="ts">
  import { onDestroy, onMount, type Snippet } from "svelte";
  import { PENS } from "../engine/pens.js";
  import type { Pen, PenId, ToolId } from "../engine/types.js";
  import { resolveSwatches } from "../palette.js";
  import { TooltipController } from "../state/tooltip.svelte.js";
  import BarSlider from "./BarSlider.svelte";
  import HexField from "./HexField.svelte";
  import Icon from "./Icon.svelte";
  import MorphBar from "./MorphBar.svelte";
  import ToolIcon, { type Look } from "./ToolIcon.svelte";
  import ToolMenu from "./ToolMenu.svelte";
  import TooltipLayer from "./TooltipLayer.svelte";
  import css from "./Toolbar.module.css";
  import morph from "./MorphBar.module.css";

  export type ToolState = {
    active: ToolId;
    color: string;
    size: number;
    opacity: number;
    eraserSize: number;
  };

  export type TooltipOptions = {
    scope?: "all" | "tools";
    delay?: number;
    style?: string;
  };

  export type ToolbarProps = {
    tool: ToolState;
    inkFor: (id: PenId) => string;
    tooltips?: boolean | TooltipOptions;
    pens?: Pen[];
    eraser?: boolean;
    controls?: {
      color?: boolean;
      size?: boolean;
      opacity?: boolean;
      undo?: boolean;
      clear?: boolean;
      custom?: boolean;
      minimize?: boolean;
    };
    settings?: "bar" | "tool";
    theme?: "light" | "dark" | "auto";
    look?: Look;
    gauge?: boolean;
    shortcuts?: boolean;
    swatches?: string[];
    onSelect: (id: ToolId) => void;
    onChange: (patch: Partial<ToolState>) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    hasStrokes: boolean;
    placement?: "bottom" | "left" | "right";
    collapsed?: boolean;
    onCollapse?: () => void;
    onExpand?: () => void;
    shift?: number;
    /** Custom content for the minimized disc. */
    icon?: Snippet;
    onMeasure?: (width: number, height: number) => void;
  };

  let {
    tool,
    inkFor,
    tooltips = true,
    pens = PENS,
    eraser = true,
    controls,
    settings = "bar",
    theme = "light",
    look = "classic",
    gauge = false,
    shortcuts = true,
    swatches,
    onSelect,
    onChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClear,
    hasStrokes,
    placement = "bottom",
    collapsed = false,
    onCollapse,
    onExpand,
    shift = 0,
    icon,
    onMeasure,
  }: ToolbarProps = $props();

  type Mode = "tools" | "ink" | "brush" | "spectrum";
  let mode = $state<Mode>("tools");
  let canPick = $state(false);
  let openTool = $state<HTMLElement | null>(null);
  let closingTool = $state(false);
  let frozen = $state<{
    size: number;
    maxSize: number;
    opacity: number;
    color: string;
    showOpacity: boolean;
  } | null>(null);
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  const tooltipController = new TooltipController(
    () => tooltips,
    () => placement,
  );
  const tooltip = tooltipController.tooltip;

  const isEraser = $derived(tool.active === "eraser");
  const vertical = $derived(placement !== "bottom");
  const size = $derived(isEraser ? tool.eraserSize : tool.size);
  const maxSize = $derived(isEraser ? 120 : 80);
  const live = $derived({
    size,
    maxSize,
    opacity: tool.opacity,
    color: isEraser ? "#c9c7c2" : tool.color,
    showOpacity: !isEraser,
  });
  const menu = $derived(frozen ?? live);
  const show = $derived({
    color: controls?.color ?? true,
    size: controls?.size ?? true,
    opacity: controls?.opacity ?? true,
    custom: controls?.custom ?? true,
    undo: controls?.undo ?? true,
    clear: controls?.clear ?? true,
    minimize: controls?.minimize ?? true,
  });
  const sizeLabel = $derived(
    show.size && show.opacity && !isEraser
      ? "Size & opacity"
      : show.size
        ? "Size"
        : "Opacity",
  );
  onMount(() => {
    canPick = "EyeDropper" in window;
  });
  onDestroy(() => {
    if (closeTimer) clearTimeout(closeTimer);
    tooltipController.destroy();
  });

  function closeMenu() {
    if (closeTimer) clearTimeout(closeTimer);
    frozen = live;
    closingTool = true;
    closeTimer = setTimeout(() => {
      openTool = null;
      closingTool = false;
      frozen = null;
    }, 150);
  }

  function showMenu(element: HTMLElement) {
    if (closeTimer) clearTimeout(closeTimer);
    frozen = null;
    closingTool = false;
    openTool = element;
  }

  function isLight(hex: string) {
    const match = /^#?([\da-f]{6})$/i.exec(hex.trim());
    if (!match) return false;
    const value = parseInt(match[1], 16);
    return (
      (0.299 * ((value >> 16) & 255) +
        0.587 * ((value >> 8) & 255) +
        0.114 * (value & 255)) /
        255 >
      0.62
    );
  }

  type Picker = new () => {
    open(options?: {
      signal?: AbortSignal;
    }): Promise<{ sRGBHex: string }>;
  };
  let picking = false;
  async function pickFromScreen() {
    if (picking) return null;
    const EyeDropper = (window as unknown as { EyeDropper?: Picker })
      .EyeDropper;
    if (!EyeDropper) return null;
    picking = true;
    const abort = new AbortController();
    const cancel = () => abort.abort();
    window.addEventListener("blur", cancel, { once: true });
    document.addEventListener("visibilitychange", cancel, { once: true });
    try {
      return (await new EyeDropper().open({ signal: abort.signal })).sRGBHex;
    } catch {
      return null;
    } finally {
      picking = false;
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    }
  }

</script>

{#snippet back()}
  <button
    type="button"
    class={css.round}
    onclick={() => {
      mode = "tools";
    }}
    aria-label="Back to tools"
    use:tooltip={{ label: "Back", control: true }}
  >
    <Icon name="back" />
  </button>
{/snippet}

{#snippet toolsPanel()}
  {#if show.undo}
    <span class={css.seated}>
      <button
        type="button"
        class={css.round}
        disabled={!canUndo}
        onclick={onUndo}
        aria-label="Undo"
        use:tooltip={{
          label: "Undo",
          hint: shortcuts ? "⌘Z" : undefined,
          control: true,
        }}
      >
        <Icon name="undo" />
      </button>
    </span>
    <span class={css.seated}>
      <button
        type="button"
        class={css.round}
        disabled={!canRedo}
        onclick={onRedo}
        aria-label="Redo"
        use:tooltip={{
          label: "Redo",
          hint: shortcuts ? "⇧⌘Z" : undefined,
          control: true,
        }}
      >
        <Icon name="redo" />
      </button>
    </span>
  {/if}

  {#if show.clear}
    <span class={css.seated}>
      <button
        type="button"
        class={css.round}
        data-tone="danger"
        disabled={!hasStrokes}
        onclick={onClear}
        aria-label="Clear"
        use:tooltip={{ label: "Clear all", control: true }}
      >
        <Icon name="trash" />
      </button>
    </span>
  {/if}

  {#if show.undo || show.clear}<span class={css.divider}></span>{/if}

  {#each pens as pen (pen.id)}
    <button
      type="button"
      class={css.tool}
      data-active={tool.active === pen.id || undefined}
      onclick={(event) => {
        if (settings === "tool" && tool.active === pen.id) {
          if (openTool && !closingTool) closeMenu();
          else showMenu(event.currentTarget);
          return;
        }
        if (openTool) closeMenu();
        onSelect(pen.id);
      }}
      aria-label={pen.name}
      aria-pressed={tool.active === pen.id}
      aria-expanded={settings === "tool" && tool.active === pen.id
        ? openTool !== null
        : undefined}
      use:tooltip={{
        label: pen.name,
        hint: shortcuts ? pen.key : undefined,
      }}
    >
      <ToolIcon
        id={pen.id}
        color={inkFor(pen.id)}
        {look}
        badge={gauge && tool.active === pen.id ? size : undefined}
      />
    </button>
  {/each}

  {#if eraser}
    <button
      type="button"
      class={css.tool}
      data-active={isEraser || undefined}
      onclick={() => onSelect("eraser")}
      aria-label="Eraser"
      aria-pressed={isEraser}
      use:tooltip={{
        label: "Eraser",
        hint: shortcuts ? "E" : undefined,
      }}
    >
      <ToolIcon id="eraser" color={tool.color} {look} />
    </button>
  {/if}

  {#if (show.size && settings === "bar") || show.color}
    <span class={css.divider}></span>
  {/if}

  {#if (show.size || show.opacity) && settings === "bar"}
    <span class={css.seated}>
      <button
        type="button"
        class={css.round}
        onclick={() => {
          mode = "brush";
        }}
        aria-label={sizeLabel}
        use:tooltip={{ label: sizeLabel, control: true }}
      >
        <span
          class={css.brushDot}
          style:width={`${6 + (size / maxSize) * 16}px`}
          style:height={`${6 + (size / maxSize) * 16}px`}
          style:background={isEraser ? "#c9c7c2" : tool.color}
          style:opacity={isEraser ? 1 : tool.opacity}
        ></span>
      </button>
    </span>
  {/if}

  {#if show.color}
    <span class={css.seated}>
      <button
        type="button"
        class={css.round}
        onclick={() => {
          mode = "ink";
        }}
        aria-label={`Ink colour — ${tool.color}`}
        use:tooltip={{ label: "Colour", control: true }}
      >
        <span class={css.wheel}>
          <span
            class={css.wheelInk}
            style:background={tool.color}
          ></span>
        </span>
      </button>
    </span>
  {/if}

  {#if show.minimize}<span class={css.divider}></span>{/if}
  {#if show.minimize}
    <span class={css.seated}>
      <button
        type="button"
        class={css.round}
        onclick={onCollapse}
        aria-label="Hide tools"
        use:tooltip={{ label: "Hide tools", control: true }}
      >
        <Icon name="collapse" />
      </button>
    </span>
  {/if}
{/snippet}

{#snippet inkPanel()}
  <div
    class={`${morph.centered} ${css.row} ${css.inkRow}`}
    data-open-end={!show.custom || undefined}
  >
    {@render back()}
    <span class={css.divider}></span>
    <div class={css.swatches}>
      {#each resolveSwatches(swatches, vertical) as color (color)}
        <button
          type="button"
          class={css.chip}
          data-active={tool.color.toLowerCase() === color.toLowerCase() ||
            undefined}
          style:background={color}
          onclick={() => {
            onChange({ color });
            if (isEraser) onSelect("pen");
          }}
          aria-label={color}
          title={color}
        >
          <svg
            class={css.tick}
            viewBox="0 0 16 16"
            fill="none"
            stroke={isLight(color) ? "#111" : "#fff"}
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3.6 8.4 6.7 11.5 12.4 5.2" />
          </svg>
        </button>
      {/each}
    </div>
    {#if show.custom}
      <span class={css.divider}></span>
      <button
        type="button"
        class={css.custom}
        onclick={() => {
          mode = "spectrum";
        }}
        aria-label="Pick any colour"
        use:tooltip={{ label: "Any colour", control: true }}
      >
        <span></span>
      </button>
    {/if}
  </div>
{/snippet}

{#snippet spectrumPanel()}
  <div class={`${morph.centered} ${css.row}`}>
    <button
      type="button"
      class={css.round}
      onclick={() => {
        mode = "ink";
      }}
      aria-label="Back to swatches"
      use:tooltip={{ label: "Back", control: true }}
    >
      <Icon name="back" />
    </button>
    <span class={css.divider}></span>
    <span
      class={css.preview}
      style:background={tool.color}
      aria-hidden="true"
    ></span>
    {#if !vertical}
      <HexField
        value={tool.color}
        onChange={(color) => {
          onChange({ color });
          if (isEraser) onSelect("pen");
        }}
      />
    {/if}
    {#if canPick}
      <button
        type="button"
        class={css.round}
        aria-label="Pick a colour from the screen"
        use:tooltip={{ label: "Pick from screen", control: true }}
        onclick={async () => {
          const picked = await pickFromScreen();
          if (!picked) return;
          onChange({ color: picked });
          if (isEraser) onSelect("pen");
        }}
      >
        <Icon name="dropper" />
      </button>
    {/if}
  </div>
{/snippet}

{#snippet brushPanel()}
  <div class={`${morph.centered} ${css.row} ${css.tail}`}>
    {@render back()}
    {#if show.size}
      <span class={css.divider}></span>
      <BarSlider
        {vertical}
        label="Size"
        value={size}
        min={1}
        max={maxSize}
        curve={2}
        display={String(Math.round(size))}
        color={isEraser ? "#c9c7c2" : tool.color}
        onChange={(value) =>
          onChange(isEraser ? { eraserSize: value } : { size: value })}
      />
    {/if}
    {#if show.opacity && !isEraser}
      <span class={css.divider}></span>
      <BarSlider
        {vertical}
        label="Opacity"
        value={tool.opacity}
        min={0.05}
        max={1}
        display={`${Math.round(tool.opacity * 100)}%`}
        color={tool.color}
        checker
        onChange={(opacity) => onChange({ opacity })}
      />
    {/if}
  </div>
{/snippet}

{#snippet collapsedContent()}
  <span class={css.peek}>
    {#if icon}
      {@render icon()}
    {:else}
      <ToolIcon
        id={tool.active === "eraser" ? "eraser" : tool.active}
        color={tool.color}
        {look}
        size={42}
      />
    {/if}
  </span>
{/snippet}

<MorphBar
  active={mode}
  class={placement === "bottom"
    ? undefined
    : `${css.vertical} ${placement === "left" ? css.left : css.right}`}
  {vertical}
  side={placement === "bottom" ? undefined : placement}
  {collapsed}
  {onExpand}
  {shift}
  {onMeasure}
  {collapsedContent}
  panels={[
    { id: "tools", content: toolsPanel },
    { id: "ink", content: inkPanel },
    { id: "spectrum", content: spectrumPanel },
    { id: "brush", content: brushPanel },
  ]}
/>

<TooltipLayer controller={tooltipController} />

{#if settings === "tool" && openTool}
  <ToolMenu
    anchor={openTool}
    size={menu.size}
    maxSize={menu.maxSize}
    opacity={menu.opacity}
    color={menu.color}
    showOpacity={menu.showOpacity}
    {theme}
    closing={closingTool}
    onSize={(value) =>
      onChange(isEraser ? { eraserSize: value } : { size: value })}
    onOpacity={(opacity) => onChange({ opacity })}
    onClose={closeMenu}
  />
{/if}
