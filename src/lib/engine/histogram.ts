import type { DataType } from '@/lib/constants'
import { keyToText } from '@/lib/types/key'

export type Bin = {
	// As text of the column's type, so a bin can be used as a filter as it is.
	min: string
	max: string
	// Only the last bin has its upper end, so that no value is in two.
	includeMax: boolean
	count: number
}

const MAX_BINS = 20

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const DAYS = [1, 2, 7, 14, 28, 91, 182, 365, 730, 1825, 3650, 18250, 36500, 182500, 365000, 730000]
const DAY_STEPS = DAYS.map(days => days * DAY)
const CLOCK_STEPS = [
	1,
	2,
	5,
	10,
	20,
	50,
	100,
	200,
	500,
	...[1, 2, 5, 15, 30].map(n => n * SECOND),
	...[1, 2, 5, 15, 30].map(n => n * MINUTE),
	...[1, 2, 3, 6, 12].map(n => n * HOUR),
]

// 1, 2 or 5 times a power of ten.
const roundStep = (span: number) => {
	const rough = span / MAX_BINS
	const power = 10 ** Math.floor(Math.log10(rough))
	return power * ([1, 2, 5, 10].find(n => n * power >= rough * (1 - 1e-9)) ?? 10)
}

const stepFor = (type: DataType, span: number) => {
	const smallest = (steps: number[]) => steps.find(step => span / step <= MAX_BINS)

	switch (type) {
		case 'date':
			return smallest(DAY_STEPS) ?? DAY_STEPS.at(-1)!
		case 'timestamp':
		case 'timestamptz':
			return smallest([...CLOCK_STEPS, ...DAY_STEPS]) ?? DAY_STEPS.at(-1)!
		case 'time':
		case 'timetz':
			return smallest(CLOCK_STEPS.map(step => step / 1000)) ?? HOUR / 1000
		default:
			return roundStep(span)
	}
}

// Round edges that cover min to max. The ends are the data's own, so the axis never claims more than
// there is.
const edgesFor = (type: DataType, min: number, max: number) => {
	if (min === max) return [min, max]

	const step = stepFor(type, max - min)
	const edges = [min]
	const first = Math.floor(min / step) + 1
	for (let i = first; edges.length <= MAX_BINS + 2; i++) {
		// 3 * 0.1 is 0.30000000000000004, which is not an edge anyone wants to read.
		const edge = type === 'number' ? Number((i * step).toPrecision(12)) : i * step
		if (edge >= max) break
		if (edge > edges.at(-1)!) edges.push(edge)
	}
	return [...edges, max]
}

// `keys` gives the value of each of `count` rows, NaN where there is none.
export const histogram = (
	type: DataType,
	keyAt: (index: number) => number,
	count: number,
	min: number,
	max: number
): Bin[] => {
	const edges = edgesFor(type, min, max)
	const last = edges.length - 2
	const counts = new Uint32Array(last + 1)

	for (let i = 0; i < count; i++) {
		const key = keyAt(i)
		if (Number.isNaN(key)) continue

		// The same comparison a `between` filter makes, so a bar and its filter always agree.
		let low = 0
		let high = last
		while (low < high) {
			const middle = (low + high + 1) >> 1
			if (key >= edges[middle]!) low = middle
			else high = middle - 1
		}
		counts[low]!++
	}

	return Array.from(counts, (binCount, i) => ({
		min: keyToText(type, edges[i]!),
		max: keyToText(type, edges[i + 1]!),
		includeMax: i === last,
		count: binCount,
	}))
}
