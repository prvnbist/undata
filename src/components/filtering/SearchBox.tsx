import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { IconSearch } from '@tabler/icons-react'

import { Input } from '@/components/ui/input'
import { applyView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'

// Long enough that a word typed at speed is one query, short enough not to feel late.
export const SEARCH_DELAY = 200

export const setSearch = (search: string) => {
	const { view } = workspace.get()
	if (view.search !== search) void applyView({ ...view, search })
}

// Where `/` is a character someone is typing, not a way to get here.
const typingIn = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement)

// Over the raw text of the visible columns. `/` comes here from anywhere in the workspace.
export function SearchBox() {
	const search = useWorkspace(state => state.view.search)
	const [text, setText] = useState(search)
	const input = useRef<HTMLInputElement>(null)
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const cancel = () => {
		if (timer.current !== null) clearTimeout(timer.current)
		timer.current = null
	}

	// Changed from elsewhere: a reopened view, or "Clear search".
	useEffect(() => {
		cancel()
		setText(search)
	}, [search])

	useEffect(() => cancel, [])

	useEffect(() => {
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key !== '/' || event.defaultPrevented) return
			if (event.ctrlKey || event.metaKey || event.altKey || typingIn(event.target)) return
			// A dialog or menu that is open keeps its keys.
			if (
				event.target instanceof Element &&
				event.target.closest('[role="dialog"], [role="menu"]')
			)
				return
			event.preventDefault()
			input.current?.focus()
			input.current?.select()
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const onChange = (value: string) => {
		setText(value)
		cancel()
		timer.current = setTimeout(() => {
			timer.current = null
			setSearch(value)
		}, SEARCH_DELAY)
	}

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Escape') return
		event.preventDefault()
		cancel()
		if (text !== '' || search !== '') {
			setText('')
			setSearch('')
			return
		}
		document.querySelector<HTMLElement>('[role="grid"]')?.focus()
	}

	return (
		<div role="search" className="relative w-64 min-w-0 shrink">
			<IconSearch
				aria-hidden
				className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				ref={input}
				type="search"
				aria-label="Search rows"
				placeholder="Search"
				value={text}
				onChange={event => onChange(event.target.value)}
				onKeyDown={onKeyDown}
				spellCheck={false}
				autoComplete="off"
				className="h-8 pr-7 pl-8 [&::-webkit-search-cancel-button]:hidden"
			/>
			<kbd
				aria-hidden
				className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border px-1 font-mono text-[10px] text-muted-foreground"
			>
				/
			</kbd>
		</div>
	)
}
