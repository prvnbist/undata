import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { deleteDataset, listDatasets } from '@/lib/storage/datasets'
import { listViews, putView } from '@/lib/storage/views'
import { applyView, closeDataset } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { mount, openFile, textFile, useApp } from './app'

useApp()

const csv = 'name,amount\nAnna,5\nBen,12\nCarla,7\n'

beforeEach(async () => {
	for (const { id } of await listDatasets()) await deleteDataset(id)
})

const open = async () => {
	await openFile(textFile(csv, 'people.csv'))
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
	await vi.waitFor(() => expect(useWorkspace.getState().saved).toBe('saved'))
	const { dataset } = useWorkspace.getState()
	return { id: dataset!.id, name: dataset!.columns[0]!.id, amount: dataset!.columns[1]!.id }
}

const settled = () => vi.waitFor(() => expect(useWorkspace.getState().querying).toBe(false))

const change = async (patch: Partial<ReturnType<typeof useWorkspace.getState>['view']>) => {
	await applyView({ ...useWorkspace.getState().view, ...patch })
	await settled()
}

const switcher = () => page.getByRole('button', { name: /^View:/ })
const item = (name: string) => page.getByRole('menuitem', { name, exact: true })
const choice = (name: string) => page.getByRole('menuitemradio', { name, exact: true })

const menu = async (pick: () => ReturnType<typeof item>) => {
	await userEvent.click(switcher())
	await userEvent.click(pick())
}

const saveAs = async (name: string) => {
	await menu(() => item('Save as a new view…'))
	const dialog = page.getByRole('dialog', { name: 'Save view' })
	await userEvent.fill(dialog.getByRole('textbox', { name: 'Name' }), name)
	await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
	await expect.element(dialog).not.toBeInTheDocument()
}

test('save, switch and update, with a marker while the view has changes', async () => {
	const { name, amount } = await open()
	await expect.element(switcher()).toHaveAccessibleName('View: All rows')

	await change({ sort: [{ columnId: amount, desc: true }] })
	await saveAs('Biggest')
	await expect.element(switcher()).toHaveAccessibleName('View: Biggest')

	await change({ search: 'a' })
	await expect.element(switcher()).toHaveAccessibleName('View: Biggest, changed')

	await menu(() => choice('All rows'))
	await settled()
	expect(useWorkspace.getState().view).toMatchObject({ search: '', sort: [], filters: [] })
	await expect.element(switcher()).toHaveAccessibleName('View: All rows')

	await menu(() => choice('Biggest'))
	await settled()
	expect(useWorkspace.getState().view).toMatchObject({
		search: '',
		sort: [{ columnId: amount, desc: true }],
	})
	await expect.element(switcher()).toHaveAccessibleName('View: Biggest')

	await change({ filters: [{ columnId: name, op: 'notEmpty' }] })
	await menu(() => item('Update “Biggest”'))
	await expect.element(switcher()).toHaveAccessibleName('View: Biggest')
	await menu(() => choice('All rows'))
	await menu(() => choice('Biggest'))
	await settled()
	expect(useWorkspace.getState().view.filters).toEqual([{ columnId: name, op: 'notEmpty' }])
})

test('rename and delete', async () => {
	const { id, amount } = await open()
	await change({ sort: [{ columnId: amount, desc: false }] })
	await saveAs('Small first')

	await menu(() => item('Rename “Small first”…'))
	const dialog = page.getByRole('dialog', { name: 'Rename view' })
	await userEvent.fill(dialog.getByRole('textbox', { name: 'Name' }), 'Cheapest')
	await userEvent.click(dialog.getByRole('button', { name: 'Rename' }))
	await expect.element(switcher()).toHaveAccessibleName('View: Cheapest')

	await menu(() => item('Delete “Cheapest”'))
	await expect.element(switcher()).toHaveAccessibleName('View: All rows')
	await vi.waitFor(async () => expect(await listViews(id)).toEqual([]))
	// What was on screen stays.
	expect(useWorkspace.getState().view.sort).toEqual([{ columnId: amount, desc: false }])
})

test('a name is needed, and two views cannot share one', async () => {
	await open()
	await saveAs('Mine')
	await menu(() => item('Save as a new view…'))
	const dialog = page.getByRole('dialog', { name: 'Save view' })
	await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
	await expect.element(dialog.getByRole('alert')).toHaveTextContent('Give the view a name')
	await userEvent.fill(dialog.getByRole('textbox', { name: 'Name' }), ' mine ')
	await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
	await expect
		.element(dialog.getByRole('alert'))
		.toHaveTextContent('A view is already called Mine')
})

test('views survive a reload, and go with their dataset', async () => {
	const { id, amount } = await open()
	await change({ sort: [{ columnId: amount, desc: true }] })
	await saveAs('Biggest')
	await vi.waitFor(async () => expect(await listViews(id)).toHaveLength(1))

	closeDataset()
	mount(`/d/${id}`)
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
	await expect.element(switcher()).toHaveAccessibleName('View: Biggest')
	await userEvent.click(switcher())
	await expect.element(choice('Biggest')).toHaveAttribute('aria-checked', 'true')
	await userEvent.keyboard('{Escape}')

	await deleteDataset(id)
	expect(await listViews(id)).toEqual([])
})

test('a view naming a column that is gone opens, and says what was skipped', async () => {
	const { id, name } = await open()
	const { view } = useWorkspace.getState()
	await putView(id, {
		id: 'old',
		name: 'Old',
		savedAt: 1,
		titles: { gone: 'region' },
		view: {
			...view,
			filters: [
				{ columnId: name, op: 'notEmpty' },
				{ columnId: 'gone', op: 'empty' },
			],
			sort: [{ columnId: 'gone', desc: false }],
		},
	})
	closeDataset()
	mount(`/d/${id}`)
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()

	await menu(() => choice('Old'))
	await settled()
	expect(useWorkspace.getState().view.filters).toEqual([{ columnId: name, op: 'notEmpty' }])
	expect(useWorkspace.getState().view.sort).toEqual([])
	await expect
		.element(
			page.getByText(
				'“Old” names region, which this data no longer has, so that part was skipped.'
			)
		)
		.toBeVisible()
	await expect.element(page.getByRole('gridcell', { name: 'Carla' })).toBeVisible()
})
