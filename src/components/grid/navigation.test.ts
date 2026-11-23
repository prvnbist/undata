import { describe, expect, test } from 'vite-plus/test'

import { clampCell, nextCell } from './navigation'

const bounds = { rows: 100, cols: 5, page: 10 }
const move = (row: number, col: number, key: string, mod = false) =>
	nextCell({ row, col }, { key, mod }, bounds)

describe('nextCell', () => {
	test('arrows move by one and stop at the edges', () => {
		expect(move(5, 2, 'ArrowDown')).toEqual({ row: 6, col: 2 })
		expect(move(5, 2, 'ArrowUp')).toEqual({ row: 4, col: 2 })
		expect(move(5, 2, 'ArrowLeft')).toEqual({ row: 5, col: 1 })
		expect(move(5, 2, 'ArrowRight')).toEqual({ row: 5, col: 3 })
		expect(move(0, 0, 'ArrowUp')).toEqual({ row: 0, col: 0 })
		expect(move(99, 4, 'ArrowRight')).toEqual({ row: 99, col: 4 })
	})

	test('with Ctrl or ⌘, arrows go to the edge', () => {
		expect(move(5, 2, 'ArrowDown', true)).toEqual({ row: 99, col: 2 })
		expect(move(5, 2, 'ArrowUp', true)).toEqual({ row: 0, col: 2 })
		expect(move(5, 2, 'ArrowLeft', true)).toEqual({ row: 5, col: 0 })
		expect(move(5, 2, 'ArrowRight', true)).toEqual({ row: 5, col: 4 })
	})

	test('page keys move by a page, Home and End by row or by grid', () => {
		expect(move(5, 2, 'PageDown')).toEqual({ row: 15, col: 2 })
		expect(move(5, 2, 'PageUp')).toEqual({ row: 0, col: 2 })
		expect(move(95, 2, 'PageDown')).toEqual({ row: 99, col: 2 })
		expect(move(5, 2, 'Home')).toEqual({ row: 5, col: 0 })
		expect(move(5, 2, 'End')).toEqual({ row: 5, col: 4 })
		expect(move(5, 2, 'Home', true)).toEqual({ row: 0, col: 0 })
		expect(move(5, 2, 'End', true)).toEqual({ row: 99, col: 4 })
	})

	test('other keys, and empty grids, do not move', () => {
		expect(move(5, 2, 'a')).toBeNull()
		expect(
			nextCell({ row: 0, col: 0 }, { key: 'ArrowDown', mod: false }, { ...bounds, rows: 0 })
		).toBeNull()
	})
})

test('clampCell keeps a position inside a smaller grid', () => {
	expect(clampCell({ row: 150, col: 9 }, bounds)).toEqual({ row: 99, col: 4 })
	expect(clampCell({ row: 1, col: 1 }, { ...bounds, cols: 0 })).toBeNull()
})
