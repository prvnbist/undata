import { dictionaryOf } from './dictionary'
import { histogram } from './histogram'
import type { Bin } from './histogram'
import { isEmptyText, STATUS } from './store'
import type { Dataset } from './store'

export type ColumnStats = {
	rows: number
	empty: number
	malformed: number
	// Of the raw text, leaving out empties.
	distinct: number
	top: { value: string; count: number }[]
	// As written in the source. Only for types that have an order.
	range: { min: string; max: string; mean: number | null } | null
	histogram: Bin[] | null
}

const TOP = 20

const topValues = (counts: Uint32Array, values: string[]) => {
	let distinct = 0
	let top: { code: number; count: number }[] = []
	let least = 0

	for (let code = 0; code < counts.length; code++) {
		const count = counts[code]!
		if (count === 0 || isEmptyText(values[code]!)) continue
		distinct++
		if (count <= least) continue

		// Sorted once in a while instead of on every value, which is enough to stay small.
		top.push({ code, count })
		if (top.length >= TOP * 20) {
			top = top.sort((a, b) => b.count - a.count).slice(0, TOP)
			least = top.at(-1)!.count
		}
	}

	return {
		distinct,
		top: top
			.sort((a, b) => b.count - a.count)
			.slice(0, TOP)
			.map(({ code, count }) => ({ value: values[code]!, count })),
	}
}

// `order` is the rows of the view, or null for all of them.
export const columnStats = (
	dataset: Dataset,
	order: Uint32Array | null,
	columnId: string
): ColumnStats | null => {
	const column = dataset.column(columnId)
	if (!column) return null

	const { status, keys, text, info } = column
	const rows = order ? order.length : dataset.rowCount
	const rowAt = (i: number) => (order ? order[i]! : i)
	const { codes, values } = dictionaryOf(column)
	const counts = new Uint32Array(values.length)

	let empty = 0
	let malformed = 0
	let sum = 0
	let min = -1
	let max = -1

	for (let i = 0; i < rows; i++) {
		const row = rowAt(i)
		counts[codes[row]!]!++

		if (status[row] === STATUS.empty) empty++
		else if (status[row] === STATUS.malformed) malformed++
		else if (keys) {
			const key = keys[row]!
			sum += key
			if (min === -1 || key < keys[min]!) min = row
			if (max === -1 || key > keys[max]!) max = row
		}
	}

	const hasRange = keys !== null && min !== -1 && info.type !== 'boolean'

	return {
		rows,
		empty,
		malformed,
		...topValues(counts, values),
		range: hasRange
			? {
					min: text[min]!,
					max: text[max]!,
					mean: info.type === 'number' ? sum / (rows - empty - malformed) : null,
				}
			: null,
		histogram: hasRange
			? histogram(info.type, i => keys[rowAt(i)]!, rows, keys[min]!, keys[max]!)
			: null,
	}
}
