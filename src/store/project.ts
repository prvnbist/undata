import { create } from 'zustand'

import type { DataType } from '@/lib/constants'

export type Source = 'csv' | null

export type Column = {
	key: string
	title: string
	hidden: boolean
	data_type: DataType | null
}

export type Row = Record<Column['key'], string | boolean | number | null>

interface ProjectState {
	metadata: {
		source: Source
	}
	initProject: (source: Source, columns: Map<string, Column>, rows: Array<Row>) => void

	columns: Map<string, Column>
	setColumns: (columns: Map<string, Column>) => void

	rows: Array<Row>

	error: string | null
	setError: (error: string | null) => void
}

export const useProject = create<ProjectState>(set => ({
	metadata: {
		source: null,
	},

	rows: [],

	columns: new Map(),
	setColumns: columns => set({ columns }),

	initProject: (source, columns, rows) => set({ metadata: { source }, columns, rows }),

	error: null,
	setError: error => set({ error }),
}))
