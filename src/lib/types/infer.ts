import type { DataType } from '@/lib/constants'
import type { RawTable } from '@/lib/import/types'
import { parseList } from '@/lib/tags'

import { parse } from './parse'

const WINDOWS = 3
const WINDOW_SIZE = 300

const isEmpty = (value: string) => value.trim() === ''

// The non-empty values of three windows: the start, the middle and the end. A small column is taken
// whole. A window made of empties is not a reason to stop, so the search widens past it.
export const sampleValues = (values: string[]): string[] => {
	const total = WINDOWS * WINDOW_SIZE
	if (values.length <= total * 2) return values.filter(value => !isEmpty(value))

	const picked: string[] = []
	const collect = (from: number, step: 1 | -1) => {
		let taken = 0
		for (let i = from; i >= 0 && i < values.length && taken < WINDOW_SIZE; i += step) {
			if (isEmpty(values[i]!)) continue
			picked.push(values[i]!)
			taken++
		}
	}

	collect(0, 1)
	collect(Math.floor((values.length - WINDOW_SIZE) / 2), 1)
	collect(values.length - 1, -1)
	return picked
}

// Numbers that print back exactly. No leading zeros or plus sign (codes, phone numbers), no
// exponent (often codes), and no more digits than a double holds.
const isExactNumber = (text: string) => {
	if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return false
	if (text.replace(/\D/g, '').replace(/^0+/, '').length > 15) {
		return Number.isSafeInteger(Number(text)) && !text.includes('.')
	}
	return true
}

const BOOLEAN_WORDS = new Set(['true', 'false', 'yes', 'no'])

// A link needs its scheme. Bare domains match file names (`report.pdf`) far too often.
const isLink = (text: string) => /^https?:\/\//i.test(text) && parse('url', text).ok

// A list written with quotes of either kind, like ['a', 'b'].
const isTagList = (text: string) => parseList(text) !== null

type Candidate = { type: DataType; test: (text: string) => boolean }

const fits = (type: DataType) => (text: string) => parse(type, text).ok

// Most specific first. `image` is deliberately absent: showing one sends a request to a third party.
const CANDIDATES: Candidate[] = [
	{ type: 'boolean', test: text => BOOLEAN_WORDS.has(text.toLowerCase()) },
	{ type: 'number', test: isExactNumber },
	{ type: 'date', test: fits('date') },
	{ type: 'timestamp', test: fits('timestamp') },
	{ type: 'timestamptz', test: fits('timestamptz') },
	{ type: 'time', test: fits('time') },
	{ type: 'timetz', test: fits('timetz') },
	{ type: 'json', test: fits('json') },
	{ type: 'url', test: isLink },
	{ type: 'tag', test: isTagList },
]

// Conservative: every sampled value must fit, or the column stays text. The engine later counts
// the values that do not fit across the whole column.
export const inferType = (values: string[]): DataType => {
	const sample = sampleValues(values).map(value => value.trim())
	if (sample.length === 0) return 'text'

	return CANDIDATES.find(({ test }) => sample.every(test))?.type ?? 'text'
}

export const inferColumnTypes = (table: RawTable): DataType[] =>
	table.columns.map(column => inferType(column.text))
