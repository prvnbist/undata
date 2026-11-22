import { afterEach, expect, test } from 'vite-plus/test'

import { createEngineClient } from '@/workers/client'
import sampleCsv from '../fixtures/sample.csv?raw'

let client: ReturnType<typeof createEngineClient> | null = null

afterEach(() => {
	client?.terminate()
	client = null
})

test('opens a file in a real worker and returns exact row windows', async () => {
	client = createEngineClient()

	const opened = await client.open(new File([sampleCsv], 'sample.csv', { type: 'text/csv' }))

	expect(opened.rowCount).toBe(25)
	expect(opened.headers.slice(0, 3)).toEqual(['name', 'age', 'active'])

	const first = await client.rows(0, 2)
	expect(first[0]!.slice(0, 3)).toEqual(['Ada', '20', 'true'])
	expect(first).toHaveLength(2)

	const last = await client.rows(24, 25)
	expect(last).toHaveLength(1)
})

test('a file the worker cannot read fails with a typed error', async () => {
	client = createEngineClient()

	await expect(client.open(new File([], 'empty.csv'))).rejects.toMatchObject({
		code: 'empty',
	})
})
