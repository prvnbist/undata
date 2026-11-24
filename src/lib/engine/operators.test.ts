import { describe, expect, test } from 'vite-plus/test'

import {
	describeFilter,
	draftFor,
	fitsColumns,
	operatorLabel,
	operatorsFor,
	toFilter,
} from './operators'
import type { Filter } from './view'

describe('operatorsFor', () => {
	test('text has text tests, and nothing about validity', () => {
		expect(operatorsFor('text')).toEqual([
			'contains',
			'notContains',
			'anyOf',
			'noneOf',
			'regex',
			'empty',
			'notEmpty',
		])
	})

	test('numbers and dates compare, and every typed column can be malformed', () => {
		for (const type of ['number', 'date', 'timestamp', 'time'] as const) {
			const ops = operatorsFor(type)
			expect(ops).toEqual(
				expect.arrayContaining(['eq', 'gt', 'gte', 'lt', 'lte', 'between', 'malformed'])
			)
			expect(ops).not.toContain('regex')
		}
		expect(operatorsFor('boolean')).toEqual([
			'eq',
			'empty',
			'notEmpty',
			'malformed',
			'notMalformed',
		])
		expect(operatorsFor('url')).toContain('malformed')
		expect(operatorsFor('url')).not.toContain('gt')
	})

	test('comparisons read as words for dates and times, and as symbols for numbers', () => {
		expect(operatorLabel('number', 'gt')).toBe('>')
		expect(operatorLabel('date', 'gt')).toBe('is after')
		expect(operatorLabel('time', 'lte')).toBe('is at or before')
		expect(operatorLabel('number', 'malformed')).toBe('is not a valid number')
	})
})

describe('drafts', () => {
	test('a draft becomes the filter for its operator, trimming nothing', () => {
		const draft = { ...draftFor('a', 'number'), op: 'between' as const, min: '1', max: ' 5' }
		expect(toFilter(draft)).toEqual({
			columnId: 'a',
			op: 'between',
			min: '1',
			max: ' 5',
			includeMax: true,
		})
		expect(toFilter({ ...draft, op: 'empty' })).toEqual({ columnId: 'a', op: 'empty' })
		expect(toFilter({ ...draft, op: 'anyOf', values: ['x', 'y'] })).toEqual({
			columnId: 'a',
			op: 'anyOf',
			values: ['x', 'y'],
		})
		expect(toFilter({ ...draft, op: 'contains', value: 'x' })).toEqual({
			columnId: 'a',
			op: 'contains',
			value: 'x',
		})
	})

	test('a filter round-trips through its draft, keeping a half-open range', () => {
		const filters: Filter[] = [
			{ columnId: 'a', op: 'between', min: '1', max: '2', includeMax: false },
			{ columnId: 'a', op: 'noneOf', values: ['x'] },
			{ columnId: 'a', op: 'regex', value: '^a' },
			{ columnId: 'a', op: 'malformed' },
		]
		for (const filter of filters)
			expect(toFilter(draftFor('a', 'number', filter))).toEqual(filter)
	})

	test('a new draft starts on the first operator of the type', () => {
		expect(draftFor('a', 'text').op).toBe('contains')
		expect(draftFor('a', 'number').op).toBe('eq')
	})
})

describe('describeFilter', () => {
	test('reads as a short sentence', () => {
		const at = (filter: Filter, type: Parameters<typeof describeFilter>[2] = 'text') =>
			describeFilter(filter, 'City', type)
		expect(at({ columnId: 'c', op: 'contains', value: 'os' })).toBe('City contains “os”')
		expect(at({ columnId: 'c', op: 'anyOf', values: ['Oslo', 'Lima'] })).toBe(
			'City is any of Oslo, Lima'
		)
		expect(at({ columnId: 'c', op: 'gte', value: '3' }, 'number')).toBe('City ≥ 3')
		expect(
			at({ columnId: 'c', op: 'between', min: '1', max: '2', includeMax: true }, 'number')
		).toBe('City is between 1 and 2')
		expect(at({ columnId: 'c', op: 'empty' })).toBe('City is empty')
	})

	test('a long list of values is cut short', () => {
		const values = ['a', 'b', 'c', 'd', 'e']
		expect(describeFilter({ columnId: 'c', op: 'anyOf', values }, 'X', 'text')).toBe(
			'X is any of a, b, c and 2 more'
		)
	})
})

describe('fitsColumns', () => {
	const columns = [
		{ id: 'n', type: 'number' as const },
		{ id: 't', type: 'text' as const },
	]

	test('keeps filters that still fit their column, and says which were dropped', () => {
		const filters: Filter[] = [
			{ columnId: 'n', op: 'gt', value: '3' },
			{ columnId: 't', op: 'gt', value: '3' },
			{ columnId: 'gone', op: 'empty' },
			{ columnId: 't', op: 'contains', value: 'x' },
		]
		expect(fitsColumns(filters, columns)).toEqual({
			kept: [filters[0], filters[3]],
			dropped: 2,
		})
	})
})
