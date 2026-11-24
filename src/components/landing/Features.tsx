import {
	IconBolt,
	IconChartBar,
	IconDownload,
	IconFilter,
	IconHistory,
	IconKeyboard,
	IconShieldLock,
	IconSql,
	IconWand,
} from '@tabler/icons-react'
import { cn } from 'cn'

const FEATURES = [
	{
		icon: IconShieldLock,
		title: 'Nothing leaves your browser',
		text: 'Files are read in a worker on your device. There is no server, no account and no upload. Open the network tab and see for yourself.',
		wide: true,
	},
	{
		icon: IconBolt,
		title: 'A million rows, smoothly',
		text: 'Only what is on screen is drawn, so a large file scrolls like a small one.',
	},
	{
		icon: IconWand,
		title: 'Types that read, never rewrite',
		text: 'Numbers, dates, links, JSON and tags are recognised. Values that do not fit are marked, never changed.',
	},
	{
		icon: IconFilter,
		title: 'Search, filter, sort, group',
		text: 'Narrow a file down from the headers or the filter bar, and summarise it by any column.',
	},
	{
		icon: IconSql,
		title: 'SQL when you want it',
		text: 'The view is also a query. Edit the SQL or use the toolbar, and each keeps up with the other.',
		wide: true,
	},
	{
		icon: IconChartBar,
		title: 'Every column profiled',
		text: 'The spread, the most common values and the gaps of a column, without writing anything.',
	},
	{
		icon: IconKeyboard,
		title: 'Keyboard first',
		text: 'Every command is in the palette, and the grid moves with the arrow keys.',
	},
	{
		icon: IconHistory,
		title: 'Back where you left off',
		text: 'Recent files, column setup and the current view are kept in your browser.',
	},
	{
		icon: IconDownload,
		title: 'Export what you see',
		text: 'Save the current view, or every row, as CSV or JSON.',
		wide: true,
	},
]

export function Features() {
	return (
		<section aria-labelledby="features" className="space-y-10">
			<div className="max-w-xl space-y-3">
				<p className="text-xs font-medium tracking-widest text-primary uppercase">Features</p>
				<h2 id="features" className="text-2xl font-semibold text-balance sm:text-3xl">
					Everything you need to read a file, and nothing that changes it
				</h2>
				<p className="text-base text-muted-foreground">
					Undata is for looking: checking an export, finding the odd row, answering a quick
					question. The file you open stays exactly as it was.
				</p>
			</div>
			<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{FEATURES.map(({ icon: Icon, title, text, wide }) => (
					<li
						key={title}
						className={cn(
							'group relative space-y-3 overflow-hidden rounded-xl border bg-card p-5 transition-colors duration-300 hover:border-primary/30',
							wide && 'lg:col-span-2'
						)}
					>
						<div
							aria-hidden
							className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
						/>
						<div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
							<Icon className="size-4.5 text-primary" stroke={1.75} aria-hidden />
						</div>
						<h3 className="text-base font-medium">{title}</h3>
						<p className="text-muted-foreground">{text}</p>
					</li>
				))}
			</ul>
		</section>
	)
}
