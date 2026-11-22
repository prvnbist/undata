import type { ColumnSetup, ViewState } from '@/lib/engine/view'
import type { ImportOptions } from '@/lib/import/types'
import type {
	CallName,
	EngineCalls,
	EngineError,
	EngineErrorCode,
	EngineMessage,
	Progress,
} from './protocol'

type Pending = {
	resolve: (value: never) => void
	reject: (error: EngineError) => void
	onProgress?: ((progress: Progress) => void) | undefined
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

// Nothing here runs at module scope: the SPA shell is prerendered where there is no `Worker`.
export const createEngineClient = () => {
	const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
	const pending = new Map<number, Pending>()
	let nextId = 1

	const failAll = (error: EngineError) => {
		const entries = [...pending.values()]
		pending.clear()
		for (const entry of entries) entry.reject(error)
	}

	worker.onmessage = ({ data }: MessageEvent<EngineMessage>) => {
		const entry = pending.get(data.id)
		if (!entry) return

		if (data.kind === 'progress') return entry.onProgress?.(data.progress)
		if (data.kind === 'started') return

		pending.delete(data.id)
		if (data.kind === 'done') entry.resolve(data.value as never)
		else entry.reject(data.error)
	}

	worker.onerror = event => {
		event.preventDefault()
		failAll({ code: 'crashed', message: event.message || 'The engine stopped working' })
	}

	const call = <K extends CallName>(
		type: K,
		request: EngineCalls[K]['request'],
		onProgress?: (progress: Progress) => void
	) =>
		new Promise<EngineCalls[K]['response']>((resolve, reject) => {
			const id = nextId++
			pending.set(id, { resolve, reject, onProgress })
			worker.postMessage({ ...request, type, id })
		})

	return {
		open: (blob: Blob, { options = null, setup = null, onProgress }: OpenOptions = {}) =>
			call('open', { blob, options, setup }, onProgress),
		query: (view: ViewState) => call('query', { view }),
		rows: (queryId: number, start: number, end: number, columnIds: string[]) =>
			call('rows', { queryId, start, end, columnIds }),
		setColumns: (setup: ColumnSetup[]) => call('setColumns', { setup }),
		// Also how an import is cancelled: whatever is waiting fails as superseded.
		terminate: () => {
			worker.terminate()
			failAll({ code: 'superseded', message: 'Cancelled' })
		},
	}
}

export type EngineClient = ReturnType<typeof createEngineClient>
