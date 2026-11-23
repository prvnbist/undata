import { memo } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'

import { BooleanRenderer } from '@/components/results/cell-renderers/BooleanRenderer'
import { ImageRenderer } from '@/components/results/cell-renderers/ImageRenderer'
import { TagRenderer } from '@/components/results/cell-renderers/TagRenderer'
import { URLRenderer } from '@/components/results/cell-renderers/URLRenderer'
import { DATA_TYPES } from '@/lib/constants'
import type { DataType } from '@/lib/constants'
import type { CellKind } from '@/lib/import/types'
import { formatValue } from '@/lib/types/format'
import { parse } from '@/lib/types/parse'
import { JsonCell } from './JsonCell'

// More than this is never readable in a cell, and a whole document in one is slow to lay out.
export const MAX_CELL_TEXT = 500

const LABELS = Object.fromEntries(DATA_TYPES.map(({ value, label }) => [value, label])) as Record<
	DataType,
	string
>

const RIGHT_ALIGNED = new Set<DataType>([
	'number',
	'date',
	'timestamp',
	'timestamptz',
	'time',
	'timetz',
])

const language = () => (typeof navigator === 'undefined' ? undefined : navigator.language)

// A value that does not fit the column's type: shown as written, and said to be wrong.
function Malformed({ text, type }: { text: string; type: DataType }) {
	const label = `Not a valid ${LABELS[type].toLowerCase()}`
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-amber-300" title={label}>
			<IconAlertTriangle role="img" aria-label={label} className="size-3.5 shrink-0" />
			<span className="truncate">{text.slice(0, MAX_CELL_TEXT)}</span>
		</span>
	)
}

// Parses first, so a renderer only ever gets a value of its own type. Total for any text.
export const Cell = memo(function Cell({
	type,
	text,
	kind = null,
}: {
	type: DataType
	text: string
	kind?: CellKind | null
}) {
	if (text === '') {
		return kind === 'null' ? <span className="text-xs text-foreground/40">null</span> : null
	}
	if (type === 'text') return <span className="truncate">{text.slice(0, MAX_CELL_TEXT)}</span>

	const result = parse(type, text)
	if (!result.ok) return <Malformed text={text} type={type} />

	if (RIGHT_ALIGNED.has(type)) {
		return (
			<span className="ml-auto truncate font-mono text-xs">
				{formatValue(type, text, language())}
			</span>
		)
	}

	switch (type) {
		case 'boolean':
			return <BooleanRenderer value={result.value as boolean} />
		case 'url':
			return <URLRenderer value={result.value as string} />
		case 'image':
			return <ImageRenderer value={result.value as string} />
		case 'tag':
			return <TagRenderer value={result.value} />
		case 'json':
			return <JsonCell text={text} />
		default:
			return <span className="truncate">{text.slice(0, MAX_CELL_TEXT)}</span>
	}
})
