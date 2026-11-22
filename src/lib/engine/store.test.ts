import { describe, expect, test } from 'vite-plus/test'

import { createColumnStore } from './store'

describe('createColumnStore', () => {
	test('takes the first record as the header and stores the rest by column', () => {
		const store = createColumnStore()
		store.append([
			['id', 'name'],
			['1', 'Ada'],
		])
		store.append([['2', 'Grace']])

		expect(store.rowCount()).toBe(2)
		expect(store.headers()).toEqual(['id', 'name'])
		expect(store.window(0, 2)).toEqual([
			['1', 'Ada'],
			['2', 'Grace'],
		])
	})

	test('keeps source text exactly', () => {
		const store = createColumnStore()
		store.append([['id'], ['12345678901234567890'], ['007']])

		expect(store.window(0, 2)).toEqual([['12345678901234567890'], ['007']])
	})

	test('clamps a window to the rows that exist', () => {
		const store = createColumnStore()
		store.append([['a'], ['1'], ['2'], ['3']])

		expect(store.window(2, 99)).toEqual([['3']])
		expect(store.window(5, 9)).toEqual([])
		expect(store.window(-4, 1)).toEqual([['1']])
	})

	test('has no rows before a header arrives', () => {
		const store = createColumnStore()

		expect(store.rowCount()).toBe(0)
		expect(store.window(0, 10)).toEqual([])
	})
})
