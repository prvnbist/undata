import { aggregateKey } from '@/lib/engine/group'
import { isKeyed } from '@/lib/engine/store'
import type { Filter, ViewState } from '@/lib/engine/view'

import { resolveColumn } from './compile'
import type { QueryColumn } from './compile'
import { escapeLike, regexToLike } from './like'
import { isBareName } from './tokens'

// How a column is written so that it reads back as that column: bare when it can be, in double quotes
// when it must, and by position when two columns share the title.
export const columnName = (column: QueryColumn, columns: QueryColumn[]) => {
	const span = { from: 0, to: 0 }
	const finds = (ref: Parameters<typeof resolveColumn>[0]) => {
		const found = resolveColumn(ref, columns)
		return 'column' in found && found.column === column
	}
	if (
		isBareName(column.title) &&
		finds({ by: 'name', name: column.title, quoted: false, ...span })
	) {
		return column.title
	}
	if (finds({ by: 'name', name: column.title, quoted: true, ...span })) {
		return `"${column.title.replaceAll('"', '""')}"`
	}
	return `$${columns.indexOf(column) + 1}`
}

export const quoteText = (text: string) => `'${text.replaceAll("'", "''")}'`

const PLAIN_NUMBER = /^-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/

// A number or a boolean as it reads back exactly; anything else as text.
const literal = (value: string, column: QueryColumn) => {
	if (column.type === 'number' && PLAIN_NUMBER.test(value)) return value
	if (column.type === 'boolean' && (value === 'true' || value === 'false'))
		return value.toUpperCase()
	return quoteText(value)
}

const SYMBOL = { eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' } as const

const condition = (filter: Filter, column: QueryColumn, name: string): string => {
	const value = (text: string) => literal(text, column)
	const list = (values: string[]) => `(${values.map(value).join(', ')})`
	const keyed = isKeyed(column.type)

	switch (filter.op) {
		case 'eq':
		case 'ne':
		case 'gt':
		case 'gte':
		case 'lt':
		case 'lte':
			return `${name} ${SYMBOL[filter.op]} ${value(filter.value)}`
		case 'anyOf':
			return !keyed && filter.values.length === 1
				? `${name} = ${value(filter.values[0]!)}`
				: `${name} IN ${list(filter.values)}`
		case 'noneOf':
			return !keyed && filter.values.length === 1
				? `${name} <> ${value(filter.values[0]!)}`
				: `${name} NOT IN ${list(filter.values)}`
		case 'between':
			// A histogram bar leaves its top out, which BETWEEN cannot say.
			return filter.includeMax
				? `${name} BETWEEN ${value(filter.min)} AND ${value(filter.max)}`
				: `${name} >= ${value(filter.min)} AND ${name} < ${value(filter.max)}`
		case 'contains':
			return `${name} LIKE ${quoteText(`%${escapeLike(filter.value)}%`)}`
		case 'notContains':
			return `${name} NOT LIKE ${quoteText(`%${escapeLike(filter.value)}%`)}`
		case 'regex': {
			const like = regexToLike(filter.value)
			return like === null
				? `${name} ~ ${quoteText(filter.value)}`
				: `${name} LIKE ${quoteText(like)}`
		}
		case 'empty':
			return `${name} IS NULL`
		case 'notEmpty':
			return `${name} IS NOT NULL`
		case 'malformed':
			return `${name} IS MALFORMED`
		case 'notMalformed':
			return `${name} IS NOT MALFORMED`
	}
}

// The view as the query that makes it, one clause to a line. What SQL cannot say, such as widths, is
// left out. Filters on columns that are gone are left out too, as the engine ignores them.
export const printQuery = (view: ViewState, columns: QueryColumn[]): string => {
	const byId = new Map(columns.map(column => [column.id, column]))
	const name = (id: string) => {
		const column = byId.get(id)
		return column ? columnName(column, columns) : null
	}
	const lines: string[] = []
	const grouping = view.grouping?.by.length ? view.grouping : null

	if (grouping) {
		const aggregates = grouping.aggregates.flatMap(aggregate => {
			const column = name(aggregate.columnId)
			return column ? [`${aggregate.fn}(${column})`] : []
		})
		const by = grouping.by.flatMap(id => name(id) ?? [])
		lines.push(`SELECT ${[...by, 'count(*)', ...aggregates].join(', ')}`)
	} else {
		const shown = view.columns.filter(column => !column.hidden && byId.has(column.id))
		const all = shown.length === view.columns.filter(column => byId.has(column.id)).length
		lines.push(`SELECT ${all ? '*' : shown.map(column => name(column.id)!).join(', ')}`)
	}

	const conditions = view.filters.flatMap(filter => {
		const column = byId.get(filter.columnId)
		return column ? [condition(filter, column, columnName(column, columns))] : []
	})
	if (view.search !== '') conditions.push(`search(${quoteText(view.search)})`)
	if (conditions.length) lines.push(`WHERE ${conditions.join('\n  AND ')}`)

	if (grouping) {
		lines.push(`GROUP BY ${grouping.by.flatMap(id => name(id) ?? []).join(', ')}`)
		const byKey = new Map(
			grouping.aggregates.map(aggregate => [aggregateKey(aggregate), aggregate] as const)
		)
		const order = grouping.sort.flatMap(({ key, desc }) => {
			const aggregate = byKey.get(key)
			const of = aggregate && name(aggregate.columnId)
			const target =
				key === 'count' ? 'count(*)' : aggregate ? of && `${aggregate.fn}(${of})` : name(key)
			return target ? [`${target}${desc ? ' DESC' : ''}`] : []
		})
		if (order.length) lines.push(`ORDER BY ${order.join(', ')}`)
	} else {
		const order = view.sort.flatMap(({ columnId, desc }) => {
			const column = name(columnId)
			return column ? [`${column}${desc ? ' DESC' : ''}`] : []
		})
		if (order.length) lines.push(`ORDER BY ${order.join(', ')}`)
	}
	return lines.join('\n')
}
