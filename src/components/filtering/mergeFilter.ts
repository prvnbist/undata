import type { Filter, FilterOp } from '@/lib/engine/view'

const OPPOSITE: Partial<Record<FilterOp, FilterOp>> = {
	empty: 'notEmpty',
	notEmpty: 'empty',
	malformed: 'notMalformed',
	notMalformed: 'malformed',
	anyOf: 'noneOf',
	noneOf: 'anyOf',
}

const same = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b)

// Adds a filter the way a click means it: another value for a column joins the list it already has,
// a value cannot be both in and out, and nothing is added twice. Returns `filters` when nothing changes.
export const mergeFilter = (filters: Filter[], added: Filter): Filter[] => {
	if (filters.some(filter => same(filter, added))) return filters
	const { columnId, op } = added
	const opposite = OPPOSITE[op]

	if (added.op === 'anyOf' || added.op === 'noneOf') {
		const wanted = new Set(added.values)
		// The same values said the other way round are taken out of that filter.
		const kept = filters.flatMap(filter => {
			if (filter.columnId !== columnId || filter.op !== opposite || !('values' in filter)) {
				return [filter]
			}
			const values = filter.values.filter(value => !wanted.has(value))
			return values.length ? [{ ...filter, values }] : []
		})

		const at = kept.findIndex(filter => filter.columnId === columnId && filter.op === op)
		if (at === -1) return [...kept, added]
		const existing = kept[at] as typeof added
		const values = [...existing.values, ...added.values.filter(v => !existing.values.includes(v))]
		if (values.length === existing.values.length && kept.length === filters.length) return filters
		return kept.map((filter, i) => (i === at ? { ...existing, values } : filter))
	}

	if (opposite) {
		const at = filters.findIndex(filter => filter.columnId === columnId && filter.op === opposite)
		if (at !== -1) return filters.map((filter, i) => (i === at ? added : filter))
	}
	return [...filters, added]
}
