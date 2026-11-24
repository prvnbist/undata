# Undata

Open a data file and understand it. Undata is a local, read-only data explorer that runs entirely in
your browser: nothing is uploaded, and nothing in the file is changed.

Built with TanStack Start (SPA mode), Vite+, Tailwind CSS v4 and shadcn/ui (Radix). Files are parsed
and queried in a Web Worker, and the grid is virtualised, so a file of a million rows stays smooth.

## Features

- **Open anything, any way:** CSV, TSV and other delimited text, JSON, NDJSON and Excel workbooks
  (`.xlsx`, choosing the sheet when there are several), by picking a file,
  dropping it anywhere, pasting text or spreadsheet cells, or trying the sample data. The format,
  delimiter and encoding are detected, and every problem is reported instead of hidden.
- **Exact values:** cells keep their source text. Big ids, leading zeros, dotted or repeated headers
  and quoted newlines are never rewritten.
- **Typed columns:** number, boolean, date, time, timestamp (with or without a zone), link, tag, JSON
  and image are inferred or chosen. A value that does not fit its type is shown as written, with a
  marker.
- **A grid for every row:** a virtualised grid with sticky headers, keyboard navigation and copy.
- **Columns where they are:** click a header to sort, Shift-click to add a sort key, and use its menu
  to change the type, rename, hide or move it. Drag headers to reorder and their edges to resize. The
  Columns popover finds and shows or hides columns in bulk.
- **Search and filters:** search every visible column, build filters per column, or filter from a
  cell's value. Matching runs in the worker, so typing stays smooth.
- **Column profiles:** each header shows a small chart of its values, and the column panel gives the
  type, counts of distinct, empty and invalid values, the range and mean, and the most common values.
- **Row inspector:** read one record with every field, step to the next and previous rows, and open
  JSON as a tree.
- **Group and summarise:** group by one or more columns with counts, sums, means, minimums and
  maximums, sort the groups, open one to see its rows, and copy or export the summary.
- **Saved views:** keep a search, filters, sort, grouping and column arrangement under a name, and
  switch between views of the same dataset.
- **Saved locally:** datasets, column setup and the current view are kept in IndexedDB, so a reload
  or a recent dataset reopens where you left it.
- **Export:** CSV or JSON of the current view or of every row, with titles or the file's headers, and
  optional formula escaping for spreadsheets.
- **Command palette:** Ctrl+K or ⌘K to open, export, sort, hide and go to any column.

## Development

```sh
vp install
pnpm exec playwright install chromium --only-shell   # once, for the browser tests
vp dev          # dev server
vp check        # format check, lint, typecheck
vp test --run   # unit and browser tests
pnpm bench      # import, query and scrolling benchmarks on a generated 1M-row file
vp build        # static output in dist/client (serve with a fallback to /_shell.html)
```
