import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { blobKeys, deleteDataset, listDatasets } from '@/lib/storage/datasets'
import { applyColumns, applyView, closeDataset } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import sampleCsv from '../fixtures/sample.csv?raw'
import { mount, openFile, textFile, useApp } from '../e2e/app'

useApp()

const opened = async (name: string) => {
	await expect.element(page.getByRole('heading', { name })).toBeVisible()
	await vi.waitFor(() => expect(useWorkspace.getState().saved).toBe('saved'))
	return useWorkspace.getState().dataset!.id
}

// What a reload leaves: nothing in memory, the app starting again at the same address.
const reload = (path: string) => {
	closeDataset()
	return mount(path)
}

beforeEach(async () => {
	for (const { id } of await listDatasets()) await deleteDataset(id)
})

test('reload restores the dataset, its column setup and the view', async () => {
	await openFile(textFile(sampleCsv, 'people.csv'))
	const id = await opened('people.csv')
	const { view, dataset } = useWorkspace.getState()
	const first = dataset!.columns[0]!

	const setup = dataset!.columns.map(({ id, title, type }) => ({ id, title, type }))
	await applyColumns(
		setup.map((column, i) => (i === 0 ? { ...column, title: 'Renamed' } : column))
	)
	await applyView({ ...view, sort: [{ columnId: first.id, desc: true }] })
	await vi.waitFor(async () => {
		const [stored] = await listDatasets()
		expect(stored!.view.sort).toEqual([{ columnId: first.id, desc: true }])
		expect(stored!.setup[0]!.title).toBe('Renamed')
	})

	reload(`/d/${id}`)
	await expect.element(page.getByRole('heading', { name: 'people.csv' })).toBeVisible()
	const restored = useWorkspace.getState()
	expect(restored.view.sort).toEqual([{ columnId: first.id, desc: true }])
	expect(restored.dataset!.columns[0]!.title).toBe('Renamed')
	expect(restored.dataset!.columns.map(column => column.type)).toEqual(
		dataset!.columns.map(column => column.type)
	)
})

test('two datasets coexist and both are listed', async () => {
	await openFile(textFile('a,b\n1,2\n', 'first.csv'))
	await opened('first.csv')
	await openFile(textFile('c\nx\n', 'second.csv'))
	await opened('second.csv')

	reload('/start')
	const recents = page.getByRole('list', { name: 'Recent datasets' })
	await expect.element(recents.getByText('first.csv')).toBeVisible()
	await expect.element(recents.getByText('second.csv')).toBeVisible()
	await expect.element(recents.getByText(/^1 row × 2 columns · /)).toBeVisible()

	await recents.getByRole('link', { name: /first\.csv/ }).click()
	await expect.element(page.getByRole('heading', { name: 'first.csv' })).toBeVisible()
})

test('deleting a dataset removes its bytes', async () => {
	await openFile(textFile('a\n1\n', 'gone.csv'))
	const id = await opened('gone.csv')
	expect(await blobKeys()).toContain(id)

	reload('/start')
	await userEvent.click(page.getByRole('button', { name: 'Delete gone.csv' }))
	await expect.element(page.getByText('gone.csv')).not.toBeInTheDocument()
	expect(await blobKeys()).not.toContain(id)
	expect(await listDatasets()).toEqual([])
})

test('full storage still opens the dataset and says it is not saved', async () => {
	vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
		throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
	})

	await openFile(textFile(sampleCsv, 'big.csv'))
	await expect.element(page.getByText('Grace', { exact: true })).toBeVisible()
	await expect.element(page.getByText('Not saved', { exact: true })).toBeVisible()
	expect(useWorkspace.getState().saved).toBe('unsaved')
})

test('blocked storage still opens the dataset and says it is not saved', async () => {
	vi.spyOn(indexedDB, 'open').mockImplementation(() => {
		throw new DOMException('Storage is blocked.', 'SecurityError')
	})

	await openFile(textFile(sampleCsv, 'blocked.csv'))
	await expect.element(page.getByText('Grace', { exact: true })).toBeVisible()
	await expect.element(page.getByText('Not saved', { exact: true })).toBeVisible()
})
