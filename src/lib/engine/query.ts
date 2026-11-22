import { sortRows } from './sort'
import type { Dataset } from './store'
import type { ViewState } from './view'

// The rows of a view in display order, or null for every row in source order.
export type QueryResult = { order: Uint32Array | null; rowCount: number }

export const runQuery = (dataset: Dataset, view: ViewState): QueryResult => {
	const order = sortRows(dataset, null, view.sort)
	return { order, rowCount: order?.length ?? dataset.rowCount }
}
