import { describe, expect, test } from 'vite-plus/test'

import type { DataType } from '@/lib/constants'
import { runQuery } from '@/lib/engine/query'
import { createDataset } from '@/lib/engine/store'
import { defaultView } from '@/lib/engine/view'
import type { Filter, ViewState } from '@/lib/engine/view'
import { parseDelimited } from '@/lib/import/delimited'

import { compileQuery } from './compile'
import type { QueryColumn } from './compile'

const columns: QueryColumn[] = [
	{ id: 'c0', title: 'name', type: 'text' },
	{ id: 'c1', title: 'amount', type: 'number' },
	{ id: 'c2', title: 'Joined On', type: 'date' },
	{ id: 'c3', title: 'paid', type: 'boolean' },
	{ id: 'c4', title: 'city', type: 'text' },
]
const base = defaultView(columns.map(column => column.id))

const view = (source: string, from: ViewState = base, cols = columns) => {
	const result = compileQuery(source, cols, from)
	if (!result.ok) throw new Error(result.error.message)
	return result.value
}

const failure = (source: string, from: ViewState = base, cols = columns) => {
	const result = compileQuery(source, cols, from)
	if (result.ok) throw new Error(`compiled: ${source}`)
	return result.error
}

const filters = (where: string) => view(`SELECT * WHERE ${where}`).filters

describe('conditions', () => {
	test.each<[string, Filter]>([
		[`amount = 5`, { columnId: 'c1', op: 'eq', value: '5' }],
		[`amount <> -5`, { columnId: 'c1', op: 'ne', value: '-5' }],
		[`amount != 5`, { columnId: 'c1', op: 'ne', value: '5' }],
		[`amount > 1.5`, { columnId: 'c1', op: 'gt', value: '1.5' }],
		[`amount >= 1`, { columnId: 'c1', op: 'gte', value: '1' }],
		[`amount < 1`, { columnId: 'c1', op: 'lt', value: '1' }],
		[`amount <= 1`, { columnId: 'c1', op: 'lte', value: '1' }],
		[`"Joined On" > '2024-01-01'`, { columnId: 'c2', op: 'gt', value: '2024-01-01' }],
		[`paid = TRUE`, { columnId: 'c3', op: 'eq', value: 'true' }],
		[`name = 'Ann'`, { columnId: 'c0', op: 'anyOf', values: ['Ann'] }],
		[`name <> 'Ann'`, { columnId: 'c0', op: 'noneOf', values: ['Ann'] }],
		[`name IN ('a', 'b')`, { columnId: 'c0', op: 'anyOf', values: ['a', 'b'] }],
		[`amount NOT IN (1, 2)`, { columnId: 'c1', op: 'noneOf', values: ['1', '2'] }],
		[`name IN ()`, { columnId: 'c0', op: 'anyOf', values: [] }],
		[
			`amount BETWEEN 1 AND 10`,
			{ columnId: 'c1', op: 'between', min: '1', max: '10', includeMax: true },
		],
		[`name LIKE '%an%'`, { columnId: 'c0', op: 'contains', value: 'an' }],
		[`name NOT LIKE '%an%'`, { columnId: 'c0', op: 'notContains', value: 'an' }],
		[`name LIKE 'A%'`, { columnId: 'c0', op: 'regex', value: '/^A.*$/is' }],
		[`name ~ '^A'`, { columnId: 'c0', op: 'regex', value: '^A' }],
		[`name IS NULL`, { columnId: 'c0', op: 'empty' }],
		[`name IS NOT EMPTY`, { columnId: 'c0', op: 'notEmpty' }],
		[`amount IS MALFORMED`, { columnId: 'c1', op: 'malformed' }],
		[`amount IS NOT MALFORMED`, { columnId: 'c1', op: 'notMalformed' }],
	])('%s', (where, filter) => {
		expect(filters(where)).toEqual([filter])
	})

	test('search() is the search box', () => {
		expect(view(`WHERE search('ann') AND amount > 1`)).toMatchObject({
			search: 'ann',
			filters: [{ op: 'gt' }],
		})
	})

	test.each([
		[`name > 'a'`, 'name: A text column cannot be compared', `'a'`],
		[`amount > 'ten'`, 'amount: “ten” is not a number value', `'ten'`],
		[`amount BETWEEN 5 AND 1`, 'larger than the second', '5 AND 1'],
		[`name ~ '('`, 'not a valid regular expression', `'('`],
		[`name LIKE '%%'`, null, null],
		[`name NOT LIKE 'a%'`, "NOT LIKE only works as NOT LIKE '%text%'", `'a%'`],
		[`nope = 1`, 'There is no column called “nope”', 'nope'],
		[`$9 = 1`, 'There is no column $9', '$9'],
		[`search('a') AND search('b')`, 'Only one search()', `search('b')`],
	])('%s fails where it is wrong', (where, message, at) => {
		const source = `SELECT * WHERE ${where}`
		const result = compileQuery(source, columns, base)
		if (message === null) return expect(result.ok).toBe(true)
		if (result.ok) throw new Error('compiled')
		expect(result.error.message).toContain(message)
		expect(source.slice(result.error.from, result.error.to)).toBe(at)
	})
})

describe('names', () => {
	test('ignore case, and the exact title decides between two that differ in case', () => {
		const cols: QueryColumn[] = [
			{ id: 'a', title: 'Name', type: 'text' },
			{ id: 'b', title: 'name', type: 'text' },
			{ id: 'c', title: 'City', type: 'text' },
		]
		const from = defaultView(['a', 'b', 'c'])
		expect(view(`WHERE city IS NULL`, from, cols).filters[0]!.columnId).toBe('c')
		expect(view(`WHERE name IS NULL`, from, cols).filters[0]!.columnId).toBe('b')
		expect(view(`WHERE "Name" IS NULL`, from, cols).filters[0]!.columnId).toBe('a')
		expect(failure(`WHERE NAME IS NULL`, from, cols).message).toContain(
			'Name one by its position'
		)
	})

	test('two columns with the same title are told apart by position', () => {
		const cols: QueryColumn[] = [
			{ id: 'a', title: 'x', type: 'text' },
			{ id: 'b', title: 'x', type: 'text' },
		]
		const from = defaultView(['a', 'b'])
		expect(failure(`WHERE x IS NULL`, from, cols).message).toContain('$1')
		expect(view(`WHERE $2 IS NULL`, from, cols).filters[0]!.columnId).toBe('b')
	})
})

describe('columns', () => {
	const shown = (result: ViewState) =>
		result.columns.filter(column => !column.hidden).map(column => column.id)

	test('SELECT * and a missing SELECT show every column, in the order they had', () => {
		const from: ViewState = {
			...base,
			columns: [...base.columns].reverse().map((column, i) => ({ ...column, hidden: i === 0 })),
		}
		expect(view('SELECT *', from).columns.map(column => column.id)).toEqual([
			'c4',
			'c3',
			'c2',
			'c1',
			'c0',
		])
		expect(shown(view('WHERE amount > 1', from))).toHaveLength(5)
	})

	test('a list shows those columns in its order and hides the rest where they are', () => {
		const result = view('SELECT city, name')
		expect(result.columns.map(column => [column.id, column.hidden])).toEqual([
			['c4', false],
			['c1', true],
			['c2', true],
			['c3', true],
			['c0', false],
		])
	})

	test('a list that changes nothing keeps the columns as they were, widths too', () => {
		const from: ViewState = {
			...base,
			columns: base.columns.map((column, i) => ({ ...column, hidden: i === 1, size: 90 + i })),
		}
		expect(view('SELECT name, "Joined On", paid, city', from).columns).toEqual(from.columns)
	})

	test('a list cannot repeat a column or mix with *', () => {
		expect(failure('SELECT name, NAME').message).toContain('listed twice')
		expect(failure('SELECT *, name').message).toContain('* cannot be listed')
		expect(failure('SELECT sum(amount)').message).toContain('needs GROUP BY')
	})
})

describe('sorting', () => {
	test('ORDER BY is the sort', () => {
		expect(view('ORDER BY amount DESC, name').sort).toEqual([
			{ columnId: 'c1', desc: true },
			{ columnId: 'c0', desc: false },
		])
		expect(failure('ORDER BY name, name DESC').message).toContain('already sorted')
	})
})

describe('grouping', () => {
	test('GROUP BY with aggregates and a sort on them', () => {
		const result = view(
			`SELECT city, count(*), sum(amount), max("Joined On") GROUP BY city, paid ORDER BY sum(amount) DESC, city`
		)
		expect(result.grouping).toEqual({
			by: ['c4', 'c3'],
			aggregates: [
				{ columnId: 'c1', fn: 'sum' },
				{ columnId: 'c2', fn: 'max' },
			],
			sort: [
				{ key: 'sum:c1', desc: true },
				{ key: 'c4', desc: false },
			],
		})
		expect(view('SELECT count(*) GROUP BY city ORDER BY count(*)').grouping!.sort).toEqual([
			{ key: 'count', desc: false },
		])
	})

	test('keeps the row sort and columns of the view it came from', () => {
		const from: ViewState = { ...base, sort: [{ columnId: 'c1', desc: true }] }
		const result = view('GROUP BY city', from)
		expect(result.sort).toEqual(from.sort)
		expect(result.columns).toEqual(from.columns)
	})

	test.each([
		['SELECT * GROUP BY city', 'instead of *'],
		['SELECT name GROUP BY city', 'name is not in GROUP BY'],
		['SELECT sum(name) GROUP BY city', 'name is a text column, so it has no sum()'],
		['SELECT avg("Joined On") GROUP BY city', 'It can have min, max'],
		['GROUP BY city, city', 'grouped by twice'],
		['GROUP BY city ORDER BY name', 'cannot be sorted by it'],
		['GROUP BY city ORDER BY sum(amount)', 'Add this aggregate to SELECT'],
		['SELECT sum(amount), sum(amount) GROUP BY city', 'listed twice'],
	])('%s', (source, message) => {
		expect(failure(source).message).toContain(message)
	})
})

describe('against the engine', () => {
	const csv =
		'name,amount,city\nAnn,5,Pune\nBen,12,Delhi\nCara,oops,Pune\nDev,,Goa\nEve,30,Delhi\n'
	const types: DataType[] = ['text', 'number', 'text']
	const dataset = createDataset(parseDelimited(csv, { delimiter: ',', hasHeader: true }), types)
	const cols = dataset.info()
	const from = defaultView(cols.map(column => column.id))
	const names = (result: ViewState) => {
		const { order, rowCount } = runQuery(dataset, result)
		return dataset.window(order, 0, rowCount, ['c0']).map(row => row.text[0])
	}

	test('a query finds the rows the same filters find', () => {
		const query = view(
			`SELECT * WHERE amount <> 12 AND city IN ('Pune', 'Delhi') ORDER BY amount DESC`,
			from,
			cols
		)
		expect(names(query)).toEqual(['Eve', 'Ann'])
		expect(names(view(`WHERE amount IS MALFORMED`, from, cols))).toEqual(['Cara'])
		expect(names(view(`WHERE name LIKE '_e%' ORDER BY name DESC`, from, cols))).toEqual([
			'Dev',
			'Ben',
		])
		expect(names(view(`WHERE search('pu')`, from, cols))).toEqual(['Ann', 'Cara'])
	})
})
