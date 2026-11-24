import type { DataType } from '@/lib/constants'
import { parse } from '@/lib/types/parse'

import { createInterner, dictionaryOf } from './dictionary'
import { parseRegex, textMatcher } from './match'
import { isKeyed, STATUS } from './store'
import type { Dataset, EngineColumn } from './store'
import type { Filter, FilterTest, ViewState } from './view'

type RowTest = (row: number) => boolean

export class InvalidFilter extends Error {}

// What a comparison is against, as the same number the column's keys hold. Null when the operand does
// not fit the type.
const operand = (type: DataType, text: string) => {
	const result = parse(type, text)
	return result.ok ? Number(result.value) : null
}

// Why a filter cannot run on a column of this type, in words for the person who wrote it, or null.
export const checkFilter = (type: DataType, test: FilterTest): string | null => {
	const badOperand = (text: string) => `“${text}” is not a ${type} value`

	switch (test.op) {
		case 'anyOf':
		case 'noneOf':
			return test.values.length === 0 ? 'Choose at least one value' : null

		case 'contains':
		case 'notContains':
			return test.value === '' ? 'Enter some text' : null

		case 'regex':
			if (test.value === '') return 'Enter a pattern'
			return parseRegex(test.value) ? null : 'This is not a valid regular expression'

		case 'between': {
			if (!isKeyed(type)) return `A ${type} column cannot be compared`
			const min = operand(type, test.min)
			const max = operand(type, test.max)
			if (min === null) return badOperand(test.min)
			if (max === null) return badOperand(test.max)
			return min > max ? 'The first value is larger than the second' : null
		}

		case 'empty':
		case 'notEmpty':
		case 'malformed':
		case 'notMalformed':
			return null

		default:
			if (!isKeyed(type)) return `A ${type} column cannot be compared`
			return operand(type, test.value) === null ? badOperand(test.value) : null
	}
}

// Looks each distinct value up once instead of every row's.
const membership = (column: EngineColumn, wanted: string[]): RowTest => {
	const { codes, values } = dictionaryOf(column)
	const set = createInterner()
	for (const value of wanted) set.intern(value)
	const hits = Uint8Array.from(values, value => (set.has(value) ? 1 : 0))
	return row => hits[codes[row]!] === 1
}

// A NaN key, which is a row with no value, fails every comparison.
const rowTest = (column: EngineColumn, test: FilterTest): RowTest => {
	const { text, status, keys, info } = column
	const key = (value: string) => operand(info.type, value)!
	const of = keys!

	switch (test.op) {
		case 'anyOf':
			return membership(column, test.values)
		case 'noneOf': {
			const has = membership(column, test.values)
			return row => !has(row)
		}
		case 'contains': {
			const matches = textMatcher(test.value)
			return row => matches(text[row]!)
		}
		case 'notContains': {
			const matches = textMatcher(test.value)
			return row => !matches(text[row]!)
		}
		case 'regex': {
			const pattern = parseRegex(test.value)!
			return row => pattern.test(text[row]!)
		}
		case 'empty':
			return row => status[row] === STATUS.empty
		case 'notEmpty':
			return row => status[row] !== STATUS.empty
		case 'malformed':
			return row => status[row] === STATUS.malformed
		case 'notMalformed':
			return row => status[row] !== STATUS.malformed
		case 'eq': {
			const value = key(test.value)
			return row => of[row] === value
		}
		case 'ne': {
			// A NaN key is a row with no value, which differs from nothing.
			const value = key(test.value)
			return row => !Number.isNaN(of[row]) && of[row] !== value
		}
		case 'gt': {
			const value = key(test.value)
			return row => of[row]! > value
		}
		case 'gte': {
			const value = key(test.value)
			return row => of[row]! >= value
		}
		case 'lt': {
			const value = key(test.value)
			return row => of[row]! < value
		}
		case 'lte': {
			const value = key(test.value)
			return row => of[row]! <= value
		}
		case 'between': {
			const min = key(test.min)
			const max = key(test.max)
			return test.includeMax
				? row => of[row]! >= min && of[row]! <= max
				: row => of[row]! >= min && of[row]! < max
		}
	}
}

const compile = (dataset: Dataset, filter: Filter): RowTest | null => {
	const column = dataset.column(filter.columnId)
	if (!column) return null

	const problem = checkFilter(column.info.type, filter)
	// Nothing chosen yet means nothing matches, which is not a mistake.
	if (problem && filter.op !== 'anyOf' && filter.op !== 'noneOf') {
		throw new InvalidFilter(`${column.info.title}: ${problem}`)
	}
	return rowTest(column, filter)
}

const searchTest = (dataset: Dataset, view: ViewState): RowTest | null => {
	if (view.search === '') return null

	const matches = textMatcher(view.search)
	const texts = view.columns
		.filter(column => !column.hidden)
		.flatMap(({ id }) => {
			const column = dataset.column(id)
			return column ? [column.text] : []
		})

	return row => {
		for (let i = 0; i < texts.length; i++) if (matches(texts[i]![row]!)) return true
		return false
	}
}

const keep = (rows: Uint32Array | null, total: number, test: RowTest) => {
	const count = rows ? rows.length : total
	const out = new Uint32Array(count)
	let kept = 0
	for (let i = 0; i < count; i++) {
		const row = rows ? rows[i]! : i
		if (test(row)) out[kept++] = row
	}
	return out.slice(0, kept)
}

// The rows of a view in source order, or null when nothing narrows them. Throws InvalidFilter.
export const filterRows = (dataset: Dataset, view: ViewState): Uint32Array | null => {
	const tests = view.filters.flatMap(filter => compile(dataset, filter) ?? [])
	// The search looks at every column, so it goes last and sees as few rows as possible.
	const search = searchTest(dataset, view)

	return [...tests, ...(search ? [search] : [])].reduce<Uint32Array | null>(
		(rows, test) => keep(rows, dataset.rowCount, test),
		null
	)
}
