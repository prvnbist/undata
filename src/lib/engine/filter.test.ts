import { describe, expect, test } from 'vite-plus/test'

import type { DataType } from '../constants'
import { parseDelimited } from '../import/delimited'
import { checkFilter, filterRows, InvalidFilter } from './filter'
import { parseRegex, textMatcher } from './match'
import { createDataset } from './store'
import { defaultView } from './view'
import type { FilterTest } from './view'

const make = (text: string, types: DataType[]) =>
	createDataset(parseDelimited(text, { delimiter: ',', hasHeader: true }), types)

const view = (changes: Partial<ReturnType<typeof defaultView>> = {}) => ({
	...defaultView(['c0', 'c1']),
	...changes,
})

// The values of one column that a single filter keeps.
const kept = (type: DataType, values: string[], test: FilterTest) => {
	const dataset = make(`a,b\n${values.map(v => `"${v.replaceAll('"', '""')}",z`).join('\n')}`, [
		type,
	])
	const rows = filterRows(dataset, view({ filters: [{ columnId: 'c0', ...test }] }))!
	return [...rows].map(row => values[row])
}

describe('filters on raw text', () => {
	const values = ['paid', 'Paid', 'unpaid', '', 'a.b', 'x']

	test.each<[FilterTest, string[]]>([
		[{ op: 'anyOf', values: ['paid', 'x'] }, ['paid', 'x']],
		[{ op: 'noneOf', values: ['paid', 'x'] }, ['Paid', 'unpaid', '', 'a.b']],
		[{ op: 'contains', value: 'PAID' }, ['paid', 'Paid', 'unpaid']],
		[{ op: 'notContains', value: 'paid' }, ['', 'a.b', 'x']],
		[{ op: 'contains', value: '.' }, ['a.b']],
		[{ op: 'regex', value: '^p' }, ['paid']],
		[{ op: 'regex', value: '/^p/i' }, ['paid', 'Paid']],
		[{ op: 'regex', value: '/a/g' }, ['paid', 'Paid', 'unpaid', 'a.b']],
		[{ op: 'empty' }, ['']],
		[{ op: 'notEmpty' }, ['paid', 'Paid', 'unpaid', 'a.b', 'x']],
		[{ op: 'anyOf', values: [] }, []],
	])('%j', (test, expected) => {
		expect(kept('text', values, test)).toEqual(expected)
	})
})

describe('filters on parsed values', () => {
	const numbers = ['5', '10', '9.0', 'n/a', '', '-1']

	test.each<[FilterTest, string[]]>([
		[{ op: 'eq', value: '9' }, ['9.0']],
		[{ op: 'gt', value: '5' }, ['10', '9.0']],
		[{ op: 'gte', value: '5' }, ['5', '10', '9.0']],
		[{ op: 'lt', value: '5' }, ['-1']],
		[{ op: 'lte', value: '5' }, ['5', '-1']],
		[{ op: 'between', min: '5', max: '10', includeMax: true }, ['5', '10', '9.0']],
		[{ op: 'between', min: '5', max: '10', includeMax: false }, ['5', '9.0']],
		[{ op: 'malformed' }, ['n/a']],
		[{ op: 'notMalformed' }, ['5', '10', '9.0', '', '-1']],
	])('number %j', (test, expected) => {
		expect(kept('number', numbers, test)).toEqual(expected)
	})

	test.each<[DataType, string[], FilterTest, string[]]>([
		['date', ['2024-01-01', '2024-02-01'], { op: 'gt', value: '2024-01-15' }, ['2024-02-01']],
		['time', ['9:00', '14:00'], { op: 'lt', value: '10:00' }, ['9:00']],
		['boolean', ['yes', 'FALSE', '1'], { op: 'eq', value: 'true' }, ['yes', '1']],
		[
			'timestamptz',
			['2024-01-01T10:00:00Z', '2024-01-01T11:00:00+02:00'],
			{ op: 'lt', value: '2024-01-01T09:30:00Z' },
			['2024-01-01T11:00:00+02:00'],
		],
	])('%s', (type, values, test, expected) => {
		expect(kept(type, values, test)).toEqual(expected)
	})
})

describe('filterRows', () => {
	const dataset = make('a,b\n1,x\n2,X\n3,y', ['number', 'text'])

	test('no search and no filters keeps every row without listing them', () => {
		expect(filterRows(dataset, view())).toBeNull()
	})

	test('filters combine with AND', () => {
		const rows = filterRows(
			dataset,
			view({
				filters: [
					{ columnId: 'c0', op: 'gt', value: '1' },
					{ columnId: 'c1', op: 'contains', value: 'x' },
				],
			})
		)!
		expect([...rows]).toEqual([1])
	})

	test('search matches any visible column, ignoring case', () => {
		expect([...filterRows(dataset, view({ search: 'x' }))!]).toEqual([0, 1])
		expect([...filterRows(dataset, view({ search: '3' }))!]).toEqual([2])
		expect([...filterRows(dataset, view({ search: 'nope' }))!]).toEqual([])
	})

	test('search does not look in hidden columns', () => {
		const columns = defaultView(['c0', 'c1']).columns.map(c => ({ ...c, hidden: c.id === 'c1' }))
		expect([...filterRows(dataset, view({ search: 'x', columns }))!]).toEqual([])
	})

	test('search and filters combine', () => {
		const filters = [{ columnId: 'c0', op: 'lt' as const, value: '2' }]
		expect([...filterRows(dataset, view({ search: 'x', filters }))!]).toEqual([0])
	})

	test('a filter on a column that is not there is ignored', () => {
		expect(filterRows(dataset, view({ filters: [{ columnId: 'gone', op: 'empty' }] }))).toBeNull()
	})

	test('a filter that cannot run throws a typed error', () => {
		const filters = [{ columnId: 'c1', op: 'regex' as const, value: '(' }]
		expect(() => filterRows(dataset, view({ filters }))).toThrow(InvalidFilter)
	})
})

describe('checkFilter', () => {
	test.each<[DataType, FilterTest, boolean]>([
		['text', { op: 'regex', value: '(' }, false],
		['text', { op: 'regex', value: '(a)' }, true],
		['text', { op: 'regex', value: '' }, false],
		['text', { op: 'contains', value: '' }, false],
		['number', { op: 'gt', value: 'abc' }, false],
		['number', { op: 'gt', value: '1' }, true],
		['number', { op: 'between', min: '1', max: 'x', includeMax: true }, false],
		['number', { op: 'between', min: '2', max: '1', includeMax: true }, false],
		['text', { op: 'gt', value: '1' }, false],
		['date', { op: 'lte', value: '2024-13-01' }, false],
		['number', { op: 'malformed' }, true],
		['text', { op: 'anyOf', values: [] }, false],
	])('%s %j → %s', (type, test, valid) => {
		expect(checkFilter(type, test) === null).toBe(valid)
	})
})

describe('textMatcher', () => {
	test('treats every character as itself', () => {
		for (const needle of ['.', '*', 'a(b', '[x]', '\\', '$1', 'a/b', '^']) {
			expect(textMatcher(needle)(`--${needle}--`), needle).toBe(true)
			expect(textMatcher(needle)('zzz'), needle).toBe(false)
		}
	})

	test('ignores case beyond ASCII', () => {
		expect(textMatcher('É')('café')).toBe(true)
	})
})

test('parseRegex reads both spellings and refuses the rest', () => {
	expect(parseRegex('a+')?.source).toBe('a+')
	expect(parseRegex('/a+/i')?.flags).toBe('i')
	expect(parseRegex('/a/g')?.flags).toBe('')
	expect(parseRegex('(')).toBeNull()
	expect(parseRegex('/a/q')).toBeNull()
})
