import { describe, expect, test } from 'vite-plus/test'

import { parseQuery } from './parse'

const parsed = (source: string) => {
	const result = parseQuery(source)
	if (!result.ok) throw new Error(result.error.message)
	return result.value
}

const failure = (source: string) => {
	const result = parseQuery(source)
	if (result.ok) throw new Error(`parsed: ${source}`)
	return result.error
}

describe('parseQuery', () => {
	test('reads every clause, in any case, with or without FROM and a semicolon', () => {
		const query = parsed(
			`select a, "b c", $3 from data where a > 1 and b like '%x%' order by a desc, b;`
		)
		expect(query.select!.map(item => item.kind)).toEqual(['column', 'column', 'column'])
		expect(query.where.map(condition => condition.kind)).toEqual(['compare', 'like'])
		expect(query.orderBy.map(item => item.desc)).toEqual([true, false])
		expect(query.groupBy).toBeNull()
	})

	test('SELECT can be left out', () => {
		expect(parsed(`WHERE a IS NOT NULL`).select).toBeNull()
	})

	test('reads every kind of condition', () => {
		const { where } = parsed(
			`WHERE a = 1 AND a != -2.5 AND a IN ('x', 'y') AND a NOT IN () AND a BETWEEN 1 AND 2
			AND a NOT LIKE '%x%' AND a ~ '^x' AND a REGEXP 'y' AND a IS NULL AND a IS NOT EMPTY
			AND a IS MALFORMED AND b = TRUE AND search('hi')`
		)
		expect(where.map(condition => condition.kind)).toEqual([
			'compare',
			'compare',
			'in',
			'in',
			'between',
			'like',
			'regex',
			'regex',
			'is',
			'is',
			'is',
			'compare',
			'search',
		])
		expect(where[1]).toMatchObject({ op: '<>', value: { value: '-2.5' } })
		expect(where[11]).toMatchObject({ value: { value: 'true' } })
	})

	test('reads groupings and aggregates', () => {
		const query = parsed(
			`SELECT city, count(*), sum(amount) GROUP BY city ORDER BY count(*) DESC`
		)
		expect(query.groupBy).toHaveLength(1)
		expect(query.select![2]).toMatchObject({ kind: 'aggregate', aggregate: { fn: 'sum' } })
		expect(query.orderBy[0]).toMatchObject({ target: { kind: 'aggregate' }, desc: true })
	})

	test('a column may be called by a word that only means something in one place', () => {
		const query = parsed(`SELECT count, empty WHERE malformed IS EMPTY`)
		expect(query.select).toHaveLength(2)
	})
})

describe('errors', () => {
	test.each([
		['', 'Write a query'],
		[`WHERE a = 1 OR b = 2`, 'OR is not supported yet'],
		[`WHERE NOT a = 1`, 'NOT before a condition'],
		[`WHERE (a = 1)`, 'Parentheses'],
		[`WHERE a = "x"`, 'Write text in single quotes'],
		[`WHERE a = b`, 'not a column'],
		[`WHERE a = NULL`, 'IS NULL'],
		[`WHERE a = 'x`, 'no closing quote'],
		[`SELECT a AS b`, 'cannot be renamed'],
		[`SELECT a + 1`, 'Calculations'],
		[`SELECT count(a)`, 'Only count(*)'],
		[`SELECT median(a)`, 'not a function'],
		[`SELECT order`, 'is a keyword'],
		[`SELECT 'a'`, 'Single quotes are for text'],
		[`SELECT * LIMIT 10`, 'LIMIT is not supported'],
		[`SELECT * FROM a JOIN b`, 'cannot join'],
		[`SELECT *; SELECT *`, 'one query'],
		[`WHERE a = 1 SELECT *`, 'one query'],
		[`ORDER BY a WHERE b = 1`, 'out of place'],
		[`WHERE a`, 'Expected a comparison after a'],
		[`WHERE a ¤ 1`, 'has no meaning'],
	])('%s', (source, message) => {
		expect(failure(source).message).toContain(message)
	})

	test('points at the line and column of the problem', () => {
		const error = failure(`SELECT *\nWHERE a = 1\n  OR b = 2`)
		expect(error).toMatchObject({ line: 3, column: 3 })
		expect(`SELECT *\nWHERE a = 1\n  OR b = 2`.slice(error.from, error.to)).toBe('OR')
	})

	test('an error at the end points at the end', () => {
		const source = 'WHERE a ='
		expect(failure(source)).toMatchObject({ from: source.length, to: source.length })
	})
})
