import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { applyColumns, applyView } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import sampleCsv from '../fixtures/sample.csv?raw'
import { openFile, textFile, useApp } from './app'

useApp()

// Everything the page has asked the network for, as far as the browser can tell.
const requested = () =>
	performance.getEntriesByType('resource').map(entry => new URL(entry.name, location.href))

const foreign = (since: number) =>
	requested()
		.slice(since)
		.filter(url => url.origin !== location.origin && !['blob:', 'data:'].includes(url.protocol))
		.map(url => url.href)

test('importing and exploring a file asks nothing of any other origin', async () => {
	performance.setResourceTimingBufferSize(10_000)
	const since = requested().length
	const fetchSpy = vi.spyOn(window, 'fetch')

	await openFile(textFile(sampleCsv, 'sample.csv'))
	await expect.element(page.getByText('Grace', { exact: true })).toBeVisible()

	// Sort, hide, scroll sideways to the links, JSON and avatars, and open a JSON value.
	const { view, dataset } = useWorkspace.getState()
	await applyView({ ...view, sort: [{ columnId: dataset!.columns[1]!.id, desc: true }] })
	await applyView({
		...useWorkspace.getState().view,
		columns: view.columns.map((column, i) => ({ ...column, hidden: i < 6 })),
	})
	await userEvent.click(page.getByRole('button', { name: 'View JSON' }).first())
	await expect.element(page.getByRole('list', { name: 'JSON value' })).toBeVisible()
	await userEvent.keyboard('{Escape}')

	// Let anything lazy arrive before looking.
	await new Promise(resolve => setTimeout(resolve, 300))
	expect(foreign(since)).toEqual([])
	for (const [input] of fetchSpy.mock.calls) {
		expect(
			new URL(String(input instanceof Request ? input.url : input), location.href).origin
		).toBe(location.origin)
	}

	// The one exception: a column the user sets to `image` loads its pictures.
	const avatar = useWorkspace.getState().dataset!.columns.find(c => c.header === 'avatar')!
	await applyColumns(
		useWorkspace.getState().dataset!.columns.map(({ id, title, type }) => ({
			id,
			title,
			type: id === avatar.id ? 'image' : type,
		}))
	)
	await expect
		.element(page.getByRole('button', { name: 'Open image preview' }).first())
		.toBeVisible()
})
