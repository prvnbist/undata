# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Migration in progress

On branch `chore/stack-migration`, the app is moving to Vite+ (`vp`), TanStack Start (SPA mode) and Tailwind CSS v4. See `SPEC.md`, `tasks/plan.md` and `tasks/todo.md`.

- **New code:** `src/` (routes in `src/routes/`). `SPEC.md` has the commands, structure and code style.
- **Old code:** `legacy/src/` (Next.js/Mantine), kept only as a porting reference and not built, linted or formatted.

On this branch, the sections below describe the old app. T11 rewrites them.

## Overview

Undata is a client-side Next.js 14 (App Router) app for loading a CSV, viewing it in a paginated table, configuring columns (reorder, rename, show/hide, cell type), and exporting to JSON/CSV. UI is Mantine v7; tables use TanStack React Table; drag-and-drop uses dnd-kit; JSON cells use Monaco. There is no backend, persistence, or test suite.

## Commands

Package manager is **pnpm**.

- `pnpm dev`: dev server (Turbopack)
- `pnpm build`: production build, which also type-checks
- `pnpm lint`: Biome lint over `src`
- `pnpm format`: Biome format (writes)
- `pnpm precommit`: format, then lint

Biome is the only linter/formatter (no ESLint/Prettier). Its style: tabs at width 3, 100-column lines, single quotes, no semicolons, ES5 trailing commas, arrow parens only when needed. Imports resolve `@/*` to `src/*`.

## Architecture

**State lives in one in-memory Zustand store**, `useProject` in `src/providers/project.tsx`. It holds `metadata.source`, `columns` (a `Map<key, Column>` whose insertion order is the display order), and `rows` (raw parsed records keyed by the original CSV header). Nothing is persisted, so a page reload loses the project.

**Routing guard:** `ProjectProvider`, mounted in the root layout, redirects to `/setup` whenever `metadata.source` is unset. So `/` only renders after a project has been initialized.

**Data flow:**
1. `/setup` (`src/app/setup`) parses the uploaded CSV with `json-2-csv`'s `csv2json`. `extractColumns` (`src/utils`) builds columns from the first row's keys (all default to `text`). `initProject` stores both, then the app navigates to `/`.
2. `/` renders `Output` → `Results`, which builds React Table column defs from the visible columns and delegates cell rendering by `data_type` to `cellRenderer.tsx`.
3. Column settings (`src/components/settings/ColumnsSettings`) open in a Mantine modal. Reordering rebuilds the `Map` in the new order and calls `setColumns`. Edits never touch `rows`; renaming only changes `column.title`.
4. Export (`src/components/export`) uses `processDataForExport`, which drops hidden columns and optionally swaps keys for titles, then serializes to JSON or CSV.

**Cell types:** the selectable types and their date/time format strings live in `src/constants/index.ts` (`DATA_TYPES`, `*_DATA_TYPES`, `DATE_TYPES_FORMAT`, `TIME_TYPES_FORMAT`). Membership checks like `type in NUMERIC_DATA_TYPES` drive both renderer selection and right-alignment of headers. Adding a cell type means updating the constants, `cellRenderer.tsx`, and the `Column['data_type']` union in `project.tsx`. That union currently lags behind `DATA_TYPES`: it is missing the date, time and JSON types.

The app is dark mode by default (`defaultColorScheme="dark"` in `layout.tsx`). The Mantine theme is in `src/theme.ts`.
