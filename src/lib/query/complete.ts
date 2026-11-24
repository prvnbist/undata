import type { QueryColumn } from './compile'
import { columnName } from './print'
import { tokenize } from './tokens'

export type Completion = {
	label: string
	// What replaces the word being typed.
	insert: string
	kind: 'column' | 'keyword' | 'function'
	// Shown beside the label: a column's type.
	detail?: string
}

export type Completions = { from: number; to: number; items: Completion[] }

const KEYWORDS = [
	'SELECT',
	'FROM',
	'WHERE',
	'AND',
	'GROUP BY',
	'ORDER BY',
	'ASC',
	'DESC',
	'IN',
	'NOT',
	'IS',
	'NULL',
	'MALFORMED',
	'BETWEEN',
	'LIKE',
	'TRUE',
	'FALSE',
]
const FUNCTIONS = ['count(*)', 'sum(', 'avg(', 'min(', 'max(', 'search(']

const WORD = /[\p{L}\p{N}_]/u

// What can be written in place of the word the cursor is in or just after. Nothing inside text or a
// comment, and nothing for an empty word unless `force` asks for everything.
export const completionsAt = (
	source: string,
	cursor: number,
	columns: QueryColumn[],
	{ force = false, limit = 8 } = {}
): Completions | null => {
	const token = tokenize(source).find(token => token.from < cursor && cursor <= token.to)
	if (token && (token.kind === 'string' || token.kind === 'comment')) return null

	let from = cursor
	let prefix: string
	if (token?.kind === 'ident') {
		// A name in quotes, open or closed: what is typed so far, after the quote.
		from = token.from
		prefix = source.slice(token.from + 1, cursor).replaceAll('""', '"')
	} else {
		while (from > 0 && WORD.test(source[from - 1]!)) from--
		prefix = source.slice(from, cursor)
	}
	let to = cursor
	if (token?.kind === 'ident') to = token.to
	else while (to < source.length && WORD.test(source[to]!)) to++

	if (prefix === '' && !force) return null
	// A number is a value, not the start of a name.
	if (/^[0-9]/.test(prefix)) return null

	const lower = prefix.toLowerCase()
	const quotedOnly = token?.kind === 'ident'
	const rank = (text: string) => {
		const at = text.toLowerCase().indexOf(lower)
		return at === 0 ? 0 : at > 0 ? 1 : -1
	}

	const scored: { item: Completion; score: number; at: number }[] = []
	const add = (item: Completion, score: number) => {
		if (score < 0) return
		scored.push({ item, score, at: scored.length })
	}

	for (const column of columns) {
		const score = rank(column.title)
		add(
			{
				label: column.title,
				insert: quotedOnly
					? `"${column.title.replaceAll('"', '""')}"`
					: columnName(column, columns),
				kind: 'column',
				detail: column.type,
			},
			score
		)
	}
	if (!quotedOnly) {
		for (const keyword of KEYWORDS) {
			// The whole word is already there.
			if (keyword.toLowerCase() === lower) continue
			add(
				{ label: keyword, insert: keyword, kind: 'keyword' },
				keyword.toLowerCase().startsWith(lower) ? 2 : -1
			)
		}
		for (const fn of FUNCTIONS) {
			add({ label: fn, insert: fn, kind: 'function' }, fn.startsWith(lower) ? 2 : -1)
		}
	}

	const items = scored
		.sort((a, b) => a.score - b.score || a.at - b.at)
		.slice(0, limit)
		.map(entry => entry.item)
	return items.length ? { from, to, items } : null
}
