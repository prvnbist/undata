import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

import { addFilter } from '@/components/filtering/FilterEditor'
import type { DataType } from '@/lib/constants'
import type { ColumnStats } from '@/lib/engine/stats'
import { cn } from 'cn'
import { chartItems, chartSummary } from './chartItems'

const TONES = {
	value: 'bg-primary/60 hover:bg-primary',
	empty: 'bg-foreground/25 hover:bg-foreground/50',
	malformed: 'bg-amber-400/70 hover:bg-amber-300',
}

// A column's distribution in its header. Each bar filters to what it counts. The bars are one tab
// stop, moved through with the arrow keys.
export function MiniChart({
	title,
	type,
	columnId,
	stats,
	className,
}: {
	title: string
	type: DataType
	columnId: string
	stats: ColumnStats | null
	className?: string
}) {
	const group = useRef<HTMLDivElement>(null)

	if (!stats) {
		return <div aria-hidden className={cn('rounded-xs bg-foreground/5', className)} />
	}

	const items = chartItems(stats, type, columnId)
	const summary = chartSummary(stats)

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const bars = [...(group.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
		const at = bars.indexOf(document.activeElement as HTMLButtonElement)
		const next =
			event.key === 'ArrowRight'
				? at + 1
				: event.key === 'ArrowLeft'
					? at - 1
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? bars.length - 1
							: null
		if (next === null || at === -1) return
		event.preventDefault()
		const bar = bars[Math.max(0, Math.min(bars.length - 1, next))]
		if (!bar) return
		for (const other of bars) other.tabIndex = other === bar ? 0 : -1
		bar.focus()
	}

	return (
		<div
			ref={group}
			role="group"
			aria-label={`Distribution of ${title}`}
			aria-description={summary}
			title={summary}
			onKeyDown={onKeyDown}
			className={cn('flex items-end gap-px', className)}
		>
			{items.map((item, i) => (
				<button
					key={item.key}
					type="button"
					tabIndex={i === 0 ? 0 : -1}
					aria-label={`${item.label}. Filter to these`}
					title={item.label}
					onClick={() => void addFilter(item.filter)}
					className="flex h-full min-w-0.5 flex-1 items-end outline-none focus-visible:ring-1 focus-visible:ring-ring"
				>
					<span
						className={cn('block w-full rounded-t-[1px]', TONES[item.tone])}
						style={{ height: `${Math.max(8, item.share * 100)}%` }}
					/>
				</button>
			))}
		</div>
	)
}
