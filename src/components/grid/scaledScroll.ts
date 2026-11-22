// Firefox stops laying out past about 17.9 million pixels, and Chromium and Safari past 33.5 million.
export const MAX_BODY_HEIGHT = 12_000_000

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

// `top` is where the viewport is in the rows, in real pixels. `scroll` is what the scrollbar says. The
// two are the same until the rows are taller than a browser can lay out.
export const createScrollScale = (contentHeight: number, viewport: number) => {
	const bodyHeight = Math.min(contentHeight, MAX_BODY_HEIGHT)
	const maxTop = Math.max(0, contentHeight - viewport)
	const maxScroll = Math.max(0, bodyHeight - viewport)
	const scaled = contentHeight > MAX_BODY_HEIGHT
	const ratio = scaled && maxScroll > 0 ? maxTop / maxScroll : 1

	return {
		scaled,
		bodyHeight,
		maxTop,
		clampTop: (top: number) => clamp(top, 0, maxTop),
		// The end is exact, or the last row could be left a hair out of reach.
		toTop: (scroll: number) => (scroll >= maxScroll ? maxTop : clamp(scroll * ratio, 0, maxTop)),
		toScroll: (top: number) => (top >= maxTop ? maxScroll : clamp(top / ratio, 0, maxScroll)),
	}
}

export type Range = { start: number; end: number }

export const rowRange = ({
	top,
	viewport,
	rowHeight,
	rowCount,
	overscan,
}: {
	top: number
	viewport: number
	rowHeight: number
	rowCount: number
	overscan: number
}): Range => ({
	start: clamp(Math.floor(top / rowHeight) - overscan, 0, rowCount),
	end: clamp(Math.ceil((top + viewport) / rowHeight) + overscan, 0, rowCount),
})

// One more entry than there are columns: the last one is the total width.
export const columnOffsets = (sizes: number[]) => {
	const offsets = [0]
	for (const size of sizes) offsets.push(offsets[offsets.length - 1]! + size)
	return offsets
}

// The columns that overlap a stretch of the row, and `overscan` more on each side.
export const spanRange = (
	offsets: number[],
	left: number,
	width: number,
	overscan: number
): Range => {
	const count = offsets.length - 1
	let start = 0
	while (start < count && offsets[start + 1]! <= left) start++
	let end = start
	while (end < count && offsets[end]! < left + width) end++

	if (start === count) return { start, end }
	return { start: Math.max(0, start - overscan), end: Math.min(count, end + overscan) }
}

// The nearest scroll position that brings something into view.
export const scrollToShow = (start: number, size: number, current: number, viewport: number) => {
	if (start < current || size > viewport) return start
	if (start + size > current + viewport) return start + size - viewport
	return current
}
