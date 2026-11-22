import { describe, expect, test } from 'vite-plus/test'

import {
	MAX_BODY_HEIGHT,
	columnOffsets,
	createScrollScale,
	rowRange,
	scrollToShow,
	spanRange,
} from './scaledScroll'

describe('createScrollScale', () => {
	test('leaves a body that fits alone', () => {
		const scale = createScrollScale(32_000, 600)
		expect(scale.scaled).toBe(false)
		expect(scale.bodyHeight).toBe(32_000)
		expect(scale.maxTop).toBe(31_400)
		expect(scale.toTop(1234)).toBe(1234)
		expect(scale.toScroll(1234)).toBe(1234)
	})

	test('squeezes a body no browser can lay out, and still reaches both ends', () => {
		const scale = createScrollScale(32_000_000, 600)
		expect(scale.scaled).toBe(true)
		expect(scale.bodyHeight).toBe(MAX_BODY_HEIGHT)
		expect(scale.toTop(0)).toBe(0)
		expect(scale.toTop(MAX_BODY_HEIGHT - 600)).toBe(32_000_000 - 600)
		expect(scale.toScroll(scale.maxTop)).toBe(MAX_BODY_HEIGHT - 600)
		// A browser rounds what it is given, so the result is held inside the body.
		expect(scale.toTop(MAX_BODY_HEIGHT)).toBe(scale.maxTop)
	})

	test('a body shorter than its viewport does not scroll', () => {
		const scale = createScrollScale(96, 600)
		expect(scale.maxTop).toBe(0)
		expect(scale.toTop(0)).toBe(0)
		expect(scale.toScroll(0)).toBe(0)
	})
})

describe('rowRange', () => {
	const at = (top: number, rowCount = 1_000_000) =>
		rowRange({ top, viewport: 600, rowHeight: 32, rowCount, overscan: 4 })

	test('covers the viewport and a little more', () => {
		expect(at(0)).toEqual({ start: 0, end: 23 })
		expect(at(3200)).toEqual({ start: 96, end: 123 })
	})

	test('ends with the last row', () => {
		expect(at(32_000_000 - 600).end).toBe(1_000_000)
	})

	test('never leaves the rows there are', () => {
		expect(at(3200, 10)).toEqual({ start: 10, end: 10 })
		expect(at(0, 0)).toEqual({ start: 0, end: 0 })
	})
})

describe('columns', () => {
	const offsets = columnOffsets([100, 50, 200, 100])

	test('are placed end to end', () => {
		expect(offsets).toEqual([0, 100, 150, 350, 450])
	})

	test('only the ones in sight are in range', () => {
		expect(spanRange(offsets, 0, 120, 0)).toEqual({ start: 0, end: 2 })
		expect(spanRange(offsets, 100, 50, 0)).toEqual({ start: 1, end: 2 })
		expect(spanRange(offsets, 160, 10, 1)).toEqual({ start: 1, end: 4 })
		expect(spanRange(offsets, 1000, 100, 0)).toEqual({ start: 4, end: 4 })
		expect(spanRange([0], 0, 100, 2)).toEqual({ start: 0, end: 0 })
	})
})

describe('scrollToShow', () => {
	test('moves only as far as it has to', () => {
		expect(scrollToShow(320, 32, 0, 600)).toBe(0)
		expect(scrollToShow(0, 32, 100, 600)).toBe(0)
		expect(scrollToShow(640, 32, 0, 600)).toBe(72)
	})

	test('shows the start of something larger than the viewport', () => {
		expect(scrollToShow(500, 900, 0, 600)).toBe(500)
	})
})
