import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { defaultView } from '@/lib/engine/view'
import { createEngineClient } from '@/workers/client'
import type { EngineClient } from '@/workers/client'
import type { Progress } from '@/workers/protocol'
import sampleCsv from '../fixtures/sample.csv?raw'

let client: EngineClient

beforeEach(() => {
	client = createEngineClient()
})
afterEach(() => client.terminate())

const file = (content: string, name = 'data.csv') => new File([content], name)

describe('open', () => {
	test('gives columns, inferred types, counts, warnings and progress for delimited text', async () => {
		const progress: Progress[] = []
		const opened = await client.open(file(sampleCsv + 'Bad,n/a\n'), {
			onProgress: p => progress.push(p),
		})

		expect(opened.rowCount).toBe(26)
		expect(opened.columns.slice(0, 3)).toMatchObject([
			{ id: 'c0', header: 'name', title: 'name', type: 'text', malformed: 0 },
			{ id: 'c1', header: 'age', type: 'text' },
			{ id: 'c2', header: 'active', type: 'boolean', empty: 1 },
		])
		expect(opened.warnings).toEqual([{ code: 'short-rows', count: 1, firstRow: 27 }])
		expect(opened.options).toMatchObject({ format: 'delimited', delimiter: ',' })
		expect(progress.map(p => p.phase)).toContain('reading')
		expect(progress.at(-1)).toEqual({ phase: 'checking', ratio: 1 })
	})

	test.each([
		['json', '[{"a":1},{"a":"x","b":null}]'],
		['ndjson', '{"a":1}\n{"a":"x","b":null}\n'],
	])('opens %s', async (format, content) => {
		const opened = await client.open(file(content))
		expect(opened).toMatchObject({ rowCount: 2, options: { format } })
		expect(opened.columns.map(c => c.header)).toEqual(['a', 'b'])
	})

	test('malformed values outside the sample are counted', async () => {
		const lines = Array.from({ length: 20_000 }, (_, i) => (i === 5000 ? 'oops' : String(i)))
		const opened = await client.open(file(`n,m\n${lines.map(n => `${n},1`).join('\n')}`))
		expect(opened.columns[0]).toMatchObject({ type: 'number', malformed: 1 })
	})

	test('a given setup replaces inference', async () => {
		const opened = await client.open(file('a,b\n1,2\n'), {
			setup: [
				{ id: 'c0', title: 'First', type: 'text' },
				{ id: 'c1', title: 'b', type: 'number' },
			],
		})
		expect(opened.columns).toMatchObject([
			{ title: 'First', header: 'a', type: 'text' },
			{ title: 'b', type: 'number' },
		])
	})

	test.each([
		['', 'empty'],
		['\u0000\u0001', 'binary'],
		['[{"a":}]', 'invalid-json'],
	])('%j fails with a typed error', async (content, code) => {
		await expect(client.open(file(content))).rejects.toMatchObject({ code })
	})

	test('a file bigger than one chunk keeps every character', async () => {
		// Chromium streams a file in pieces of at most 2 MB, and the parser works in pieces of 4 MB.
		const rows = Array.from({ length: 60_000 }, (_, i) => `${i},日本語😀é${i}"`.replace('"', ''))
		const opened = await client.open(
			file(`id,text\n${rows.map(r => `${r},${'ü'.repeat(60)}`).join('\n')}`)
		)
		const { queryId } = await client.query(defaultView(['c0', 'c1']))

		expect(opened.rowCount).toBe(60_000)
		for (const at of [0, 30_000, 59_999]) {
			const [row] = await client.rows(queryId, at, at + 1, ['c0', 'c1'])
			expect(row!.text).toEqual([String(at), `日本語😀é${at}`])
		}
		const all = await client.rows(queryId, 0, 60_000, ['c1', 'c2'])
		expect(all.every((row, i) => row.text[0] === `日本語😀é${i}`)).toBe(true)
		expect(opened.warnings).toHaveLength(1) // the extra untitled column
	})
})

describe('querying', () => {
	test('rows before a dataset is open fail with a typed error', async () => {
		await expect(client.rows(1, 0, 1, [])).rejects.toMatchObject({ code: 'no-dataset' })
	})

	test('only the newest of several queries runs', async () => {
		await client.open(file('a,b\n1,2\n'))
		const view = defaultView(['c0'])
		const settled = await Promise.allSettled([
			client.query(view),
			client.query(view),
			client.query(view),
		])

		expect(settled.map(s => s.status)).toEqual(['rejected', 'rejected', 'fulfilled'])
		expect(settled[0]).toMatchObject({ reason: { code: 'superseded' } })
	})

	test('rows of a query that is no longer current are refused', async () => {
		await client.open(file('a,b\n1,2\n'))
		const first = await client.query(defaultView(['c0']))
		await client.query(defaultView(['c0']))

		await expect(client.rows(first.queryId, 0, 1, ['c0'])).rejects.toMatchObject({
			code: 'superseded',
		})
	})

	test('changing a type recounts', async () => {
		await client.open(file('a,b\nx,2\n'))
		const columns = await client.setColumns([{ id: 'c0', title: 'a', type: 'number' }])
		expect(columns[0]).toMatchObject({ type: 'number', malformed: 1 })
	})

	test('terminating fails whatever is waiting', async () => {
		const opening = client.open(file('a,b\n1,2\n'))
		client.terminate()
		await expect(opening).rejects.toMatchObject({ code: 'superseded' })
	})
})

describe('filters', () => {
	const regex = (value: string) => ({
		...defaultView(['c0', 'c1']),
		filters: [{ columnId: 'c0', op: 'regex' as const, value }],
	})

	test('narrow the rows that are returned', async () => {
		await client.open(file('a,b\n3,x\n1,y\n2,z\n'))
		const { queryId, rowCount, dropped } = await client.query({
			...regex('[12]'),
			sort: [{ columnId: 'c0', desc: false }],
		})
		expect({ rowCount, dropped }).toEqual({ rowCount: 2, dropped: [] })
		expect((await client.rows(queryId, 0, 9, ['c1'])).map(r => r.text[0])).toEqual(['y', 'z'])
	})

	test('an invalid pattern is a typed error and leaves the engine working', async () => {
		await client.open(file('a,b\n3,x\n'))
		await expect(client.query(regex('('))).rejects.toMatchObject({ code: 'invalid-filter' })
		expect(await client.query(defaultView(['c0']))).toMatchObject({ rowCount: 1 })
	})

	test('a pattern that never finishes is dropped and the dataset stays as it was', async () => {
		client.terminate()
		client = createEngineClient({ regexTimeoutMs: 300 })
		await client.open(file(`a,b\n${'a'.repeat(60)}!,x\n1,y\n`))
		await client.setColumns([{ id: 'c1', title: 'renamed', type: 'number' }])

		const view = regex('^(a+)+$')
		const result = await client.query({ ...view, search: 'y' })
		expect(result).toMatchObject({ rowCount: 1, dropped: view.filters })
		expect(await client.rows(result.queryId, 0, 1, ['c0', 'c1'])).toMatchObject([
			{ text: ['1', 'y'] },
		])
		expect(await client.setColumns([])).toMatchObject([
			{ type: 'text' },
			{ type: 'number', title: 'renamed', malformed: 2 },
		])
	})
})

describe('stats', () => {
	test('cover the rows of the view', async () => {
		await client.open(file('a,b\n1,x\n2,y\n30,x\n'))
		const { queryId } = await client.query({
			...defaultView(['c0', 'c1']),
			filters: [{ columnId: 'c1', op: 'anyOf', values: ['x'] }],
		})
		expect(await client.stats(queryId, 'c0')).toMatchObject({
			rows: 2,
			distinct: 2,
			range: { min: '1', max: '30', mean: 15.5 },
		})
	})

	test('stats for an older view are dropped when a newer query arrives', async () => {
		await client.open(file('a,b\n1,x\n2,y\n'))
		const { queryId } = await client.query(defaultView(['c0']))
		const old = client.stats(queryId, 'c0')
		const query = client.query(defaultView(['c0']))

		await expect(old).rejects.toMatchObject({ code: 'superseded' })
		await expect(query).resolves.toMatchObject({ rowCount: 2 })
	})
})

describe('group', () => {
	test('groups the rows of the view, and reads the summary a window at a time', async () => {
		await client.open(file('city,amount\nOslo,1\nLima,2\nOslo,3\nRome,9\n'))
		const { queryId } = await client.query({
			...defaultView(['c0', 'c1']),
			filters: [{ columnId: 'c0', op: 'noneOf', values: ['Rome'] }],
		})
		const grouped = await client.group(queryId, {
			by: ['c0'],
			aggregates: [{ columnId: 'c1', fn: 'sum' }],
			sort: [{ key: 'count', desc: true }],
		})
		expect(grouped).toMatchObject({ groupCount: 2, malformed: [0] })
		expect(await client.groupRows(grouped.groupId, 0, 10)).toEqual([
			{ index: 0, keys: ['Oslo'], empty: [false], count: 2, values: ['4'] },
			{ index: 1, keys: ['Lima'], empty: [false], count: 1, values: ['2'] },
		])
	})

	test('a group for an older query is dropped', async () => {
		await client.open(file('a\n1\n'))
		const { queryId } = await client.query(defaultView(['c0']))
		// Caught from the start, so its failure is never left unhandled.
		const old = client.group(queryId, { by: ['c0'], aggregates: [], sort: [] }).then(
			() => null,
			(error: unknown) => error
		)
		await client.query(defaultView(['c0']))
		expect(await old).toMatchObject({ code: 'superseded' })
	})

	test('the whole summary exports as a file, and only for the newest groups', async () => {
		await client.open(file('city,amount\nOslo,1\nLima,2\nOslo,3\n'))
		const { queryId } = await client.query(defaultView(['c0', 'c1']))
		const grouping = { by: ['c0'], aggregates: [], sort: [] }
		const first = await client.group(queryId, grouping)
		const { groupId } = await client.group(queryId, grouping)
		const columns = [
			{ name: 'city', type: 'text' as const },
			{ name: 'Rows', type: 'number' as const },
		]
		const blob = await client.exportGroups({
			groupId,
			columns,
			format: 'csv',
			escapeFormulas: false,
		})
		expect(await blob.text()).toBe('city,Rows\nLima,1\nOslo,2\n')
		await expect(
			client.exportGroups({
				groupId: first.groupId,
				columns,
				format: 'csv',
				escapeFormulas: false,
			})
		).rejects.toMatchObject({ code: 'superseded' })
	})
})
