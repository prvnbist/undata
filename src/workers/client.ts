import type { ExportOptions } from '@/lib/engine/export'
import type { ColumnSetup, Filter, ViewState } from '@/lib/engine/view'
import type { ImportOptions } from '@/lib/import/types'
import type {
	CallName,
	EngineCalls,
	EngineError,
	EngineErrorCode,
	EngineMessage,
	Progress,
	Queried,
} from './protocol'

type Pending = {
	resolve: (value: never) => void
	reject: (error: EngineError) => void
	onProgress?: ((progress: Progress) => void) | undefined
	onStarted?: (() => void) | undefined
}

export type OpenOptions = {
	options?: ImportOptions | null
	setup?: ColumnSetup[] | null
	onProgress?: (progress: Progress) => void
}

export const isEngineError = (error: unknown, code?: EngineErrorCode): error is EngineError =>
	typeof error === 'object' &&
	error !== null &&
	'code' in error &&
	(code === undefined || error.code === code)

const toSetup = ({ id, title, type }: ColumnSetup): ColumnSetup => ({ id, title, type })

export type EngineClientOptions = {
	// How long a query with a regular expression may run before it is given up on.
	regexTimeoutMs?: number
}

// Nothing here runs at module scope: the SPA shell is prerendered where there is no `Worker`.
export const createEngineClient = ({ regexTimeoutMs = 10_000 }: EngineClientOptions = {}) => {
	let worker = spawn()
	// What is open, so that a worker that had to be stopped can be replaced by one in the same state.
	let source: { blob: Blob; options: ImportOptions; setup: ColumnSetup[] } | null = null
	const pending = new Map<number, Pending>()
	let nextId = 1

	const failAll = (error: EngineError) => {
		const entries = [...pending.values()]
		pending.clear()
		for (const entry of entries) entry.reject(error)
	}

	function spawn() {
		const created = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })

		created.onmessage = ({ data }: MessageEvent<EngineMessage>) => {
			const entry = pending.get(data.id)
			if (!entry) return

			if (data.kind === 'progress') return entry.onProgress?.(data.progress)
			if (data.kind === 'started') return entry.onStarted?.()

			pending.delete(data.id)
			if (data.kind === 'done') entry.resolve(data.value as never)
			else entry.reject(data.error)
		}

		created.onerror = event => {
			event.preventDefault()
			failAll({ code: 'crashed', message: event.message || 'The engine stopped working' })
		}

		return created
	}

	const call = <K extends CallName>(
		type: K,
		request: EngineCalls[K]['request'],
		hooks: Pick<Pending, 'onProgress' | 'onStarted'> = {}
	) =>
		new Promise<EngineCalls[K]['response']>((resolve, reject) => {
			const id = nextId++
			pending.set(id, { resolve, reject, ...hooks })
			worker.postMessage({ ...request, type, id })
		})

	// A worker that is busy cannot be interrupted, only replaced.
	const restart = () => {
		worker.terminate()
		failAll({ code: 'superseded', message: 'The engine was restarted' })
		worker = spawn()
		if (source) call('open', source).catch(() => {})
	}

	// A pattern can take practically forever on the wrong text, so it is given a limit, and then the
	// view runs without any patterns. `dropped` says which ones.
	const query = async (view: ViewState): Promise<Queried & { dropped: Filter[] }> => {
		const patterns = view.filters.filter(filter => filter.op === 'regex')
		if (patterns.length === 0) return { ...(await call('query', { view })), dropped: [] }

		let timer: ReturnType<typeof setTimeout> | undefined
		let timedOut = false
		try {
			const queried = await call(
				'query',
				{ view },
				{
					onStarted: () => {
						timer = setTimeout(() => {
							timedOut = true
							restart()
						}, regexTimeoutMs)
					},
				}
			)
			return { ...queried, dropped: [] }
		} catch (error) {
			if (!timedOut) throw error
			const filters = view.filters.filter(filter => filter.op !== 'regex')
			return { ...(await call('query', { view: { ...view, filters } })), dropped: patterns }
		} finally {
			clearTimeout(timer)
		}
	}

	return {
		async open(blob: Blob, { options = null, setup = null, onProgress }: OpenOptions = {}) {
			source = null
			const opened = await call('open', { blob, options, setup }, { onProgress })
			source = { blob, options: opened.options, setup: opened.columns.map(toSetup) }
			return opened
		},
		query,
		rows: (queryId: number, start: number, end: number, columnIds: string[]) =>
			call('rows', { queryId, start, end, columnIds }),
		stats: (queryId: number, columnId: string) => call('stats', { queryId, columnId }),
		export: (queryId: number, options: ExportOptions) => call('export', { queryId, options }),
		async setColumns(setup: ColumnSetup[]) {
			const columns = await call('setColumns', { setup })
			if (source) source.setup = columns.map(toSetup)
			return columns
		},
		// Also how an import is cancelled: whatever is waiting fails as superseded.
		terminate: () => {
			worker.terminate()
			failAll({ code: 'superseded', message: 'Cancelled' })
		},
	}
}

export type EngineClient = ReturnType<typeof createEngineClient>
