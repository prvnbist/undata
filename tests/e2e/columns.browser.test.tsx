import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { closeDataset, engine } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { mount, openFile, textFile, useApp } from './app'

useApp()

const header = (name: string) => page.getByRole('columnheader', { name, exact: true })
const sortButton = (name: string) => header(name).getByRole('button').first()
const menu = (name: string) => page.getByRole('button', { name: `Column menu for ${name}` })
// The text of the first cell in each data row, top to bottom.
const firstColumn = () =>
	page
		.getByRole('row')
		.elements()
		.slice(1)
		.map(row => row.querySelector('[role="gridcell"]')?.textContent)

const saved = () => vi.waitFor(() => expect(useWorkspace.getState().saved).toBe('saved'))

test('clicking a header sorts by it, then the other way, then not at all', async () => {
	await openFile(textFile('n,label\n2,b\n1,a\n3,c\n'))
	await expect.element(sortButton('n')).toBeVisible()

	await userEvent.click(sortButton('n'))
	await expect.element(header('n')).toHaveAttribute('aria-sort', 'ascending')
	await vi.waitFor(() => expect(firstColumn()).toEqual(['1', '2', '3']))

	await userEvent.click(sortButton('n'))
	await expect.element(header('n')).toHaveAttribute('aria-sort', 'descending')
	await vi.waitFor(() => expect(firstColumn()).toEqual(['3', '2', '1']))

	await userEvent.click(sortButton('n'))
	await expect.element(header('n')).not.toHaveAttribute('aria-sort')
	await vi.waitFor(() => expect(firstColumn()).toEqual(['2', '1', '3']))
})

test('shift-click adds a second sort', async () => {
	await openFile(textFile('a,b\n1,z\n0,x\n1,y\n'))
	await userEvent.click(sortButton('a'))
	await userEvent.keyboard('{Shift>}')
	await userEvent.click(sortButton('b'))
	await userEvent.keyboard('{/Shift}')

	await expect.element(header('a')).toHaveAttribute('aria-sort', 'ascending')
	await expect.element(header('b')).toHaveAccessibleDescription('Sorted ascending, 2 of 2')
	expect(useWorkspace.getState().view.sort).toEqual([
		{ columnId: expect.any(String), desc: false },
		{ columnId: expect.any(String), desc: false },
	])
	// Each row reads as its number in the file, then a, then b.
	await vi.waitFor(() =>
		expect(
			page
				.getByRole('row')
				.elements()
				.slice(1)
				.map(row => row.textContent)
		).toEqual(['20x', '31y', '11z'])
	)
})

test('the menu sorts, changes the type, renames and hides, by keyboard', async () => {
	await openFile(textFile('amount,note\n1000,x\n20,y\n'))
	await expect.element(menu('amount')).toBeVisible()
	await expect.element(page.getByRole('gridcell', { name: '1,000' })).toBeVisible()

	// Sort descending: the second item.
	;(menu('amount').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await expect.element(page.getByRole('menuitem', { name: 'Sort ascending' })).toHaveFocus()
	await userEvent.keyboard('{ArrowDown}')
	await expect.element(page.getByRole('menuitem', { name: 'Sort descending' })).toHaveFocus()
	await userEvent.keyboard('{Enter}')
	await expect.element(header('amount')).toHaveAttribute('aria-sort', 'descending')

	// Type → Text.
	;(menu('amount').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	;(page.getByRole('menuitem', { name: 'Type' }).element() as HTMLElement).focus()
	await userEvent.keyboard('{ArrowRight}')
	const text = page.getByRole('menuitemradio', { name: 'Text' })
	await expect.element(text).toBeVisible()
	;(text.element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await expect.element(page.getByRole('gridcell', { name: '1000', exact: true })).toBeVisible()

	// Rename.
	;(menu('amount').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	;(page.getByRole('menuitem', { name: 'Rename…' }).element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	const title = page.getByRole('textbox', { name: 'Column title' })
	await expect.element(title).toHaveFocus()
	await userEvent.keyboard('Total{Enter}')
	await expect.element(menu('Total')).toBeVisible()

	// Hide.
	;(menu('note').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	;(page.getByRole('menuitem', { name: 'Hide' }).element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await expect.element(header('note')).not.toBeInTheDocument()
})

test('changes survive reload, and the source text is unchanged', async () => {
	await openFile(textFile('amount,note\n1000,x\n20,y\n', 'kept.csv'))
	await saved()
	const id = useWorkspace.getState().dataset!.id

	await userEvent.click(menu('amount'))
	await userEvent.click(page.getByRole('menuitem', { name: 'Sort descending' }))
	await userEvent.click(menu('amount'))
	await userEvent.click(page.getByRole('menuitem', { name: 'Rename…' }))
	await userEvent.fill(page.getByRole('textbox', { name: 'Column title' }), 'Total')
	await userEvent.click(page.getByRole('button', { name: 'Rename', exact: true }))
	await userEvent.click(menu('note'))
	await userEvent.click(page.getByRole('menuitem', { name: 'Hide' }))
	await expect.element(header('note')).not.toBeInTheDocument()

	await vi.waitFor(async () => {
		const { listDatasets } = await import('@/lib/storage/datasets')
		const [stored] = await listDatasets()
		expect(stored!.setup[0]!.title).toBe('Total')
		expect(stored!.view.columns[1]!.hidden).toBe(true)
	})

	closeDataset()
	mount(`/d/${id}`)
	await expect.element(header('Total')).toHaveAttribute('aria-sort', 'descending')
	await expect.element(header('note')).not.toBeInTheDocument()

	const { query, dataset } = useWorkspace.getState()
	const ids = dataset!.columns.map(column => column.id)
	const rows = await engine()!.rows(query!.id, 0, 2, ids)
	expect(rows.map(row => row.text)).toEqual([
		['1000', 'x'],
		['20', 'y'],
	])
	expect(dataset!.columns.map(column => column.header)).toEqual(['amount', 'note'])
})
