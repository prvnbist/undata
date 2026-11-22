import type { ImportErrorCode, ImportOptions, ImportWarning } from '@/lib/import/types'
import type { ColumnInfo, RowWindow } from '@/lib/engine/store'
import type { ColumnSetup, ViewState } from '@/lib/engine/view'

export type EngineErrorCode =
	| ImportErrorCode
	| 'no-dataset'
	// A newer query replaced this request before it ran.
	| 'superseded'
	// The worker died, or a task failed in a way nobody planned for.
	| 'crashed'

export type EngineError = {
	code: EngineErrorCode
	message: string
	position?: { line: number; column: number } | null
}

export type Progress = { phase: 'reading' | 'parsing' | 'checking'; ratio: number }

export type Opened = {
	options: ImportOptions
	columns: ColumnInfo[]
	rowCount: number
	warnings: ImportWarning[]
}

export type Queried = { queryId: number; rowCount: number }

// Every request and what it answers. One entry here is all it takes to add a call.
export type EngineCalls = {
	open: {
		// Null options detect the format, and a null setup infers the types.
		request: { blob: Blob; options: ImportOptions | null; setup: ColumnSetup[] | null }
		response: Opened
	}
	query: { request: { view: ViewState }; response: Queried }
	rows: {
		request: { queryId: number; start: number; end: number; columnIds: string[] }
		response: RowWindow[]
	}
	setColumns: { request: { setup: ColumnSetup[] }; response: ColumnInfo[] }
}

export type CallName = keyof EngineCalls

export type EngineRequest = {
	[K in CallName]: { id: number; type: K } & EngineCalls[K]['request']
}[CallName]

export type EngineMessage =
	| { id: number; kind: 'done'; value: EngineCalls[CallName]['response'] }
	| { id: number; kind: 'failed'; error: EngineError }
	| { id: number; kind: 'progress'; progress: Progress }
	| { id: number; kind: 'started' }
