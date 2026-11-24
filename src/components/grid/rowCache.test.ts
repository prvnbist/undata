import { describe, expect, test } from 'vite-plus/test'

import type { RowWindow } from '@/lib/engine/store'
import { BLOCK_SIZE, createRowCache } from './rowCache'

type Call = { queryId: number; start: number; end: number; columnIds: string[] }

const setup = () => {
	const calls: (Call & { answer: () => void; reject: () => void })[] = []
	const cache = createRowCache(
		(queryId, start, end, columnIds) =>
			new Promise<RowWindow[]>((resolve, reject) => {
				calls.push({
					queryId,
					start,
					end,
					columnIds,
					answer: () =>
						resolve(
							Array.from({ length: end - start }, (_, i) => ({
								row: start + i,
								text: columnIds.map(id => `${queryId}:${id}${start + i}`),
								kinds: null,
							}))
						),
					reject: () => reject(new Error('superseded')),
				})
			})
	)
	const settle = () => new Promise(resolve => setTimeout(resolve))
	return { cache, calls, settle }
}

const textAt = (cache: ReturnType<typeof createRowCache>, row: number, id: string) =>
	cache.block(row)?.columns.get(id)?.text[row % BLOCK_SIZE]

describe('row cache', () => {
	test('asks once for each block that is missing', async () => {
		const { cache, calls, settle } = setup()
		cache.setQuery({ id: 1, rowCount: 1000 })
		cache.ensure(10, 70, ['a'])
		cache.ensure(10, 70, ['a'])
		expect(calls.map(call => [call.start, call.end])).toEqual([
			[0, 64],
			[64, 128],
		])

		for (const call of calls) call.answer()
		await settle()
		expect(textAt(cache, 65, 'a')).toBe('1:a65')
		cache.ensure(0, 100, ['a'])
		expect(calls).toHaveLength(2)
	})

	test('asks only for the columns it does not have', async () => {
		const { cache, calls, settle } = setup()
		cache.setQuery({ id: 1, rowCount: 10 })
		cache.ensure(0, 10, ['a', 'b'])
		calls[0]!.answer()
		await settle()
		cache.ensure(0, 10, ['b', 'c'])
		expect(calls[1]!.columnIds).toEqual(['c'])
		calls[1]!.answer()
		await settle()
		expect(textAt(cache, 3, 'a')).toBe('1:a3')
		expect(textAt(cache, 3, 'c')).toBe('1:c3')
	})

	test('keeps showing the last rows until the new query has some, and then only those', async () => {
		const { cache, calls, settle } = setup()
		cache.setQuery({ id: 1, rowCount: 300 })
		cache.ensure(0, 130, ['a'])
		for (const call of calls) call.answer()
		await settle()

		cache.setQuery({ id: 2, rowCount: 300 })
		cache.ensure(0, 130, ['a'])
		expect(textAt(cache, 0, 'a')).toBe('1:a0')
		calls[3]!.answer()
		await settle()
		expect(textAt(cache, 0, 'a')).toBe('2:a0')
		expect(textAt(cache, 70, 'a')).toBeUndefined()
	})

	test('an answer that comes after the query changed is dropped', async () => {
		const { cache, calls, settle } = setup()
		cache.setQuery({ id: 1, rowCount: 10 })
		cache.ensure(0, 10, ['a'])
		cache.setQuery({ id: 2, rowCount: 10 })
		calls[0]!.answer()
		await settle()
		expect(cache.block(0)).toBeUndefined()
	})

	test('a failed request can be asked for again', async () => {
		const { cache, calls, settle } = setup()
		cache.setQuery({ id: 1, rowCount: 10 })
		cache.ensure(0, 10, ['a'])
		calls[0]!.reject()
		await settle()
		cache.ensure(0, 10, ['a'])
		expect(calls).toHaveLength(2)
	})

	test('lets go of blocks that are far away', async () => {
		const { cache, calls, settle } = setup()
		cache.setQuery({ id: 1, rowCount: 100_000 })
		for (let row = 0; row < 100 * BLOCK_SIZE; row += BLOCK_SIZE) {
			cache.ensure(row, row + 1, ['a'])
			calls.at(-1)!.answer()
			await settle()
		}
		expect(cache.block(0)).toBeUndefined()
		expect(cache.block(99 * BLOCK_SIZE)).toBeDefined()
	})

	test('tells its listeners when rows arrive', async () => {
		const { cache, calls, settle } = setup()
		let told = 0
		const stop = cache.subscribe(() => told++)
		cache.setQuery({ id: 1, rowCount: 10 })
		cache.ensure(0, 10, ['a'])
		const before = cache.version()
		calls[0]!.answer()
		await settle()
		expect(told).toBeGreaterThan(0)
		expect(cache.version()).not.toBe(before)
		stop()
	})
})
