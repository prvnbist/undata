import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { afterEach, beforeEach, expect, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { routeTree } from '@/routeTree.gen'
import { closeDataset } from '@/store/session'

let root: Root | null = null

// The root route renders the whole document, so the app is mounted on `document` itself.
export const mount = (path: string) => {
	root?.unmount()
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
	})
	root = createRoot(document)
	root.render(<RouterProvider router={router} />)
	return router
}

export const unmount = () => {
	root?.unmount()
	root = null
}

export const START = '/start'

export const textFile = (content: BlobPart, name = 'data.csv') => new File([content], name)

// Opens a file the way a person does, from the start screen.
export const openFile = async (file: File) => {
	const router = mount(START)
	await userEvent.upload(page.getByLabelText('Data file'), file)
	return router
}

// Every test runs against a clean app and fails on anything React or the app complains about.
export const useApp = () => {
	beforeEach(() => {
		vi.spyOn(console, 'error')
		vi.spyOn(console, 'warn')
	})

	afterEach(() => {
		unmount()
		closeDataset()
		expect(console.error).not.toHaveBeenCalled()
		expect(console.warn).not.toHaveBeenCalled()
		vi.restoreAllMocks()
	})
}
