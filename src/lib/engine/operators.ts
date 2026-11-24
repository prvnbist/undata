import type { DataType } from '@/lib/constants'

import { checkFilter } from './filter'
import type { Filter, FilterOp } from './view'

// What a filter is offered with on each type. Comparisons are only for types that have an order, and
// a text column is never malformed, so it is not offered there.
const COMPARE: FilterOp[] = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between']
const TEXT: FilterOp[] = ['contains', 'notContains', 'anyOf', 'noneOf', 'regex']
const EMPTY: FilterOp[] = ['empty', 'notEmpty']
const VALID: FilterOp[] = ['malformed', 'notMalformed']

const TEMPORAL = new Set<DataType>(['date', 'timestamp', 'timestamptz', 'time', 'timetz'])
const AT = new Set<DataType>(['time', 'timetz'])

export const operatorsFor = (type: DataType): FilterOp[] => {
	if (type === 'text') return [...TEXT, ...EMPTY]
	if (type === 'boolean') return ['eq', ...EMPTY, ...VALID]
	if (type === 'number' || TEMPORAL.has(type)) return [...COMPARE, 'anyOf', ...EMPTY, ...VALID]
	return [...TEXT, ...EMPTY, ...VALID]
}

const SYMBOLS: Partial<Record<FilterOp, string>> = {
	eq: '=',
	ne: '≠',
	gt: '>',
	gte: '≥',
	lt: '<',
	lte: '≤',
}

export const operatorLabel = (type: DataType, op: FilterOp): string => {
	if (op in SYMBOLS && !TEMPORAL.has(type)) return type === 'boolean' ? 'is' : SYMBOLS[op]!
	// “On” a date, “at” a time.
	const on = AT.has(type) ? 'at' : 'on'
	switch (op) {
		case 'eq':
			return 'is'
		case 'ne':
			return 'is not'
		case 'gt':
			return 'is after'
		case 'gte':
			return `is ${on} or after`
		case 'lt':
			return 'is before'
		case 'lte':
			return `is ${on} or before`
		case 'between':
			return 'is between'
		case 'contains':
			return 'contains'
		case 'notContains':
			return 'does not contain'
		case 'anyOf':
			return 'is any of'
		case 'noneOf':
			return 'is none of'
		case 'regex':
			return 'matches pattern'
		case 'empty':
			return 'is empty'
		case 'notEmpty':
			return 'is not empty'
		case 'malformed':
			return `is not a valid ${type}`
		case 'notMalformed':
			return `is a valid ${type} or empty`
	}
}

export type OperandKind = 'none' | 'value' | 'range' | 'values'

export const operandOf = (op: FilterOp): OperandKind => {
	switch (op) {
		case 'empty':
		case 'notEmpty':
		case 'malformed':
		case 'notMalformed':
			return 'none'
		case 'between':
			return 'range'
		case 'anyOf':
		case 'noneOf':
			return 'values'
		default:
			return 'value'
	}
}

// Everything the editor holds at once, so switching operator keeps what was typed.
export type FilterDraft = {
	columnId: string
	op: FilterOp
	value: string
	min: string
	max: string
	values: string[]
	includeMax: boolean
}

export const draftFor = (columnId: string, type: DataType, filter?: Filter): FilterDraft => {
	const draft: FilterDraft = {
		columnId,
		op: filter?.op ?? operatorsFor(type)[0]!,
		value: '',
		min: '',
		max: '',
		values: [],
		includeMax: true,
	}
	if (!filter) return draft
	if ('value' in filter) draft.value = filter.value
	if ('values' in filter) draft.values = [...filter.values]
	if (filter.op === 'between') {
		draft.min = filter.min
		draft.max = filter.max
		draft.includeMax = filter.includeMax
	}
	return draft
}

export const toFilter = ({ columnId, op, value, min, max, values, includeMax }: FilterDraft) => {
	switch (op) {
		case 'empty':
		case 'notEmpty':
		case 'malformed':
		case 'notMalformed':
			return { columnId, op } satisfies Filter
		case 'between':
			return { columnId, op, min, max, includeMax } satisfies Filter
		case 'anyOf':
		case 'noneOf':
			return { columnId, op, values } satisfies Filter
		default:
			return { columnId, op, value } satisfies Filter
	}
}

const LISTED = 3

const list = (values: string[]) =>
	values.length > LISTED
		? `${values.slice(0, LISTED).join(', ')} and ${values.length - LISTED} more`
		: values.join(', ')

// The filter as a short sentence, for its chip.
export const describeFilter = (filter: Filter, title: string, type: DataType) => {
	const label = operatorLabel(type, filter.op)
	switch (filter.op) {
		case 'empty':
		case 'notEmpty':
		case 'malformed':
		case 'notMalformed':
			return `${title} ${label}`
		case 'between':
			return `${title} ${label} ${filter.min} and ${filter.max}`
		case 'anyOf':
		case 'noneOf':
			return `${title} ${label} ${list(filter.values)}`
		case 'contains':
		case 'notContains':
		case 'regex':
			return `${title} ${label} “${filter.value}”`
		default:
			return `${title} ${label} ${filter.value}`
	}
}

// The filters a saved view can still run with, after its columns changed. Running one that no longer
// fits would fail the whole query.
export const fitsColumns = (filters: Filter[], columns: { id: string; type: DataType }[]) => {
	const types = new Map(columns.map(column => [column.id, column.type]))
	const kept = filters.filter(filter => {
		const type = types.get(filter.columnId)
		if (!type) return false
		// Nothing chosen yet matches nothing, which the engine runs.
		return filter.op === 'anyOf' || filter.op === 'noneOf' || !checkFilter(type, filter)
	})
	return { kept, dropped: filters.length - kept.length }
}
