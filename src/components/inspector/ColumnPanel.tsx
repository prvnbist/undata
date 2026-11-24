import { useEffect, useState } from 'react'

import { addFilter } from '@/components/filtering/FilterEditor'
import { MiniChart } from '@/components/profile/MiniChart'
import { DATA_TYPES } from '@/lib/constants'
import type { ColumnStats } from '@/lib/engine/stats'
import { engine } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import { InspectorFrame } from './InspectorFrame'

const LABELS = new Map<string, string>(DATA_TYPES.map(({ value, label }) => [value, label]))
const inEnglish = new Intl.NumberFormat('en')
const mean = new Intl.NumberFormat('en', { maximumFractionDigits: 4 })

const share = (part: number, whole: number) =>
	whole === 0 ? '' : ` (${((part / whole) * 100).toFixed(part === whole || part === 0 ? 0 : 1)}%)`

// Everything known about one column, for the rows of the view.
export function ColumnPanel({ columnId }: { columnId: string }) {
	const column = useWorkspace(state => state.dataset?.columns.find(info => info.id === columnId))
	const query = useWorkspace(state => state.query)
	const [loaded, setLoaded] = useState<{ key: string; stats: ColumnStats } | null>(null)

	const key = `${query?.id}:${columnId}`
	useEffect(() => {
		const client = engine()
		if (!client || !query) return
		let live = true
		client.stats(query.id, columnId).then(
			stats => live && setLoaded({ key, stats }),
			() => {}
		)
		return () => {
			live = false
		}
	}, [key, query, columnId])

	// Still known from before, until the new ones are back.
	const stats = loaded?.stats ?? null
	if (!column) return null

	const facts: [string, string][] = stats
		? [
				['Rows', inEnglish.format(stats.rows)],
				['Empty', `${inEnglish.format(stats.empty)}${share(stats.empty, stats.rows)}`],
				...(column.type === 'text'
					? []
					: ([
							[
								'Not valid',
								`${inEnglish.format(stats.malformed)}${share(stats.malformed, stats.rows)}`,
							],
						] as [string, string][])),
				['Distinct', inEnglish.format(stats.distinct)],
				...(stats.range
					? ([
							['Smallest', stats.range.min],
							['Largest', stats.range.max],
							...(stats.range.mean === null
								? []
								: [['Mean', mean.format(stats.range.mean)] as [string, string]]),
						] as [string, string][])
					: []),
			]
		: []
	const most = Math.max(1, ...(stats?.top.map(top => top.count) ?? []))

	return (
		<InspectorFrame
			label="Column details"
			title={
				<>
					{column.title}{' '}
					<span className="ml-1.5 text-xs font-normal text-subtle-foreground">
						{LABELS.get(column.type)}
					</span>
				</>
			}
		>
			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
				{!stats && <p className="text-muted-foreground">Counting…</p>}
				{stats && (
					<>
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
							{facts.map(([name, value]) => (
								<div key={name} className="contents">
									<dt className="text-subtle-foreground">{name}</dt>
									<dd className="truncate text-right leading-5 tabular">{value}</dd>
								</div>
							))}
						</dl>
						<MiniChart
							title={column.title}
							type={column.type}
							columnId={column.id}
							stats={stats}
							className="mt-4 h-24"
						/>
						{stats.top.length > 0 && (
							<section className="mt-5">
								<h3 className="mb-1.5 text-xs font-medium text-subtle-foreground">
									Most common values
								</h3>
								<ul aria-label="Most common values" className="flex flex-col">
									{stats.top.map(({ value, count }) => (
										<li key={value}>
											<button
												type="button"
												aria-label={`${value}: ${inEnglish.format(count)} rows. Filter to these`}
												onClick={() =>
													void addFilter({ columnId, op: 'anyOf', values: [value] })
												}
												className="relative flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
											>
												<span
													aria-hidden
													className="absolute inset-y-0.5 left-0 rounded-sm bg-foreground/[0.06]"
													style={{ width: `${(count / most) * 100}%` }}
												/>
												<span className="relative min-w-0 flex-1 truncate">
													{value}
												</span>
												<span className="relative text-xs text-subtle-foreground tabular">
													{inEnglish.format(count)}
												</span>
											</button>
										</li>
									))}
								</ul>
							</section>
						)}
					</>
				)}
			</div>
		</InspectorFrame>
	)
}
