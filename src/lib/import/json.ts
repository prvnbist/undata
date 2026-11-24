import { findJsonSyntaxError } from './json-syntax'
import { createTitles, isBlankHeader, placeholderTitle } from './titles'
import { CELL_KIND_CODE } from './types'
import type { ImportWarning, RawColumn, RawTable, WarningCode } from './types'

export type JsonErrorCode = 'invalid-json' | 'no-records'

export type JsonError = {
	code: JsonErrorCode
	message: string
	// Where the first problem is, when it is known. 1-based.
	position: { line: number; column: number } | null
}

export type JsonResult = { ok: true; table: RawTable } | { ok: false; error: JsonError }

export type JsonOptions = {
	// Keep the exact text of numbers that a JavaScript number cannot hold. On when the engine
	// supports it; turning it off is for testing the fallback.
	lossless?: boolean
}

const supportsLossless = () => {
	if (typeof JSON.rawJSON !== 'function' || typeof JSON.isRawJSON !== 'function') return false

	let seen = false
	JSON.parse('1', (_key, value, context) => {
		seen = context?.source === '1'
		return value
	})
	return seen
}

export const LOSSLESS = supportsLossless()

const JSON_WARNING_ORDER: WarningCode[] = [
	'invalid-lines',
	'non-object-records',
	'blank-lines',
	'large-numbers-may-round',
]

// A number is turned into a raw JSON value only when printing it would not give back what was
// written (`1.10`, `1e3`, `-0`, or one too big for a double). Anything else stays a number.
const keepNumberText = (_key: string, value: unknown, context: { source?: string }) =>
	typeof value === 'number' && context.source !== undefined && String(value) !== context.source
		? JSON.rawJSON(context.source)
		: value

// Without that, a big integer is already rounded by the time it is seen. The best that can be done
// is to count them, nested ones included, so the user is told.
const countRounded = (counter: { rounded: number }) => (_key: string, value: unknown) => {
	if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
		counter.rounded++
	}
	return value
}

const reviverFor = (lossless: boolean, counter: { rounded: number }) =>
	lossless ? keepNumberText : countRounded(counter)

type JsonObject = Record<string, unknown>

// A raw JSON value is an object too, but it stands for a number, never for a record.
const isRecord = (value: unknown, lossless: boolean): value is JsonObject =>
	typeof value === 'object' &&
	value !== null &&
	!Array.isArray(value) &&
	!(lossless && JSON.isRawJSON(value))

const withoutBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)

const noRecords = (message: string, position: JsonError['position'] = null): JsonResult => ({
	ok: false,
	error: { code: 'no-records', message, position },
})

const invalidJson = (text: string, error: unknown): JsonResult => {
	const found = findJsonSyntaxError(text)

	if (!found) {
		const message = error instanceof Error ? error.message : 'Invalid JSON'
		return { ok: false, error: { code: 'invalid-json', message, position: null } }
	}

	return {
		ok: false,
		error: {
			code: 'invalid-json',
			message: `${found.message} at line ${found.line}, column ${found.column}`,
			position: { line: found.line, column: found.column },
		},
	}
}

// Collects objects into columns. A key seen for the first time later in the file becomes a column,
// and the rows before it stay `missing`, which is what a new Uint8Array of kinds already says.
const createRecordBuilder = (capacity: number, lossless: boolean) => {
	const index = new Map<string, number>()
	const columns: RawColumn[] = []
	const kinds: Uint8Array[] = []
	const uniqueTitle = createTitles()
	let rows = 0

	const columnFor = (key: string) => {
		const found = index.get(key)
		if (found !== undefined) return found

		const position = columns.length
		index.set(key, position)
		columns.push({
			id: `c${position}`,
			header: key,
			title: uniqueTitle(isBlankHeader(key) ? placeholderTitle(position) : key),
			text: Array.from({ length: capacity }, () => ''),
		})
		kinds.push(new Uint8Array(capacity))
		return position
	}

	// Null and missing have no text. Everything else is the exact source text, except nested values,
	// which are written back out compactly with their numbers still as written.
	const store = (position: number, value: unknown) => {
		const text = columns[position]!.text
		const kind = kinds[position]!

		if (value === null) {
			kind[rows] = CELL_KIND_CODE.null
		} else if (typeof value === 'string') {
			text[rows] = value
			kind[rows] = CELL_KIND_CODE.string
		} else if (typeof value === 'number') {
			text[rows] = String(value)
			kind[rows] = CELL_KIND_CODE.number
		} else if (typeof value === 'boolean') {
			text[rows] = value ? 'true' : 'false'
			kind[rows] = CELL_KIND_CODE.boolean
		} else if (lossless && JSON.isRawJSON(value)) {
			text[rows] = value.rawJSON
			kind[rows] = CELL_KIND_CODE.number
		} else {
			text[rows] = JSON.stringify(value)
			kind[rows] = CELL_KIND_CODE.json
		}
	}

	return {
		add(record: JsonObject) {
			for (const key of Object.keys(record)) store(columnFor(key), record[key])
			rows++
		},
		rowCount: () => rows,
		finish(): Pick<RawTable, 'columns' | 'rowCount'> {
			// The capacity was an upper bound, so drop what was not used.
			if (rows < capacity) {
				columns.forEach((column, i) => {
					column.text.length = rows
					column.kinds = kinds[i]!.slice(0, rows)
				})
			} else {
				columns.forEach((column, i) => (column.kinds = kinds[i]))
			}
			return { columns, rowCount: rows }
		},
	}
}

const createWarnings = () => {
	const found = new Map<WarningCode, ImportWarning>()

	return {
		add(code: WarningCode, row: number | null, detail?: string) {
			const entry = found.get(code)
			if (entry) entry.count++
			else
				found.set(
					code,
					detail === undefined
						? { code, count: 1, firstRow: row }
						: { code, count: 1, firstRow: row, detail }
				)
		},
		set: (warning: ImportWarning) => found.set(warning.code, warning),
		list: () => JSON_WARNING_ORDER.flatMap(code => found.get(code) ?? []),
	}
}

// A JSON document: an array of objects, or a single object, which is one row.
export const parseJson = (input: string, { lossless = LOSSLESS }: JsonOptions = {}): JsonResult => {
	const text = withoutBom(input)
	const counter = { rounded: 0 }

	let value: unknown
	try {
		value = JSON.parse(text, reviverFor(lossless, counter))
	} catch (error) {
		return invalidJson(text, error)
	}

	const items = Array.isArray(value) ? value : isRecord(value, lossless) ? [value] : null
	if (items === null) return noRecords('Expected an array of objects, or a single object')

	const builder = createRecordBuilder(items.length, lossless)
	const warnings = createWarnings()

	for (let i = 0; i < items.length; i++) {
		const item: unknown = items[i]
		if (isRecord(item, lossless)) builder.add(item)
		else warnings.add('non-object-records', i + 1)
	}

	if (items.length > 0 && builder.rowCount() === 0) {
		return noRecords(`None of the ${items.length} items is an object`)
	}

	if (!lossless && counter.rounded > 0) {
		warnings.set({ code: 'large-numbers-may-round', count: counter.rounded, firstRow: null })
	}

	return { ok: true, table: { ...builder.finish(), warnings: warnings.list() } }
}

// Newline-delimited JSON: one object per line. A bad line is reported and skipped, so one broken
// line does not cost the rest of the file. Line numbers are physical, blank lines included.
export const parseNdjson = (
	input: string,
	{ lossless = LOSSLESS }: JsonOptions = {}
): JsonResult => {
	const lines = withoutBom(input).split('\n')
	const counter = { rounded: 0 }
	const reviver = reviverFor(lossless, counter)
	const builder = createRecordBuilder(lines.length, lossless)
	const warnings = createWarnings()
	let firstInvalid: { line: number; column: number | null; detail: string } | null = null

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i]!
		if (line.endsWith('\r')) line = line.slice(0, -1)

		// The text after the last line break is empty, and is not a line.
		if (line === '' && i === lines.length - 1) continue
		if (line.trim() === '') {
			warnings.add('blank-lines', i + 1)
			continue
		}

		let value: unknown
		try {
			value = JSON.parse(line, reviver)
		} catch {
			const found = findJsonSyntaxError(line)
			const detail = found ? `${found.message} at column ${found.column}` : 'Invalid JSON'

			warnings.add('invalid-lines', i + 1, detail)
			firstInvalid ??= { line: i + 1, column: found?.column ?? null, detail }
			continue
		}

		if (isRecord(value, lossless)) builder.add(value)
		else warnings.add('non-object-records', i + 1)
	}

	if (builder.rowCount() === 0) {
		if (!firstInvalid) return noRecords('No JSON objects found')

		const { line, column, detail } = firstInvalid
		return noRecords(
			`No line could be read as a JSON object. Line ${line}: ${detail}`,
			column === null ? null : { line, column }
		)
	}

	if (!lossless && counter.rounded > 0) {
		warnings.set({ code: 'large-numbers-may-round', count: counter.rounded, firstRow: null })
	}

	return { ok: true, table: { ...builder.finish(), warnings: warnings.list() } }
}
