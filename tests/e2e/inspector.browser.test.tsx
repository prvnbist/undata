import { afterEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { setHidden } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

afterEach(async () => {
	await page.viewport(414, 896)
})

const json = JSON.stringify([
	{ name: 'Anna', age: 31, meta: { tags: ['a', 'b'] }, secret: 'x' },
	{ name: 'Ben', age: 42, meta: null, secret: 'y' },
	{ name: 'Carla', age: 27, secret: 'z' },
])

const open = async () => {
	await openFile(textFile(json, 'people.json'))
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
}

const panel = () => page.getByRole('complementary', { name: 'Row inspector' })
const grid = () => page.getByRole('grid', { name: 'Rows' })

const clipboard = () => {
	const writeText = vi.fn((_text: string) => Promise.resolve())
	vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard)
	return writeText
}

test('Enter on a cell opens its row with every column, hidden ones too, and JSON as a tree', async () => {
	await open()
	const { view, dataset } = useWorkspace.getState()
	await applyView(setHidden(view, dataset!.columns[3]!.id, true))
	await userEvent.click(page.getByRole('gridcell', { name: 'Anna' }))
	await userEvent.keyboard('{Enter}')

	await expect.element(panel()).toBeVisible()
	await expect.element(panel().getByRole('heading', { name: 'Row 1' })).toBeVisible()
	await expect.element(panel().getByText('· hidden')).toBeVisible()
	await expect.element(panel().getByText('x', { exact: true })).toBeVisible()
	await expect.element(panel().getByRole('list', { name: 'JSON value' })).toBeVisible()
	// Focus stays in the grid, so the arrows move the panel along.
	await expect.element(grid()).toHaveFocus()
	await userEvent.keyboard('{ArrowDown}')
	await expect.element(panel().getByRole('heading', { name: 'Row 2' })).toBeVisible()
	await expect.element(panel().getByText('null', { exact: true })).toBeVisible()
})

test('a click on a row number opens that row', async () => {
	await open()
	await userEvent.click(page.getByRole('rowheader', { name: '3' }))
	await expect.element(panel().getByRole('heading', { name: 'Row 3' })).toBeVisible()
	// A key the row does not have.
	await expect.element(panel().getByText('missing')).toBeVisible()
})

test('previous and next rows, and finding a field, by keyboard', async () => {
	await open()
	await userEvent.click(page.getByRole('rowheader', { name: '1' }))
	await userEvent.click(panel().getByRole('textbox', { name: 'Find a field' }))
	await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
	await expect.element(panel().getByRole('heading', { name: 'Row 2' })).toBeVisible()
	await expect.element(panel().getByText('2 of 3 in this view')).toBeVisible()
	await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}')
	await expect.element(panel().getByRole('heading', { name: 'Row 1' })).toBeVisible()
	await expect.element(panel().getByRole('button', { name: 'Previous row' })).toBeDisabled()

	await userEvent.keyboard('ag')
	await expect.element(panel().getByRole('button', { name: 'Copy age' })).toBeVisible()
	expect(panel().getByRole('button', { name: 'Copy name' }).elements()).toHaveLength(0)
	// Esc clears the search before it closes anything.
	await userEvent.keyboard('{Escape}')
	await expect.element(panel().getByRole('button', { name: 'Copy name' })).toBeVisible()
	await userEvent.keyboard('{Escape}')
	await expect.element(panel()).not.toBeInTheDocument()
	await expect.element(grid()).toHaveFocus()
})

test('copies a field as written, or the row as JSON', async () => {
	const writeText = clipboard()
	await open()
	await userEvent.click(page.getByRole('rowheader', { name: '1' }))
	await userEvent.click(panel().getByRole('button', { name: 'Copy age' }))
	expect(writeText).toHaveBeenLastCalledWith('31')

	await userEvent.click(panel().getByRole('button', { name: 'Copy row as JSON' }))
	expect(JSON.parse(writeText.mock.lastCall![0])).toEqual({
		name: 'Anna',
		age: 31,
		meta: { tags: ['a', 'b'] },
		secret: 'x',
	})
})

test('closes, and is a sheet below 1024 px and docked above', async () => {
	await open()
	await userEvent.click(page.getByRole('rowheader', { name: '1' }))
	expect(getComputedStyle(panel().element()).position).toBe('fixed')

	await page.viewport(1280, 800)
	await vi.waitFor(() => expect(getComputedStyle(panel().element()).position).toBe('static'))
	const box = panel().element().getBoundingClientRect()
	expect(box.right).toBeCloseTo(1280, 0)

	await userEvent.click(panel().getByRole('button', { name: 'Close row inspector' }))
	await expect.element(panel()).not.toBeInTheDocument()
	await expect.element(grid()).toHaveFocus()
})
