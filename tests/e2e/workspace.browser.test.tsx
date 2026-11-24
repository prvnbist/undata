import { expect, test } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { useWorkspace } from '@/store/workspace'
import sampleCsv from '../fixtures/sample.csv?raw'
import { START, mount, openFile, textFile, useApp } from './app'

useApp()

test('choosing a file lands in the workspace with its rows and no further step', async () => {
	const router = await openFile(textFile(sampleCsv, 'people.csv'))

	await expect.element(page.getByRole('heading', { name: 'people.csv' })).toBeVisible()
	await expect.element(page.getByText('Grace', { exact: true })).toBeVisible()
	expect(router.state.location.pathname).toMatch(/^\/d\/[\w-]+$/)
})

test('an unknown dataset goes back to the start screen', async () => {
	const router = mount('/d/nope')

	await expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
	expect(router.state.location.pathname).toBe(START)
})

test('the store holds the view and metadata, never rows', async () => {
	await openFile(textFile('id,secret\n1,needle-in-a-cell\n'))
	await expect.element(page.getByText('needle-in-a-cell')).toBeVisible()

	expect(JSON.stringify(useWorkspace.getState())).not.toContain('needle-in-a-cell')
})
