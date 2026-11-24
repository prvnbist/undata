// Reads one sheet of an .xlsx file into a table of text, the way the sheet stores each cell: numbers
// as written in the file, and dates, which a sheet stores as day counts, as ISO text. Formulas give
// the value they last had. There is no library: the zip is read here and unpacked by the browser's
// own DecompressionStream, and the parts are scanned as text, since a worker has no XML parser.

import { createDelimitedBuilder } from './delimited'
import type { ImportErrorCode, RawTable } from './types'

export type XlsxOptions = {
	// Null takes the only sheet there is, and asks when there are more.
	sheet: string | null
	hasHeader: boolean
}

export type XlsxResult =
	| { ok: true; table: RawTable; sheet: string; sheets: string[] }
	| { ok: false; code: ImportErrorCode; message: string; sheets?: string[] }

import { OLE, startsWith } from './xlsx-magic'

class Corrupt extends Error {}

type Entry = { method: number; offset: number; size: number }

const readEntries = (bytes: Uint8Array) => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	let end = -1
	for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 22 - 0xffff); at--) {
		if (view.getUint32(at, true) === 0x06054b50) {
			end = at
			break
		}
	}
	if (end === -1) throw new Corrupt('The end of the zip is missing')

	const count = view.getUint16(end + 10, true)
	let at = view.getUint32(end + 16, true)
	const entries = new Map<string, Entry>()
	const decoder = new TextDecoder()

	for (let i = 0; i < count; i++) {
		if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) {
			throw new Corrupt('The zip directory is broken')
		}
		const method = view.getUint16(at + 10, true)
		const size = view.getUint32(at + 20, true)
		const nameLength = view.getUint16(at + 28, true)
		const extraLength = view.getUint16(at + 30, true)
		const commentLength = view.getUint16(at + 32, true)
		const local = view.getUint32(at + 42, true)
		const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength))

		if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) {
			throw new Corrupt('A part of the zip is missing')
		}
		const offset =
			local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
		if (offset + size > bytes.length) throw new Corrupt('A part of the zip is cut off')
		entries.set(name, { method, offset, size })
		at += 46 + nameLength + extraLength + commentLength
	}
	return entries
}

const inflate = async (data: Uint8Array) => {
	const stream = new Blob([data as BlobPart])
		.stream()
		.pipeThrough(new DecompressionStream('deflate-raw'))
	return new Uint8Array(await new Response(stream).arrayBuffer())
}

const createArchive = (bytes: Uint8Array) => {
	const entries = readEntries(bytes)
	const decoder = new TextDecoder()

	return {
		has: (path: string) => entries.has(path),
		async text(path: string) {
			const entry = entries.get(path)
			if (!entry) return null
			const data = bytes.subarray(entry.offset, entry.offset + entry.size)
			if (entry.method === 0) return decoder.decode(data)
			if (entry.method !== 8) throw new Corrupt('A part of the zip is packed in an unknown way')
			try {
				return decoder.decode(await inflate(data))
			} catch {
				throw new Corrupt('A part of the zip cannot be unpacked')
			}
		},
	}
}

// Element names can carry a namespace prefix, such as `x:c`.
const NS = '(?:[\\w.-]+:)?'

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

const decodeXml = (text: string) =>
	text
		.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, name: string) => {
			if (name[0] !== '#') return ENTITIES[name] ?? whole
			const code =
				name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1))
			return String.fromCodePoint(code)
		})
		// Characters XML cannot hold, as Excel writes them.
		.replace(/_x([\da-f]{4})_/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))

const attribute = (tag: string, name: string) => {
	const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)
	return match ? decodeXml(match[1]!) : null
}

// The text of a string item: its runs, without the phonetic guides some East Asian files carry.
const RUBY = new RegExp(`<${NS}rPh\\b[\\s\\S]*?</${NS}rPh>`, 'g')
const RUN = new RegExp(`<${NS}t\\b[^>]*?(?:/>|>([\\s\\S]*?)</${NS}t>)`, 'g')
const stringText = (xml: string) => {
	let text = ''
	for (const match of xml.replace(RUBY, '').matchAll(RUN)) text += match[1] ?? ''
	return decodeXml(text)
}

const sharedStrings = (xml: string | null) => {
	if (!xml) return []
	const items = new RegExp(`<${NS}si\\b[^>]*?(?:/>|>([\\s\\S]*?)</${NS}si>)`, 'g')
	return [...xml.matchAll(items)].map(match => stringText(match[1] ?? ''))
}

type DateKind = 'date' | 'time' | 'datetime'

// Excel's own formats that show a date or a time.
const BUILT_IN: Record<number, DateKind> = {
	14: 'date',
	15: 'date',
	16: 'date',
	17: 'date',
	18: 'time',
	19: 'time',
	20: 'time',
	21: 'time',
	22: 'datetime',
	45: 'time',
	46: 'time',
	47: 'time',
}
for (const id of [27, 28, 29, 30, 31, 34, 35, 36, 50, 51, 52, 53, 54, 57, 58]) BUILT_IN[id] = 'date'
for (const id of [32, 33, 55, 56]) BUILT_IN[id] = 'time'

// What a number format shows, read from its letters once quoted text, escapes and colours are gone.
export const dateKindOf = (code: string): DateKind | null => {
	const letters = code
		.replace(/"[^"]*"/g, '')
		.replace(/\\./g, '')
		.replace(/\[[^\]]*\]/g, '')
		.replace(/[_*]./g, '')
		.toLowerCase()
	const day = /[yd]/.test(letters)
	const time = /[hs]/.test(letters)
	const months = /m/.test(letters)
	if (day || (months && !time)) return time ? 'datetime' : 'date'
	return time ? 'time' : null
}

const dateStyles = (xml: string | null) => {
	if (!xml) return []
	const custom = new Map<number, string>()
	for (const match of xml.matchAll(new RegExp(`<${NS}numFmt\\b([^>]*)`, 'g'))) {
		const id = Number(attribute(match[1]!, 'numFmtId'))
		const code = attribute(match[1]!, 'formatCode')
		if (code !== null) custom.set(id, code)
	}
	const section = new RegExp(`<${NS}cellXfs\\b[\\s\\S]*?</${NS}cellXfs>`).exec(xml)?.[0] ?? ''
	return [...section.matchAll(new RegExp(`<${NS}xf\\b([^>]*)`, 'g'))].map(match => {
		const id = Number(attribute(match[1]!, 'numFmtId') ?? 0)
		const code = custom.get(id)
		return code !== undefined ? dateKindOf(code) : (BUILT_IN[id] ?? null)
	})
}

const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

// A day count as ISO text. The 1900 system counts a 29 February 1900 that never was, so day 60 has no
// date and days before it start a day later.
const serialText = (serial: number, kind: DateKind, date1904: boolean): string | null => {
	if (!Number.isFinite(serial) || serial < 0) return null
	let days = Math.floor(serial)
	let seconds = Math.round((serial - days) * 86_400)
	if (seconds === 86_400) {
		days++
		seconds = 0
	}
	const time = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
	if (kind === 'time' && days === 0) return time

	let epoch: number
	if (date1904) epoch = Date.UTC(1904, 0, 1)
	else if (days === 60) return null
	else epoch = days < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30)
	const date = new Date(epoch + days * DAY).toISOString().slice(0, 10)
	return kind === 'date' && seconds === 0 ? date : `${date}T${time}`
}

const columnIndex = (reference: string) => {
	let index = 0
	for (const char of reference) {
		const code = char.charCodeAt(0)
		if (code < 65 || code > 90) break
		index = index * 26 + code - 64
	}
	return index - 1
}

const resolve = (base: string, target: string) => {
	const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1)
	for (const part of target.replace(/^\//, '').split('/')) {
		if (part === '..') parts.pop()
		else if (part !== '.') parts.push(part)
	}
	return parts.join('/')
}

type Workbook = { sheets: { name: string; path: string }[]; date1904: boolean; base: string }

const readWorkbook = async (archive: ReturnType<typeof createArchive>): Promise<Workbook> => {
	const root = await archive.text('_rels/.rels')
	const office = root
		? [...root.matchAll(new RegExp(`<${NS}Relationship\\b([^>]*)`, 'g'))]
				.map(match => match[1]!)
				.find(tag => attribute(tag, 'Type')?.endsWith('/officeDocument'))
		: undefined
	const path = office ? resolve('', attribute(office, 'Target') ?? '') : 'xl/workbook.xml'
	const xml = await archive.text(path)
	if (!xml) throw new Corrupt('There is no workbook in it')

	const relsPath = path.replace(/[^/]*$/, name => `_rels/${name}.rels`)
	const rels = (await archive.text(relsPath)) ?? ''
	const targets = new Map<string, string>()
	for (const match of rels.matchAll(new RegExp(`<${NS}Relationship\\b([^>]*)`, 'g'))) {
		const id = attribute(match[1]!, 'Id')
		const target = attribute(match[1]!, 'Target')
		if (id && target) targets.set(id, resolve(path, target))
	}

	const sheets = [...xml.matchAll(new RegExp(`<${NS}sheet\\b([^>]*)`, 'g'))].flatMap(match => {
		const tag = match[1]!
		const name = attribute(tag, 'name')
		const target = targets.get(attribute(tag, 'r:id') ?? '')
		return name !== null && target ? [{ name, path: target }] : []
	})
	const props = new RegExp(`<${NS}workbookPr\\b([^>]*)`).exec(xml)?.[1] ?? ''
	const flag = attribute(props, 'date1904')
	return { sheets, date1904: flag === '1' || flag === 'true', base: path }
}

const ROW = new RegExp(`<${NS}row\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${NS}row>)`, 'g')
const CELL = new RegExp(`<${NS}c\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${NS}c>)`, 'g')
const VALUE = new RegExp(`<${NS}v\\b[^>]*>([\\s\\S]*?)</${NS}v>`)
const INLINE = new RegExp(`<${NS}is\\b[^>]*>([\\s\\S]*?)</${NS}is>`)

// Every cell as text, by row and column, and the ranges that hold anything.
const readCells = (
	xml: string,
	strings: string[],
	styles: (DateKind | null)[],
	date1904: boolean
) => {
	const rows = new Map<number, string[]>()
	let first = Infinity
	let last = -1
	let width = 0
	let nextRow = 0

	for (const row of xml.matchAll(ROW)) {
		const r = attribute(row[1]!, 'r')
		const at = r ? Number(r) - 1 : nextRow
		nextRow = at + 1
		const cells: string[] = []
		let nextColumn = 0

		for (const cell of (row[2] ?? '').matchAll(CELL)) {
			const tag = cell[1]!
			const body = cell[2] ?? ''
			const reference = attribute(tag, 'r')
			const column = reference ? columnIndex(reference) : nextColumn
			nextColumn = column + 1
			const type = attribute(tag, 't') ?? 'n'
			const raw = VALUE.exec(body)?.[1]

			let text = ''
			if (type === 'inlineStr') text = stringText(INLINE.exec(body)?.[1] ?? '')
			else if (raw === undefined) text = ''
			else if (type === 's') text = strings[Number(raw)] ?? ''
			else if (type === 'b') text = raw.trim() === '1' ? 'TRUE' : 'FALSE'
			else if (type === 'n') {
				const stored = raw.trim()
				const kind = styles[Number(attribute(tag, 's') ?? 0)] ?? null
				text = (kind && serialText(Number(stored), kind, date1904)) ?? stored
			} else text = decodeXml(raw)

			if (text === '') continue
			cells[column] = text
			width = Math.max(width, column + 1)
		}

		if (cells.length) {
			rows.set(at, cells)
			first = Math.min(first, at)
			last = Math.max(last, at)
		}
	}
	return { rows, first, last, width }
}

const failure = (code: ImportErrorCode, message: string, sheets?: string[]): XlsxResult => ({
	ok: false,
	code,
	message,
	...(sheets ? { sheets } : {}),
})

const latin = (bytes: Uint8Array) => String.fromCharCode(...bytes.subarray(0, 64 * 1024))

export const readXlsx = async (bytes: Uint8Array, options: XlsxOptions): Promise<XlsxResult> => {
	if (startsWith(bytes, OLE)) {
		// The stream that holds the workbook is named in UTF-16, so every other byte is a NUL.
		return latin(bytes).replace(/\0/g, '').includes('EncryptedPackage')
			? failure('encrypted', 'It is protected with a password.')
			: failure('old-excel', 'It is an Excel 97–2003 workbook (.xls).')
	}

	try {
		const archive = createArchive(bytes)
		const workbook = await readWorkbook(archive)
		const names = workbook.sheets.map(sheet => sheet.name)
		if (names.length === 0) throw new Corrupt('The workbook has no sheets')

		if (options.sheet === null && names.length > 1) {
			return failure('choose-sheet', 'Choose a sheet to open.', names)
		}
		const chosen = workbook.sheets.find(sheet => sheet.name === (options.sheet ?? names[0]))
		if (!chosen) return failure('unreadable', `There is no sheet called ${options.sheet}.`, names)

		const xml = await archive.text(chosen.path)
		if (xml === null) throw new Corrupt(`The sheet ${chosen.name} is missing`)
		const strings = sharedStrings(await archive.text(resolve(workbook.base, 'sharedStrings.xml')))
		const styles = dateStyles(await archive.text(resolve(workbook.base, 'styles.xml')))
		const { rows, first, last, width } = readCells(xml, strings, styles, workbook.date1904)
		if (last === -1) return failure('empty', `The sheet ${chosen.name} is empty.`, names)

		const builder = createDelimitedBuilder({ hasHeader: options.hasHeader })
		const records: string[][] = []
		for (let at = first; at <= last; at++) {
			const cells = rows.get(at) ?? []
			records.push(Array.from({ length: width }, (_, c) => cells[c] ?? ''))
		}
		builder.append(records)
		return { ok: true, table: builder.finish(), sheet: chosen.name, sheets: names }
	} catch (error) {
		if (error instanceof Corrupt || error instanceof RangeError) {
			return failure('corrupt', error.message)
		}
		throw error
	}
}
