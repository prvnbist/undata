import { useEffect, useMemo, useRef, useState } from 'react'
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'

import { aggregateKey, aggregateTitle } from '@/lib/engine/group'
import type { GroupRow } from '@/lib/engine/group'
import { engine } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { cycleGroupSort, openGroup, takeReturning } from './actions'

const ROW_HEIGHT = 32
const BLOCK = 100
// Rows drawn beyond what is on screen, each way.
const OVERSCAN = 10

type Loaded = { groupId: number; blocks: Map<number, GroupRow[]> }

const label = (row: GroupRow) =>
	row.keys.map((key, i) => (row.empty[i] ? '(empty)' : key)).join(', ')

// The groups of the view, one row each, read from the engine a block at a time.
export function SummaryGrid() {
	const groups = useWorkspace(state => state.groups)
	const grouping = useWorkspace(state => state.view.grouping)
	const dataset = useWorkspace(state => state.dataset)
	const scroller = useRef<HTMLDivElement>(null)
	const [range, setRange] = useState({ start: 0, end: 60 })
	// The rows of the newest groups that have come, or of the last ones until they do.
	const [loaded, setLoaded] = useState<Loaded | null>(null)
	const pending = useRef(new Set<string>())
	const [returning] = useState(takeReturning)
	const focused = useRef(false)

	const columns = useMemo(() => {
		const byId = new Map(dataset?.columns.map(column => [column.id, column]))
		const titleOf = (id: string) => byId.get(id)?.title ?? id
		return [
			...(grouping?.by ?? []).map(id => ({ key: id, name: titleOf(id), numeric: false })),
			{ key: 'count', name: 'Rows', numeric: true },
			...(grouping?.aggregates ?? []).map(aggregate => ({
				key: aggregateKey(aggregate),
				name: aggregateTitle(aggregate.fn, titleOf(aggregate.columnId)),
				numeric: aggregate.fn === 'sum' || aggregate.fn === 'avg',
			})),
		]
	}, [dataset, grouping])

	const count = groups?.groupCount ?? 0
	const groupId = groups?.groupId ?? null

	useEffect(() => {
		const element = scroller.current
		if (!element) return
		const measure = () => {
			const first = Math.floor(element.scrollTop / ROW_HEIGHT)
			const shown = Math.ceil(element.clientHeight / ROW_HEIGHT)
			setRange({ start: Math.max(0, first - OVERSCAN), end: first + shown + OVERSCAN })
		}
		if (returning !== null) element.scrollTop = returning * ROW_HEIGHT - element.clientHeight / 2
		measure()
		element.addEventListener('scroll', measure, { passive: true })
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => {
			element.removeEventListener('scroll', measure)
			observer.disconnect()
		}
	}, [returning])

	useEffect(() => {
		const client = engine()
		if (groupId === null || !client) return
		const first = Math.floor(range.start / BLOCK)
		const last = Math.floor(Math.max(range.start, Math.min(range.end, count) - 1) / BLOCK)
		for (let block = first; block <= last; block++) {
			const id = `${groupId}:${block}`
			if (pending.current.has(id)) continue
			if (loaded?.groupId === groupId && loaded.blocks.has(block)) continue
			pending.current.add(id)
			client
				.groupRows(groupId, block * BLOCK, (block + 1) * BLOCK)
				.then(rows =>
					setLoaded(current => {
						const blocks =
							current?.groupId === groupId
								? new Map(current.blocks)
								: new Map<number, GroupRow[]>()
						blocks.set(block, rows)
						return { groupId, blocks }
					})
				)
				// Newer groups took over, and they load their own rows.
				.catch(() => {})
				.finally(() => pending.current.delete(id))
		}
	}, [groupId, count, range, loaded])

	const rows: GroupRow[] = []
	if (loaded) {
		const end = Math.min(range.end, loaded.groupId === groupId ? count : Infinity)
		for (let block = Math.floor(range.start / BLOCK); block * BLOCK < end; block++) {
			for (const row of loaded.blocks.get(block) ?? []) {
				if (row.index >= range.start && row.index < end) rows.push(row)
			}
		}
	}

	useEffect(() => {
		if (focused.current || returning === null) return
		const button = scroller.current?.querySelector<HTMLElement>(
			`tr[data-index="${returning}"] [data-open-group]`
		)
		if (!button) return
		focused.current = true
		button.focus()
	})

	const sort = grouping?.sort.length === 1 ? grouping.sort[0] : undefined
	const top = (rows[0]?.index ?? 0) * ROW_HEIGHT
	const bottom = Math.max(0, (count - (rows.at(-1)?.index ?? -1) - 1) * ROW_HEIGHT)

	return (
		<div ref={scroller} className="min-h-0 flex-1 overflow-auto">
			<table aria-label="Groups" aria-rowcount={count + 1} className="w-max min-w-full text-sm">
				<thead className="sticky top-0 z-10 bg-background">
					<tr aria-rowindex={1} className="border-b">
						{columns.map(column => {
							const direction =
								sort?.key === column.key
									? sort.desc
										? 'descending'
										: 'ascending'
									: undefined
							return (
								<th
									scope="col"
									key={column.key}
									aria-label={column.name}
									aria-sort={direction ?? 'none'}
									className="p-0 text-left font-medium"
								>
									<button
										type="button"
										aria-label={`Sort by ${column.name}`}
										onClick={() => void cycleGroupSort(column.key)}
										className={`flex h-9 w-full items-center gap-1 px-3 whitespace-nowrap hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${column.numeric || column.key === 'count' ? 'justify-end' : ''}`}
									>
										{column.name}
										{direction === 'ascending' && (
											<IconArrowUp className="size-3.5" aria-hidden />
										)}
										{direction === 'descending' && (
											<IconArrowDown className="size-3.5" aria-hidden />
										)}
									</button>
								</th>
							)
						})}
					</tr>
				</thead>
				<tbody>
					{top > 0 && <tr aria-hidden style={{ height: top }} />}
					{rows.map(row => (
						<tr
							key={row.index}
							data-index={row.index}
							aria-rowindex={row.index + 2}
							className="border-b border-border/60 hover:bg-accent/40"
							style={{ height: ROW_HEIGHT }}
						>
							{row.keys.map((key, i) => (
								<td key={i} className="max-w-80 truncate px-3">
									{i === 0 ? (
										<button
											type="button"
											data-open-group
											aria-label={`Open group: ${label(row)}`}
											onClick={() => void openGroup(row)}
											className="max-w-full truncate rounded-xs text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
										>
											{row.empty[0] ? (
												<em className="text-foreground/70">(empty)</em>
											) : (
												key
											)}
										</button>
									) : row.empty[i] ? (
										<em className="text-foreground/70">(empty)</em>
									) : (
										key
									)}
								</td>
							))}
							<td className="px-3 text-right font-mono tabular-nums">{row.count}</td>
							{row.values.map((value, i) => (
								<td
									key={i}
									className={`px-3 font-mono tabular-nums ${columns[row.keys.length + 1 + i]?.numeric ? 'text-right' : ''}`}
								>
									{value ?? ''}
								</td>
							))}
						</tr>
					))}
					{bottom > 0 && <tr aria-hidden style={{ height: bottom }} />}
				</tbody>
			</table>
		</div>
	)
}
