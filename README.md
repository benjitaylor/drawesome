<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo-dark.svg">
  <img src="logo.svg" alt="Drawesome" width="72">
</picture>

<br>

[![npm version](https://img.shields.io/npm/v/drawesome)](https://www.npmjs.com/package/drawesome)
[![downloads](https://img.shields.io/npm/dm/drawesome)](https://www.npmjs.com/package/drawesome)

**Drawesome** is a drawing toolbar for React. Seven pens that behave like pens, an eraser that takes away area rather than whole strokes, and SVG or PNG out. No dependencies beyond React.

Using Svelte? The monorepo also includes the native [`draw-svelte`](packages/draw-svelte) port with the same tools, interface, defaults, and drawing engine.

## Install

```bash
npm install drawesome
```

Peer dependency: `react >=18`.

## Quick Start

```tsx
import { Draw } from 'drawesome'
import 'drawesome/styles.css'

function Canvas() {
  return (
    <div style={{ height: 480 }}>
      <Draw />
    </div>
  )
}
```

It fills its parent container. Set a height on the wrapper.

## The tools

Each behaves like the thing it's named after. The pencil, pen and brush thin out the faster you move; the fineliner and highlighter hold one width whatever you do. The fountain pen goes by direction instead: thick one way, hairline the other. No two strokes come out quite the same.

The eraser takes away area rather than whole strokes, so you can rub out part of a line and keep the rest.

## Props

**Surface**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `board` | `{ w, h }` | element size | Fixed drawing area. Omit and it matches the element |
| `background` | `string` | `"#ffffff"` | Any CSS colour, `"transparent"` to paint nothing, or `"checker"` |
| `initialStrokes` | `Stroke[]` | `[]` | Strokes to open with |
| `onChange` | `(strokes) => void` | | Fires on every finished stroke and every erase |
| `className` | `string` | | Passed to the root element, along with `style` |
| `style` | `CSSProperties` | | |

**Tools**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tools` | `PenId[]` | all seven | Which pens appear, and in what order |
| `eraser` | `boolean` | `true` | Whether the eraser is offered |
| `ink` | `"auto" \| "shared" \| "per-tool"` | `"auto"` | Whether a colour applies to every tool or only the one in hand |
| `swatches` | `string[]` | 18 built-in | Your own palette, clamped to what the bar holds |
| `look` | `"classic" \| "studio"` | `"classic"` | Tools shaded flat, or lit as objects |
| `gauge` | `boolean` | `false` | Print the current size on the barrel |

**Chrome**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chrome` | `boolean` | `true` | `false` leaves the surface and no toolbar |
| `placement` | `"bottom" \| "left" \| "right"` | `"bottom"` | Which edge the bar sits on |
| `inset` | `number \| string` | `20` | How far off that edge |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Where along it |
| `draggable` | `boolean` | `false` | Let people move the bar themselves |
| `settings` | `"bar" \| "tool"` | `"bar"` | Where size and opacity live |
| `controls` | `{ color, size, opacity, undo, clear, custom, minimize }` | all `true` | Which built-in controls to show. `custom` is the swatch that opens the hex field and spectrum |
| `depth` | `"flat" \| "soft" \| "regular" \| "strong"` | `"regular"` | How physical the bar looks |
| `motion` | `"rise" \| "none" \| { in, out, duration }` | `"rise"` | How the bar arrives and leaves when `chrome` is switched |
| `theme` | `"light" \| "dark" \| "auto"` | `"light"` | `"auto"` follows the reader's system |
| `tooltips` | `boolean \| TooltipOptions` | `true` | Hover labels |
| `shortcuts` | `boolean` | `true` | Single-key shortcuts |
| `startMinimized` | `boolean` | `false` | Start collapsed |
| `drawWhenMinimized` | `boolean` | `false` | Keep the canvas live while the bar is a disc |

**Ref handle**

| Method | Type | Description |
|--------|------|-------------|
| `toSvg` | `() => string` | Exactly what's on screen, erasing and all |
| `toPng` | `(scale?) => Promise<Blob>` | `scale` multiplies the resolution |
| `download` | `(name?, format?, scale?) => Promise<void>` | Save straight to a file |
| `getStrokes` | `() => Stroke[]` | |
| `setStrokes` | `(strokes) => void` | Replaces the drawing, and its undo history |
| `undo` / `redo` / `clear` | `() => void` | |
| `getSize` | `() => Board` | The size the drawing is being made at |

## Making it yours

It's opinionated on purpose: the defaults are meant to be the version you ship. Everything here is turning things off or moving them around, not rebuilding it. If you'd rather assemble a drawing tool from parts, [tldraw](https://tldraw.dev) or [Excalidraw](https://excalidraw.com) will suit you better.

Pick the tools and their order, and switch off what you don't want:

```tsx
<Draw
  tools={['pencil', 'marker', 'highlighter']}
  controls={{ undo: false, clear: false }}
/>
```

Set `background` to `transparent` and it paints nothing, so whatever is behind becomes the canvas:

```tsx
<div className="your-paper">
  <Draw background="transparent" />
</div>
```

The bar is as wide as what's in it, and a phone has more height than width. On a small screen, stand it up and drop a few tools:

```tsx
<Draw
  placement={narrow ? 'left' : 'bottom'}
  tools={narrow ? ['pencil', 'pen', 'marker', 'highlighter', 'brush'] : undefined}
  controls={narrow ? { undo: false, clear: false, opacity: false, custom: false } : undefined}
/>
```

## Getting the drawing out

```tsx
const draw = useRef<DrawHandle>(null)

<Draw ref={draw} />

await draw.current.download('sketch', 'png', 2)
```

Strokes are plain data: store what `onChange` gives you and hand it back as `initialStrokes`.

## Pieces

`chrome={false}` leaves you the surface with no toolbar. `DrawSurface`, `Toolbar` and `useDrawing` are exported separately if you'd rather lay them out yourself, and `strokePath` draws a stroke anywhere you can put an SVG path. The logo above is one.

## Keyboard

Every pen has a single-key shortcut, shown in its tooltip. `E` for the eraser, `[` and `]` for size, `⌘Z` and `⇧⌘Z` for undo and redo. Hold `Shift` while drawing to lock the stroke to the nearest of eight directions.

## License

© 2026 Benji Taylor

Licensed under MIT
