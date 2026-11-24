import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { applyColumns } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

const MOD = /Mac/.test(navigator.platform) ? 'Meta' : 'Control'
const csv = 'name,amount,note\nAnna,5,x\nBen,12,x\nCarla,oops,y\nDev,30,\n'

const status = () => page.getByRole('status').filter({ hasText: /rows?$/ })
const toggle = () => page.getByRole('button', { name: 'SQL query' })
const editor = () => page.getByRole('combobox', { name: 'SQL query' })
const header = (name: string) => page.getByRole('columnheader', { name, exact: true })
const chip = (label: string) => page.getByRole('button', { name: `Edit filter: ${label}` })
const textOf = () => (editor().element() as HTMLTextAreaElement).value

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
	await userEvent.click(toggle())
	await expect.element(editor()).toHaveFocus()
}

const write = async (query: string) => {
	await userEvent.fill(editor(), query)
	await userEvent.keyboard(`{${MOD}>}{Enter}{/${MOD}}`)
}

test('the editor shows the view, and running a query changes it everywhere', async () => {
	await open()
	await expect.element(editor()).toHaveValue('SELECT *')

	await write('SELECT name, amount WHERE amount > 5 ORDER BY amount DESC')
	await expect.element(status()).toHaveTextContent('2 of 4 rows')
	await expect.element(chip('amount > 5')).toBeVisible()
	await expect.element(header('note')).not.toBeInTheDocument()
	await expect.element(header('amount')).toHaveAttribute('aria-sort', 'descending')
	// Written back the way the printer writes it.
	await expect
		.element(editor())
		.toHaveValue('SELECT name, amount\nWHERE amount > 5\nORDER BY amount DESC')
})

test('a change made outside the editor is written in it', async () => {
	await open()
	await write(`WHERE amount IS NOT MALFORMED AND name <> 'Ben'`)
	await expect.element(status()).toHaveTextContent('2 of 4 rows')

	await userEvent.click(page.getByRole('button', { name: 'Remove filter: name is none of Ben' }))
	await expect.element(status()).toHaveTextContent('3 of 4 rows')
	await expect.element(editor()).toHaveValue('SELECT *\nWHERE amount IS NOT MALFORMED')
})

test('a mistake is shown where it is, and the view stays as it was', async () => {
	await open()
	await write(`SELECT * WHERE amount > 5 OR name = 'x'`)

	const alert = page.getByRole('alert')
	await vi.waitFor(() =>
		expect(alert.element().textContent).toBe(
			'Line 1, column 27: OR is not supported yet. Conditions can only be joined with AND'
		)
	)
	await expect.element(editor()).toHaveAttribute('aria-invalid', 'true')
	expect(useWorkspace.getState().view.filters).toEqual([])
	await expect.element(status()).toHaveTextContent('4 rows')

	// Typing again clears it, and the draft is shown as not run.
	await userEvent.keyboard('{Backspace}')
	await expect.element(alert).not.toBeInTheDocument()
	await expect.element(page.getByText('Not run yet')).toBeVisible()
	await userEvent.click(page.getByRole('button', { name: 'Discard' }))
	await expect.element(editor()).toHaveValue('SELECT *')
})

test('a grouping query shows the groups', async () => {
	await open()
	await write('SELECT note, count(*), sum(amount) GROUP BY note ORDER BY count(*) DESC')
	await expect
		.element(page.getByRole('status').filter({ hasText: /groups/ }))
		.toHaveTextContent('3 groups from 4 rows')
	expect(useWorkspace.getState().view.grouping).toMatchObject({
		aggregates: [{ fn: 'sum' }],
		sort: [{ key: 'count', desc: true }],
	})
})

test('suggestions complete names and keywords from the keyboard', async () => {
	await open()
	await userEvent.fill(editor(), '')
	await userEvent.keyboard('SELECT a')
	const list = page.getByRole('listbox', { name: 'Suggestions' })
	await expect.element(list.getByRole('option', { name: /amount/ })).toBeVisible()
	await expect.poll(() => list.getByRole('option').elements().length).toBeGreaterThan(3)
	await expect.element(editor()).toHaveAttribute('aria-expanded', 'true')
	// Nothing below the editor, such as the grid's header, is drawn over the list.
	for (const option of list.getByRole('option').elements()) {
		const box = option.getBoundingClientRect()
		const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
		expect(option.contains(top)).toBe(true)
	}
	await userEvent.keyboard('m{Enter}')
	expect(textOf()).toBe('SELECT amount')
	await expect.element(list).not.toBeInTheDocument()

	await userEvent.keyboard(' WH{Tab} amo{Enter} IS NULL')
	expect(textOf()).toBe('SELECT amount WHERE amount IS NULL')
	await userEvent.keyboard(`{${MOD}>}{Enter}{/${MOD}}`)
	await expect.element(status()).toHaveTextContent('0 of 4 rows')
})

test('Escape closes the editor and focus goes back to its button; the palette opens it', async () => {
	await open()
	await userEvent.keyboard('{Escape}')
	await expect.element(editor()).not.toBeInTheDocument()
	await expect.element(toggle()).toHaveFocus()
	await expect.element(toggle()).toHaveAttribute('aria-pressed', 'false')

	await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
	await userEvent.fill(page.getByRole('combobox', { name: 'Command' }), 'sql')
	await userEvent.keyboard('{Enter}')
	await expect.element(editor()).toHaveFocus()
})
