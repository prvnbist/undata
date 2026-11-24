import { useState } from 'react'
import { IconAlertTriangle, IconFileSettings } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { describeWarning } from '@/lib/import/messages'
import type { ImportOptions } from '@/lib/import/types'
import { reimport } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import type { DatasetMeta } from '@/store/workspace'

const DELIMITER_NAMES: Record<string, string> = {
	',': 'Comma',
	';': 'Semicolon',
	'\t': 'Tab',
	'|': 'Pipe',
}

type Delimited = Extract<ImportOptions, { format: 'delimited' }>

function DelimitedOptions({ options, onDone }: { options: Delimited; onDone: () => void }) {
	const [draft, setDraft] = useState(options)
	const changed = draft.delimiter !== options.delimiter || draft.hasHeader !== options.hasHeader

	return (
		<form
			className="space-y-4"
			onSubmit={event => {
				event.preventDefault()
				onDone()
				void reimport(draft)
			}}
		>
			<div className="flex items-center justify-between gap-4">
				<Label htmlFor="has-header">The first row is a header</Label>
				<Switch
					id="has-header"
					checked={draft.hasHeader}
					onCheckedChange={hasHeader => setDraft({ ...draft, hasHeader })}
				/>
			</div>
			<div className="flex items-center justify-between gap-4">
				<Label htmlFor="delimiter">Cells are separated by</Label>
				<Select
					items={DELIMITER_NAMES}
					value={draft.delimiter}
					onValueChange={delimiter => delimiter !== null && setDraft({ ...draft, delimiter })}
				>
					<SelectTrigger id="delimiter" size="sm">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(DELIMITER_NAMES).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<p className="text-sm text-muted-foreground">
				Reading it again starts over: column names, types, filters and sorting are set afresh.
			</p>
			<Button type="submit" disabled={!changed}>
				Read it again
			</Button>
		</form>
	)
}

const FORMAT_NAMES: Record<ImportOptions['format'], string> = {
	delimited: 'Delimited text',
	json: 'JSON',
	ndjson: 'NDJSON',
	xlsx: 'Excel workbook',
}

const describeOptions = (options: ImportOptions) =>
	options.format === 'xlsx'
		? `${FORMAT_NAMES.xlsx}, sheet “${options.sheet ?? ''}”`
		: `${FORMAT_NAMES[options.format]}, ${options.encoding.toUpperCase()}`

function Details({ dataset, onDone }: { dataset: DatasetMeta; onDone: () => void }) {
	const { options, warnings } = dataset

	return (
		<>
			<DialogHeader>
				<DialogTitle>How this file was read</DialogTitle>
				<DialogDescription>{describeOptions(options)}</DialogDescription>
			</DialogHeader>
			{warnings.length > 0 && (
				<ul
					aria-label="Warnings"
					className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm"
				>
					{warnings.map(warning => (
						<li key={warning.code}>{describeWarning(warning)}</li>
					))}
				</ul>
			)}
			{options.format === 'delimited' && <DelimitedOptions options={options} onDone={onDone} />}
		</>
	)
}

// What the import has to say, and how to read the file differently.
export function ImportNotice() {
	const dataset = useWorkspace(state => state.dataset)
	const [open, setOpen] = useState(false)
	if (!dataset) return null

	const count = dataset.warnings.length
	const label = count === 0 ? 'Import options' : count === 1 ? '1 warning' : `${count} warnings`

	return (
		<>
			<Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
				{count === 0 ? <IconFileSettings /> : <IconAlertTriangle className="text-primary" />}
				{label}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<Details dataset={dataset} onDone={() => setOpen(false)} />
				</DialogContent>
			</Dialog>
		</>
	)
}
