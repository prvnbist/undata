import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { LARGE_FILE, MAX_FILE } from '@/store/session'
import { workspace } from '@/store/workspace'
import { START, mount, openFile, openHere, textFile, useApp } from './app'

useApp()

const bytes = (size: number, text = '\0') => {
	const part = new TextEncoder().encode(text.repeat(1_000_000))
	const whole = Array.from({ length: Math.floor(size / part.length) }, () => part)
	return new File([...whole, part.slice(0, size % part.length)], 'big.csv')
}

test.each([
	['an empty file', textFile(''), 'This file is empty'],
	['a file of blank lines', textFile('\n\n\n'), 'This file is empty'],
	[
		'a binary file',
		textFile(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 1])),
		'This is not a text file',
	],
	['broken JSON', textFile('[{"a": 1},\n{"a": }]', 'a.json'), 'This JSON is not valid'],
	['JSON with no records', textFile('[1, 2, 3]', 'a.json'), 'There are no records in this file'],
])('%s is explained', async (_, file, title) => {
	await openFile(file)
	await expect.element(page.getByRole('alert').getByRole('heading', { name: title })).toBeVisible()
	await expect.element(page.getByRole('button', { name: 'Choose another file' })).toBeVisible()
})

test('broken JSON says where', async () => {
	await openFile(textFile('[{"a": 1},\n{"a": }]', 'a.json'))
	await expect.element(page.getByText(/line 2, column 7/)).toBeVisible()
})

test('another file can be opened from a failure', async () => {
	await openFile(textFile(''))
	await expect.element(page.getByRole('alert')).toBeVisible()
	await userEvent.upload(page.getByLabelText('Data file'), textFile('id\nfound\n'))
	await expect.element(page.getByRole('gridcell', { name: 'found' })).toBeVisible()
})

test('a file past the limit is turned away', async () => {
	mount(START)
	await expect.element(page.getByLabelText('Data file')).toBeInTheDocument()
	openHere(bytes(MAX_FILE + 1))
	await expect.element(page.getByRole('heading', { name: 'This file is too large' })).toBeVisible()
	await expect.element(page.getByText(/250 MB/)).toBeVisible()
})

test('a large file is asked about, and can be left alone', async () => {
	const router = mount(START)
	await expect.element(page.getByLabelText('Data file')).toBeInTheDocument()
	openHere(bytes(LARGE_FILE + 1))
	await expect.element(page.getByRole('heading', { name: 'Open big.csv?' })).toBeVisible()
	await page.getByRole('button', { name: 'Cancel' }).click()
	await expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
	expect(router.state.location.pathname).toBe(START)
})

test('a large file is read when asked to', async () => {
	mount(START)
	await expect.element(page.getByLabelText('Data file')).toBeInTheDocument()
	openHere(bytes(LARGE_FILE + 1))
	await page.getByRole('button', { name: 'Open anyway' }).click()
	// It is all zeros.
	await expect
		.element(page.getByRole('heading', { name: 'This is not a text file' }))
		.toBeVisible()
})

test('progress shows, and reading can be cancelled', async () => {
	const router = mount(START)
	await expect.element(page.getByLabelText('Data file')).toBeInTheDocument()
	openHere(bytes(60_000_000, 'a,b,c,d\n'))
	await expect.element(page.getByRole('progressbar')).toBeInTheDocument()
	await expect.element(page.getByRole('heading', { name: 'Opening big.csv' })).toBeVisible()
	await page.getByRole('button', { name: 'Cancel' }).click()
	await expect.element(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
	expect(router.state.location.pathname).toBe(START)
	expect(workspace.get().phase.kind).toBe('idle')
})

test('ragged rows open, and the warnings can be read', async () => {
	await openFile(textFile('a,b\n1\n1,2,3\n'))
	await expect.element(page.getByRole('gridcell', { name: '3', exact: true })).toBeVisible()
	await page.getByRole('button', { name: '2 warnings' }).click()
	const list = page.getByRole('list', { name: 'Warnings' })
	await expect.element(list.getByText(/fewer cells/)).toBeVisible()
	await expect.element(list.getByText(/more cells/)).toBeVisible()
})

test('the header row and the delimiter can be changed', async () => {
	const router = await openFile(textFile('one|two\nthree|four\n'))
	const path = () => router.state.location.pathname
	await expect.element(page.getByRole('columnheader', { name: 'two' })).toBeVisible()
	const before = path()

	await page.getByRole('button', { name: 'Import options' }).click()
	await page.getByRole('switch', { name: 'The first row is a header' }).click()
	await page.getByRole('button', { name: 'Read it again' }).click()
	await expect.element(page.getByRole('gridcell', { name: 'two' })).toBeVisible()

	await page.getByRole('button', { name: 'Import options' }).click()
	await page.getByRole('combobox', { name: 'Cells are separated by' }).click()
	await page.getByRole('option', { name: 'Comma' }).click()
	await page.getByRole('button', { name: 'Read it again' }).click()
	await expect.element(page.getByRole('gridcell', { name: 'one|two' })).toBeVisible()
	expect(path()).toBe(before)
})

test('a screen that cannot be drawn is replaced by one that can', async () => {
	await openFile(textFile('id\n1\n'))
	await expect.element(page.getByRole('gridcell', { name: '1', exact: true })).toBeVisible()

	const { dataset } = workspace.get()
	workspace.set({ dataset: { ...dataset!, columns: [null as never] } })
	await expect.element(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()

	workspace.set({ dataset })
	await page.getByRole('button', { name: 'Try again' }).click()
	await expect.element(page.getByRole('gridcell', { name: '1', exact: true })).toBeVisible()
	// React reports what it caught.
	vi.mocked(console.error).mockClear()
	vi.mocked(console.warn).mockClear()
})
