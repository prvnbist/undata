import { expect, test } from 'vite-plus/test'

import { DATA_TYPES, DATE_DATA_TYPES, DATE_TYPES_FORMAT } from './constants'

test('lists every data type, sorted by label', () => {
	expect(DATA_TYPES.map(type => type.value)).toEqual([
		'boolean',
		'date',
		'image',
		'json',
		'url',
		'number',
		'tag',
		'text',
		'time',
		'timetz',
		'timestamp',
		'timestamptz',
	])
})

test('has a format for every date type', () => {
	expect(Object.keys(DATE_TYPES_FORMAT)).toEqual(Object.keys(DATE_DATA_TYPES))
})
