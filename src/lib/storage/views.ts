import type { ViewState } from '@/lib/engine/view'
import { STORES, request, transact } from './db'
import type { StoredDataset } from './datasets'

// A named view of one dataset. They are kept in the dataset's own record, so they go with it.
export type SavedView = {
	id: string
	name: string
	view: ViewState
	// The title of every column the view names, as it was, for saying which are gone.
	titles: Record<string, string>
	savedAt: number
}

const change = (datasetId: string, edit: (record: StoredDataset) => StoredDataset) =>
	transact([STORES.datasets], 'readwrite', async ({ datasets }) => {
		const existing = (await request(datasets.get(datasetId))) as StoredDataset | undefined
		if (!existing) return false
		datasets.put(edit(existing))
		return true
	})

export const listViews = (datasetId: string) =>
	transact([STORES.datasets], 'readonly', async ({ datasets }) => {
		const record = (await request(datasets.get(datasetId))) as StoredDataset | undefined
		return record?.views ?? []
	})

// Adds the view, or replaces the one with its id.
export const putView = (datasetId: string, saved: SavedView) =>
	change(datasetId, record => {
		const views = record.views ?? []
		const at = views.findIndex(view => view.id === saved.id)
		return {
			...record,
			views: at === -1 ? [...views, saved] : views.map((view, i) => (i === at ? saved : view)),
		}
	})

export const removeView = (datasetId: string, viewId: string) =>
	change(datasetId, record => ({
		...record,
		views: (record.views ?? []).filter(view => view.id !== viewId),
		activeView: record.activeView === viewId ? null : (record.activeView ?? null),
	}))

export const setActiveView = (datasetId: string, viewId: string | null) =>
	change(datasetId, record => ({ ...record, activeView: viewId }))
