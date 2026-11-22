import { describe, expect, test } from 'vite-plus/test'

import { generateTags } from './tags'

describe('generateTags', () => {
	test('returns an array as it is', () => {
		expect(generateTags(['a', 'b'])).toEqual(['a', 'b'])
	})

	test('parses a single-quoted list', () => {
		expect(generateTags("['a', 'b']")).toEqual(['a', 'b'])
	})

	test('parses a JSON list', () => {
		expect(generateTags('["a", 1]')).toEqual(['a', 1])
	})

	test('returns an empty list for "[]"', () => {
		expect(generateTags('[]')).toEqual([])
	})

	test.each(['plain', '', '{"a":1}', '["broken', "['it's']"])(
		'wraps "%s" in a list when it is not one',
		input => expect(generateTags(input)).toEqual([input])
	)

	test.each([null, undefined, 5, true])('wraps the non-string value %s', input => {
		expect(generateTags(input)).toEqual([input])
	})
})
