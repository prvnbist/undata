import type { EngineColumn } from './store'

// Each distinct text once, and for every row which one it has. Counting and grouping a million rows is
// then arithmetic on integers. Built the first time it is needed and kept, because text never changes.
export type Dictionary = { codes: Uint32Array; values: string[] }

const EMPTY_SLOT = -1

const seed = Math.floor(Math.random() * 0x7fffffff)

const hashOf = (text: string) => {
	let hash = seed
	for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
	return hash ^ (hash >>> 15)
}

// A hash table of its own, not a Map or a Set: in Chromium 159 a Map lookup that has once seen
// integer-like strings takes microseconds for every other string from then on, which is seconds per
// column.
export const createInterner = () => {
	const values: string[] = []
	let capacity = 1024
	let slots = new Int32Array(capacity).fill(EMPTY_SLOT)
	let hashes = new Int32Array(capacity / 2)

	const grow = () => {
		capacity *= 4
		slots = new Int32Array(capacity).fill(EMPTY_SLOT)
		const bigger = new Int32Array(capacity / 2)
		bigger.set(hashes)
		hashes = bigger

		for (let code = 0; code < values.length; code++) {
			let slot = hashes[code]! & (capacity - 1)
			while (slots[slot] !== EMPTY_SLOT) slot = (slot + 1) & (capacity - 1)
			slots[slot] = code
		}
	}

	// The slot the text is in, or the empty one it would go in.
	const slotFor = (text: string, hash: number) => {
		let slot = hash & (capacity - 1)
		for (;;) {
			const code = slots[slot]!
			if (code === EMPTY_SLOT || (hashes[code] === hash && values[code] === text)) return slot
			slot = (slot + 1) & (capacity - 1)
		}
	}

	return {
		values,
		// Its code, given out from 0 in order of first appearance.
		intern(text: string) {
			const hash = hashOf(text)
			const slot = slotFor(text, hash)
			const found = slots[slot]!
			if (found !== EMPTY_SLOT) return found

			const code = values.length
			slots[slot] = code
			hashes[code] = hash
			values.push(text)
			if (values.length * 2 >= capacity) grow()
			return code
		},
		has: (text: string) => slots[slotFor(text, hashOf(text))] !== EMPTY_SLOT,
	}
}

export const encode = (text: string[]): Dictionary => {
	const codes = new Uint32Array(text.length)
	const interner = createInterner()
	for (let i = 0; i < text.length; i++) codes[i] = interner.intern(text[i]!)
	return { codes, values: interner.values }
}

export const dictionaryOf = (column: EngineColumn): Dictionary =>
	(column.dictionary ??= encode(column.text))
