import { expect, test, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { useWorkspace } from '@/store/workspace'
import { makeXlsx, oleFile, sheetXml } from '../fixtures/makeXlsx'
import { openFile, useApp } from './app'

useApp()

const sheet = (name: string, value: string) => ({
	name,
	xml: sheetXml(
		`<row><c t="str"><v>city</v></c><c t="str"><v>when</v></c></row><row><c t="str"><v>${value}</v></c><c s="1"><v>45306</v></c></row>`
	),
})

const workbook = (...sheets: ReturnType<typeof sheet>[]) =>
	makeXlsx({ sheets, styles: '<cellXfs><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs>' })

const file = (bytes: Uint8Array, name = 'book.xlsx') => new File([bytes as BlobPart], name)

test('a workbook of one sheet opens straight away, dates as dates', async () => {
	await openFile(file(await workbook(sheet('Only', 'Oslo'))))
	await expect.element(page.getByRole('gridcell', { name: 'Oslo' })).toBeVisible()
	await expect.element(page.getByRole('gridcell', { name: '2024-01-15' })).toBeVisible()
	await vi.waitFor(() =>
		expect(useWorkspace.getState().dataset!.columns.map(column => column.type)).toEqual([
			'text',
			'date',
		])
	)
	await userEvent.click(page.getByRole('button', { name: 'Import options' }))
	await expect.element(page.getByText('Excel workbook, sheet “Only”')).toBeVisible()
})

test('with several sheets, the user picks one', async () => {
	await openFile(file(await workbook(sheet('North', 'Oslo'), sheet('South', 'Lima'))))
	const picker = page.getByRole('group', { name: 'Sheets in book.xlsx' })
	await expect.element(picker).toBeVisible()
	await expect.element(picker.getByRole('button', { name: 'North' })).toHaveFocus()
	await userEvent.click(picker.getByRole('button', { name: 'South' }))
	await expect.element(page.getByRole('gridcell', { name: 'Lima' })).toBeVisible()
	expect(useWorkspace.getState().dataset!.options).toEqual({
		format: 'xlsx',
		sheet: 'South',
		hasHeader: true,
	})
})

test.each([
	['password-protected', () => oleFile(true), 'This workbook is protected with a password'],
	['old', () => oleFile(false), 'This is an older Excel file'],
	[
		'damaged',
		() => new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]),
		'This workbook is damaged',
	],
])('a %s workbook is explained', async (_, bytes, title) => {
	await openFile(file(bytes()))
	await expect.element(page.getByRole('alert').getByRole('heading', { name: title })).toBeVisible()
})
