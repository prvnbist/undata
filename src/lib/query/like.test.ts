import { describe, expect, test } from 'vite-plus/test'

import { parseRegex } from '@/lib/engine/match'

import { likeToTest, regexToLike } from './like'

describe('likeToTest', () => {
	test('%text% is contains, with escapes read', () => {
		expect(likeToTest('%paid%')).toEqual({ op: 'contains', value: 'paid' })
		expect(likeToTest(String.raw`%50\%%`)).toEqual({ op: 'contains', value: '50%' })
	})

	test('any other pattern matches the whole cell, ignoring case', () => {
		const { op, value } = likeToTest('a_c%')
		expect(op).toBe('regex')
		const pattern = parseRegex(value)!
		expect(['abc', 'ABCdef', 'a.cx'].map(text => pattern.test(text))).toEqual([true, true, true])
		expect(['xabc', 'ac'].map(text => pattern.test(text))).toEqual([false, false])
	})

	test('characters a regular expression gives a meaning to are themselves', () => {
		const pattern = parseRegex(likeToTest('(1+1)/2.%').value)!
		expect(pattern.test('(1+1)/2.0')).toBe(true)
		expect(pattern.test('11/2x0')).toBe(false)
	})
})

describe('regexToLike', () => {
	test.each(['a%', 'a_c', '%', String.raw`50\%%`, '(1+1)/2.*?', String.raw`back\\slash%`])(
		'reads back %s',
		like => {
			expect(regexToLike(likeToTest(like).value)).toBe(like)
		}
	)

	test('null for a pattern LIKE did not make', () => {
		expect(regexToLike('^a')).toBeNull()
		expect(regexToLike('/^a+$/is')).toBeNull()
		expect(regexToLike('/^a$/i')).toBeNull()
	})
})
