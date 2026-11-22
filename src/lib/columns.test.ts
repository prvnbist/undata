import { describe, expect, test } from 'vite-plus/test'

import { extractColumns } from './columns'

describe('extractColumns', () => {
	test('turns each key into a visible text column titled after the key', () => {
		expect([...extractColumns({ id: 1, 'Full Name': 'Ada' })]).toEqual([
			['id', { key: 'id', title: 'id', data_type: 'text', hidden: false }],
			['Full Name', { key: 'Full Name', title: 'Full Name', data_type: 'text', hidden: false }],
		])
	})

	test('keeps the order of the keys', () => {
		expect([...extractColumns({ b: 1, a: 2, c: 3 }).keys()]).toEqual(['b', 'a', 'c'])
	})

	test('returns no columns for an empty row', () => {
		expect(extractColumns({}).size).toBe(0)
	})
})
