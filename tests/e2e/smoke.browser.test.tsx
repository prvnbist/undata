import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { applyColumns } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import sampleCsv from '../fixtures/sample.csv?raw'
import { START, mount, openFile, textFile, useApp } from './app'

// What the old app's eleven smoke tests became when the new app took its place. Four are ported here.
// The rest have a named replacement:
//
// | Old test                                               | Now                                                  |
// |--------------------------------------------------------|------------------------------------------------------|
// | redirects / and unknown paths to /setup                | here: "unknown paths, /setup and /start go to /"     |
// | uploading a CSV creates the project and lands on /     | here: "choosing a file lands in its workspace"       |
// | paginates the results and clamps "Go to page"          | grid: "every row can be reached, the last one…"      |
// | hiding a column in Settings removes it from the table  | columns: "the Columns popover finds columns…"        |
// | dragging a column in Settings reorders the table       | columns: "dragging a header moves the column…"       |
// | the column dialog renames a column and changes its type| columns: "the menu sorts, changes the type, renames…"|
// | renders number, boolean, time, date and url cells      | cells: "the sample renders each inferred type…"      |
// | renders tag, json and image cells                      | cells (tag, JSON) and here: "image cells…"           |
// | exports CSV and JSON without hidden columns, titles    | export: "exports the view as CSV…", "all rows as…"   |
// | Export and Settings are disabled without rows          | here: "a file with no rows exports just its header"  |
// | a file that is not a CSV is rejected                   | import-errors: binary and empty files                |

useApp()

test('unknown paths, /setup and /start go to /, the start screen', async () => {
	for (const path of ['/nope', '/setup', '/start']) {
		const router = mount(path)
		await expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
		expect(router.state.location.pathname).toBe(START)
	}
})

test('choosing a file lands in its workspace', async () => {
	const router = await openFile(textFile(sampleCsv, 'sample.csv'))

	await expect.element(page.getByRole('heading', { name: 'sample.csv' })).toBeVisible()
	expect(router.state.location.pathname).toMatch(/^\/d\/[\w-]+$/)
	expect(useWorkspace.getState().dataset!.rowCount).toBe(25)
	await expect.element(page.getByText('25 rows')).toBeVisible()
})

test('image cells show a thumbnail that opens a preview, only once the type is chosen', async () => {
	await openFile(textFile('avatar\nhttps://example.com/a.png\n'))
	await expect
		.element(page.getByRole('link', { name: 'Open https://example.com/a.png' }))
		.toBeVisible()
	expect(page.getByRole('button', { name: 'Open image preview' }).elements()).toHaveLength(0)

	const { dataset } = useWorkspace.getState()
	await applyColumns(dataset!.columns.map(({ id, title }) => ({ id, title, type: 'image' })))
	await page.getByRole('button', { name: 'Open image preview' }).click()
	await expect.element(page.getByRole('heading', { name: 'Image Preview' })).toBeVisible()
})

test('a file with no rows opens, and exports just its header', async () => {
	const saved: Blob[] = []
	vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
		saved.push(blob as Blob)
		return 'blob:test'
	})
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

	await openFile(textFile('a,b\n'))
	await expect.element(page.getByText('0 rows')).toBeVisible()
	await userEvent.click(page.getByRole('button', { name: 'Export', exact: true }))
	await expect.element(page.getByText('This view, 0 rows')).toBeVisible()
	await userEvent.click(page.getByRole('button', { name: 'Export CSV' }))

	await vi.waitFor(() => expect(saved).toHaveLength(1))
	expect(await saved[0]!.text()).toBe('a,b\n')
})
