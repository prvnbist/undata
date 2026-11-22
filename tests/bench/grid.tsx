import { createRoot } from 'react-dom/client'

import { DataGrid } from '@/components/grid/DataGrid'
import { importDataset } from '@/store/session'
import '@/styles.css'
import { makeFixture, makeWideFixture } from './fixture'

const rows = Number(new URLSearchParams(location.search).get('rows') ?? 1_000_000)

const frame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const grid = () => document.querySelector<HTMLElement>('[role=grid]')!
const wheel = (deltaY: number, deltaX = 0) =>
	grid().dispatchEvent(
		new WheelEvent('wheel', { deltaY, deltaX, bubbles: true, cancelable: true })
	)

let longest = 0
new PerformanceObserver(list => {
	for (const entry of list.getEntries()) longest = Math.max(longest, entry.duration)
}).observe({ type: 'longtask', buffered: false })

// Takes a step each frame, and says how long the slowest frame and the longest task were.
const scroll = async (steps: number, step: (i: number) => void) => {
	await pause(300)
	longest = 0
	const times: number[] = []
	let last = await frame()
	for (let i = 0; i < steps; i++) {
		step(i)
		const now = await frame()
		times.push(now - last)
		last = now
	}
	// The observer reports a little late.
	await pause(300)
	const sorted = times.toSorted((a, b) => a - b)
	return {
		frames: steps,
		frameP95: Math.round(sorted[Math.floor(steps * 0.95)]!),
		frameMax: Math.round(sorted.at(-1)!),
		longestTaskMs: Math.round(longest),
	}
}

const show = async (blob: Blob, name: string) => {
	const { done } = importDataset({ blob, name })
	await done
	await pause(500)
}

const run = async () => {
	const tall = makeFixture(rows)
	const wide = makeWideFixture()
	createRoot(document.getElementById('app')!).render(<DataGrid />)

	const start = performance.now()
	await importDataset({ blob: tall, name: tall.name }).done
	while (!document.querySelector('[role=gridcell]')?.textContent) await frame()
	const openToRowsMs = Math.round(performance.now() - start)
	await pause(500)

	const height = grid().scrollHeight
	const slow = await scroll(300, () => wheel(40))
	const fast = await scroll(300, () => wheel(1500))
	const jumps = await scroll(200, i => (grid().scrollTop = ((i * 7919) % 1000) * (height / 1000)))
	grid().scrollTop = height
	await pause(500)
	const lastCell = [...document.querySelectorAll('[role=row]')].at(-1)?.textContent?.slice(0, 20)

	await show(wide, wide.name)
	const sideways = await scroll(300, () => (grid().scrollLeft += 100))
	const diagonal = await scroll(300, i => {
		grid().scrollTop += 200
		grid().scrollLeft = (i * 400) % grid().scrollWidth
	})

	return { openToRowsMs, height, slow, fast, jumps, lastCell, sideways, diagonal }
}

run().then(
	result => Object.assign(window, { __bench: result }),
	(error: unknown) => Object.assign(window, { __bench: { error: String(error) } })
)
