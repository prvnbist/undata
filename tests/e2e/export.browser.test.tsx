import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { setHidden } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { openFile, textFile, useApp } from './app'

useApp()

let saved: { blob: Blob; name: string }[] = []

beforeEach(() => {
	saved = []
	const blobs = new Map<string, Blob>()
	vi.spyOn(URL, 'createObjectURL').mockImplementation(object => {
		const url = `blob:test/${blobs.size}`
		blobs.set(url, object as Blob)
		return url
	})
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
		this: HTMLAnchorElement
	) {
		saved.push({ blob: blobs.get(this.href)!, name: this.download })
	})
})

const exported = async () => {
	await vi.waitFor(() => expect(saved).toHaveLength(1))
	return { name: saved[0]!.name, text: await saved[0]!.blob.text() }
}

const openDialog = async () => {
	await userEvent.click(page.getByRole('button', { name: 'Export', exact: true }))
	await expect.element(page.getByRole('dialog', { name: 'Export' })).toBeVisible()
}

const csv = 'id,name,secret\n2,b,x\n1,a,y\n3,=c,z\n'

test('exports the view as CSV, in its order, without hidden columns', async () => {
	await openFile(textFile(csv, 'people.csv'))
	await expect.element(page.getByRole('gridcell', { name: '=c' })).toBeVisible()
	const { view, dataset } = useWorkspace.getState()
	const [id, , secret] = dataset!.columns
	await applyView({
		...setHidden(view, secret!.id, true),
		sort: [{ columnId: id!.id, desc: false }],
	})
	await vi.waitFor(() => expect(useWorkspace.getState().querying).toBe(false))

	await openDialog()
	await expect.element(page.getByText(/^Hidden columns \(1\) are left out\./)).toBeVisible()
	await userEvent.click(page.getByRole('button', { name: 'Export CSV' }))

	expect(await exported()).toEqual({ name: 'people.csv', text: 'id,name\n1,a\n2,b\n3,=c\n' })
})

test('all rows as JSON with the file headers, formula escaping off and only for CSV', async () => {
	await openFile(textFile(csv, 'people.csv'))
	await expect.element(page.getByRole('gridcell', { name: '=c' })).toBeVisible()
	const { view, dataset } = useWorkspace.getState()
	await applyView({ ...view, sort: [{ columnId: dataset!.columns[0]!.id, desc: true }] })

	await openDialog()
	await userEvent.click(page.getByText('All 3 rows'))
	await userEvent.click(page.getByText('JSON', { exact: true }))
	await userEvent.click(page.getByText('Headers from the file'))
	expect(page.getByRole('switch', { name: 'Escape formulas' }).elements()).toHaveLength(0)
	await userEvent.click(page.getByRole('button', { name: 'Export JSON' }))

	const { name, text } = await exported()
	expect(name).toBe('people.json')
	expect(JSON.parse(text)).toEqual([
		{ id: 2, name: 'b', secret: 'x' },
		{ id: 1, name: 'a', secret: 'y' },
		{ id: 3, name: '=c', secret: 'z' },
	])
})

test('formula escaping is off until it is switched on', async () => {
	await openFile(textFile('f\n=1+1\n', 'f.csv'))
	await openDialog()
	const toggle = page.getByRole('switch', { name: 'Escape formulas' })
	await expect.element(toggle).not.toBeChecked()
	await userEvent.click(toggle)
	await userEvent.click(page.getByRole('button', { name: 'Export CSV' }))

	expect((await exported()).text).toBe("f\n'=1+1\n")
})
