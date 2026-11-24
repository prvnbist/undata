import { describe, expect, test } from 'vite-plus/test'

import type { DataType } from '../constants'
import { parseDelimited } from '../import/delimited'
import { aggregatesFor, groupRows } from './group'
import { createDataset } from './store'
import type { Grouping } from './view'

// city (text), kind (text), amount (number), when (date)
const csv = `city,kind,amount,when
Oslo,a,10,2024-01-05
Lima,b,5,2024-03-01
Oslo,b,x,2023-12-31
,a,7,
Oslo,a,2.5,2024-02-02
 ,b,1,2024-01-01
Lima,b,,2024-06-30`

const dataset = (types: DataType[] = ['text', 'text', 'number', 'date']) =>
	createDataset(parseDelimited(csv, { delimiter: ',', hasHeader: true }), types)

const group = (grouping: Partial<Grouping>, order: Uint32Array | null = null) => {
	const table = groupRows(dataset(), order, { by: [], aggregates: [], sort: [], ...grouping })
	return { ...table.summary, rows: table.window(0, 1000) }
}

describe('groupRows', () => {
	test('counts by one column, with empty cells as one group, ordered by the column', () => {
		const { groupCount, rows } = group({ by: ['c0'] })
		expect(groupCount).toBe(3)
		expect(rows.map(row => [row.keys, row.empty, row.count])).toEqual([
			[['Lima'], [false], 2],
			[['Oslo'], [false], 3],
			// "" and " " are both empty.
			[[''], [true], 2],
		])
		expect(rows.map(row => row.index)).toEqual([0, 1, 2])
	})

	test('by several columns, every combination that occurs', () => {
		const { rows } = group({ by: ['c0', 'c1'] })
		expect(rows.map(row => [...row.keys, row.count])).toEqual([
			['Lima', 'b', 2],
			['Oslo', 'a', 2],
			['Oslo', 'b', 1],
			['', 'a', 1],
			['', 'b', 1],
		])
	})

	test('sum, avg, min and max leave out malformed values and count them', () => {
		const { rows, malformed } = group({
			by: ['c0'],
			aggregates: [
				{ columnId: 'c2', fn: 'sum' },
				{ columnId: 'c2', fn: 'avg' },
				{ columnId: 'c2', fn: 'min' },
				{ columnId: 'c3', fn: 'max' },
			],
		})
		expect(malformed).toEqual([1, 1, 1, 0])
		expect(rows.map(row => [row.keys[0], ...row.values])).toEqual([
			// Lima has an empty amount: not malformed, just no value.
			['Lima', '5', '5', '5', '2024-06-30'],
			['Oslo', '12.5', '6.25', '2.5', '2024-02-02'],
			['', '8', '4', '1', '2024-01-01'],
		])
	})

	test('a group with no values has null aggregates', () => {
		const table = groupRows(dataset(), Uint32Array.of(2), {
			by: ['c0'],
			aggregates: [{ columnId: 'c2', fn: 'sum' }],
			sort: [],
		})
		expect(table.window(0, 1)).toEqual([
			{ index: 0, keys: ['Oslo'], empty: [false], count: 1, values: [null] },
		])
		expect(table.summary.malformed).toEqual([1])
	})

	test('only the rows of the view are grouped', () => {
		const { rows } = group({ by: ['c1'] }, Uint32Array.of(0, 1, 4))
		expect(rows.map(row => [row.keys[0], row.count])).toEqual([
			['a', 2],
			['b', 1],
		])
	})

	test('sorts by count, by an aggregate, or by the column descending, ties in first-seen order', () => {
		const sum = { columnId: 'c2', fn: 'sum' as const }
		const keysOf = (grouping: Partial<Grouping>) =>
			group({ by: ['c0'], aggregates: [sum], ...grouping }).rows.map(row => row.keys[0])

		expect(keysOf({ sort: [{ key: 'count', desc: true }] })).toEqual(['Oslo', 'Lima', ''])
		expect(keysOf({ sort: [{ key: 'sum:c2', desc: false }] })).toEqual(['Lima', '', 'Oslo'])
		// The empty group stays last either way.
		expect(keysOf({ sort: [{ key: 'c0', desc: true }] })).toEqual(['Oslo', 'Lima', ''])
		expect(keysOf({ sort: [{ key: 'count', desc: false }] })).toEqual(['Lima', '', 'Oslo'])
	})

	test('number groups are ordered as numbers', () => {
		const table = groupRows(
			createDataset(parseDelimited('n\n10\n9\n100\n9', { delimiter: ',', hasHeader: true }), [
				'number',
			]),
			null,
			{ by: ['c0'], aggregates: [], sort: [] }
		)
		expect(table.window(0, 10).map(row => [row.keys[0], row.count])).toEqual([
			['9', 2],
			['10', 1],
			['100', 1],
		])
	})

	test('no grouped column is one group of every row, and no rows is no groups', () => {
		expect(group({}).rows).toEqual([{ index: 0, keys: [], empty: [], count: 7, values: [] }])
		expect(group({ by: ['c0'] }, new Uint32Array(0)).groupCount).toBe(0)
	})

	test('a million distinct groups are counted, and read a window at a time', () => {
		const rows = 1_000_000
		const text = Array.from({ length: rows }, (_, i) => `id${i}`)
		const big = createDataset(
			{ columns: [{ id: 'c0', header: 'id', title: 'id', text }], rowCount: rows, warnings: [] },
			['text']
		)
		const table = groupRows(big, null, {
			by: ['c0'],
			aggregates: [],
			sort: [{ key: 'count', desc: true }],
		})
		expect(table.summary.groupCount).toBe(rows)
		expect(table.window(rows - 1, rows + 5)).toHaveLength(1)
	})
})

describe('aggregatesFor', () => {
	test('numbers add up, ordered types have a range, others have neither', () => {
		expect(aggregatesFor('number')).toEqual(['sum', 'avg', 'min', 'max'])
		expect(aggregatesFor('date')).toEqual(['min', 'max'])
		expect(aggregatesFor('boolean')).toEqual([])
		expect(aggregatesFor('text')).toEqual([])
	})
})
