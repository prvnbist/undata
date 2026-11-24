import { describe, expect, test } from 'vite-plus/test'

import { parseJsonTree, summarise } from './tree'

describe('parseJsonTree', () => {
	test('keeps the written text of numbers, nested too', () => {
		expect(parseJsonTree('{"id": 12345678901234567890, "n": [1.10, 2]}')).toEqual({
			kind: 'object',
			entries: [
				['id', { kind: 'number', text: '12345678901234567890' }],
				[
					'n',
					{
						kind: 'array',
						items: [
							{ kind: 'number', text: '1.10' },
							{ kind: 'number', text: '2' },
						],
					},
				],
			],
		})
	})

	test('reads every kind of value', () => {
		expect(parseJsonTree('[true, null, "a"]')).toEqual({
			kind: 'array',
			items: [
				{ kind: 'boolean', value: true },
				{ kind: 'null' },
				{ kind: 'string', value: 'a' },
			],
		})
	})

	test('is null for text that is not JSON', () => {
		expect(parseJsonTree('{"a":')).toBeNull()
		expect(parseJsonTree('')).toBeNull()
	})
})

test('summarise gives one line per value', () => {
	expect(summarise(parseJsonTree('{"a": 1, "b": 2}')!)).toBe('{ 2 keys }')
	expect(summarise(parseJsonTree('[1]')!)).toBe('[ 1 item ]')
	expect(summarise(parseJsonTree('[]')!)).toBe('[]')
	expect(summarise(parseJsonTree('"x"')!)).toBe('"x"')
})
