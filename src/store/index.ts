import { create } from 'zustand'

export type Source = 'JSON' | 'CSV'

export type DataType = 'number' | 'date' | 'boolean' | 'text'

export type View = 'CHART' | 'TABLE'

export interface Column {
	id: string
	title: string
	data_type: DataType
}

export interface Cell {
	id: string
	view: View
	source: Source
	title: string
	data: {
		columns: Map<string, Column>
		rows: { [key in string]: any }[]
	}
	sort?: null | {
		column: string
		direction: 'ASC' | 'DESC'
	}
	chart?: {
		xAxis: string | null
		yAxis: string[]
	}
}

interface GlobalStore {
	cells: Map<string, Cell>
	addCell: (cell: Cell) => void
	updateCell: (id: string, payload: Partial<Cell>) => void
	deleteCell: (id: string) => void
}

const useGlobalStore = create<GlobalStore>(set => ({
	cells: new Map(),
	addCell: (cell: Cell) =>
		set(state => {
			const _cells = new Map(state.cells)
			_cells.set(cell.id, cell)
			return { cells: _cells }
		}),
	updateCell: (id: string, payload: Partial<Cell>) =>
		set(state => {
			const _cells = new Map(state.cells)
			_cells.set(id, { ...(_cells.get(id) as Cell), ...payload })
			return { cells: _cells }
		}),
	deleteCell: (id: string) =>
		set(state => {
			const _cells = new Map(state.cells)
			_cells.delete(id)
			return { cells: _cells }
		}),
}))

export default useGlobalStore
