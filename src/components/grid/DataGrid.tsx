import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'

import { CELL_KINDS } from '@/lib/import/types'
import { useWorkspace } from '@/store/workspace'
import { Cell } from './Cell'
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
}: {
	index: number
	block: Block | undefined
	columns: GridColumn[]
	span: Span
	gutter: number
	// The active cell's column, when it is in this row.
	activeCol: number | null
}) {
	const at = index % BLOCK_SIZE
	const source = block?.rows[at]

	return (
		<div
			role="row"
			aria-rowindex={index + 2}
			className="flex border-b hover:bg-accent/30"
			style={{ height: ROW_HEIGHT, width: span.width }}
		>
			<div
				role="rowheader"
				aria-colindex={1}
				className="sticky left-0 z-10 flex shrink-0 items-center justify-end border-r bg-background px-2 font-mono text-xs text-foreground/70"
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
		if (!goTo || placed.current === goTo.nonce) return
		const col = columns.findIndex(column => column.info.id === goTo.columnId)
		// A column being shown again is not in the list until the view catches up.
		if (col === -1) return
		placed.current = goTo.nonce
		show({ row: active?.row ?? Math.min(topRow, Math.max(0, rowCount - 1)), col })
		scroller.current?.focus({ preventScroll: true })
	}, [goTo, columns, show, active, topRow, rowCount])

	// Links and buttons in cells are worked with Enter on the cell, so the grid stays one tab stop.
	useLayoutEffect(() => {
		for (const control of body.current?.querySelectorAll('a[href], button') ?? []) {
			if (control.getAttribute('tabindex') !== '-1') control.setAttribute('tabindex', '-1')
		}
	})

	const total = gutter + offsets[offsets.length - 1]!
	const span = useMemo<Span>(
		() => ({ start: first, before: offsets[first]!, width: total }),
		[first, offsets, total]
	)

	return (
		<div
			ref={scroller}
			role="grid"
			aria-label="Rows"
			tabIndex={0}
			aria-activedescendant={
				activeShown ? cellId(activeShown.row, columns[activeShown.col]!.info.id) : undefined
			}
			onKeyDown={keyboard.onKeyDown}
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
					className="absolute left-0"
					style={{
						// Rows sit where the scrollbar is, so a squeezed body still shows them in full.
						top: HEADER_HEIGHT + rows.start * ROW_HEIGHT - position.top + position.scroll,
					}}
				>
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
							/>
						)
					)}
				</div>
			</div>
		</div>
	)
}
