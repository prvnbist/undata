import { useId, useMemo, useState } from 'react'
import { IconArrowLeft, IconCopy, IconLayoutList, IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { aggregateKey, aggregatesFor, aggregateTitle } from '@/lib/engine/group'
import { exportGroups } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { backToGroups, toggleAggregate, toggleGroupBy, ungroup } from './actions'

const inEnglish = new Intl.NumberFormat('en')

function Check({
	label,
	checked,
	onChange,
}: {
	label: string
	checked: boolean
	onChange: () => void
}) {
	const id = useId()
	return (
		<div className="flex items-center gap-2">
			<Checkbox id={id} checked={checked} onCheckedChange={onChange} />
			<label htmlFor={id} className="truncate text-sm">
				{label}
			</label>
		</div>
	)
}

// Which columns the rows are grouped by, and what is worked out for each group.
function GroupEditor() {
	const dataset = useWorkspace(state => state.dataset)
	const viewColumns = useWorkspace(state => state.view.columns)
	const grouping = useWorkspace(state => state.view.grouping)
	const columns = useMemo(() => {
		const byId = new Map(dataset?.columns.map(column => [column.id, column]))
		return viewColumns.flatMap(({ id }) => byId.get(id) ?? [])
	}, [dataset, viewColumns])
	const by = grouping?.by ?? []
	const chosen = new Set(grouping?.aggregates.map(aggregateKey))
	const measurable = columns.filter(column => aggregatesFor(column.type).length > 0)

	return (
		<div className="flex flex-col gap-4">
			<fieldset className="flex flex-col gap-2">
				<legend className="mb-2 text-sm font-medium">Group by</legend>
				{columns.map(column => (
					<Check
						key={column.id}
						label={column.title}
						checked={by.includes(column.id)}
						onChange={() => void toggleGroupBy(column.id)}
					/>
				))}
			</fieldset>
			{measurable.length > 0 && (
				<fieldset className="flex flex-col gap-3" disabled={by.length === 0}>
					<legend className="mb-1 text-sm font-medium">For each group</legend>
					{by.length === 0 && (
						<p className="text-xs text-muted-foreground">
							Choose a column to group by first.
						</p>
					)}
					{measurable.map(column => (
						<div key={column.id} className="grid grid-cols-2 gap-2">
							{aggregatesFor(column.type).map(fn => (
								<Check
									key={fn}
									label={aggregateTitle(fn, column.title)}
									checked={chosen.has(aggregateKey({ columnId: column.id, fn }))}
									onChange={() => void toggleAggregate(column.id, fn)}
								/>
							))}
						</div>
					))}
				</fieldset>
			)}
		</div>
	)
}

// In the header: opens the grouping.
export function GroupButton() {
	const grouped = useWorkspace(state => (state.view.grouping?.by.length ?? 0) > 0)
	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant={grouped ? 'secondary' : 'ghost'}
						size="sm"
						aria-label="Group rows"
					/>
				}
			>
				<IconLayoutList />
				<span className="max-sm:sr-only">Group</span>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				aria-label="Group rows"
				className="max-h-[70dvh] w-80 overflow-y-auto"
			>
				<GroupEditor />
			</PopoverContent>
		</Popover>
	)
}

const copySummary = async () => {
	const blob = await exportGroups({ format: 'csv', names: 'titles', escapeFormulas: false })
	if (blob) await navigator.clipboard.writeText(await blob.text())
}

// What the rows are grouped by, with ways out: back to the groups after opening one, or to the rows.
export function GroupBar() {
	const grouping = useWorkspace(state => state.view.grouping)
	const groups = useWorkspace(state => state.groups)
	const dataset = useWorkspace(state => state.dataset)
	const drilled = useWorkspace(state => state.drilledFrom !== null)
	const [copied, setCopied] = useState(false)

	if (drilled && !grouping) {
		return (
			<div
				role="region"
				aria-label="Grouping"
				className="flex shrink-0 items-center gap-2 border-b px-3 py-1"
			>
				<Button variant="ghost" size="xs" onClick={() => void backToGroups()}>
					<IconArrowLeft /> Back to groups
				</Button>
			</div>
		)
	}
	if (!grouping) return null

	const byId = new Map(dataset?.columns.map(column => [column.id, column]))
	const titleOf = (id: string) => byId.get(id)?.title ?? id
	const left = grouping.aggregates.flatMap((aggregate, i) => {
		const n = groups?.malformed[i] ?? 0
		return n > 0
			? [`${inEnglish.format(n)} not valid in ${titleOf(aggregate.columnId)}, left out`]
			: []
	})

	return (
		<div
			role="region"
			aria-label="Grouping"
			className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-1 text-xs"
		>
			<p className="truncate text-muted-foreground">
				Grouped by {grouping.by.map(titleOf).join(', ')}
			</p>
			{left.length > 0 && <p className="text-subtle-foreground">{left.join(' · ')}</p>}
			<div className="ml-auto flex items-center gap-1">
				<Button
					variant="ghost"
					size="xs"
					onClick={() =>
						void copySummary()
							.then(() => {
								setCopied(true)
								setTimeout(() => setCopied(false), 1500)
							})
							// Clipboard refused, or the groups changed under it: nothing was copied.
							.catch(() => {})
					}
				>
					<IconCopy /> {copied ? 'Copied' : 'Copy summary'}
				</Button>
				<Button variant="ghost" size="xs" onClick={() => void ungroup()}>
					<IconX /> Ungroup
				</Button>
			</div>
		</div>
	)
}
