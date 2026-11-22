import { useEffect, useMemo, useState } from 'react'

import type { RowWindow } from '@/lib/engine/store'
import { engine } from '@/store/session'
import { useWorkspace } from '@/store/workspace'

// The first page of rows, until the virtualised grid takes its place.
export function RowsPreview() {
	const dataset = useWorkspace(state => state.dataset)
	const query = useWorkspace(state => state.query)
	const [rows, setRows] = useState<RowWindow[]>([])
	const ids = useMemo(() => dataset?.columns.map(column => column.id) ?? [], [dataset])

	useEffect(() => {
		let stale = false
		if (!query) return
		engine()
			?.rows(query.id, 0, 50, ids)
			.then(
				result => {
					if (!stale) setRows(result)
				},
				() => {}
			)
		return () => void (stale = true)
	}, [query, ids])

	return (
		<div className="overflow-auto">
			<table className="text-sm">
				<thead>
					<tr>
						{dataset?.columns.map(column => (
							<th key={column.id} className="px-3 py-1 text-left">
								{column.title}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map(row => (
						<tr key={row.row}>
							{row.text.map((text, i) => (
								<td key={ids[i]} className="px-3 py-1 whitespace-nowrap">
									{text}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
