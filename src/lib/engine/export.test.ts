import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vite-plus/test'

import { openBlob } from '@/lib/import/open'
import { inferColumnTypes } from '@/lib/types/infer'
import { exportRows, exportSummary, rowJson } from './export'
import type { ExportOptions } from './export'
import { runQuery } from './query'
import { createDataset } from './store'
import { defaultView } from './view'

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`, 'utf8')

const open = async (content: string) => {
	const result = await openBlob(new Blob([content]), null)
	if (!result.ok) throw new Error(result.error.message)
	const { table } = result
	return { table, dataset: createDataset(table, inferColumnTypes(table)) }
}

const run = (
	dataset: Awaited<ReturnType<typeof open>>['dataset'],
	options: Partial<ExportOptions> = {},
	order: Uint32Array | null = null
) =>
	exportRows(dataset, order, {
		scope: 'view',
		format: 'csv',
		names: 'headers',
		escapeFormulas: false,
		columnIds: dataset.info().map(column => column.id),
		...options,
	}).join('')

describe('CSV', () => {
	test.each([
		['big ids, leading zeros, dotted headers and quoted newlines', 'tricky.csv'],
		['duplicate and blank headers', 'duplicate-headers.csv'],
		['semicolons and decimal commas', 'semicolons.csv'],
		['every type in the sample', 'sample.csv'],
	])('an unfiltered round trip keeps every value: %s', async (_, name) => {
		const before = await open(fixture(name))
		const after = await open(run(before.dataset))

		expect(after.table.rowCount).toBe(before.table.rowCount)
		expect(after.table.columns.map(column => column.header)).toEqual(
			before.table.columns.map(column => column.header)
		)
		expect(after.table.columns.map(column => column.text)).toEqual(
			before.table.columns.map(column => column.text)
		)
	})

	test('a one-column file keeps its empty values', async () => {
		const before = await open('a\n1\n\n2\n')
		const after = await open(run(before.dataset))
		expect(after.table.columns[0]!.text).toEqual(before.table.columns[0]!.text)
	})

	test('uses titles when asked, and leaves hidden columns out', async () => {
		const { dataset } = await open('a,a,b\n1,2,3\n')
		const [first, , third] = dataset.info()
		expect(run(dataset, { names: 'titles', columnIds: [third!.id, first!.id] })).toBe(
			'b,a\n3,1\n'
		)
	})

	test('formulas are escaped only when asked', async () => {
		const { dataset } = await open('f\n=1+1\n+2\n-3\n@x\nplain\n')
		expect(run(dataset)).toBe('f\n=1+1\n+2\n-3\n@x\nplain\n')
		expect(run(dataset, { escapeFormulas: true })).toBe("f\n'=1+1\n'+2\n'-3\n'@x\nplain\n")
	})

	test('the view is exported in its order, all rows in the file order', async () => {
		const { dataset } = await open('n\n2\n1\n3\n')
		const [n] = dataset.info()
		const view = { ...defaultView([n!.id]), sort: [{ columnId: n!.id, desc: false }] }
		const { order } = runQuery(dataset, view)
		expect(run(dataset, {}, order)).toBe('n\n1\n2\n3\n')
		expect(run(dataset, { scope: 'all' }, order)).toBe('n\n2\n1\n3\n')
	})
})

describe('JSON', () => {
	const json = (dataset: Awaited<ReturnType<typeof open>>['dataset'], options = {}) =>
		run(dataset, { format: 'json', ...options })

	test('keeps the original types, big numbers and nesting exactly', async () => {
		const source =
			'[{"id": 12345678901234567890, "n": 1.10, "ok": true, "none": null, "tags": [1, "a"], "s": "007"}, {"id": 2}]'
		const { dataset } = await open(source)
		const out = json(dataset)
		expect(out).toContain('"id":12345678901234567890')
		expect(out).toContain('"n":1.10')
		expect(out).toContain('"none":null')
		expect(out).toContain('"s":"007"')
		// A key that was missing stays missing.
		expect(out).toContain('{"id":2}')

		const after = await open(out)
		expect(after.table.columns.map(column => column.text)).toEqual(
			(await open(source)).table.columns.map(column => column.text)
		)
	})

	test('from delimited text, values follow the column type', async () => {
		const { dataset } = await open(fixture('tricky.csv'))
		const parsed = JSON.parse(json(dataset)) as Record<string, unknown>[]
		expect(parsed[0]!['id']).toBe('12345678901234567890')
		expect(parsed[0]!['zip']).toBe('01234')
		expect(parsed[1]!['id']).toBe('007')

		const sample = await open('n,b,j,t\n1.5,true,"{""a"": 1}",x\n,,,\n')
		expect(JSON.parse(json(sample.dataset))).toEqual([
			{ n: 1.5, b: true, j: { a: 1 }, t: 'x' },
			{ n: null, b: null, j: null, t: '' },
		])
	})

	test('repeated headers get their titles as keys, so nothing is lost', async () => {
		const { dataset } = await open('a,a\n1,2\n')
		const [row] = JSON.parse(json(dataset)) as Record<string, string>[]
		expect(Object.values(row!)).toHaveLength(2)
	})

	test('an empty view is an empty array', async () => {
		const { dataset } = await open('a\n1\n')
		expect(JSON.parse(run(dataset, { format: 'json' }, new Uint32Array(0)))).toEqual([])
	})
})

describe('rowJson', () => {
	test('types a delimited row the way an export does, keyed by title', () => {
		const columns = [
			{ title: 'id', type: 'number' as const },
			{ title: 'name', type: 'text' as const },
			{ title: 'ok', type: 'boolean' as const },
			{ title: 'big', type: 'number' as const },
			{ title: 'note', type: 'number' as const },
		]
		const text = ['007', 'Ann', 'TRUE', '12345678901234567890', '']
		expect(JSON.parse(rowJson(columns, text, null))).toEqual({
			id: '007',
			name: 'Ann',
			ok: true,
			// Too big to be a number without losing digits, so kept as written.
			big: '12345678901234567890',
			note: null,
		})
	})

	test('a JSON row keeps its kinds, and leaves out missing keys', () => {
		const columns = [
			{ title: 'a', type: 'text' as const },
			{ title: 'b', type: 'text' as const },
			{ title: 'c', type: 'text' as const },
		]
		// number, missing, null
		expect(JSON.parse(rowJson(columns, ['1', '', ''], [3, 0, 1]))).toEqual({ a: 1, c: null })
		expect(rowJson(columns, ['', '', ''], [0, 0, 0])).toBe('{}')
	})
})

describe('exportSummary', () => {
	const columns = [
		{ name: 'city', type: 'text' as const },
		{ name: 'Rows', type: 'number' as const },
		{ name: 'Sum of amount', type: 'number' as const },
		{ name: 'Earliest', type: 'date' as const },
	]
	const rows = [
		['Oslo', '3', '12.5', '2024-01-05'],
		['=x, y', '1', null, null],
		[null, '2', '7', '2024-02-01'],
	]

	test('as CSV, a group without a value or key left blank', () => {
		expect(exportSummary(columns, rows, 'csv', false).join('')).toBe(
			'city,Rows,Sum of amount,Earliest\nOslo,3,12.5,2024-01-05\n"=x, y",1,,\n,2,7,2024-02-01\n'
		)
	})

	test('formulas escaped only when asked', () => {
		expect(exportSummary(columns, [['=1', '1', null, null]], 'csv', true).join('')).toContain(
			"\n'=1,1,,\n"
		)
	})

	test('as JSON, numbers as numbers and nothing as null', () => {
		expect(JSON.parse(exportSummary(columns, rows, 'json', false).join(''))).toEqual([
			{ city: 'Oslo', Rows: 3, 'Sum of amount': 12.5, Earliest: '2024-01-05' },
			{ city: '=x, y', Rows: 1, 'Sum of amount': null, Earliest: null },
			{ city: null, Rows: 2, 'Sum of amount': 7, Earliest: '2024-02-01' },
		])
		expect(exportSummary(columns, [], 'json', false).join('')).toBe('[]\n')
	})
})
