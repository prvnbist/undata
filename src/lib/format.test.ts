import { describe, expect, test } from 'vite-plus/test'

import { formatDate, formatNumber } from './format'

describe('formatNumber', () => {
	test('groups digits for the given language', () => {
		expect(formatNumber(1234567.5, 'en-US')).toBe('1,234,567.5')
		expect(formatNumber(1234567.5, 'de-DE')).toBe('1.234.567,5')
	})

	test('shows the plain value without a language', () => {
		expect(formatNumber(1234567.5)).toBe('1234567.5')
		expect(formatNumber(1234567.5, '')).toBe('1234567.5')
	})
})

describe('formatDate', () => {
	test('formats a date', () => {
		expect(formatDate('2020-01-05T00:00:00', 'date')).toBe('2020-01-05')
	})

	test('formats a timestamp with the 12-hour clock, as the legacy app did', () => {
		expect(formatDate('2020-01-05T15:04:09', 'timestamp')).toBe('2020-01-05 03:04:09')
	})

	test('throws on a value that is not a date', () => {
		expect(() => formatDate('nope', 'date')).toThrow(RangeError)
	})
})
