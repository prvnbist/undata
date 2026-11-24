import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { IconSearch } from '@tabler/icons-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { inspectColumn } from '@/components/inspector/Inspector'
import { useReturnFocus } from '@/components/ui/useReturnFocus'
import { SAMPLE_NAME, makeSample } from '@/lib/import/sample'
import { setHidden, setSort } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { nextNonce, useWorkspace, workspace } from '@/store/workspace'
import { cn } from 'cn'
import { buildCommands, matchCommands } from './commands'
import type { Command, CommandActions } from './commands'
import { useOpenDataset } from './useOpenDataset'

const isMac = () =>
	typeof navigator !== 'undefined' && /Mac|iP(?:hone|ad|od)/.test(navigator.platform)

// Ctrl/⌘+K: everything there is a command for, found by typing. A searchable list in the same
// pattern as the combobox, with the arrow keys moving through it.
export function CommandPalette() {
	const id = useId()
	const openDataset = useOpenDataset()
	const file = useRef<HTMLInputElement>(null)
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [highlight, setHighlight] = useState(0)
	const chosen = useRef<Command | null>(null)
	const returnFocus = useReturnFocus(open)

	const ready = useWorkspace(state => state.phase.kind === 'ready')
	const dataset = useWorkspace(state => state.dataset)
	const viewColumns = useWorkspace(state => state.view.columns)

	useEffect(() => {
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			const mod = isMac() ? event.metaKey : event.ctrlKey
			if (!mod || event.key.toLowerCase() !== 'k' || event.altKey || event.shiftKey) return
			event.preventDefault()
			setOpen(current => !current)
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const commands = useMemo(() => {
		const actions: CommandActions = {
			open: () => file.current?.click(),
			sample: () => openDataset({ blob: new Blob([makeSample()]), name: SAMPLE_NAME }),
			exportView: () => workspace.set({ exporting: true }),
			goToColumn: columnId => {
				const { view } = workspace.get()
				if (view.columns.find(column => column.id === columnId)?.hidden) {
					void applyView(setHidden(view, columnId, false))
				}
				workspace.set({ goTo: { columnId, focus: true, nonce: nextNonce() } })
			},
			sort: (columnId, desc) => {
				const { view } = workspace.get()
				void applyView({ ...view, sort: setSort(view.sort, columnId, desc, false) })
			},
			inspectColumn,
			setHidden: (columnId, hidden) =>
				void applyView(setHidden(workspace.get().view, columnId, hidden)),
		}
		const byId = new Map(dataset?.columns.map(column => [column.id, column]))
		const columns =
			ready && dataset
				? viewColumns.flatMap(({ id: columnId, hidden }) => {
						const info = byId.get(columnId)
						return info ? [{ id: columnId, title: info.title, hidden }] : []
					})
				: null
		return buildCommands(actions, columns)
	}, [openDataset, ready, dataset, viewColumns])

	const matches = useMemo(() => matchCommands(commands, query), [commands, query])
	const current = matches[Math.min(highlight, matches.length - 1)]

	const change = (next: boolean) => {
		setOpen(next)
		if (next) return
		setQuery('')
		setHighlight(0)
	}

	const choose = (command: Command | undefined) => {
		if (!command) return
		chosen.current = command
		change(false)
	}

	const onKeyDown = (event: KeyboardEvent) => {
		const step = { ArrowDown: 1, ArrowUp: -1 }[event.key]
		if (step) {
			event.preventDefault()
			setHighlight(
				at => (Math.min(at, matches.length - 1) + step + matches.length) % matches.length
			)
		} else if (event.key === 'Enter') {
			event.preventDefault()
			choose(current)
		}
	}

	const optionId = (command: Command) => `${id}-${command.id}`

	return (
		<>
			<Dialog open={open} onOpenChange={change}>
				<DialogContent
					className="top-24 translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
					showCloseButton={false}
					onCloseAutoFocus={event => {
						const command = chosen.current
						chosen.current = null
						// Focus goes back where it was, unless the command puts it somewhere itself.
						returnFocus(event, !command?.movesFocus)
						if (command) setTimeout(command.run)
					}}
				>
					<DialogTitle className="sr-only">Commands</DialogTitle>
					<DialogDescription className="sr-only">
						Type to find a command, move with the arrow keys and press Enter to run it.
					</DialogDescription>
					<div className="flex items-center gap-2 border-b px-3">
						<IconSearch className="size-4 text-muted-foreground" aria-hidden />
						<input
							role="combobox"
							aria-label="Command"
							aria-expanded
							aria-controls={`${id}-list`}
							aria-autocomplete="list"
							aria-activedescendant={current ? optionId(current) : undefined}
							autoFocus
							value={query}
							placeholder="Type a command or a column"
							onChange={event => {
								setQuery(event.target.value)
								setHighlight(0)
							}}
							onKeyDown={onKeyDown}
							className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						/>
					</div>
					<div
						id={`${id}-list`}
						role="listbox"
						aria-label="Commands"
						className="max-h-80 overflow-y-auto p-1"
					>
						{matches.length === 0 && (
							<p className="px-3 py-6 text-center text-sm text-muted-foreground">
								No command matches
							</p>
						)}
						{matches.map(command => (
							<div
								key={command.id}
								id={optionId(command)}
								role="option"
								aria-selected={command === current}
								ref={element => {
									if (command === current) element?.scrollIntoView({ block: 'nearest' })
								}}
								onPointerMove={() => setHighlight(matches.indexOf(command))}
								onClick={() => choose(command)}
								className={cn(
									'flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm',
									command === current && 'bg-accent'
								)}
							>
								<span className="truncate">{command.label}</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{command.group}
								</span>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>
			<input
				ref={file}
				type="file"
				aria-label="Data file from the command palette"
				className="sr-only"
				tabIndex={-1}
				onChange={event => {
					const picked = event.target.files?.[0]
					event.target.value = ''
					if (picked) openDataset({ blob: picked, name: picked.name })
				}}
			/>
		</>
	)
}
