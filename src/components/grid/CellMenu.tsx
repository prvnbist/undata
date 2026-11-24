import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCopy, IconFilter, IconFilterOff } from '@tabler/icons-react'

import { addFilter } from '@/components/filtering/FilterEditor'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import type { ColumnInfo } from '@/lib/engine/store'
import type { Filter } from '@/lib/engine/view'
import type { CurrentQuery } from '@/store/workspace'
import { cellText } from './useGridKeyboard'

export type CellMenuTarget = { row: number; column: ColumnInfo; x: number; y: number }

const SHOWN = 24
const FIRST_ITEM = '[role="menuitem"]:not([aria-disabled="true"])'
const quote = (text: string) =>
	`“${text.length > SHOWN ? `${text.slice(0, SHOWN).trimEnd()}…` : text}”`

type CellFilter = { label: string; icon: typeof IconFilter; filter: Filter }

// What a cell can be filtered by: its exact text, or its being empty.
export const cellFilters = (columnId: string, text: string): CellFilter[] => {
	if (text.trim() === '') {
		return [
			{ label: 'Only empty', icon: IconFilter, filter: { columnId, op: 'empty' } },
			{ label: 'Hide empty', icon: IconFilterOff, filter: { columnId, op: 'notEmpty' } },
		]
	}
	return [
		{
			label: `Is ${quote(text)}`,
			icon: IconFilter,
			filter: { columnId, op: 'anyOf', values: [text] },
		},
		{
			label: `Is not ${quote(text)}`,
			icon: IconFilterOff,
			filter: { columnId, op: 'noneOf', values: [text] },
		},
	]
}

// Opened on a cell by right-click, Shift+F10 or the Menu key. It reads the cell's text from the
// engine, so it opens once that is back.
export function CellMenu({
	target,
	query,
	onClose,
}: {
	target: CellMenuTarget | null
	query: CurrentQuery | null
	onClose: () => void
}) {
	const [text, setText] = useState<{ for: CellMenuTarget; text: string } | null>(null)

	useEffect(() => {
		if (!target || !query) return
		let live = true
		void cellText(query, target.row, target.column.id).then(found => {
			if (live) setText({ for: target, text: found })
		})
		return () => {
			live = false
		}
	}, [target, query])

	const ready = target !== null && text?.for === target
	const value = ready ? text.text : ''
	const popup = useRef<HTMLDivElement>(null)
	// The menu opens where it was asked for, with no button to hang from.
	const anchor = useMemo(
		() => ({ getBoundingClientRect: () => new DOMRect(target?.x ?? 0, target?.y ?? 0, 0, 0) }),
		[target]
	)

	return (
		<DropdownMenu
			open={ready}
			onOpenChange={open => !open && onClose()}
			// With no trigger, the popup itself takes focus. The first item does, as in any menu.
			onOpenChangeComplete={open => {
				if (open) popup.current?.querySelector<HTMLElement>(FIRST_ITEM)?.focus()
			}}
		>
			<DropdownMenuContent
				ref={popup}
				anchor={anchor}
				align="start"
				className="w-60"
				aria-label="Cell"
				finalFocus={() => document.querySelector<HTMLElement>('[role="grid"]')}
			>
				{ready && (
					<>
						<DropdownMenuLabel className="truncate text-xs text-muted-foreground">
							Filter {target.column.title}
						</DropdownMenuLabel>
						{cellFilters(target.column.id, value).map(({ label, icon: Icon, filter }) => (
							<DropdownMenuItem key={label} onClick={() => void addFilter(filter)}>
								<Icon />
								{label}
							</DropdownMenuItem>
						))}
						<DropdownMenuItem onClick={() => void navigator.clipboard?.writeText(value)}>
							<IconCopy />
							Copy value
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
