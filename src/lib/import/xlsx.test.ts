import { describe, expect, test } from 'vite-plus/test'

import { makeXlsx, makeZip, oleFile, sheetXml } from '../../../tests/fixtures/makeXlsx'
import { readXlsx } from './xlsx'
import { isSpreadsheet } from './xlsx-magic'

const STYLES = `<numFmts count="3">
<numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd hh:mm"/>
<numFmt numFmtId="165" formatCode="0.0&quot;d&quot;"/>
<numFmt numFmtId="166" formatCode="[Red]0.00"/>
</numFmts>
<cellXfs count="7">
<xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="21"/><xf numFmtId="4"/><xf numFmtId="165"/><xf numFmtId="166"/>
</cellXfs>`

const read = async (bytes: Uint8Array, sheet: string | null = null, hasHeader = true) => {
	const result = await readXlsx(bytes, { sheet, hasHeader })
	if (!result.ok) throw new Error(`${result.code}: ${result.message}`)
	return result
}

const texts = (result: Awaited<ReturnType<typeof read>>) =>
	result.table.columns.map(column => [column.title, ...column.text])

describe('readXlsx', () => {
	test('cells as the sheet stores them: strings, numbers, dates by their format', async () => {
		const bytes = await makeXlsx({
			strings: [
				'<t>name</t>',
				'<t>Anna &amp; Ben</t>',
				'<r><t>Rich</t></r><r><t xml:space="preserve"> text</t></r><rPh><t>ignored</t></rPh>',
			],
			styles: STYLES,
			sheets: [
				{
					name: 'Data',
					xml: sheetXml(`
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>amount</t></is></c><c r="C1" t="str"><v>when</v></c><c r="D1" t="str"><v>at</v></c><c r="E1" t="str"><v>time</v></c><c r="F1" t="str"><v>flag</v></c></row>
<row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" s="4"><v>1234.5</v></c><c r="C2" s="1"><v>45306</v></c><c r="D2" s="2"><v>45306.5208333333</v></c><c r="E2" s="3"><v>0.75</v></c><c r="F2" t="b"><v>1</v></c></row>
<row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3" s="5"><v>0.30000000000000004</v></c><c r="C3" s="6"><v>12</v></c><c r="F3" t="e"><v>#DIV/0!</v></c></row>
<row r="5"><c r="B5"><v>-1E-3</v></c><c r="D5" t="d"><v>2024-02-29T10:00:00</v></c></row>`),
				},
			],
		})
		const result = await read(bytes)
		expect(result.sheet).toBe('Data')
		expect(texts(result)).toEqual([
			['name', 'Anna & Ben', 'Rich text', '', ''],
			['amount', '1234.5', '0.30000000000000004', '', '-1E-3'],
			['when', '2024-01-15', '12', '', ''],
			['at', '2024-01-15T12:30:00', '', '', '2024-02-29T10:00:00'],
			['time', '18:00:00', '', '', ''],
			['flag', 'TRUE', '#DIV/0!', '', ''],
		])
		expect(result.table.rowCount).toBe(4)
	})

	test('compressed parts, a header row that is not there, and cells without a reference', async () => {
		const bytes = await makeXlsx({
			compress: true,
			sheets: [
				{
					name: 'Only',
					xml: sheetXml('<row><c><v>1</v></c><c><v>2</v></c></row><row><c><v>3</v></c></row>'),
				},
			],
		})
		const result = await read(bytes, null, false)
		expect(texts(result)).toEqual([
			['Column 1', '1', '3'],
			['Column 2', '2', ''],
		])
	})

	test('blank and repeated headers are named, and said so', async () => {
		const bytes = await makeXlsx({
			sheets: [
				{
					name: 'S',
					xml: sheetXml(
						'<row><c t="str"><v>a</v></c><c t="str"><v>a</v></c><c r="D1" t="str"><v>d</v></c></row><row><c r="A2"><v>1</v></c></row>'
					),
				},
			],
		})
		const result = await read(bytes)
		expect(result.table.columns.map(column => column.title)).toEqual([
			'a',
			'a (2)',
			'Column 3',
			'd',
		])
		expect(result.table.warnings.map(warning => warning.code)).toEqual([
			'blank-headers',
			'duplicate-headers',
		])
	})

	test('dates in the 1904 system, and before the 1900 leap day that never was', async () => {
		const sheet = (serial: string) => ({
			name: 'S',
			xml: sheetXml(
				`<row><c t="str"><v>d</v></c></row><row><c s="1"><v>${serial}</v></c></row>`
			),
		})
		const styles = '<cellXfs><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs>'
		const in1904 = await read(await makeXlsx({ sheets: [sheet('0')], styles, date1904: true }))
		expect(in1904.table.columns[0]!.text).toEqual(['1904-01-01'])
		const early = await read(await makeXlsx({ sheets: [sheet('1')], styles }))
		expect(early.table.columns[0]!.text).toEqual(['1900-01-01'])
		const after = await read(await makeXlsx({ sheets: [sheet('61')], styles }))
		expect(after.table.columns[0]!.text).toEqual(['1900-03-01'])
	})

	test('with several sheets, one has to be chosen', async () => {
		const bytes = await makeXlsx({
			sheets: [
				{
					name: 'First',
					xml: sheetXml('<row><c t="str"><v>x</v></c></row><row><c><v>1</v></c></row>'),
				},
				{
					name: 'Q&A',
					xml: sheetXml('<row><c t="str"><v>y</v></c></row><row><c><v>2</v></c></row>'),
				},
			],
		})
		expect(await readXlsx(bytes, { sheet: null, hasHeader: true })).toMatchObject({
			ok: false,
			code: 'choose-sheet',
			sheets: ['First', 'Q&A'],
		})
		const second = await read(bytes, 'Q&A')
		expect(texts(second)).toEqual([['y', '2']])
		expect(second.sheets).toEqual(['First', 'Q&A'])
		expect(await readXlsx(bytes, { sheet: 'Gone', hasHeader: true })).toMatchObject({
			ok: false,
			code: 'unreadable',
		})
	})

	test('password-protected, old and broken files each say so', async () => {
		expect(await readXlsx(oleFile(true), { sheet: null, hasHeader: true })).toMatchObject({
			ok: false,
			code: 'encrypted',
		})
		expect(await readXlsx(oleFile(false), { sheet: null, hasHeader: true })).toMatchObject({
			ok: false,
			code: 'old-excel',
		})
		const good = await makeXlsx({ sheets: [{ name: 'S', xml: sheetXml('') }] })
		for (const bytes of [
			good.slice(0, good.length - 40),
			await makeZip({ 'readme.txt': 'not a workbook' }),
			new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]),
		]) {
			expect(await readXlsx(bytes, { sheet: null, hasHeader: true })).toMatchObject({
				ok: false,
				code: 'corrupt',
			})
		}
	})

	test('an empty sheet is empty', async () => {
		const bytes = await makeXlsx({ sheets: [{ name: 'S', xml: sheetXml('') }] })
		expect(await readXlsx(bytes, { sheet: null, hasHeader: true })).toMatchObject({
			ok: false,
			code: 'empty',
		})
	})
})

describe('isSpreadsheet', () => {
	test('zip and OLE files are, text is not', async () => {
		expect(isSpreadsheet(await makeZip({ a: 'b' }))).toBe(true)
		expect(isSpreadsheet(oleFile(false))).toBe(true)
		expect(isSpreadsheet(new TextEncoder().encode('PK,a\n1,2'))).toBe(false)
	})
})
