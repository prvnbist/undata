import { expect, test } from 'vite-plus/test'

import type { DataType } from '../constants'
import { keyToText } from './key'
import { parse } from './parse'

test.each<[DataType, number, string]>([
	['number', 0.1, '0.1'],
	['number', 1e-9, '1e-9'],
	['boolean', 1, 'true'],
	['boolean', 0, 'false'],
	['date', Date.UTC(2024, 1, 29), '2024-02-29'],
	['timestamp', Date.UTC(2024, 0, 1, 10, 5), '2024-01-01 10:05:00'],
	['timestamp', Date.UTC(2024, 0, 1, 10, 5, 0, 250), '2024-01-01 10:05:00.250'],
	['timestamptz', Date.UTC(2024, 0, 1, 10, 5), '2024-01-01 10:05:00Z'],
	['time', 14 * 3600, '14:00:00'],
	['time', 1.5, '00:00:01.500'],
	['timetz', 3600, '01:00:00Z'],
])('%s %d is %s, and reads back', (type, key, text) => {
	expect(keyToText(type, key)).toBe(text)

	const result = parse(type, text)
	expect(result.ok && Number(result.value)).toBe(key)
})
