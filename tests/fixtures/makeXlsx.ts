// Builds .xlsx files for tests: a zip of the given parts, stored or deflated.

const crcTable = Array.from({ length: 256 }, (_, n) => {
	let c = n
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
	return c >>> 0
})

const crc32 = (bytes: Uint8Array) => {
	let crc = 0xffffffff
	for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
	return (crc ^ 0xffffffff) >>> 0
}

const deflate = async (bytes: Uint8Array) =>
	new Uint8Array(
		await new Response(
			new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))
		).arrayBuffer()
	)

export const makeZip = async (files: Record<string, string | Uint8Array>, compress = false) => {
	const encoder = new TextEncoder()
	const locals: Uint8Array[] = []
	const centrals: Uint8Array[] = []
	let offset = 0

	for (const [name, content] of Object.entries(files)) {
		const raw = typeof content === 'string' ? encoder.encode(content) : content
		const data = compress ? await deflate(raw) : raw
		const nameBytes = encoder.encode(name)
		const local = new Uint8Array(30 + nameBytes.length + data.length)
		const view = new DataView(local.buffer)
		view.setUint32(0, 0x04034b50, true)
		view.setUint16(4, 20, true)
		view.setUint16(8, compress ? 8 : 0, true)
		view.setUint32(14, crc32(raw), true)
		view.setUint32(18, data.length, true)
		view.setUint32(22, raw.length, true)
		view.setUint16(26, nameBytes.length, true)
		local.set(nameBytes, 30)
		local.set(data, 30 + nameBytes.length)

		const central = new Uint8Array(46 + nameBytes.length)
		const cv = new DataView(central.buffer)
		cv.setUint32(0, 0x02014b50, true)
		cv.setUint16(4, 20, true)
		cv.setUint16(6, 20, true)
		cv.setUint16(10, compress ? 8 : 0, true)
		cv.setUint32(16, crc32(raw), true)
		cv.setUint32(20, data.length, true)
		cv.setUint32(24, raw.length, true)
		cv.setUint16(28, nameBytes.length, true)
		cv.setUint32(42, offset, true)
		central.set(nameBytes, 46)

		locals.push(local)
		centrals.push(central)
		offset += local.length
	}

	const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
	const end = new Uint8Array(22)
	const ev = new DataView(end.buffer)
	ev.setUint32(0, 0x06054b50, true)
	ev.setUint16(8, centrals.length, true)
	ev.setUint16(10, centrals.length, true)
	ev.setUint32(12, centralSize, true)
	ev.setUint32(16, offset, true)

	const out = new Uint8Array(offset + centralSize + end.length)
	let at = 0
	for (const part of [...locals, ...centrals, end]) {
		out.set(part, at)
		at += part.length
	}
	return out
}

type Sheet = { name: string; xml: string }

const escape = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Rows of cells as sheet XML. A cell is raw XML attributes and content, or a shared string index.
export const sheetXml = (rows: string) =>
	`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`

export const makeXlsx = ({
	sheets,
	strings = [],
	styles = '',
	date1904 = false,
	compress = false,
}: {
	sheets: Sheet[]
	strings?: string[]
	// The inside of <styleSheet>.
	styles?: string
	date1904?: boolean
	compress?: boolean
}) =>
	makeZip(
		{
			'[Content_Types].xml': '<Types/>',
			'xl/workbook.xml': `<?xml version="1.0"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${date1904 ? '<workbookPr date1904="1"/>' : '<workbookPr/>'}<sheets>${sheets
				.map(
					(sheet, i) =>
						`<sheet name="${escape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
				)
				.join('')}</sheets></workbook>`,
			'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
				.map(
					(_, i) =>
						`<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${i === 0 ? '/xl/' : ''}worksheets/sheet${i + 1}.xml"/>`
				)
				.join('')}</Relationships>`,
			...(strings.length
				? {
						'xl/sharedStrings.xml': `<sst>${strings.map(s => `<si>${s}</si>`).join('')}</sst>`,
					}
				: {}),
			...(styles ? { 'xl/styles.xml': `<styleSheet>${styles}</styleSheet>` } : {}),
			...Object.fromEntries(
				sheets.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheet.xml])
			),
		},
		compress
	)

// The start of an OLE file, which is what old .xls files and password-protected .xlsx files are.
export const oleFile = (encrypted: boolean) => {
	const bytes = new Uint8Array(2048)
	bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
	const name = encrypted ? 'EncryptedPackage' : 'Workbook'
	for (let i = 0; i < name.length; i++) bytes[1024 + i * 2] = name.charCodeAt(i)
	return bytes
}
