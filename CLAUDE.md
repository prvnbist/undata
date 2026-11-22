# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Undata is a client-side SPA for loading a CSV, viewing it in a paginated table, configuring columns (reorder, rename, show/hide, cell type), and exporting to JSON/CSV. It runs on TanStack Start in SPA mode, Vite+ (`vp`) and Tailwind CSS v4, with shadcn/ui (Radix) components. Tables use TanStack Table 9, drag-and-drop uses dnd-kit, and JSON cells use Monaco. There is no backend and no persistence.

## Commands

Package manager is **pnpm**, driven through Vite+ (`vp`).

- `vp dev`: dev server
- `vp build`: production build. Output is `dist/client` (the SPA shell is `_shell.html`, there is no `index.html`) plus `dist/server`, which a static deploy does not use
- `vp check`: format check, Oxlint and typecheck. This is the pre-commit gate
- `vp fmt`: Oxfmt (writes). `vp lint`: Oxlint
- `vp test --run`: Vitest, with a `unit` project (node, `src/**/*.test.ts`) and a `browser` project (Playwright Chromium, `tests/**/*.browser.test.tsx`). Run `pnpm exec playwright install chromium --only-shell` once per machine
- `vp preview` does real SSR and is not a stand-in for static hosting. To check production behaviour, serve `dist/client` with a static server that falls back to `/_shell.html`

Style (set in `vite.config.ts`): tabs at width 3, 100-column lines, single quotes (double in JSX), no semicolons, ES5 trailing commas, arrow parens only when needed. `@/*` resolves to `src/*`.

## Architecture

**State lives in one in-memory Zustand store**, `useProject` in `src/store/project.ts`. It holds `metadata.source`, `columns` (a `Map<key, Column>` whose insertion order is the display order), and `rows` (raw parsed records keyed by the original CSV header). Nothing is persisted, so a reload loses the project.

**Never build a collection inside a selector.** Zustand 5 loops forever on a selector that returns a new array each call. Select the stored value (`state => state.columns`), then derive the array with `useMemo`.

**Routing guard:** `beforeLoad` on `src/routes/index.tsx` redirects to `/setup` when `metadata.source` is unset, and `src/routes/$.tsx` redirects every unknown path to `/`. The guard must not go on the root route, because that is the only route whose `beforeLoad` runs during the shell prerender.

**SPA shell prerender:** `vp build` renders the root shell outside a browser. Nothing at module scope may touch `window` or `navigator`, and Monaco is loaded with `React.lazy` only when its popover opens. The settings and export sheet contents are lazy too.

**Data flow:**
1. `/setup` parses the uploaded CSV with `csv2json` (CSV-injection protection on). `extractColumns` builds columns from the first row's keys (all `text`). `initProject` stores both, then the app navigates to `/`.
2. `/` renders `ResultsTable`, which builds TanStack Table column defs from the visible columns and picks a cell renderer by `data_type` in `components/results/cell-renderers`.
3. Column settings (`components/settings`) live in a Sheet. Reordering rebuilds the `Map` and calls `setColumns`. A column dialog edits title, type and hidden. Edits never touch `rows`.
4. Export (`components/export`) uses `processDataForExport` (drops hidden columns, optionally swaps keys for titles) and `serialize` (JSON or CSV) from `src/lib/export.ts`.

**Cell types:** the selectable types and their date/time formats are in `src/lib/constants.ts`. Adding one means updating the constants and `cell-renderers/index.tsx`; the `Column['data_type']` union derives from `DATA_TYPES`.

**Pure logic** lives in `src/lib` with no React imports, and is unit-tested.

## UI

Dark only, with a yellow primary. Tokens are in `src/styles.css`. Use the shadcn primitives in `src/components/ui` (owned and editable) merged with `cn()`, not raw Radix. Icons are Tabler. The searchable type select is `ui/combobox.tsx`, built on Popover, so there is no `cmdk`.

When adding a shadcn component, replace `lucide-react` icons with Tabler, drop `"use client"`, then run `vp fmt`.

## Tests

`tests/e2e/smoke.browser.test.tsx` mounts the real route tree on `document` with a memory history. Dnd-kit drags are driven with explicit pointer events. Lazy dependencies that Vite would otherwise re-optimise mid-run are listed in `optimizeDeps.include` in `vite.config.ts`.
