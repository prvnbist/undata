import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconTable, IconTrash } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/bytes'
import { deleteDataset, listDatasets } from '@/lib/storage/datasets'
import type { StoredDataset } from '@/lib/storage/datasets'

const inEnglish = new Intl.NumberFormat('en')
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	['second', 60],
	['minute', 60],
	['hour', 24],
	['day', 7],
	['week', 4.35],
	['month', 12],
	['year', Infinity],
]

const ago = (time: number) => {
	let value = (time - Date.now()) / 1000
	for (const [unit, size] of STEPS) {
		if (Math.abs(value) < size) return relative.format(Math.round(value), unit)
		value /= size
	}
	return ''
}

const plural = (count: number, word: string) =>
	`${inEnglish.format(count)} ${count === 1 ? word : `${word}s`}`

const details = ({ rowCount, columnCount, size, openedAt }: StoredDataset) =>
	[
		`${plural(rowCount, 'row')} × ${plural(columnCount, 'column')}`,
		formatBytes(size),
		`opened ${ago(openedAt)}`,
	].join(' · ')

// Saved datasets, most recently opened first. Nothing is shown when there are none, or when storage
// cannot be read.
export function Recents() {
	const [datasets, setDatasets] = useState<StoredDataset[]>([])

	useEffect(() => {
		let live = true
		listDatasets()
			.then(found => live && setDatasets(found))
			.catch(() => {})
		return () => {
			live = false
		}
	}, [])

	const remove = async (id: string) => {
		await deleteDataset(id).catch(() => {})
		setDatasets(await listDatasets().catch(() => []))
	}

	if (datasets.length === 0) return null

	return (
		<section aria-labelledby="recents" className="space-y-2">
			<h2 id="recents" className="px-2 text-xs font-medium text-subtle-foreground">
				Recent
			</h2>
			<ul aria-label="Recent datasets" className="flex flex-col">
				{datasets.map(dataset => (
					<li
						key={dataset.id}
						className="group flex items-center gap-1 rounded-md pr-1.5 hover:bg-accent/60 has-focus-visible:bg-accent/60"
					>
						<Link
							to="/d/$datasetId"
							params={{ datasetId: dataset.id }}
							className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							<IconTable className="size-4 shrink-0 text-subtle-foreground" aria-hidden />
							<span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
								<span className="min-w-0 flex-1 truncate">{dataset.name}</span>
								<span className="shrink-0 text-xs text-subtle-foreground tabular">
									{details(dataset)}
								</span>
							</span>
						</Link>
						<Button
							variant="ghost"
							size="icon-xs"
							className="transition-opacity [@media(hover:hover)]:not-group-hover:not-group-has-focus-visible:opacity-0"
							aria-label={`Delete ${dataset.name}`}
							onClick={() => void remove(dataset.id)}
						>
							<IconTrash />
						</Button>
					</li>
				))}
			</ul>
		</section>
	)
}
