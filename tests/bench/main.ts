import { defaultView } from '@/lib/engine/view'
import type { Grouping, ViewState } from '@/lib/engine/view'
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

	const freshStatsPerColumnMs: Record<string, number> = {}
	const freshStatsMs = await timed(async () => {
		for (const column of opened.columns) {
			freshStatsPerColumnMs[column.header] = await timed(() => client.stats(queryId, column.id))
		}
	})

	// The round trip the user waits for: run the view, then fetch the first screen of it.
	const REPEATS = 20
	const measure = async (changes: Partial<ViewState>) => {
		const times: number[] = []
		for (let i = 0; i < REPEATS; i++) {
			times.push(
				await timed(async () => {
					const result = await client.query({ ...view, ...changes })
					await client.rows(result.queryId, 0, 50, ids)
				})
			)
		}
		const [first] = times
		const sorted = times.toSorted((a, b) => a - b)
		return `${sorted[Math.ceil(REPEATS * 0.95) - 1]} (first ${first}, max ${sorted.at(-1)})`
	}

	const cases: Record<string, Partial<ViewState>> = {}
	for (const column of opened.columns) {
		cases[`sort ${column.header}`] = { sort: [{ columnId: column.id, desc: false }] }
	}
	cases['sort city, name'] = {
		sort: [
			{ columnId: 'c2', desc: false },
			{ columnId: 'c1', desc: true },
		],
	}

	Object.assign(cases, {
		'search, one match in the last column': { search: 'TEXT 999' },
		'search, common letters, no match': { search: 'qqq some' },
		'search, digits': { search: '12345' },
		'filter contains': { filters: [{ columnId: 'c7', op: 'contains', value: 'text 99' }] },
		'filter regex': { filters: [{ columnId: 'c6', op: 'regex', value: 'p/\\d+7$' }] },
		'filter any of': { filters: [{ columnId: 'c2', op: 'anyOf', values: ['City1', 'City2'] }] },
		'filter any of, every value distinct': {
			filters: [{ columnId: 'c1', op: 'anyOf', values: ['Person 1', 'Person 999'] }],
		},
		'filter number': { filters: [{ columnId: 'c3', op: 'gt', value: '9000' }] },
		'filter and sort': {
			filters: [{ columnId: 'c3', op: 'gt', value: '5000' }],
			sort: [{ columnId: 'c1', desc: true }],
		},
	} satisfies Record<string, Partial<ViewState>>)

	const p95: Record<string, string> = {}
	for (const [name, changes] of Object.entries(cases)) p95[name] = await measure(changes)

	// Grouping: the query, the groups, and the first screen of the summary.
	const measureGroup = async (grouping: Grouping, repeats = REPEATS) => {
		const times: number[] = []
		for (let i = 0; i < repeats; i++) {
			times.push(
				await timed(async () => {
					const { queryId } = await client.query(view)
					const { groupId } = await client.group(queryId, grouping)
					await client.groupRows(groupId, 0, 50)
				})
			)
		}
		const sorted = times.toSorted((a, b) => a - b)
		return `${sorted[Math.ceil(repeats * 0.95) - 1]} (first ${times[0]}, max ${sorted.at(-1)})`
	}
	const groupP95 = {
		'by city, count': await measureGroup({ by: ['c2'], aggregates: [], sort: [] }),
		'by city and active, sum and avg amount': await measureGroup({
			by: ['c2', 'c4'],
			aggregates: [
				{ columnId: 'c3', fn: 'sum' },
				{ columnId: 'c3', fn: 'avg' },
			],
			sort: [{ key: 'sum:c3', desc: true }],
		}),
		'by id, every row its own group, by count': await measureGroup(
			{ by: ['c0'], aggregates: [], sort: [{ key: 'count', desc: true }] },
			3
		),
	}

	// Every column at once, as the headers will ask, before and after their dictionaries exist.
	const allStats = async () => {
		const { queryId } = await client.query(view)
		await Promise.all(ids.map(columnId => client.stats(queryId, columnId)))
	}
	const statsMs = { afterSorts: await timed(allStats), again: await timed(allStats) }

	// A query that arrives while stats are being worked out.
	const { queryId: busy } = await client.query(view)
	const dropped = ids.map(columnId => client.stats(busy, columnId).catch(() => {}))
	const queryDuringStatsMs = await timed(() => client.query({ ...view, search: 'zz' }))
	await Promise.all(dropped)

	return {
		kind,
		fileMB: Math.round(file.size / 1e6),
		rows: opened.rowCount,
		types: opened.columns.map(column => column.type).join(' '),
		lastRowOk: last?.text[0] === String(rows - 1),
		importToRowsMs,
		lastRowMs,
		p95,
		groupP95,
		freshStatsMs,
		freshStatsPerColumnMs,
		statsMs,
		queryDuringStatsMs,
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
