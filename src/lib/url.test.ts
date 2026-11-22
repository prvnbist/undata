import { describe, expect, test } from 'vite-plus/test'

import { extractURLName, isURL } from './url'

describe('isURL', () => {
	test.each([
		'https://example.com',
		'http://www.example.com/a/b?c=1',
		'example.com',
		'sub.example.co.uk/path',
	])('accepts %s', input => expect(isURL(input)).toBe(true))

	test.each(['', 'plain', 'two words', 'https://localhost', 'https://example.com/a b'])(
		'rejects "%s"',
		input => expect(isURL(input)).toBe(false)
	)
})

describe('extractURLName', () => {
	test.each([
		['https://example.com/files/report.pdf', 'report.pdf'],
		['https://example.com', 'example.com'],
		['example.com/a?b=1', 'a?b=1'],
	])('reads the last segment of %s', (input, name) => expect(extractURLName(input)).toBe(name))

	test.each(['https://example.com/', 'example.com'])('finds no name in %s', input =>
		expect(extractURLName(input)).toBeNull()
	)
})
