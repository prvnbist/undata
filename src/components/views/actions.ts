import { withColumns } from '@/lib/engine/view'
import type { ViewState } from '@/lib/engine/view'
import { putView, removeView, setActiveView } from '@/lib/storage/views'
import type { SavedView } from '@/lib/storage/views'
import { applyFittedView, applyView } from '@/store/session'
import { workspace } from '@/store/workspace'

// Storage that is full or blocked keeps views for as long as the dataset is open.
const keep = (work: (datasetId: string) => Promise<unknown>) => {
	const { dataset, saved } = workspace.get()
	if (!dataset || saved === 'unsaved') return Promise.resolve()
	return work(dataset.id).catch(() => {})
}

const columnIds = () => workspace.get().dataset?.columns.map(column => column.id) ?? []

// The saved view as it would open on these columns.
export const fittedView = (saved: SavedView, ids: string[]) => withColumns(saved.view, ids).view

// Whether what is on screen differs from the saved view it was switched to.
export const isChanged = (saved: SavedView, view: ViewState, ids: string[]) =>
	JSON.stringify(fittedView(saved, ids)) !== JSON.stringify(view)

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Why a name cannot be used, or null. `except` is the view being renamed.
export const nameProblem = (name: string, except: string | null = null) => {
	if (name.trim() === '') return 'Give the view a name'
	const taken = workspace.get().views.find(view => view.id !== except && sameName(view.name, name))
	return taken ? `A view is already called ${taken.name}` : null
}

const list = (names: string[]) =>
	names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

const setActive = (activeView: string | null) => {
	workspace.set({ activeView })
	return keep(id => setActiveView(id, activeView))
}

// Every row, with the columns as they are.
export const showAllRows = async () => {
	const { view } = workspace.get()
	await Promise.all([
		setActive(null),
		applyView({ ...view, search: '', filters: [], sort: [], grouping: null }),
	])
}

export const switchView = async (viewId: string) => {
	const saved = workspace.get().views.find(view => view.id === viewId)
	if (!saved) return
	const { view, missing } = withColumns(saved.view, columnIds())
	if (missing.length) {
		const names = missing.map(id => saved.titles[id] ?? id)
		const parts = missing.length === 1 ? 'that part was' : 'those parts were'
		workspace.set({
			notice: `“${saved.name}” names ${list(names)}, which this data no longer has, so ${parts} skipped.`,
		})
	}
	await Promise.all([setActive(viewId), applyFittedView(view)])
}

const titles = () =>
	Object.fromEntries(
		(workspace.get().dataset?.columns ?? []).map(column => [column.id, column.title])
	)

const store = (saved: SavedView) => {
	const { views } = workspace.get()
	const at = views.findIndex(view => view.id === saved.id)
	workspace.set({
		views: at === -1 ? [...views, saved] : views.map((view, i) => (i === at ? saved : view)),
	})
	return keep(id => putView(id, saved))
}

export const saveNewView = async (name: string) => {
	const saved: SavedView = {
		id: crypto.randomUUID(),
		name: name.trim(),
		view: workspace.get().view,
		titles: titles(),
		savedAt: Date.now(),
	}
	await Promise.all([store(saved), setActive(saved.id)])
}

const active = () => {
	const { views, activeView } = workspace.get()
	return views.find(view => view.id === activeView) ?? null
}

export const updateView = () => {
	const saved = active()
	if (!saved) return Promise.resolve()
	return store({ ...saved, view: workspace.get().view, titles: titles(), savedAt: Date.now() })
}

export const renameView = (name: string) => {
	const saved = active()
	return saved ? store({ ...saved, name: name.trim() }) : Promise.resolve()
}

// What is on screen stays. It is just no longer saved.
export const deleteView = () => {
	const saved = active()
	if (!saved) return Promise.resolve()
	const { views } = workspace.get()
	workspace.set({ views: views.filter(view => view.id !== saved.id), activeView: null })
	return keep(id => removeView(id, saved.id))
}
