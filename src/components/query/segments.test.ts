import { expect, test } from 'vite-plus/test'

import { segmentsOf } from './segments'

const kinds = (source: string) =>
	segmentsOf(source, null)
		.filter(segment => segment.kind !== 'space')
		.map(segment => `${segment.kind}:${segment.text}`)

test('keywords, functions, names, text and numbers each have a kind', () => {
	expect(kinds(`SELECT sum(a), "b" WHERE c = 'x' AND d > 1 -- hi`)).toEqual([
		'keyword:SELECT',
		'function:sum',
		'op:(',
		'word:a',
		'op:)',
		'op:,',
		'ident:"b"',
		'keyword:WHERE',
		'word:c',
		'op:=',
		"string:'x'",
		'keyword:AND',
		'word:d',
		'op:>',
		'number:1',
		'comment:-- hi',
	])
})

test('a column called like a function is a name', () => {
	expect(kinds('SELECT count')).toEqual(['keyword:SELECT', 'word:count'])
})

test('the part an error is about is cut out and marked, and the text is all there', () => {
	const source = 'WHERE abc OR d'
	const segments = segmentsOf(source, { from: 7, to: 12 })
	expect(segments.map(segment => segment.text).join('')).toBe(source)
	expect(segments.filter(segment => segment.error).map(segment => segment.text)).toEqual([
		'bc',
		' ',
		'OR',
	])
})

test('an error at the end marks a space after the text', () => {
	const segments = segmentsOf('WHERE a =', { from: 9, to: 9 })
	expect(segments.at(-1)).toEqual({ text: ' ', kind: 'space', error: true })
})
