export type CellPosition = { row: number; col: number }

export type GridBounds = { rows: number; cols: number; page: number }

type Keys = { key: string; mod: boolean }

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

// Where a key moves the active cell, or null for a key that does not move it. `mod` is Ctrl, or ⌘ on
// a Mac. Without rows or columns nothing moves.
export const nextCell = (
	at: CellPosition,
	{ key, mod }: Keys,
	{ rows, cols, page }: GridBounds
): CellPosition | null => {
	if (rows === 0 || cols === 0) return null
	const lastRow = rows - 1
	const lastCol = cols - 1
	const { row, col } = at

	switch (key) {
		case 'ArrowUp':
			return { row: mod ? 0 : clamp(row - 1, lastRow), col }
		case 'ArrowDown':
			return { row: mod ? lastRow : clamp(row + 1, lastRow), col }
		case 'ArrowLeft':
			return { row, col: mod ? 0 : clamp(col - 1, lastCol) }
		case 'ArrowRight':
			return { row, col: mod ? lastCol : clamp(col + 1, lastCol) }
		case 'PageUp':
			return { row: clamp(row - Math.max(1, page), lastRow), col }
		case 'PageDown':
			return { row: clamp(row + Math.max(1, page), lastRow), col }
		case 'Home':
			return mod ? { row: 0, col: 0 } : { row, col: 0 }
		case 'End':
			return mod ? { row: lastRow, col: lastCol } : { row, col: lastCol }
		default:
			return null
	}
}

// Keeps a position inside a grid that may have shrunk.
export const clampCell = (at: CellPosition, { rows, cols }: GridBounds): CellPosition | null =>
	rows === 0 || cols === 0 ? null : { row: clamp(at.row, rows - 1), col: clamp(at.col, cols - 1) }
