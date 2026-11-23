import { useCallback, useEffect, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import { engine } from '@/store/session'
import type { CurrentQuery } from '@/store/workspace'
import type { GridColumn } from './layout'
import { ROW_HEIGHT } from './layout'
import { clampCell, nextCell } from './navigation'
import type { CellPosition } from './navigation'

type Reveal = (
	row: { start: number; size: number } | null,
	column: { start: number; size: number } | null
) => void

export const cellId = (row: number, columnId: string) => `cell-${row}-${columnId}`

// The raw text, as it is in the file, of one cell of the current query.
const cellText = async (query: CurrentQuery, row: number, columnId: string) => {
	const [found] = (await engine()?.rows(query.id, row, row + 1, [columnId])) ?? []
	return found?.text[0] ?? ''
}

const isMac = () =>
	typeof navigator !== 'undefined' && /Mac|iP(?:hone|ad|od)/.test(navigator.platform)

// The cell keyboard users are on. The grid is one tab stop, and it says which cell is active with
// `aria-activedescendant`, so focus never has to follow the rows as they are recycled.
export const useGridKeyboard = ({
	query,
	columns,
	offsets,
	page,
	reveal,
}: {
	query: CurrentQuery | null
	columns: GridColumn[]
	offsets: number[]
	page: number
	reveal: Reveal
}) => {
	const [active, setActive] = useState<CellPosition | null>(null)
	const rows = query?.rowCount ?? 0
	const bounds = { rows, cols: columns.length, page }

	// Fewer rows or columns than there were.
	useEffect(() => {
		setActive(current => {
			if (!current) return current
			const next = clampCell(current, { rows, cols: columns.length, page })
			return next?.row === current.row && next.col === current.col ? current : next
		})
	}, [rows, columns.length, page])

	const show = useCallback(
		(at: CellPosition) => {
			setActive(at)
			const column = columns[at.col]
			reveal(
				{ start: at.row * ROW_HEIGHT, size: ROW_HEIGHT },
				column ? { start: offsets[at.col]!, size: column.size } : null
			)
		},
		[columns, offsets, reveal]
	)

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// Keys meant for a control inside a header, a popover or a menu are theirs.
		if (event.target !== event.currentTarget) return
		const mod = isMac() ? event.metaKey : event.ctrlKey
		const at = active ?? clampCell({ row: 0, col: 0 }, bounds)
		if (!at) return

		if (mod && event.key.toLowerCase() === 'c' && query) {
			event.preventDefault()
			const column = columns[at.col]
			if (column) {
				void cellText(query, at.row, column.info.id).then(text =>
					navigator.clipboard?.writeText(text)
				)
			}
			return
		}

		// Enter works the link or button in the cell, which are kept out of the tab order.
		if (event.key === 'Enter' && columns[at.col]) {
			const cell = document.getElementById(cellId(at.row, columns[at.col]!.info.id))
			const control = cell?.querySelector<HTMLElement>('a[href], button')
			if (control) {
				event.preventDefault()
				control.click()
			}
			return
		}

		const next = nextCell(at, { key: event.key, mod }, bounds)
		if (!next) return
		event.preventDefault()
		show(next)
	}

	// Tabbing in starts at the first cell, or where it was.
	const onFocus = (event: React.FocusEvent<HTMLElement>) => {
		if (event.target !== event.currentTarget) return
		if (!active) {
			const first = clampCell({ row: 0, col: 0 }, bounds)
			if (first) setActive(first)
		}
	}

	// A click makes that cell the active one.
	const onPointerDown = (event: PointerEvent<HTMLElement>) => {
		const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]')
		if (!cell) return
		setActive({ row: Number(cell.dataset.row), col: Number(cell.dataset.col) })
	}

	return { active, onKeyDown, onFocus, onPointerDown }
}
