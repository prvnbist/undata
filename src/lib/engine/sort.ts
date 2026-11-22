import { dictionaryOf } from './dictionary'
import { STATUS } from './store'
import type { Dataset, EngineColumn } from './store'
import type { SortKey } from './view'

const allRows = (count: number) => {
	const rows = new Uint32Array(count)
	for (let i = 0; i < count; i++) rows[i] = i
	return rows
}

const compareText = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0)

// Numbers every row by where its value stands among the distinct values, given that order.
const ranksFromOrder = (
	column: EngineColumn,
	order: Uint32Array,
	same: (a: number, b: number) => boolean
): Ranks => {
	const ranks = new Uint32Array(column.text.length)
	let count = 0
	for (let i = 0; i < order.length; i++) {
		if (i > 0 && !same(order[i - 1]!, order[i]!)) count++
		ranks[order[i]!] = count
	}
	return { ranks, count: order.length === 0 ? 0 : count + 1 }
}

// Comparing long strings that share a start is the slow part, so when most values repeat only the
// distinct ones are compared.
const repeats = (text: string[]) => {
	const sample = Math.min(2000, text.length)
	const seen = new Set<string>()
	for (let i = 0; i < sample; i++) seen.add(text[Math.floor((i * text.length) / sample)]!)
	return seen.size < sample / 2
}

const ranksFromDictionary = (column: EngineColumn): Ranks => {
	const { codes, values } = dictionaryOf(column)
	const order = allRows(values.length).sort((a, b) => compareText(values[a]!, values[b]!))
	const rankOf = new Uint32Array(values.length)
	for (let i = 0; i < order.length; i++) rankOf[order[i]!] = i

	return { ranks: codes.map(code => rankOf[code]!), count: values.length }
}

type Ranks = { ranks: Uint32Array; count: number }

// By parsed value where the type has one, otherwise by code unit, which is fast, predictable, and the
// same on every machine.
const buildRanks = (column: EngineColumn): Ranks => {
	const { text, status, keys } = column
	if (!keys && repeats(text)) return ranksFromDictionary(column)

	const order = allRows(text.length).filter(row => status[row] === STATUS.ok)
	if (keys) {
		order.sort((a, b) => keys[a]! - keys[b]!)
		return ranksFromOrder(column, order, (a, b) => keys[a] === keys[b])
	}
	order.sort((a, b) => compareText(text[a]!, text[b]!))
	return ranksFromOrder(column, order, (a, b) => text[a] === text[b])
}

const ranksOf = (column: EngineColumn): Ranks => (column.ranks ??= buildRanks(column))

// A stable counting sort on one column. Rows with no value go to the last bucket whichever way it is
// sorted, so the direction applies between real values only.
const sortByRank = (rows: Uint32Array, column: EngineColumn, desc: boolean) => {
	const { ranks, count } = ranksOf(column)
	const { status } = column
	const bucketOf = (row: number) =>
		status[row] !== STATUS.ok ? count : desc ? count - 1 - ranks[row]! : ranks[row]!

	const starts = new Uint32Array(count + 2)
	for (let i = 0; i < rows.length; i++) starts[bucketOf(rows[i]!) + 1]!++
	for (let i = 1; i < starts.length; i++) starts[i]! += starts[i - 1]!

	const out = new Uint32Array(rows.length)
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i]!
		out[starts[bucketOf(row)]!++] = row
	}
	return out
}

// `rows` is the filtered rows in source order, or null for all. It is never changed. Each pass is
// stable, so sorting by the last key first leaves the first key deciding, and ties in source order.
export const sortRows = (
	dataset: Dataset,
	rows: Uint32Array | null,
	sort: SortKey[]
): Uint32Array | null => {
	const keys = sort.flatMap(({ columnId, desc }) => {
		const column = dataset.column(columnId)
		return column ? [{ column, desc }] : []
	})
	if (keys.length === 0) return rows

	return keys.reduceRight(
		(order, { column, desc }) => sortByRank(order, column, desc),
		rows ?? allRows(dataset.rowCount)
	)
}
