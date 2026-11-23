// A small IndexedDB wrapper. A connection is opened per operation and closed after it, so that a
// database can always be deleted or upgraded, and a browser that blocks storage fails each call.

const NAME = 'undata'
const VERSION = 1

export const STORES = { datasets: 'datasets', blobs: 'blobs' } as const
export type StoreName = (typeof STORES)[keyof typeof STORES]

const request = <T>(req: IDBRequest<T>) =>
	new Promise<T>((resolve, reject) => {
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})

const open = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(NAME, VERSION)
		req.onupgradeneeded = () => {
			const db = req.result
			// Listing recents reads only `datasets`, so the bytes are kept apart.
			if (!db.objectStoreNames.contains(STORES.datasets)) {
				db.createObjectStore(STORES.datasets, { keyPath: 'id' })
			}
			if (!db.objectStoreNames.contains(STORES.blobs)) db.createObjectStore(STORES.blobs)
		}
		req.onsuccess = () => {
			const db = req.result
			db.onversionchange = () => db.close()
			resolve(db)
		}
		req.onerror = () => reject(req.error)
		req.onblocked = () => reject(new DOMException('The database is in use', 'InvalidStateError'))
	})

// Runs `work` in one transaction and resolves with its result once the transaction has committed,
// so a write that fails for lack of space rejects.
export const transact = async <T>(
	names: StoreName[],
	mode: IDBTransactionMode,
	work: (stores: Record<StoreName, IDBObjectStore>, tx: IDBTransaction) => Promise<T>
): Promise<T> => {
	const db = await open()
	try {
		const tx = db.transaction(names, mode)
		const done = new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve()
			tx.onerror = () => reject(tx.error)
			tx.onabort = () => reject(tx.error ?? new DOMException('Aborted', 'AbortError'))
		})
		const stores = Object.fromEntries(names.map(name => [name, tx.objectStore(name)])) as Record<
			StoreName,
			IDBObjectStore
		>
		let result: T
		try {
			result = await work(stores, tx)
		} catch (error) {
			try {
				tx.abort()
			} catch {
				// Already finished.
			}
			done.catch(() => {})
			throw error
		}
		await done
		return result
	} finally {
		db.close()
	}
}

export { request }
