import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import Papa from 'papaparse'
import { expect, test } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { Cell } from '@/components/grid/Cell'
import { DATA_TYPES } from '@/lib/constants'
import { CELL_KINDS } from '@/lib/import/types'
import { applyColumns, applyView } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import duplicateCsv from '../fixtures/duplicate-headers.csv?raw'
import sampleCsv from '../fixtures/sample.csv?raw'
import semicolonsCsv from '../fixtures/semicolons.csv?raw'
import trickyCsv from '../fixtures/tricky.csv?raw'
import { openFile, textFile, useApp } from './app'

useApp()

const grid = () => page.getByRole('grid', { name: 'Rows' })

test('the sample renders each inferred type through its renderer', async () => {
	await openFile(textFile(sampleCsv, 'sample.csv'))
	await expect.element(grid().getByText('Grace', { exact: true })).toBeVisible()

	await expect
		.element(grid().getByRole('link', { name: 'Open https://example.com/people/ada' }))
		.toBeVisible()
	await expect.element(grid().getByRole('checkbox').first()).toBeVisible()
	await expect.element(grid().getByText('09:00:00', { exact: true })).toBeVisible()
	await expect.element(grid().getByText('2020-01-01', { exact: true })).toBeVisible()

	// The rest are off to the right. Hiding the first ones brings them in.
	const { view } = useWorkspace.getState()
	await applyView({
		...view,
		columns: view.columns.map((column, i) => ({ ...column, hidden: i < 6 })),
	})
	await expect.element(grid().getByText('b0', { exact: true })).toBeVisible()
	await expect.element(grid().getByRole('button', { name: 'View JSON' }).first()).toBeVisible()
	expect(
		grid()
			.getByRole('img', { name: /^Not a valid/ })
			.elements()
	).toHaveLength(0)
})

test('JSON opens as a tree, without Monaco', async () => {
	await openFile(textFile('id,meta\n1,"{""big"": 12345678901234567890, ""role"": ""dev""}"\n'))
	await userEvent.click(grid().getByRole('button', { name: 'View JSON' }))

	const tree = page.getByRole('list', { name: 'JSON value' })
	await expect.element(tree.getByText('12345678901234567890')).toBeVisible()
	await expect.element(tree.getByText('"dev"')).toBeVisible()
	expect(document.querySelector('.monaco-editor')).toBeNull()
})

test('a value that does not fit the type shows as written, with a labelled marker', async () => {
	await openFile(textFile('amount\n12\nabc\n'))
	await expect.element(grid().getByText('abc', { exact: true })).toBeVisible()

	const { dataset } = useWorkspace.getState()
	await applyColumns(dataset!.columns.map(({ id, title }) => ({ id, title, type: 'number' })))

	await expect.element(grid().getByRole('img', { name: 'Not a valid number' })).toBeVisible()
	await expect.element(grid().getByText('abc', { exact: true })).toBeVisible()
	await expect.element(grid().getByText('12', { exact: true })).toBeVisible()
})

const ODD_VALUES = [
	'',
	' ',
	'javascript:alert(1)',
	'data:text/html,<b>x</b>',
	'{"a":',
	'[',
	'[]',
	'{}',
	'null',
	'1e999',
	'-0',
	'NaN',
	'24:00',
	'2020-02-30',
	'2020-01-01T25:00:00Z',
	"['a', {'b': 1}]",
	'x'.repeat(10_000),
	'\u0000￿',
	'https://',
	'www.',
]

test('no renderer throws for any fixture value in any type', () => {
	const values = new Set(ODD_VALUES)
	for (const csv of [sampleCsv, trickyCsv, duplicateCsv, semicolonsCsv]) {
		const { data } = Papa.parse<string[]>(csv, { skipEmptyLines: false })
		for (const row of data) for (const value of row) values.add(value)
	}

	const host = document.createElement('div')
	document.body.append(host)
	const root = createRoot(host)
	try {
		for (const { value: type } of DATA_TYPES) {
			for (const kind of [null, ...CELL_KINDS]) {
				flushSync(() =>
					root.render(
						<>
							{[...values].map((text, i) => (
								<Cell key={i} type={type} text={text} kind={kind} />
							))}
						</>
					)
				)
			}
		}
	} finally {
		root.unmount()
		host.remove()
	}
})
