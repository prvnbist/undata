import { expect, test } from 'vite-plus/test'

import { makeSample } from './sample'

test('the sample is the same every time', () => {
	expect(makeSample()).toBe(makeSample())
	expect(makeSample(3).trim().split('\n')).toHaveLength(4)
})
