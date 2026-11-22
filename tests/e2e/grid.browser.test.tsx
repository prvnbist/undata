import { expect, test } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { openFile, textFile, useApp } from './app'

useApp()

const grid = () => page.getByRole('grid').element() as HTMLElement

const scrollBy = (deltaY: number) =>
	grid().dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }))

// Two columns, 600,000 rows: 19.2 million pixels of rows, more than Firefox can lay out.
const tall = () =>
	textFile('id,twice\n' + Array.from({ length: 600_000 }, (_, i) => `${i},${i * 2}\n`).join(''))

test('every row can be reached, the last one included, however many there are', async () => {
	await openFile(tall())
	await expect
		.element(page.getByRole('gridcell', { name: '0', exact: true }).first())
		.toBeVisible()
	await expect.element(page.getByRole('grid')).toHaveAttribute('aria-rowcount', '600001')

	grid().scrollTop = grid().scrollHeight
	const last = page.getByRole('gridcell', { name: '1199998', exact: true })
	await expect.element(last).toBeVisible()
	const { bottom } = last.element().getBoundingClientRect()
	expect(bottom).toBeLessThanOrEqual(grid().getBoundingClientRect().bottom + 1)

	grid().scrollTop = 0
	await expect
		.element(page.getByRole('gridcell', { name: '0', exact: true }).first())
		.toBeVisible()
})

test('the wheel moves by rows even when the scrollbar is squeezed', async () => {
	await openFile(tall())
	await expect.element(page.getByRole('gridcell', { name: '1', exact: true })).toBeVisible()

	// The first row whose top is below the headers.
	const firstRow = () =>
		page
			.getByRole('rowheader')
			.elements()
			.find(
				element =>
					element.getBoundingClientRect().top >=
					document.querySelector('[role=columnheader]')!.getBoundingClientRect().bottom - 1
			)?.textContent

	// 10 rows, in steps of half a row.
	for (let i = 0; i < 20; i++) scrollBy(16)
	await expect.poll(firstRow).toBe('11')
})

test('headers stay above their columns while a wide file scrolls sideways', async () => {
	const ids = Array.from({ length: 200 }, (_, i) => `col${i}`)
	await openFile(textFile(`${ids.join(',')}\n${ids.map((_, i) => `v${i}`).join(',')}\n`.repeat(1)))
	await expect.element(page.getByRole('gridcell', { name: 'v0', exact: true })).toBeVisible()
	expect(page.getByRole('columnheader').elements().length).toBeLessThan(40)

	grid().scrollLeft = grid().scrollWidth
	const cell = page.getByRole('gridcell', { name: 'v199', exact: true })
	await expect.element(cell).toBeVisible()
	const header = page.getByRole('columnheader', { name: 'col199', exact: true })
	expect(header.element().getBoundingClientRect().left).toBe(
		cell.element().getBoundingClientRect().left
	)
	await expect.element(header).toHaveAttribute('aria-colindex', '201')
	await expect.element(page.getByRole('grid')).toHaveAttribute('aria-colcount', '201')
})

test('headers stay in sight while rows scroll', async () => {
	await openFile(textFile('id\n' + Array.from({ length: 500 }, (_, i) => `row-${i}\n`).join('')))
	await expect.element(page.getByRole('gridcell', { name: 'row-0' })).toBeVisible()
	grid().scrollTop = 8000
	await expect.element(page.getByRole('gridcell', { name: 'row-250' })).toBeVisible()
	await expect.element(page.getByRole('columnheader', { name: 'id' })).toBeVisible()
})
