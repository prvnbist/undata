import { expect, test } from 'vite-plus/test'

import { CELL_KINDS, CELL_KIND_CODE } from './types'

test('kind codes follow the order of CELL_KINDS', () => {
	expect(CELL_KINDS.map(kind => CELL_KIND_CODE[kind])).toEqual(CELL_KINDS.map((_, i) => i))
})

test('missing is code 0, because a new Uint8Array is all zeros and so all missing', () => {
	expect(CELL_KIND_CODE.missing).toBe(0)
})
