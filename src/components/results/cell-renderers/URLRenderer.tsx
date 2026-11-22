import { IconArrowUpRight } from '@tabler/icons-react'

import { extractURLName, isURL } from '@/lib/url'

export function URLRenderer({ value }: { value: string }) {
	if (!value) return null
	if (!isURL(value)) return <span className="text-sm text-nowrap">{value}</span>

	return (
		<div className="flex w-45 items-center gap-2">
			<a
				href={value}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`Open ${value}`}
				className="flex size-6 shrink-0 items-center justify-center rounded-md text-sky-400 hover:bg-accent"
			>
				<IconArrowUpRight size={14} />
			</a>
			<span className="truncate text-sm text-sky-400" title={value}>
				{extractURLName(value)}
			</span>
		</div>
	)
}
