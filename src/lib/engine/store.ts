import type { DataType } from '@/lib/constants'
import type { RawTable } from '@/lib/import/types'
import { parse } from '@/lib/types/parse'

import type { Dictionary } from './dictionary'

// What a cell is under its column's type. Derived from the text, never stored with the dataset.
export const STATUS = { empty: 0, ok: 1, malformed: 2 } as const

export type ColumnInfo = {
	id: string
	header: string
	title: string
	type: DataType
	empty: number
	malformed: number
}

export type EngineColumn = {
	info: ColumnInfo
	text: string[]
	kinds: Uint8Array | null
	status: Uint8Array
	// Parsed values for the types that have an order other than their text, NaN where there is none.
	keys: Float64Array | null
	// Where each value stands among the distinct values. Filled in by the first sort on the column.
	ranks: { ranks: Uint32Array; count: number } | null
	dictionary: Dictionary | null
}

export type RowWindow = {
	// Position in the source, 0-based, whatever the sort and filters are.
	row: number
	text: string[]
	// CELL_KIND_CODE per cell, for JSON only.
	kinds: number[] | null
}

const KEYED: ReadonlySet<DataType> = new Set([
	'number',
	'boolean',
	'time',
	'timetz',
	'date',
	'timestamp',
	'timestamptz',
])

export const isKeyed = (type: DataType) => KEYED.has(type)

// `trim` on every cell of a big file is slow, and a cell that starts with a visible character is
// never empty.
export const isEmptyText = (text: string) =>
	text.length === 0 || text.charCodeAt(0) <= 0x20 || text.charCodeAt(0) >= 0x7f
		? text.trim() === ''
		: false

const interpret = (text: string[], type: DataType) => {
	const rows = text.length
	const status = new Uint8Array(rows)
	const keys = isKeyed(type) ? new Float64Array(rows).fill(NaN) : null
	let empty = 0
	let malformed = 0

	for (let i = 0; i < rows; i++) {
		const cell = text[i]!

		if (isEmptyText(cell)) {
			empty++
			continue
		}
		if (type === 'text') {
			status[i] = STATUS.ok
			continue
		}

		const result = parse(type, cell)
		if (!result.ok) {
			status[i] = STATUS.malformed
			malformed++
			continue
		}
		status[i] = STATUS.ok
		if (keys) keys[i] = Number(result.value)
	}

	return { status, keys, empty, malformed }
}

// The imported table plus what each column's type makes of it. Text is never converted, so what is
// read back is what was read in.
export const createDataset = (table: RawTable, types: DataType[]) => {
	const columns = table.columns.map((raw, i): EngineColumn => {
		const type = types[i] ?? 'text'
		const { status, keys, empty, malformed } = interpret(raw.text, type)

		return {
			info: { id: raw.id, header: raw.header, title: raw.title, type, empty, malformed },
			text: raw.text,
			kinds: raw.kinds ?? null,
			status,
			keys,
			ranks: null,
			dictionary: null,
		}
	})
	const byId = new Map(columns.map(column => [column.info.id, column]))

	return {
		rowCount: table.rowCount,
		columns: () => columns,
		info: () => columns.map(column => column.info),
		column: (id: string) => byId.get(id),
		// Only the named columns change. An unknown id is ignored.
		setColumns(setup: { id: string; title: string; type: DataType }[]) {
			for (const { id, title, type } of setup) {
				const column = byId.get(id)
				if (!column) continue

				if (column.info.type === type) {
					column.info = { ...column.info, title }
					continue
				}
				const { status, keys, empty, malformed } = interpret(column.text, type)
				column.status = status
				column.keys = keys
				column.ranks = null
				column.info = { ...column.info, title, type, empty, malformed }
			}
		},
		// `order` is the rows of the view, or null for all of them in source order.
		window(order: Uint32Array | null, start: number, end: number, columnIds: string[]) {
			const picked = columnIds.map(id => byId.get(id))
			const from = Math.max(0, start)
			const to = Math.min(order ? order.length : table.rowCount, end)
			const hasKinds = picked.some(column => column?.kinds)
			const out: RowWindow[] = []

			for (let i = from; i < to; i++) {
				const row = order ? order[i]! : i
				out.push({
					row,
					text: picked.map(column => column?.text[row] ?? ''),
					kinds: hasKinds ? picked.map(column => column?.kinds?.[row] ?? 0) : null,
				})
			}

			return out
		},
	}
}

export type Dataset = ReturnType<typeof createDataset>
