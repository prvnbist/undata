// The types a column can be read as. A type is only ever a reading of the text: changing it never
// changes a value. Adding one means a parser in `types/parse.ts` and a case in `grid/Cell.tsx`.
const TYPES = [
	{ value: 'text', label: 'Text' },
	{ value: 'boolean', label: 'Boolean' },
	{ value: 'number', label: 'Number' },
	{ value: 'time', label: 'Time' },
	{ value: 'timetz', label: 'Time With Timezone' },
	{ value: 'date', label: 'Date' },
	{ value: 'timestamp', label: 'Timestamp' },
	{ value: 'timestamptz', label: 'Timestamp With Timezone' },
	{ value: 'json', label: 'JSON' },
	{ value: 'url', label: 'Link' },
	{ value: 'image', label: 'Image' },
	{ value: 'tag', label: 'Tag' },
] as const

export type DataType = (typeof TYPES)[number]['value']

export const DATA_TYPES: readonly { value: DataType; label: string }[] = [...TYPES].sort((a, b) =>
	a.label.localeCompare(b.label)
)
