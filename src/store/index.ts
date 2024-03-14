import { create } from 'zustand'

export type Source = 'JSON'

export type DataType = 'number' | 'date' | 'boolean' | 'text'

export interface Column {
	id: string
	title: string
	data_type: DataType
}

export interface Cell {
	id: string
	source: Source
	title: string
	data: {
		columns: Map<string, Column>
		rows: { [key in string]: any }[]
	}
}

interface GlobalStore {
	cells: Cell[]
	addCell: (cell: Cell) => void
	updateCell: (index: number, payload: Partial<Cell>) => void
	deleteCell: (id: string) => void
}

const useGlobalStore = create<GlobalStore>(set => ({
	cells: [],
	addCell: (cell: Cell) =>
		set(state => ({ cells: [...state.cells, { ...cell, index: state.cells.length + 1 }] })),
	updateCell: (index: number, payload: Partial<Cell>) =>
		set(state => {
			const _cells = state.cells
			_cells[index] = { ..._cells[index], ...payload }
			return { cells: [..._cells] }
		}),
	deleteCell: (id: string) =>
		set(state => {
			const _cells = state.cells
			return { cells: _cells.filter(c => c.id !== id) }
		}),
}))

export default useGlobalStore
