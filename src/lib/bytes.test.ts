import { expect, test } from 'vite-plus/test'

import { formatBytes } from './bytes'

test.each([
	[0, '0 B'],
	[999, '999 B'],
	[1500, '1.5 KB'],
	[9960, '10 KB'],
	[999_600, '1.0 MB'],
	[106_000_000, '106 MB'],
	[2_500_000_000, '2.5 GB'],
])('%d bytes is %s', (bytes, text) => {
	expect(formatBytes(bytes)).toBe(text)
})
