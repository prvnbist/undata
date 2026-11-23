import { describe, expect, test } from 'vite-plus/test'

import { cycleSort, defaultView, setHidden, setSort } from './view'

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
