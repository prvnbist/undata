import type { ColumnInfo } from '@/lib/engine/store'
import type { ViewColumn } from '@/lib/engine/view'

export const ROW_HEIGHT = 32
export const HEADER_HEIGHT = 40
export const MIN_COLUMN = 60
export const MAX_FITTED = 420

export type GridColumn = { info: ColumnInfo; size: number }

// Room for the widest row number.
export const gutterWidth = (rowCount: number) => 24 + String(rowCount).length * 8

// About how wide a piece of text is, without laying it out.
const textWidth = (text: string) => Math.min(text.length, 80) * 7.5

// Wide enough for the header and the values that were seen, within reason.
export const fitColumn = (info: ColumnInfo, samples: string[]) => {
	const header = textWidth(info.title) + 76
	const widest = samples.reduce((max, text) => Math.max(max, textWidth(text)), 0) + 28
	return Math.round(Math.min(MAX_FITTED, Math.max(MIN_COLUMN, header, widest)))
}

export const visibleColumns = (
	columns: ColumnInfo[],
	view: ViewColumn[],
	fitted: Record<string, number>
): GridColumn[] => {
	const byId = new Map(columns.map(column => [column.id, column]))
	return view.flatMap(({ id, hidden, size }) => {
		const info = byId.get(id)
		return info && !hidden ? [{ info, size: size ?? fitted[id] ?? fitColumn(info, []) }] : []
	})
}
