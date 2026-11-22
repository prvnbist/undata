const TEXT_DATA_TYPES = [{ value: 'text', label: 'Text' }] as const

const BOOLEAN_DATA_TYPES = [{ value: 'boolean', label: 'Boolean' }] as const

export const NUMERIC_DATA_TYPES = {
	number: { value: 'number', label: 'Number' },
} as const

export const TIME_DATA_TYPES = {
	time: { value: 'time', label: 'Time' },
	timetz: { value: 'timetz', label: 'Time With Timezone' },
} as const

export const DATE_DATA_TYPES = {
	date: { value: 'date', label: 'Date' },
	timestamp: { value: 'timestamp', label: 'Timestamp' },
	timestamptz: { value: 'timestamptz', label: 'Timestamp With Timezone' },
} as const

export const JSON_DATA_TYPES = { json: { value: 'json', label: 'JSON' } } as const

const CUSTOM_DATA_TYPES = [
	{ value: 'url', label: 'Link' },
	{ value: 'image', label: 'Image' },
	{ value: 'tag', label: 'Tag' },
] as const

export const DATA_TYPES = [
	...TEXT_DATA_TYPES,
	...BOOLEAN_DATA_TYPES,
	...Object.values(NUMERIC_DATA_TYPES),
	...Object.values(TIME_DATA_TYPES),
	...Object.values(DATE_DATA_TYPES),
	...Object.values(JSON_DATA_TYPES),
	...CUSTOM_DATA_TYPES,
].sort((a, b) => a.label.localeCompare(b.label))

export type DataType = (typeof DATA_TYPES)[number]['value']

export const TIME_TYPES_FORMAT: Record<keyof typeof TIME_DATA_TYPES, string> = {
	time: 'hh:mm:ss',
	timetz: 'hh:mm:ssXXX',
}

export const DATE_TYPES_FORMAT: Record<keyof typeof DATE_DATA_TYPES, string> = {
	date: 'yyyy-MM-dd',
	timestamp: 'yyyy-MM-dd hh:mm:ss',
	timestamptz: 'yyyy-MM-dd hh:mm:ssXXX',
}

export const JSON_TEXT_EDITOR_OPTIONS = {
	fontSize: 12,
	readOnly: true,
	lineNumbers: 'off',
	fontLigatures: true,
	fontFamily: 'Fira Code',
	minimap: { enabled: false },
	padding: { top: 16, bottom: 16 },
} as const
