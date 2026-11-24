import { expect, test } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { workspace } from '@/store/workspace'
import { START, mount, openFile, textFile, useApp } from './app'

useApp()

const transferOf = (...files: File[]) => {
	const transfer = new DataTransfer()
	for (const file of files) transfer.items.add(file)
	return transfer
}

const drag = (type: string, dataTransfer: DataTransfer, target: EventTarget = document.body) => {
	const event = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer })
	target.dispatchEvent(event)
	return event
}

const paste = (text: string, target: EventTarget = document.body, ...files: File[]) => {
	const clipboardData = transferOf(...files)
	if (text) clipboardData.setData('text/plain', text)
	target.dispatchEvent(
		new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData })
	)
}

const started = () =>
	expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
const cell = (name: string) => page.getByRole('gridcell', { name, exact: true })

test('dropping a file on the start screen opens it', async () => {
	mount(START)
	await started()

	const file = textFile('id\ndropped\n')
	expect(drag('dragover', transferOf(file)).defaultPrevented).toBe(true)
	await expect.element(page.getByText('Drop to open')).toBeVisible()
	drag('drop', transferOf(file))

	await expect.element(cell('dropped')).toBeVisible()
	await expect.element(page.getByText('Drop to open')).not.toBeInTheDocument()
})

test('dropping a file on an open dataset opens it in its place', async () => {
	const router = await openFile(textFile('id\nfirst\n'))
	await expect.element(cell('first')).toBeVisible()
	const before = router.state.location.pathname

	drag('drop', transferOf(textFile('id\nsecond\n', 'other.csv')))
	await expect.element(cell('second')).toBeVisible()
	await expect.element(page.getByRole('heading', { name: 'other.csv' })).toBeVisible()
	expect(router.state.location.pathname).not.toBe(before)
})

test('dropping a file on a failure opens it', async () => {
	await openFile(textFile(''))
	await expect.element(page.getByRole('alert')).toBeVisible()
	drag('drop', transferOf(textFile('id\nbetter\n')))
	await expect.element(cell('better')).toBeVisible()
})

test('only the first of several files is opened, and that is said', async () => {
	mount(START)
	await started()
	drag('drop', transferOf(textFile('id\none\n', 'a.csv'), textFile('id\ntwo\n', 'b.csv')))
	await expect.element(cell('one')).toBeVisible()
	await expect.element(page.getByRole('status').getByText(/only a\.csv was opened/i)).toBeVisible()
})

test('dragging something that is not a file is left alone', async () => {
	mount(START)
	await started()
	const transfer = new DataTransfer()
	transfer.setData('text/plain', 'words')
	expect(drag('dragover', transfer).defaultPrevented).toBe(false)
	await expect.element(page.getByText('Drop to open')).not.toBeInTheDocument()
})

test.each([
	['CSV', 'id,name\n1,pasted\n'],
	['JSON', '[{"id": 1, "name": "pasted"}]'],
	['cells from a spreadsheet', 'id\tname\n1\tpasted'],
])('pasting %s opens it', async (_, text) => {
	mount(START)
	await started()
	paste(text)
	await expect.element(cell('pasted')).toBeVisible()
	await expect.element(page.getByRole('heading', { name: 'Pasted data' })).toBeVisible()
	expect(workspace.get().dataset?.columns).toHaveLength(2)
})

test('pasting a copied file opens it', async () => {
	mount(START)
	await started()
	paste('', document.body, textFile('id\ncopied\n', 'copied.csv'))
	await expect.element(cell('copied')).toBeVisible()
})

test('pasting into a field is left to the field', async () => {
	mount(START)
	await started()
	const field = document.createElement('input')
	document.body.append(field)
	paste('id,name\n1,pasted\n', field)
	await new Promise(resolve => setTimeout(resolve, 50))
	expect(workspace.get().phase.kind).toBe('idle')
	field.remove()
})

test('pasting something that is not data says so', async () => {
	mount(START)
	await started()
	paste('just a few words')
	await expect.element(page.getByRole('status').getByText(/not a table/)).toBeVisible()
	expect(workspace.get().phase.kind).toBe('idle')
	await page.getByRole('button', { name: 'Dismiss' }).click()
	await expect.element(page.getByText(/not a table/)).not.toBeInTheDocument()
})

test('sample data opens in one action', async () => {
	mount(START)
	await page.getByRole('button', { name: 'Try sample data' }).click()
	await expect.element(page.getByRole('heading', { name: 'sample-orders.csv' })).toBeVisible()
	await expect.element(page.getByRole('columnheader', { name: 'status' })).toBeVisible()

	const types = Object.fromEntries(
		workspace.get().dataset!.columns.map(column => [column.title, column.type])
	)
	expect(types).toMatchObject({
		order_id: 'text',
		amount: 'number',
		paid: 'boolean',
		ordered_at: 'timestamptz',
		website: 'url',
		tags: 'tag',
		address: 'json',
	})
	// Something to find.
	expect(workspace.get().dataset!.columns.some(column => column.malformed > 0)).toBe(true)
	expect(workspace.get().dataset!.columns.some(column => column.empty > 0)).toBe(true)
})

test('the whole app can be opened by keyboard alone', async () => {
	mount(START)
	await started()
	await userEvent.keyboard('{Tab}')
	await expect.element(page.getByRole('button', { name: 'Choose a file' })).toHaveFocus()
	await userEvent.keyboard('{Tab}{Enter}')
	await expect.element(page.getByRole('heading', { name: 'sample-orders.csv' })).toBeVisible()
})
