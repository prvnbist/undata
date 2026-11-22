import { defaultView } from '@/lib/engine/view'
import type { ColumnSetup, ViewState } from '@/lib/engine/view'
import type { ImportOptions } from '@/lib/import/types'
import { createEngineClient, isEngineError } from '@/workers/client'
import type { EngineClient } from '@/workers/client'
import type { EngineError } from '@/workers/protocol'
import { initialWorkspace, workspace } from './workspace'

// The engine and the bytes of the open dataset. They are not state: nothing renders from them.
let client: EngineClient | null = null
let source: Blob | null = null

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
	workspace.set(initialWorkspace)
}

// Starts reading, and gives back the id straight away so the caller can go to the workspace, which is
// where progress and failures are shown.
export const importDataset = ({
	blob,
	name,
	id = crypto.randomUUID(),
	options = null,
	setup = null,
	view = null,
}: ImportRequest): { id: string; done: Promise<void> } => {
	closeDataset()
	workspace.set({ phase: { kind: 'importing', id, name, progress: null } })

	const own = createEngineClient()
	client = own
	source = blob

	const run = async () => {
		try {
			const opened = await own.open(blob, {
				options,
				setup,
				onProgress: progress =>
					workspace.set({ phase: { kind: 'importing', id, name, progress } }),
			})
			const initial = view ?? defaultView(opened.columns.map(column => column.id))
			const { queryId, rowCount } = await own.query(initial)
			if (own !== client) return

			workspace.set({
				phase: { kind: 'ready', id, name },
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

	return { id, done: run() }
}

export const currentSource = () => source
