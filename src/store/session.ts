import { fitColumn } from '@/components/grid/layout'
import { defaultView } from '@/lib/engine/view'
import type { ColumnSetup, ViewState } from '@/lib/engine/view'
import { formatBytes } from '@/lib/bytes'
import type { ImportOptions } from '@/lib/import/types'
import { createEngineClient, isEngineError } from '@/workers/client'
import type { EngineClient } from '@/workers/client'
import type { EngineError } from '@/workers/protocol'
import { initialWorkspace, workspace } from './workspace'

// How many rows a column's first width is worked out from.
const FIT_ROWS = 50

// The engine and the bytes of the open dataset. They are not state: nothing renders from them.
let client: EngineClient | null = null
let source: Blob | null = null

// In powers of ten. A file beyond the first is asked about, and beyond the second is turned away.
export const LARGE_FILE = 100_000_000
export const MAX_FILE = 250_000_000

export type ImportRequest = {
	blob: Blob
	name: string
	// Reading the same dataset again keeps its id.
	id?: string
	options?: ImportOptions | null
	setup?: ColumnSetup[] | null
	view?: ViewState | null
}

const toEngineError = (error: unknown): EngineError =>
	isEngineError(error)
		? error
		: { code: 'crashed', message: error instanceof Error ? error.message : String(error) }

export const engine = () => client

export const closeDataset = () => {
	client?.terminate()
	client = null
	source = null
	waiting = null
	workspace.set(initialWorkspace)
}

// What "open anyway" goes on with.
let waiting: Required<ImportRequest> | null = null

const read = async (request: Required<ImportRequest>) => {
	const { id, blob, name, options, setup, view } = request
	workspace.set({ phase: { kind: 'importing', id, name, progress: null } })

	const own = createEngineClient()
	client = own
	source = blob

	try {
		const opened = await own.open(blob, {
			options,
			setup,
			onProgress: progress =>
				workspace.set({ phase: { kind: 'importing', id, name, progress } }),
		})
		const ids = opened.columns.map(column => column.id)
		const initial = view ?? defaultView(ids)
		const { queryId, rowCount } = await own.query(initial)
		const sample = await own.rows(queryId, 0, FIT_ROWS, ids)
		if (own !== client) return

		workspace.set({
			phase: { kind: 'ready', id, name },
			fitted: Object.fromEntries(
				opened.columns.map((column, i) => [
					column.id,
					fitColumn(
						column,
						sample.map(row => row.text[i]!)
					),
				])
			),
			dataset: { id, name, size: blob.size, ...opened },
			view: initial,
			query: { id: queryId, rowCount },
		})
	} catch (error) {
		// Another import took over, or this one was cancelled.
		if (own !== client) return
		workspace.set({ phase: { kind: 'failed', id, name, error: toEngineError(error) } })
	}
}

// Starts reading, and gives back the id straight away so the caller can go to the workspace, which is
// where progress, questions and failures are shown.
export const importDataset = ({
	blob,
	name,
	id = crypto.randomUUID(),
	options = null,
	setup = null,
	view = null,
}: ImportRequest): { id: string; done: Promise<void> } => {
	closeDataset()
	const request = { blob, name, id, options, setup, view }

	if (blob.size > MAX_FILE) {
		const message = `It is ${formatBytes(blob.size)}, and the most Undata opens is ${formatBytes(MAX_FILE)}.`
		workspace.set({ phase: { kind: 'failed', id, name, error: { code: 'too-large', message } } })
		return { id, done: Promise.resolve() }
	}

	if (blob.size > LARGE_FILE) {
		waiting = request
		workspace.set({ phase: { kind: 'confirming', id, name, size: blob.size } })
		return { id, done: Promise.resolve() }
	}

	return { id, done: read(request) }
}

export const openAnyway = () => {
	const request = waiting
	waiting = null
	return request ? read(request) : Promise.resolve()
}

// Reads the same bytes in another way. The columns it finds are not the ones there were, so what was
// set on those is left behind.
export const reimport = (options: ImportOptions) => {
	const { dataset } = workspace.get()
	if (!dataset || !source) return Promise.resolve()

	const request = { blob: source, name: dataset.name, id: dataset.id, options }
	closeDataset()
	return read({ ...request, setup: null, view: null })
}
