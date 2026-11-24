import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
	IconAlertTriangle,
	IconBraces,
	IconChevronDown,
	IconChevronUp,
	IconCopy,
} from '@tabler/icons-react'

import { JsonTree } from '@/components/grid/JsonTree'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DATA_TYPES } from '@/lib/constants'
import type { DataType } from '@/lib/constants'
import { rowJson } from '@/lib/engine/export'
import type { ColumnInfo, RowWindow } from '@/lib/engine/store'
import { CELL_KINDS } from '@/lib/import/types'
import type { CellKind } from '@/lib/import/types'
import { parseJsonTree } from '@/lib/json/tree'
import { parse } from '@/lib/types/parse'
import { engine } from '@/store/session'
import { nextNonce, useWorkspace, workspace } from '@/store/workspace'
import { InspectorFrame } from './InspectorFrame'

const LABELS = new Map<string, string>(DATA_TYPES.map(({ value, label }) => [value, label]))
const inEnglish = new Intl.NumberFormat('en')

const copy = (text: string) => void navigator.clipboard?.writeText(text)

// Another row of the view, which the grid moves to as well.
const moveTo = (row: number) =>
	workspace.set({
		inspector: { kind: 'row', row },
		goTo: { row, focus: false, nonce: nextNonce() },
	})

// The whole value, wrapped. JSON as a tree, and a value that does not fit its type said to be wrong.
function FieldValue({ type, text, kind }: { type: DataType; text: string; kind: CellKind | null }) {
	if (kind === 'missing') return <em className="text-muted-foreground">missing</em>
	if (kind === 'null') return <span className="font-mono text-xs text-muted-foreground">null</span>
	if (text.trim() === '') return <em className="text-muted-foreground">empty</em>

	if (type === 'json' || kind === 'json') {
		const node = parseJsonTree(text)
		if (node) return <JsonTree node={node} className="max-h-72 overflow-auto" />
	}
	if (type !== 'text' && !parse(type, text).ok) {
		const label = `Not a valid ${LABELS.get(type)?.toLowerCase()}`
		return (
			<span className="flex items-start gap-1.5 text-amber-300">
				<IconAlertTriangle role="img" aria-label={label} className="mt-0.5 size-3.5 shrink-0" />
				<span className="break-words whitespace-pre-wrap">{text}</span>
			</span>
		)
	}
	return <span className="break-words whitespace-pre-wrap">{text}</span>
}

type Field = { column: ColumnInfo; hidden: boolean; text: string; kind: CellKind | null }

// One row of the view with every column, hidden ones too.
export function RowPanel({ row }: { row: number }) {
	const dataset = useWorkspace(state => state.dataset)
	const query = useWorkspace(state => state.query)
	const viewColumns = useWorkspace(state => state.view.columns)
	const rowCount = query?.rowCount ?? 0
	const [find, setFind] = useState('')
	const [loaded, setLoaded] = useState<{ key: string; record: RowWindow | null } | null>(null)

	const columns = useMemo(() => {
		const byId = new Map((dataset?.columns ?? []).map(column => [column.id, column]))
		return viewColumns.flatMap(({ id, hidden }) => {
			const column = byId.get(id)
			return column ? [{ column, hidden }] : []
		})
	}, [dataset, viewColumns])

	const key = `${query?.id}:${row}:${columns.map(({ column }) => column.id).join(',')}`
	useEffect(() => {
		const client = engine()
		if (!client || !query) return
		let live = true
		const ids = columns.map(({ column }) => column.id)
		void client.rows(query.id, row, row + 1, ids).then(
			([found]) => live && setLoaded({ key, record: found ?? null }),
			() => {}
		)
		return () => {
			live = false
		}
	}, [key, query, row, columns])

	const record = loaded?.key === key ? loaded.record : null
	const fields: Field[] = record
		? columns.map(({ column, hidden }, i) => {
				const code = record.kinds?.[i]
				return {
					column,
					hidden,
					text: record.text[i] ?? '',
					kind: code === undefined ? null : (CELL_KINDS[code] ?? null),
				}
			})
		: []

	const needle = find.trim().toLowerCase()
	const shown = needle
		? fields.filter(
				({ column, text }) =>
					column.title.toLowerCase().includes(needle) ||
					column.header.toLowerCase().includes(needle) ||
					text.toLowerCase().includes(needle)
			)
		: fields

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
		event.preventDefault()
		const next = row + (event.key === 'ArrowUp' ? -1 : 1)
		if (next >= 0 && next < rowCount) moveTo(next)
	}

	const asJson = () =>
		record
			? rowJson(
					columns.map(({ column }) => column),
					record.text,
					record.kinds
				)
			: '{}'

	return (
		<InspectorFrame
			label="Row inspector"
			title={record ? `Row ${inEnglish.format(record.row + 1)}` : 'Row'}
			onKeyDown={onKeyDown}
			actions={
				<>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Previous row"
						title="Previous row (Alt+↑)"
						disabled={row <= 0}
						onClick={() => moveTo(row - 1)}
					>
						<IconChevronUp />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Next row"
						title="Next row (Alt+↓)"
						disabled={row >= rowCount - 1}
						onClick={() => moveTo(row + 1)}
					>
						<IconChevronDown />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Copy row as JSON"
						title="Copy row as JSON"
						disabled={!record}
						onClick={() => copy(asJson())}
					>
						<IconBraces />
					</Button>
				</>
			}
		>
			<div className="flex shrink-0 flex-col gap-1 border-b px-4 py-2">
				<p className="text-xs text-foreground/70" aria-live="polite">
					{rowCount > 0
						? `${inEnglish.format(row + 1)} of ${inEnglish.format(rowCount)} in this view`
						: 'No rows'}
				</p>
				<Input
					aria-label="Find a field"
					placeholder="Find a field"
					value={find}
					onChange={event => setFind(event.target.value)}
					onKeyDown={event => {
						if (event.key === 'Escape' && find !== '') {
							event.preventDefault()
							setFind('')
						}
					}}
					className="h-8"
				/>
			</div>
			<dl className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-sm">
				{shown.map(({ column, hidden, text, kind }) => (
					<div
						key={column.id}
						className="group flex flex-col gap-1 border-b py-2 last:border-b-0"
					>
						<dt className="flex items-center gap-2 text-xs text-foreground/70">
							<span className="min-w-0 flex-1 truncate">
								{column.title}
								<span className="sr-only">, </span>
								<span className="ml-1.5 text-muted-foreground">
									{LABELS.get(column.type)}
								</span>
								{hidden && <span className="ml-1.5 text-muted-foreground">· hidden</span>}
							</span>
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={`Copy ${column.title}`}
								title="Copy value"
								onClick={() => copy(text)}
							>
								<IconCopy />
							</Button>
						</dt>
						<dd>
							<FieldValue type={column.type} text={text} kind={kind} />
						</dd>
					</div>
				))}
				{record && shown.length === 0 && (
					<p className="py-4 text-center text-foreground/70">No field matches</p>
				)}
			</dl>
		</InspectorFrame>
	)
}
