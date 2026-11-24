# Tests and the success criteria

`vp test --run` runs the unit tests (`src/**/*.test.ts`, Node) and the browser tests (`tests/**`,
Chromium). `pnpm bench` runs the benchmarks on a generated 1M-row, 8-column file of about 106 MB. Each
success criterion in the spec is shown by the tests or measurements below.

| # | Criterion | Shown by |
|---|---|---|
| 1 | Drop to visible rows ≤ 5 s with progress, reopen ≤ 6 s | `pnpm bench`: `importToRowsMs`, `reopenToRowsMs`. Progress: `tests/e2e/import-errors` "progress shows, and reading can be cancelled" |
| 2 | Filter, search, sort and group ≤ 500 ms p95 | `pnpm bench`: query and grouping p95 |
| 3 | No main-thread task > 100 ms while importing or querying, > 50 ms while scrolling; every row reachable | `pnpm bench` `longestTaskMs`; `BENCH_KIND=grid pnpm bench` scroll frames and tasks; `tests/e2e/grid` "every row can be reached, the last one included" |
| 4 | Warn over 100 MB, refuse over 250 MB | `tests/e2e/import-errors` "a large file is asked about…", "…read when asked to", "a file past the limit is turned away" |
| 5 | Start-screen JS within 10% of the old `/setup` (187,543 B gzipped) | Measured on the static build: the Chromium requests of `/`, each gzipped at level 9 |
| 6 | Unfiltered export reproduces every value | `src/lib/engine/export.test.ts` "CSV" round trips of `tricky.csv`, `duplicate-headers.csv`, `semicolons.csv` and `sample.csv` |
| 7 | The sample's types are inferred | `tests/e2e/cells` "the sample renders each inferred type through its renderer"; `tests/worker/engine` |
| 8 | Reload keeps everything, datasets coexist, deleting removes bytes | `tests/storage/datasets` (first three tests); `tests/e2e/views` "views survive a reload…" |
| 9 | Full or blocked storage still opens, and says so | `tests/storage/datasets` "full storage…", "blocked storage…" |
| 10 | Each bad input has its own message | `tests/e2e/import-errors` (the table of inputs, broken JSON, ragged rows, too large); `src/lib/import/xlsx.test.ts` for workbooks |
| 11 | No request to another origin | `tests/e2e/network` "importing and exploring a file asks nothing of any other origin" |
| 12 | Every user story by keyboard alone | `tests/e2e/keyboard` "story 1" to "story 7" |

## Last results (2026-11-24, Chromium, maintainer's Mac)

| Measure | Result | Limit |
|---|---|---|
| Import to first rows | 1.8 s | 5 s |
| Reopen from storage to rows | 1.8 s | 6 s |
| Query p95 (search, filter, sort) | ≤ 162 ms | 500 ms |
| Grouping p95 (1, 2 and high-cardinality keys) | 7 / 19 / 139 ms | 500 ms |
| Longest main-thread task, import and query | 0 ms | 100 ms |
| Scrolling down, sideways and diagonally | frame p95 17 ms, longest task 0 ms | 50 ms |
| Start-screen JS, gzipped | 173,946 B (5 files) | 206,297 B |

Colour contrast was checked against WCAG AA: body text, muted text and error text are at least 4.5:1
on the background, cards and popovers.
