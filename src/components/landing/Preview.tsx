import type { CSSProperties } from 'react'
import {
	IconArrowRight,
	IconFilter,
	IconHash,
	IconSearch,
	IconShieldLock,
	IconSortDescending,
	IconX,
} from '@tabler/icons-react'
import { cn } from 'cn'

import { TYPE_ICONS } from '@/components/grid/typeIcons'
import { Kbd } from '@/components/ui/kbd'
import type { DataType } from '@/lib/constants'

const COLUMNS: { title: string; type: DataType; align?: 'right' }[] = [
	{ title: 'order_id', type: 'number', align: 'right' },
	{ title: 'customer', type: 'text' },
	{ title: 'status', type: 'tag' },
	{ title: 'amount', type: 'number', align: 'right' },
	{ title: 'ordered_at', type: 'date' },
	{ title: 'website', type: 'url' },
]

const ROWS = [
	['10482', 'Grace Hopper', 'paid', '1,284.00', '2024-03-18', 'hopper.dev'],
	['10217', 'Radia Perlman', 'paid', '1,190.50', '2024-02-02', 'perlman.net'],
	['10933', 'Ada Lovelace', 'paid', '1,102.75', '2024-05-27', 'lovelace.io'],
	['10051', 'Edsger Dijkstra', 'paid', '987.20', '2024-01-09', 'dijkstra.nl'],
	['10764', 'Barbara Liskov', 'paid', '941.00', '2024-04-14', 'liskov.org'],
	['10398', 'Margaret Hamilton', 'paid', '902.35', '2024-02-21', 'hamilton.space'],
	['10620', 'Dennis Ritchie', 'paid', '874.10', '2024-03-30', 'ritchie.c'],
	['10129', 'Linus Torvalds', 'paid', '855.60', '2024-01-23', 'torvalds.fi'],
]

// The spread of amount, as the column panel draws it.
const BARS = [18, 34, 52, 71, 88, 100, 92, 76, 61, 47, 35, 26, 19, 13, 9, 6]

const GRID = 'grid grid-cols-[4.5rem_9.5rem_5rem_6rem_6.5rem_8rem]'

// A picture of the workspace, drawn rather than screenshotted so it stays sharp and on theme, with
// a few of the panels around it floating over the edges. It is one image to assistive technology,
// described by its label.
export function Preview({ className, style }: { className?: string; style?: CSSProperties }) {
	return (
		<div
			role="img"
			style={style}
			aria-label="The sample orders open in Undata, filtered to paid orders and sorted by amount, with the same view written as SQL, the spread of amounts, and the command palette"
			className={cn('group/preview relative select-none [perspective:1800px]', className)}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(255_212_59/0.16),transparent)] blur-2xl"
			/>

			<div className="overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_212_59/0.06)] transition-transform duration-700 ease-out lg:[transform:rotateY(-9deg)_rotateX(4deg)] lg:group-hover/preview:[transform:rotateY(-3deg)_rotateX(1deg)]">
				<div className="flex items-center gap-3 border-b bg-muted/60 px-3 py-2">
					<div className="flex gap-1.5">
						<span className="size-2.5 rounded-full bg-[#ff6b6b]/70" />
						<span className="size-2.5 rounded-full bg-primary/70" />
						<span className="size-2.5 rounded-full bg-syntax-string/70" />
					</div>
					<span className="truncate text-xs font-medium">sample-orders.csv</span>
					<span className="ml-auto shrink-0 text-xs text-subtle-foreground tabular">
						2,500 rows × 9 columns
					</span>
				</div>

				<div className="flex items-center gap-2 border-b px-3 py-2">
					<div className="flex h-6 w-36 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs text-subtle-foreground">
						<IconSearch className="size-3.5" />
						Search
					</div>
					<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-primary/40 bg-primary/15 px-2 text-xs text-foreground">
						<IconFilter className="size-3.5 text-primary" />
						status <span className="text-muted-foreground">is</span> paid
						<IconX className="size-3 text-subtle-foreground" />
					</span>
					<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border bg-secondary px-2 text-xs text-muted-foreground">
						<IconSortDescending className="size-3.5" />
						amount
					</span>
				</div>

				<div className="overflow-hidden">
					<div className={cn(GRID, 'border-b bg-muted text-xs text-muted-foreground')}>
						{COLUMNS.map(({ title, type, align }) => {
							const Icon = TYPE_ICONS[type]
							return (
								<div
									key={title}
									className={cn(
										'flex items-center gap-1.5 border-r px-2.5 py-1.5 font-medium',
										align === 'right' && 'justify-end',
										title === 'amount' && 'text-primary'
									)}
								>
									<Icon
										className={cn(
											'size-3.5 shrink-0',
											title === 'amount' ? 'text-primary' : 'text-subtle-foreground'
										)}
									/>
									{title}
								</div>
							)
						})}
					</div>
					{ROWS.map((row, index) => (
						<div
							key={row[0]}
							className={cn(
								GRID,
								'border-b font-mono text-xs',
								index === 2 && 'bg-primary/[0.06]'
							)}
						>
							{row.map((value, column) => (
								<div
									key={COLUMNS[column]!.title}
									className={cn(
										'truncate border-r px-2.5 py-1.5',
										COLUMNS[column]!.align === 'right' && 'text-right tabular',
										index === 2 && column === 3 && 'ring-2 ring-primary ring-inset',
										column === 1 && 'font-sans'
									)}
								>
									{column === 2 ? (
										<span className="rounded-sm bg-syntax-string/15 px-1.5 py-px font-sans text-syntax-string">
											{value}
										</span>
									) : column === 5 ? (
										<span className="text-syntax-function underline decoration-syntax-function/30 underline-offset-2">
											{value}
										</span>
									) : (
										value
									)}
								</div>
							))}
						</div>
					))}
				</div>

				<div className="border-t bg-background/60 px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-nowrap">
					<span className="text-syntax-keyword">SELECT</span> *{' '}
					<span className="text-syntax-keyword">WHERE</span> status ={' '}
					<span className="text-syntax-string">'paid'</span>{' '}
					<span className="text-syntax-keyword">ORDER BY</span> amount{' '}
					<span className="text-syntax-keyword">DESC</span>
					<span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-primary motion-safe:animate-pulse" />
				</div>

				<div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-subtle-foreground tabular">
					<span>
						<span className="text-foreground">1,071</span> of 2,500 rows
					</span>
					<span>Row 3 · amount</span>
				</div>
			</div>

			{/* Floating panels. Hidden on small screens, where they would cover the grid. */}
			<div className="absolute -bottom-8 -left-8 hidden w-56 rounded-lg border border-white/10 bg-popover/95 p-3 shadow-popover backdrop-blur md:block motion-safe:animate-float">
				<div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
					<IconHash className="size-3.5 text-primary" />
					amount
					<span className="ml-auto text-subtle-foreground">Number</span>
				</div>
				<div className="flex h-14 items-end gap-0.5">
					{BARS.map((height, index) => (
						<span
							key={index}
							className="flex-1 rounded-t-[2px] bg-primary/80"
							style={{ height: `${height}%`, opacity: 0.45 + height / 180 }}
						/>
					))}
				</div>
				<div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-subtle-foreground tabular">
					<span>
						min <span className="text-foreground">4.20</span>
					</span>
					<span>
						max <span className="text-foreground">1,284</span>
					</span>
					<span className="text-destructive">38 bad</span>
				</div>
			</div>

			<div className="absolute -top-6 -right-4 hidden w-60 rounded-lg border border-white/10 bg-popover/95 p-1.5 shadow-popover backdrop-blur md:block motion-safe:animate-float motion-safe:[animation-delay:-3s]">
				<div className="flex items-center gap-2 border-b px-2 pt-1 pb-2 text-xs">
					<IconSearch className="size-3.5 text-subtle-foreground" />
					<span>
						go to cus<span className="text-subtle-foreground">tomer</span>
					</span>
					<span className="ml-auto flex gap-0.5">
						<Kbd>⌘</Kbd>
						<Kbd>K</Kbd>
					</span>
				</div>
				<div className="mt-1 flex items-center gap-2 rounded-md bg-accent px-2 py-1.5 text-xs">
					<IconArrowRight className="size-3.5 text-primary" />
					Go to customer
				</div>
				<div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
					<IconArrowRight className="size-3.5 opacity-40" />
					Details of customer
				</div>
			</div>

			<div className="absolute right-6 -bottom-5 hidden items-center gap-2 rounded-full border border-primary/30 bg-background/90 py-1.5 pr-3.5 pl-2 text-xs font-medium shadow-popover backdrop-blur sm:flex">
				<span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
					<IconShieldLock className="size-3" />
				</span>
				0 bytes uploaded
			</div>
		</div>
	)
}
