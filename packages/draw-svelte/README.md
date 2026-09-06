<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo-dark.svg">
  <img src="logo.svg" alt="Drawesome" width="72">
</picture>

<br>

# draw-svelte

The native Svelte 5 port of Drawesome: seven pens that behave like pens, an eraser that takes away area rather than whole strokes, and SVG or PNG out. It matches the React package’s tools, layout, defaults, interactions, themes, and export format.

## Install

```bash
npm install draw-svelte
```

Peer dependency: `svelte >=5.20.0` (`$props.id()` is used to create hydration-safe SVG IDs).

## Quick start

```svelte
<script lang="ts">
  import { Draw } from "draw-svelte";
  import "draw-svelte/styles.css";
</script>

<div style="height: 480px">
  <Draw />
</div>
```

`Draw` fills its parent container, so give the wrapper a height.

## Props

The Svelte component accepts the same drawing, tool, chrome, placement, theme, and customization props as the React `Draw` component. Native Svelte attributes are also supported: use `class` (or the compatibility alias `className`) and pass inline styles as a string.

The `motion` prop also matches the React package: use `"rise"`, `"none"`, or an object such as `{ in: "rise", out: "none", duration: 240 }`.

```svelte
<Draw
  placement="left"
  tools={["pencil", "pen", "marker", "highlighter", "brush"]}
  controls={{ undo: false, clear: false, opacity: false }}
  background="checker"
/>
```

## Imperative handle

Bind the component instance to use the same export methods:

```svelte
<script lang="ts">
  import { Draw } from "draw-svelte";

  let draw: Draw;
</script>

<Draw bind:this={draw} />
<button onclick={() => draw.download("sketch", "png", 2)}>
  Download PNG
</button>
```

The exposed methods are `toSvg`, `toPng`, `download`, `getStrokes`, `setStrokes`, `undo`, `redo`, `clear`, and `getSize`.

## Composing the pieces

`DrawSurface`, `Toolbar`, `ToolIcon`, `DrawingController`, and `createDrawing` are exported for custom layouts. A standalone `Toolbar` accepts an `icon` snippet for its minimized disc; the default is the active tool illustration. `DrawHandle` is exported as the type of the instance bound with `bind:this`. The drawing engine exports (`PENS`, `getStroke`, `strokePath`, serialization helpers, types, and palettes) match the original package.

## Keyboard

Every pen has the same single-key shortcut shown in its tooltip. `E` selects the eraser, `[` and `]` adjust size, and `⌘Z` / `⇧⌘Z` undo and redo. Hold `Shift` while drawing to constrain the stroke to the nearest of eight directions.

## Development and validation

Run the Svelte studio with `pnpm dev:svelte`. It exposes the same configuration and export panel as the React studio; append `?debug=false` for an unobstructed drawing surface.

From the repository root, `pnpm check` runs type checks, production builds, source parity, packed-consumer validation, and the browser suite. See [the validation guide](https://github.com/benjitaylor/drawesome/blob/master/tests/README.md) for setup and coverage.

## License

© 2026 Benji Taylor

Licensed under MIT
