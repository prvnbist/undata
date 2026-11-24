/// <reference lib="webworker" />
import { exportRows } from '@/lib/engine/export'
import { InvalidFilter } from '@/lib/engine/filter'
import { groupRows } from '@/lib/engine/group'
import type { GroupTable } from '@/lib/engine/group'
import { runQuery } from '@/lib/engine/query'
import type { QueryResult } from '@/lib/engine/query'
import { createScheduler, PRIORITY } from '@/lib/engine/scheduler'
import { columnStats } from '@/lib/engine/stats'
import { createDataset } from '@/lib/engine/store'
import type { Dataset } from '@/lib/engine/store'
import { openBlob } from '@/lib/import/open'
import { inferColumnTypes } from '@/lib/types/infer'
import type { CallName, EngineCalls, EngineError, EngineMessage, EngineRequest } from './protocol'

let dataset: Dataset | null = null
let current: (QueryResult & { id: number }) | null = null
let grouped: { id: number; table: GroupTable } | null = null

const send = (message: EngineMessage) => postMessage(message)
const fail = (id: number, error: EngineError) => send({ id, kind: 'failed', error })

// A message task, so messages that are already waiting are handled before the next piece of work.
const channel = new MessageChannel()
let next: (() => void) | null = null
channel.port1.onmessage = () => next?.()
const scheduler = createScheduler(run => {
	next = run
	channel.port2.postMessage(null)
})

const toError = (error: unknown): EngineError => ({
	code: error instanceof InvalidFilter ? 'invalid-filter' : 'crashed',
	message: error instanceof Error ? error.message : String(error),
})

const superseded = (id: number) =>
	fail(id, { code: 'superseded', message: 'Replaced by a newer query' })

type Work = { priority: number; replaceable: boolean }

const schedule = <K extends CallName>(
	id: number,
	{ priority, replaceable }: Work,
	work: (dataset: Dataset) => EngineCalls[K]['response'] | null
) =>
	scheduler.add({
		priority,
		run() {
			if (!dataset) return fail(id, { code: 'no-dataset', message: 'No dataset is open' })
			try {
				send({ id, kind: 'started' })
				const value = work(dataset)
				if (value === null) superseded(id)
				else send({ id, kind: 'done', value })
			} catch (error) {
				fail(id, toError(error))
			}
		},
		...(replaceable ? { superseded: () => superseded(id) } : {}),
	})

type Request<K extends CallName> = Extract<EngineRequest, { type: K }>

const open = async ({ id, blob, options, setup }: Request<'open'>) => {
	dataset = null
	current = null
	grouped = null

	// At most one message per percent, or a big file floods the page.
	let last = -1
	const result = await openBlob(blob, options, progress => {
		const percent = Math.floor(progress.ratio * 100)
		if (percent === last && progress.phase === 'reading') return
		last = percent
		send({ id, kind: 'progress', progress })
	})
	if (!result.ok) return fail(id, result.error)

	send({ id, kind: 'progress', progress: { phase: 'checking', ratio: 1 } })
	const { table } = result
	const inferred = setup ? [] : inferColumnTypes(table)
	const byId = new Map(setup?.map(column => [column.id, column]))

	dataset = createDataset(
		table,
		table.columns.map((column, i) => byId.get(column.id)?.type ?? inferred[i] ?? 'text')
	)
	if (setup) dataset.setColumns(setup)

	send({
		id,
		kind: 'done',
		value: {
			options: result.options,
			columns: dataset.info(),
			rowCount: dataset.rowCount,
			warnings: table.warnings,
		},
	})
}

const handle = (data: Exclude<EngineRequest, { type: 'open' }>) => {
	const { id } = data

	switch (data.type) {
		case 'query':
			scheduler.supersede()
			schedule<'query'>(id, { priority: PRIORITY.query, replaceable: true }, dataset => {
				current = { id, ...runQuery(dataset, data.view) }
				return { queryId: id, rowCount: current.rowCount }
			})
			return

		case 'rows':
			schedule<'rows'>(id, { priority: PRIORITY.rows, replaceable: false }, dataset =>
				current?.id === data.queryId
					? dataset.window(current.order, data.start, data.end, data.columnIds)
					: null
			)
			return

		case 'stats':
			schedule<'stats'>(id, { priority: PRIORITY.stats, replaceable: true }, dataset =>
				current?.id === data.queryId ? columnStats(dataset, current.order, data.columnId) : null
			)
			return

		case 'group':
			schedule<'group'>(id, { priority: PRIORITY.rows, replaceable: true }, dataset => {
				if (current?.id !== data.queryId) return null
				const table = groupRows(dataset, current.order, data.grouping)
				grouped = { id, table }
				return { groupId: id, ...table.summary }
			})
			return

		case 'groupRows':
			schedule<'groupRows'>(id, { priority: PRIORITY.rows, replaceable: false }, () =>
				grouped?.id === data.groupId ? grouped.table.window(data.start, data.end) : null
			)
			return

		case 'setColumns':
			schedule<'setColumns'>(id, { priority: PRIORITY.query, replaceable: false }, dataset => {
				dataset.setColumns(data.setup)
				return dataset.info()
			})
			return

		case 'export':
			schedule<'export'>(id, { priority: PRIORITY.export, replaceable: false }, dataset => {
				if (current?.id !== data.queryId) return null
				const type = data.options.format === 'csv' ? 'text/csv' : 'application/json'
				return new Blob(exportRows(dataset, current.order, data.options), {
					type: `${type};charset=utf-8`,
				})
			})
	}
}

// Requests that arrive while a file is being read wait for it, in order. The client relies on this to
// carry on after a restart.
let opening: Promise<void> | null = null

self.onmessage = ({ data }: MessageEvent<EngineRequest>) => {
	if (data.type === 'open') {
		opening = open(data)
			.catch((error: unknown) => fail(data.id, toError(error)))
			.finally(() => (opening = null))
	} else if (opening) {
		void opening.then(() => handle(data))
	} else {
		handle(data)
	}
}
