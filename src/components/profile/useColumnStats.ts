import { useEffect, useRef, useState } from 'react'

import type { ColumnStats } from '@/lib/engine/stats'
import { engine } from '@/store/session'
import type { CurrentQuery } from '@/store/workspace'

// Long enough that columns passed while scrolling sideways are never asked about.
export const STATS_DELAY = 150

type Known = { queryId: number; stats: ColumnStats }

// Stats for the columns on screen, for the current query. A column keeps showing what it had until
// the new ones are back, so charts do not blink when a filter changes.
export const useColumnStats = (
	datasetId: string | null,
	query: CurrentQuery | null,
	columnIds: string[]
) => {
	const [known, setKnown] = useState<{ datasetId: string | null; stats: Map<string, Known> }>({
		datasetId,
		stats: new Map(),
	})
	// Another dataset starts empty, as the same column ids can mean other columns.
	if (known.datasetId !== datasetId) setKnown({ datasetId, stats: new Map() })

	const asked = useRef(new Set<string>())
	const wanted = columnIds.join('\n')

	useEffect(() => {
		const client = engine()
		if (!client || !query || !datasetId || wanted === '') return
		const timer = setTimeout(() => {
			for (const columnId of wanted.split('\n')) {
				const key = `${datasetId}:${query.id}:${columnId}`
				if (asked.current.has(key)) continue
				asked.current.add(key)
				client.stats(query.id, columnId).then(
					stats =>
						setKnown(current => {
							if (current.datasetId !== datasetId) return current
							const next = new Map(current.stats)
							next.set(columnId, { queryId: query.id, stats })
							return { datasetId, stats: next }
						}),
					// A newer query replaced it. Asked again if it is still wanted.
					() => asked.current.delete(key)
				)
			}
		}, STATS_DELAY)
		return () => clearTimeout(timer)
	}, [datasetId, query, wanted])

	return known.datasetId === datasetId ? known.stats : null
}
