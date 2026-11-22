/// <reference lib="webworker" />
import { parseJson, parseNdjson } from '@/lib/import/json'

// Named bench.worker so the runner finds it and reads its heap while the table is still held.
type Job = { file: File; kind: 'json' | 'ndjson' }

self.onmessage = async ({ data: { file, kind } }: MessageEvent<Job>) => {
	const readStart = performance.now()
	const text = await file.text()
	const readMs = Math.round(performance.now() - readStart)

	const parseStart = performance.now()
	const result = kind === 'json' ? parseJson(text) : parseNdjson(text)
	const parseMs = Math.round(performance.now() - parseStart)

	;(self as unknown as { __table: unknown }).__table = result
	postMessage({
		ok: result.ok,
		rows: result.ok ? result.table.rowCount : 0,
		columns: result.ok ? result.table.columns.length : 0,
		readMs,
		parseMs,
	})
}
