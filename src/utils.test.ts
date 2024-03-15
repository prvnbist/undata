import { describe, expect, vi } from 'vitest'

import { chunk, greetings, prepareColumns } from './utils'

describe('test: chunk', () => {
	it('[]', () => {
		expect(chunk([], 2)).toStrictEqual([])
	})

	it('chunk - 2', () => {
		expect(chunk([1, 2, 3, 4, 5, 6], 2)).toStrictEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		])
	})

	it('chunk - 4', () => {
		expect(chunk([1, 2, 3, 4, 5, 6], 4)).toStrictEqual([
			[1, 2, 3, 4],
			[5, 6],
		])
	})

	it('chunk - 8', () => {
		expect(chunk([1, 2, 3, 4, 5, 6], 8)).toStrictEqual([[1, 2, 3, 4, 5, 6]])
	})
})

describe('test: prepareColumns', () => {
	it('[]', () => {
		expect(prepareColumns([])).toStrictEqual(new Map([]))
	})

	it('[...]', () => {
		expect(prepareColumns([{ month: 'January', revenue: 1000, expense: 450 }])).toStrictEqual(
			new Map([
				['month', { id: 'month', title: 'month', data_type: 'text' }],
				['revenue', { id: 'revenue', title: 'revenue', data_type: 'text' }],
				['expense', { id: 'expense', title: 'expense', data_type: 'text' }],
			])
		)
	})
})

describe('test: greetings', () => {
	it('morning', () => {
		vi.setSystemTime(new Date(2024, 1, 1, 9))
		expect(greetings()).toStrictEqual('Good Morning 🌅')
	})
	it('afternoon', () => {
		vi.setSystemTime(new Date(2024, 1, 1, 14))
		expect(greetings()).toStrictEqual('Good Afternoon ☀️')
	})
	it('evening', () => {
		vi.setSystemTime(new Date(2024, 1, 1, 19))
		expect(greetings()).toStrictEqual('Good Evening 🌄')
	})
	it('night', () => {
		vi.setSystemTime(new Date(2024, 1, 1, 23))
		expect(greetings()).toStrictEqual('Good Night 🌑')
	})
})
