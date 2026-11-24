import { useId, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { DataType } from '@/lib/constants'
import { checkFilter } from '@/lib/engine/filter'
import { draftFor, operandOf, operatorLabel, operatorsFor, toFilter } from '@/lib/engine/operators'
import type { FilterDraft } from '@/lib/engine/operators'
import type { Filter } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'
import { mergeFilter } from './mergeFilter'

const HINTS: Partial<Record<DataType, string>> = {
	number: 'A number, such as 10 or -2.5',
	date: 'YYYY-MM-DD',
	timestamp: 'YYYY-MM-DDTHH:MM',
	timestamptz: 'YYYY-MM-DDTHH:MM+00:00',
	time: 'HH:MM',
	timetz: 'HH:MM+00:00',
	boolean: 'true or false',
}

// Puts a filter in the view: a new one at the end, or in place of the one at `index`.
export const commitFilter = (filter: Filter, index: number | null) => {
	const { view } = workspace.get()
	const filters =
		index === null
			? [...view.filters, filter]
			: view.filters.map((existing, i) => (i === index ? filter : existing))
	return applyView({ ...view, filters })
}

// A filter from a click: merged with what the column already has, so nothing is doubled.
export const addFilter = (filter: Filter) => {
	const { view } = workspace.get()
	const filters = mergeFilter(view.filters, filter)
	return filters === view.filters ? Promise.resolve() : applyView({ ...view, filters })
}

export const removeFilter = (index: number) => {
	const { view } = workspace.get()
	return applyView({ ...view, filters: view.filters.filter((_, i) => i !== index) })
}

// Values for "is any of", added one at a time. Enter adds what is typed, Backspace in an empty field
// takes the last one off.
function ValueList({
	values,
	pending,
	onPending,
	onChange,
	invalid,
	describedBy,
}: {
	values: string[]
	pending: string
	onPending: (text: string) => void
	onChange: (values: string[]) => void
	invalid: boolean
	describedBy: string | undefined
}) {
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter' && pending !== '') {
			event.preventDefault()
			if (!values.includes(pending)) onChange([...values, pending])
			onPending('')
		} else if (event.key === 'Backspace' && pending === '' && values.length > 0) {
			onChange(values.slice(0, -1))
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{values.length > 0 && (
				<ul aria-label="Values" className="flex flex-wrap gap-1">
					{values.map(value => (
						<li
							key={value}
							className="flex items-center gap-1 rounded-sm bg-secondary py-0.5 pr-0.5 pl-2 text-xs"
						>
							{value === '' ? <em>empty</em> : value}
							<button
								type="button"
								aria-label={`Remove ${value}`}
								className="rounded-xs p-0.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
								onClick={() => onChange(values.filter(other => other !== value))}
							>
								<IconX className="size-3" aria-hidden />
							</button>
						</li>
					))}
				</ul>
			)}
			<Input
				aria-label="Add a value"
				placeholder="Type a value, then Enter"
				value={pending}
				onChange={event => onPending(event.target.value)}
				onKeyDown={onKeyDown}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
			/>
		</div>
	)
}

// A form for one filter. Nothing reaches the view until it is valid for the column's type.
export function FilterEditor({
	filter,
	index,
	onDone,
}: {
	filter: Filter | null
	index: number | null
	onDone: (removed: boolean) => void
}) {
	const id = useId()
	const dataset = useWorkspace(state => state.dataset)
	const viewColumns = useWorkspace(state => state.view.columns)
	const columns = useMemo(() => {
		const byId = new Map((dataset?.columns ?? []).map(column => [column.id, column]))
		return viewColumns.flatMap(({ id: columnId, hidden }) => {
			const info = byId.get(columnId)
			return info ? [{ ...info, hidden }] : []
		})
	}, [dataset, viewColumns])

	const typeOf = (columnId: string): DataType =>
		columns.find(column => column.id === columnId)?.type ?? 'text'

	const [draft, setDraft] = useState<FilterDraft>(() => {
		const columnId =
			filter?.columnId ?? columns.find(column => !column.hidden)?.id ?? columns[0]?.id ?? ''
		return draftFor(columnId, typeOf(columnId), filter ?? undefined)
	})
	const [pending, setPending] = useState('')
	const [error, setError] = useState<string | null>(null)
	const form = useRef<HTMLFormElement>(null)

	const type = typeOf(draft.columnId)
	const ops = operatorsFor(type)
	const operand = operandOf(draft.op)

	const change = (patch: Partial<FilterDraft>) => {
		setError(null)
		setDraft(current => ({ ...current, ...patch }))
	}

	const changeColumn = (columnId: string) => {
		const next = operatorsFor(typeOf(columnId))
		change({ columnId, op: next.includes(draft.op) ? draft.op : next[0]! })
	}

	const submit = (event: FormEvent) => {
		event.preventDefault()
		// A value typed but not yet added counts.
		const values =
			pending !== '' && !draft.values.includes(pending)
				? [...draft.values, pending]
				: draft.values
		const next = toFilter({ ...draft, values: operand === 'values' ? values : draft.values })
		const problem = checkFilter(type, next)
		if (problem) {
			setError(problem)
			form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
			return
		}
		void commitFilter(next, index)
		onDone(false)
	}

	const errorId = `${id}-error`
	const invalid = error !== null
	const hint = HINTS[type]

	return (
		<form ref={form} onSubmit={submit} className="flex flex-col gap-3" noValidate>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${id}-column`}>Column</Label>
				<Select value={draft.columnId} onValueChange={changeColumn}>
					<SelectTrigger id={`${id}-column`} size="sm" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{columns.map(column => (
							<SelectItem key={column.id} value={column.id}>
								{column.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${id}-op`}>Condition</Label>
				<Select value={draft.op} onValueChange={op => change({ op: op as FilterDraft['op'] })}>
					<SelectTrigger id={`${id}-op`} size="sm" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ops.map(op => (
							<SelectItem key={op} value={op}>
								{operatorLabel(type, op)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{operand === 'value' && (
				<Input
					aria-label={draft.op === 'regex' ? 'Pattern' : 'Value'}
					placeholder={draft.op === 'regex' ? 'pattern or /pattern/i' : hint}
					value={draft.value}
					onChange={event => change({ value: event.target.value })}
					aria-invalid={invalid || undefined}
					aria-describedby={invalid ? errorId : undefined}
				/>
			)}
			{operand === 'range' && (
				<div className="flex items-center gap-2">
					<Input
						aria-label="From"
						placeholder={hint}
						value={draft.min}
						onChange={event => change({ min: event.target.value })}
						aria-invalid={invalid || undefined}
						aria-describedby={invalid ? errorId : undefined}
					/>
					<span className="text-sm">and</span>
					<Input
						aria-label="To"
						placeholder={hint}
						value={draft.max}
						onChange={event => change({ max: event.target.value })}
						aria-invalid={invalid || undefined}
						aria-describedby={invalid ? errorId : undefined}
					/>
				</div>
			)}
			{operand === 'values' && (
				<ValueList
					values={draft.values}
					pending={pending}
					onPending={text => {
						setError(null)
						setPending(text)
					}}
					onChange={values => change({ values })}
					invalid={invalid}
					describedBy={invalid ? errorId : undefined}
				/>
			)}
			{error && (
				<p id={errorId} role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex justify-end gap-2">
				{index !== null && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							void removeFilter(index)
							onDone(true)
						}}
					>
						Remove
					</Button>
				)}
				<Button type="submit" size="sm">
					{index === null ? 'Add filter' : 'Update filter'}
				</Button>
			</div>
		</form>
	)
}
