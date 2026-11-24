import { describe, expect, test } from 'vite-plus/test'

import { makeXlsx, oleFile, sheetXml } from '../../../tests/fixtures/makeXlsx'
import { openBlob } from './open'
import type { ImportOptions } from './types'

const open = (content: BlobPart, options: ImportOptions | null = null) =>
	openBlob(new Blob([content]), options)

// A blob of many parts is streamed part by part.
const inParts = (text: string, size: number) => {
	const bytes = new TextEncoder().encode(text)
	const parts = Array.from({ length: Math.ceil(bytes.length / size) }, (_, i) =>
		bytes.slice(i * size, (i + 1) * size)
	)
	return new Blob(parts)
}

const opened = async (content: BlobPart, options: ImportOptions | null = null) => {
	const result = await open(content, options)
	if (!result.ok) throw new Error(result.error.message)
	return result
}

describe('openBlob', () => {
	test('opens delimited text, JSON and NDJSON', async () => {
		const delimited = await opened('a;b\n1;2\n')
		expect(delimited.options).toEqual({
			format: 'delimited',
			delimiter: ';',
			encoding: 'utf-8',
			hasHeader: true,
		})
		expect(delimited.table.columns.map(c => c.text)).toEqual([['1'], ['2']])

		expect((await opened('[{"a":1}]')).options.format).toBe('json')
		expect((await opened('{"a":1}\n{"a":2}\n')).options.format).toBe('ndjson')
	})

	test.each([
		['', 'empty'],
		['\n\n', 'empty'],
		[Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 1), 'binary'],
		['[{"a":1},', 'invalid-json'],
		['[1,2]', 'no-records'],
	])('%j fails as %s', async (content, code) => {
		expect(await open(content as BlobPart)).toMatchObject({ ok: false, error: { code } })
	})

	test('an invalid JSON file says where', async () => {
		expect(await open('[{"a":1},\n{"a":}]')).toMatchObject({
			error: { position: { line: 2, column: 6 } },
		})
	})

	test('options are followed instead of guessed', async () => {
		const { table } = await opened('a;b\n1;2\n', {
			format: 'delimited',
			delimiter: ',',
			encoding: 'utf-8',
			hasHeader: false,
		})
		expect(table.columns.map(c => c.text)).toEqual([['a;b', '1;2']])
	})

	test('a multi-byte character is never split, wherever the pieces end', async () => {
		const value = '日本😀'.repeat(60_000)
		const result = await openBlob(inParts(`a,b\n1,${value}\n`, 1001), null)
		if (!result.ok) throw new Error(result.error.message)
		expect(result.options).toMatchObject({ encoding: 'utf-8' })
		expect(result.table.columns[1]!.text[0] === value).toBe(true)
	})

	test('bytes that stop being UTF-8 after the sample are read as Windows-1252', async () => {
		const ascii = new TextEncoder().encode('a,b\n' + 'x,y\n'.repeat(40_000))
		const latin = Uint8Array.of(0x63, 0xe9, 0x2c, 0x31, 0x0a) // "cé,1\n"
		const result = await openBlob(new Blob([ascii, latin]), null)

		if (!result.ok) throw new Error(result.error.message)
		expect(result.options).toMatchObject({ encoding: 'windows-1252' })
		expect(result.table.columns[0]!.text.at(-1)).toBe('cé')
		expect(result.table.rowCount).toBe(40_001)
	})

	test('UTF-16 and a BOM are read', async () => {
		const text = '﻿a,b\n1,é\n'
		const bytes = new Uint8Array(text.length * 2)
		for (let i = 0; i < text.length; i++) {
			bytes[i * 2] = text.charCodeAt(i) & 0xff
			bytes[i * 2 + 1] = text.charCodeAt(i) >> 8
		}
		const { table } = await opened(bytes)
		expect(table.columns.map(c => [c.header, ...c.text])).toEqual([
			['a', '1'],
			['b', 'é'],
		])
	})

	test('reports progress up to the whole file', async () => {
		const seen: number[] = []
		await openBlob(inParts('a,b\n' + '1,2\n'.repeat(200_000), 100_000), null, p =>
			seen.push(p.ratio)
		)
		expect(seen.length).toBeGreaterThan(1)
		expect(seen.at(-1)).toBe(1)
		expect(seen).toEqual([...seen].sort((a, b) => a - b))
	})
})

describe('openBlob with a workbook', () => {
	test('reads the only sheet, and says which it was', async () => {
		const bytes = await makeXlsx({
			sheets: [
				{
					name: 'Sales',
					xml: sheetXml('<row><c t="str"><v>a</v></c></row><row><c><v>1</v></c></row>'),
				},
			],
		})
		const result = await opened(bytes)
		expect(result.options).toEqual({ format: 'xlsx', sheet: 'Sales', hasHeader: true })
		expect(result.table.columns[0]!.text).toEqual(['1'])
	})

	test('with several sheets, asks which, and opens the one named', async () => {
		const sheet = (name: string, value: string) => ({
			name,
			xml: sheetXml(`<row><c t="str"><v>a</v></c></row><row><c><v>${value}</v></c></row>`),
		})
		const bytes = await makeXlsx({ sheets: [sheet('One', '1'), sheet('Two', '2')] })
		expect(await open(bytes)).toEqual({
			ok: false,
			error: {
				code: 'choose-sheet',
				message: 'Choose a sheet to open.',
				position: null,
				sheets: ['One', 'Two'],
			},
		})
		const two = await opened(bytes, { format: 'xlsx', sheet: 'Two', hasHeader: true })
		expect(two.table.columns[0]!.text).toEqual(['2'])
	})

	test('a password-protected workbook says so', async () => {
		expect(await open(oleFile(true))).toMatchObject({ ok: false, error: { code: 'encrypted' } })
	})
})
