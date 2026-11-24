import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { applyColumns, applyView, closeDataset } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { mount, openFile, textFile, useApp } from './app'

useApp()

const csv = 'name,amount,note\nAnna,5,\nBen,12,x\nCarla,oops,y\n'

// `amount` is read as a number, so `oops` in it is malformed.
const open = async () => {
	await openFile(textFile(csv, 'people.csv'))
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
	const { dataset } = useWorkspace.getState()
	await applyColumns(
		dataset!.columns.map(({ id, title }) => ({
			id,
			title,
			type: title === 'amount' ? 'number' : 'text',
		}))
	)
	await vi.waitFor(() => expect(useWorkspace.getState().querying).toBe(false))
}

const status = () => page.getByRole('status').filter({ hasText: /rows?$/ })
const addButton = () => page.getByRole('button', { name: 'Add filter', exact: true })
const editor = () => page.getByRole('dialog')
const chip = (label: string) => page.getByRole('button', { name: `Edit filter: ${label}` })

const choose = async (field: 'Column' | 'Condition', option: string) => {
	await userEvent.click(editor().getByRole('combobox', { name: field }))
	await userEvent.click(page.getByRole('option', { name: option, exact: true }))
}

const optionsOf = async (field: 'Column' | 'Condition') => {
	await userEvent.click(editor().getByRole('combobox', { name: field }))
	const options = page
		.getByRole('option')
		.elements()
		.map(option => option.textContent)
	await userEvent.keyboard('{Escape}')
	return options
}

const waitForFocusIn = async (locator: ReturnType<typeof editor>) =>
	vi.waitFor(() => expect(locator.element().contains(document.activeElement)).toBe(true))

test('conditions match the column type, malformed and empty included', async () => {
	await open()
	await userEvent.click(addButton())
	await expect
		.element(editor().getByRole('combobox', { name: 'Column' }))
		.toHaveTextContent('name')
	const text = await optionsOf('Condition')
	expect(text).toContain('contains')
	expect(text).toContain('is empty')
	expect(text).not.toContain('>')
	expect(text.some(label => label?.startsWith('is not a valid'))).toBe(false)

	await choose('Column', 'amount')
	const number = await optionsOf('Condition')
	expect(number).toEqual(expect.arrayContaining(['=', '>', '≤', 'is between', 'is empty']))
	expect(number).toContain('is not a valid number')

	await choose('Condition', 'is not a valid number')
	await userEvent.click(editor().getByRole('button', { name: 'Add filter' }))
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
	await expect.element(chip('amount is not a valid number')).toBeVisible()
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
})

test('a value that does not fit is explained, and the rows stay as they were', async () => {
	await open()
	await userEvent.click(addButton())
	await choose('Column', 'amount')
	await choose('Condition', '>')
	await userEvent.fill(editor().getByRole('textbox', { name: 'Value' }), 'ten')
	await userEvent.click(editor().getByRole('button', { name: 'Add filter' }))

	await expect.element(page.getByRole('alert')).toHaveTextContent('“ten” is not a number value')
	await expect
		.element(editor().getByRole('textbox', { name: 'Value' }))
		.toHaveAttribute('aria-invalid', 'true')
	expect(useWorkspace.getState().view.filters).toEqual([])
	await expect.element(status()).toHaveTextContent('3 rows')

	await userEvent.fill(editor().getByRole('textbox', { name: 'Value' }), '10')
	await expect.element(page.getByRole('alert')).not.toBeInTheDocument()
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
	await expect.element(chip('amount > 10')).toBeVisible()
})

test('added, edited and removed by keyboard alone', async () => {
	await open()
	;(addButton().element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await waitForFocusIn(editor())

	// Column, then condition, then the value.
	await userEvent.tab()
	await userEvent.tab()
	await expect.element(editor().getByRole('textbox', { name: 'Value' })).toHaveFocus()
	await userEvent.keyboard('a{Enter}')
	await expect.element(status()).toHaveTextContent('2 of 3 rows')
	await expect.element(editor()).not.toBeInTheDocument()
	await expect.element(addButton()).toHaveFocus()

	// Editing changes the filter in place.
	;(chip('name contains “a”').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await waitForFocusIn(editor())
	await expect.element(editor().getByRole('textbox', { name: 'Value' })).toHaveValue('a')
	await userEvent.fill(editor().getByRole('textbox', { name: 'Value' }), 'carl')
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
	expect(useWorkspace.getState().view.filters).toHaveLength(1)
	await expect.element(chip('name contains “carl”')).toHaveFocus()

	await userEvent.tab()
	await expect
		.element(page.getByRole('button', { name: 'Remove filter: name contains “carl”' }))
		.toHaveFocus()
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('3 rows')
	await expect.element(addButton()).toHaveFocus()
})

test('is any of takes values one at a time', async () => {
	await open()
	await userEvent.click(addButton())
	await choose('Condition', 'is any of')
	await userEvent.click(editor().getByRole('textbox', { name: 'Add a value' }))
	await userEvent.keyboard('Anna{Enter}Ben{Enter}')
	await expect.element(editor().getByRole('list', { name: 'Values' })).toHaveTextContent('AnnaBen')
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('2 of 3 rows')
	await expect.element(chip('name is any of Anna, Ben')).toBeVisible()
})

test('several filters combine, and are cleared together', async () => {
	await open()
	const { dataset, view } = useWorkspace.getState()
	const [name, amount, note] = dataset!.columns
	await applyView({
		...view,
		filters: [
			{ columnId: note!.id, op: 'notEmpty' },
			{ columnId: amount!.id, op: 'gte', value: '1' },
			{ columnId: name!.id, op: 'contains', value: 'e' },
		],
	})
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
	await expect.element(page.getByRole('gridcell', { name: 'Ben' })).toBeVisible()

	await userEvent.click(page.getByRole('button', { name: 'Clear filters' }))
	await expect.element(status()).toHaveTextContent('3 rows')
	await expect.element(page.getByRole('region', { name: 'Filters' })).not.toBeInTheDocument()
	await expect.element(addButton()).toHaveFocus()
})

test('filters are kept with the dataset and come back when it is reopened', async () => {
	await open()
	const { dataset, view } = useWorkspace.getState()
	await applyView({ ...view, filters: [{ columnId: dataset!.columns[2]!.id, op: 'empty' }] })
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
	await vi.waitFor(async () => {
		const { listDatasets } = await import('@/lib/storage/datasets')
		const [stored] = await listDatasets()
		expect(stored!.view.filters).toHaveLength(1)
	})

	closeDataset()
	mount(`/d/${dataset!.id}`)
	await expect.element(chip('note is empty')).toBeVisible()
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
})

test('a filter a new type no longer fits is removed, and the user is told', async () => {
	await open()
	const { dataset, view } = useWorkspace.getState()
	const amount = dataset!.columns[1]!
	await applyView({ ...view, filters: [{ columnId: amount.id, op: 'gt', value: '10' }] })
	await expect.element(status()).toHaveTextContent('1 of 3 rows')

	await applyColumns(
		useWorkspace
			.getState()
			.dataset!.columns.map(({ id, title }) => ({ id, title, type: 'text' as const }))
	)
	await expect.element(status()).toHaveTextContent('3 rows')
	await expect
		.element(page.getByText('A filter no longer fit its column, so it was removed.'))
		.toBeVisible()
})
