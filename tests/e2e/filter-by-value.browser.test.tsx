import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { applyColumns } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

const csv = 'name,amount,note\nAnna,5,\nBen,12,x\nCarla,oops,y\nDan,7,x\n'

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
const cell = (name: string) => page.getByRole('gridcell', { name, exact: true })
const rightClick = (name: string) => userEvent.click(cell(name), { button: 'right' })
const item = (name: string | RegExp) => page.getByRole('menuitem', { name })

test('a cell filters to its value, or away from it', async () => {
	await open()
	await rightClick('Ben')
	await userEvent.click(item('Is “Ben”'))
	await expect.element(status()).toHaveTextContent('1 of 4 rows')
	await expect
		.element(page.getByRole('button', { name: 'Edit filter: name is any of Ben' }))
		.toBeVisible()
})

test('more values on the same column join one filter', async () => {
	await open()
	await rightClick('Ben')
	await userEvent.click(item('Is not “Ben”'))
	await expect.element(status()).toHaveTextContent('3 of 4 rows')
	await rightClick('Carla')
	await userEvent.click(item('Is not “Carla”'))
	await expect.element(status()).toHaveTextContent('2 of 4 rows')
	expect(useWorkspace.getState().view.filters).toEqual([
		expect.objectContaining({ op: 'noneOf', values: ['Ben', 'Carla'] }),
	])
	await expect
		.element(page.getByRole('button', { name: 'Edit filter: name is none of Ben, Carla' }))
		.toBeVisible()
})

test('an empty cell filters on being empty', async () => {
	await open()
	const empty = page
		.getByRole('row', { name: /^1 Anna/ })
		.getByRole('gridcell')
		.nth(2)
	await userEvent.click(empty, { button: 'right' })
	await userEvent.click(item('Hide empty'))
	await expect.element(status()).toHaveTextContent('3 of 4 rows')
	await expect.element(cell('Anna')).not.toBeInTheDocument()
})

test('the cell menu opens from the keyboard, on the active cell', async () => {
	await open()
	await userEvent.click(cell('Anna'))
	await userEvent.keyboard('{ArrowDown}{Shift>}{F10}{/Shift}')
	await expect.element(item('Is “Ben”')).toBeVisible()
	// The first item has focus, as with any menu opened from the keyboard.
	await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Is “Ben”'))
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('1 of 4 rows')
	await expect.element(page.getByRole('grid', { name: 'Rows' })).toHaveFocus()
})

test('the header menu filters on empty and malformed, with their counts', async () => {
	await open()
	await userEvent.click(page.getByRole('button', { name: 'Column menu for amount' }))
	await userEvent.click(item('Filter'))
	await expect.element(item('Only malformed 1')).toBeVisible()
	await expect.element(item('Only empty 0')).toHaveAttribute('aria-disabled', 'true')
	await userEvent.click(item('Only malformed 1'))
	await expect.element(status()).toHaveTextContent('1 of 4 rows')
	await expect.element(cell('Carla')).toBeVisible()

	// Its opposite replaces it rather than leaving no rows.
	await userEvent.click(page.getByRole('button', { name: 'Column menu for amount' }))
	await userEvent.click(item('Filter'))
	await userEvent.click(item('Hide malformed 1'))
	await expect.element(status()).toHaveTextContent('3 of 4 rows')
	expect(useWorkspace.getState().view.filters).toHaveLength(1)
})

test('a text column has no malformed filters', async () => {
	await open()
	await userEvent.click(page.getByRole('button', { name: 'Column menu for name' }))
	await userEvent.click(item('Filter'))
	await expect.element(item(/^Only empty/)).toBeVisible()
	expect(item(/malformed/).elements()).toHaveLength(0)
})
