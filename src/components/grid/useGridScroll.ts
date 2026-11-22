import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { createScrollScale, scrollToShow } from './scaledScroll'

type Viewport = { width: number; height: number }
type Position = { top: number; left: number; scroll: number }

const LINE = 32

const wheelPixels = (event: WheelEvent, delta: number, page: number) => {
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * LINE
	if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * page
	return delta
}

// Follows the scroller, and turns its scrollbar into a place among more rows than it can hold.
export const useGridScroll = (
	scroller: RefObject<HTMLDivElement | null>,
	{
		contentHeight,
		headerHeight,
		gutter,
	}: { contentHeight: number; headerHeight: number; gutter: number }
) => {
	const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 })
	const [position, setPosition] = useState<Position>({ top: 0, left: 0, scroll: 0 })
	const scale = useMemo(
		() => createScrollScale(contentHeight, viewport.height),
		[contentHeight, viewport.height]
	)

	// The newest position, for handlers that run again before React has rendered.
	const latest = useRef(position)
	const apply = useCallback((next: Position) => {
		latest.current = next
		setPosition(next)
	}, [])

	useLayoutEffect(() => {
		const element = scroller.current
		if (!element) return
		const measure = () =>
			setViewport({
				width: element.clientWidth,
				height: Math.max(0, element.clientHeight - headerHeight),
			})
		measure()
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => observer.disconnect()
	}, [scroller, headerHeight])

	const moveTo = useCallback(
		(top: number, left: number) => {
			const element = scroller.current
			if (!element) return
			const next = scale.clampTop(top)
			element.scrollTop = scale.toScroll(next)
			element.scrollLeft = left
			// Read back, because the browser rounds it and the scroll event will report the same.
			apply({ top: next, left: element.scrollLeft, scroll: element.scrollTop })
		},
		[scroller, scale, apply]
	)

	useEffect(() => {
		const element = scroller.current
		if (!element) return

		const onScroll = () => {
			const { scrollTop, scrollLeft } = element
			const { top, scroll } = latest.current
			// A move made by `moveTo` already knows its exact place, which the scrollbar does not.
			const moved = Math.abs(scrollTop - scroll) >= 1
			apply({
				top: moved || !scale.scaled ? scale.toTop(scrollTop) : top,
				left: scrollLeft,
				scroll: scrollTop,
			})
		}

		// In scaled mode the browser would move several rows for every row's worth of wheel.
		const onWheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey || event.shiftKey || event.deltaY === 0) return
			event.preventDefault()
			const { top } = latest.current
			moveTo(
				top + wheelPixels(event, event.deltaY, element.clientHeight),
				element.scrollLeft + wheelPixels(event, event.deltaX, element.clientWidth)
			)
		}

		element.addEventListener('scroll', onScroll, { passive: true })
		if (scale.scaled) element.addEventListener('wheel', onWheel, { passive: false })
		// Fewer rows, or a smaller window, can move the scrollbar without an event.
		onScroll()
		return () => {
			element.removeEventListener('scroll', onScroll)
			element.removeEventListener('wheel', onWheel)
		}
	}, [scroller, scale, apply, moveTo])

	const reveal = useCallback(
		(
			row: { start: number; size: number } | null,
			column: { start: number; size: number } | null
		) => {
			const element = scroller.current
			if (!element) return
			const { top } = latest.current
			moveTo(
				row ? scrollToShow(row.start, row.size, top, element.clientHeight - headerHeight) : top,
				column
					? scrollToShow(
							column.start,
							column.size,
							element.scrollLeft,
							element.clientWidth - gutter
						)
					: element.scrollLeft
			)
		},
		[scroller, headerHeight, gutter, moveTo]
	)

	return { viewport, position, scale, moveTo, reveal }
}
