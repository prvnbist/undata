import type { MouseEvent } from 'react'
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'

import { DATA_TYPES } from '@/lib/constants'
import type { ColumnInfo } from '@/lib/engine/store'
import { cycleSort } from '@/lib/engine/view'
import type { SortKey } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { workspace } from '@/store/workspace'
import { ColumnMenu } from './ColumnMenu'

const LABELS = new Map<string, string>(DATA_TYPES.map(({ value, label }) => [value, label]))

// Shift adds the column to the sort instead of sorting by it alone.
const onSort = (id: string) => (event: MouseEvent) => {
	const { view } = workspace.get()
	void applyView({ ...view, sort: cycleSort(view.sort, id, event.shiftKey) })
}

export function ColumnHeader({
	column,
	size,
	colIndex,
	sort,
}: {
	column: ColumnInfo
	size: number
	colIndex: number
	sort: SortKey[]
}) {
	const at = sort.findIndex(key => key.columnId === column.id)
	const key = at === -1 ? null : sort[at]!
	const direction = key ? (key.desc ? 'desc' : 'asc') : null
	// Assistive tech expects one sorted column. The others say where they come in the sort.
	const ariaSort = at === 0 ? (key!.desc ? 'descending' : 'ascending') : undefined
	const Arrow = key?.desc ? IconArrowDown : IconArrowUp

	return (
		<div
			role="columnheader"
			aria-colindex={colIndex}
			aria-sort={ariaSort}
			aria-label={column.title}
			aria-description={
				key
					? `Sorted ${direction === 'desc' ? 'descending' : 'ascending'}${sort.length > 1 ? `, ${at + 1} of ${sort.length}` : ''}`
					: undefined
			}
			className="flex shrink-0 items-center gap-1 border-r pr-1 pl-3 text-sm"
			style={{ width: size }}
		>
			<button
				type="button"
				onClick={onSort(column.id)}
				title={`${column.title} (${LABELS.get(column.type)}). Click to sort, Shift-click to add to the sort`}
				className="flex min-w-0 flex-1 items-center gap-1 self-stretch text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				<span className="truncate">{column.title}</span>
				{key && (
					<span className="flex shrink-0 items-center text-primary">
						<Arrow className="size-3.5" aria-hidden />
						{sort.length > 1 && <span className="font-mono text-[10px]">{at + 1}</span>}
					</span>
				)}
			</button>
			<ColumnMenu column={column} sorted={direction} sortCount={sort.length} />
		</div>
	)
}
