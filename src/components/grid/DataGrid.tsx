import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { SearchContext } from '@/components/filtering/Highlighted'
import { CELL_KINDS } from '@/lib/import/types'
import { useWorkspace, workspace } from '@/store/workspace'
import { Cell } from './Cell'
import { CellMenu } from './CellMenu'
import type { CellMenuTarget } from './CellMenu'
import { ColumnHeader } from './ColumnHeader'
import { useColumnDrag } from './useColumnDrag'
import { cellId, useGridKeyboard } from './useGridKeyboard'
import { HEADER_HEIGHT, ROW_HEIGHT, gutterWidth, visibleColumns } from './layout'
import type { GridColumn } from './layout'
import { BLOCK_SIZE } from './rowCache'
import type { Block } from './rowCache'
import { columnOffsets, rowRange, spanRange } from './scaledScroll'
import { useGridScroll } from './useGridScroll'
import { useRowWindow } from './useRowWindow'

type Span = { start: number; before: number; width: number }

// A row of cells, of which only those in `span` exist. The gap before them holds their place.
function Cells({ span, children }: { span: Span; children: ReactNode }) {
	return (
		<>
			<div role="presentation" className="shrink-0" style={{ width: span.before }} />
			{children}
		</>
	)
}

const GridRow = memo(function GridRow({
	index,
	block,
	columns,
	span,
	gutter,
	activeCol,
	inspected,
}: {
	index: number
	block: Block | undefined
	columns: GridColumn[]
	span: Span
	gutter: number
	// The active cell's column, when it is in this row.
	activeCol: number | null
	// Open in the row panel.
	inspected: boolean
}) {
	const at = index % BLOCK_SIZE
	const source = block?.rows[at]

	return (
		<div
			role="row"
			aria-rowindex={index + 2}
			aria-current={inspected || undefined}
			className="flex border-b hover:bg-accent/30 aria-current:bg-primary/5"
			style={{ height: ROW_HEIGHT, width: span.width }}
		>
			<div
				role="rowheader"
				aria-colindex={1}
				data-row={index}
				title="Open this row"
				className="sticky left-0 z-10 flex shrink-0 cursor-pointer items-center justify-end border-r bg-background px-2 font-mono text-xs text-foreground/70 hover:text-foreground"
				style={{ width: gutter }}
			>
				{source === undefined ? '' : source + 1}
			</div>
			<Cells span={span}>
				{columns.map(({ info, size }, i) => {
					const column = block?.columns.get(info.id)
					const code = column?.kinds?.[at]
					const col = span.start + i
					return (
						<div
							key={info.id}
							id={cellId(index, info.id)}
							role="gridcell"
							aria-colindex={col + 2}
							aria-selected={col === activeCol || undefined}
							data-row={index}
							data-col={col}
							className="flex shrink-0 items-center overflow-hidden border-r px-3 text-sm whitespace-nowrap aria-selected:bg-primary/10 aria-selected:outline-2 aria-selected:-outline-offset-2 aria-selected:outline-primary/60 group-focus-visible/grid:aria-selected:outline-primary"
							style={{ width: size }}
						>
							{column && (
								<Cell
									type={info.type}
									text={column.text[at] ?? ''}
									kind={code === undefined ? null : (CELL_KINDS[code] ?? null)}
								/>
							)}
						</div>
					)
				})}
			</Cells>
		</div>
	)
})

export function DataGrid() {
	const dataset = useWorkspace(state => state.dataset)
	const view = useWorkspace(state => state.view.columns)
	const sort = useWorkspace(state => state.view.sort)
	const query = useWorkspace(state => state.query)
	// Marked once the rows shown are the ones found for it.
	const search = useWorkspace(state => (state.querying ? null : state.view.search))
	const [marked, setMarked] = useState('')
	if (search !== null && search !== marked) setMarked(search)
	const fitted = useWorkspace(state => state.fitted)
	const scroller = useRef<HTMLDivElement>(null)

	const rowCount = query?.rowCount ?? 0
	const gutter = gutterWidth(dataset?.rowCount ?? 0)
	const columns = useMemo(
		() => visibleColumns(dataset?.columns ?? [], view, fitted),
		[dataset, view, fitted]
	)
	const offsets = useMemo(() => columnOffsets(columns.map(column => column.size)), [columns])

	const { viewport, position, scale, reveal } = useGridScroll(scroller, {
		contentHeight: rowCount * ROW_HEIGHT,
		headerHeight: HEADER_HEIGHT,
		gutter,
	})

	const rows = rowRange({
		top: position.top,
		viewport: viewport.height,
		rowHeight: ROW_HEIGHT,
		rowCount,
		overscan: 6,
	})
	const { start: first, end: last } = spanRange(
		offsets,
		position.left,
		Math.max(0, viewport.width - gutter),
		2
	)
	const shown = useMemo(() => columns.slice(first, last), [columns, first, last])
	const ids = useMemo(() => shown.map(column => column.info.id), [shown])
	const cache = useRowWindow(query, rows, ids)

	const { indicator, onPointerDown, consumeDrag } = useColumnDrag(
		scroller,
		columns,
		offsets,
		gutter
	)

	const keyboard = useGridKeyboard({
		query,
		columns,
		offsets,
		page: Math.max(1, Math.floor(viewport.height / ROW_HEIGHT) - 1),
		reveal,
	})
	const active = keyboard.active
	// Only a cell that exists can be pointed at.
	const activeShown =
		active &&
		active.col >= first &&
		active.col < last &&
		active.row >= rows.start &&
		active.row < rows.end
			? active
			: null
	const body = useRef<HTMLDivElement>(null)

	// Asked for from elsewhere, such as the command palette.
	const goTo = useWorkspace(state => state.goTo)
	const { show } = keyboard
	const topRow = Math.floor(position.top / ROW_HEIGHT)
	const placed = useRef<number | null>(null)
	useEffect(() => {
		if (!goTo || placed.current === goTo.nonce || columns.length === 0) return
		const col =
			goTo.columnId === undefined
				? (active?.col ?? 0)
				: columns.findIndex(column => column.info.id === goTo.columnId)
		// A column being shown again is not in the list until the view catches up.
		if (col === -1) return
		placed.current = goTo.nonce
		show({
			row: goTo.row ?? active?.row ?? Math.min(topRow, Math.max(0, rowCount - 1)),
			col,
		})
		if (goTo.focus) scroller.current?.focus({ preventScroll: true })
	}, [goTo, columns, show, active, topRow, rowCount])

	// An open row panel follows the active row.
	const activeRow = active?.row ?? null
	useEffect(() => {
		const { inspector } = workspace.get()
		if (activeRow === null || inspector?.kind !== 'row' || inspector.row === activeRow) return
		workspace.set({ inspector: { kind: 'row', row: activeRow } })
	}, [activeRow])
	const inspector = useWorkspace(state => state.inspector)
	const inspectedRow = inspector?.kind === 'row' ? inspector.row : null

	// Links and buttons in cells are worked with Enter on the cell, so the grid stays one tab stop.
	useLayoutEffect(() => {
		for (const control of body.current?.querySelectorAll('a[href], button') ?? []) {
			if (control.getAttribute('tabindex') !== '-1') control.setAttribute('tabindex', '-1')
		}
	})

	// Right-click, Shift+F10 or the Menu key on a cell.
	const [menu, setMenu] = useState<CellMenuTarget | null>(null)
	const openMenu = (row: number, col: number, x?: number, y?: number) => {
		const column = columns[col]
		if (!column) return
		const rect = document.getElementById(cellId(row, column.info.id))?.getBoundingClientRect()
		setMenu({
			row,
			column: column.info,
			x: x ?? rect?.left ?? 0,
			y: y ?? rect?.bottom ?? 0,
		})
	}
	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		const menuKey = event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)
		if (!menuKey || event.target !== event.currentTarget) {
			keyboard.onKeyDown(event)
			// Enter on a cell with nothing to work in it opens its row.
			if (
				event.key === 'Enter' &&
				!event.defaultPrevented &&
				event.target === event.currentTarget
			) {
				const row = active?.row ?? (rowCount > 0 ? 0 : null)
				if (row !== null) workspace.set({ inspector: { kind: 'row', row } })
			}
			return
		}
		event.preventDefault()
		const at = active ?? (rowCount > 0 && columns.length > 0 ? { row: 0, col: 0 } : null)
		if (at) openMenu(at.row, at.col)
	}
	// A click on a row number opens that row.
	const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const header = (event.target as HTMLElement).closest<HTMLElement>(
			'[role="rowheader"][data-row]'
		)
		if (!header) return
		const row = Number(header.dataset.row)
		show({ row, col: active?.col ?? 0 })
		workspace.set({ inspector: { kind: 'row', row } })
	}

	const onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
		const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-row][data-col]')
		if (!cell) return
		event.preventDefault()
		const at = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
		show(at)
		openMenu(at.row, at.col, event.clientX, event.clientY)
	}

	const total = gutter + offsets[offsets.length - 1]!
	const span = useMemo<Span>(
		() => ({ start: first, before: offsets[first]!, width: total }),
		[first, offsets, total]
	)

	return (
		<>
			<div
				ref={scroller}
				role="grid"
				aria-label="Rows"
				tabIndex={0}
				aria-activedescendant={
					activeShown ? cellId(activeShown.row, columns[activeShown.col]!.info.id) : undefined
				}
				onKeyDown={onKeyDown}
				onFocus={keyboard.onFocus}
				aria-rowcount={rowCount + 1}
				aria-colcount={columns.length + 1}
				className="group/grid relative min-h-0 flex-1 overflow-auto outline-none [overflow-anchor:none]"
			>
				<div
					role="presentation"
					className="relative"
					style={{ height: HEADER_HEIGHT + scale.bodyHeight, width: total }}
				>
					<div role="rowgroup" className="sticky top-0 z-20 bg-card">
						{indicator !== null && (
							<div
								aria-hidden
								className="pointer-events-none absolute top-0 z-30 w-0.5 -translate-x-1/2 bg-primary"
								style={{ left: gutter + indicator, height: viewport.height }}
							/>
						)}
						<div
							role="row"
							aria-rowindex={1}
							className="flex border-b"
							style={{ height: HEADER_HEIGHT, width: total }}
						>
							<div
								role="columnheader"
								aria-colindex={1}
								aria-label="Row number"
								className="sticky left-0 z-10 shrink-0 border-r bg-card"
								style={{ width: gutter }}
							/>
							<Cells span={span}>
								{shown.map(({ info, size }, i) => (
									<ColumnHeader
										key={info.id}
										column={info}
										size={size}
										colIndex={first + i + 2}
										sort={sort}
										onDragStart={onPointerDown}
										consumeDrag={consumeDrag}
									/>
								))}
							</Cells>
						</div>
					</div>
					<div
						ref={body}
						role="rowgroup"
						onPointerDown={keyboard.onPointerDown}
						onContextMenu={onContextMenu}
						onClick={onClick}
						className="absolute left-0"
						style={{
							// Rows sit where the scrollbar is, so a squeezed body still shows them in full.
							top: HEADER_HEIGHT + rows.start * ROW_HEIGHT - position.top + position.scroll,
						}}
					>
						<SearchContext value={marked}>
							{Array.from({ length: rows.end - rows.start }, (_, i) => rows.start + i).map(
								index => (
									<GridRow
										key={index}
										index={index}
										block={cache.block(index)}
										columns={shown}
										span={span}
										gutter={gutter}
										activeCol={activeShown?.row === index ? activeShown.col : null}
										inspected={inspectedRow === index}
									/>
								)
							)}
						</SearchContext>
					</div>
				</div>
			</div>
			<CellMenu target={menu} query={query} onClose={() => setMenu(null)} />
		</>
	)
}
