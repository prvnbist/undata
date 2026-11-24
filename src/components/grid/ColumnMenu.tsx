import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { FormEvent } from 'react'
import {
	IconArrowBarToLeft,
	IconArrowBarToRight,
	IconArrowDown,
	IconArrowUp,
	IconArrowsHorizontal,
	IconChartBar,
	IconChevronDown,
	IconEyeOff,
	IconFilter,
	IconForms,
	IconLayoutList,
	IconPlus,
	IconX,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { addFilter } from '@/components/filtering/FilterEditor'
import { toggleGroupBy } from '@/components/grouping/actions'
import { inspectColumn } from '@/components/inspector/Inspector'
import { Input } from '@/components/ui/input'
import { DATA_TYPES } from '@/lib/constants'
import { TYPE_ICONS } from './typeIcons'
import type { DataType } from '@/lib/constants'
import type { ColumnInfo } from '@/lib/engine/store'
import { moveColumnBy, setHidden, setSize, setSort } from '@/lib/engine/view'
import { applyColumns, applyView, arrangeView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'

const inEnglish = new Intl.NumberFormat('en')

// Each with the whole column's count of the cells it is about.
const FILTERS = [
	{ op: 'empty', label: 'Only empty', count: 'empty' },
	{ op: 'notEmpty', label: 'Hide empty', count: 'empty' },
	{ op: 'malformed', label: 'Only malformed', count: 'malformed' },
	{ op: 'notMalformed', label: 'Hide malformed', count: 'malformed' },
] as const

// Every column's setup, with this one changed.
const changeColumn = (id: string, change: { title?: string; type?: DataType }) => {
	const { dataset } = workspace.get()
	if (!dataset) return
	void applyColumns(
		dataset.columns.map(column => ({
			id: column.id,
			title: column.id === id ? (change.title ?? column.title) : column.title,
			type: column.id === id ? (change.type ?? column.type) : column.type,
		}))
	)
}

const sortBy = (id: string, desc: boolean | null, add: boolean) => {
	const { view } = workspace.get()
	void applyView({ ...view, sort: setSort(view.sort, id, desc, add) })
}

const hide = (id: string) => void applyView(setHidden(workspace.get().view, id, true))
const move = (id: string, step: -1 | 1) =>
	void arrangeView(moveColumnBy(workspace.get().view, id, step))
const fit = (id: string) => void arrangeView(setSize(workspace.get().view, id, null))

function RenameDialog({
	column,
	open,
	onOpenChange,
	returnTo,
}: {
	column: ColumnInfo
	open: boolean
	onOpenChange: (open: boolean) => void
	// Opened from a menu item that is gone by then, so focus goes back to the menu's button.
	returnTo: RefObject<HTMLButtonElement | null>
}) {
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const field = new FormData(event.currentTarget).get('title')
		const title = typeof field === 'string' ? field.trim() : ''
		// An empty title goes back to the one in the file.
		changeColumn(column.id, { title: title || column.header || column.title })
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-sm"
				onCloseAutoFocus={event => {
					event.preventDefault()
					returnTo.current?.focus()
				}}
			>
				<DialogHeader>
					<DialogTitle>Rename column</DialogTitle>
					<DialogDescription>
						Only the title shown here changes. The file keeps its header.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="flex flex-col gap-3">
					<Input
						name="title"
						aria-label="Column title"
						defaultValue={column.title}
						autoFocus
						onFocus={event => event.currentTarget.select()}
					/>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit">Rename</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	)
}

// Everything that can be done to one column, where the column is.
export function ColumnMenu({
	column,
	sorted,
	sortCount,
}: {
	column: ColumnInfo
	// This column's direction, if it is sorted.
	sorted: 'asc' | 'desc' | null
	sortCount: number
}) {
	const [renaming, setRenaming] = useState(false)
	const trigger = useRef<HTMLButtonElement>(null)
	// Opened once the menu is closed, so focus goes to the details and not back to the menu button.
	const details = useRef(false)
	const others = sortCount - (sorted ? 1 : 0)
	const grouping = useWorkspace(state => state.view.grouping)
	const groupedBy = grouping?.by.includes(column.id) ?? false

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						ref={trigger}
						variant="ghost"
						size="icon-xs"
						aria-label={`Column menu for ${column.title}`}
						className="shrink-0 transition-opacity [@media(hover:hover)]:not-aria-expanded:not-group-hover/header:not-group-focus-within/header:opacity-0"
					>
						<IconChevronDown />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className="w-56"
					onCloseAutoFocus={event => {
						if (!details.current) return
						details.current = false
						event.preventDefault()
						inspectColumn(column.id)
					}}
				>
					<DropdownMenuItem onSelect={() => sortBy(column.id, false, false)}>
						<IconArrowUp /> Sort ascending
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => sortBy(column.id, true, false)}>
						<IconArrowDown /> Sort descending
					</DropdownMenuItem>
					{others > 0 && (
						<>
							<DropdownMenuItem onSelect={() => sortBy(column.id, false, true)}>
								<IconPlus /> Add to sort, ascending
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => sortBy(column.id, true, true)}>
								<IconPlus /> Add to sort, descending
							</DropdownMenuItem>
						</>
					)}
					{sorted && (
						<DropdownMenuItem onSelect={() => sortBy(column.id, null, false)}>
							<IconX /> Remove from sort
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<IconFilter /> Filter
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="w-56">
							{FILTERS.filter(
								({ op }) => column.type !== 'text' || !op.endsWith('alformed')
							).map(({ op, label, count }) => {
								const n = column[count]
								return (
									<DropdownMenuItem
										key={op}
										disabled={n === 0}
										onSelect={() => void addFilter({ columnId: column.id, op })}
									>
										{label}
										<span className="ml-auto font-mono text-xs text-muted-foreground">
											{inEnglish.format(n)}
										</span>
									</DropdownMenuItem>
								)
							})}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem onSelect={() => void toggleGroupBy(column.id)}>
						<IconLayoutList />{' '}
						{groupedBy ? 'Stop grouping by this column' : 'Group by this column'}
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>Type</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="w-52">
							<DropdownMenuRadioGroup
								value={column.type}
								onValueChange={type => changeColumn(column.id, { type: type as DataType })}
							>
								{DATA_TYPES.map(({ value, label }) => (
									<DropdownMenuRadioItem key={value} value={value}>
										{(() => {
											const Icon = TYPE_ICONS[value]
											return <Icon aria-hidden />
										})()}
										{label}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem onSelect={() => (details.current = true)}>
						<IconChartBar /> Details
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setRenaming(true)}>
						<IconForms /> Rename…
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={() => move(column.id, -1)}>
						<IconArrowBarToLeft /> Move left
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => move(column.id, 1)}>
						<IconArrowBarToRight /> Move right
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => fit(column.id)}>
						<IconArrowsHorizontal /> Fit width
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => hide(column.id)}>
						<IconEyeOff /> Hide
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameDialog
				column={column}
				open={renaming}
				onOpenChange={setRenaming}
				returnTo={trigger}
			/>
		</>
	)
}
