/// <reference lib="webworker" />
import { runQuery } from '@/lib/engine/query'
import type { QueryResult } from '@/lib/engine/query'
import { createScheduler, PRIORITY } from '@/lib/engine/scheduler'
import { createDataset } from '@/lib/engine/store'
import type { Dataset } from '@/lib/engine/store'
import { openBlob } from '@/lib/import/open'
import { inferColumnTypes } from '@/lib/types/infer'
import type { CallName, EngineCalls, EngineError, EngineMessage, EngineRequest } from './protocol'

let dataset: Dataset | null = null
let current: (QueryResult & { id: number }) | null = null

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

const crashed = (error: unknown): EngineError => ({
	code: 'crashed',
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
				fail(id, crashed(error))
			}
		},
		...(replaceable ? { superseded: () => superseded(id) } : {}),
	})

type Request<K extends CallName> = Extract<EngineRequest, { type: K }>

const open = async ({ id, blob, options, setup }: Request<'open'>) => {
	dataset = null
	current = null

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

self.onmessage = ({ data }: MessageEvent<EngineRequest>) => {
	const { id } = data

	switch (data.type) {
		case 'open':
			open(data).catch((error: unknown) => fail(id, crashed(error)))
			return

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

		case 'setColumns':
			schedule<'setColumns'>(id, { priority: PRIORITY.query, replaceable: false }, dataset => {
				dataset.setColumns(data.setup)
				return dataset.info()
			})
	}
}
