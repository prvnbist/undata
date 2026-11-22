import type { DetectError, Encoding } from './detect'

// What every importer produces. Cells are the exact source text, and a type is only ever an
// interpretation of that text applied later, so nothing here converts a value.

// For JSON, which can tell these apart. Delimited text has no `kinds`: an empty cell and a cell that
// was never there are both the empty string, and export writes the same thing for either.
export type CellKind = 'missing' | 'null' | 'string' | 'number' | 'boolean' | 'json'

export const CELL_KINDS: readonly CellKind[] = [
	'missing',
	'null',
	'string',
	'number',
	'boolean',
	'json',
]

// What `RawColumn.kinds` stores. `missing` is 0 on purpose: a new Uint8Array is all zeros, so a
// column created after some rows were read is missing for all of them without being written to.
export const CELL_KIND_CODE = {
	missing: 0,
	null: 1,
	string: 2,
	number: 3,
	boolean: 4,
	json: 5,
} as const satisfies Record<CellKind, number>

export type RawColumn = {
	// Stable for the dataset and never the header, because headers can repeat or be blank.
	id: string
	// The header exactly as written, empty when the source had none.
	header: string
	// What to show. Always unique within a table.
	title: string
	text: string[]
	kinds?: Uint8Array
}

export type WarningCode =
	| 'unterminated-quote'
	| 'blank-headers'
	| 'duplicate-headers'
	| 'blank-lines'
	| 'short-rows'
	| 'extra-cells'
	| 'invalid-lines'
	| 'non-object-records'
	| 'large-numbers-may-round'

export type ImportWarning = {
	code: WarningCode
	// How many times it happened: rows for row-level codes, headers for header-level codes.
	count: number
	// The 1-based number of the first source record affected, counting the header as record 1.
	// A record is a CSV row, which can span several lines when a cell contains line breaks. For
	// NDJSON it is the physical line, and for a JSON array it is the position of the item. Null when
	// it cannot be told.
	firstRow: number | null
	// What went wrong the first time, when there is more to say than the code does.
	detail?: string
}

export type RawTable = {
	columns: RawColumn[]
	rowCount: number
	warnings: ImportWarning[]
}

// Everything needed to read the same bytes into the same table again. Saved with the dataset.
export type ImportOptions =
	| { format: 'delimited'; delimiter: string; encoding: Encoding; hasHeader: boolean }
	| { format: 'json' | 'ndjson'; encoding: Encoding }

export type ImportErrorCode = DetectError | 'invalid-json' | 'no-records' | 'unreadable'

export type ImportError = {
	code: ImportErrorCode
	message: string
	position: { line: number; column: number } | null
}
