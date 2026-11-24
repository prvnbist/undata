import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import type { Locator } from 'vite-plus/test/browser'

import { closeDataset } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import sampleCsv from '../fixtures/sample.csv?raw'
import { START, mount, openFile, textFile, useApp } from './app'

useApp()

const MOD = /Mac/.test(navigator.platform) ? 'Meta' : 'Control'
const grid = () => page.getByRole('grid', { name: 'Rows' })

// The cell the grid says is active.
const active = () => {
	const id = grid().element().getAttribute('aria-activedescendant')
	return id ? document.getElementById(id) : null
}
const activeText = () => active()?.textContent ?? null

const many = (rows: number) =>
	textFile(
		['n,label', ...Array.from({ length: rows }, (_, i) => `${i},row ${i}`)].join('\n') + '\n'
	)

const focusGrid = async () => {
	;(grid().element() as HTMLElement).focus()
	await expect.element(grid()).toHaveFocus()
}

test('arrows, Home and End move the active cell', async () => {
	await openFile(textFile('a,b,c\n1,2,3\n4,5,6\n'))
	await expect.element(grid().getByText('6', { exact: true })).toBeVisible()
	await focusGrid()

	await vi.waitFor(() => expect(activeText()).toBe('1'))
	await userEvent.keyboard('{ArrowRight}')
	await vi.waitFor(() => expect(activeText()).toBe('2'))
	await userEvent.keyboard('{ArrowDown}')
	await vi.waitFor(() => expect(activeText()).toBe('5'))
	await userEvent.keyboard('{End}')
	await vi.waitFor(() => expect(activeText()).toBe('6'))
	await userEvent.keyboard('{Home}')
	await vi.waitFor(() => expect(activeText()).toBe('4'))
	await userEvent.keyboard(`{${MOD}>}{ArrowUp}{/${MOD}}`)
	await vi.waitFor(() => expect(activeText()).toBe('1'))
})

test('page keys and Ctrl/⌘+End scroll the active cell into view', async () => {
	await openFile(many(2000))
	await expect.element(grid().getByText('row 0', { exact: true })).toBeVisible()
	await focusGrid()

	await userEvent.keyboard('{PageDown}')
	await vi.waitFor(() => expect(Number(activeText())).toBeGreaterThan(5))

	await userEvent.keyboard(`{${MOD}>}{End}{/${MOD}}`)
	await vi.waitFor(() => expect(activeText()).toBe('row 1999'))
	const cell = active()!.getBoundingClientRect()
	const view = grid().element().getBoundingClientRect()
	expect(cell.bottom).toBeLessThanOrEqual(view.bottom + 1)
	expect(cell.right).toBeLessThanOrEqual(view.right + 1)

	await userEvent.keyboard(`{${MOD}>}{Home}{/${MOD}}`)
	await vi.waitFor(() => expect(activeText()).toBe('0'))
})

test('Ctrl/⌘+C copies the raw text of the active cell', async () => {
	const writeText = vi.fn(() => Promise.resolve())
	vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard)

	await openFile(textFile('amount\n1000\n'))
	await expect.element(grid().getByText('1,000', { exact: true })).toBeVisible()
	await focusGrid()
	await userEvent.keyboard(`{${MOD}>}c{/${MOD}}`)

	await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('1000'))
})

test('the grid is one tab stop, with a visible active cell', async () => {
	await openFile(textFile(sampleCsv, 'sample.csv'))
	await expect
		.element(grid().getByRole('link', { name: 'Open https://example.com/people/ada' }))
		.toBeVisible()

	const controls = grid()
		.element()
		.querySelectorAll('[role="rowgroup"]:last-child a[href], [role="rowgroup"]:last-child button')
	expect(controls.length).toBeGreaterThan(0)
	for (const control of controls) expect(control.getAttribute('tabindex')).toBe('-1')

	await focusGrid()
	await vi.waitFor(() => expect(active()).not.toBeNull())
	expect(active()!.getAttribute('aria-selected')).toBe('true')
	expect(getComputedStyle(active()!).outlineStyle).not.toBe('none')
})

test('clicking a cell makes it the active one', async () => {
	await openFile(textFile('a,b\n1,2\n3,4\n'))
	await userEvent.click(grid().getByText('4', { exact: true }))
	await vi.waitFor(() => expect(activeText()).toBe('4'))
})

// Every user story, by keyboard alone. A file comes in by paste, which is Ctrl/⌘+V: the picker is the
// browser's own dialog, which a test cannot drive.

const people = 'name,amount,city\nAnna,5,Oslo\nBen,12,Lima\nCarla,,Oslo\nDan,7,Lima\n'

const status = () => page.getByRole('status').filter({ hasText: /rows?$/ })

const pasteData = async (text: string) => {
	mount(START)
	await expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
	const clipboardData = new DataTransfer()
	clipboardData.setData('text/plain', text)
	document.body.dispatchEvent(
		new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData })
	)
	await expect.element(grid()).toBeVisible()
	await vi.waitFor(() => expect(useWorkspace.getState().querying).toBe(false))
}

// Tab, or Shift+Tab, until the control has focus. Failing means it cannot be reached by Tab.
const tabTo = async (target: Locator, back = false) => {
	const element = target.element()
	for (let i = 0; i < 80 && document.activeElement !== element; i++) {
		await userEvent.keyboard(back ? '{Shift>}{Tab}{/Shift}' : '{Tab}')
	}
	expect(document.activeElement).toBe(element)
}

const pressOn = async (target: Locator, key = '{Enter}') => {
	await tabTo(target)
	await userEvent.keyboard(key)
}

const focused = (target: Locator) =>
	vi.waitFor(() => expect(target.element().contains(document.activeElement)).toBe(true))

test('story 1: pasted data opens as a typed grid, with no setup', async () => {
	await pasteData(people)
	expect(useWorkspace.getState().dataset!.columns.map(column => column.type)).toEqual([
		'text',
		'number',
		'text',
	])
	await expect.element(status()).toHaveTextContent('4 rows')
})

test('story 2: a column’s type, distribution and missing values, from its menu', async () => {
	await pasteData(people)
	await expect.element(page.getByRole('group', { name: 'Distribution of amount' })).toBeVisible()
	await pressOn(page.getByRole('button', { name: 'Column menu for amount' }))
	await focused(page.getByRole('menu'))
	await userEvent.keyboard('Details')
	await expect.element(page.getByRole('menuitem', { name: 'Details' })).toHaveFocus()
	await userEvent.keyboard('{Enter}')

	const details = page.getByRole('complementary')
	await expect.element(details.getByRole('heading', { name: 'amount Number' })).toHaveFocus()
	await expect.element(details.getByRole('term').filter({ hasText: 'Empty' })).toBeVisible()
})

test('story 3: search, a filter from a cell, and clearing them', async () => {
	await pasteData(people)
	await userEvent.keyboard('/')
	await expect.element(page.getByRole('searchbox', { name: 'Search rows' })).toHaveFocus()
	await userEvent.keyboard('lima')
	await expect.element(status()).toHaveTextContent('2 of 4 rows')
	await userEvent.keyboard('{Escape}')
	await expect.element(status()).toHaveTextContent('4 rows')
	await userEvent.keyboard('{Escape}')
	await expect.element(grid()).toHaveFocus()

	// From the first cell, down to Ben and his city.
	await userEvent.keyboard('{ArrowDown}{End}')
	await vi.waitFor(() => expect(activeText()).toBe('Lima'))
	await userEvent.keyboard('{Shift>}{F10}{/Shift}')
	await expect.element(page.getByRole('menuitem', { name: 'Is “Lima”' })).toHaveFocus()
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('2 of 4 rows')

	await pressOn(page.getByRole('button', { name: 'Clear filters' }))
	await expect.element(status()).toHaveTextContent('4 rows')
})

test('story 4: one record in the inspector, and the next', async () => {
	await pasteData(people)
	await focusGrid()
	await vi.waitFor(() => expect(activeText()).toBe('Anna'))
	await userEvent.keyboard('{Enter}')
	const panel = page.getByRole('complementary')
	await expect.element(panel.getByRole('heading', { name: 'Row 1' })).toBeVisible()
	await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}')
	await expect.element(panel.getByRole('heading', { name: 'Row 2' })).toBeVisible()
	await expect.element(panel.getByText('Ben', { exact: true })).toBeVisible()
	// Escape closes it from inside.
	await tabTo(panel.getByRole('button', { name: 'Previous row' }))
	await userEvent.keyboard('{Escape}')
	await expect.element(panel).not.toBeInTheDocument()
})

test('story 5: group by a column, open a group, and go back', async () => {
	await pasteData(people)
	await pressOn(page.getByRole('button', { name: 'Group rows' }))
	const editor = page.getByRole('dialog', { name: 'Group rows' })
	await focused(editor)
	await pressOn(editor.getByRole('checkbox', { name: 'city' }), ' ')
	await pressOn(editor.getByRole('checkbox', { name: 'Sum of amount' }), ' ')
	await userEvent.keyboard('{Escape}')
	await expect.element(page.getByRole('button', { name: 'Group rows' })).toHaveFocus()

	await expect.element(page.getByRole('table', { name: 'Groups' })).toBeVisible()
	await pressOn(page.getByRole('button', { name: 'Open group: Oslo' }))
	await expect.element(status()).toHaveTextContent('2 of 4 rows')
	await pressOn(page.getByRole('button', { name: 'Back to groups' }), '{Enter}')
	await expect.element(page.getByRole('button', { name: 'Open group: Oslo' })).toHaveFocus()
})

test('story 6: save a view, and find it after a reload', async () => {
	await pasteData(people)
	await focusGrid()
	await userEvent.keyboard('{ArrowRight}')
	await pressOn(page.getByRole('button', { name: 'Column menu for amount' }))
	await focused(page.getByRole('menu'))
	await userEvent.keyboard('{Enter}')
	await expect.element(page.getByRole('menu')).not.toBeInTheDocument()
	await vi.waitFor(() =>
		expect(useWorkspace.getState().view.sort).toEqual([
			{ columnId: useWorkspace.getState().dataset!.columns[1]!.id, desc: false },
		])
	)

	await pressOn(page.getByRole('button', { name: 'View: All rows' }))
	await focused(page.getByRole('menu'))
	await userEvent.keyboard('{End}')
	await expect.element(page.getByRole('menuitem', { name: 'Save as a new view…' })).toHaveFocus()
	await userEvent.keyboard('{Enter}')
	const dialog = page.getByRole('dialog', { name: 'Save view' })
	const name = dialog.getByRole('textbox', { name: 'Name' })
	await expect.element(name).toHaveFocus()
	await expect.element(page.getByRole('menu')).not.toBeInTheDocument()
	await userEvent.fill(name, 'Cheapest')
	await expect.element(name).toHaveFocus()
	await userEvent.keyboard('{Enter}')
	await expect.element(page.getByRole('button', { name: 'View: Cheapest' })).toHaveFocus()

	await vi.waitFor(() => expect(useWorkspace.getState().saved).toBe('saved'))
	const id = useWorkspace.getState().dataset!.id
	await vi.waitFor(async () => {
		const { listViews } = await import('@/lib/storage/views')
		expect(await listViews(id)).toHaveLength(1)
	})
	closeDataset()
	mount(`/d/${id}`)
	await expect.element(page.getByRole('button', { name: 'View: Cheapest' })).toBeVisible()
	expect(useWorkspace.getState().view.sort).toHaveLength(1)
})

test('story 7: export what is on screen, from the command palette', async () => {
	const saved: Blob[] = []
	vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
		saved.push(blob as Blob)
		return 'blob:test'
	})
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

	await pasteData(people)
	await userEvent.keyboard('/')
	await userEvent.keyboard('oslo')
	await expect.element(status()).toHaveTextContent('2 of 4 rows')
	await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
	await expect.element(page.getByRole('combobox')).toHaveFocus()
	await userEvent.keyboard('export{Enter}')
	const dialog = page.getByRole('dialog', { name: 'Export' })
	await focused(dialog)
	await pressOn(dialog.getByRole('button', { name: 'Export CSV' }))
	await vi.waitFor(() => expect(saved).toHaveLength(1))
	expect(await saved[0]!.text()).toBe('name,amount,city\nAnna,5,Oslo\nCarla,,Oslo\n')
})
