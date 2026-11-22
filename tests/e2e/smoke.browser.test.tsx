import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { routeTree } from '@/routeTree.gen'

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
	vi.spyOn(console, 'error')
	vi.spyOn(console, 'warn')
})

afterEach(() => {
	root.unmount()
	expect(console.error).not.toHaveBeenCalled()
	expect(console.warn).not.toHaveBeenCalled()
})

test('mounts the real route tree at /setup', async () => {
	mount('/setup')

	await expect.element(page.getByText('Setup (placeholder)')).toBeVisible()
})
