import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { routeTree } from '@/routeTree.gen'
import { useProject } from '@/store/project'
import sampleCsv from '../fixtures/sample.csv?raw'

// The root route renders the whole document, so the app is mounted on `document` itself.
// Mounting it inside a <div> would nest <html> in <body>, which React reports as an error.
let root: Root

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

	await expect.element(page.getByText('Results (placeholder)')).toBeVisible()
	expect(router.state.location.pathname).toBe('/')
	expect(useProject.getState().rows).toHaveLength(25)
	expect([...useProject.getState().columns.keys()]).toContain('name')
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
