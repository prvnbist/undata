import { expect, test } from 'vite-plus/test'

import { DATA_TYPES } from './constants'

test('lists every data type once, sorted by label', () => {
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
