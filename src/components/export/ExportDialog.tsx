import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { IconDownload } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import type { ExportOptions } from '@/lib/engine/export'
import { download, exportDataset, exportName } from '@/store/session'
import { useWorkspace } from '@/store/workspace'

const inEnglish = new Intl.NumberFormat('en')
const rows = (count: number) => `${inEnglish.format(count)} ${count === 1 ? 'row' : 'rows'}`

type Choice<T extends string> = { value: T; label: ReactNode }

function Choices<T extends string>({
	legend,
	name,
	value,
	choices,
	onChange,
}: {
	legend: string
	name: string
	value: T
	choices: Choice<T>[]
	onChange: (value: T) => void
}) {
	return (
		<fieldset className="space-y-2">
			<legend className="text-sm font-medium">{legend}</legend>
			<div className="flex flex-wrap gap-2">
				{choices.map(choice => (
					<label
						key={choice.value}
						className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
					>
						<input
							type="radio"
							name={name}
							value={choice.value}
							checked={value === choice.value}
							onChange={() => onChange(choice.value)}
							className="sr-only"
						/>
						{choice.label}
					</label>
				))}
			</div>
		</fieldset>
	)
}

type Settings = Omit<ExportOptions, 'columnIds'>

const DEFAULTS: Settings = {
	scope: 'view',
	format: 'csv',
	names: 'titles',
	escapeFormulas: false,
}

// CSV or JSON of what is on screen, or of every row. Made in the engine, saved by the browser.
export function ExportDialog() {
	const id = useId()
	const name = useWorkspace(state => state.dataset?.name ?? 'export')
	const total = useWorkspace(state => state.dataset?.rowCount ?? 0)
	const shown = useWorkspace(state => state.query?.rowCount ?? 0)
	const hidden = useWorkspace(state => state.view.columns.filter(c => c.hidden).length)
	const [open, setOpen] = useState(false)
	const [settings, setSettings] = useState(DEFAULTS)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const change =
		<K extends keyof Settings>(key: K) =>
		(value: Settings[K]) =>
			setSettings(current => ({ ...current, [key]: value }))

	const run = async () => {
		setBusy(true)
		setError(null)
		try {
			const blob = await exportDataset(settings)
			if (!blob) throw new Error('Nothing is open')
			download(blob, exportName(name, settings.format))
			setOpen(false)
		} catch (failure) {
			setError(
				failure && typeof failure === 'object' && 'message' in failure
					? String(failure.message)
					: 'The export failed'
			)
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setOpen(true)}>
				<IconDownload />
				Export
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Export</DialogTitle>
						<DialogDescription>
							{hidden > 0
								? `Hidden columns (${hidden}) are left out.`
								: 'Every shown column is included.'}{' '}
							The file is made here and never leaves your browser.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Choices
							legend="Rows"
							name={`${id}-scope`}
							value={settings.scope}
							onChange={change('scope')}
							choices={[
								{ value: 'view', label: `This view, ${rows(shown)}` },
								{ value: 'all', label: `All ${rows(total)}` },
							]}
						/>
						<Choices
							legend="Format"
							name={`${id}-format`}
							value={settings.format}
							onChange={change('format')}
							choices={[
								{ value: 'csv', label: 'CSV' },
								{ value: 'json', label: 'JSON' },
							]}
						/>
						<Choices
							legend="Column names"
							name={`${id}-names`}
							value={settings.names}
							onChange={change('names')}
							choices={[
								{ value: 'titles', label: 'Titles' },
								{ value: 'headers', label: 'Headers from the file' },
							]}
						/>
						{settings.format === 'csv' && (
							<div className="flex items-start gap-3">
								<Switch
									id={`${id}-escape`}
									checked={settings.escapeFormulas}
									onCheckedChange={checked => change('escapeFormulas')(checked)}
									aria-describedby={`${id}-escape-help`}
								/>
								<div className="space-y-1">
									<label htmlFor={`${id}-escape`} className="text-sm font-medium">
										Escape formulas
									</label>
									<p id={`${id}-escape-help`} className="text-xs text-foreground/70">
										Puts ' before cells starting with = + - or @, so a spreadsheet shows
										them instead of running them. This changes those values.
									</p>
								</div>
							</div>
						)}
						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button onClick={() => void run()} disabled={busy}>
								{busy ? 'Exporting…' : `Export ${settings.format.toUpperCase()}`}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
