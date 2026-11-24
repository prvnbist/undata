import { describe, expect, test } from 'vite-plus/test'

import { detect } from './detect'
import sampleCsv from '../../../tests/fixtures/sample.csv?raw'

const utf8 = (text: string) => new TextEncoder().encode(text)

const utf16 = (text: string, order: 'le' | 'be', bom: boolean) => {
	const full = (bom ? String.fromCharCode(0xfeff) : '') + text
	const units = Array.from({ length: full.length }, (_, k) => full.charCodeAt(k))
	const bytes = new Uint8Array(units.length * 2)
	units.forEach((unit, i) => {
		bytes[i * 2] = order === 'le' ? unit & 0xff : unit >> 8
		bytes[i * 2 + 1] = order === 'le' ? unit >> 8 : unit & 0xff
	})
	return bytes
}

const delimiterOf = (text: string) => {
	const result = detect(utf8(text))
	if (!result.ok || result.format !== 'delimited') throw new Error(`not delimited: ${text}`)
	return result.delimiter
}

describe('detect: errors', () => {
	test('empty input is empty', () => {
		expect(detect(new Uint8Array())).toEqual({ ok: false, code: 'empty' })
	})

	test('whitespace only, or a lone BOM, is empty', () => {
		expect(detect(utf8('  \n\t\r\n'))).toEqual({ ok: false, code: 'empty' })
		expect(detect(new Uint8Array([0xef, 0xbb, 0xbf]))).toEqual({ ok: false, code: 'empty' })
	})

	test('bytes with NULs are binary', () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00])
		expect(detect(png)).toEqual({ ok: false, code: 'binary' })
	})

	test('control-heavy bytes are binary even without NULs', () => {
		expect(detect(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 65, 66]))).toEqual({
			ok: false,
			code: 'binary',
		})
	})
})

describe('detect: encoding', () => {
	test('plain UTF-8 has no BOM', () => {
		expect(detect(utf8('a,b\n1,2\n'))).toMatchObject({ ok: true, encoding: 'utf-8', bom: false })
	})

	test('a UTF-8 BOM is reported and does not end up in the first header', () => {
		const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('a,b\n1,2\n')])
		expect(detect(bytes)).toMatchObject({
			ok: true,
			encoding: 'utf-8',
			bom: true,
			format: 'delimited',
			delimiter: ',',
		})
	})

	test('UTF-16 with a BOM, either byte order', () => {
		expect(detect(utf16('a;b\n1;2\n', 'le', true))).toMatchObject({
			ok: true,
			encoding: 'utf-16le',
			bom: true,
			delimiter: ';',
		})
		expect(detect(utf16('a;b\n1;2\n', 'be', true))).toMatchObject({
			ok: true,
			encoding: 'utf-16be',
			bom: true,
			delimiter: ';',
		})
	})

	test('UTF-16 without a BOM is recognised from its NUL pattern', () => {
		expect(detect(utf16('a,b\n1,2\n', 'le', false))).toMatchObject({
			ok: true,
			encoding: 'utf-16le',
			bom: false,
		})
		expect(detect(utf16('a,b\n1,2\n', 'be', false))).toMatchObject({
			ok: true,
			encoding: 'utf-16be',
			bom: false,
		})
	})

	test('text that is not valid UTF-8 falls back to windows-1252', () => {
		// "café" with a single-byte é.
		const bytes = new Uint8Array([...utf8('name,city\nJos'), 0xe9, ...utf8(',Paris\n')])
		expect(detect(bytes)).toMatchObject({ ok: true, encoding: 'windows-1252', delimiter: ',' })
	})

	test('a multi-byte character cut off by the sample is still UTF-8', () => {
		const bytes = utf8('a,b\n1,é')
		const cut = bytes.slice(0, bytes.length - 1)
		expect(detect(cut, { truncated: true })).toMatchObject({ ok: true, encoding: 'utf-8' })
	})
})

describe('detect: delimiter', () => {
	test.each([
		['comma', 'a,b,c\n1,2,3\n4,5,6\n', ','],
		['semicolon', 'a;b;c\n1;2;3\n4;5;6\n', ';'],
		['tab', 'a\tb\tc\n1\t2\t3\n4\t5\t6\n', '\t'],
		['pipe', 'a|b|c\n1|2|3\n4|5|6\n', '|'],
	])('%s', (_name, text, expected) => {
		expect(delimiterOf(text)).toBe(expected)
	})

	test('a tiny semicolon file, which the parser alone cannot detect', () => {
		expect(delimiterOf('a;b\n1;2\n')).toBe(';')
	})

	test('decimal commas do not beat the real delimiter', () => {
		expect(delimiterOf('a;b\n1,5;2,5\n3,5;4,5\n')).toBe(';')
	})

	test('delimiters inside quotes are ignored', () => {
		expect(delimiterOf('a,b\n"x;y;z;w",2\n"p;q;r;s",3\n')).toBe(',')
	})

	test('a quoted newline does not split a record', () => {
		expect(delimiterOf('a;b\n"line one\nline two";2\n"x";3\n')).toBe(';')
	})

	test('the delimiter with consistent counts wins over one that varies', () => {
		expect(delimiterOf('a\tb\nx, y\tz\nfoo, bar, baz\tq\n')).toBe('\t')
	})

	test('one ragged row does not change the answer', () => {
		expect(delimiterOf('a,b,c\n1,2,3\n4,5\n6,7,8\n9,10,11\n')).toBe(',')
	})

	test('a single column falls back to a comma', () => {
		const result = detect(utf8('name\nAda\nGrace\n'))
		expect(result).toMatchObject({ ok: true, format: 'delimited', delimiter: ',', fields: 1 })
	})

	test('reports how many fields it found', () => {
		expect(detect(utf8('a;b;c\n1;2;3\n'))).toMatchObject({ delimiter: ';', fields: 3 })
	})

	test('a partial last row in a truncated sample is ignored', () => {
		expect(delimiterOf('a;b;c\n1;2;3\n4;5;6\n7;8')).toBe(';')
		const truncated = detect(utf8('a;b;c\n1;2;3\n4;5;6\n7;8'), { truncated: true })
		expect(truncated).toMatchObject({ delimiter: ';', fields: 3 })
	})

	test('blank lines are skipped', () => {
		expect(delimiterOf('a;b\n\n1;2\n\n3;4\n')).toBe(';')
	})
})

describe('detect: the sample fixture', () => {
	test('quoted JSON and tag cells full of commas do not confuse it', () => {
		expect(detect(utf8(sampleCsv))).toMatchObject({
			ok: true,
			format: 'delimited',
			delimiter: ',',
			fields: 9,
			encoding: 'utf-8',
		})
	})

	test('cutting the file anywhere still gives the same answer', () => {
		const bytes = utf8(sampleCsv)
		for (let end = 400; end < bytes.length; end += 37) {
			expect(detect(bytes.slice(0, end), { truncated: true })).toMatchObject({
				delimiter: ',',
				fields: 9,
			})
		}
	})
})

describe('detect: format', () => {
	test('a JSON array of objects', () => {
		expect(detect(utf8('[{"a":1},{"a":2}]'))).toMatchObject({ ok: true, format: 'json' })
	})

	test('a pretty-printed array, after a BOM and whitespace', () => {
		const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('\n  [\n  {"a": 1}\n]')])
		expect(detect(bytes)).toMatchObject({ ok: true, format: 'json', bom: true })
	})

	test('a single JSON object, pretty-printed, is JSON', () => {
		expect(detect(utf8('{\n  "a": 1,\n  "b": 2\n}\n'))).toMatchObject({
			ok: true,
			format: 'json',
		})
	})

	test('one object per line is NDJSON', () => {
		expect(detect(utf8('{"a":1}\n{"a":2}\n{"a":3}\n'))).toMatchObject({
			ok: true,
			format: 'ndjson',
		})
	})

	test('NDJSON with CRLF line endings and blank lines', () => {
		expect(detect(utf8('{"a":1}\r\n\r\n{"a":2}\r\n'))).toMatchObject({ format: 'ndjson' })
	})

	test('a cut-off last line does not stop NDJSON being recognised', () => {
		const result = detect(utf8('{"a":1}\n{"a":2}\n{"a":3,"b'), { truncated: true })
		expect(result).toMatchObject({ ok: true, format: 'ndjson' })
	})

	test('a bad complete line means it is not NDJSON', () => {
		expect(detect(utf8('{"a":1}\n{oops}\n{"a":3}\n'))).toMatchObject({ format: 'json' })
	})

	test('a header that merely starts with a bracket or brace is delimited', () => {
		expect(detect(utf8('[id],name\n1,Ada\n2,Grace\n'))).toMatchObject({ format: 'delimited' })
		expect(detect(utf8('{id},name\n1,Ada\n2,Grace\n'))).toMatchObject({ format: 'delimited' })
	})
})
