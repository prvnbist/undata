# Undata

An application to understand, format and export your data. Built with TanStack Start (SPA mode), Vite+, Tailwind CSS v4, shadcn/ui, TanStack Table, Dnd-Kit and Monaco Editor.

| | |
|---|---|
|![Data Table](https://res.cloudinary.com/prvnbist/image/upload/v1727274413/undata/Screenshot_2024-09-25_at_7.55.49_PM.jpg)|![Column Settings](https://res.cloudinary.com/prvnbist/image/upload/v1727274556/undata/Screenshot_2024-09-25_at_7.59.09_PM.jpg)|
|Data Table|Column Settings|
|![Export](https://res.cloudinary.com/prvnbist/image/upload/v1727274673/undata/Screenshot_2024-09-25_at_8.01.06_PM.jpg)|   |
|Export Data|   |

## Features
- Columns Settings
   - Reorder
   - Custom Cell Type
   - Show/Hide
   - Rename
- Export
   - JSON
   - CSV
- Cell Formatting
   - Number
   - Boolean
   - Tags
   - Time
   - Date
   - Image
   - Link
   - JSON

## Development

```sh
vp install
pnpm exec playwright install chromium --only-shell   # once, for the browser tests
vp dev          # dev server
vp check        # format check, lint, typecheck
vp test --run   # unit and browser tests
vp build        # static output in dist/client (serve with a fallback to /_shell.html)
```
