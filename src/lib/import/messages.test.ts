import { describe, expect, test } from 'vite-plus/test'

import { describeFailure, describeWarning } from './messages'
import type { WarningCode } from './types'

describe('describeWarning', () => {
	test('counts rows, and says where the first one is', () => {
		expect(describeWarning({ code: 'short-rows', count: 1, firstRow: 3 })).toBe(
			'1 row has fewer cells than there are columns, first at record 3'
		)
		expect(describeWarning({ code: 'short-rows', count: 1200, firstRow: 3 })).toBe(
			'1,200 rows have fewer cells than there are columns, first at record 3'
		)
	})

	test('leaves out the place when it is not known', () => {
		expect(
			describeWarning({ code: 'large-numbers-may-round', count: 2, firstRow: null })
		).not.toContain('first')
	})

	test('adds what went wrong when there is more to say', () => {
		expect(
			describeWarning({ code: 'invalid-lines', count: 1, firstRow: 9, detail: 'Unexpected end' })
		).toContain('Unexpected end')
	})

	test.each<WarningCode>([
		'unterminated-quote',
		'blank-headers',
		'duplicate-headers',
		'blank-lines',
		'short-rows',
		'extra-cells',
		'invalid-lines',
		'non-object-records',
		'large-numbers-may-round',
	])('has words of its own for %s', code => {
		expect(describeWarning({ code, count: 1, firstRow: null })).not.toContain(code)
	})
})

describe('describeFailure', () => {
	test('every kind of failure has its own title', () => {
		const codes = [
			'empty',
			'binary',
			'invalid-json',
			'no-records',
			'unreadable',
			'too-large',
			'crashed',
		]
		expect(new Set(codes.map(code => describeFailure(code).title)).size).toBe(codes.length)
	})

	test('a failure nobody planned for is still explained', () => {
		expect(describeFailure('no-dataset')).toEqual(describeFailure('crashed'))
	})
})
