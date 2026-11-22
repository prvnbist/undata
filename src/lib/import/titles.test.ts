import { describe, expect, test } from 'vite-plus/test'

import { createTitles, isBlankHeader, placeholderTitle } from './titles'

describe('createTitles', () => {
	test('gives a name back unchanged the first time', () => {
		const title = createTitles()

		expect(title('a')).toBe('a')
		expect(title('b')).toBe('b')
	})

	test('numbers repeats from 2', () => {
		const title = createTitles()

		expect([title('a'), title('a'), title('a')]).toEqual(['a', 'a (2)', 'a (3)'])
	})

	test('skips a number that is already taken by a real name', () => {
		const title = createTitles()

		expect([title('a (2)'), title('a'), title('a')]).toEqual(['a (2)', 'a', 'a (3)'])
	})
})

describe('blank headers', () => {
	test('empty and whitespace-only headers are blank', () => {
		expect([isBlankHeader(''), isBlankHeader('  \t'), isBlankHeader(' a ')]).toEqual([
			true,
			true,
			false,
		])
	})

	test('the placeholder is numbered from 1 by position', () => {
		expect([placeholderTitle(0), placeholderTitle(2)]).toEqual(['Column 1', 'Column 3'])
	})
})
