import type { DataType } from '@/lib/constants'

import { dictionaryOf } from './dictionary'
import { ranksOf } from './sort'
import { isKeyed, STATUS } from './store'
import type { Dataset, EngineColumn } from './store'
import type { Aggregate, AggregateFn, Grouping } from './view'

// Which aggregates a column of this type can have. Sums and means only add up numbers.
export const aggregatesFor = (type: DataType): AggregateFn[] =>
	type === 'number'
		? ['sum', 'avg', 'min', 'max']
		: isKeyed(type) && type !== 'boolean'
			? ['min', 'max']
			: []

export const aggregateKey = ({ fn, columnId }: Aggregate) => `${fn}:${columnId}`

export type GroupSummary = {
	groupCount: number
	// Per aggregate, in order: the rows left out because their value did not fit the type.
	malformed: number[]
}

export type GroupRow = {
	// Its place in the summary.
	index: number
	// Each grouped column's text, as written. `empty` marks the group of empty cells.
	keys: string[]
	empty: boolean[]
	count: number
	// Per aggregate: a number as text, a value as written, or null when no row had one.
	values: (string | null)[]
}

export type GroupTable = {
	summary: GroupSummary
	window: (start: number, end: number) => GroupRow[]
}

// Sums lose precision past fifteen digits, which is noise and not worth showing.
const numberText = (value: number) => String(Number(value.toPrecision(15)))

// Every row a number for its group, counted from 0 in order of first appearance. Empty cells in a
// column are one group, whatever their text.
const groupIds = (columns: EngineColumn[], rows: number, rowAt: (i: number) => number) => {
	const ids = new Int32Array(rows)
	let count = 1

	for (const column of columns) {
		const { codes, values } = dictionaryOf(column)
		const { status } = column
		const width = values.length + 1
		const emptyCode = values.length
		// Small enough to number with an array, otherwise a map of numbers.
		const dense = count * width <= 1 << 22
		const seen = dense ? new Int32Array(count * width).fill(-1) : null
		const map = dense ? null : new Map<number, number>()
		let next = 0

		for (let i = 0; i < rows; i++) {
			const row = rowAt(i)
			const code = status[row] === STATUS.empty ? emptyCode : codes[row]!
			const combined = ids[i]! * width + code
			if (seen) {
				let id = seen[combined]!
				if (id === -1) seen[combined] = id = next++
				ids[i] = id
			} else {
				let id = map!.get(combined)
				if (id === undefined) map!.set(combined, (id = next++))
				ids[i] = id
			}
		}
		count = next
	}
	return { ids, count: rows === 0 ? 0 : count }
}

type Accumulator = {
	aggregate: Aggregate
	column: EngineColumn | null
	sum: Float64Array
	valid: Uint32Array
	// The row holding the smallest or largest value, or -1.
	extreme: Int32Array
	malformed: number
}

// The rows of a view, grouped by one or more columns, with a count and the asked-for aggregates for
// each group. It stays in the worker and is read a window at a time, so a million groups is fine.
export const groupRows = (
	dataset: Dataset,
	order: Uint32Array | null,
	grouping: Grouping
): GroupTable => {
	const by = grouping.by.flatMap(id => {
		const column = dataset.column(id)
		return column ? [column] : []
	})
	const rows = order ? order.length : dataset.rowCount
	const rowAt = order ? (i: number) => order[i]! : (i: number) => i
	const { ids, count: groupCount } = by.length
		? groupIds(by, rows, rowAt)
		: { ids: new Int32Array(rows), count: rows === 0 ? 0 : 1 }

	const counts = new Uint32Array(groupCount)
	const firstRow = new Int32Array(groupCount).fill(-1)
	for (let i = 0; i < rows; i++) {
		const group = ids[i]!
		counts[group]!++
		if (firstRow[group] === -1) firstRow[group] = rowAt(i)
	}

	const accumulators: Accumulator[] = grouping.aggregates.map(aggregate => {
		const column = dataset.column(aggregate.columnId) ?? null
		const usable = column !== null && aggregatesFor(column.info.type).includes(aggregate.fn)
		return {
			aggregate,
			column: usable ? column : null,
			sum: new Float64Array(aggregate.fn === 'sum' || aggregate.fn === 'avg' ? groupCount : 0),
			valid: new Uint32Array(groupCount),
			extreme: new Int32Array(
				aggregate.fn === 'min' || aggregate.fn === 'max' ? groupCount : 0
			).fill(-1),
			malformed: 0,
		}
	})

	for (const acc of accumulators) {
		const { column, aggregate } = acc
		if (!column) continue
		const { status } = column
		const keys = column.keys!
		const adds = aggregate.fn === 'sum' || aggregate.fn === 'avg'
		const smaller = aggregate.fn === 'min'

		for (let i = 0; i < rows; i++) {
			const row = rowAt(i)
			const state = status[row]
			if (state === STATUS.malformed) {
				acc.malformed++
				continue
			}
			if (state !== STATUS.ok) continue
			const group = ids[i]!
			acc.valid[group]!++
			if (adds) {
				acc.sum[group]! += keys[row]!
				continue
			}
			const at = acc.extreme[group]!
			if (at === -1 || (smaller ? keys[row]! < keys[at]! : keys[row]! > keys[at]!)) {
				acc.extreme[group] = row
			}
		}
	}

	const valueOf = (acc: Accumulator, group: number): string | null => {
		if (!acc.column || acc.valid[group] === 0) return null
		switch (acc.aggregate.fn) {
			case 'sum':
				return numberText(acc.sum[group]!)
			case 'avg':
				return numberText(acc.sum[group]! / acc.valid[group]!)
			default:
				return acc.column.text[acc.extreme[group]!]!
		}
	}

	// For sorting: the number an aggregate stands for, NaN when there is none.
	const numberOf = (acc: Accumulator, group: number) => {
		if (!acc.column || acc.valid[group] === 0) return NaN
		switch (acc.aggregate.fn) {
			case 'sum':
				return acc.sum[group]!
			case 'avg':
				return acc.sum[group]! / acc.valid[group]!
			default:
				return acc.column.keys![acc.extreme[group]!]!
		}
	}

	const sort = grouping.sort.length
		? grouping.sort
		: grouping.by.map(key => ({ key, desc: false }))
	const comparators = sort.flatMap(({ key, desc }): ((a: number, b: number) => number)[] => {
		const sign = desc ? -1 : 1
		if (key === 'count') return [(a, b) => sign * (counts[a]! - counts[b]!)]

		const acc = accumulators.find(item => aggregateKey(item.aggregate) === key)
		if (acc) {
			return [
				(a, b) => {
					const x = numberOf(acc, a)
					const y = numberOf(acc, b)
					// No value goes last, whichever way.
					if (Number.isNaN(x) || Number.isNaN(y))
						return Number(Number.isNaN(x)) - Number(Number.isNaN(y))
					return sign * (x - y)
				},
			]
		}

		const column = by.find(item => item.info.id === key)
		if (!column) return []
		const { ranks } = ranksOf(column)
		const { status } = column
		return [
			(a, b) => {
				const x = firstRow[a]!
				const y = firstRow[b]!
				const xOk = status[x] === STATUS.ok
				const yOk = status[y] === STATUS.ok
				if (!xOk || !yOk) {
					if (xOk !== yOk) return xOk ? -1 : 1
					// Malformed before empty, each among themselves by text.
					return status[x]! === status[y]!
						? sign *
								(column.text[x]! < column.text[y]!
									? -1
									: column.text[x]! > column.text[y]!
										? 1
										: 0)
						: status[y]! - status[x]!
				}
				return sign * (ranks[x]! - ranks[y]!)
			},
		]
	})

	const shown = new Uint32Array(groupCount)
	for (let i = 0; i < groupCount; i++) shown[i] = i
	if (comparators.length) {
		shown.sort((a, b) => {
			for (const compare of comparators) {
				const result = compare(a, b)
				if (result !== 0) return result
			}
			return a - b
		})
	}

	return {
		summary: { groupCount, malformed: accumulators.map(acc => acc.malformed) },
		window(start, end) {
			const out: GroupRow[] = []
			for (let index = Math.max(0, start); index < Math.min(groupCount, end); index++) {
				const group = shown[index]!
				const row = firstRow[group]!
				out.push({
					index,
					keys: by.map(column =>
						column.status[row] === STATUS.empty ? '' : column.text[row]!
					),
					empty: by.map(column => column.status[row] === STATUS.empty),
					count: counts[group]!,
					values: accumulators.map(acc => valueOf(acc, group)),
				})
			}
			return out
		},
	}
}

const AGGREGATE_NAMES: Record<AggregateFn, string> = {
	sum: 'Sum',
	avg: 'Mean',
	min: 'Min',
	max: 'Max',
}

export const aggregateTitle = (fn: AggregateFn, title: string) =>
	`${AGGREGATE_NAMES[fn]} of ${title}`

export type SummaryColumn = { name: string; type: DataType }

type NamedColumn = { id: string; title: string; header: string; type: DataType }

// The summary's columns as a file has them: the grouped columns, the count, then the aggregates. A
// sum or a mean is a number whatever it adds up. Names never repeat, so JSON keeps every one.
export const summaryColumns = (
	columns: NamedColumn[],
	grouping: Grouping,
	names: 'titles' | 'headers'
): SummaryColumn[] => {
	const byId = new Map(columns.map(column => [column.id, column]))
	const nameOf = (column: NamedColumn) => (names === 'headers' ? column.header : column.title)
	const wanted: SummaryColumn[] = [
		...grouping.by.flatMap(id => {
			const column = byId.get(id)
			return column ? [{ name: nameOf(column), type: column.type }] : []
		}),
		{ name: 'Rows', type: 'number' },
		...grouping.aggregates.map(({ columnId, fn }) => {
			const column = byId.get(columnId)
			return {
				name: aggregateTitle(fn, column ? nameOf(column) : columnId),
				type: fn === 'sum' || fn === 'avg' ? 'number' : (column?.type ?? 'text'),
			} satisfies SummaryColumn
		}),
	]
	const seen = new Set<string>()
	return wanted.map(column => {
		let name = column.name
		for (let n = 2; seen.has(name); n++) name = `${column.name} (${n})`
		seen.add(name)
		return { ...column, name }
	})
}

// One group as the cells of a summary row, in the order of `summaryColumns`. Null is no value.
export const summaryCells = (row: GroupRow): (string | null)[] => [
	...row.keys.map((key, i) => (row.empty[i] ? null : key)),
	String(row.count),
	...row.values,
]
