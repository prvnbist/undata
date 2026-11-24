import { expect, test } from 'vite-plus/test'

import { completionsAt } from './complete'
import type { QueryColumn } from './compile'

const columns: QueryColumn[] = [
	{ id: 'c0', title: 'name', type: 'text' },
	{ id: 'c1', title: 'amount', type: 'number' },
	{ id: 'c2', title: 'Joined On', type: 'date' },
	{ id: 'c3', title: 'surname', type: 'text' },
]

// `|` marks the cursor.
const at = (text: string, force = false) => {
	const cursor = text.indexOf('|')
	return completionsAt(text.replace('|', ''), cursor, columns, { force })
}
const labels = (text: string, force = false) => at(text, force)?.items.map(item => item.label) ?? []

test('columns that start with the word come first, then those that contain it', () => {
	expect(labels('SELECT na|')).toEqual(['name', 'surname'])
})

test('keywords and functions are offered by their start', () => {
	expect(labels('SELECT * WH|')).toEqual(['WHERE'])
	expect(labels('SELECT su|')).toEqual(['surname', 'sum('])
})

test('a word that is complete is not offered again', () => {
	expect(labels('SELECT * WHERE|')).toEqual([])
})

test('the whole word around the cursor is replaced, and names are written to read back', () => {
	const result = at('SELECT jo|ined')!
	expect(result).toMatchObject({ from: 7, to: 13 })
	expect(result.items[0]).toMatchObject({
		label: 'Joined On',
		insert: '"Joined On"',
		detail: 'date',
	})
})

test('inside double quotes, only columns, replacing the quoted name', () => {
	const result = at('SELECT "Joi|')!
	expect(result.items.map(item => item.insert)).toEqual(['"Joined On"'])
	expect(result).toMatchObject({ from: 7, to: 11 })
})

test('nothing inside text, a comment, or after a number', () => {
	expect(labels(`WHERE name = 'na|'`)).toEqual([])
	expect(labels(`-- na|`)).toEqual([])
	expect(labels(`WHERE amount > 1|`)).toEqual([])
})

test('an empty word offers nothing unless asked', () => {
	expect(labels('SELECT |')).toEqual([])
	expect(labels('SELECT |', true).slice(0, 4)).toEqual(['name', 'amount', 'Joined On', 'surname'])
})
