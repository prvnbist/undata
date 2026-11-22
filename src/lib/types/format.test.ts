import { describe, expect, test } from 'vite-plus/test'

import { DATA_TYPES } from '../constants'
import { formatValue } from './format'

describe('formatValue', () => {
	test('never throws and falls back to the raw text when a value does not fit', () => {
		for (const { value: type } of DATA_TYPES) {
			for (const input of ['', 'nope', '{', '2020-13-45', '\u0000']) {
				expect(() => formatValue(type, input)).not.toThrow()
			}
		}
		expect(formatValue('date', 'nope')).toBe('nope')
		expect(formatValue('number', 'abc')).toBe('abc')
	})

	test('time shows as written, with the seconds only if given', () => {
		expect(formatValue('time', '14:00')).toBe('14:00')
		expect(formatValue('time', '9:05')).toBe('09:05')
		expect(formatValue('time', '14:00:30')).toBe('14:00:30')
		expect(formatValue('timetz', '14:00:00+02:00')).toBe('14:00:00+02:00')
	})

	test('dates and timestamps are shown in the written zone, 24-hour', () => {
		expect(formatValue('date', '2020-01-05')).toBe('2020-01-05')
		expect(formatValue('timestamp', '2020-01-05T15:04:09')).toBe('2020-01-05 15:04:09')
		expect(formatValue('timestamp', '2020-01-05 15:04')).toBe('2020-01-05 15:04')
		expect(formatValue('timestamptz', '2020-01-05T15:04:09+02:00')).toBe(
			'2020-01-05 15:04:09+02:00'
		)
		expect(formatValue('timestamptz', '2020-01-05T15:04:09Z')).toBe('2020-01-05 15:04:09Z')
	})

	test('numbers group digits for a language, and stay exact when a number cannot hold them', () => {
		expect(formatValue('number', '1234567.5')).toBe('1234567.5')
		expect(formatValue('number', '1234567.5', 'en-US')).toBe('1,234,567.5')
		expect(formatValue('number', '1234567.5', 'de-DE')).toBe('1.234.567,5')
		expect(formatValue('number', '12345678901234567890', 'en-US')).toBe('12345678901234567890')
		expect(formatValue('number', '1.10', 'en-US')).toBe('1.10')
		expect(formatValue('number', '1234.56789', 'en-US')).toBe('1,234.56789')
		expect(formatValue('number', '1e3', 'en-US')).toBe('1,000')
	})

	test('booleans show as true or false', () => {
		expect(formatValue('boolean', 'YES')).toBe('true')
		expect(formatValue('boolean', '0')).toBe('false')
	})

	test('text, json, links, images and tags show the text itself', () => {
		for (const type of ['text', 'json', 'url', 'image', 'tag'] as const) {
			expect(formatValue(type, 'abc')).toBe('abc')
		}
		expect(formatValue('json', '{"a":1}')).toBe('{"a":1}')
	})
})
