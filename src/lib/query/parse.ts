import { positionOf, RESERVED, tokenize } from './tokens'
import type { Span, Token } from './tokens'

export type QueryError = Span & { message: string; line: number; column: number }

export type ColumnRef = Span &
	({ by: 'name'; name: string; quoted: boolean } | { by: 'position'; index: number })

// A value as text, the way the column would hold it: `-5`, `2024-01-01`, `true`.
export type Literal = Span & { value: string }

export type AggregateName = 'count' | 'sum' | 'avg' | 'min' | 'max'

// `column` is null for `count(*)`.
export type Aggregate = Span & { fn: AggregateName; column: ColumnRef | null }

export type SelectItem =
	| (Span & { kind: 'star' })
	| (Span & { kind: 'column'; column: ColumnRef })
	| (Span & { kind: 'aggregate'; aggregate: Aggregate })

export type CompareOp = '=' | '<>' | '<' | '<=' | '>' | '>='

export type Condition = Span &
	(
		| { kind: 'compare'; column: ColumnRef; op: CompareOp; value: Literal }
		| { kind: 'in'; column: ColumnRef; not: boolean; values: Literal[] }
		| { kind: 'between'; column: ColumnRef; min: Literal; max: Literal }
		| { kind: 'like'; column: ColumnRef; not: boolean; pattern: Literal }
		| { kind: 'regex'; column: ColumnRef; pattern: Literal }
		| { kind: 'is'; column: ColumnRef; not: boolean; what: 'empty' | 'malformed' }
		| { kind: 'search'; value: Literal }
	)

export type OrderItem = Span & {
	target: { kind: 'column'; column: ColumnRef } | { kind: 'aggregate'; aggregate: Aggregate }
	desc: boolean
}

// Null where the query left the clause out.
export type Query = {
	select: SelectItem[] | null
	where: Condition[]
	groupBy: ColumnRef[] | null
	orderBy: OrderItem[]
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: QueryError }

const AGGREGATES = new Set<string>(['count', 'sum', 'avg', 'min', 'max'])

// Thrown inside the parser only, and always caught by `parseQuery`.
class Stop {
	constructor(
		readonly message: string,
		readonly span: Span
	) {}
}

export const queryError = (source: string, message: string, span: Span): QueryError => ({
	message,
	from: span.from,
	to: Math.max(span.to, span.from),
	...positionOf(source, span.from),
})

const describe = (token: Token | undefined) => (token ? `“${token.text}”` : 'the end')

export const parseQuery = (source: string): Parsed<Query> => {
	const tokens = tokenize(source).filter(
		token => token.kind !== 'space' && token.kind !== 'comment'
	)
	let at = 0
	const end: Span = { from: source.length, to: source.length }

	const peek = (ahead = 0): Token | undefined => tokens[at + ahead]
	const spanOf = (token: Token | undefined): Span => token ?? end
	const stop = (message: string, span: Span = spanOf(peek())): never => {
		throw new Stop(message, span)
	}
	const isWord = (token: Token | undefined, ...words: string[]) =>
		token?.kind === 'word' && words.includes(token.value.toUpperCase())
	const isOp = (token: Token | undefined, ...ops: string[]) =>
		token?.kind === 'op' && ops.includes(token.value)
	const take = () => {
		const token = peek()
		if (!token) return stop('The query ends too soon')
		if (token.open) {
			stop(
				token.kind === 'string'
					? 'This text has no closing quote'
					: 'This name has no closing quote',
				token
			)
		}
		if (token.kind === 'bad') stop(`${describe(token)} has no meaning here`, token)
		at++
		return token
	}
	const expectWord = (word: string, after: string) => {
		if (!isWord(peek(), word)) stop(`Expected ${word} after ${after}`)
		return take()
	}
	const expectOp = (op: string, where: string) => {
		if (!isOp(peek(), op)) stop(`Expected “${op}” ${where}`)
		return take()
	}

	const columnRef = (what = 'a column'): ColumnRef => {
		const token = peek()
		if (token?.kind === 'position') {
			take()
			return { by: 'position', index: Number(token.value), from: token.from, to: token.to }
		}
		if (token?.kind === 'ident') {
			take()
			return { by: 'name', name: token.value, quoted: true, from: token.from, to: token.to }
		}
		if (token?.kind === 'word' && !RESERVED.has(token.value.toUpperCase())) {
			take()
			return { by: 'name', name: token.value, quoted: false, from: token.from, to: token.to }
		}
		if (token?.kind === 'string') {
			return stop(
				`Single quotes are for text. Write a column name in double quotes: "${token.value}"`
			)
		}
		if (token?.kind === 'word') {
			return stop(
				`${describe(token)} is a keyword. A column with this name is written in double quotes`
			)
		}
		return stop(`Expected ${what}, found ${describe(token)}`)
	}

	const literal = (): Literal => {
		const token = peek()
		if (token?.kind === 'string') {
			take()
			return { value: token.value, from: token.from, to: token.to }
		}
		if (token?.kind === 'number') {
			take()
			return { value: token.value, from: token.from, to: token.to }
		}
		if (isOp(token, '-') && peek(1)?.kind === 'number') {
			take()
			const number = take()
			return { value: `-${number.value}`, from: token!.from, to: number.to }
		}
		if (isWord(token, 'TRUE', 'FALSE')) {
			take()
			return { value: token!.value.toLowerCase(), from: token!.from, to: token!.to }
		}
		if (isWord(token, 'NULL')) return stop('Use IS NULL to find empty cells')
		if (token?.kind === 'ident') {
			return stop(`Double quotes name a column. Write text in single quotes: '${token.value}'`)
		}
		if (token?.kind === 'word' || token?.kind === 'position') {
			return stop(
				`Compare with a value, not a column. Write text in single quotes: '${token.text}'`
			)
		}
		return stop(`Expected a value, found ${describe(token)}`)
	}

	// `fn(` is next.
	const isCall = () => peek()?.kind === 'word' && isOp(peek(1), '(')

	const aggregate = (): Aggregate => {
		const name = take()
		const fn = name.value.toLowerCase()
		if (!AGGREGATES.has(fn)) {
			stop(`${name.value}() is not a function here. Use count, sum, avg, min or max`, name)
		}
		take()
		if (isWord(peek(), 'DISTINCT')) stop('DISTINCT is not supported')
		let column: ColumnRef | null = null
		if (isOp(peek(), '*')) {
			const star = take()
			if (fn !== 'count') stop(`${fn}(*) has no meaning. Name a column: ${fn}(amount)`, star)
		} else {
			column = columnRef()
			if (fn === 'count') {
				stop('Only count(*) is supported. It counts the rows of each group', {
					from: name.from,
					to: column.to,
				})
			}
		}
		const close = expectOp(')', `to close ${fn}(`)
		return { fn: fn as AggregateName, column, from: name.from, to: close.to }
	}

	const notAfterItem = () => {
		const token = peek()
		if (isWord(token, 'AS')) stop('Columns cannot be renamed in a query')
		if (
			isOp(token, '-', '+', '*', '/', '.') ||
			token?.kind === 'number' ||
			token?.kind === 'string'
		) {
			stop('Calculations are not supported. List columns and aggregates only')
		}
	}

	const selectItem = (): SelectItem => {
		const token = peek()
		if (isOp(token, '*')) {
			take()
			return { kind: 'star', from: token!.from, to: token!.to }
		}
		if (isCall()) {
			const value = aggregate()
			return { kind: 'aggregate', aggregate: value, from: value.from, to: value.to }
		}
		const column = columnRef('a column, an aggregate or *')
		return { kind: 'column', column, from: column.from, to: column.to }
	}

	const list = <T>(item: () => T): T[] => {
		const items = [item()]
		while (isOp(peek(), ',')) {
			take()
			items.push(item())
		}
		return items
	}

	const condition = (): Condition => {
		const first = peek()
		if (isWord(first, 'NOT')) {
			stop('NOT before a condition is not supported. Use NOT IN, NOT LIKE or IS NOT')
		}
		if (isOp(first, '(')) stop('Parentheses around conditions are not supported yet')
		if (isWord(first, 'SEARCH') && isOp(peek(1), '(')) {
			take()
			take()
			const value = literal()
			const close = expectOp(')', 'to close search(')
			return { kind: 'search', value, from: first!.from, to: close.to }
		}
		if (isCall()) stop('Aggregates can only be used with GROUP BY, in SELECT and ORDER BY')

		const column = columnRef()
		const from = column.from
		const op = peek()

		if (isOp(op, '=', '<>', '!=', '<', '<=', '>', '>=')) {
			take()
			const value = literal()
			const compare = (op!.value === '!=' ? '<>' : op!.value) as CompareOp
			return { kind: 'compare', column, op: compare, value, from, to: value.to }
		}
		if (isOp(op, '~') || isWord(op, 'REGEXP')) {
			take()
			const pattern = literal()
			return { kind: 'regex', column, pattern, from, to: pattern.to }
		}
		if (isWord(op, 'IS')) {
			take()
			const not = isWord(peek(), 'NOT')
			if (not) take()
			const what = peek()
			if (!isWord(what, 'NULL', 'EMPTY', 'MALFORMED')) {
				stop(`Expected NULL, EMPTY or MALFORMED after IS${not ? ' NOT' : ''}`)
			}
			take()
			return {
				kind: 'is',
				column,
				not,
				what: isWord(what, 'MALFORMED') ? 'malformed' : 'empty',
				from,
				to: what!.to,
			}
		}

		const not = isWord(op, 'NOT')
		if (not) take()
		const next = peek()
		if (isWord(next, 'IN')) {
			take()
			expectOp('(', 'after IN')
			const values = isOp(peek(), ')') ? [] : list(literal)
			const close = expectOp(')', 'to close the list')
			return { kind: 'in', column, not, values, from, to: close.to }
		}
		if (isWord(next, 'LIKE', 'ILIKE')) {
			take()
			const pattern = literal()
			return { kind: 'like', column, not, pattern, from, to: pattern.to }
		}
		if (isWord(next, 'BETWEEN')) {
			if (not) stop('NOT BETWEEN is not supported. Use two conditions: x < a AND x > b', next!)
			take()
			const min = literal()
			expectWord('AND', 'the first value of BETWEEN')
			const max = literal()
			return { kind: 'between', column, min, max, from, to: max.to }
		}
		if (not) return stop('Expected IN or LIKE after NOT')
		if (next?.kind === 'bad') return stop(`${describe(next)} has no meaning here`, next)
		if (isOp(next, '-', '+', '*', '/', '.')) {
			return stop('Calculations are not supported. Compare a column with a value', next!)
		}
		return stop(
			`Expected a comparison after ${source.slice(column.from, column.to)}, such as =, IN, LIKE or IS`,
			next ?? end
		)
	}

	const orderItem = (): OrderItem => {
		const target: OrderItem['target'] = isCall()
			? { kind: 'aggregate', aggregate: aggregate() }
			: { kind: 'column', column: columnRef() }
		const from = (target.kind === 'column' ? target.column : target.aggregate).from
		let to = (target.kind === 'column' ? target.column : target.aggregate).to
		let desc = false
		if (isWord(peek(), 'ASC', 'DESC')) {
			const direction = take()
			desc = direction.value.toUpperCase() === 'DESC'
			to = direction.to
		}
		return { target, desc, from, to }
	}

	const unsupported = () => {
		const token = peek()
		if (isWord(token, 'LIMIT', 'OFFSET')) {
			stop(`${token!.value.toUpperCase()} is not supported. Every matching row is shown`)
		}
		if (isWord(token, 'HAVING')) stop('HAVING is not supported. Filter the rows with WHERE')
		if (isWord(token, 'JOIN', 'UNION'))
			stop('A query reads one dataset, so it cannot join others')
		if (isWord(token, 'OR'))
			stop('OR is not supported yet. Conditions can only be joined with AND')
	}

	const query = (): Query => {
		if (tokens.length === 0) stop('Write a query, such as SELECT *')
		const result: Query = { select: null, where: [], groupBy: null, orderBy: [] }

		if (isWord(peek(), 'SELECT')) {
			take()
			if (isWord(peek(), 'DISTINCT')) stop('DISTINCT is not supported. Use GROUP BY instead')
			result.select = list(() => {
				const item = selectItem()
				notAfterItem()
				return item
			})
		}
		if (isWord(peek(), 'FROM')) {
			// The open dataset is the only table, so whatever it is called here is fine.
			take()
			const table = peek()
			if (!table || (table.kind !== 'word' && table.kind !== 'ident')) {
				stop('Expected a table name after FROM')
			}
			take()
			if (isOp(peek(), ',') || isWord(peek(), 'JOIN')) {
				stop('A query reads one dataset, so it cannot join others')
			}
		}
		if (isWord(peek(), 'WHERE')) {
			take()
			result.where.push(condition())
			for (;;) {
				unsupported()
				if (!isWord(peek(), 'AND')) break
				take()
				result.where.push(condition())
			}
		}
		if (isWord(peek(), 'GROUP')) {
			const group = take()
			expectWord('BY', group.value)
			result.groupBy = list(() => columnRef())
		}
		unsupported()
		if (isWord(peek(), 'ORDER')) {
			const order = take()
			expectWord('BY', order.value)
			result.orderBy = list(orderItem)
		}
		unsupported()
		if (isOp(peek(), ';')) take()

		const rest = peek()
		if (rest) {
			if (isOp(rest, ';')) stop('Only one query can run at a time')
			if (isWord(rest, 'SELECT')) stop('Only one query can run at a time')
			if (isWord(rest, 'WHERE', 'GROUP', 'ORDER', 'FROM')) {
				stop(
					`${rest.value.toUpperCase()} is out of place. The order is SELECT, FROM, WHERE, GROUP BY, ORDER BY`
				)
			}
			take()
			stop(`${describe(rest)} has no meaning here`, rest)
		}
		return result
	}

	try {
		return { ok: true, value: query() }
	} catch (error) {
		if (!(error instanceof Stop)) throw error
		return { ok: false, error: queryError(source, error.message, error.span) }
	}
}
