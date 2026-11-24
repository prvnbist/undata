import { useEffect, useState, useSyncExternalStore } from 'react'

import { engine } from '@/store/session'
import type { CurrentQuery } from '@/store/workspace'
import { createRowCache } from './rowCache'
import type { Range } from './scaledScroll'

const fetchRows = (queryId: number, start: number, end: number, columnIds: string[]) =>
	engine()?.rows(queryId, start, end, columnIds) ?? Promise.reject(new Error('Nothing is open'))

// Keeps the rows around what is on screen at hand.
export const useRowWindow = (query: CurrentQuery | null, { start, end }: Range, ids: string[]) => {
	const [cache] = useState(() => createRowCache(fetchRows))
	useSyncExternalStore(cache.subscribe, cache.version, cache.version)

	useEffect(() => cache.setQuery(query), [cache, query])
	useEffect(() => cache.ensure(start, end, ids), [cache, query, start, end, ids])

	return cache
}
