import { useMemo, useRef, useState } from 'react'
import { IconBookmark, IconDeviceFloppy, IconForms, IconPlus, IconTrash } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/store/workspace'
import { deleteView, isChanged, showAllRows, switchView, updateView } from './actions'
import { SaveViewDialog } from './SaveViewDialog'
import type { Naming } from './SaveViewDialog'

const ALL = ''

// Which saved view is on screen, the others to switch to, and saving the one there is.
export function ViewSwitcher() {
	const views = useWorkspace(state => state.views)
	const activeView = useWorkspace(state => state.activeView)
	const view = useWorkspace(state => state.view)
	const dataset = useWorkspace(state => state.dataset)
	const [naming, setNaming] = useState<Naming | null>(null)
	const trigger = useRef<HTMLButtonElement>(null)
	// Set while the naming dialog opens, so the closing menu leaves focus in it.
	const handoff = useRef(false)
	const name = (next: Naming) => {
		handoff.current = true
		setNaming(next)
	}

	const active = views.find(saved => saved.id === activeView) ?? null
	const changed = useMemo(
		() =>
			active !== null &&
			isChanged(active, view, dataset?.columns.map(column => column.id) ?? []),
		[active, view, dataset]
	)
	const label = active?.name ?? 'All rows'

	return (
		<>
			<DropdownMenu onOpenChangeComplete={open => !open && (handoff.current = false)}>
				<DropdownMenuTrigger
					render={
						<Button
							ref={trigger}
							variant="ghost"
							size="sm"
							aria-label={`View: ${label}${changed ? ', changed' : ''}`}
							className="max-w-44 min-w-0 shrink"
						/>
					}
				>
					<IconBookmark />
					<span className="truncate max-sm:sr-only">{label}</span>
					{changed && (
						<span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-64" finalFocus={() => !handoff.current}>
					<DropdownMenuLabel>Views</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={activeView ?? ALL}
						onValueChange={id => void (id === ALL ? showAllRows() : switchView(id))}
					>
						<DropdownMenuRadioItem value={ALL}>All rows</DropdownMenuRadioItem>
						{views.map(saved => (
							<DropdownMenuRadioItem key={saved.id} value={saved.id}>
								<span className="truncate">{saved.name}</span>
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
					<DropdownMenuSeparator />
					{active && (
						<>
							<DropdownMenuItem disabled={!changed} onClick={() => void updateView()}>
								<IconDeviceFloppy />
								Update “{active.name}”
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => name({ kind: 'rename', id: active.id, name: active.name })}
							>
								<IconForms />
								Rename “{active.name}”…
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => void deleteView()}>
								<IconTrash />
								Delete “{active.name}”
							</DropdownMenuItem>
						</>
					)}
					<DropdownMenuItem onClick={() => name({ kind: 'save' })}>
						<IconPlus />
						Save as a new view…
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<SaveViewDialog naming={naming} onClose={() => setNaming(null)} returnTo={trigger} />
		</>
	)
}
