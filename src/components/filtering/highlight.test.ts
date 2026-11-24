import { describe, expect, test } from 'vite-plus/test'

import { highlightParts } from './highlight'

describe('highlightParts', () => {
	test('marks every match, ignoring case, and keeps the text as written', () => {
		expect(highlightParts('Anna and ANN', 'ann')).toEqual([
			{ text: 'Ann', match: true },
			{ text: 'a and ', match: false },
			{ text: 'ANN', match: true },
		])
	})

	test('no needle, or no match, is the text alone', () => {
		expect(highlightParts('abc', '')).toEqual([{ text: 'abc', match: false }])
		expect(highlightParts('abc', 'x')).toEqual([{ text: 'abc', match: false }])
		expect(highlightParts('', 'x')).toEqual([])
	})

	test('characters that mean something in a pattern are plain text', () => {
		expect(highlightParts('a.b (c)', '(c)')).toEqual([
			{ text: 'a.b ', match: false },
			{ text: '(c)', match: true },
		])
		expect(highlightParts('axb', '.')).toEqual([{ text: 'axb', match: false }])
	})

	test('a match at the very end, and matches side by side', () => {
		expect(highlightParts('xaa', 'a')).toEqual([
			{ text: 'x', match: false },
			{ text: 'a', match: true },
			{ text: 'a', match: true },
		])
	})
})
