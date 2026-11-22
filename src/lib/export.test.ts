import { describe, expect, test } from 'vite-plus/test'

import type { Column } from '@/store/project'
import { processDataForExport, serialize } from './export'

const column = (key: string, overrides: Partial<Column> = {}): Column => ({
	key,
	title: key,
	hidden: false,
	data_type: 'text',
	...overrides,
})

describe('processDataForExport', () => {
	const rows = [{ id: 1, name: 'Ada', age: 36 }]

	test('drops hidden columns', () => {
		const columns = [column('id'), column('name', { hidden: true }), column('age')]

		expect(processDataForExport(columns, rows, { useTitle: false })).toEqual([{ id: 1, age: 36 }])
	})

	test('uses keys by default and titles when asked', () => {
		const columns = [column('id'), column('name', { title: 'Full Name' })]

		expect(processDataForExport(columns, rows, { useTitle: false })).toEqual([
			{ id: 1, name: 'Ada' },
		])
		expect(processDataForExport(columns, rows, { useTitle: true })).toEqual([
			{ id: 1, 'Full Name': 'Ada' },
		])
	})

	test('follows the order of the columns, not of the row', () => {
		const columns = [column('age'), column('id'), column('name')]
		const [row] = processDataForExport(columns, rows, { useTitle: false })

		expect(Object.keys(row!)).toEqual(['age', 'id', 'name'])
	})

	test('replaces missing and null values with an empty string', () => {
		const columns = [column('id'), column('name'), column('age')]

		expect(processDataForExport(columns, [{ id: 1, name: null }], { useTitle: false })).toEqual([
			{ id: 1, name: '', age: '' },
		])
	})

	test('keeps falsy values that are not missing', () => {
		const columns = [column('zero'), column('no')]

		expect(processDataForExport(columns, [{ zero: 0, no: false }], { useTitle: false })).toEqual([
			{ zero: 0, no: false },
		])
	})

	test('does not change the source rows', () => {
		const source = [{ id: 1, name: null }]
		processDataForExport([column('name', { title: 'Name' })], source, { useTitle: true })

		expect(source).toEqual([{ id: 1, name: null }])
	})
})

describe('serialize', () => {
	test('writes JSON with a 3-space indent', () => {
		expect(serialize([{ id: 1, name: 'Ada' }], 'json')).toBe(
			'[\n   {\n      "id": 1,\n      "name": "Ada"\n   }\n]'
		)
	})

	test('writes CSV with a header and quotes where needed', () => {
		expect(serialize([{ id: 1, name: 'Lovelace, "Ada"' }], 'csv')).toBe(
			'id,name\n1,"Lovelace, ""Ada"""'
		)
	})

	test('keeps nested objects in one CSV column', () => {
		const data = [{ id: 1, meta: { a: 1 } }] as unknown as Parameters<typeof serialize>[0]

		expect(serialize(data, 'csv')).toBe('id,meta\n1,"{""a"":1}"')
	})
})
