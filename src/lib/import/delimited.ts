import Papa from 'papaparse'

import { createTitles, isBlankHeader, placeholderTitle } from './titles'
import type { ImportWarning, RawColumn, RawTable, WarningCode } from './types'

export type DelimitedOptions = {
	hasHeader: boolean
}

// The order warnings are reported in, so the same file always gives the same list.
const WARNING_ORDER: WarningCode[] = [
	'unterminated-quote',
	'blank-headers',
	'duplicate-headers',
	'blank-lines',
	'short-rows',
	'extra-cells',
]

const isBlank = (record: string[]) => record.length === 1 && record[0] === ''

// Builds a table from records, in any number of appends, so a worker can feed it chunk by chunk.
// It never changes a cell. Blank lines, short rows and extra cells are handled by the rules in
// tasks/plan.md, and each is counted instead of being silently fixed.
export const createDelimitedBuilder = ({ hasHeader }: DelimitedOptions) => {
	const columns: RawColumn[] = []
	const uniqueTitle = createTitles()
	const warnings = new Map<WarningCode, ImportWarning>()

	let rows = 0
	// Records received so far, blank ones included. Warnings point at these numbers.
	let seen = 0
	let started = false
	let singleColumn = false
	// A blank record is held back until the next real one arrives, because a blank line means
	// different things in different places and the last one is only the final line break.
	let pendingBlanks = 0
	let firstPendingBlank = 0

	const warn = (code: WarningCode, row: number, count = 1) => {
		const entry = warnings.get(code)
		if (entry) entry.count += count
		else warnings.set(code, { code, count, firstRow: row })
	}

	// `labelled` is true only for a real header row, which is the only place a blank or repeated
	// header is the file's doing. Columns found later, or with no header row, are just numbered.
	const addColumn = (header: string, position: number, row: number, labelled: boolean) => {
		const blank = isBlankHeader(header)
		const base = blank ? placeholderTitle(position) : header
		const title = uniqueTitle(base)

		if (labelled && blank) warn('blank-headers', row)
		else if (!blank && title !== base) warn('duplicate-headers', row)

		// A column that appears after some rows have been read is empty for all of them.
		columns.push({
			id: `c${position}`,
			header,
			title,
			text: Array.from({ length: rows }, () => ''),
		})
	}

	const pushRow = (record: string[], row: number) => {
		const width = columns.length

		if (record.length > width) {
			warn('extra-cells', row)
			for (let c = width; c < record.length; c++) addColumn('', c, row, false)
		} else if (record.length < width) {
			warn('short-rows', row)
		}

		for (let c = 0; c < columns.length; c++) columns[c]!.text.push(record[c] ?? '')
		rows++
	}

	const addRecord = (record: string[], row: number) => {
		if (!started) {
			started = true
			singleColumn = record.length === 1

			if (hasHeader) {
				record.forEach((header, c) => addColumn(header, c, row, true))
				return
			}
			record.forEach((_, c) => addColumn('', c, row, false))
		}

		pushRow(record, row)
	}

	// In a one-column file a blank line is a value. Anywhere else it is a gap in the file.
	const settleBlanks = (count: number) => {
		if (count === 0) return

		if (started && singleColumn) {
			for (let i = 0; i < count; i++) columns[0]!.text.push('')
			rows += count
		} else {
			warn('blank-lines', firstPendingBlank, count)
		}
	}

	return {
		// `quoteErrorRows` are 0-based positions inside `records`, which is how the parser reports an
		// unterminated quote for a chunk.
		append(records: string[][], quoteErrorRows: number[] = []) {
			for (const row of quoteErrorRows) warn('unterminated-quote', seen + row + 1)

			for (const record of records) {
				seen++

				if (isBlank(record)) {
					if (pendingBlanks++ === 0) firstPendingBlank = seen
					continue
				}

				settleBlanks(pendingBlanks)
				pendingBlanks = 0
				addRecord(record, seen)
			}
		},
		rowCount: () => rows,
		finish(): RawTable {
			// A file that ends in a line break ends in one empty record. That is not a row.
			if (pendingBlanks > 0) settleBlanks(pendingBlanks - 1)
			pendingBlanks = 0

			return {
				columns,
				rowCount: rows,
				warnings: WARNING_ORDER.flatMap(code => warnings.get(code) ?? []),
			}
		},
	}
}

// The parser guesses line endings from the start of the file, and when a file mixes them it joins
// two rows into one or leaves a CR in a cell. So it is told which to use. LF handles LF and CRLF
// (the CR is removed afterwards); only a file with CRs and no LFs at all is read as bare CR.
export const newlineFor = (sample: string): '\n' | '\r' =>
	sample.includes('\r') && !sample.includes('\n') ? '\r' : '\n'

// The CR of a CRLF ends up on the last cell of an unquoted line, and the parser already removes
// it after a closing quote. One cell ending in a CR inside quotes cannot be told from that, so it
// loses it too, which is the one case where a cell changes.
export const cleanRecords = (records: string[][], newline: '\n' | '\r') => {
	if (newline === '\r') return records

	for (const record of records) {
		const last = record.length - 1
		const cell = record[last]
		if (cell?.endsWith('\r')) record[last] = cell.slice(0, -1)
	}

	return records
}

export type ParseDelimitedOptions = DelimitedOptions & { delimiter: string }

// For text that is already in memory, such as pasted data. A file is streamed through the same
// builder by the worker instead.
export const parseDelimited = (
	text: string,
	{ delimiter, hasHeader }: ParseDelimitedOptions
): RawTable => {
	const builder = createDelimitedBuilder({ hasHeader })
	const newline = newlineFor(text)
	const { data, errors } = Papa.parse<string[]>(text, {
		delimiter,
		newline,
		skipEmptyLines: false,
	})

	builder.append(
		cleanRecords(data, newline),
		errors.flatMap(error => (error.code === 'MissingQuotes' ? [error.row ?? 0] : []))
	)

	return builder.finish()
}
