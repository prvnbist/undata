import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import type { Grouping } from '@/lib/engine/view'
import { applyView, closeDataset, importDataset } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

const csv = 'city,amount\nOslo,10\nLima,5\nOslo,2\n,7\nLima,1\nOslo,3\n'

let saved: { blob: Blob; name: string }[] = []

beforeEach(() => {
	saved = []
	const blobs = new Map<string, Blob>()
	vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
		const url = `blob:test/${blobs.size}`
		blobs.set(url, object as Blob)
		return url
	})
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
		this: HTMLAnchorElement
	) {
		saved.push({ blob: blobs.get(this.href)!, name: this.download })
	})
})

const open = async () => {
	await openFile(textFile(csv, 'sales.csv'))
	await expect.element(page.getByRole('gridcell', { name: 'Lima' }).first()).toBeVisible()
	const { dataset } = useWorkspace.getState()
	expect(dataset!.columns.map(column => column.type)).toEqual(['text', 'number'])
}

const ids = () => {
	const [city, amount] = useWorkspace.getState().dataset!.columns
	return { city: city!.id, amount: amount!.id }
}

const group = async (grouping: Partial<Grouping>) => {
	const { view } = useWorkspace.getState()
	await applyView({ ...view, grouping: { by: [], aggregates: [], sort: [], ...grouping } })
	await expect.element(summary()).toBeVisible()
}

const summary = () => page.getByRole('table', { name: 'Groups' })
const status = () => page.getByRole('status').filter({ hasText: /rows?$/ })

// Every body row of the summary as its cells' text.
const rowsOf = async () => {
	await vi.waitFor(() =>
		expect(summary().element().querySelectorAll('tbody tr[data-index]').length).toBeGreaterThan(0)
	)
	return [...summary().element().querySelectorAll('tbody tr[data-index]')].map(row =>
		[...row.querySelectorAll('td')].map(cell => cell.textContent)
	)
}

test('groups from the header menu, counted, with the empty cells as one group', async () => {
	await open()
	await userEvent.click(page.getByRole('button', { name: 'Column menu for city' }))
	await userEvent.click(page.getByRole('menuitem', { name: 'Group by this column' }))

	await expect.element(summary()).toBeVisible()
	expect(await rowsOf()).toEqual([
		['Lima', '2'],
		['Oslo', '3'],
		['(empty)', '1'],
	])
	await expect.element(status()).toHaveTextContent('3 groups from 6 rows')
	await expect
		.element(page.getByRole('region', { name: 'Grouping' }).getByText('Grouped by city'))
		.toBeVisible()
})

test('columns and aggregates from the bar, and the summary sorts by any of them', async () => {
	await open()
	await userEvent.click(page.getByRole('button', { name: 'Group rows' }))
	const editor = page.getByRole('dialog', { name: 'Group rows' })
	await userEvent.click(editor.getByRole('checkbox', { name: 'city' }))
	await expect.element(summary()).toBeVisible()
	// Text has nothing to add up.
	await expect
		.element(editor.getByRole('checkbox', { name: 'Sum of city' }))
		.not.toBeInTheDocument()
	await userEvent.click(editor.getByRole('checkbox', { name: 'Sum of amount' }))
	await userEvent.keyboard('{Escape}')

	await expect.element(page.getByRole('columnheader', { name: 'Sum of amount' })).toBeVisible()
	expect(await rowsOf()).toEqual([
		['Lima', '2', '6'],
		['Oslo', '3', '15'],
		['(empty)', '1', '7'],
	])

	const sortBy = page.getByRole('button', { name: 'Sort by Sum of amount' })
	await userEvent.click(sortBy)
	await vi.waitFor(async () =>
		expect((await rowsOf()).map(row => row[2])).toEqual(['6', '7', '15'])
	)
	await expect
		.element(page.getByRole('columnheader', { name: 'Sum of amount' }))
		.toHaveAttribute('aria-sort', 'ascending')
	await userEvent.click(sortBy)
	await vi.waitFor(async () =>
		expect((await rowsOf()).map(row => row[2])).toEqual(['15', '7', '6'])
	)
	expect(useWorkspace.getState().view.grouping!.sort).toEqual([
		{ key: `sum:${ids().amount}`, desc: true },
	])

	// Taking every column away goes back to the rows.
	await userEvent.click(page.getByRole('button', { name: 'Ungroup' }))
	await expect.element(summary()).not.toBeInTheDocument()
	await expect.element(page.getByRole('grid')).toBeVisible()
})

test('opening a group shows its rows with matching filters, and Back returns', async () => {
	await open()
	await group({ by: [ids().city] })
	await userEvent.click(page.getByRole('button', { name: 'Open group: Oslo' }))

	await expect.element(page.getByRole('grid')).toBeVisible()
	await expect.element(status()).toHaveTextContent('3 of 6 rows')
	await expect
		.element(page.getByRole('button', { name: 'Edit filter: city is any of Oslo' }))
		.toBeVisible()

	await userEvent.click(page.getByRole('button', { name: 'Back to groups' }))
	await expect.element(summary()).toBeVisible()
	expect(useWorkspace.getState().view.filters).toEqual([])
	await expect
		.element(page.getByRole('button', { name: 'Back to groups' }))
		.not.toBeInTheDocument()
	await expect.element(page.getByRole('button', { name: 'Open group: Oslo' })).toHaveFocus()
})

test('the empty group opens as an empty filter', async () => {
	await open()
	await group({ by: [ids().city] })
	await userEvent.click(page.getByRole('button', { name: 'Open group: (empty)' }))
	await expect.element(status()).toHaveTextContent('1 of 6 rows')
	expect(useWorkspace.getState().view.filters).toEqual([{ columnId: ids().city, op: 'empty' }])
})

test('the summary copies as CSV and exports as a file', async () => {
	await open()
	await group({ by: [ids().city], aggregates: [{ columnId: ids().amount, fn: 'avg' }] })
	const writeText = vi.fn(() => Promise.resolve())
	vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard)

	await userEvent.click(page.getByRole('button', { name: 'Copy summary' }))
	await vi.waitFor(() =>
		expect(writeText).toHaveBeenCalledWith('city,Rows,Mean of amount\nLima,2,3\nOslo,3,5\n,1,7\n')
	)

	await userEvent.click(page.getByRole('button', { name: 'Export', exact: true }))
	const dialog = page.getByRole('dialog', { name: 'Export' })
	await expect.element(dialog.getByText('The summary, 3 groups')).toBeVisible()
	await userEvent.click(dialog.getByText('JSON', { exact: true }))
	await userEvent.click(dialog.getByRole('button', { name: 'Export JSON' }))
	await vi.waitFor(() => expect(saved).toHaveLength(1))
	expect(saved[0]!.name).toBe('sales-groups.json')
	expect(JSON.parse(await saved[0]!.blob.text())).toEqual([
		{ city: 'Lima', Rows: 2, 'Mean of amount': 3 },
		{ city: 'Oslo', Rows: 3, 'Mean of amount': 5 },
		{ city: null, Rows: 1, 'Mean of amount': 7 },
	])
})

test('a grouping that is saved comes back with the dataset', async () => {
	await open()
	await group({ by: [ids().city] })
	const { dataset } = useWorkspace.getState()
	await vi.waitFor(() => expect(useWorkspace.getState().saved).toBe('saved'))
	const { view } = useWorkspace.getState()
	closeDataset()
	await importDataset({
		blob: new Blob([csv]),
		name: 'sales.csv',
		id: dataset!.id,
		view,
		known: true,
	}).done
	expect(useWorkspace.getState().groups?.groupCount).toBe(3)
})
