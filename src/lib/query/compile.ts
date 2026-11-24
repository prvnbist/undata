import type { DataType } from '@/lib/constants'
import { checkFilter } from '@/lib/engine/filter'
import { aggregateKey, aggregatesFor } from '@/lib/engine/group'
import { isKeyed } from '@/lib/engine/store'
import type {
	Aggregate,
	Filter,
	FilterTest,
	Grouping,
	GroupSortKey,
	SortKey,
	ViewColumn,
	ViewState,
} from '@/lib/engine/view'

import { likeToTest } from './like'
import { parseQuery, queryError } from './parse'
import type {
	Aggregate as AggregateNode,
	ColumnRef,
	Condition,
	Parsed,
	Query,
	QueryError,
	SelectItem,
} from './parse'
import type { Span } from './tokens'

// What a query needs to know of a column. `ColumnInfo` is one.
export type QueryColumn = { id: string; title: string; type: DataType }

class Stop {
	constructor(
		readonly message: string,
		readonly span: Span
	) {}
}

const stop = (message: string, span: Span): never => {
	throw new Stop(message, span)
}

// A name matches a title ignoring case. When that finds more than one, the exact title decides.
export const resolveColumn = (
	ref: ColumnRef,
	columns: QueryColumn[]
): { column: QueryColumn } | { problem: string } => {
	if (ref.by === 'position') {
		const column = columns[ref.index - 1]
		return column
			? { column }
			: {
					problem: `There is no column $${ref.index}. Columns are counted from $1 to $${columns.length}`,
				}
	}
	const lower = ref.name.toLowerCase()
	const loose = columns.filter(column => column.title.toLowerCase() === lower)
	const exact = loose.filter(column => column.title === ref.name)
	const found = loose.length === 1 ? loose : exact
	if (found.length === 1) return { column: found[0]! }
	if (loose.length === 0) return { problem: `There is no column called “${ref.name}”` }
	const first = columns.indexOf((exact[0] ?? loose[0])!) + 1
	return {
		problem: `More than one column is called “${ref.name}”. Name one by its position, like $${first}`,
	}
}

type Context = { columns: QueryColumn[] }

const columnOf = ({ columns }: Context, ref: ColumnRef) => {
	const found = resolveColumn(ref, columns)
	return 'column' in found ? found.column : stop(found.problem, ref)
}

const compare = { '<': 'lt', '<=': 'lte', '>': 'gt', '>=': 'gte' } as const

// The filter test, and the part of the query to blame when its operand does not fit.
const testOf = (condition: Exclude<Condition, { kind: 'search' }>, type: DataType) => {
	const keyed = isKeyed(type)
	switch (condition.kind) {
		case 'compare': {
			const { op, value } = condition
			// On text, `=` is about the text as written, so it is the same as picking that value.
			if (op === '=') {
				const test: FilterTest = keyed
					? { op: 'eq', value: value.value }
					: { op: 'anyOf', values: [value.value] }
				return { test, blame: value as Span }
			}
			if (op === '<>') {
				const test: FilterTest = keyed
					? { op: 'ne', value: value.value }
					: { op: 'noneOf', values: [value.value] }
				return { test, blame: value as Span }
			}
			return {
				test: { op: compare[op], value: value.value } as FilterTest,
				blame: value as Span,
			}
		}
		case 'in':
			return {
				test: {
					op: condition.not ? 'noneOf' : 'anyOf',
					values: condition.values.map(value => value.value),
				} as FilterTest,
				blame: condition as Span,
			}
		case 'between':
			return {
				test: {
					op: 'between',
					min: condition.min.value,
					max: condition.max.value,
					includeMax: true,
				} as FilterTest,
				blame: { from: condition.min.from, to: condition.max.to },
			}
		case 'like': {
			const test = likeToTest(condition.pattern.value)
			if (!condition.not) return { test: test as FilterTest, blame: condition.pattern as Span }
			if (test.op !== 'contains') {
				return stop("NOT LIKE only works as NOT LIKE '%text%'", condition.pattern)
			}
			return {
				test: { op: 'notContains', value: test.value } as FilterTest,
				blame: condition.pattern as Span,
			}
		}
		case 'regex':
			return {
				test: { op: 'regex', value: condition.pattern.value } as FilterTest,
				blame: condition.pattern as Span,
			}
		case 'is': {
			const op =
				condition.what === 'empty'
					? condition.not
						? 'notEmpty'
						: 'empty'
					: condition.not
						? 'notMalformed'
						: 'malformed'
			return { test: { op } as FilterTest, blame: condition as Span }
		}
	}
}

const filterOf = (context: Context, condition: Exclude<Condition, { kind: 'search' }>): Filter => {
	const column = columnOf(context, condition.column)
	const { test, blame } = testOf(condition, column.type)
	const problem = checkFilter(column.type, test)
	// An empty list matches nothing, which is a filter the engine runs.
	if (problem && test.op !== 'anyOf' && test.op !== 'noneOf') {
		stop(`${column.title}: ${problem}`, blame)
	}
	return { columnId: column.id, ...test }
}

const once = <T>(seen: Set<string>, key: string, span: Span, message: string, value: T) => {
	if (seen.has(key)) stop(message, span)
	seen.add(key)
	return value
}

// Every column of the dataset once, in the view's order, with any the view never knew at the end.
const complete = (base: ViewColumn[], ids: string[]): ViewColumn[] => {
	const listed = new Set(base.map(column => column.id))
	return [
		...base,
		...ids.filter(id => !listed.has(id)).map(id => ({ id, hidden: false, size: null })),
	]
}

// The places of the columns a query shows are filled in the order it lists them. The rest keep their
// places and are hidden, so a query that changes nothing moves nothing. Null shows every column.
const arrange = (columns: ViewColumn[], shown: string[] | null): ViewColumn[] => {
	if (!shown) return columns.map(column => (column.hidden ? { ...column, hidden: false } : column))
	const wanted = new Set(shown)
	const byId = new Map(columns.map(column => [column.id, column]))
	const queue = [...shown]
	return columns.map(column => {
		if (!wanted.has(column.id)) return column.hidden ? column : { ...column, hidden: true }
		const placed = byId.get(queue.shift()!)!
		return placed.hidden ? { ...placed, hidden: false } : placed
	})
}

const aggregateOf = (context: Context, node: AggregateNode): Aggregate | 'count' => {
	if (node.fn === 'count') return 'count'
	const column = columnOf(context, node.column!)
	if (!aggregatesFor(column.type).includes(node.fn)) {
		const can = aggregatesFor(column.type)
		stop(
			can.length
				? `${node.fn}() does not work on ${column.title}, a ${column.type} column. It can have ${can.join(', ')}`
				: `${column.title} is a ${column.type} column, so it has no ${node.fn}()`,
			node
		)
	}
	return { columnId: column.id, fn: node.fn }
}

const grouped = (context: Context, query: Query, by: string[]): Grouping => {
	const aggregates: Aggregate[] = []
	const seen = new Set<string>()
	const grouping = new Set(by)

	for (const item of query.select ?? []) {
		if (item.kind === 'star') {
			return stop('With GROUP BY, list the grouped columns and aggregates instead of *', item)
		}
		if (item.kind === 'column') {
			const column = columnOf(context, item.column)
			if (!grouping.has(column.id)) {
				stop(
					`${column.title} is not in GROUP BY. Group by it, or take an aggregate of it`,
					item
				)
			}
			continue
		}
		const aggregate = aggregateOf(context, item.aggregate)
		if (aggregate === 'count') continue
		aggregates.push(
			once(seen, aggregateKey(aggregate), item, 'This aggregate is listed twice', aggregate)
		)
	}

	const keys = new Set(aggregates.map(aggregateKey))
	const sorted = new Set<string>()
	const sort = query.orderBy.map(({ target, desc, from, to }): GroupSortKey => {
		let key: string
		if (target.kind === 'column') {
			const column = columnOf(context, target.column)
			if (!grouping.has(column.id)) {
				stop(
					`${column.title} is not in GROUP BY, so the groups cannot be sorted by it`,
					target.column
				)
			}
			key = column.id
		} else {
			const aggregate = aggregateOf(context, target.aggregate)
			key = aggregate === 'count' ? 'count' : aggregateKey(aggregate)
			if (key !== 'count' && !keys.has(key)) {
				stop('Add this aggregate to SELECT to sort by it', target.aggregate)
			}
		}
		return once(sorted, key, { from, to }, 'The groups are already sorted by this', { key, desc })
	})
	return { by, aggregates, sort }
}

const compile = (query: Query, context: Context, base: ViewState): ViewState => {
	let search = ''
	let searched: Span | null = null
	const filters: Filter[] = []
	for (const condition of query.where) {
		if (condition.kind === 'search') {
			if (searched) stop('Only one search() can be used', condition)
			searched = condition
			search = condition.value.value
		} else {
			filters.push(filterOf(context, condition))
		}
	}

	const ids = context.columns.map(column => column.id)

	if (query.groupBy) {
		const seen = new Set<string>()
		const by = query.groupBy.map(ref => {
			const { id } = columnOf(context, ref)
			return once(seen, id, ref, 'This column is grouped by twice', id)
		})
		return {
			...base,
			search,
			filters,
			grouping: grouped(context, query, by),
			columns: complete(base.columns, ids),
		}
	}

	const select: SelectItem[] = query.select ?? []
	const everyColumn = select.length === 0 || (select.length === 1 && select[0]!.kind === 'star')
	const shownSeen = new Set<string>()
	const shown = everyColumn
		? null
		: select.map(item => {
				if (item.kind === 'star') return stop('* cannot be listed with other columns', item)
				if (item.kind === 'aggregate') {
					return stop(`${item.aggregate.fn}() needs GROUP BY to know what to group`, item)
				}
				const column = columnOf(context, item.column)
				return once(shownSeen, column.id, item, `${column.title} is listed twice`, column.id)
			})

	const sorted = new Set<string>()
	const sort = query.orderBy.map(({ target, desc, from, to }): SortKey => {
		if (target.kind === 'aggregate') {
			return stop(
				`${target.aggregate.fn}() needs GROUP BY to know what to group`,
				target.aggregate
			)
		}
		const column = columnOf(context, target.column)
		return once(
			sorted,
			column.id,
			{ from, to },
			`The rows are already sorted by ${column.title}`,
			{
				columnId: column.id,
				desc,
			}
		)
	})

	return {
		...base,
		search,
		filters,
		sort,
		grouping: null,
		columns: arrange(complete(base.columns, ids), shown),
	}
}

// The view a query asks for. What SQL has no words for, such as widths, comes from `base`.
export const compileQuery = (
	source: string,
	columns: QueryColumn[],
	base: ViewState
): Parsed<ViewState> => {
	const parsed = parseQuery(source)
	if (!parsed.ok) return parsed
	try {
		return { ok: true, value: compile(parsed.value, { columns }, base) }
	} catch (error) {
		if (!(error instanceof Stop)) throw error
		const problem: QueryError = queryError(source, error.message, error.span)
		return { ok: false, error: problem }
	}
}
