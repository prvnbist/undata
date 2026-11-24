// The pieces of a query, each with where it is in the source. Every character belongs to exactly one
// token, so the editor can colour the text from the same list the parser reads.

export type TokenKind =
	| 'word'
	// A name in double quotes.
	| 'ident'
	// Text in single quotes.
	| 'string'
	| 'number'
	// `$3`, a column by its position.
	| 'position'
	| 'op'
	| 'space'
	| 'comment'
	// A character that has no place in a query.
	| 'bad'

export type Token = {
	kind: TokenKind
	// As written.
	text: string
	// What it means: a string or name without its quotes, a word as written.
	value: string
	from: number
	to: number
	// A string or name with no closing quote.
	open?: boolean
}

export type Span = { from: number; to: number }

const WORD_START = /[\p{L}_]/u
const WORD = /[\p{L}\p{N}_]/u
const DIGIT = /[0-9]/
const NUMBER = /^[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/
const OPS = [
	'<>',
	'!=',
	'<=',
	'>=',
	'=',
	'<',
	'>',
	'~',
	',',
	'(',
	')',
	';',
	'*',
	'-',
	'+',
	'/',
	'.',
]

// Reads a quoted run, where the quote written twice stands for itself.
const quoted = (source: string, from: number, quote: string) => {
	let value = ''
	let at = from + 1
	while (at < source.length) {
		const char = source[at]!
		if (char === quote) {
			if (source[at + 1] === quote) {
				value += quote
				at += 2
				continue
			}
			return { value, to: at + 1, open: false }
		}
		value += char
		at++
	}
	return { value, to: at, open: true }
}

export const tokenize = (source: string): Token[] => {
	const tokens: Token[] = []
	let at = 0
	const push = (kind: TokenKind, to: number, value = source.slice(at, to), open?: boolean) => {
		tokens.push({
			kind,
			text: source.slice(at, to),
			value,
			from: at,
			to,
			...(open ? { open } : {}),
		})
		at = to
	}

	while (at < source.length) {
		const char = source[at]!

		if (/\s/.test(char)) {
			let to = at + 1
			while (to < source.length && /\s/.test(source[to]!)) to++
			push('space', to)
		} else if (char === '-' && source[at + 1] === '-') {
			const end = source.indexOf('\n', at)
			push('comment', end === -1 ? source.length : end)
		} else if (char === "'" || char === '"') {
			const { value, to, open } = quoted(source, at, char)
			push(char === "'" ? 'string' : 'ident', to, value, open)
		} else if (DIGIT.test(char)) {
			push('number', at + NUMBER.exec(source.slice(at))![0].length)
		} else if (char === '$' && DIGIT.test(source[at + 1] ?? '')) {
			let to = at + 1
			while (to < source.length && DIGIT.test(source[to]!)) to++
			push('position', to, source.slice(at + 1, to))
		} else if (WORD_START.test(char)) {
			let to = at + 1
			while (to < source.length && WORD.test(source[to]!)) to++
			push('word', to)
		} else {
			const op = OPS.find(candidate => source.startsWith(candidate, at))
			push(op ? 'op' : 'bad', at + (op?.length ?? 1))
		}
	}
	return tokens
}

// Lines and columns count from 1, the way an editor shows them.
export const positionOf = (source: string, offset: number) => {
	const before = source.slice(0, offset)
	const line = before.split('\n').length
	return { line, column: offset - before.lastIndexOf('\n') }
}

// Words the parser gives a meaning to wherever they appear. A column with one of these titles has to be
// written in double quotes.
export const RESERVED = new Set([
	'SELECT',
	'FROM',
	'WHERE',
	'AND',
	'OR',
	'NOT',
	'IN',
	'IS',
	'NULL',
	'BETWEEN',
	'LIKE',
	'ILIKE',
	'REGEXP',
	'GROUP',
	'BY',
	'ORDER',
	'ASC',
	'DESC',
	'LIMIT',
	'OFFSET',
	'HAVING',
	'AS',
	'TRUE',
	'FALSE',
	'JOIN',
	'UNION',
	'DISTINCT',
])

// Meaningful in one place only, so a column may be called this. Printing still quotes them.
export const CONTEXTUAL = new Set([
	'EMPTY',
	'MALFORMED',
	'COUNT',
	'SUM',
	'AVG',
	'MIN',
	'MAX',
	'SEARCH',
])

export const isBareName = (name: string) => {
	if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)) return false
	const upper = name.toUpperCase()
	return !RESERVED.has(upper) && !CONTEXTUAL.has(upper)
}
