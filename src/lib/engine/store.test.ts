import { describe, expect, test } from 'vite-plus/test'

import { parseDelimited } from '../import/delimited'
import { parseJson } from '../import/json'
import { CELL_KIND_CODE } from '../import/types'
import { createDataset, isEmptyText, STATUS } from './store'

const csv = (text: string) => parseDelimited(text, { delimiter: ',', hasHeader: true })

describe('createDataset', () => {
	test('reads windows exactly at the start, the middle and the end', () => {
		const rows = Array.from({ length: 1000 }, (_, i) => `${i},name ${i}`)
		const dataset = createDataset(csv(['id,name', ...rows].join('\n')), ['number', 'text'])
		const ids = ['c0', 'c1']

		for (const at of [0, 500, 999]) {
			expect(dataset.window(null, at, at + 1, ids)).toEqual([
				{ row: at, text: [String(at), `name ${at}`], kinds: null },
			])
		}
		expect(dataset.window(null, 998, 5000, ids)).toHaveLength(2)
		expect(dataset.window(null, -5, 1, ids)).toHaveLength(1)
		expect(dataset.window(null, 2000, 2001, ids)).toEqual([])
	})

	test('a window follows the order of the view and the columns asked for', () => {
		const dataset = createDataset(csv('a,b\n1,x\n2,y\n3,z'), ['number', 'text'])

		expect(dataset.window(Uint32Array.of(2, 0), 0, 9, ['c1', 'nope'])).toEqual([
			{ row: 2, text: ['z', ''], kinds: null },
			{ row: 0, text: ['x', ''], kinds: null },
		])
	})

	test('counts empty and malformed over the whole column', () => {
		const dataset = createDataset(csv('n,t\n1,a\n ,b\nx,\n007,d\n'), ['number', 'text'])

		expect(dataset.info()).toMatchObject([
			{ type: 'number', empty: 1, malformed: 1 },
			{ type: 'text', empty: 1, malformed: 0 },
		])
		expect([...dataset.column('c0')!.status]).toEqual([
			STATUS.ok,
			STATUS.empty,
			STATUS.malformed,
			STATUS.ok,
		])
		expect([...dataset.column('c0')!.keys!]).toEqual([1, NaN, NaN, 7])
		expect(dataset.column('c1')!.keys).toBeNull()
	})

	test('changing a type recounts and never changes the text', () => {
		const dataset = createDataset(csv('n\n1\nx\n007'), ['text'])
		expect(dataset.info()[0]).toMatchObject({ type: 'text', malformed: 0 })

		dataset.setColumns([
			{ id: 'c0', title: 'Count', type: 'number' },
			{ id: 'gone', title: 'x', type: 'text' },
		])
		expect(dataset.info()[0]).toMatchObject({ type: 'number', title: 'Count', malformed: 1 })
		expect(dataset.column('c0')!.text).toEqual(['1', 'x', '007'])
	})

	test('JSON windows carry the kind of each cell, so null and missing can be told apart', () => {
		const result = parseJson('[{"a":null},{"b":1},{"a":""}]')
		if (!result.ok) throw new Error('expected a table')
		const dataset = createDataset(result.table, ['text', 'number'])

		expect(dataset.window(null, 0, 3, ['c0', 'c1']).map(row => row.kinds)).toEqual([
			[CELL_KIND_CODE.null, CELL_KIND_CODE.missing],
			[CELL_KIND_CODE.missing, CELL_KIND_CODE.number],
			[CELL_KIND_CODE.string, CELL_KIND_CODE.missing],
		])
		expect(dataset.info()[0]).toMatchObject({ empty: 3 })
	})
})

test.each([
	['', true],
	['  ', true],
	['\t', true],
	[' ', true],
	['﻿', true],
	['　 x', false],
	['a', false],
	[' a', false],
	['é', false],
	['0', false],
])('isEmptyText(%j) agrees with trim', (text, expected) => {
	expect(isEmptyText(text)).toBe(expected)
	expect(isEmptyText(text)).toBe(text.trim() === '')
})
