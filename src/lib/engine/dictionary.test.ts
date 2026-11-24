import { expect, test } from 'vite-plus/test'

import { createInterner, encode } from './dictionary'

test.each([
	['nothing', []],
	['repeats', ['a', 'b', 'a', '', 'b', '']],
	['similar text', ['ab', 'ba', 'a', 'b', 'aa', 'AB', '1', '01', '1 ']],
	['all distinct, past several resizes', Array.from({ length: 50_000 }, (_, i) => `v${i}`)],
	['integers', Array.from({ length: 50_000 }, (_, i) => String(i % 7000))],
	['surrogates', ['😀', '\ud83d', '\ude00', '😀']],
])('%s: every row reads back as it was, and values are distinct', (_name, text) => {
	const { codes, values } = encode(text)
	expect(Array.from(codes, code => values[code])).toEqual(text)
	expect(values).toEqual([...new Set(text)])
})

test('has finds what was interned and nothing else', () => {
	const interner = createInterner()
	for (let i = 0; i < 5000; i++) interner.intern(`v${i}`)
	expect(interner.has('v4999')).toBe(true)
	expect(interner.has('v5000')).toBe(false)
	expect(interner.has('')).toBe(false)
})
