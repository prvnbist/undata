import { describe, expect, test } from 'vite-plus/test'

import { parseDelimited } from './delimited'
import { createDelimitedStream } from './stream'

const stream = (pieces: string[], chunkSize: number, hasHeader = true) => {
	const parser = createDelimitedStream({ delimiter: ',', hasHeader, chunkSize })
	for (const piece of pieces) parser.push(piece)
	return parser.finish()
}

const piecesOf = (text: string, size: number) =>
	Array.from({ length: Math.ceil(text.length / size) }, (_, i) =>
		text.slice(i * size, (i + 1) * size)
	)

describe('createDelimitedStream', () => {
	test.each([
		['plain', 'a,b\n1,2\n3,4\n'],
		['no final line break', 'a,b\n1,2\n3,4'],
		['CRLF', 'a,b\r\n1,2\r\n3,4\r\n'],
		['bare CR', 'a,b\r1,2\r3,4\r'],
		['quoted line break', 'a,b\n1,"x\ny"\n3,"z"\n'],
		['escaped quotes', 'a,b\n1,"x ""y"" z"\n'],
		['blank lines', 'a,b\n\n1,2\n\n\n3,4\n\n'],
		['one column with empty values', 'a\n1\n\n2\n\n'],
		['unterminated quote', 'a,b\n1,2\n3,"x\n4,5\n'],
		['ragged', 'a,b\n1\n1,2,3\n'],
		['header only', 'a,b\n'],
		['unicode', 'ä,b\n😀,日本\n'],
	])('gives the same table as a whole-text parse: %s', (_name, text) => {
		const whole = parseDelimited(text, { delimiter: ',', hasHeader: true })

		for (const size of [1, 2, 3, 7, 1000]) {
			// The line ending is decided from the first chunk, so that chunk has to contain one.
			for (const chunkSize of [8, 1000]) {
				expect(stream(piecesOf(text, size), chunkSize)).toEqual(whole)
			}
		}
	})

	test('matches a whole-text parse on random text', () => {
		let seed = 7
		const random = (n: number) => {
			seed = (seed * 1103515245 + 12345) % 2147483648
			return seed % n
		}
		const alphabet = ['a', '1', ',', '\n', '\r\n', '"x"', '"p\nq"', '"', 'é']

		for (let i = 0; i < 1500; i++) {
			const text =
				'h,k\n' + Array.from({ length: random(30) }, () => alphabet[random(9)]!).join('')
			const whole = parseDelimited(text, { delimiter: ',', hasHeader: true })
			const result = stream(piecesOf(text, 1 + random(6)), 4 + random(20))
			expect(
				result.columns.map(c => c.text),
				JSON.stringify(text)
			).toEqual(whole.columns.map(c => c.text))
			expect(result.warnings, JSON.stringify(text)).toEqual(whole.warnings)
		}
	})

	test('an unterminated quote does not make parsing quadratic', () => {
		const pieces = ['a,b\n"', ...Array.from({ length: 2000 }, () => 'x'.repeat(1000))]
		const start = performance.now()
		const table = stream(pieces, 4000)

		expect(table.warnings[0]?.code).toBe('unterminated-quote')
		expect(performance.now() - start).toBeLessThan(1000)
	})

	test('no text is an empty table', () => {
		expect(stream([], 100)).toMatchObject({ columns: [], rowCount: 0 })
	})
})
