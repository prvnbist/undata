import type { DataType } from '@/lib/constants'

// Set per dataset. A view never holds titles or types.
export type ColumnSetup = { id: string; title: string; type: DataType }

// `empty` and `malformed` are about the cell. `is` and `contains` are about its raw text, and the
// comparisons about its parsed value, so they only ever match values that fit the column's type.
export type FilterTest =
	| { op: 'anyOf' | 'noneOf'; values: string[] }
	| { op: 'contains' | 'notContains' | 'regex'; value: string }
	| { op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'; value: string }
	// `includeMax` is false for a histogram bar, so that no value belongs to two bars.
	| { op: 'between'; min: string; max: string; includeMax: boolean }
	| { op: 'empty' | 'notEmpty' | 'malformed' | 'notMalformed' }

export type Filter = { columnId: string } & FilterTest
export type FilterOp = Filter['op']

export type SortKey = { columnId: string; desc: boolean }

export type AggregateFn = 'sum' | 'avg' | 'min' | 'max'
export type Aggregate = { columnId: string; fn: AggregateFn }
// `key` is a grouped column's id, `count`, or an aggregate as `fn:columnId`.
export type GroupSortKey = { key: string; desc: boolean }
export type Grouping = { by: string[]; aggregates: Aggregate[]; sort: GroupSortKey[] }

export type ViewColumn = { id: string; hidden: boolean; size: number | null }

// Plain data: saved, exported from, and sent to the worker as it is.
export type ViewState = {
	search: string
	filters: Filter[]
	sort: SortKey[]
	grouping: Grouping | null
	// Array order is display order.
	columns: ViewColumn[]
}

export const defaultView = (columnIds: string[]): ViewState => ({
	search: '',
	filters: [],
	sort: [],
	grouping: null,
	columns: columnIds.map(id => ({ id, hidden: false, size: null })),
})

// A click on a header. Alone it makes the column the only key, going ascending, descending, then
// unsorted. With `add` it changes or appends that one key and leaves the others as they are.
export const cycleSort = (sort: SortKey[], columnId: string, add: boolean): SortKey[] => {
	const current = sort.find(key => key.columnId === columnId)
	const next: SortKey | null = !current
		? { columnId, desc: false }
		: current.desc
			? null
			: { columnId, desc: true }

	if (!add) {
		const alone = sort.length === 1 && current
		if (!alone) return [{ columnId, desc: false }]
		return next ? [next] : []
	}
	if (!current) return [...sort, next!]
	return next
		? sort.map(key => (key.columnId === columnId ? next : key))
		: sort.filter(key => key.columnId !== columnId)
}

// A direction chosen from the menu. Null removes the column from the sort.
export const setSort = (
	sort: SortKey[],
	columnId: string,
	desc: boolean | null,
	add: boolean
): SortKey[] => {
	if (desc === null) return sort.filter(key => key.columnId !== columnId)
	if (!add) return [{ columnId, desc }]
	return sort.some(key => key.columnId === columnId)
		? sort.map(key => (key.columnId === columnId ? { columnId, desc } : key))
		: [...sort, { columnId, desc }]
}

export const setHidden = (view: ViewState, columnId: string, hidden: boolean): ViewState => ({
	...view,
	columns: view.columns.map(column => (column.id === columnId ? { ...column, hidden } : column)),
})

// Puts a column just before another, or last when `beforeId` is null. Hidden columns keep their place
// relative to the rest.
export const moveColumn = (view: ViewState, id: string, beforeId: string | null): ViewState => {
	if (id === beforeId) return view
	const moving = view.columns.find(column => column.id === id)
	if (!moving) return view
	const rest = view.columns.filter(column => column.id !== id)
	const at = beforeId === null ? rest.length : rest.findIndex(column => column.id === beforeId)
	if (at === -1) return view
	return { ...view, columns: [...rest.slice(0, at), moving, ...rest.slice(at)] }
}

// One place left or right among the shown columns.
export const moveColumnBy = (view: ViewState, id: string, step: -1 | 1): ViewState => {
	const shown = view.columns.filter(column => !column.hidden || column.id === id)
	const at = shown.findIndex(column => column.id === id)
	const neighbour = shown[at + step]
	if (at === -1 || !neighbour) return view
	if (step === -1) return moveColumn(view, id, neighbour.id)
	return moveColumn(view, id, shown[at + 2]?.id ?? null)
}

// Null goes back to the width worked out from the values.
export const setSize = (view: ViewState, id: string, size: number | null): ViewState => ({
	...view,
	columns: view.columns.map(column => (column.id === id ? { ...column, size } : column)),
})

export const setAllHidden = (view: ViewState, ids: Set<string>, hidden: boolean): ViewState => ({
	...view,
	columns: view.columns.map(column => (ids.has(column.id) ? { ...column, hidden } : column)),
})

// A view saved for other columns, fitted to these. Whatever names a column that is gone is dropped,
// and columns it never knew go last. `missing` is the ids it named that are gone.
export const withColumns = (
	view: ViewState,
	ids: string[]
): { view: ViewState; missing: string[] } => {
	const known = new Set(ids)
	const named = [
		...view.columns.map(column => column.id),
		...view.filters.map(filter => filter.columnId),
		...view.sort.map(key => key.columnId),
		...(view.grouping?.by ?? []),
		...(view.grouping?.aggregates.map(aggregate => aggregate.columnId) ?? []),
	]
	const missing = [...new Set(named.filter(id => !known.has(id)))]
	const listed = new Set(view.columns.map(column => column.id))
	const added = ids.filter(id => !listed.has(id))
	if (missing.length === 0 && added.length === 0) return { view, missing }

	const gone = new Set(missing)
	let grouping = view.grouping
	if (grouping) {
		const by = grouping.by.filter(id => !gone.has(id))
		const aggregates = grouping.aggregates.filter(aggregate => !gone.has(aggregate.columnId))
		const keys = new Set([
			'count',
			...by,
			...aggregates.map(({ fn, columnId }) => `${fn}:${columnId}`),
		])
		grouping = by.length
			? { by, aggregates, sort: grouping.sort.filter(key => keys.has(key.key)) }
			: null
	}
	return {
		view: {
			...view,
			filters: view.filters.filter(filter => !gone.has(filter.columnId)),
			sort: view.sort.filter(key => !gone.has(key.columnId)),
			grouping,
			columns: [
				...view.columns.filter(column => !gone.has(column.id)),
				...added.map(id => ({ id, hidden: false, size: null })),
			],
		},
		missing,
	}
}
