/// <reference lib="webworker" />
import Papa from 'papaparse'

import { createColumnStore } from '@/lib/engine/store'

// The runner reads this worker's heap over the DevTools protocol while it is still alive.
// Same import path as the engine worker, then the operations the later tasks will provide, done the
// obvious way. This measures whether the approach is fast enough, not the final implementation.
self.onmessage = ({ data: file }: MessageEvent<File>) => {
	const store = createColumnStore()
	// On the global object so neither GC nor the minifier can drop the table before it is measured.
	;(self as unknown as { __table: unknown }).__table = store

	Papa.parse<string[]>(file, {
		worker: false,
		skipEmptyLines: true,
		chunk: ({ data }) => store.append(data),
		complete: () => {
			const time = <T>(fn: () => T) => {
				const start = performance.now()
				fn()
				return Math.round(performance.now() - start)
			}

			const rows = store.rowCount()
			const amounts = Float64Array.from(store.column(3), Number)
			const names = store.column(1)
			const notes = store.column(7)

			const sortNumber = () => {
				const index = Uint32Array.from({ length: rows }, (_, i) => i)
				index.sort((a, b) => amounts[a]! - amounts[b]!)
			}
			const sortText = () => {
				const index = Uint32Array.from({ length: rows }, (_, i) => i)
				index.sort((a, b) => (names[a]! < names[b]! ? -1 : names[a]! > names[b]! ? 1 : 0))
			}
			const filter = () => {
				const needle = 'text 999'
				const hits: number[] = []
				for (let i = 0; i < rows; i++)
					if (notes[i]!.toLowerCase().includes(needle)) hits.push(i)
			}

			postMessage({
				rows,
				sortNumberMs: time(sortNumber),
				sortTextMs: time(sortText),
				filterMs: time(filter),
			})
		},
	})
}
