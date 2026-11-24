import { describe, expect, test } from 'vite-plus/test'

import { isBareName, positionOf, tokenize } from './tokens'

const kinds = (source: string) =>
	tokenize(source)
		.filter(token => token.kind !== 'space')
		.map(token => [token.kind, token.value])

describe('tokenize', () => {
	test('covers every character, in order', () => {
		const source = `SELECT "a b", x -- note\nWHERE y >= -1.5e3 AND z = 'it''s' ¤`
		const tokens = tokenize(source)
		expect(tokens.map(token => token.text).join('')).toBe(source)
		tokens.forEach((token, i) => {
			expect(token.from).toBe(i === 0 ? 0 : tokens[i - 1]!.to)
		})
	})

	test('reads names, text, numbers, positions and operators', () => {
		expect(kinds(`"a ""b""" 'it''s' 12.50 $3 <> != <= ~ größe`)).toEqual([
			['ident', 'a "b"'],
			['string', "it's"],
			['number', '12.50'],
			['position', '3'],
			['op', '<>'],
			['op', '!='],
			['op', '<='],
			['op', '~'],
			['word', 'größe'],
		])
	})

	test('marks an unclosed quote, a comment and a stray character', () => {
		const [open] = tokenize(`'abc`)
		expect(open).toMatchObject({ kind: 'string', value: 'abc', open: true })
		expect(kinds('a -- b c\nd')).toEqual([
			['word', 'a'],
			['comment', '-- b c'],
			['word', 'd'],
		])
		expect(kinds('a ¤')[1]).toEqual(['bad', '¤'])
	})
})

test('positionOf counts lines and columns from 1', () => {
	expect(positionOf('ab\ncd', 0)).toEqual({ line: 1, column: 1 })
	expect(positionOf('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
})

test('isBareName refuses keywords and anything but a word', () => {
	expect(isBareName('amount')).toBe(true)
	expect(isBareName('größe_2')).toBe(true)
	expect(isBareName('order')).toBe(false)
	expect(isBareName('count')).toBe(false)
	expect(isBareName('first name')).toBe(false)
	expect(isBareName('2nd')).toBe(false)
})
