import { expect, test } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { applyView } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

const csv = 'name,city\nAnna,Oslo\nBen,Lima\nCarla,Annecy\n'

const open = async () => {
	await openFile(textFile(csv, 'people.csv'))
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
}

const searchBox = () => page.getByRole('searchbox', { name: 'Search rows' })
const status = () => page.getByRole('status').filter({ hasText: /rows?$/ })

test('/ focuses the search, and typing narrows the rows once it settles', async () => {
	await open()
	await userEvent.click(page.getByRole('gridcell', { name: 'Ben' }))
	await userEvent.keyboard('/')
	await expect.element(searchBox()).toHaveFocus()
	await expect.element(searchBox()).toHaveValue('')

	// One query for the whole word, not one per letter.
	const searches: string[] = []
	const stop = useWorkspace.subscribe((state, before) => {
		if (state.view.search !== before.view.search) searches.push(state.view.search)
	})
	await userEvent.keyboard('ann')
	await expect.element(status()).toHaveTextContent('2 of 3 rows')
	stop()
	expect(searches).toEqual(['ann'])

	await expect.element(page.getByRole('gridcell', { name: 'Ben' })).not.toBeInTheDocument()
	await expect.element(page.getByRole('gridcell', { name: 'Annecy' })).toBeVisible()
})

test('the row count is a polite status, and reads the total when nothing narrows it', async () => {
	await open()
	await expect.element(status()).toHaveTextContent('3 rows')
	expect(status().element().getAttribute('aria-live') ?? 'polite').toBe('polite')
})

test('matches are marked in the cells, as written', async () => {
	await open()
	await userEvent.click(searchBox())
	await userEvent.keyboard('ANN')
	await expect.element(status()).toHaveTextContent('2 of 3 rows')

	const marks = Array.from(
		document.querySelectorAll('[role="gridcell"] mark'),
		mark => mark.textContent
	)
	expect(marks.sort()).toEqual(['Ann', 'Ann'])
	// The cell still reads as its whole value.
	await expect.element(page.getByRole('gridcell', { name: 'Anna' })).toBeVisible()
})

test('Esc clears the search, and Esc again goes back to the grid', async () => {
	await open()
	await userEvent.click(searchBox())
	await userEvent.keyboard('lima')
	await expect.element(status()).toHaveTextContent('1 of 3 rows')

	await userEvent.keyboard('{Escape}')
	await expect.element(searchBox()).toHaveValue('')
	await expect.element(status()).toHaveTextContent('3 rows')
	await expect.element(searchBox()).toHaveFocus()

	await userEvent.keyboard('{Escape}')
	await expect.element(page.getByRole('grid', { name: 'Rows' })).toHaveFocus()
})

test('Esc before the search settles drops it', async () => {
	await open()
	await userEvent.click(searchBox())
	await userEvent.keyboard('zz{Escape}')
	await new Promise(resolve => setTimeout(resolve, 400))
	expect(useWorkspace.getState().view.search).toBe('')
	await expect.element(status()).toHaveTextContent('3 rows')
})

test('no matches offers to clear the search', async () => {
	await open()
	await userEvent.click(searchBox())
	await userEvent.keyboard('nobody')
	await expect.element(page.getByText('No rows match')).toBeVisible()
	await expect.element(status()).toHaveTextContent('0 of 3 rows')

	await userEvent.click(page.getByRole('button', { name: 'Clear search' }))
	await expect.element(searchBox()).toHaveValue('')
	await expect.element(page.getByRole('gridcell', { name: 'Ben' })).toBeVisible()
	await expect.element(page.getByText('No rows match')).not.toBeInTheDocument()
})

test('/ is typed as itself in a text field', async () => {
	await open()
	await userEvent.click(searchBox())
	await userEvent.keyboard('a/b')
	await expect.element(searchBox()).toHaveValue('a/b')
})

test('a search set elsewhere, such as a reopened view, shows in the box', async () => {
	await open()
	await applyView({ ...useWorkspace.getState().view, search: 'oslo' })
	await expect.element(searchBox()).toHaveValue('oslo')
	await expect.element(status()).toHaveTextContent('1 of 3 rows')
})
