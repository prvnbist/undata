import { detect } from './detect'
import type { Detection, Encoding } from './detect'
import { parseJson, parseNdjson } from './json'
import { createDelimitedStream } from './stream'
import type { ImportError, ImportErrorCode, ImportOptions, RawTable } from './types'

export type ReadProgress = { phase: 'reading' | 'parsing'; ratio: number }

export type OpenResult =
	| { ok: true; table: RawTable; options: ImportOptions }
	| { ok: false; error: ImportError }

const SAMPLE_BYTES = 64 * 1024

const fail = (code: ImportErrorCode, message: string): OpenResult => ({
	ok: false,
	error: { code, message, position: null },
})

const DETECT_MESSAGES = {
	empty: 'The file is empty',
	binary: 'The file is not text',
} as const

const optionsFrom = (detection: Extract<Detection, { ok: true }>): ImportOptions =>
	detection.format === 'delimited'
		? {
				format: 'delimited',
				delimiter: detection.delimiter,
				encoding: detection.encoding,
				hasHeader: true,
			}
		: { format: detection.format, encoding: detection.encoding }

class NotUtf8 extends Error {}

// Decodes as a stream, so a character that spans two pieces is still one character. UTF-8 is strict:
// replacing bytes that are not UTF-8 would alter the data without anyone noticing.
const readText = async (
	blob: Blob,
	encoding: Encoding,
	onText: (text: string) => void,
	onProgress: (ratio: number) => void
) => {
	const decoder = new TextDecoder(encoding, { fatal: encoding === 'utf-8' })
	const decode = (bytes?: Uint8Array) => {
		try {
			return bytes ? decoder.decode(bytes, { stream: true }) : decoder.decode()
		} catch {
			throw new NotUtf8()
		}
	}

	const reader = blob.stream().getReader()
	let read = 0
	for (;;) {
		const { done, value } = await reader.read()
		if (done) break
		onText(decode(value))
		read += value.length
		onProgress(read / blob.size)
	}
	onText(decode())
}

const readTable = async (
	blob: Blob,
	options: ImportOptions,
	onProgress: (progress: ReadProgress) => void
): Promise<OpenResult> => {
	const reading = (ratio: number) => onProgress({ phase: 'reading', ratio })

	if (options.format === 'delimited') {
		const stream = createDelimitedStream(options)
		await readText(blob, options.encoding, text => stream.push(text), reading)
		const table = stream.finish()
		if (table.columns.length === 0) return fail('empty', DETECT_MESSAGES.empty)
		return { ok: true, table, options }
	}

	const parts: string[] = []
	await readText(blob, options.encoding, text => parts.push(text), reading)
	const text = parts.join('')
	parts.length = 0

	onProgress({ phase: 'parsing', ratio: 1 })
	const result = options.format === 'json' ? parseJson(text) : parseNdjson(text)
	return result.ok ? { ok: true, table: result.table, options } : result
}

// With no options the format is detected. With options the file is read exactly as told, which is how
// a saved dataset is reopened and how the user overrides a wrong guess.
export const openBlob = async (
	blob: Blob,
	requested: ImportOptions | null,
	onProgress: (progress: ReadProgress) => void = () => {}
): Promise<OpenResult> => {
	let options = requested

	try {
		if (!options) {
			const sample = new Uint8Array(await blob.slice(0, SAMPLE_BYTES).arrayBuffer())
			const detection = detect(sample, { truncated: blob.size > SAMPLE_BYTES })
			if (!detection.ok) return fail(detection.code, DETECT_MESSAGES[detection.code])
			options = optionsFrom(detection)
		}

		return await readTable(blob, options, onProgress)
	} catch (error) {
		// The start of the file looked like UTF-8 and a later byte was not. Windows-1252 accepts any
		// byte, so this cannot loop.
		if (error instanceof NotUtf8 && options) {
			return readTable(blob, { ...options, encoding: 'windows-1252' }, onProgress)
		}
		return fail('unreadable', error instanceof Error ? error.message : 'The file cannot be read')
	}
}
