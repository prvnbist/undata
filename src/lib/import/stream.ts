import Papa from 'papaparse'

import { cleanRecords, createDelimitedBuilder, newlineFor } from './delimited'
import type { DelimitedOptions } from './delimited'

export type DelimitedStreamOptions = DelimitedOptions & {
	delimiter: string
	// How much text to collect before parsing it. Smaller only in tests.
	chunkSize?: number
}

type ParserOutput = {
	data: string[][]
	errors: { code: string; row?: number }[]
	meta: { cursor: number }
}

// Parses text that arrives in pieces. PapaParse can stream a File itself, but it slices the bytes
// and decodes each slice alone, so a multi-byte character on a boundary turns into two U+FFFD. Here
// the caller decodes, and only whole records are taken from each piece.
export const createDelimitedStream = ({
	delimiter,
	hasHeader,
	chunkSize = 4_000_000,
}: DelimitedStreamOptions) => {
	const builder = createDelimitedBuilder({ hasHeader })
	let newline: '\n' | '\r' | null = null
	let buffer = ''
	let threshold = chunkSize
	let parsedAny = false

	const run = (last: boolean) => {
		newline ??= newlineFor(buffer)
		const parser = new Papa.Parser({ delimiter, newline })
		const { data, errors, meta } = parser.parse(buffer, 0, !last) as ParserOutput

		builder.append(
			cleanRecords(data, newline),
			errors.flatMap(error => (error.code === 'MissingQuotes' ? [error.row ?? 0] : []))
		)
		parsedAny ||= data.length > 0

		// A record longer than the threshold is parsed again from its start, so wait for twice as
		// much. Otherwise an unterminated quote would make this quadratic in the file size.
		buffer = buffer.slice(meta.cursor)
		threshold = Math.max(chunkSize, buffer.length * 2)
	}

	return {
		push(text: string) {
			buffer += text
			if (buffer.length >= threshold) run(false)
		},
		rowCount: builder.rowCount,
		finish() {
			// Nothing left over means the text ended in a line break, which a whole-text parse reports
			// as one empty record.
			if (buffer === '' && parsedAny) builder.append([['']])
			else if (buffer !== '') run(true)
			return builder.finish()
		},
	}
}
