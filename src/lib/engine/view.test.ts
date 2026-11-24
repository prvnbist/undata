import { describe, expect, test } from 'vite-plus/test'

import {
	cycleSort,
	defaultView,
	moveColumn,
	moveColumnBy,
	setAllHidden,
	setHidden,
	setSize,
	setSort,
	withColumns,
} from './view'
import type { ViewState } from './view'

const asc = (columnId: string) => ({ columnId, desc: false })
const desc = (columnId: string) => ({ columnId, desc: true })

describe('cycleSort', () => {
	test('alone, goes ascending, descending, then unsorted', () => {
		expect(cycleSort([], 'a', false)).toEqual([asc('a')])
		expect(cycleSort([asc('a')], 'a', false)).toEqual([desc('a')])
		expect(cycleSort([desc('a')], 'a', false)).toEqual([])
	})

	test('alone, replaces every other key', () => {
		expect(cycleSort([asc('a'), desc('b')], 'c', false)).toEqual([asc('c')])
		expect(cycleSort([asc('a'), desc('b')], 'a', false)).toEqual([asc('a')])
	})

	test('adding appends, then cycles that key in place', () => {
		expect(cycleSort([asc('a')], 'b', true)).toEqual([asc('a'), asc('b')])
		expect(cycleSort([asc('a'), asc('b')], 'b', true)).toEqual([asc('a'), desc('b')])
		expect(cycleSort([asc('a'), desc('b')], 'b', true)).toEqual([asc('a')])
		expect(cycleSort([asc('a'), desc('b')], 'a', true)).toEqual([desc('a'), desc('b')])
	})
})

describe('setSort', () => {
	test('sets one key, adds one, or removes one', () => {
		expect(setSort([asc('a')], 'b', true, false)).toEqual([desc('b')])
		expect(setSort([asc('a')], 'b', true, true)).toEqual([asc('a'), desc('b')])
		expect(setSort([asc('a'), asc('b')], 'a', true, true)).toEqual([desc('a'), asc('b')])
		expect(setSort([asc('a'), asc('b')], 'a', null, false)).toEqual([asc('b')])
	})
})

test('setHidden changes only that column', () => {
	const view = setHidden(defaultView(['a', 'b']), 'b', true)
	expect(view.columns).toEqual([
		{ id: 'a', hidden: false, size: null },
		{ id: 'b', hidden: true, size: null },
	])
})

const order = (view: ReturnType<typeof defaultView>) => view.columns.map(column => column.id)

describe('moveColumn', () => {
	test('puts a column before another, or last', () => {
		const view = defaultView(['a', 'b', 'c', 'd'])
		expect(order(moveColumn(view, 'd', 'b'))).toEqual(['a', 'd', 'b', 'c'])
		expect(order(moveColumn(view, 'a', null))).toEqual(['b', 'c', 'd', 'a'])
		expect(order(moveColumn(view, 'b', 'b'))).toEqual(['a', 'b', 'c', 'd'])
		expect(order(moveColumn(view, 'x', 'a'))).toEqual(['a', 'b', 'c', 'd'])
	})

	test('moving by one steps over hidden columns', () => {
		const view = setHidden(defaultView(['a', 'b', 'c', 'd']), 'b', true)
		expect(order(moveColumnBy(view, 'c', -1))).toEqual(['c', 'a', 'b', 'd'])
		expect(order(moveColumnBy(view, 'a', 1))).toEqual(['b', 'c', 'a', 'd'])
		expect(order(moveColumnBy(view, 'd', 1))).toEqual(['a', 'b', 'c', 'd'])
		expect(order(moveColumnBy(view, 'a', -1))).toEqual(['a', 'b', 'c', 'd'])
	})
})

test('setSize and setAllHidden change only the named columns', () => {
	const view = setSize(defaultView(['a', 'b']), 'a', 120)
	expect(view.columns[0]!.size).toBe(120)
	expect(setSize(view, 'a', null).columns[0]!.size).toBeNull()
	const hidden = setAllHidden(view, new Set(['a', 'b']), true)
	expect(hidden.columns.every(column => column.hidden)).toBe(true)
})

describe('withColumns', () => {
	const view: ViewState = {
		search: 'x',
		filters: [
			{ columnId: 'a', op: 'empty' },
			{ columnId: 'gone', op: 'notEmpty' },
		],
		sort: [
			{ columnId: 'gone', desc: false },
			{ columnId: 'b', desc: true },
		],
		grouping: {
			by: ['gone', 'a'],
			aggregates: [{ columnId: 'gone', fn: 'sum' }],
			sort: [{ key: 'sum:gone', desc: false }],
		},
		columns: [
			{ id: 'b', hidden: false, size: 90 },
			{ id: 'gone', hidden: false, size: null },
			{ id: 'a', hidden: true, size: null },
		],
	}

	test('drops what names a column that is gone, and says which', () => {
		const { view: fitted, missing } = withColumns(view, ['a', 'b', 'c'])
		expect(missing).toEqual(['gone'])
		expect(fitted.filters).toEqual([{ columnId: 'a', op: 'empty' }])
		expect(fitted.sort).toEqual([{ columnId: 'b', desc: true }])
		expect(fitted.grouping).toEqual({ by: ['a'], aggregates: [], sort: [] })
		// New columns go last, shown.
		expect(fitted.columns).toEqual([
			{ id: 'b', hidden: false, size: 90 },
			{ id: 'a', hidden: true, size: null },
			{ id: 'c', hidden: false, size: null },
		])
	})

	test('a grouping left with no column is none', () => {
		const { view: fitted } = withColumns(
			{ ...view, grouping: { by: ['gone'], aggregates: [], sort: [] } },
			['a', 'b']
		)
		expect(fitted.grouping).toBeNull()
	})

	test('the same view back when every column is there', () => {
		const same = withColumns(view, ['a', 'b', 'gone'])
		expect(same).toEqual({ view, missing: [] })
		expect(same.view).toBe(view)
	})
})
