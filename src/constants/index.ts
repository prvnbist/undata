import type { editor } from 'monaco-editor'

const TEXT_DATA_TYPES = [{ value: 'text', label: 'Text' }]

export const NUMERIC_DATA_TYPES: Record<'number', { value: 'number'; label: string }> = {
	number: { value: 'number', label: 'Number' },
}

export const TIME_DATA_TYPES: Record<
	'time' | 'timetz',
	{ value: 'time' | 'timetz'; label: string }
> = {
	time: { value: 'time', label: 'Time' },
	timetz: { value: 'timetz', label: 'Time With Timezone' },
}

export const DATE_DATA_TYPES: Record<
	'date' | 'timestamp' | 'timestamptz',
	{ value: 'date' | 'timestamp' | 'timestamptz'; label: string }
> = {
	date: { value: 'date', label: 'Date' },
	timestamp: { value: 'timestamp', label: 'Timestamp' },
	timestamptz: { value: 'timestamptz', label: 'Timestamp With Timezone' },
}

export const JSON_DATA_TYPES = { json: { value: 'json', label: 'JSON' } }

export const CUSTOM_DATA_TYPES = [
	{ value: 'url', label: 'Link' },
	{ value: 'image', label: 'Image' },
	{ value: 'tag', label: 'Tag' },
]

export const BOOLEAN_DATA_TYPES = [{ value: 'boolean', label: 'Boolean' }]

export const DATA_TYPES = [
	...TEXT_DATA_TYPES,
	...BOOLEAN_DATA_TYPES,
	...Object.values(NUMERIC_DATA_TYPES),
	...Object.values(TIME_DATA_TYPES),
	...Object.values(DATE_DATA_TYPES),
	...Object.values(JSON_DATA_TYPES),
	...CUSTOM_DATA_TYPES,
].sort((a, b) => a.label.localeCompare(b.label))

export const TIME_TYPES_FORMAT: Record<string, string> = {
	time: 'hh:mm:ss',
	timetz: 'hh:mm:ssXXX',
}

export const DATE_TYPES_FORMAT: Record<string, string> = {
	date: 'yyyy-MM-dd',
	timestamp: 'yyyy-MM-dd hh:mm:ss',
	timestamptz: 'yyyy-MM-dd hh:mm:ssXXX',
}

export const JSON_TEXT_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
	fontSize: 12,
	readOnly: true,
	lineNumbers: 'off',
	fontLigatures: true,
	fontFamily: 'Fira Code',
	minimap: { enabled: false },
	padding: { top: 16, bottom: 16 },
}
