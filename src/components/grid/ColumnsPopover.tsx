import { useMemo, useState } from 'react'
import { IconColumns } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { setAllHidden, setHidden } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'

const setHiddenFor = (ids: string[], hidden: boolean) =>
	void applyView(setAllHidden(workspace.get().view, new Set(ids), hidden))

// Every column in display order, to find one and show or hide it, or many at once.
export function ColumnsPopover() {
	const dataset = useWorkspace(state => state.dataset)
	const view = useWorkspace(state => state.view.columns)
	const [query, setQuery] = useState('')

	const columns = useMemo(() => {
		const byId = new Map((dataset?.columns ?? []).map(column => [column.id, column]))
		return view.flatMap(({ id, hidden }) => {
			const info = byId.get(id)
			return info ? [{ id, title: info.title, header: info.header, hidden }] : []
		})
	}, [dataset, view])

	const needle = query.trim().toLowerCase()
	const matches = needle
		? columns.filter(
				column =>
					column.title.toLowerCase().includes(needle) ||
					column.header.toLowerCase().includes(needle)
			)
		: columns
	const hiddenCount = columns.filter(column => column.hidden).length
	const ids = matches.map(column => column.id)

	return (
		<Popover onOpenChange={open => !open && setQuery('')}>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm">
					<IconColumns />
					<span className="max-sm:sr-only">
						Columns
						{hiddenCount > 0 && (
							<span className="text-xs text-muted-foreground"> ({hiddenCount} hidden)</span>
						)}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="flex w-72 flex-col gap-2 p-2">
				<Input
					aria-label="Find a column"
					placeholder="Find a column"
					value={query}
					onChange={event => setQuery(event.target.value)}
				/>
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="xs"
						disabled={matches.length === 0}
						onClick={() => setHiddenFor(ids, false)}
					>
						{needle ? 'Show matching' : 'Show all'}
					</Button>
					<Button
						variant="ghost"
						size="xs"
						disabled={matches.length === 0}
						onClick={() => setHiddenFor(ids, true)}
					>
						{needle ? 'Hide matching' : 'Hide all'}
					</Button>
				</div>
				<ul aria-label="Columns" className="max-h-72 overflow-y-auto">
					{matches.map(column => (
						<li key={column.id}>
							<label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
								<Checkbox
									checked={!column.hidden}
									onCheckedChange={checked =>
										void applyView(
											setHidden(workspace.get().view, column.id, checked !== true)
										)
									}
								/>
								<span className="truncate">{column.title}</span>
							</label>
						</li>
					))}
					{matches.length === 0 && (
						<li className="px-2 py-1.5 text-sm text-muted-foreground">No column matches</li>
					)}
				</ul>
			</PopoverContent>
		</Popover>
	)
}
