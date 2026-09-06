# Validation

Use Node 24 or newer and the pnpm version recorded in the root `packageManager` field.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm check
```

- `pnpm typecheck` checks both packages and studios.
- `pnpm build` builds both packages and production studios.
- `pnpm test` verifies that the Svelte engine, palette, and shared styles stay identical to the React source, allowing only ESM import extensions.
- `pnpm test:package` runs publint, packs `draw-svelte`, installs the tarball in a temporary external consumer, checks the public component/handle/snippet types, and builds both client and SSR entries. It uses npm to resolve the consumer's dependencies and removes the temporary project afterward.
- `pnpm test:e2e` builds production fixtures against the built packages, then tests Chromium, Firefox, and WebKit. It also generates real server markup for the hydration fixture.

The browser suite compares React and Svelte screenshots directly in the same browser, without checked-in platform-specific baselines. It covers all three placements, light/dark/auto themes, tool looks, depth/alignment, custom tool subsets, backgrounds, stroke/SVG parity for every pen and the eraser, PNG/downloads, undo/redo and transactions, controls, keyboard shortcuts, custom ink, tooltips, tool menus, pressure/palm rejection, constrained lines, dragging, collapse, enter/exit timing and keyframes, reduced motion, mobile accessibility, and multi-instance SSR/hydration. Reports retain comparison images and failure traces.

CI runs the same commands on Linux. On macOS 27, Playwright Firefox may exit before loading a page with `Could not find profile folder`; Mozilla tracks this direct-launch problem in [bug 2060476](https://bugzilla.mozilla.org/show_bug.cgi?id=2060476). Chromium and WebKit can still be run locally with `pnpm test:e2e --project=chromium --project=webkit`; keep Firefox enabled in CI.

The root and Svelte projects use TypeScript 6.0.3 because the latest Svelte checker supports TypeScript 5/6, and `svelte-package` needs the compiler's JavaScript API. React projects use TypeScript 7. Other direct dependencies use current stable releases.
