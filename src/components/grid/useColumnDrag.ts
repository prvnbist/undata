import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

import { moveColumn } from '@/lib/engine/view'
import { arrangeView } from '@/store/session'
import { workspace } from '@/store/workspace'
import type { GridColumn } from './layout'

// How far the pointer moves before a press on a header becomes a drag rather than a click.
const THRESHOLD = 5

type Drag = { id: string; startX: number; active: boolean }

// Where a column dropped at content position `x` goes: before the first column whose middle is past
// it, or last.
export const dropTarget = (columns: GridColumn[], offsets: number[], x: number) => {
	const at = columns.findIndex((column, i) => offsets[i]! + column.size / 2 > x)
	return at === -1 ? null : columns[at]!.info.id
}

// Dragging a header to another place. `indicator` is where it would land, in content pixels.
export const useColumnDrag = (
	scroller: RefObject<HTMLDivElement | null>,
	columns: GridColumn[],
	offsets: number[],
	gutter: number
) => {
	const drag = useRef<Drag | null>(null)
	// Set once a drag happened, so that the click that ends it does not also sort.
	const dragged = useRef(false)
	const [indicator, setIndicator] = useState<number | null>(null)
	const latest = useRef({ columns, offsets, gutter })
	latest.current = { columns, offsets, gutter }

	const contentX = (clientX: number) => {
		const element = scroller.current
		if (!element) return 0
		return (
			clientX - element.getBoundingClientRect().left + element.scrollLeft - latest.current.gutter
		)
	}

	const targetOffset = (beforeId: string | null) => {
		const { columns, offsets } = latest.current
		const at = beforeId === null ? columns.length : columns.findIndex(c => c.info.id === beforeId)
		return offsets[at]!
	}

	useEffect(() => {
		const move = (event: PointerEvent) => {
			const current = drag.current
			if (!current) return
			if (!current.active && Math.abs(event.clientX - current.startX) < THRESHOLD) return
			current.active = true
			const { columns, offsets } = latest.current
			setIndicator(targetOffset(dropTarget(columns, offsets, contentX(event.clientX))))
		}
		const up = (event: PointerEvent) => {
			const current = drag.current
			drag.current = null
			setIndicator(null)
			if (!current?.active) return
			dragged.current = true
			// The click, if there is one, comes straight after. A drop elsewhere has none.
			setTimeout(() => {
				dragged.current = false
			})
			const { columns, offsets } = latest.current
			const beforeId = dropTarget(columns, offsets, contentX(event.clientX))
			void arrangeView(moveColumn(workspace.get().view, current.id, beforeId))
		}
		window.addEventListener('pointermove', move)
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
		return () => {
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			window.removeEventListener('pointercancel', up)
		}
		// The handlers read everything through refs.
		// oxlint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const onPointerDown = useCallback((id: string, event: ReactPointerEvent) => {
		if (event.button !== 0) return
		dragged.current = false
		drag.current = { id, startX: event.clientX, active: false }
	}, [])

	// True once, right after a drag, for the click that ends it.
	const consumeDrag = useCallback(() => {
		const was = dragged.current
		dragged.current = false
		return was
	}, [])

	return { indicator, onPointerDown, consumeDrag }
}
