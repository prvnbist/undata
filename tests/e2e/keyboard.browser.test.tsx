import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import sampleCsv from '../fixtures/sample.csv?raw'
import { openFile, textFile, useApp } from './app'

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
