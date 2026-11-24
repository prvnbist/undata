import { useEffect, useRef, useState } from 'react'
import { IconFilter, IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DataType } from '@/lib/constants'
import { describeFilter } from '@/lib/engine/operators'
import { applyView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'
import { FilterEditor, removeFilter } from './FilterEditor'

const ADD_FILTER = 'add-filter'

// After a filter goes, focus goes to the one that took its place, or back to adding one.
const focusAfterRemoving = (index: number) => {
	const chips = document.querySelectorAll<HTMLElement>('[data-filter-chip]')
	const next = chips[Math.min(index, chips.length - 1)] ?? document.getElementById(ADD_FILTER)
	next?.focus()
}

// In the header: opens an empty filter for the first visible column.
export function AddFilter() {
	const [open, setOpen] = useState(false)
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={<Button id={ADD_FILTER} variant="ghost" size="sm" aria-label="Add filter" />}
			>
				<IconFilter />
				<span className="max-sm:sr-only">Filter</span>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				{open && <FilterEditor filter={null} index={null} onDone={() => setOpen(false)} />}
			</PopoverContent>
		</Popover>
	)
}

function FilterChip({
	label,
	index,
	open,
	onOpenChange,
	onRemove,
}: {
	label: string
	index: number
	open: boolean
	onOpenChange: (open: boolean) => void
	onRemove: () => void
}) {
	const removed = useRef(false)
	return (
		<li className="flex h-6 items-center rounded-md border border-input bg-secondary text-xs">
			<Popover open={open} onOpenChange={onOpenChange}>
				<PopoverTrigger
					data-filter-chip
					aria-label={`Edit filter: ${label}`}
					className="h-full max-w-80 truncate rounded-l-md pr-1.5 pl-2 text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
				>
					{label}
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className="w-80"
					finalFocus={() => {
						if (!removed.current) return true
						removed.current = false
						return false
					}}
				>
					{open && (
						<FilterEditor
							filter={workspace.get().view.filters[index] ?? null}
							index={index}
							onDone={wasRemoved => {
								if (wasRemoved) {
									removed.current = true
									onRemove()
								}
								onOpenChange(false)
							}}
						/>
					)}
				</PopoverContent>
			</Popover>
			<button
				type="button"
				aria-label={`Remove filter: ${label}`}
				className="flex h-full items-center rounded-r-md border-l border-input px-1.5 text-subtle-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
				onClick={() => {
					void removeFilter(index)
					onRemove()
				}}
			>
				<IconX className="size-3" aria-hidden />
			</button>
		</li>
	)
}

// The filters in the view, each one to edit or remove, and all of them to clear.
export function FilterBar() {
	const filters = useWorkspace(state => state.view.filters)
	const dataset = useWorkspace(state => state.dataset)
	const queryError = useWorkspace(state => state.queryError)
	const [editing, setEditing] = useState<number | null>(null)
	// Where focus goes once a removed filter has left the page.
	const refocus = useRef<number | null>(null)

	useEffect(() => {
		if (refocus.current === null) return
		focusAfterRemoving(refocus.current)
		refocus.current = null
	}, [filters])

	const columns = new Map(dataset?.columns.map(column => [column.id, column]))
	const label = (index: number) => {
		const filter = filters[index]!
		const column = columns.get(filter.columnId)
		return describeFilter(
			filter,
			column?.title ?? filter.columnId,
			column?.type ?? ('text' satisfies DataType)
		)
	}

	if (filters.length === 0) return null

	return (
		<div
			role="region"
			aria-label="Filters"
			className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-1.5"
		>
			<ul className="flex flex-wrap items-center gap-1.5">
				{filters.map((filter, index) => (
					<FilterChip
						key={`${index}:${filter.columnId}:${filter.op}`}
						label={label(index)}
						index={index}
						open={editing === index}
						onOpenChange={open => setEditing(open ? index : null)}
						onRemove={() => {
							refocus.current = index
						}}
					/>
				))}
			</ul>
			<Button
				variant="ghost"
				size="xs"
				onClick={() => {
					refocus.current = 0
					void applyView({ ...workspace.get().view, filters: [] })
				}}
			>
				Clear filters
			</Button>
			{queryError?.code === 'invalid-filter' && (
				<p role="alert" className="text-sm text-destructive">
					{queryError.message}
				</p>
			)}
		</div>
	)
}
