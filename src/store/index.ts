import { create } from 'zustand'

export type Source = 'JSON'

export interface Column {
	id: string
	title: string
}

export interface Cell {
	id: string
	source: Source
	data: {
		columns: Map<string, Column>
		rows: { [key in string]: any }[]
	}
}

interface GlobalStore {
	cells: Cell[]
	addCell: (cell: Cell) => void
}

const useGlobalStore = create<GlobalStore>(set => ({
	cells: [],
	addCell: (cell: Cell) =>
		set(state => ({ cells: [...state.cells, { ...cell, index: state.cells.length + 1 }] })),
}))

export default useGlobalStore
