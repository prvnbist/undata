import { createEngineClient } from '@/workers/client'
import { makeFixture } from './fixture'
import { runJsonBench } from './json-main'

type Longtask = { duration: number }

const params = new URLSearchParams(location.search)
const rows = Number(params.get('rows') ?? 1_000_000)

const kind = params.get('kind')

const run = async () => {
	if (kind === 'json' || kind === 'ndjson') return runJsonBench(rows, kind)

	const file = makeFixture(rows)

	// Building the file is one long task. Yielding ends it, so only the engine's effect is observed.
	await new Promise(resolve => setTimeout(resolve, 50))

	const longTasks: Longtask[] = []
	new PerformanceObserver(list => longTasks.push(...list.getEntries())).observe({
		type: 'longtask',
		buffered: false,
	})

	const client = createEngineClient()
	const start = performance.now()
	const opened = await client.open(file)
	const importMs = Math.round(performance.now() - start)

	const first = performance.now()
	await client.rows(0, 50)
	const firstRowsMs = Math.round(performance.now() - first)
	const last = performance.now()
	const lastRows = await client.rows(rows - 1, rows)
	const lastRowMs = Math.round(performance.now() - last)
	client.terminate()

	const worker = new Worker(new URL('./bench.worker.ts', import.meta.url), { type: 'module' })
	const ops = await new Promise<Record<string, number | null>>(resolve => {
		worker.onmessage = ({ data }) => resolve(data)
		worker.postMessage(file)
	})
	// Kept alive on purpose: the runner measures its heap before closing the browser.

	return {
		fileMB: Math.round(file.size / 1e6),
		rows: opened.rowCount,
		lastRowOk: lastRows[0]?.[0] === String(rows - 1),
		importMs,
		firstRowsMs,
		lastRowMs,
		longestMainThreadMs: Math.round(Math.max(0, ...longTasks.map(task => task.duration))),
		...ops,
	}
}

run().then(
	result => {
		;(window as unknown as { __bench: unknown }).__bench = result
		document.getElementById('out')!.textContent = JSON.stringify(result, null, 2)
	},
	error => {
		;(window as unknown as { __bench: unknown }).__bench = { error: String(error) }
	}
)
