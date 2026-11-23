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

const centre = (element: Element) => {
	const { left, width, top, height } = element.getBoundingClientRect()
	return { x: left + width / 2, y: top + height / 2 }
}
const pointer = (target: EventTarget, type: string, x: number, y: number) =>
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			clientX: x,
			clientY: y,
			button: 0,
			pointerId: 1,
			isPrimary: true,
		})
	)
const headerOrder = () =>
	page
		.getByRole('columnheader')
		.elements()
		.slice(1)
		.map(element => element.getAttribute('aria-label'))
const sizeOf = (index: number) => useWorkspace.getState().view.columns[index]!.size

test('dragging a header moves the column, without sorting', async () => {
	await openFile(textFile('a,b,c\n1,2,3\n'))
	await expect.element(sortButton('c')).toBeVisible()

	const from = centre(sortButton('c').element())
	const to = centre(header('a').element())
	pointer(sortButton('c').element(), 'pointerdown', from.x, from.y)
	pointer(window, 'pointermove', from.x - 20, from.y)
	pointer(window, 'pointermove', to.x - 20, to.y)
	pointer(window, 'pointerup', to.x - 20, to.y)

	await vi.waitFor(() => expect(headerOrder()).toEqual(['c', 'a', 'b']))
	expect(useWorkspace.getState().view.sort).toEqual([])
})

test('dragging the edge resizes, double-click fits, and the keyboard does both', async () => {
	await openFile(textFile('a,b\n1,2\n'))
	const handle = page.getByRole('separator', { name: 'Resize a' })
	await expect.element(handle).toBeInTheDocument()
	const before = Number(handle.element().getAttribute('aria-valuenow'))

	const { x, y } = centre(handle.element())
	pointer(handle.element(), 'pointerdown', x, y)
	pointer(handle.element(), 'pointermove', x + 50, y)
	pointer(handle.element(), 'pointerup', x + 50, y)
	await vi.waitFor(() => expect(sizeOf(0)).toBe(before + 50))

	await userEvent.dblClick(handle)
	await vi.waitFor(() => expect(sizeOf(0)).toBeNull())

	;(handle.element() as HTMLElement).focus()
	await userEvent.keyboard('{ArrowRight}')
	await vi.waitFor(() => expect(sizeOf(0)).toBe(before + 16))
	await userEvent.keyboard('{Enter}')
	await vi.waitFor(() => expect(sizeOf(0)).toBeNull())
})

test('the menu moves columns by keyboard', async () => {
	await openFile(textFile('a,b,c\n1,2,3\n'))
	await expect.element(menu('a')).toBeVisible()
	;(menu('a').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	const right = page.getByRole('menuitem', { name: 'Move right' })
	await expect.element(right).toBeVisible()
	;(right.element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await vi.waitFor(() => expect(headerOrder()).toEqual(['b', 'a', 'c']))
})

test('the Columns popover finds columns and shows or hides them in bulk', async () => {
	await openFile(textFile('price,price_old,name\n1,2,x\n'))
	await userEvent.click(page.getByRole('button', { name: 'Columns' }))
	await userEvent.fill(page.getByRole('textbox', { name: 'Find a column' }), 'price')

	const list = page.getByRole('list', { name: 'Columns' })
	await expect.element(list.getByText('price_old')).toBeVisible()
	expect(list.getByText('name').elements()).toHaveLength(0)

	await userEvent.click(page.getByRole('button', { name: 'Hide matching' }))
	await vi.waitFor(() => expect(headerOrder()).toEqual(['name']))
	await expect.element(page.getByRole('button', { name: /Columns \(2 hidden\)/ })).toBeVisible()

	await userEvent.click(list.getByRole('checkbox').first())
	await vi.waitFor(() => expect(headerOrder()).toEqual(['price', 'name']))
})

test('order and sizes survive reload', async () => {
	await openFile(textFile('a,b\n1,2\n', 'arranged.csv'))
	await saved()
	const id = useWorkspace.getState().dataset!.id

	;(menu('a').element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	;(page.getByRole('menuitem', { name: 'Move right' }).element() as HTMLElement).focus()
	await userEvent.keyboard('{Enter}')
	await vi.waitFor(() => expect(headerOrder()).toEqual(['b', 'a']))
	// The menu gives focus back to its button a moment after it closes.
	await expect.element(menu('a')).toHaveFocus()
	const handle = page.getByRole('separator', { name: 'Resize b' })
	;(handle.element() as HTMLElement).focus()
	await expect.element(handle).toHaveFocus()
	await userEvent.keyboard('{ArrowRight}')
	const size = await vi.waitFor(() => {
		const value = useWorkspace.getState().view.columns[0]!.size
		expect(value).not.toBeNull()
		return value
	})

	await vi.waitFor(async () => {
		const { listDatasets } = await import('@/lib/storage/datasets')
		const [stored] = await listDatasets()
		expect(stored!.view.columns[0]!.size).toBe(size)
	})

	closeDataset()
	mount(`/d/${id}`)
	await vi.waitFor(() => expect(headerOrder()).toEqual(['b', 'a']))
	expect(useWorkspace.getState().view.columns[0]!.size).toBe(size)
})
