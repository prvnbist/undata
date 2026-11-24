import { describe, expect, test } from 'vite-plus/test'

import { parseJson, parseNdjson } from './json'
import type { JsonResult } from './json'
import { CELL_KINDS } from './types'
import type { RawColumn, RawTable, WarningCode } from './types'

const table = (result: JsonResult): RawTable => {
	if (!result.ok) throw new Error(`expected a table, got: ${result.error.message}`)
	return result.table
}

const failure = (result: JsonResult) => {
	if (result.ok) throw new Error('expected an error')
	return result.error
}

const kindsOf = (column: RawColumn) => [...(column.kinds ?? [])].map(code => CELL_KINDS[code])
const texts = (t: RawTable) => t.columns.map(column => column.text)
const titles = (t: RawTable) => t.columns.map(column => column.title)
const warning = (t: RawTable, code: WarningCode) => t.warnings.find(item => item.code === code)

describe('parseJson: values', () => {
	test('reads an array of objects into columns in first-seen order', () => {
		const result = table(parseJson('[{"id":1,"name":"Ada"},{"id":2,"name":"Grace"}]'))

		expect(result.rowCount).toBe(2)
		expect(result.columns.map(column => column.id)).toEqual(['c0', 'c1'])
		expect(result.columns.map(column => column.header)).toEqual(['id', 'name'])
		expect(titles(result)).toEqual(['id', 'name'])
		expect(texts(result)).toEqual([
			['1', '2'],
			['Ada', 'Grace'],
		])
		expect(kindsOf(result.columns[0]!)).toEqual(['number', 'number'])
		expect(kindsOf(result.columns[1]!)).toEqual(['string', 'string'])
		expect(result.warnings).toEqual([])
	})

	test('numbers JSON would round or reformat keep their source text', () => {
		const result = table(
			parseJson(
				'[{"big":12345678901234567890,"dec":1.10,"exp":1e3,"neg":-0,"plain":42,"frac":3.5}]'
			)
		)

		expect(result.columns.map(column => column.text[0])).toEqual([
			'12345678901234567890',
			'1.10',
			'1e3',
			'-0',
			'42',
			'3.5',
		])
		expect(result.columns.every(column => kindsOf(column)[0] === 'number')).toBe(true)
	})

	test('numbers inside nested values keep their source text too', () => {
		const result = table(
			parseJson('[{"meta":{"id":12345678901234567890,"price":1.10,"list":[2e3,1]}}]')
		)

		expect(result.columns[0]!.text[0]).toBe(
			'{"id":12345678901234567890,"price":1.10,"list":[2e3,1]}'
		)
		expect(kindsOf(result.columns[0]!)).toEqual(['json'])
	})

	test('arrays and objects are JSON cells', () => {
		const result = table(parseJson('[{"tags":["x","y"],"empty":{}}]'))

		expect(texts(result)).toEqual([['["x","y"]'], ['{}']])
		expect(kindsOf(result.columns[0]!)).toEqual(['json'])
	})

	test('missing and null are different', () => {
		const result = table(parseJson('[{"a":1,"b":null},{"a":2}]'))

		expect(kindsOf(result.columns[1]!)).toEqual(['null', 'missing'])
		expect(result.columns[1]!.text).toEqual(['', ''])
	})

	test('an empty string is a string, not null or missing', () => {
		const result = table(parseJson('[{"a":""},{"a":"x"}]'))

		expect(kindsOf(result.columns[0]!)).toEqual(['string', 'string'])
	})

	test('booleans are true and false text', () => {
		const result = table(parseJson('[{"ok":true},{"ok":false}]'))

		expect(result.columns[0]!.text).toEqual(['true', 'false'])
		expect(kindsOf(result.columns[0]!)).toEqual(['boolean', 'boolean'])
	})

	test('strings keep escapes and line breaks as the characters they mean', () => {
		const result = table(parseJson('[{"s":"line1\\nline2 \\u00e9 \\"q\\""}]'))

		expect(result.columns[0]!.text[0]).toBe('line1\nline2 é "q"')
	})

	test('a leading BOM is ignored', () => {
		const result = table(parseJson(String.fromCharCode(0xfeff) + '[{"a":1}]'))

		expect(result.rowCount).toBe(1)
	})
})

describe('parseJson: columns', () => {
	test('a key first seen in a later row becomes a column, and earlier rows are missing', () => {
		const result = table(parseJson('[{"a":1},{"a":2,"b":3},{"c":4}]'))

		expect(titles(result)).toEqual(['a', 'b', 'c'])
		expect(kindsOf(result.columns[1]!)).toEqual(['missing', 'number', 'missing'])
		expect(kindsOf(result.columns[2]!)).toEqual(['missing', 'missing', 'number'])
		expect(texts(result)[1]).toEqual(['', '3', ''])
	})

	test('every column and kind list is exactly rowCount long', () => {
		const result = table(parseJson('[{"a":1},{"b":2},{"c":3}]'))

		for (const column of result.columns) {
			expect(column.text).toHaveLength(3)
			expect(column.kinds).toHaveLength(3)
		}
	})

	test('odd keys are ordinary columns, and a blank key gets a numbered title', () => {
		const result = table(
			parseJson('[{"addr.city":"Paris","__proto__":"p","constructor":"c","":"blank"}]')
		)

		expect(result.columns.map(column => column.header)).toEqual([
			'addr.city',
			'__proto__',
			'constructor',
			'',
		])
		expect(titles(result)).toEqual(['addr.city', '__proto__', 'constructor', 'Column 4'])
		expect(texts(result)).toEqual([['Paris'], ['p'], ['c'], ['blank']])
	})

	test('a generated title never collides with a real key', () => {
		const result = table(parseJson('[{"Column 2":1,"":2}]'))

		expect(new Set(titles(result)).size).toBe(2)
	})

	test('a key that is a nested path stays a plain key, and nesting stays a JSON cell', () => {
		const result = table(parseJson('[{"addr.city":"Paris","addr":{"city":"Rome"}}]'))

		expect(titles(result)).toEqual(['addr.city', 'addr'])
		expect(kindsOf(result.columns[1]!)).toEqual(['json'])
	})

	test('integer-like keys come first, which is how JavaScript orders object keys', () => {
		// A known limit: JSON.parse hands over keys in this order, so the source order is not available.
		const result = table(parseJson('[{"b":1,"2":2,"1":3}]'))

		expect(result.columns.map(column => column.header)).toEqual(['1', '2', 'b'])
	})
})

describe('parseJson: what counts as records', () => {
	test('a single object is one row', () => {
		const result = table(parseJson('{"a":1,"b":"x"}'))

		expect(result.rowCount).toBe(1)
		expect(titles(result)).toEqual(['a', 'b'])
	})

	test('items that are not objects are skipped and counted', () => {
		const result = table(parseJson('[{"a":1},5,"x",[1],null,{"a":2}]'))

		expect(result.rowCount).toBe(2)
		expect(result.columns[0]!.text).toEqual(['1', '2'])
		expect(warning(result, 'non-object-records')).toEqual({
			code: 'non-object-records',
			count: 4,
			firstRow: 2,
		})
	})

	test('an empty array is an empty table', () => {
		expect(table(parseJson('[]'))).toEqual({ columns: [], rowCount: 0, warnings: [] })
	})

	test.each(['[1,2,3]', '[[1],[2]]', '5', '"x"', 'null', '1.10', 'true'])(
		'%s has no records',
		text => {
			expect(failure(parseJson(text)).code).toBe('no-records')
		}
	)
})

describe('parseJson: invalid input', () => {
	test('reports the line and column of the first problem', () => {
		const error = failure(parseJson('[{"a":1},\n{"a":}]'))

		expect(error.code).toBe('invalid-json')
		expect(error.position).toEqual({ line: 2, column: 6 })
		expect(error.message).toContain('line 2, column 6')
	})

	test('empty input is an invalid-json error at the start', () => {
		const error = failure(parseJson(''))

		expect(error.code).toBe('invalid-json')
		expect(error.position).toEqual({ line: 1, column: 1 })
	})

	test('a document cut off in the middle points at its end', () => {
		const error = failure(parseJson('[{"a":1},\n{"a":2'))

		expect(error.position).toEqual({ line: 2, column: 7 })
	})
})

describe('parseJson: without lossless number support', () => {
	test('still loads, and warns that large integers may have been rounded', () => {
		const result = table(
			parseJson('[{"id":12345678901234567890,"n":1.5,"nested":{"x":98765432109876543210}}]', {
				lossless: false,
			})
		)

		expect(result.columns[0]!.text[0]).toBe('12345678901234567000')
		expect(result.columns[1]!.text[0]).toBe('1.5')
		expect(warning(result, 'large-numbers-may-round')).toEqual({
			code: 'large-numbers-may-round',
			count: 2,
			firstRow: null,
		})
	})

	test('says nothing when nothing could have been rounded', () => {
		expect(table(parseJson('[{"a":1,"b":2.5}]', { lossless: false })).warnings).toEqual([])
	})
})

describe('parseNdjson', () => {
	test('reads one object per line', () => {
		const result = table(parseNdjson('{"a":1}\n{"a":2,"b":"x"}\n'))

		expect(result.rowCount).toBe(2)
		expect(titles(result)).toEqual(['a', 'b'])
		expect(texts(result)).toEqual([
			['1', '2'],
			['', 'x'],
		])
		expect(kindsOf(result.columns[1]!)).toEqual(['missing', 'string'])
		expect(result.warnings).toEqual([])
	})

	test('every column is trimmed to the rows that were read', () => {
		const result = table(parseNdjson('{"a":1}\n\n\n{"b":2}\n'))

		for (const column of result.columns) {
			expect(column.text).toHaveLength(2)
			expect(column.kinds).toHaveLength(2)
		}
	})

	test('handles CRLF, and keeps number text, null and missing apart', () => {
		const result = table(parseNdjson('{"id":12345678901234567890,"x":null}\r\n{"id":1.10}\r\n'))

		expect(result.columns[0]!.text).toEqual(['12345678901234567890', '1.10'])
		expect(kindsOf(result.columns[1]!)).toEqual(['null', 'missing'])
	})

	test('a trailing newline is not a blank line', () => {
		expect(table(parseNdjson('{"a":1}\n')).warnings).toEqual([])
		expect(table(parseNdjson('{"a":1}')).warnings).toEqual([])
	})

	test('blank and whitespace-only lines are skipped and counted by physical line', () => {
		const result = table(parseNdjson('{"a":1}\n\n   \n{"a":2}\n\n'))

		expect(result.rowCount).toBe(2)
		expect(warning(result, 'blank-lines')).toEqual({ code: 'blank-lines', count: 3, firstRow: 2 })
	})

	test('a bad line is reported with its line number, and the rest loads', () => {
		const result = table(parseNdjson('{"a":1}\n{"a":\n{"a":3}\n'))

		expect(result.columns[0]!.text).toEqual(['1', '3'])
		expect(warning(result, 'invalid-lines')).toMatchObject({
			code: 'invalid-lines',
			count: 1,
			firstRow: 2,
		})
		expect(warning(result, 'invalid-lines')?.detail).toContain('column')
	})

	test('line numbers count blank lines', () => {
		const result = table(parseNdjson('{"a":1}\n\n\n{oops}\n'))

		expect(warning(result, 'invalid-lines')?.firstRow).toBe(4)
	})

	test('a line that is JSON but not an object is counted separately', () => {
		const result = table(parseNdjson('{"a":1}\n[1,2]\n5\n{"a":2}'))

		expect(result.rowCount).toBe(2)
		expect(warning(result, 'non-object-records')).toEqual({
			code: 'non-object-records',
			count: 2,
			firstRow: 2,
		})
		expect(warning(result, 'invalid-lines')).toBeUndefined()
	})

	test('when no line can be read it is an error that names the first problem', () => {
		const error = failure(parseNdjson('{oops\n{"a"\n'))

		expect(error.code).toBe('no-records')
		expect(error.position).toEqual({ line: 1, column: 2 })
		expect(error.message).toContain('Line 1')
	})

	test('a file of blank lines has no records', () => {
		expect(failure(parseNdjson('\n\n  \n')).code).toBe('no-records')
	})

	test('a leading BOM is ignored', () => {
		expect(table(parseNdjson(String.fromCharCode(0xfeff) + '{"a":1}\n')).rowCount).toBe(1)
	})

	test('without lossless support it counts rounded integers across lines', () => {
		const result = table(
			parseNdjson('{"id":12345678901234567890}\n{"id":98765432109876543210}\n{"id":1}', {
				lossless: false,
			})
		)

		expect(warning(result, 'large-numbers-may-round')?.count).toBe(2)
	})
})
