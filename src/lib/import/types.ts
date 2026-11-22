// What every importer produces. Cells are the exact source text, and a type is only ever an
// interpretation of that text applied later, so nothing here converts a value.

// For JSON, which can tell these apart. Delimited text has no `kinds`: an empty cell and a cell that
// was never there are both the empty string, and export writes the same thing for either.
export type CellKind = 'missing' | 'null' | 'string' | 'number' | 'boolean' | 'json'

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

export type ImportWarning = {
	code: WarningCode
	// How many times it happened: rows for row-level codes, headers for header-level codes.
	count: number
	// The 1-based number of the first source record affected, counting the header as record 1.
	// A record is a CSV row, which can span several lines when a cell contains line breaks.
	firstRow: number | null
}

export type RawTable = {
	columns: RawColumn[]
	rowCount: number
	warnings: ImportWarning[]
}
