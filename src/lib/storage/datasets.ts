import type { ColumnSetup, ViewState } from '@/lib/engine/view'
import type { ImportOptions } from '@/lib/import/types'
import { STORES, request, transact } from './db'

// What is kept of a dataset. Parsed rows never are: opening it again reads the bytes again.
export type StoredDataset = {
	id: string
	name: string
	size: number
	rowCount: number
	columnCount: number
	options: ImportOptions
	setup: ColumnSetup[]
	view: ViewState
	createdAt: number
	openedAt: number
}

export type DatasetRecord = Omit<StoredDataset, 'createdAt' | 'openedAt'>

// Saves the dataset as just opened. The bytes are written only the first time, since reading the
// same dataset again with other options does not change them.
export const saveDataset = (record: DatasetRecord, blob: Blob, now = Date.now()) =>
	transact([STORES.datasets, STORES.blobs], 'readwrite', async ({ datasets, blobs }) => {
		const existing = (await request(datasets.get(record.id))) as StoredDataset | undefined
		const hasBytes = (await request(blobs.getKey(record.id))) !== undefined
		if (!hasBytes) blobs.put(blob, record.id)
		const stored: StoredDataset = {
			...record,
			createdAt: existing?.createdAt ?? now,
			openedAt: now,
		}
		datasets.put(stored)
		return stored
	})

export const updateDataset = (
	id: string,
	patch: Partial<Pick<StoredDataset, 'setup' | 'view' | 'name'>>
) =>
	transact([STORES.datasets], 'readwrite', async ({ datasets }) => {
		const existing = (await request(datasets.get(id))) as StoredDataset | undefined
		if (!existing) return false
		datasets.put({ ...existing, ...patch })
		return true
	})

// Most recently opened first.
export const listDatasets = () =>
	transact([STORES.datasets], 'readonly', async ({ datasets }) => {
		const all = (await request(datasets.getAll())) as StoredDataset[]
		return all.sort((a, b) => b.openedAt - a.openedAt)
	})

export const loadDataset = (id: string) =>
	transact([STORES.datasets, STORES.blobs], 'readonly', async ({ datasets, blobs }) => {
		const record = (await request(datasets.get(id))) as StoredDataset | undefined
		const blob = (await request(blobs.get(id))) as Blob | undefined
		return record && blob ? { record, blob } : null
	})

export const deleteDataset = (id: string) =>
	transact([STORES.datasets, STORES.blobs], 'readwrite', async ({ datasets, blobs }) => {
		datasets.delete(id)
		blobs.delete(id)
	})

// For tests: which datasets have bytes stored.
export const blobKeys = () =>
	transact([STORES.blobs], 'readonly', async ({ blobs }) =>
		((await request(blobs.getAllKeys())) as IDBValidKey[]).map(String)
	)

// Asks the browser not to clear saved datasets when space runs low. False when it would not say yes.
export const requestPersistence = async () => {
	try {
		if (!navigator.storage?.persist) return false
		return (await navigator.storage.persisted()) || (await navigator.storage.persist())
	} catch {
		return false
	}
}
