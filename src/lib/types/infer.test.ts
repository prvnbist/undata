import { describe, expect, test } from 'vite-plus/test'

import sampleCsv from '../../../tests/fixtures/sample.csv?raw'
import { parseDelimited } from '../import/delimited'
import type { RawTable } from '../import/types'
import { inferColumnTypes, inferType, sampleValues } from './infer'

describe('inferType', () => {
	test.each([
		['number', ['1', '2.5', '-3', '0', '10']],
		['boolean', ['true', 'FALSE', 'yes', 'No']],
		['date', ['2020-01-01', '2021-12-31']],
		['timestamp', ['2020-01-01 10:00:00', '2020-01-02T11:30']],
		['timestamptz', ['2020-01-01T10:00:00Z', '2020-01-02 11:30:00+02:00']],
		['time', ['09:00', '23:59:59']],
		['timetz', ['09:00Z', '10:00+02:00']],
		['json', ['{"a":1}', '[1,2]']],
		['url', ['https://example.com', 'http://a.org/x?y=1']],
		['tag', ["['a','b']", '["c"]'.replace('"c"', "'c'")]],
		['text', ['hello', 'world']],
	] as const)('%s', (type, values) => expect(inferType([...values])).toBe(type))

	test('a single odd value keeps the column text', () => {
		expect(inferType(['1', '2', 'three'])).toBe('text')
		expect(inferType(['2020-01-01', '2020-13-01'])).toBe('text')
	})

	test('leading-zero codes stay text', () => {
		expect(inferType(['01234', '02134'])).toBe('text')
		expect(inferType(['007', '8'])).toBe('text')
		expect(inferType(['+15551234567', '+4420'])).toBe('text')
		expect(inferType(['0', '0.5', '10'])).toBe('number')
	})

	test('integers and decimals a double cannot hold stay text', () => {
		expect(inferType(['12345678901234567890'])).toBe('text')
		expect(inferType(['9007199254740993'])).toBe('text')
		expect(inferType(['9007199254740991'])).toBe('number')
		expect(inferType(['0.1234567890123456789'])).toBe('text')
	})

	test('exponent forms stay text, they are often codes', () => {
		expect(inferType(['12e5', '3e2'])).toBe('text')
	})

	test('0 and 1 are numbers, not booleans; single letters are not booleans', () => {
		expect(inferType(['0', '1', '1'])).toBe('number')
		expect(inferType(['y', 'n', 'y'])).toBe('text')
		expect(inferType(['t', 'f'])).toBe('text')
	})

	test('empties do not count, all-empty and no values are text', () => {
		expect(inferType(['1', '', '  ', '2'])).toBe('number')
		expect(inferType(['', ' ', ''])).toBe('text')
		expect(inferType([])).toBe('text')
	})

	test('a bare domain or file name is not a link', () => {
		expect(inferType(['example.com', 'report.pdf'])).toBe('text')
		expect(inferType(['javascript:alert(1)'])).toBe('text')
		expect(inferType(['ftp://example.com/x'])).toBe('text')
	})

	test('image is never inferred', () => {
		expect(inferType(['https://example.com/a.png', 'https://example.com/b.jpg'])).toBe('url')
	})

	test('json arrays of numbers are json, quoted lists are tags', () => {
		expect(inferType(['[1,2]', '[3]'])).toBe('json')
		expect(inferType(["['a']", "['b','c']"])).toBe('tag')
	})

	test('a bare string that is not a list is not a tag', () => {
		expect(inferType(['solo', 'duo'])).toBe('text')
	})
})

describe('tag lists', () => {
	test('brackets alone do not make a list', () => {
		expect(inferType(['[abc]', '[def]'])).toBe('text')
		expect(inferType(['[ERROR] failed'])).toBe('text')
	})

	test('an empty list does not stop a column of lists from being tags', () => {
		expect(inferType(["['a']", '[]'])).toBe('tag')
	})
})

describe('sampleValues', () => {
	const column = Array.from({ length: 100_000 }, (_, i) => String(i))

	test('takes the whole column when it is small', () => {
		expect(sampleValues(['a', '', 'b'])).toEqual(['a', 'b'])
	})

	test('covers the start, the middle and the end of a big column', () => {
		const sample = sampleValues(column)
		expect(sample.length).toBeLessThanOrEqual(1500)
		expect(sample).toContain('0')
		expect(sample).toContain('50000')
		expect(sample).toContain('99999')
	})

	test('a bad value only in the middle or at the end is seen', () => {
		for (const at of [50_000, 99_999]) {
			const values = column.slice()
			values[at] = 'oops'
			expect(inferType(values)).toBe('text')
		}
	})

	test('windows full of empties still reach values elsewhere', () => {
		const values = Array.from({ length: 10_000 }, (_, i) => (i < 5000 ? '' : String(i)))
		expect(inferType(values)).toBe('number')
	})
})

describe('inferColumnTypes', () => {
	test('sample.csv infers every type with no input', () => {
		const table = parseDelimited(sampleCsv, { delimiter: ',', hasHeader: true })
		const types = Object.fromEntries(
			inferColumnTypes(table).map((type, i) => [table.columns[i]!.header, type])
		)
		expect(types).toEqual({
			name: 'text',
			age: 'number',
			active: 'boolean',
			start_time: 'time',
			joined: 'date',
			website: 'url',
			tags: 'tag',
			meta: 'json',
			avatar: 'url',
		})
	})

	test('returns one type per column, in order', () => {
		const table: RawTable = {
			columns: [
				{ id: 'c0', header: 'a', title: 'a', text: ['1', '2'] },
				{ id: 'c1', header: 'b', title: 'b', text: ['x', 'y'] },
			],
			rowCount: 2,
			warnings: [],
		}
		expect(inferColumnTypes(table)).toEqual(['number', 'text'])
	})
})
