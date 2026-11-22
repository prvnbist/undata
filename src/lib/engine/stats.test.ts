import { describe, expect, test } from 'vite-plus/test'

import type { DataType } from '../constants'
import { parseDelimited } from '../import/delimited'
import { filterRows } from './filter'
import { columnStats } from './stats'
import { createDataset } from './store'
import { defaultView } from './view'

const make = (type: DataType, values: string[]) =>
	createDataset(
		parseDelimited(`a,b\n${values.map(v => `"${v}",x`).join('\n')}`, {
			delimiter: ',',
			hasHeader: true,
		}),
		[type]
	)

const stats = (type: DataType, values: string[], rows: Uint32Array | null = null) =>
	columnStats(make(type, values), rows, 'c0')!

describe('columnStats', () => {
	test('counts rows, empties, malformed and distinct values', () => {
		expect(stats('number', ['1', '2', '2', '', 'x', 'x'])).toMatchObject({
			rows: 6,
			empty: 1,
			malformed: 2,
			distinct: 3,
		})
	})

	test('top values are by raw text, most frequent first, without empties', () => {
		expect(stats('text', ['b', 'a', 'b', '', '', '', 'c', 'a']).top).toEqual([
			{ value: 'b', count: 2 },
			{ value: 'a', count: 2 },
			{ value: 'c', count: 1 },
		])
	})

	test('at most 20 top values', () => {
		const result = stats(
			'text',
			Array.from({ length: 100 }, (_, i) => `v${i}`)
		)
		expect(result.top).toHaveLength(20)
		expect(result.distinct).toBe(100)
	})

	test('min, max and mean of numbers, shown as written', () => {
		expect(stats('number', ['10.0', '2', 'x', '', '9']).range).toEqual({
			min: '2',
			max: '10.0',
			mean: 7,
		})
	})

	test('dates have a range and no mean, text has neither', () => {
		expect(stats('date', ['2024-03-01', '2024-01-01']).range).toEqual({
			min: '2024-01-01',
			max: '2024-03-01',
			mean: null,
		})
		expect(stats('text', ['b', 'a']).range).toBeNull()
		expect(stats('text', ['b', 'a']).histogram).toBeNull()
	})

	test('a boolean is shown as values, not as a histogram', () => {
		const result = stats('boolean', ['true', 'false', 'true'])
		expect(result.histogram).toBeNull()
		expect(result.top[0]).toEqual({ value: 'true', count: 2 })
	})

	test('only the given rows count', () => {
		expect(stats('number', ['1', '2', '30'], Uint32Array.of(0, 1))).toMatchObject({
			rows: 2,
			distinct: 2,
			range: { min: '1', max: '2', mean: 1.5 },
		})
	})

	test.each<DataType>(['number', 'date', 'text', 'boolean'])('all-empty %s column', type => {
		expect(stats(type, ['', '', ''])).toMatchObject({
			rows: 3,
			empty: 3,
			malformed: 0,
			distinct: 0,
			top: [],
			range: null,
			histogram: null,
		})
	})

	test('no rows at all', () => {
		expect(stats('number', ['1'], new Uint32Array())).toMatchObject({ rows: 0, histogram: null })
	})

	test('an unknown column is null', () => {
		expect(columnStats(make('text', ['a']), null, 'gone')).toBeNull()
	})
})

describe('histogram', () => {
	test('a constant column is one bar that includes its value', () => {
		expect(stats('number', ['5', '5', '5']).histogram).toEqual([
			{ min: '5', max: '5', includeMax: true, count: 3 },
		])
	})

	test('edges are round and the ends are the data', () => {
		const bins = stats(
			'number',
			Array.from({ length: 98 }, (_, i) => String(i + 1))
		).histogram!
		expect(bins.slice(0, 2)).toEqual([
			{ min: '1', max: '5', includeMax: false, count: 4 },
			{ min: '5', max: '10', includeMax: false, count: 5 },
		])
		expect(bins.at(-1)).toEqual({ min: '95', max: '98', includeMax: true, count: 4 })
	})

	const random = (seed: number) => () => {
		seed = (seed * 1103515245 + 12345) % 2147483648
		return seed / 2147483648
	}

	test.each<[DataType, (n: number) => string]>([
		['number', n => String(Math.round(n * 1000) / 100 - 5)],
		['number', n => String(n * 1e-7)],
		['number', n => String(Math.floor(n * 1e12))],
		['date', n => new Date(n * 4e11).toISOString().slice(0, 10)],
		['date', n => new Date(Date.UTC(2024, 0, 1 + n * 5)).toISOString().slice(0, 10)],
		['timestamp', n => new Date(n * 1e8).toISOString().slice(0, 19)],
		['timestamptz', n => new Date(n * 4000).toISOString()],
		['time', n => new Date(n * 86_399_000).toISOString().slice(11, 19)],
		['timetz', n => new Date(n * 30_000).toISOString().slice(11, 24)],
	])('every %s bar holds exactly what its filter finds', (type, text) => {
		const next = random(42)
		const values = Array.from({ length: 400 }, () => text(next()))
		const dataset = make(type, values)
		const bins = columnStats(dataset, null, 'c0')!.histogram!

		expect(bins.length).toBeGreaterThan(1)
		expect(bins.length).toBeLessThanOrEqual(22)
		expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(400)

		for (const { min, max, includeMax, count } of bins) {
			const filters = [{ columnId: 'c0', op: 'between' as const, min, max, includeMax }]
			expect(filterRows(dataset, { ...defaultView([]), filters })).toHaveLength(count)
		}
	})

	test('extreme dates do not throw', () => {
		const bins = stats('date', ['0000-01-01', '9999-12-31']).histogram!
		expect(bins[0]!.min).toBe('0000-01-01')
		expect(bins.at(-1)!.max).toBe('9999-12-31')
	})
})
