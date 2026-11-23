import { create } from 'zustand'

import type { ColumnInfo } from '@/lib/engine/store'
import { defaultView } from '@/lib/engine/view'
import type { ViewState } from '@/lib/engine/view'
import type { ImportOptions, ImportWarning } from '@/lib/import/types'
import type { EngineError, Progress } from '@/workers/protocol'

// A file can also be turned away before the engine sees it.
export type ImportFailure = Omit<EngineError, 'code'> & { code: EngineError['code'] | 'too-large' }

export type DatasetMeta = {
	id: string
	name: string
	size: number
	rowCount: number
	columns: ColumnInfo[]
	options: ImportOptions
	warnings: ImportWarning[]
}

export type Phase =
	| { kind: 'idle' }
	// Large enough to ask before reading it.
	| { kind: 'confirming'; id: string; name: string; size: number }
	| { kind: 'importing'; id: string; name: string; progress: Progress | null }
	| { kind: 'failed'; id: string; name: string; error: ImportFailure }
	| { kind: 'ready'; id: string; name: string }

// Whether the open dataset is kept for next time. `unsaved` means storage is full or blocked.
export type SaveState = 'saving' | 'saved' | 'unsaved' | null

// What the engine last answered for the view, which can be a moment behind it.
export type CurrentQuery = { id: number; rowCount: number }

export type WorkspaceState = {
	phase: Phase
	dataset: DatasetMeta | null
	view: ViewState
	// Widths worked out from the first rows, for columns the view gives none.
	fitted: Record<string, number>
	query: CurrentQuery | null
	querying: boolean
	queryError: EngineError | null
	saved: SaveState
	// Something to tell the user once.
	notice: string | null
}

export const initialWorkspace: WorkspaceState = {
	phase: { kind: 'idle' },
	dataset: null,
	view: defaultView([]),
	fitted: {},
	query: null,
	querying: false,
	queryError: null,
	saved: null,
	notice: null,
}

// UI state and the view only. Rows stay in the engine, and `session.ts` is what talks to it.
export const useWorkspace = create<WorkspaceState>(() => initialWorkspace)

export const workspace = {
	get: useWorkspace.getState,
	set: useWorkspace.setState,
}
