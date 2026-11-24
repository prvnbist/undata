import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { engine } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

const cities = ['Oslo', 'Oslo', 'Oslo', 'Oslo', 'Lima', 'Lima', 'Lima', 'Rome', '', 'Rome']
const csv = `name,city,amount\n${cities.map((city, i) => `p${i},${city},${i + 1}`).join('\n')}\n`

const open = async () => {
	await openFile(textFile(csv, 'cities.csv'))
	await expect.element(page.getByRole('gridcell', { name: 'p9' })).toBeVisible()
}

const status = () => page.getByRole('status').filter({ hasText: /rows?$/ })
const chart = (title: string) => page.getByRole('group', { name: `Distribution of ${title}` })

test('each header charts its column, with a text alternative', async () => {
	await open()
	await expect.element(chart('amount')).toHaveAttribute('aria-description', 'From 1 to 10.')
	await expect
		.element(chart('city'))
		.toHaveAttribute('aria-description', '3 distinct values, most often “Oslo”. 10% empty.')
	await expect
		.element(chart('city').getByRole('button', { name: /^“Oslo”: 4 rows/ }))
		.toBeVisible()
	await expect.element(chart('city').getByRole('button', { name: /^Empty: 1 row/ })).toBeVisible()
})

test('a bar filters, and the charts follow the filters', async () => {
	await open()
	await userEvent.click(chart('city').getByRole('button', { name: /^“Lima”/ }))
	await expect.element(status()).toHaveTextContent('3 of 10 rows')
	await expect.element(chart('amount')).toHaveAttribute('aria-description', 'From 5 to 7.')
	await expect
		.element(chart('city'))
		.toHaveAttribute('aria-description', '1 distinct value, most often “Lima”.')

	await userEvent.click(chart('amount').getByRole('button').first())
	await expect.element(status()).toHaveTextContent('1 of 10 rows')
	await expect.element(page.getByRole('gridcell', { name: 'p4' })).toBeVisible()
})

test('the bars are one tab stop, moved through with the arrow keys', async () => {
	await open()
	const bars = chart('city').getByRole('button')
	await expect.element(bars.first()).toBeVisible()
	expect(bars.elements().map(bar => bar.tabIndex)).toEqual([0, -1, -1, -1])

	;(bars.first().element() as HTMLElement).focus()
	await userEvent.keyboard('{ArrowRight}')
	await expect.element(bars.nth(1)).toHaveFocus()
	await userEvent.keyboard('{End}')
	await expect.element(bars.last()).toHaveFocus()
	await userEvent.keyboard('{Enter}')
	await expect.element(status()).toHaveTextContent('1 of 10 rows')
})

test('only the columns on screen are asked about', async () => {
	const header = Array.from({ length: 60 }, (_, i) => `col${i}`).join(',')
	const row = Array.from({ length: 60 }, (_, i) => i).join(',')
	await openFile(textFile(`${header}\n${row}\n${row}\n`, 'wide.csv'))
	await expect.element(chart('col0').getByRole('button').first()).toBeVisible()

	const asked = vi.spyOn(engine()!, 'stats')
	const grid = page.getByRole('grid', { name: 'Rows' }).element()
	// Straight to the end, past every column between.
	grid.scrollLeft = grid.scrollWidth
	await expect.element(chart('col59').getByRole('button').first()).toBeVisible()

	const onScreen = new Set(
		page
			.getByRole('group', { name: /^Distribution of / })
			.elements()
			.map(group => group.getAttribute('aria-label')!.replace('Distribution of ', ''))
	)
	const titleOf = new Map(
		useWorkspace.getState().dataset!.columns.map(column => [column.id, column.title])
	)
	const titles = asked.mock.calls.map(([, columnId]) => titleOf.get(columnId))
	expect(titles.length).toBeGreaterThan(0)
	expect(titles.length).toBeLessThan(20)
	for (const title of titles) expect(onScreen.has(title!)).toBe(true)
})

const details = () => page.getByRole('complementary', { name: 'Column details' })
const factValue = (name: string) =>
	details()
		.getByRole('term')
		.elements()
		.find(term => term.textContent === name)?.nextElementSibling?.textContent

test('the header menu opens a column’s details, and its values filter', async () => {
	await open()
	await userEvent.click(page.getByRole('button', { name: 'Column menu for city' }))
	await userEvent.click(page.getByRole('menuitem', { name: 'Details' }))

	await expect.element(details().getByRole('heading', { name: /^city/ })).toHaveFocus()
	await vi.waitFor(() => {
		expect(factValue('Rows')).toBe('10')
		expect(factValue('Empty')).toBe('1 (10.0%)')
		expect(factValue('Distinct')).toBe('3')
	})
	// A text column cannot be malformed, and has no range.
	expect(factValue('Not valid')).toBeUndefined()
	expect(factValue('Smallest')).toBeUndefined()
	await expect
		.element(details().getByRole('group', { name: 'Distribution of city' }))
		.toBeVisible()

	const values = details().getByRole('list', { name: 'Most common values' })
	await expect.element(values).toHaveTextContent('Oslo4Lima3Rome2')
	await userEvent.click(values.getByRole('button', { name: /^Lima: 3 rows/ }))
	await expect.element(status()).toHaveTextContent('3 of 10 rows')
	await vi.waitFor(() => expect(factValue('Rows')).toBe('3'))
})

test('the palette opens a number column’s details, with its range and mean', async () => {
	await open()
	const MOD = /Mac/.test(navigator.platform) ? 'Meta' : 'Control'
	await userEvent.keyboard(`{${MOD}>}k{/${MOD}}`)
	await userEvent.fill(page.getByRole('combobox', { name: 'Command' }), 'details of amount')
	await userEvent.keyboard('{Enter}')

	await expect.element(details().getByRole('heading', { name: /^amount/ })).toHaveFocus()
	await vi.waitFor(() => {
		expect(factValue('Smallest')).toBe('1')
		expect(factValue('Largest')).toBe('10')
		expect(factValue('Mean')).toBe('5.5')
		expect(factValue('Not valid')).toBe('0 (0%)')
	})
})
