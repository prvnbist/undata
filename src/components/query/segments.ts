import { CONTEXTUAL, RESERVED, tokenize } from '@/lib/query/tokens'
import type { Span, TokenKind } from '@/lib/query/tokens'

export type SegmentKind = TokenKind | 'keyword' | 'function'

// A run of the source to colour one way. `error` marks the part an error is about.
export type Segment = { text: string; kind: SegmentKind; error: boolean }

const FUNCTIONS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'SEARCH'])

// The source cut into runs that each have one colour, cut again where an error starts and ends. An
// error with no width, such as one at the end, gets a space to underline.
export const segmentsOf = (source: string, error: Span | null): Segment[] => {
	const tokens = tokenize(source)
	const out: Segment[] = []
	const cuts = error ? [error.from, error.to] : []

	tokens.forEach((token, i) => {
		const upper = token.value.toUpperCase()
		const next = tokens.slice(i + 1).find(other => other.kind !== 'space')
		const kind: SegmentKind =
			token.kind !== 'word'
				? token.kind
				: FUNCTIONS.has(upper) && next?.text === '('
					? 'function'
					: RESERVED.has(upper) || (CONTEXTUAL.has(upper) && !FUNCTIONS.has(upper))
						? 'keyword'
						: 'word'
		const points = [
			token.from,
			...cuts.filter(cut => cut > token.from && cut < token.to),
			token.to,
		]
		for (let p = 0; p < points.length - 1; p++) {
			const from = points[p]!
			const to = points[p + 1]!
			const marked = !!error && from >= error.from && to <= error.to && error.to > error.from
			out.push({ text: source.slice(from, to), kind, error: marked })
		}
	})
	if (error && error.from === error.to) {
		const at = out.reduce((length, segment) => length + segment.text.length, 0)
		if (error.from >= at) out.push({ text: ' ', kind: 'space', error: true })
	}
	return out
}
