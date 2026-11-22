import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { routeTree } from '@/routeTree.gen'
import { extractColumns } from '@/lib/columns'
import { useProject } from '@/store/project'
import type { Row } from '@/store/project'
import sampleCsv from '../fixtures/sample.csv?raw'

// The root route renders the whole document, so the app is mounted on `document` itself.
// Mounting it inside a <div> would nest <html> in <body>, which React reports as an error.
let root: Root

async function loadFixture() {
	const { csv2json } = await import('json-2-csv')
	const rows = csv2json(sampleCsv) as Array<Row>
	useProject.getState().initProject('csv', extractColumns(rows[0]!), rows)
}

function mount(path: string) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
	})
	root = createRoot(document)
	root.render(<RouterProvider router={router} />)
	return router
}

beforeEach(() => {
	useProject.setState({ metadata: { source: null }, columns: new Map(), rows: [] })
	vi.spyOn(console, 'error')
	vi.spyOn(console, 'warn')
})

afterEach(() => {
	root.unmount()
	expect(console.error).not.toHaveBeenCalled()
	expect(console.warn).not.toHaveBeenCalled()
})

test('redirects / and unknown paths to /setup when there is no project', async () => {
	for (const path of ['/', '/nope']) {
		const router = mount(path)

		await expect.element(page.getByText('Project Setup')).toBeVisible()
		expect(router.state.location.pathname).toBe('/setup')
		root.unmount()
	}
	root = createRoot(document)
})

test('uploading a CSV creates the project and lands on /', async () => {
	const router = mount('/setup')

	await expect.element(page.getByRole('button', { name: 'Create Project' })).toBeDisabled()

	await userEvent.upload(
		page.getByTestId('csv-input'),
		new File([sampleCsv], 'sample.csv', { type: 'text/csv' })
	)
	await expect.element(page.getByText('sample.csv')).toBeVisible()
	await page.getByRole('button', { name: 'Create Project' }).click()

	await expect.element(page.getByRole('table')).toBeVisible()
	expect(router.state.location.pathname).toBe('/')
	expect(useProject.getState().rows).toHaveLength(25)

	const headers = [...useProject.getState().columns.values()].map(column => column.title)
	expect(headers).toContain('name')
	expect([...document.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(headers)
	// Page size is 10.
	expect(document.querySelectorAll('tbody tr')).toHaveLength(10)
})

test('paginates the results and clamps "Go to page"', async () => {
	await loadFixture()
	mount('/')

	await expect.element(page.getByText('Page 1 of 3')).toBeVisible()
	await expect.element(page.getByRole('button', { name: 'First page' })).toBeDisabled()
	await expect.element(page.getByRole('button', { name: 'Previous page' })).toBeDisabled()
	await expect.element(page.getByRole('button', { name: 'Next page' })).toBeEnabled()

	await page.getByRole('button', { name: 'Last page' }).click()
	await expect.element(page.getByText('Page 3 of 3')).toBeVisible()
	expect(document.querySelectorAll('tbody tr')).toHaveLength(5)
	await expect.element(page.getByRole('button', { name: 'Next page' })).toBeDisabled()
	await expect.element(page.getByRole('button', { name: 'Last page' })).toBeDisabled()

	await userEvent.fill(page.getByLabelText('Go to page'), '99')
	await expect.element(page.getByText('Page 3 of 3')).toBeVisible()
	await userEvent.fill(page.getByLabelText('Go to page'), '2')
	await expect.element(page.getByText('Page 2 of 3')).toBeVisible()
})

test('hiding a column in Settings removes it from the table', async () => {
	await loadFixture()
	mount('/')

	await expect.element(page.getByRole('table')).toBeVisible()
	const headers = () => [...document.querySelectorAll('thead th')].map(th => th.textContent)
	expect(headers()).toContain('age')

	await page.getByRole('button', { name: 'Settings' }).click()
	await page.getByRole('button', { name: 'Hide age' }).click()

	await expect.poll(headers).not.toContain('age')
	await expect.element(page.getByRole('button', { name: 'Show age' })).toBeVisible()
	expect(useProject.getState().columns.get('age')?.hidden).toBe(true)

	await page.getByRole('button', { name: 'Show age' }).click()
	await expect.poll(headers).toContain('age')
})

test('dragging a column in Settings reorders the table', async () => {
	await loadFixture()
	mount('/')

	await expect.element(page.getByRole('table')).toBeVisible()
	const headers = () => [...document.querySelectorAll('thead th')].map(th => th.textContent)
	expect(headers().slice(0, 2)).toEqual(['name', 'age'])

	await page.getByRole('button', { name: 'Settings' }).click()
	await expect.element(page.getByRole('button', { name: 'Hide name' })).toBeVisible()

	const item = (key: string) =>
		page
			.getByRole('button', { name: `Hide ${key}` })
			.element()
			.closest('[role="button"]')!
	const source = item('name')
	const from = source.getBoundingClientRect()
	const to = item('age').getBoundingClientRect()

	// dnd-kit needs a pointer that moves in steps past the 5px activation distance.
	const x = from.left + 16
	const pointer = (type: string, target: EventTarget, y: number) =>
		target.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				clientX: x,
				clientY: y,
				button: 0,
				isPrimary: true,
				pointerId: 1,
			})
		)
	const startY = from.top + from.height / 2
	const endY = to.top + to.height * 0.9
	pointer('pointerdown', source, startY)
	for (let step = 1; step <= 6; step++) {
		pointer('pointermove', document, startY + ((endY - startY) * step) / 6)
		await new Promise(resolve => setTimeout(resolve, 20))
	}
	pointer('pointerup', document, endY)

	await expect.poll(() => headers().slice(0, 2)).toEqual(['age', 'name'])
})

test('the column dialog renames a column and changes its type', async () => {
	await loadFixture()
	mount('/')
	await expect.element(page.getByRole('table')).toBeVisible()

	await page.getByRole('button', { name: 'Settings' }).click()
	await page.getByRole('button', { name: 'Settings for age' }).click()
	await expect.element(page.getByText('Column Settings: age')).toBeVisible()

	await userEvent.fill(page.getByLabelText('Title'), 'Years')
	await page.getByRole('combobox').click()
	await userEvent.fill(page.getByLabelText('Search'), 'zzz')
	await expect.element(page.getByText('No such type')).toBeVisible()
	await userEvent.fill(page.getByLabelText('Search'), 'numb')
	await page.getByRole('option', { name: 'Number' }).click()
	await page.getByRole('button', { name: 'Submit' }).click()

	await expect.element(page.getByText('Column Settings: age')).not.toBeInTheDocument()
	const age = useProject.getState().columns.get('age')
	expect(age).toMatchObject({ title: 'Years', data_type: 'number', hidden: false })
	const header = [...document.querySelectorAll('thead th')].find(th => th.textContent === 'Years')
	expect(header?.firstElementChild?.className).toContain('text-right')

	// Reopening shows the saved values.
	await page.getByRole('button', { name: 'Settings for age' }).click()
	await expect.element(page.getByLabelText('Title')).toHaveValue('Years')
	await expect.element(page.getByRole('combobox')).toHaveTextContent('Number')
})

test('renders number, boolean, time, date and url cells', async () => {
	await loadFixture()
	const { columns, setColumns } = useProject.getState()
	const types = {
		age: 'number',
		active: 'boolean',
		start_time: 'time',
		joined: 'date',
		website: 'url',
	} as const
	setColumns(
		new Map(
			[...columns].map(([key, column]) => [
				key,
				key in types ? { ...column, data_type: types[key as keyof typeof types] } : column,
			])
		)
	)
	mount('/')
	await expect.element(page.getByRole('table')).toBeVisible()

	const firstRow = () =>
		[...document.querySelectorAll('tbody tr:first-child td')].map(td => td as HTMLElement)
	const cell = (key: string) => firstRow()[[...columns.keys()].indexOf(key)]!

	expect(cell('age').textContent).toBe('20')
	expect(cell('age').querySelector('.justify-end')).not.toBeNull()
	expect(cell('active').querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe(
		'true'
	)
	expect(cell('start_time').textContent).toBe('09:00:00')
	expect(cell('joined').textContent).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	const link = cell('website').querySelector('a')!
	expect(link.getAttribute('href')).toBe('https://example.com/people/ada')
	expect(link.getAttribute('target')).toBe('_blank')
	expect(link.getAttribute('rel')).toBe('noopener noreferrer')
	expect(cell('website').textContent).toBe('ada')
})

test('renders tag, json and image cells', async () => {
	await loadFixture()
	const { columns, rows, initProject } = useProject.getState()
	const types = { tags: 'tag', meta: 'json', avatar: 'image' } as const
	rows[0]!.tags = "['a','b','c','d','e']"
	initProject(
		'csv',
		new Map(
			[...columns].map(([key, column]) => [
				key,
				key in types ? { ...column, data_type: types[key as keyof typeof types] } : column,
			])
		),
		rows
	)
	mount('/')
	await expect.element(page.getByRole('table')).toBeVisible()

	const cell = (key: string) =>
		document.querySelectorAll('tbody tr:first-child td')[[...columns.keys()].indexOf(key)]!

	// Tags: three badges, the rest behind the dots button.
	expect(cell('tags').querySelectorAll('[data-slot="badge"]')).toHaveLength(3)
	await page.getByRole('button', { name: 'View Options' }).click()
	await expect.element(page.getByText('e', { exact: true })).toBeVisible()

	// JSON: the text is shown. The editor is only loaded when the popover opens.
	expect(cell('meta').textContent).toContain('"role":"dev"')

	// Image: the thumbnail opens a dialog.
	await page.getByRole('button', { name: 'Open image preview' }).first().click()
	await expect.element(page.getByRole('heading', { name: 'Image Preview' })).toBeVisible()
})

test('Export and Settings are disabled without rows', async () => {
	useProject.setState({ metadata: { source: 'csv' } })
	mount('/')

	await expect.element(page.getByRole('button', { name: 'Export' })).toBeDisabled()
	await expect.element(page.getByRole('button', { name: 'Settings' })).toBeDisabled()
})

test('a file that is not a CSV is rejected', async () => {
	mount('/setup')

	await userEvent.upload(
		page.getByTestId('csv-input'),
		new File(['hello'], 'notes.txt', { type: 'text/plain' })
	)
	await expect.element(page.getByRole('button', { name: 'Create Project' })).toBeDisabled()
	await expect.element(page.getByText('notes.txt')).not.toBeInTheDocument()
})
