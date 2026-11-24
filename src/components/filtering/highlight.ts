import { caseInsensitive } from '@/lib/engine/match'

export type Part = { text: string; match: boolean }

// Splits text where the search matches it, the same way the engine matched it: case-insensitive and
// literal. The parts joined together are the text as written.
export const highlightParts = (text: string, needle: string): Part[] => {
	if (text === '') return []
	if (needle === '') return [{ text, match: false }]

	const parts: Part[] = []
	let at = 0
	for (const found of text.matchAll(caseInsensitive(needle, 'g'))) {
		if (found.index > at) parts.push({ text: text.slice(at, found.index), match: false })
		parts.push({ text: found[0], match: true })
		at = found.index + found[0].length
	}
	if (at < text.length) parts.push({ text: text.slice(at), match: false })
	return parts
}
