# Toolbar regression checks

Use Node 20.19+ and install [Portless](https://github.com/vercel-labs/portless) globally.

```sh
pnpm install
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
```

The suite starts the studio at `http://drawesome.localhost:1355` or reuses it if
already running. The fixture is a separate HTML entry, excluded from the normal
studio production build. Tests cover every placement, open alignment and collapse
direction, clicked and initially collapsed states, interrupted motion, dragging,
live props, CSS insets, resizing, chrome remounting and a mobile dark-mode case.

For manual testing, run `pnpm dev`. Use **Placement**, **Align**, and **Minimize to**
in the studio. **Settings** hides the panel without resetting your choices.
