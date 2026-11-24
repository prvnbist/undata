import type { RowWindow } from '@/lib/engine/store'

export const BLOCK_SIZE = 64
const KEEP_BLOCKS = 48

type BlockColumn = { text: string[]; kinds: number[] | null }

// Never changed once made, so that a row can tell from the object alone whether it is out of date.
export type Block = {
	// The place of each row in the source.
	rows: number[]
	columns: ReadonlyMap<string, BlockColumn>
}

type Query = { id: number; rowCount: number }

type Fetch = (
	queryId: number,
	start: number,
	end: number,
	columnIds: string[]
) => Promise<RowWindow[]>

const toColumns = (rows: RowWindow[], columnIds: string[]) =>
	columnIds.map((id, i): [string, BlockColumn] => [
		id,
		{
			text: rows.map(row => row.text[i]!),
			kinds: rows[0]?.kinds ? rows.map(row => row.kinds![i]!) : null,
		},
	])

// The rows near what is on screen, held in blocks. The rest of them stay in the engine.
export const createRowCache = (fetch: Fetch) => {
	let query: Query | null = null
	let blocks = new Map<number, Block>()
	// What the last query showed, so that the grid does not blink while the new rows are on their way.
	let previous = new Map<number, Block>()
	let pending = new Set<string>()
	let version = 0
	const listeners = new Set<() => void>()

	const changed = () => {
		version++
		for (const listener of listeners) listener()
	}

	const request = (index: number, columnIds: string[], asked: Query, inFlight: Set<string>) => {
		const keys = columnIds.map(id => `${index} ${id}`)
		for (const key of keys) inFlight.add(key)
		const done = () => {
			for (const key of keys) inFlight.delete(key)
		}

		const start = index * BLOCK_SIZE
		fetch(asked.id, start, Math.min(start + BLOCK_SIZE, asked.rowCount), columnIds).then(
			rows => {
				done()
				if (query !== asked) return

				const old = blocks.get(index)
				// Put back at the end, which makes the first one the one that was used longest ago.
				blocks.delete(index)
				blocks.set(index, {
					rows: rows.map(row => row.row),
					columns: new Map([...(old?.columns ?? []), ...toColumns(rows, columnIds)]),
				})
				if (blocks.size > KEEP_BLOCKS) blocks.delete(blocks.keys().next().value!)
				previous = new Map()
				changed()
			},
			// A newer query took its place, or the engine stopped, which is reported where it is asked.
			done
		)
	}

	return {
		setQuery(next: Query | null) {
			if (next === query) return
			if (blocks.size > 0) previous = blocks
			query = next
			blocks = new Map()
			pending = new Set()
			changed()
		},

		ensure(start: number, end: number, columnIds: string[]) {
			if (!query) return
			const last = Math.ceil(Math.min(end, query.rowCount) / BLOCK_SIZE)
			for (let index = Math.floor(start / BLOCK_SIZE); index < last; index++) {
				const block = blocks.get(index)
				if (block) {
					blocks.delete(index)
					blocks.set(index, block)
				}
				const missing = columnIds.filter(
					id => !block?.columns.has(id) && !pending.has(`${index} ${id}`)
				)
				if (missing.length > 0) request(index, missing, query, pending)
			}
		},

		block(row: number): Block | undefined {
			const index = Math.floor(row / BLOCK_SIZE)
			return blocks.get(index) ?? previous.get(index)
		},

		version: () => version,

		subscribe: (listener: () => void) => {
			listeners.add(listener)
			return () => void listeners.delete(listener)
		},
	}
}

export type RowCache = ReturnType<typeof createRowCache>
