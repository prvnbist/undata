import { describe, expect, test } from 'vite-plus/test'

import type { Filter } from '@/lib/engine/view'
import { mergeFilter } from './mergeFilter'

const is = (columnId: string, ...values: string[]): Filter => ({ columnId, op: 'anyOf', values })
const isNot = (columnId: string, ...values: string[]): Filter => ({
	columnId,
	op: 'noneOf',
	values,
})

describe('mergeFilter', () => {
	test('a new column gets its own filter at the end', () => {
		expect(mergeFilter([is('a', 'x')], is('b', 'y'))).toEqual([is('a', 'x'), is('b', 'y')])
	})

	test('another value for the same column joins its list, in place', () => {
		const filters = [is('a', 'x'), { columnId: 'b', op: 'empty' } as Filter]
		expect(mergeFilter(filters, is('a', 'y'))).toEqual([is('a', 'x', 'y'), filters[1]])
		expect(mergeFilter([isNot('a', 'x')], isNot('a', 'y'))).toEqual([isNot('a', 'x', 'y')])
	})

	test('a value already listed changes nothing', () => {
		const filters = [is('a', 'x')]
		expect(mergeFilter(filters, is('a', 'x'))).toBe(filters)
	})

	test('is and is not on the same value cancel out', () => {
		expect(mergeFilter([isNot('a', 'x', 'y')], is('a', 'x'))).toEqual([
			isNot('a', 'y'),
			is('a', 'x'),
		])
		// The last value going takes the filter with it.
		expect(mergeFilter([is('a', 'x')], isNot('a', 'x'))).toEqual([isNot('a', 'x')])
	})

	test('empty and malformed replace their opposites, and are never doubled', () => {
		const empty: Filter = { columnId: 'a', op: 'empty' }
		const notEmpty: Filter = { columnId: 'a', op: 'notEmpty' }
		expect(mergeFilter([notEmpty], empty)).toEqual([empty])
		expect(mergeFilter([empty], empty)).toEqual([empty])
		expect(
			mergeFilter([{ columnId: 'a', op: 'malformed' }], { columnId: 'a', op: 'notMalformed' })
		).toEqual([{ columnId: 'a', op: 'notMalformed' }])
		// Different columns are left alone.
		expect(mergeFilter([{ columnId: 'b', op: 'empty' }], notEmpty)).toHaveLength(2)
	})

	test('an identical comparison is not added twice', () => {
		const gt: Filter = { columnId: 'a', op: 'gt', value: '3' }
		expect(mergeFilter([gt], { ...gt })).toEqual([gt])
		expect(mergeFilter([gt], { ...gt, value: '4' })).toHaveLength(2)
	})
})
