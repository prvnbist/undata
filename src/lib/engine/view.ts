import type { DataType } from '@/lib/constants'

// Set per dataset. A view never holds titles or types.
export type ColumnSetup = { id: string; title: string; type: DataType }

// `empty` and `malformed` are about the cell. `is` and `contains` are about its raw text, and the
// comparisons about its parsed value, so they only ever match values that fit the column's type.
export type FilterTest =
	| { op: 'anyOf' | 'noneOf'; values: string[] }
	| { op: 'contains' | 'notContains' | 'regex'; value: string }
	| { op: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'; value: string }
	// `includeMax` is false for a histogram bar, so that no value belongs to two bars.
	| { op: 'between'; min: string; max: string; includeMax: boolean }
	| { op: 'empty' | 'notEmpty' | 'malformed' | 'notMalformed' }

export type Filter = { columnId: string } & FilterTest
export type FilterOp = Filter['op']

export type SortKey = { columnId: string; desc: boolean }

export type AggregateFn = 'sum' | 'avg' | 'min' | 'max'
export type Aggregate = { columnId: string; fn: AggregateFn }
export type Grouping = { by: string[]; aggregates: Aggregate[] }

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
