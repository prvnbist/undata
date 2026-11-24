import { describe, expect, test } from 'vite-plus/test'

import type { DataType } from '../constants'
import { parseDelimited } from '../import/delimited'
import { sortRows } from './sort'
import { createDataset } from './store'

const make = (text: string, types: DataType[]) =>
	createDataset(parseDelimited(text, { delimiter: ',', hasHeader: true }), types)

// The values of one column in sorted order.
const sorted = (type: DataType, values: string[], desc = false) => {
	const dataset = make(`a,b\n${values.map(v => `"${v.replaceAll('"', '""')}",x`).join('\n')}`, [
		type,
	])
	const order = sortRows(dataset, null, [{ columnId: 'c0', desc }])!
	return [...order].map(row => values[row])
}

describe('sortRows', () => {
	test.each<[DataType, string[], string[]]>([
		['number', ['10', '9', '-1', '1e1', '2.5'], ['-1', '2.5', '9', '10', '1e1']],
		['text', ['b', 'a', 'B', '10', '9'], ['10', '9', 'B', 'a', 'b']],
		['boolean', ['true', 'no', 'YES', 'false'], ['no', 'false', 'true', 'YES']],
		['time', ['14:00', '9:30', '09:29:59'], ['09:29:59', '9:30', '14:00']],
		['timetz', ['12:00+02:00', '11:00Z'], ['12:00+02:00', '11:00Z']],
		[
			'date',
			['2024-02-01', '0099-01-01', '2023-12-31'],
			['0099-01-01', '2023-12-31', '2024-02-01'],
		],
		[
			'timestamptz',
			['2024-01-01T10:00:00Z', '2024-01-01T11:30:00+02:00'],
			['2024-01-01T11:30:00+02:00', '2024-01-01T10:00:00Z'],
		],
	])('%s', (type, input, expected) => {
		expect(sorted(type, input)).toEqual(expected)
	})

	test('empty and malformed are last in both directions, in source order', () => {
		const values = ['x', '2', '', '1', 'y', '3']
		expect(sorted('number', values)).toEqual(['1', '2', '3', 'x', '', 'y'])
		expect(sorted('number', values, true)).toEqual(['3', '2', '1', 'x', '', 'y'])
		expect(sorted('text', ['b', '', 'a'], true)).toEqual(['b', 'a', ''])
	})

	test('rows that tie keep source order in both directions', () => {
		const dataset = make('a,b\n1,p\n2,q\n1,r\n2,s', ['number', 'text'])
		const order = (desc: boolean) => [...sortRows(dataset, null, [{ columnId: 'c0', desc }])!]
		expect(order(false)).toEqual([0, 2, 1, 3])
		expect(order(true)).toEqual([1, 3, 0, 2])
	})

	test('repeated and distinct text sort the same way', () => {
		const values = Array.from({ length: 500 }, (_, i) => `v${(i * 7919) % 500}`)
		const repeated = Array.from({ length: 500 }, (_, i) => `v${(i * 7919) % 20}`)
		for (const list of [values, repeated]) {
			const expected = list.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))
			expect(sorted('text', list)).toEqual(expected)
			expect(sorted('text', list, true)).toEqual(expected.toReversed())
		}
	})

	test('a changed type sorts by the new type', () => {
		const dataset = make('a,b\n10,x\n9,x', ['text'])
		const sort = [{ columnId: 'c0', desc: false }]
		expect([...sortRows(dataset, null, sort)!]).toEqual([0, 1])
		dataset.setColumns([{ id: 'c0', title: 'a', type: 'number' }])
		expect([...sortRows(dataset, null, sort)!]).toEqual([1, 0])
	})

	test('several keys, each in its own direction', () => {
		const dataset = make('a,b\nx,1\ny,2\nx,3\n,9\ny,\n', ['text', 'number'])
		const order = sortRows(dataset, null, [
			{ columnId: 'c0', desc: false },
			{ columnId: 'c1', desc: true },
		])!
		expect([...order]).toEqual([2, 0, 1, 4, 3])
	})

	test('sorts only the rows it is given and leaves them alone', () => {
		const dataset = make('a,b\n3,x\n1,x\n2,x', ['number'])
		const rows = Uint32Array.of(0, 2)
		expect([...sortRows(dataset, rows, [{ columnId: 'c0', desc: false }])!]).toEqual([2, 0])
		expect([...rows]).toEqual([0, 2])
	})

	test('no keys, or only unknown columns, changes nothing', () => {
		const dataset = make('a,b\n3,x\n1,x', ['number'])
		const rows = Uint32Array.of(1)
		expect(sortRows(dataset, null, [])).toBeNull()
		expect(sortRows(dataset, rows, [{ columnId: 'gone', desc: true }])).toBe(rows)
	})
})
