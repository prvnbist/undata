import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { IconPlayerPlay, IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { isMac } from '@/components/shell/platform'
import { completionsAt } from '@/lib/query/complete'
import type { Completion, Completions } from '@/lib/query/complete'
import { compileQuery } from '@/lib/query/compile'
import type { QueryError } from '@/lib/query/parse'
import { printQuery } from '@/lib/query/print'
import { applyView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'
import { cn } from 'cn'
import { QUERY_TOGGLE } from './QueryToggle'
import { segmentsOf } from './segments'
import type { SegmentKind } from './segments'

const COLOURS: Partial<Record<SegmentKind, string>> = {
	keyword: 'text-syntax-keyword',
	function: 'text-syntax-function',
	string: 'text-syntax-string',
	number: 'text-syntax-number',
	position: 'text-syntax-number',
	op: 'text-muted-foreground',
	comment: 'text-subtle-foreground italic',
	bad: 'text-destructive',
}

// The same box for the text and the colours drawn under it, so each character sits on its colour.
const TEXT_BOX =
	'px-3 py-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap [tab-size:3]'

const MAX_ROWS = 10

const close = () => {
	workspace.set({ queryOpen: false })
	document.getElementById(QUERY_TOGGLE)?.focus()
}

// The view as SQL, to read or to change. Running a query sets the view, so the filter bar, headers and
// groups show what it asked for, and a change made there is written here.
export function QueryPanel() {
	const id = useId()
	const columns = useWorkspace(state => state.dataset?.columns)
	const view = useWorkspace(state => state.view)
	const draft = useWorkspace(state => state.queryDraft)
	const focusRequest = useWorkspace(state => state.queryFocus)
	const known = useMemo(() => columns ?? [], [columns])
	const printed = useMemo(() => printQuery(view, known), [view, known])
	const text = draft ?? printed
	const changed = draft !== null && draft !== printed

	const [error, setError] = useState<QueryError | null>(null)
	const [completions, setCompletions] = useState<Completions | null>(null)
	const [active, setActive] = useState(0)
	const area = useRef<HTMLTextAreaElement>(null)
	const under = useRef<HTMLPreElement>(null)
	const caret = useRef<number | null>(null)

	useEffect(() => {
		area.current?.focus()
	}, [focusRequest])

	// After a completion, the caret goes after what was put in.
	useLayoutEffect(() => {
		if (caret.current === null || !area.current) return
		area.current.setSelectionRange(caret.current, caret.current)
		caret.current = null
	})

	const segments = useMemo(() => segmentsOf(text, error), [text, error])
	const rows = Math.min(Math.max(text.split('\n').length, 2), MAX_ROWS)

	const setText = (value: string) =>
		workspace.set({ queryDraft: value === printed ? null : value })

	const suggest = (value: string, cursor: number, force = false) => {
		const found = completionsAt(value, cursor, known, { force })
		setCompletions(found)
		setActive(0)
	}

	const accept = (item: Completion) => {
		if (!completions) return
		const next = text.slice(0, completions.from) + item.insert + text.slice(completions.to)
		caret.current = completions.from + item.insert.length
		setText(next)
		setCompletions(null)
		setError(null)
	}

	const run = () => {
		setCompletions(null)
		const current = workspace.get().view
		const result = compileQuery(text, known, current)
		if (!result.ok) {
			setError(result.error)
			return
		}
		setError(null)
		workspace.set({ queryDraft: null })
		if (JSON.stringify(result.value) !== JSON.stringify(current)) void applyView(result.value)
	}

	const discard = () => {
		workspace.set({ queryDraft: null })
		setError(null)
		setCompletions(null)
		area.current?.focus()
	}

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		const mod = isMac() ? event.metaKey : event.ctrlKey
		if (completions) {
			const count = completions.items.length
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()
				setActive(index => (index + (event.key === 'ArrowDown' ? 1 : count - 1)) % count)
				return
			}
			if ((event.key === 'Enter' && !mod) || event.key === 'Tab') {
				event.preventDefault()
				accept(completions.items[active]!)
				return
			}
			if (event.key === 'Escape') {
				event.preventDefault()
				setCompletions(null)
				return
			}
		}
		if (event.key === 'Enter' && mod) {
			event.preventDefault()
			run()
		} else if (event.key === ' ' && event.ctrlKey) {
			event.preventDefault()
			suggest(text, event.currentTarget.selectionEnd, true)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			close()
		}
	}

	const listId = `${id}-completions`
	const errorId = `${id}-error`
	const hintId = `${id}-hint`
	const optionId = (index: number) => `${id}-option-${index}`

	return (
		<section aria-label="SQL query" className="relative z-40 shrink-0 border-b bg-card">
			<div className="flex items-start gap-2 px-2 py-2">
				<div className="relative min-w-0 flex-1 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring/60">
					<pre
						ref={under}
						aria-hidden
						className={cn(
							TEXT_BOX,
							'pointer-events-none absolute inset-0 m-0 overflow-hidden'
						)}
					>
						{segments.map((segment, i) => (
							<span
								key={i}
								className={cn(
									COLOURS[segment.kind],
									segment.error &&
										'underline decoration-destructive decoration-wavy underline-offset-4'
								)}
							>
								{segment.text}
							</span>
						))}
						{/* A last empty line still takes its height. */}
						{'\n'}
					</pre>
					<textarea
						ref={area}
						value={text}
						rows={rows}
						spellCheck={false}
						autoCapitalize="off"
						autoComplete="off"
						role="combobox"
						aria-label="SQL query"
						aria-multiline="true"
						aria-autocomplete="list"
						aria-expanded={completions !== null}
						aria-controls={listId}
						aria-activedescendant={completions ? optionId(active) : undefined}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? `${errorId} ${hintId}` : hintId}
						onChange={event => {
							const { value, selectionEnd } = event.currentTarget
							setText(value)
							setError(null)
							suggest(value, selectionEnd)
						}}
						onKeyDown={onKeyDown}
						onBlur={() => setCompletions(null)}
						onClick={() => setCompletions(null)}
						onScroll={event => {
							if (under.current) under.current.scrollTop = event.currentTarget.scrollTop
						}}
						className={cn(
							TEXT_BOX,
							'relative block w-full resize-none bg-transparent text-transparent caret-foreground outline-none selection:bg-primary/25 selection:text-transparent'
						)}
					/>
					{completions && (
						<ul
							id={listId}
							role="listbox"
							aria-label="Suggestions"
							className="absolute top-full left-2 mt-1 max-h-64 w-64 overflow-y-auto rounded-md border bg-popover p-1 text-xs shadow-popover"
						>
							{completions.items.map((item, index) => (
								<li
									key={`${item.kind}:${item.label}`}
									id={optionId(index)}
									role="option"
									aria-selected={index === active}
									onMouseDown={event => event.preventDefault()}
									onClick={() => accept(item)}
									className={cn(
										'flex cursor-default items-center justify-between gap-3 rounded-sm px-2 py-1',
										index === active && 'bg-accent text-accent-foreground'
									)}
								>
									<span className="truncate font-mono">{item.label}</span>
									<span className="shrink-0 text-subtle-foreground">
										{item.detail ?? item.kind}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					{changed && (
						<Button variant="ghost" size="sm" onClick={discard}>
							Discard
						</Button>
					)}
					<Button
						variant={changed ? 'default' : 'secondary'}
						size="sm"
						onClick={() => {
							run()
							area.current?.focus()
						}}
					>
						<IconPlayerPlay />
						Run
					</Button>
					<Button variant="ghost" size="icon-sm" aria-label="Close SQL query" onClick={close}>
						<IconX />
					</Button>
				</div>
			</div>
			<div className="flex min-h-6 items-center gap-3 px-3 pb-2 text-xs">
				{error ? (
					<p id={errorId} role="alert" className="min-w-0 flex-1 text-destructive">
						<span className="text-muted-foreground">
							Line {error.line}, column {error.column}:
						</span>{' '}
						{error.message}
					</p>
				) : (
					<p className="min-w-0 flex-1 text-subtle-foreground" aria-live="polite">
						{changed ? 'Not run yet' : ''}
					</p>
				)}
				<p id={hintId} className="shrink-0 text-subtle-foreground max-sm:hidden">
					<Kbd>{isMac() ? '⌘' : 'Ctrl'}</Kbd> <Kbd>↵</Kbd> to run, <Kbd>Ctrl</Kbd>{' '}
					<Kbd>Space</Kbd> to suggest
				</p>
			</div>
		</section>
	)
}
