import { describe, expect, test } from 'vite-plus/test'

import { cleanRecords, createDelimitedBuilder, newlineFor, parseDelimited } from './delimited'
import type { RawTable, WarningCode } from './types'
import duplicateHeaders from '../../../tests/fixtures/duplicate-headers.csv?raw'
import sampleCsv from '../../../tests/fixtures/sample.csv?raw'
import semicolons from '../../../tests/fixtures/semicolons.csv?raw'
import tricky from '../../../tests/fixtures/tricky.csv?raw'

const comma = { delimiter: ',', hasHeader: true } as const

const texts = (table: RawTable) => table.columns.map(column => column.text)
const titles = (table: RawTable) => table.columns.map(column => column.title)
const warning = (table: RawTable, code: WarningCode) =>
	table.warnings.find(item => item.code === code)

describe('parseDelimited: values are kept exactly', () => {
	test('reads headers, columns and rows', () => {
		const table = parseDelimited('a,b\n1,2\n3,4\n', comma)

		expect(table.rowCount).toBe(2)
		expect(table.columns.map(column => column.id)).toEqual(['c0', 'c1'])
		expect(table.columns.map(column => column.header)).toEqual(['a', 'b'])
		expect(texts(table)).toEqual([
			['1', '3'],
			['2', '4'],
		])
		expect(table.warnings).toEqual([])
	})

	test('big ids, leading zeros, dotted headers and quoted newlines survive untouched', () => {
		const table = parseDelimited(tricky, comma)

		expect(titles(table)).toEqual(['id', 'zip', 'addr.city', 'note'])
		expect(table.columns[0]!.text).toEqual(['12345678901234567890', '007'])
		expect(table.columns[1]!.text).toEqual(['01234', '+4915'])
		expect(table.columns[2]!.text).toEqual(['Paris', 'São Paulo'])
		expect(table.columns[3]!.text).toEqual(['line one\nline two', 'plain'])
		expect(table.warnings).toEqual([])
	})

	test('whitespace and quotes inside cells are not trimmed', () => {
		const table = parseDelimited('a,b\n  x ,"say ""hi"""\n', comma)

		expect(texts(table)).toEqual([['  x '], ['say "hi"']])
	})

	test('uses the delimiter it is given, and keeps decimal commas', () => {
		const table = parseDelimited(semicolons, { delimiter: ';', hasHeader: true })

		expect(titles(table)).toEqual(['name', 'amount'])
		expect(table.columns[1]!.text).toEqual(['1,5', '2,5'])
	})

	test('a leading BOM is not part of the first header', () => {
		const table = parseDelimited(String.fromCharCode(0xfeff) + 'a,b\n1,2\n', comma)

		expect(table.columns[0]!.header).toBe('a')
	})

	test('opens the sample fixture with nothing to warn about', () => {
		const table = parseDelimited(sampleCsv, comma)

		expect(table.columns).toHaveLength(9)
		expect(table.rowCount).toBe(25)
		expect(table.columns[6]!.text[0]).toBe("['a','b0']")
		expect(table.warnings).toEqual([])
	})

	test('an empty file has no columns and no rows', () => {
		expect(parseDelimited('', comma)).toEqual({ columns: [], rowCount: 0, warnings: [] })
	})

	test('a header with no rows has columns and no rows', () => {
		const table = parseDelimited('a,b\n', comma)

		expect(titles(table)).toEqual(['a', 'b'])
		expect(table.rowCount).toBe(0)
		expect(table.warnings).toEqual([])
	})
})

describe('parseDelimited: headers', () => {
	test('duplicate and blank headers keep every column, with distinct titles', () => {
		const table = parseDelimited(duplicateHeaders, comma)

		expect(table.columns.map(column => column.header)).toEqual(['a', 'a', '', 'b', 'a'])
		expect(titles(table)).toEqual(['a', 'a (2)', 'Column 3', 'b', 'a (3)'])
		expect(new Set(table.columns.map(column => column.id)).size).toBe(5)
		expect(texts(table)).toEqual([['1'], ['2'], ['3'], ['4'], ['5']])
		expect(warning(table, 'duplicate-headers')).toEqual({
			code: 'duplicate-headers',
			count: 2,
			firstRow: 1,
		})
		expect(warning(table, 'blank-headers')).toEqual({
			code: 'blank-headers',
			count: 1,
			firstRow: 1,
		})
	})

	test('a generated title never collides with a real header', () => {
		const table = parseDelimited('Column 2,,a,a (2),a\n1,2,3,4,5\n', comma)

		expect(new Set(titles(table)).size).toBe(5)
	})

	test('a whitespace-only header counts as blank, and the raw header is kept', () => {
		const table = parseDelimited('a,  \n1,2\n', comma)

		expect(table.columns[1]!.header).toBe('  ')
		expect(titles(table)).toEqual(['a', 'Column 2'])
	})

	test('without a header row, the first record is data', () => {
		const table = parseDelimited('x,y\n1,2\n', { delimiter: ',', hasHeader: false })

		expect(table.rowCount).toBe(2)
		expect(titles(table)).toEqual(['Column 1', 'Column 2'])
		expect(table.columns.map(column => column.header)).toEqual(['', ''])
		expect(texts(table)).toEqual([
			['x', '1'],
			['y', '2'],
		])
		expect(table.warnings).toEqual([])
	})
})

describe('parseDelimited: blank lines', () => {
	test('in a multi-column file they are skipped and counted', () => {
		const table = parseDelimited('a,b\n1,2\n\n3,4\n', comma)

		expect(table.rowCount).toBe(2)
		expect(warning(table, 'blank-lines')).toEqual({ code: 'blank-lines', count: 1, firstRow: 3 })
	})

	test('one trailing newline is not a row and does not warn, with or without it', () => {
		for (const text of ['a,b\n1,2\n', 'a,b\n1,2']) {
			const table = parseDelimited(text, comma)

			expect(table.rowCount).toBe(1)
			expect(table.warnings).toEqual([])
		}
	})

	test('a second trailing newline is one blank line', () => {
		const table = parseDelimited('a,b\n1,2\n\n', comma)

		expect(table.rowCount).toBe(1)
		expect(warning(table, 'blank-lines')).toEqual({ code: 'blank-lines', count: 1, firstRow: 3 })
	})

	test('blank lines before the header are skipped and counted', () => {
		const table = parseDelimited('\n\na,b\n1,2\n', comma)

		expect(titles(table)).toEqual(['a', 'b'])
		expect(table.rowCount).toBe(1)
		expect(warning(table, 'blank-lines')).toEqual({ code: 'blank-lines', count: 2, firstRow: 1 })
	})

	test('in a one-column file they are empty values', () => {
		const table = parseDelimited('a\n1\n\n3\n', comma)

		expect(texts(table)).toEqual([['1', '', '3']])
		expect(table.warnings).toEqual([])
	})

	test('a one-column file still ignores its single trailing newline', () => {
		const table = parseDelimited('a\n1\n', comma)

		expect(texts(table)).toEqual([['1']])
	})

	test('a file of only blank lines has no columns', () => {
		expect(parseDelimited('\n\n\n', comma).columns).toEqual([])
	})
})

describe('parseDelimited: ragged rows', () => {
	test('a short row is padded with empty cells and counted', () => {
		const table = parseDelimited('a,b,c\n1,2\n3,4,5\n', comma)

		expect(texts(table)).toEqual([
			['1', '3'],
			['2', '4'],
			['', '5'],
		])
		expect(warning(table, 'short-rows')).toEqual({ code: 'short-rows', count: 1, firstRow: 2 })
	})

	test('extra cells become extra untitled columns, and earlier rows are padded', () => {
		const table = parseDelimited('a,b\n1,2\n3,4,5\n6,7\n', comma)

		expect(titles(table)).toEqual(['a', 'b', 'Column 3'])
		expect(table.columns[2]!.header).toBe('')
		expect(texts(table)).toEqual([
			['1', '3', '6'],
			['2', '4', '7'],
			['', '5', ''],
		])
		expect(warning(table, 'extra-cells')).toEqual({ code: 'extra-cells', count: 1, firstRow: 3 })
		expect(warning(table, 'short-rows')).toEqual({ code: 'short-rows', count: 1, firstRow: 4 })
		expect(warning(table, 'blank-headers')).toBeUndefined()
	})

	test('nothing is ever dropped: every cell of every row is in the table', () => {
		const rows = [['a', 'b'], ['1'], ['2', '3', '4', '5'], ['6', '7', '8']]
		const table = parseDelimited(rows.map(row => row.join(',')).join('\n'), comma)

		const cells = table.columns.flatMap(column => column.text).filter(cell => cell !== '')
		expect(cells.sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
	})
})

describe('parseDelimited: unterminated quotes', () => {
	const broken = 'a,b\n1,2\n"never closed,3\n4,5'

	test('warns instead of throwing, and keeps the rest of the file in the cell', () => {
		const table = parseDelimited(broken, comma)

		expect(table.rowCount).toBe(2)
		expect(table.columns[0]!.text[1]).toContain('4,5')
		expect(warning(table, 'unterminated-quote')).toEqual({
			code: 'unterminated-quote',
			count: 1,
			firstRow: 3,
		})
	})
})

describe('parseDelimited: line endings', () => {
	test('CRLF leaves no carriage returns in cells', () => {
		const table = parseDelimited('a,b\r\n1,2\r\n3,4\r\n', comma)

		expect(titles(table)).toEqual(['a', 'b'])
		expect(texts(table)).toEqual([
			['1', '3'],
			['2', '4'],
		])
		expect(table.warnings).toEqual([])
	})

	test('CRLF then LF in one file does not fuse rows', () => {
		const table = parseDelimited('a,b\r\n1,2\n3,4\r\n', comma)

		expect(table.rowCount).toBe(2)
		expect(texts(table)).toEqual([
			['1', '3'],
			['2', '4'],
		])
	})

	test('LF then CRLF in one file does not leave carriage returns behind', () => {
		const table = parseDelimited('a,b\n1,2\r\n3,4\n', comma)

		expect(table.rowCount).toBe(2)
		expect(texts(table)).toEqual([
			['1', '3'],
			['2', '4'],
		])
	})

	test('old Mac files that use a bare CR work', () => {
		const table = parseDelimited('a,b\r1,2\r3,4\r', comma)

		expect(table.rowCount).toBe(2)
		expect(texts(table)).toEqual([
			['1', '3'],
			['2', '4'],
		])
	})

	test('a CRLF inside a quoted cell is kept', () => {
		const table = parseDelimited('a,b\r\n1,"x\r\ny"\r\n', comma)

		expect(table.columns[1]!.text).toEqual(['x\r\ny'])
	})

	test('a quoted last cell before a CRLF is read cleanly', () => {
		const table = parseDelimited('a,b\r\n1,"x"\r\n2,"y"\r\n', comma)

		expect(table.columns[1]!.text).toEqual(['x', 'y'])
	})

	test('a blank CRLF line is a blank line', () => {
		const table = parseDelimited('a,b\r\n1,2\r\n\r\n3,4\r\n', comma)

		expect(table.rowCount).toBe(2)
		expect(warning(table, 'blank-lines')?.count).toBe(1)
	})

	test('newlineFor picks a bare CR only when there is no LF', () => {
		expect(newlineFor('a,b\r1,2\r')).toBe('\r')
		expect(newlineFor('a,b\r\n1,2\r\n')).toBe('\n')
		expect(newlineFor('a,b\n1,2\n')).toBe('\n')
		expect(newlineFor('a,b')).toBe('\n')
	})

	test('cleanRecords removes one trailing CR from the last cell of each record', () => {
		expect(cleanRecords([['a', 'b\r'], ['c\r\r'], ['d']], '\n')).toEqual([
			['a', 'b'],
			['c\r'],
			['d'],
		])
		expect(cleanRecords([['a', 'b\r']], '\r')).toEqual([['a', 'b\r']])
	})
})

describe('createDelimitedBuilder: chunk boundaries', () => {
	// The held-back blank lines are the state that crosses a boundary, so every split is tried.
	const inputs: Record<string, string[][]> = {
		'blank lines and a ragged row': [
			['a', 'b'],
			['1', '2'],
			[''],
			['3'],
			['4', '5', '6'],
			[''],
			[''],
		],
		'a one-column file': [['a'], ['1'], [''], [''], ['3'], ['']],
		'blank lines before the header': [[''], [''], ['a', 'b'], ['1', '2'], ['']],
		'only a header': [['a', 'b'], ['']],
	}

	const build = (records: string[][], size: number) => {
		const builder = createDelimitedBuilder({ hasHeader: true })
		for (let i = 0; i < records.length; i += size) builder.append(records.slice(i, i + size))
		return builder.finish()
	}

	test.each(Object.keys(inputs))('%s gives one table however it is split', name => {
		const records = inputs[name]!
		const whole = build(records, records.length)

		for (let size = 1; size < records.length; size++) {
			expect(build(records, size), `split in ${size}`).toEqual(whole)
		}
	})
})

describe('createDelimitedBuilder', () => {
	test('numbers records across appends, counting blank ones', () => {
		const builder = createDelimitedBuilder({ hasHeader: true })

		builder.append([['a', 'b'], ['1', '2'], ['']])
		builder.append([['3']])
		const table = builder.finish()

		expect(table.rowCount).toBe(2)
		expect(warning(table, 'blank-lines')).toEqual({ code: 'blank-lines', count: 1, firstRow: 3 })
		expect(warning(table, 'short-rows')).toEqual({ code: 'short-rows', count: 1, firstRow: 4 })
	})

	test('turns chunk-relative quote errors into record numbers', () => {
		const builder = createDelimitedBuilder({ hasHeader: true })

		builder.append([
			['a', 'b'],
			['1', '2'],
		])
		builder.append([['x', 'y'], ['"z']], [1])

		// Two records came before this chunk, and the bad one is its second.
		expect(warning(builder.finish(), 'unterminated-quote')?.firstRow).toBe(4)
	})

	test('counts the rows read so far, for progress', () => {
		const builder = createDelimitedBuilder({ hasHeader: true })

		builder.append([['a'], ['1'], ['2']])

		expect(builder.rowCount()).toBe(2)
	})
})
