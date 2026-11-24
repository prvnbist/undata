import type { ImportErrorCode, ImportWarning, WarningCode } from './types'

type Wording = { one: string; many: string }

const WORDING: Record<WarningCode, Wording> = {
	'unterminated-quote': {
		one: 'quote is never closed, so the rows after it may have run together',
		many: 'quotes are never closed, so the rows after them may have run together',
	},
	'blank-headers': {
		one: 'column has no header and was given a name',
		many: 'columns have no header and were given names',
	},
	'duplicate-headers': {
		one: 'header repeats an earlier one and was given a number',
		many: 'headers repeat earlier ones and were given numbers',
	},
	'blank-lines': { one: 'blank line was skipped', many: 'blank lines were skipped' },
	'short-rows': {
		one: 'row has fewer cells than there are columns',
		many: 'rows have fewer cells than there are columns',
	},
	'extra-cells': {
		one: 'row has more cells than there are headers, which are kept in columns of their own',
		many: 'rows have more cells than there are headers, which are kept in columns of their own',
	},
	'invalid-lines': {
		one: 'line is not valid JSON and was skipped',
		many: 'lines are not valid JSON and were skipped',
	},
	'non-object-records': {
		one: 'record is not an object and was skipped',
		many: 'records are not objects and were skipped',
	},
	'large-numbers-may-round': {
		one: 'number has more digits than this browser can keep',
		many: 'numbers have more digits than this browser can keep',
	},
}

const inEnglish = new Intl.NumberFormat('en')

export const describeWarning = ({ code, count, firstRow, detail }: ImportWarning) => {
	const { one, many } = WORDING[code]
	const what = `${inEnglish.format(count)} ${count === 1 ? one : many}`
	const where = firstRow === null ? '' : `, first at record ${inEnglish.format(firstRow)}`
	return what + where + (detail ? `: ${detail}` : '')
}

export type FailureCode = ImportErrorCode | 'too-large' | 'crashed'

// What went wrong, and what to try.
const FAILURES: Record<FailureCode, { title: string; hint: string }> = {
	empty: {
		title: 'This file is empty',
		hint: 'There is nothing in it to show. Check that the export or download finished.',
	},
	binary: {
		title: 'This is not a text file',
		hint: 'Undata reads CSV, TSV, JSON, NDJSON and Excel workbooks (.xlsx).',
	},
	'invalid-json': {
		title: 'This JSON is not valid',
		hint: 'Fix it at the place below and open it again.',
	},
	'no-records': {
		title: 'There are no records in this file',
		hint: 'Undata shows JSON that is a list of objects, or one object.',
	},
	unreadable: {
		title: 'This file could not be read',
		hint: 'It may have been moved, changed or removed since you chose it. Choose it again.',
	},
	'choose-sheet': {
		title: 'Choose a sheet',
		hint: 'This workbook has several sheets.',
	},
	encrypted: {
		title: 'This workbook is protected with a password',
		hint: 'Undata cannot open it. Remove the password in Excel, or save the sheet as CSV, and open that.',
	},
	'old-excel': {
		title: 'This is an older Excel file',
		hint: 'Undata reads .xlsx workbooks. Save it as .xlsx or CSV in Excel, and open that.',
	},
	corrupt: {
		title: 'This workbook is damaged',
		hint: 'Part of it is missing or cannot be unpacked. Download or export it again.',
	},
	'too-large': {
		title: 'This file is too large',
		hint: 'Split it, or export fewer rows or columns, and open the parts.',
	},
	crashed: {
		title: 'Something went wrong while reading this file',
		hint: 'It may need more memory than the browser allows. Close other tabs, or try a smaller file.',
	},
}

export const describeFailure = (code: string) => FAILURES[code as FailureCode] ?? FAILURES.crashed
