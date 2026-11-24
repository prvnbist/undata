import { IconDownload, IconFileUpload, IconTableColumn } from '@tabler/icons-react'

const STATS = [
	{ value: '1M+', label: 'rows, scrolled smoothly' },
	{ value: '0', label: 'bytes uploaded, ever' },
	{ value: '6', label: 'formats, pasted cells included' },
	{ value: '0', label: 'accounts to make' },
]

const STEPS = [
	{
		icon: IconFileUpload,
		title: 'Drop it in',
		text: 'A CSV, TSV, JSON, NDJSON or Excel file, or cells pasted from a spreadsheet.',
	},
	{
		icon: IconTableColumn,
		title: 'Look around',
		text: 'Search, filter, sort and group. Profile a column, or write the view as SQL.',
	},
	{
		icon: IconDownload,
		title: 'Take what you need',
		text: 'Export the view as CSV or JSON. The original file is never touched.',
	},
]

export function Stats() {
	return (
		<section aria-label="At a glance">
			<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
				{STATS.map(({ value, label }) => (
					<div key={label} className="flex flex-col-reverse gap-1 bg-card px-5 py-6">
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="text-gradient-primary font-mono text-3xl font-medium tracking-tight sm:text-4xl">
							{value}
						</dd>
					</div>
				))}
			</dl>
		</section>
	)
}

export function Steps() {
	return (
		<section aria-labelledby="how" className="space-y-10">
			<div className="max-w-xl space-y-3">
				<p className="text-xs font-medium tracking-widest text-primary uppercase">
					How it works
				</p>
				<h2 id="how" className="text-2xl font-semibold text-balance sm:text-3xl">
					From file to answer in three steps
				</h2>
			</div>
			<div className="relative">
				<div
					aria-hidden
					className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-primary/50 via-primary/20 to-primary/50 md:block"
				/>
				<ol className="grid gap-8 md:grid-cols-3 md:gap-6">
					{STEPS.map(({ icon: Icon, title, text }, index) => (
						<li
							key={title}
							className="relative flex flex-col items-start gap-3 md:items-center md:text-center"
						>
							<div className="relative flex size-10 items-center justify-center rounded-full border border-primary/40 bg-background shadow-[0_0_24px_-4px_rgb(255_212_59/0.45)]">
								<Icon className="size-4.5 text-primary" stroke={1.75} aria-hidden />
								<span className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary font-mono text-[10px] text-primary-foreground">
									{index + 1}
								</span>
							</div>
							<h3 className="text-base font-medium">{title}</h3>
							<p className="max-w-xs text-muted-foreground">{text}</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	)
}
