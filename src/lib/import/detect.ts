// Decides how to read a file from its first bytes: the encoding, whether it is JSON, NDJSON or
// delimited text, and which delimiter. It looks at a sample only, so it never needs the whole file.

export const DELIMITERS = [',', ';', '\t', '|'] as const

export type Delimiter = (typeof DELIMITERS)[number]
export type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252'
export type DetectError = 'empty' | 'binary'

export type DetectOptions = {
	// True when the bytes are only the start of a larger file, so the last line may be cut off.
	truncated?: boolean
}

type Source = { encoding: Encoding; bom: boolean }

export type Detection =
	| ({ ok: true; format: 'delimited'; delimiter: Delimiter; fields: number } & Source)
	| ({ ok: true; format: 'json' | 'ndjson' } & Source)
	| { ok: false; code: DetectError }

const MAX_RECORDS = 100
const BINARY_CONTROL_RATIO = 0.1

const isControl = (code: number) =>
	(code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f

// Text in UTF-16 with no BOM is mostly ASCII, so one byte of every pair is a NUL.
const sniffUtf16 = (bytes: Uint8Array): 'utf-16le' | 'utf-16be' | null => {
	const pairs = Math.floor(Math.min(bytes.length, 4096) / 2)
	if (pairs < 2) return null

	let even = 0
	let odd = 0
	for (let i = 0; i < pairs; i++) {
		if (bytes[i * 2] === 0) even++
		if (bytes[i * 2 + 1] === 0) odd++
	}

	if (odd / pairs > 0.3 && even / pairs < 0.05) return 'utf-16le'
	if (even / pairs > 0.3 && odd / pairs < 0.05) return 'utf-16be'
	return null
}

const withoutBom = (bytes: Uint8Array): { body: Uint8Array } & Partial<Source> => {
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		return { body: bytes.subarray(3), encoding: 'utf-8', bom: true }
	}
	if (bytes[0] === 0xff && bytes[1] === 0xfe) {
		return { body: bytes.subarray(2), encoding: 'utf-16le', bom: true }
	}
	if (bytes[0] === 0xfe && bytes[1] === 0xff) {
		return { body: bytes.subarray(2), encoding: 'utf-16be', bom: true }
	}
	return { body: bytes }
}

type Decoded = ({ ok: true; text: string } & Source) | { ok: false; code: DetectError }

const decode = (bytes: Uint8Array, truncated: boolean): Decoded => {
	const marked = withoutBom(bytes)
	let { body } = marked
	const encoding = marked.encoding ?? sniffUtf16(body) ?? 'utf-8'
	const bom = marked.bom ?? false

	if (encoding === 'utf-16le' || encoding === 'utf-16be') {
		if (body.length % 2 === 1) body = body.subarray(0, body.length - 1)
		return { ok: true, text: new TextDecoder(encoding).decode(body), encoding, bom }
	}

	// A NUL is never text in a single-byte or UTF-8 file.
	if (body.includes(0)) return { ok: false, code: 'binary' }

	try {
		// While streaming, a character cut off at the end of the sample is held back, not an error.
		const text = new TextDecoder('utf-8', { fatal: true }).decode(body, { stream: truncated })
		return { ok: true, text, encoding: 'utf-8', bom }
	} catch {
		return {
			ok: true,
			text: new TextDecoder('windows-1252').decode(body),
			encoding: 'windows-1252',
			bom,
		}
	}
}

const looksBinary = (text: string) => {
	const length = Math.min(text.length, 8192)
	let controls = 0

	for (let i = 0; i < length; i++) {
		const code = text.charCodeAt(i)
		if (code === 0) return true
		if (isControl(code)) controls++
	}

	return length > 0 && controls / length > BINARY_CONTROL_RATIO
}

const JSON_ARRAY_START = /^\[\s*(?:[{["\-0-9]|true|false|null|\])/
const JSON_OBJECT_START = /^\{\s*(?:"|\})/

const isJsonObjectLine = (line: string) => {
	if (!line.startsWith('{')) return false
	try {
		const value: unknown = JSON.parse(line)
		return typeof value === 'object' && value !== null && !Array.isArray(value)
	} catch {
		return false
	}
}

const detectJson = (text: string, truncated: boolean): 'json' | 'ndjson' | null => {
	const start = text.trimStart()

	if (JSON_ARRAY_START.test(start)) return 'json'
	if (!JSON_OBJECT_START.test(start)) return null

	const lines = start.split(/\r?\n/)
	// With a cut-off sample, the last line is only complete if the sample ends on a line break.
	if (truncated && !start.endsWith('\n')) lines.pop()

	const complete = lines.map(line => line.trim()).filter(line => line !== '')
	return complete.length >= 2 && complete.every(isJsonObjectLine) ? 'ndjson' : 'json'
}

// Field count of each record, with quotes respected so a delimiter inside "…" or a line break inside
// "…" does not count. Blank lines are not records.
const countFields = (text: string, delimiter: string, truncated: boolean) => {
	const counts: number[] = []
	let fields = 1
	let inQuote = false
	let blank = true

	const finish = () => {
		if (!blank) counts.push(fields)
		fields = 1
		blank = true
	}

	for (let i = 0; i < text.length && counts.length < MAX_RECORDS; i++) {
		const char = text[i]!

		if (char === '"') {
			inQuote = !inQuote
			blank = false
		} else if (inQuote) {
			blank = false
		} else if (char === '\n') {
			finish()
		} else if (char === delimiter) {
			fields++
			blank = false
		} else if (char !== '\r' && char !== ' ' && char !== '\t') {
			blank = false
		}
	}

	// The last record has no line break after it. In a cut-off sample it is probably unfinished.
	if (!truncated && counts.length < MAX_RECORDS) finish()

	return counts
}

const modeOf = (counts: number[]) => {
	const frequency = new Map<number, number>()
	for (const count of counts) frequency.set(count, (frequency.get(count) ?? 0) + 1)

	let best = { fields: 0, frequency: 0 }
	for (const [fields, times] of frequency) {
		if (times > best.frequency || (times === best.frequency && fields > best.fields)) {
			best = { fields, frequency: times }
		}
	}

	return best
}

const detectDelimiter = (text: string, truncated: boolean) => {
	let winner: { delimiter: Delimiter; fields: number; consistency: number } | null = null

	for (const delimiter of DELIMITERS) {
		const counts = countFields(text, delimiter, truncated)
		if (counts.length === 0) continue

		const { fields, frequency } = modeOf(counts)
		if (fields < 2) continue

		const consistency = frequency / counts.length
		const better =
			winner === null ||
			consistency > winner.consistency ||
			(consistency === winner.consistency && fields > winner.fields)

		if (better) winner = { delimiter, fields, consistency }
	}

	return winner ?? { delimiter: ',' as const, fields: 1 }
}

export const detect = (bytes: Uint8Array, { truncated = false }: DetectOptions = {}): Detection => {
	if (bytes.length === 0) return { ok: false, code: 'empty' }

	const decoded = decode(bytes, truncated)
	if (!decoded.ok) return decoded

	const { text, encoding, bom } = decoded
	if (looksBinary(text)) return { ok: false, code: 'binary' }
	// `trim` counts a BOM as whitespace, so a file that is only a BOM is empty too.
	if (text.trim() === '') return { ok: false, code: 'empty' }

	const json = detectJson(text, truncated)
	if (json) return { ok: true, format: json, encoding, bom }

	const { delimiter, fields } = detectDelimiter(text, truncated)
	return { ok: true, format: 'delimited', delimiter, fields, encoding, bom }
}
