import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { useWorkspace } from '@/store/workspace'
import { START, mount, openFile, textFile, useApp } from './app'

useApp()

const MOD = /Mac/.test(navigator.platform) ? 'Meta' : 'Control'
const palette = () => page.getByRole('combobox', { name: 'Command' })

const run = async (query: string) => {
	await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
	await expect.element(palette()).toHaveFocus()
	await userEvent.fill(palette(), query)
	await userEvent.keyboard('{Enter}')
	await expect.element(palette()).not.toBeInTheDocument()
}

const columnsButton = () => page.getByRole('button', { name: 'Columns' })

test('sorts and hides a column, and focus goes back where it was', async () => {
	await openFile(textFile('amount,note\n1,x\n3,y\n2,z\n'))
	await expect.element(columnsButton()).toBeVisible()
	;(columnsButton().element() as HTMLElement).focus()

	await run('amount desc')
	await expect
		.element(page.getByRole('columnheader', { name: 'amount', exact: true }))
		.toHaveAttribute('aria-sort', 'descending')
	await expect.element(columnsButton()).toHaveFocus()

	await run('hide note')
	await expect
		.element(page.getByRole('columnheader', { name: 'note', exact: true }))
		.not.toBeInTheDocument()
})

test('the arrow keys move through matches, and Escape closes without running anything', async () => {
	await openFile(textFile('amount,note\n1,x\n'))
	await expect.element(columnsButton()).toBeVisible()
	await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
	await userEvent.fill(palette(), 'sort amount')

	await expect
		.element(page.getByRole('option', { name: /Sort by amount, ascending/ }))
		.toHaveAttribute('aria-selected', 'true')
	await userEvent.keyboard('{ArrowDown}')
	await expect
		.element(page.getByRole('option', { name: /Sort by amount, descending/ }))
		.toHaveAttribute('aria-selected', 'true')

	await userEvent.keyboard('{Escape}')
	await expect.element(palette()).not.toBeInTheDocument()
	expect(useWorkspace.getState().view.sort).toEqual([])
})

test('goes to a column far off to the side, showing it if it was hidden', async () => {
	const headers = Array.from({ length: 60 }, (_, i) => `col${i}`)
	await openFile(textFile(`${headers.join(',')}\n${headers.map((_, i) => i).join(',')}\n`))
	await expect.element(page.getByRole('columnheader', { name: 'col0', exact: true })).toBeVisible()

	await run('hide col55')
	await run('go to col55')

	const grid = page.getByRole('grid', { name: 'Rows' })
	await expect.element(grid).toHaveFocus()
	await vi.waitFor(() => {
		const id = grid.element().getAttribute('aria-activedescendant')
		expect(id && document.getElementById(id)?.textContent).toBe('55')
	})
	await expect
		.element(page.getByRole('columnheader', { name: 'col55', exact: true }))
		.toBeVisible()
})

test('opens the export dialog, which gives focus back on close', async () => {
	await openFile(textFile('a\n1\n'))
	await expect.element(columnsButton()).toBeVisible()
	;(columnsButton().element() as HTMLElement).focus()

	await run('export')
	await expect.element(page.getByRole('dialog', { name: 'Export' })).toBeVisible()
	await userEvent.keyboard('{Escape}')
	await expect.element(page.getByRole('dialog', { name: 'Export' })).not.toBeInTheDocument()
	await expect.element(columnsButton()).toHaveFocus()
})

test('on the start screen, opens a file or the sample', async () => {
	mount(START)
	await expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()

	const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
	await run('open')
	await vi.waitFor(() => expect(click).toHaveBeenCalled())
	expect((click.mock.contexts[0] as HTMLInputElement).type).toBe('file')
	click.mockRestore()

	await run('sample')
	await expect.element(page.getByRole('heading', { name: /sample/i })).toBeVisible()
})
