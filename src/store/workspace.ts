import { create } from 'zustand'

import type { ColumnInfo } from '@/lib/engine/store'
import { defaultView } from '@/lib/engine/view'
import type { ViewState } from '@/lib/engine/view'
import type { ImportOptions, ImportWarning } from '@/lib/import/types'
import type { SavedView } from '@/lib/storage/views'
import type { EngineError, Grouped, Progress } from '@/workers/protocol'

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
	// A workbook with several sheets, waiting for one to be picked.
	| { kind: 'choosing'; id: string; name: string; sheets: string[] }
	| { kind: 'failed'; id: string; name: string; error: ImportFailure }
	| { kind: 'ready'; id: string; name: string }

// Whether the open dataset is kept for next time. `unsaved` means storage is full or blocked.
export type SaveState = 'saving' | 'saved' | 'unsaved' | null

// What the engine last answered for the view, which can be a moment behind it.
export type CurrentQuery = { id: number; rowCount: number }

export type Inspecting = { kind: 'row'; row: number } | { kind: 'column'; columnId: string }

export type WorkspaceState = {
	phase: Phase
	dataset: DatasetMeta | null
	view: ViewState
	// Widths worked out from the first rows, for columns the view gives none.
	fitted: Record<string, number>
	query: CurrentQuery | null
	querying: boolean
	// The groups of the query, when the view groups its rows.
	groups: Grouped | null
	// The grouped view a group was opened from, for going back to it.
	drilledFrom: ViewState | null
	queryError: EngineError | null
	saved: SaveState
	// The dataset's saved views, and the one last switched to. Null is all rows.
	views: SavedView[]
	activeView: string | null
	// Whether the export dialog is open, so the palette can open it too.
	exporting: boolean
	// A cell to bring into view and make active. A part left out stays where it is. `nonce` tells one
	// request from the next, and `focus` moves focus to the grid too.
	goTo: { columnId?: string; row?: number; focus: boolean; nonce: number } | null
	// The side panel: one row of the view, by its index there, or one column.
	inspector: Inspecting | null
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
	groups: null,
	drilledFrom: null,
	queryError: null,
	saved: null,
	views: [],
	activeView: null,
	exporting: false,
	goTo: null,
	inspector: null,
	notice: null,
}

// UI state and the view only. Rows stay in the engine, and `session.ts` is what talks to it.
export const useWorkspace = create<WorkspaceState>(() => initialWorkspace)

export const workspace = {
	get: useWorkspace.getState,
	set: useWorkspace.setState,
}

let nonce = 0
export const nextNonce = () => ++nonce
