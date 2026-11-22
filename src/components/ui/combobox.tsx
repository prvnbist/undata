import { useState } from 'react'
import { cn } from 'cn'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'

import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type Option<T extends string> = { value: T; label: string }

// A searchable single select with no deselect. Built on Popover, so no extra dependency.
export function Combobox<T extends string>({
	id,
	value,
	options,
	placeholder = 'Select an option',
	emptyMessage = 'Nothing found',
	onValueChange,
}: {
	id?: string
	value: T | null
	options: ReadonlyArray<Option<T>>
	placeholder?: string
	emptyMessage?: string
	onValueChange: (value: T) => void
}) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')

	const selected = options.find(option => option.value === value)
	const filtered = options.filter(option =>
		option.label.toLowerCase().includes(query.trim().toLowerCase())
	)

	return (
		<Popover
			open={open}
			onOpenChange={next => {
				setOpen(next)
				setQuery('')
			}}
		>
			<PopoverTrigger
				id={id}
				role="combobox"
				aria-expanded={open}
				className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
			>
				<span className={cn(!selected && 'text-muted-foreground')}>
					{selected?.label ?? placeholder}
				</span>
				<IconChevronDown className="size-4 opacity-50" />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-(--radix-popover-trigger-width) space-y-2 p-2">
				<Input
					autoFocus
					value={query}
					placeholder="Search"
					aria-label="Search"
					onChange={event => setQuery(event.target.value)}
				/>
				<div role="listbox" className="max-h-56 overflow-y-auto">
					{filtered.length === 0 && (
						<p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>
					)}
					{filtered.map(option => (
						<button
							key={option.value}
							type="button"
							role="option"
							aria-selected={option.value === value}
							className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							onClick={() => {
								onValueChange(option.value)
								setOpen(false)
							}}
						>
							{option.label}
							{option.value === value && <IconCheck className="size-4" />}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}
