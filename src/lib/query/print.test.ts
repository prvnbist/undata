import { describe, expect, test } from 'vite-plus/test'

import { defaultView } from '@/lib/engine/view'
import type { Filter, ViewState } from '@/lib/engine/view'

import { compileQuery } from './compile'
import type { QueryColumn } from './compile'
import { columnName, printQuery } from './print'

const columns: QueryColumn[] = [
	{ id: 'c0', title: 'name', type: 'text' },
	{ id: 'c1', title: 'amount', type: 'number' },
	{ id: 'c2', title: 'Joined On', type: 'date' },
	{ id: 'c3', title: 'paid', type: 'boolean' },
	{ id: 'c4', title: 'order', type: 'text' },
	{ id: 'c5', title: 'say "hi"', type: 'text' },
	{ id: 'c6', title: 'größe', type: 'number' },
	{ id: 'c7', title: 'tags', type: 'tag' },
]
const base = defaultView(columns.map(column => column.id))

const roundTrip = (view: ViewState) => {
	const text = printQuery(view, columns)
	const result = compileQuery(text, columns, view)
	if (!result.ok) throw new Error(`${result.error.message}\n${text}`)
	expect(result.value, text).toEqual(view)
	// Printing what it read gives the same text.
	expect(printQuery(result.value, columns)).toBe(text)
	return text
}

describe('printQuery', () => {
	test('the default view is SELECT *', () => {
		expect(printQuery(base, columns)).toBe('SELECT *')
	})

	test('one clause to a line, conditions joined with AND', () => {
		const view: ViewState = {
			...base,
			search: "it's",
			filters: [
				{ columnId: 'c1', op: 'gt', value: '5' },
				{ columnId: 'c0', op: 'anyOf', values: ['Ann'] },
			],
			sort: [{ columnId: 'c2', desc: true }],
		}
		expect(printQuery(view, columns)).toBe(
			[
				'SELECT *',
				`WHERE amount > 5`,
				`  AND name = 'Ann'`,
				`  AND search('it''s')`,
				'ORDER BY "Joined On" DESC',
			].join('\n')
		)
	})

	test('names that are not plain words are quoted', () => {
		expect(columns.map(column => columnName(column, columns))).toEqual([
			'name',
			'amount',
			'"Joined On"',
			'paid',
			'"order"',
			'"say ""hi"""',
			'größe',
			'tags',
		])
	})

	test('two columns with the same title are named by position', () => {
		const twins: QueryColumn[] = [
			{ id: 'a', title: 'x', type: 'text' },
			{ id: 'b', title: 'x', type: 'text' },
			{ id: 'c', title: 'X', type: 'text' },
		]
		expect(twins.map(column => columnName(column, twins))).toEqual(['$1', '$2', 'X'])
	})

	test('a histogram bar, which leaves its top out, prints as two comparisons', () => {
		const view: ViewState = {
			...base,
			filters: [{ columnId: 'c1', op: 'between', min: '1', max: '5', includeMax: false }],
		}
		expect(printQuery(view, columns)).toBe('SELECT *\nWHERE amount >= 1 AND amount < 5')
		const result = compileQuery(printQuery(view, columns), columns, view)
		expect(result.ok && result.value.filters).toEqual([
			{ columnId: 'c1', op: 'gte', value: '1' },
			{ columnId: 'c1', op: 'lt', value: '5' },
		])
	})

	test('filters and groups on columns that are gone are left out', () => {
		const view: ViewState = {
			...base,
			filters: [{ columnId: 'gone', op: 'empty' }],
			sort: [{ columnId: 'gone', desc: false }],
		}
		expect(printQuery(view, columns)).toBe('SELECT *')
	})
})

describe('round trip', () => {
	const every: Filter[] = [
		{ columnId: 'c1', op: 'eq', value: '5' },
		{ columnId: 'c1', op: 'ne', value: '-5.25' },
		{ columnId: 'c1', op: 'gt', value: '1e3' },
		{ columnId: 'c1', op: 'gte', value: ' 7' },
		{ columnId: 'c2', op: 'lt', value: '2024-01-01' },
		{ columnId: 'c2', op: 'lte', value: '2024-01-01' },
		{ columnId: 'c3', op: 'eq', value: 'true' },
		{ columnId: 'c3', op: 'eq', value: 'Yes' },
		{ columnId: 'c1', op: 'between', min: '1', max: '10', includeMax: true },
		{ columnId: 'c0', op: 'anyOf', values: ['Ann'] },
		{ columnId: 'c0', op: 'anyOf', values: ['Ann', "O'Neil"] },
		{ columnId: 'c0', op: 'anyOf', values: [] },
		{ columnId: 'c1', op: 'anyOf', values: ['5'] },
		{ columnId: 'c0', op: 'noneOf', values: ['Ann'] },
		{ columnId: 'c1', op: 'noneOf', values: ['5', 'x'] },
		{ columnId: 'c0', op: 'contains', value: '50% off_' },
		{ columnId: 'c0', op: 'notContains', value: String.raw`a\b` },
		{ columnId: 'c0', op: 'regex', value: '^A' },
		{ columnId: 'c0', op: 'regex', value: '/^a.*$/is' },
		{ columnId: 'c0', op: 'regex', value: '/x/i' },
		{ columnId: 'c7', op: 'contains', value: 'a' },
		{ columnId: 'c0', op: 'empty' },
		{ columnId: 'c0', op: 'notEmpty' },
		{ columnId: 'c1', op: 'malformed' },
		{ columnId: 'c1', op: 'notMalformed' },
	]

	test.each(every.map(filter => [filter.op, filter] as const))('%s', (_, filter) => {
		roundTrip({ ...base, filters: [filter] })
	})

	test('every filter at once, with search and sort', () => {
		roundTrip({
			...base,
			filters: every,
			search: 'x',
			sort: [
				{ columnId: 'c4', desc: false },
				{ columnId: 'c5', desc: true },
			],
		})
	})

	test('hidden and moved columns', () => {
		const columnsOf = base.columns.map((column, i) => ({
			...column,
			hidden: i % 3 === 0,
			size: i * 10,
		}))
		roundTrip({ ...base, columns: [...columnsOf.slice(4), ...columnsOf.slice(0, 4)] })
	})

	test('groupings', () => {
		const text = roundTrip({
			...base,
			filters: [{ columnId: 'c1', op: 'gt', value: '0' }],
			sort: [{ columnId: 'c0', desc: false }],
			grouping: {
				by: ['c4', 'c3'],
				aggregates: [
					{ columnId: 'c1', fn: 'sum' },
					{ columnId: 'c2', fn: 'min' },
				],
				sort: [
					{ key: 'count', desc: true },
					{ key: 'sum:c1', desc: false },
					{ key: 'c3', desc: true },
				],
			},
		})
		expect(text).toBe(
			[
				'SELECT "order", paid, count(*), sum(amount), min("Joined On")',
				'WHERE amount > 0',
				'GROUP BY "order", paid',
				'ORDER BY count(*) DESC, sum(amount), paid DESC',
			].join('\n')
		)
	})
})
