import { fitColumn } from '@/components/grid/layout'
import type { ExportOptions } from '@/lib/engine/export'
import { aggregateKey, aggregatesFor, summaryColumns } from '@/lib/engine/group'
import { fitsColumns } from '@/lib/engine/operators'
import { defaultView } from '@/lib/engine/view'
import type { ColumnSetup, Grouping, ViewState } from '@/lib/engine/view'
import { formatBytes } from '@/lib/bytes'
import type { ImportOptions } from '@/lib/import/types'
import { requestPersistence, saveDataset, updateDataset } from '@/lib/storage/datasets'
import { setActiveView } from '@/lib/storage/views'
import { createEngineClient, isEngineError } from '@/workers/client'
import type { EngineClient } from '@/workers/client'
import type { EngineError } from '@/workers/protocol'
import { initialWorkspace, workspace } from './workspace'

// How many rows a column's first width is worked out from.
const FIT_ROWS = 50

// The engine and the bytes of the open dataset. They are not state: nothing renders from them.
let client: EngineClient | null = null
let source: Blob | null = null

// In powers of ten. A file beyond the first is asked about, and beyond the second is turned away.
export const LARGE_FILE = 100_000_000
export const MAX_FILE = 250_000_000

export type ImportRequest = {
	blob: Blob
	name: string
	// Reading the same dataset again keeps its id.
	id?: string
	options?: ImportOptions | null
	setup?: ColumnSetup[] | null
	view?: ViewState | null
	// Opened before, so the size was already agreed to.
	known?: boolean
}

const toEngineError = (error: unknown): EngineError =>
	isEngineError(error)
		? error
		: { code: 'crashed', message: error instanceof Error ? error.message : String(error) }

export const engine = () => client

export const closeDataset = () => {
	client?.terminate()
	client = null
	source = null
	waiting = null
	workspace.set(initialWorkspace)
}

const toSetup = ({ id, title, type }: ColumnSetup): ColumnSetup => ({ id, title, type })

const droppedNotice = (dropped: number) =>
	dropped === 1
		? 'A filter no longer fit its column, so it was removed.'
		: `${dropped} filters no longer fit their columns, so they were removed.`

// A grouping by columns that are still there, with only the aggregates their types still have.
const fitGrouping = (grouping: Grouping | null, columns: ColumnSetup[]): Grouping | null => {
	if (!grouping) return null
	const types = new Map(columns.map(column => [column.id, column.type]))
	const by = grouping.by.filter(id => types.has(id))
	if (by.length === 0) return null
	const aggregates = grouping.aggregates.filter(({ columnId, fn }) => {
		const type = types.get(columnId)
		return type !== undefined && aggregatesFor(type).includes(fn)
	})
	const keys = new Set(['count', ...by, ...aggregates.map(aggregateKey)])
	const sort = grouping.sort.filter(key => keys.has(key.key))
	const same =
		by.length === grouping.by.length &&
		aggregates.length === grouping.aggregates.length &&
		sort.length === grouping.sort.length
	return same ? grouping : { by, aggregates, sort }
}

// A view whose filters all still fit the columns. One that does not would fail every query.
const fitView = (view: ViewState, columns: ColumnSetup[]) => {
	const { kept, dropped } = fitsColumns(view.filters, columns)
	const grouping = fitGrouping(view.grouping, columns)
	const fitted =
		dropped || grouping !== view.grouping ? { ...view, filters: kept, grouping } : view
	return { view: fitted, dropped }
}

const isGrouped = (view: ViewState) => (view.grouping?.by.length ?? 0) > 0

// The groups of a query, if the view has any.
const groupsOf = (own: EngineClient, queryId: number, view: ViewState) =>
	isGrouped(view) ? own.group(queryId, view.grouping!) : Promise.resolve(null)

const unsaved = (error: unknown) => {
	const reason = error instanceof DOMException && error.name === 'QuotaExceededError'
	workspace.set({
		saved: 'unsaved',
		notice: reason
			? 'Could not save this dataset: browser storage is full. It stays open until you leave.'
			: 'Could not save this dataset: this browser does not let Undata store data. It stays open until you leave.',
	})
}

// Saving never stops a dataset from opening. It only changes what is said about it.
// `fresh` is a dataset read without its view, whose saved views are then none of them on screen.
const save = async (id: string, blob: Blob, fresh: boolean) => {
	const { dataset, view } = workspace.get()
	if (!dataset || dataset.id !== id) return
	workspace.set({ saved: 'saving' })
	try {
		const stored = await saveDataset(
			{
				id,
				name: dataset.name,
				size: dataset.size,
				rowCount: dataset.rowCount,
				columnCount: dataset.columns.length,
				options: dataset.options,
				setup: dataset.columns.map(toSetup),
				view,
			},
			blob
		)
		if (workspace.get().dataset?.id === id) {
			const activeView = fresh ? null : (stored.activeView ?? null)
			workspace.set({ saved: 'saved', views: stored.views ?? [], activeView })
			if (fresh && stored.activeView) await setActiveView(id, null)
		}
		void requestPersistence()
	} catch (error) {
		if (workspace.get().dataset?.id === id) unsaved(error)
	}
}

// Later changes go after the first save, in the order they were made.
let pendingWrite: Promise<unknown> = Promise.resolve()
const persist = (patch: Parameters<typeof updateDataset>[1]) => {
	const { dataset, saved } = workspace.get()
	if (!dataset || saved === 'unsaved') return pendingWrite
	const { id } = dataset
	pendingWrite = pendingWrite
		.then(() => updateDataset(id, patch))
		.catch(error => {
			if (workspace.get().dataset?.id === id) unsaved(error)
		})
	return pendingWrite
}

// What "open anyway" goes on with.
let waiting: Required<Omit<ImportRequest, 'known'>> | null = null

const read = async (request: Required<Omit<ImportRequest, 'known'>>) => {
	const { id, blob, name, options, setup, view } = request
	workspace.set({ phase: { kind: 'importing', id, name, progress: null } })

	const own = createEngineClient()
	client = own
	source = blob

	try {
		const opened = await own.open(blob, {
			options,
			setup,
			onProgress: progress =>
				workspace.set({ phase: { kind: 'importing', id, name, progress } }),
		})
		const ids = opened.columns.map(column => column.id)
		const { view: initial, dropped } = fitView(view ?? defaultView(ids), opened.columns)
		const { queryId, rowCount } = await own.query(initial)
		const sample = await own.rows(queryId, 0, FIT_ROWS, ids)
		const groups = await groupsOf(own, queryId, initial)
		if (own !== client) return

		workspace.set({
			phase: { kind: 'ready', id, name },
			fitted: Object.fromEntries(
				opened.columns.map((column, i) => [
					column.id,
					fitColumn(
						column,
						sample.map(row => row.text[i]!)
					),
				])
			),
			dataset: { id, name, size: blob.size, ...opened },
			view: initial,
			query: { id: queryId, rowCount },
			groups,
			...(dropped ? { notice: droppedNotice(dropped) } : {}),
		})
		pendingWrite = save(id, blob, view === null)
		await pendingWrite
	} catch (error) {
		// Another import took over, or this one was cancelled.
		if (own !== client) return
		workspace.set({ phase: { kind: 'failed', id, name, error: toEngineError(error) } })
	}
}

// Starts reading, and gives back the id straight away so the caller can go to the workspace, which is
// where progress, questions and failures are shown.
export const importDataset = ({
	blob,
	name,
	id = crypto.randomUUID(),
	options = null,
	setup = null,
	view = null,
	known = false,
}: ImportRequest): { id: string; done: Promise<void> } => {
	closeDataset()
	const request = { blob, name, id, options, setup, view }

	if (blob.size > MAX_FILE) {
		const message = `It is ${formatBytes(blob.size)}, and the most Undata opens is ${formatBytes(MAX_FILE)}.`
		workspace.set({ phase: { kind: 'failed', id, name, error: { code: 'too-large', message } } })
		return { id, done: Promise.resolve() }
	}

	if (blob.size > LARGE_FILE && !known) {
		waiting = request
		workspace.set({ phase: { kind: 'confirming', id, name, size: blob.size } })
		return { id, done: Promise.resolve() }
	}

	return { id, done: read(request) }
}

export const openAnyway = () => {
	const request = waiting
	waiting = null
	return request ? read(request) : Promise.resolve()
}

// Reads the same bytes in another way. The columns it finds are not the ones there were, so what was
// set on those is left behind.
export const reimport = (options: ImportOptions) => {
	const { dataset } = workspace.get()
	if (!dataset || !source) return Promise.resolve()

	const request = { blob: source, name: dataset.name, id: dataset.id, options }
	closeDataset()
	return read({ ...request, setup: null, view: null })
}

// Shows the dataset another way. What is shown is kept for next time.
export const applyView = async (view: ViewState) => {
	const own = client
	if (!own) return
	// Grouping again, or ungrouping, leaves the group that was opened behind.
	const leaves = view.grouping !== null || workspace.get().view.grouping !== null
	workspace.set({
		view,
		querying: true,
		queryError: null,
		...(leaves ? { drilledFrom: null } : {}),
	})
	const saving = persist({ view })
	try {
		const { queryId, rowCount } = await own.query(view)
		const groups = await groupsOf(own, queryId, view)
		if (own !== client || workspace.get().view !== view) return
		workspace.set({ query: { id: queryId, rowCount }, groups, querying: false })
	} catch (error) {
		if (own !== client || workspace.get().view !== view) return
		workspace.set({ querying: false, queryError: toEngineError(error) })
	}
	await saving
}

// A view made for these columns once, such as a saved one, fitted to their types now.
export const applyFittedView = (view: ViewState) => {
	const { dataset } = workspace.get()
	if (!dataset) return Promise.resolve()
	const { view: fitted, dropped } = fitView(view, dataset.columns)
	if (dropped) workspace.set({ notice: droppedNotice(dropped) })
	return applyView(fitted)
}

// Titles and types. The engine works out the counts again for the new types.
export const applyColumns = async (setup: ColumnSetup[]) => {
	const own = client
	const { dataset } = workspace.get()
	if (!own || !dataset) return
	const columns = await own.setColumns(setup)
	if (own !== client) return
	workspace.set({ dataset: { ...dataset, columns } })
	const saving = persist({ setup: columns.map(toSetup) })

	// A new type sorts and filters by other values, so the rows are found again.
	const before = new Map(dataset.columns.map(column => [column.id, column.type]))
	const retyped = columns.some(column => column.type !== before.get(column.id))
	if (retyped) {
		const { view, dropped } = fitView(workspace.get().view, columns)
		if (dropped) workspace.set({ notice: droppedNotice(dropped) })
		await applyView(view)
	}
	await saving
}

// Order and widths: they change what is shown, not which rows, so the engine is not asked again.
export const arrangeView = (view: ViewState) => {
	if (!client) return Promise.resolve()
	workspace.set({ view })
	return persist({ view })
}

// The file name an export gets: the dataset's, with the format's extension.
export const exportName = (name: string, format: ExportOptions['format'], suffix = '') =>
	`${name.replace(/\.[^./\\]+$/, '') || 'export'}${suffix}.${format}`

// Made in the engine and handed to the browser to save. Nothing is sent anywhere.
export const exportDataset = async (options: Omit<ExportOptions, 'columnIds'>) => {
	const { query, view, dataset } = workspace.get()
	if (!client || !query || !dataset) return null
	const known = new Set(dataset.columns.map(column => column.id))
	const columnIds = view.columns
		.filter(column => !column.hidden && known.has(column.id))
		.map(column => column.id)
	return client.export(query.id, { ...options, columnIds })
}

// The group summary as a file, or as text to copy.
export const exportGroups = async (
	options: Pick<ExportOptions, 'format' | 'names' | 'escapeFormulas'>
) => {
	const { groups, view, dataset } = workspace.get()
	if (!client || !groups || !dataset || !view.grouping) return null
	return client.exportGroups({
		groupId: groups.groupId,
		columns: summaryColumns(dataset.columns, view.grouping, options.names),
		format: options.format,
		escapeFormulas: options.escapeFormulas,
	})
}

export const download = (blob: Blob, name: string) => {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = name
	link.click()
	setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
