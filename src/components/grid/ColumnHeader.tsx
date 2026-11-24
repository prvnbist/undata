import { useRef } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'

import { DATA_TYPES } from '@/lib/constants'
import type { ColumnInfo } from '@/lib/engine/store'
import { cycleSort, setSize } from '@/lib/engine/view'
import type { SortKey } from '@/lib/engine/view'
import { applyView, arrangeView } from '@/store/session'
import { workspace } from '@/store/workspace'
import { MiniChart } from '@/components/profile/MiniChart'
import type { ColumnStats } from '@/lib/engine/stats'
import { ColumnMenu } from './ColumnMenu'
import { MAX_COLUMN, MIN_COLUMN } from './layout'

const LABELS = new Map<string, string>(DATA_TYPES.map(({ value, label }) => [value, label]))

// Shift adds the column to the sort instead of sorting by it alone.
const sortBy = (id: string, event: MouseEvent) => {
	const { view } = workspace.get()
	void applyView({ ...view, sort: cycleSort(view.sort, id, event.shiftKey) })
}

const KEY_STEP = 16
const clamp = (size: number) => Math.round(Math.min(MAX_COLUMN, Math.max(MIN_COLUMN, size)))

// Null goes back to the width that fits the values.
const resize = (id: string, size: number | null) =>
	arrangeView(setSize(workspace.get().view, id, size === null ? null : clamp(size)))

// The right edge of a header. Drag it, double-click it to fit, or focus it and use the arrow keys.
function ResizeHandle({ id, title, size }: { id: string; title: string; size: number }) {
	const start = useRef<{ x: number; size: number } | null>(null)

	const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		event.stopPropagation()
		try {
			event.currentTarget.setPointerCapture(event.pointerId)
		} catch {
			// A pointer that is already gone. Moves over the handle still resize.
		}
		start.current = { x: event.clientX, size }
	}
	const onPointerMove = (event: PointerEvent) => {
		if (!start.current) return
		// Shown while dragging, saved when it ends.
		const next = clamp(start.current.size + event.clientX - start.current.x)
		workspace.set({ view: setSize(workspace.get().view, id, next) })
	}
	const onPointerUp = () => {
		if (!start.current) return
		start.current = null
		void arrangeView(workspace.get().view)
	}
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft') void resize(id, size - KEY_STEP)
		else if (event.key === 'ArrowRight') void resize(id, size + KEY_STEP)
		else if (event.key === 'Enter') void resize(id, null)
		else return
		event.preventDefault()
	}

	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={`Resize ${title}`}
			aria-valuenow={size}
			aria-valuemin={MIN_COLUMN}
			aria-valuemax={MAX_COLUMN}
			tabIndex={0}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
			onDoubleClick={() => void resize(id, null)}
			onKeyDown={onKeyDown}
			className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize touch-none outline-none hover:bg-primary/40 focus-visible:bg-primary/60"
		/>
	)
}

export function ColumnHeader({
	column,
	size,
	colIndex,
	sort,
	onDragStart,
	consumeDrag,
	stats,
}: {
	column: ColumnInfo
	size: number
	colIndex: number
	sort: SortKey[]
	onDragStart: (id: string, event: PointerEvent) => void
	consumeDrag: () => boolean
	// For the rows of the view, once they are known.
	stats: ColumnStats | null
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
			className="relative flex shrink-0 flex-col border-r pr-1 pb-1.5 pl-3 text-sm"
			style={{ width: size }}
		>
			<div className="flex h-9 shrink-0 items-center gap-1">
				<button
					type="button"
					onPointerDown={event => onDragStart(column.id, event)}
					onClick={event => {
						if (!consumeDrag()) sortBy(column.id, event)
					}}
					title={`${column.title} (${LABELS.get(column.type)}). Click to sort, Shift-click to add to the sort, drag to move`}
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
			<MiniChart
				title={column.title}
				type={column.type}
				columnId={column.id}
				stats={stats}
				className="mr-2 min-h-0 flex-1"
			/>
			<ResizeHandle id={column.id} title={column.title} size={size} />
		</div>
	)
}
