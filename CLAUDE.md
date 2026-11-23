# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Undata is a client-side, read-only data explorer. A file (delimited text, JSON or NDJSON) is opened by
picker, drop, paste or the sample, parsed and queried in a Web Worker, shown in a virtualised grid,
and exported as CSV or JSON. Datasets, column setup and the current view are saved in IndexedDB. It
runs on TanStack Start in SPA mode, Vite+ (`vp`) and Tailwind CSS v4, with shadcn/ui (Radix)
components. There is no backend, and nothing is sent anywhere.

## Commands

Package manager is **pnpm**, driven through Vite+ (`vp`).

- `vp dev`: dev server
- `vp build`: production build. Output is `dist/client` (the SPA shell is `_shell.html`, there is no `index.html`) plus `dist/server`, which a static deploy does not use
- `vp check`: format check, Oxlint and typecheck. This is the pre-commit gate
- `vp fmt`: Oxfmt (writes). `vp lint`: Oxlint
- `vp test --run`: Vitest, with a `unit` project (node, `src/**/*.test.ts`) and a `browser` project (Playwright Chromium, `tests/**/*.browser.test.tsx`). Run `pnpm exec playwright install chromium --only-shell` once per machine
- `pnpm bench`: builds `vite.bench.config.ts` and runs import, sort, filter, stats and scrolling benchmarks on a generated 1M-row file. Not part of `vp test`
- `vp preview` does real SSR and is not a stand-in for static hosting. To check production behaviour, serve `dist/client` with a static server that falls back to `/_shell.html`

Style (set in `vite.config.ts`): tabs at width 3, 100-column lines, single quotes (double in JSX), no semicolons, ES5 trailing commas, arrow parens only when needed. `@/*` resolves to `src/*`.

## Architecture

**Rows never leave the worker.** `src/workers/engine.worker.ts` holds the dataset. `src/workers/client.ts` is its typed client, and `src/workers/protocol.ts` lists every call (`open`, `query`, `rows`, `stats`, `setColumns`, `export`). Only the newest `query` runs, and older ones fail as `superseded`. A regex query that runs over 10 s restarts the worker without it.

**The engine is pure** (`src/lib/engine`): column store, sort, filter, stats and export, all unit-tested in Node. Import (`src/lib/import`) detects the format and parses to a `RawTable` of exact source text. Types (`src/lib/types`) parse, format and infer, and never throw. A type is only a reading of the text: nothing converts or rewrites a cell. `src/lib/**` imports no React and no browser globals, except `src/lib/storage`.

**UI state is one Zustand store**, `useWorkspace` in `src/store/workspace.ts`: the import phase, dataset metadata, the `ViewState` (search, filters, sort, column order, width and hidden), and UI flags. It never holds rows. `src/store/session.ts` owns the engine client and is how the UI changes anything: `importDataset`, `applyView` (re-queries), `arrangeView` (order and widths, no re-query), `applyColumns` (titles and types), and `exportDataset`. Each saves to IndexedDB, and a full or blocked store marks the dataset "Not saved" instead of failing.

**Never build a collection inside a selector.** Zustand 5 loops forever on a selector that returns a new array each call. Select the stored value, then derive with `useMemo`.

**Routes:** `/` is the start screen with recents. `/d/$datasetId` is the workspace, and its `beforeLoad` reopens a saved dataset from IndexedDB or redirects to `/`. `src/routes/$.tsx` sends every unknown path to `/`. Guards must not go on the root route, because that is the only route whose `beforeLoad` runs during the shell prerender.

**SPA shell prerender:** `vp build` renders the root shell outside a browser. Nothing at module scope may touch `window`, `navigator`, `indexedDB` or `Worker`.

**Grid** (`src/components/grid`): `DataGrid` windows rows and columns, with scaled scrolling past browsers' maximum element height (`scaledScroll.ts`). `Cell` parses each value for its column type before handing it to a renderer in `renderers/`, and shows values that do not fit as written with a labelled marker. JSON opens in `JsonTree`. Headers sort, drag and resize, and `ColumnMenu` holds the rest. The body is one tab stop, using `aria-activedescendant` (`useGridKeyboard.ts`, `navigation.ts`).

**Cell types:** the list is `DATA_TYPES` in `src/lib/constants.ts`, and `DataType` derives from it. Adding one means a parser in `src/lib/types/parse.ts` and a case in `components/grid/Cell.tsx`.

## UI

Dark only, with a yellow primary. Tokens are in `src/styles.css`. Use the shadcn primitives in `src/components/ui` (owned and editable) merged with `cn()`, not raw Radix. Icons are Tabler. The command palette is hand-built as a combobox and listbox, so there is no `cmdk`. A dialog opened without its own Trigger uses `useReturnFocus` so that focus goes back on close.

When adding a shadcn component, replace `lucide-react` icons with Tabler, drop `"use client"`, then run `vp fmt`.

## Tests

Browser tests in `tests/e2e` mount the real route tree on `document` with a memory history, through `tests/e2e/app.tsx` (`mount`, `openFile`, and `useApp`, which fails a test on any console error or warning). Storage tests are in `tests/storage`, and the real worker is tested in `tests/worker`. Drags are driven with explicit pointer events. Radix menus give focus back a moment after closing, so wait for that focus before sending more keys.
