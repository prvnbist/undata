import type { DataType } from '@/lib/constants'
import { CELL_KIND_CODE } from '@/lib/import/types'
import { parse } from '@/lib/types/parse'
import type { Dataset, EngineColumn } from './store'

export type ExportOptions = {
	// The rows of the view in its order, or every row in the file's order.
	scope: 'view' | 'all'
	format: 'csv' | 'json'
	// Titles as set here, or headers as they are in the file.
	names: 'titles' | 'headers'
	// Prefixes `'` to CSV cells a spreadsheet would run as a formula. It changes values, so it is off
	// unless asked for.
	escapeFormulas: boolean
	// The shown columns, in display order. Hidden ones are left out.
	columnIds: string[]
}

const FORMULA = /^[=+\-@\t\r]/
const NEEDS_QUOTES = /[",\n\r]/
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

// Rows go out in pieces, so a big export is never one string.
const CHUNK_ROWS = 2000

const csvCell = (text: string, escapeFormulas: boolean, alone: boolean) => {
	const value = escapeFormulas && FORMULA.test(text) ? `'${text}` : text
	// In a file of one column an empty line would be read as a blank line, not an empty value.
	if (NEEDS_QUOTES.test(value) || (alone && value === '')) return `"${value.replace(/"/g, '""')}"`
	return value
}

// A cell as JSON. From JSON it is what it was. From delimited text it is what its type makes of it,
// and the text as written when that does not fit.
// `kind` is the cell's code from a JSON source, or null for delimited text.
export const jsonCell = (type: DataType, text: string, kind: number | null): string | undefined => {
	if (kind !== null) {
		switch (kind) {
			case CELL_KIND_CODE.missing:
				return undefined
			case CELL_KIND_CODE.null:
				return 'null'
			case CELL_KIND_CODE.number:
			case CELL_KIND_CODE.boolean:
			case CELL_KIND_CODE.json:
				return text
			default:
				return JSON.stringify(text)
		}
	}

	if (type === 'text') return JSON.stringify(text)
	if (text.trim() === '') return 'null'
	const result = parse(type, text)
	if (result.ok) {
		const trimmed = text.trim()
		if (type === 'number' && JSON_NUMBER.test(trimmed)) return trimmed
		if (type === 'boolean') return String(result.value)
		if (type === 'json') return trimmed
	}
	return JSON.stringify(text)
}

const jsonValue = (column: EngineColumn, row: number) =>
	jsonCell(column.info.type, column.text[row] ?? '', column.kinds ? column.kinds[row]! : null)

// One row as a JSON object keyed by title, the same way an export writes it. Missing keys are left out.
export const rowJson = (
	columns: { title: string; type: DataType }[],
	text: string[],
	kinds: number[] | null
) => {
	const fields = columns.flatMap((column, i) => {
		const value = jsonCell(column.type, text[i] ?? '', kinds ? (kinds[i] ?? 0) : null)
		return value === undefined ? [] : [`  ${JSON.stringify(column.title)}: ${value}`]
	})
	return fields.length ? `{\n${fields.join(',\n')}\n}` : '{}'
}

// Keys for JSON must differ, so a repeated header falls back to its title, which never repeats.
const uniqueNames = (columns: EngineColumn[], names: ExportOptions['names']) => {
	const seen = new Set<string>()
	return columns.map(({ info }) => {
		const wanted = names === 'headers' ? info.header : info.title
		const name = seen.has(wanted) ? info.title : wanted
		seen.add(name)
		return name
	})
}

// The export as pieces of text, in order. `order` is the view's rows, or null for source order.
export const exportRows = (
	dataset: Dataset,
	order: Uint32Array | null,
	options: ExportOptions
): string[] => {
	const columns = options.columnIds.flatMap(id => dataset.column(id) ?? [])
	const rows = options.scope === 'view' && order ? order : null
	const count = rows ? rows.length : dataset.rowCount
	const at = (i: number) => (rows ? rows[i]! : i)
	const parts: string[] = []

	if (options.format === 'csv') {
		const alone = columns.length === 1
		const headers = columns.map(({ info }) =>
			options.names === 'headers' ? info.header : info.title
		)
		parts.push(headers.map(name => csvCell(name, options.escapeFormulas, alone)).join(',') + '\n')
		for (let start = 0; start < count; start += CHUNK_ROWS) {
			let chunk = ''
			for (let i = start; i < Math.min(count, start + CHUNK_ROWS); i++) {
				const row = at(i)
				chunk +=
					columns
						.map(column => csvCell(column.text[row] ?? '', options.escapeFormulas, alone))
						.join(',') + '\n'
			}
			parts.push(chunk)
		}
		return parts
	}

	const keys = uniqueNames(columns, options.names).map(name => JSON.stringify(name))
	parts.push('[')
	for (let start = 0; start < count; start += CHUNK_ROWS) {
		let chunk = ''
		for (let i = start; i < Math.min(count, start + CHUNK_ROWS); i++) {
			const row = at(i)
			const fields: string[] = []
			columns.forEach((column, c) => {
				const value = jsonValue(column, row)
				if (value !== undefined) fields.push(`${keys[c]}:${value}`)
			})
			chunk += `${i === 0 ? '\n' : ',\n'}{${fields.join(',')}}`
		}
		parts.push(chunk)
	}
	parts.push(count > 0 ? '\n]\n' : ']\n')
	return parts
}

// The group summary as pieces of text. Null cells are a group with no value, or the empty group's key.
export const exportSummary = (
	columns: { name: string; type: DataType }[],
	rows: (string | null)[][],
	format: ExportOptions['format'],
	escapeFormulas: boolean
): string[] => {
	const parts: string[] = []
	if (format === 'csv') {
		const alone = columns.length === 1
		const line = (cells: string[]) =>
			cells.map(cell => csvCell(cell, escapeFormulas, alone)).join(',') + '\n'
		parts.push(line(columns.map(column => column.name)))
		for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
			parts.push(
				rows
					.slice(start, start + CHUNK_ROWS)
					.map(row => line(row.map(cell => cell ?? '')))
					.join('')
			)
		}
		return parts
	}

	const keys = columns.map(column => JSON.stringify(column.name))
	parts.push('[')
	for (let start = 0; start < rows.length; start += CHUNK_ROWS) {
		let chunk = ''
		rows.slice(start, start + CHUNK_ROWS).forEach((row, offset) => {
			const fields = columns.map((column, c) => {
				const cell = row[c] ?? null
				return `${keys[c]}:${cell === null ? 'null' : (jsonCell(column.type, cell, null) ?? 'null')}`
			})
			chunk += `${start + offset === 0 ? '\n' : ',\n'}{${fields.join(',')}}`
		})
		parts.push(chunk)
	}
	parts.push(rows.length > 0 ? '\n]\n' : ']\n')
	return parts
}
