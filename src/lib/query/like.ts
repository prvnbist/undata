import { escapeRegExp } from '@/lib/engine/match'

// LIKE patterns: `%` is any run of characters, `_` is one character, and a backslash makes the next
// character itself. Like the filters, they ignore case.

type Piece = { kind: 'text'; text: string } | { kind: 'any' } | { kind: 'one' }

const pieces = (pattern: string): Piece[] => {
	const out: Piece[] = []
	const text = (char: string) => {
		const last = out[out.length - 1]
		if (last?.kind === 'text') last.text += char
		else out.push({ kind: 'text', text: char })
	}
	for (let at = 0; at < pattern.length; at++) {
		const char = pattern[at]!
		if (char === '\\' && at + 1 < pattern.length) text(pattern[++at]!)
		else if (char === '%') out.push({ kind: 'any' })
		else if (char === '_') out.push({ kind: 'one' })
		else text(char)
	}
	return out
}

// `%text%` is the `contains` filter. Anything else is a regular expression over the whole cell.
export const likeToTest = (
	pattern: string
): { op: 'contains'; value: string } | { op: 'regex'; value: string } => {
	const parts = pieces(pattern)
	const [first, middle, last] = parts
	if (
		parts.length === 3 &&
		first!.kind === 'any' &&
		middle!.kind === 'text' &&
		last!.kind === 'any'
	) {
		return { op: 'contains', value: middle.text }
	}
	const body = parts
		.map(part =>
			part.kind === 'text' ? escapeRegExp(part.text) : part.kind === 'any' ? '.*' : '.'
		)
		.join('')
	return { op: 'regex', value: `/^${body}$/is` }
}

export const escapeLike = (text: string) => text.replace(/[%_\\]/g, String.raw`\$&`)

const SPECIAL = new Set('.*+?^${}()|[]\\/')

// The LIKE pattern a regular expression was made from by `likeToTest`, or null for any other one.
export const regexToLike = (regex: string): string | null => {
	const [, body] = /^\/\^(.*)\$\/is$/s.exec(regex) ?? []
	if (body === undefined) return null

	let like = ''
	for (let at = 0; at < body.length; at++) {
		const char = body[at]!
		if (char === '\\') {
			const next = body[at + 1]
			if (next === undefined || !SPECIAL.has(next)) return null
			like += escapeLike(next)
			at++
		} else if (char === '.') {
			if (body[at + 1] === '*') {
				like += '%'
				at++
			} else like += '_'
		} else if (SPECIAL.has(char)) {
			return null
		} else like += escapeLike(char)
	}
	return like
}
