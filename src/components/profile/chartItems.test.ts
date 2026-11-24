import { describe, expect, test } from 'vite-plus/test'

import type { ColumnStats } from '@/lib/engine/stats'
import { chartItems, chartSummary } from './chartItems'

const base: ColumnStats = {
	rows: 10,
	empty: 0,
	malformed: 0,
	distinct: 0,
	top: [],
	range: null,
	histogram: null,
}

describe('chartItems', () => {
	test('a histogram is a bar per bin, each filtering to its range', () => {
		const stats: ColumnStats = {
			...base,
			rows: 6,
			histogram: [
				{ min: '0', max: '10', includeMax: false, count: 4 },
				{ min: '10', max: '20', includeMax: true, count: 2 },
			],
		}
		const items = chartItems(stats, 'number', 'n')
		expect(items.map(item => [item.label, item.share, item.tone])).toEqual([
			['0 to 10: 4 rows', 1, 'value'],
			['10 to 20: 2 rows', 0.5, 'value'],
		])
		expect(items[0]!.filter).toEqual({
			columnId: 'n',
			op: 'between',
			min: '0',
			max: '10',
			includeMax: false,
		})
	})

	test('without one, the top values, then empty and malformed', () => {
		const stats: ColumnStats = {
			...base,
			rows: 9,
			empty: 2,
			malformed: 1,
			top: [
				{ value: 'Oslo', count: 4 },
				{ value: 'Lima', count: 2 },
			],
		}
		const items = chartItems(stats, 'url', 'c')
		expect(items.map(item => [item.label, item.tone])).toEqual([
			['“Oslo”: 4 rows', 'value'],
			['“Lima”: 2 rows', 'value'],
			['Empty: 2 rows', 'empty'],
			['Not valid: 1 row', 'malformed'],
		])
		expect(items[0]!.filter).toEqual({ columnId: 'c', op: 'anyOf', values: ['Oslo'] })
		expect(items[2]!.filter).toEqual({ columnId: 'c', op: 'empty' })
		expect(items[3]!.filter).toEqual({ columnId: 'c', op: 'malformed' })
	})

	test('at most eight top values, and nothing for counts of zero', () => {
		const top = Array.from({ length: 20 }, (_, i) => ({ value: `v${i}`, count: 20 - i }))
		const items = chartItems({ ...base, top }, 'text', 'c')
		expect(items).toHaveLength(8)
	})

	test('a column with no rows has no bars', () => {
		expect(chartItems({ ...base, rows: 0 }, 'text', 'c')).toEqual([])
	})
})

describe('chartSummary', () => {
	test('says what the chart shows, in words', () => {
		expect(
			chartSummary({
				...base,
				rows: 200,
				empty: 10,
				malformed: 2,
				distinct: 30,
				range: { min: '1', max: '99', mean: 50 },
				histogram: [{ min: '0', max: '100', includeMax: true, count: 188 }],
			})
		).toBe('From 1 to 99. 5% empty. 1% not valid.')
		expect(chartSummary({ ...base, rows: 3, distinct: 2, top: [{ value: 'a', count: 2 }] })).toBe(
			'2 distinct values, most often “a”.'
		)
		expect(chartSummary({ ...base, rows: 0 })).toBe('No rows.')
	})
})
