import { defaultView } from '@/lib/engine/view'
import { createEngineClient } from '@/workers/client'
import { makeFixture, makeJsonFixture } from './fixture'

type Longtask = { duration: number }

const params = new URLSearchParams(location.search)
const rows = Number(params.get('rows') ?? 1_000_000)
const kind = params.get('kind') ?? 'csv'

const run = async () => {
	const file =
		kind === 'json' || kind === 'ndjson' ? makeJsonFixture(rows, kind) : makeFixture(rows)

	// Building the file is one long task. Yielding ends it, so only the engine's effect is observed.
	await new Promise(resolve => setTimeout(resolve, 50))

	const longTasks: Longtask[] = []
	new PerformanceObserver(list => longTasks.push(...list.getEntries())).observe({
		type: 'longtask',
		buffered: false,
	})

	// Never terminated: the runner reads this worker's heap before it closes the browser.
	const client = createEngineClient()
	Object.assign(window, { __client: client })
	const since = (start: number) => Math.round(performance.now() - start)
	const timed = async (fn: () => Promise<unknown>) => {
		const start = performance.now()
		await fn()
		return since(start)
	}

	const start = performance.now()
	const opened = await client.open(file)
	const ids = opened.columns.map(column => column.id)
	const view = defaultView(ids)
	const { queryId } = await client.query(view)
	await client.rows(queryId, 0, 50, ids)
	const importToRowsMs = since(start)

	const lastRowMs = await timed(() => client.rows(queryId, rows - 1, rows, ids))
	const [last] = await client.rows(queryId, rows - 1, rows, ids)

	return {
		kind,
		fileMB: Math.round(file.size / 1e6),
		rows: opened.rowCount,
		types: opened.columns.map(column => column.type).join(' '),
		lastRowOk: last?.text[0] === String(rows - 1),
		importToRowsMs,
		lastRowMs,
		longestMainThreadMs: Math.round(Math.max(0, ...longTasks.map(task => task.duration))),
	}
}

const publish = (result: unknown) => Object.assign(window, { __bench: result })

run().then(
	result => {
		publish(result)
		document.getElementById('out')!.textContent = JSON.stringify(result, null, 2)
	},
	(error: unknown) =>
		publish({ error: error instanceof Error ? error.message : JSON.stringify(error) })
)
