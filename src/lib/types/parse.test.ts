import { describe, expect, test } from 'vite-plus/test'

import { DATA_TYPES } from '../constants'
import { parse } from './parse'

const ok = (value: unknown) => ({ ok: true, value })
const bad = { ok: false }

describe('parse', () => {
	test('text accepts anything', () => {
		expect(parse('text', ' a b ')).toEqual(ok(' a b '))
		expect(parse('text', '')).toEqual(ok(''))
	})

	test('never throws, for any type and awkward input', () => {
		const inputs = [
			'',
			' ',
			'nope',
			'{',
			'[1',
			'\u0000',
			'NaN',
			'1e999',
			'9'.repeat(400),
			'%',
			'://',
			'a'.repeat(5000),
		]
		for (const { value: type } of DATA_TYPES) {
			for (const input of inputs) expect(() => parse(type, input)).not.toThrow()
		}
	})

	describe('number', () => {
		test.each([
			['42', 42],
			[' -3.5 ', -3.5],
			['1e3', 1000],
			['.5', 0.5],
			['+7', 7],
			['0', 0],
		])('%s', (text, value) => expect(parse('number', text)).toEqual(ok(value)))

		test.each(['', ' ', 'abc', '0x10', 'NaN', 'Infinity', '1,000', '1e999', '1 2', '--1'])(
			'rejects %j',
			text => expect(parse('number', text)).toEqual(bad)
		)
	})

	describe('boolean', () => {
		test.each([
			['true', true],
			['FALSE', false],
			['yes', true],
			['No', false],
			['t', true],
			['f', false],
			['1', true],
			['0', false],
			[' true ', true],
		])('%s', (text, value) => expect(parse('boolean', text)).toEqual(ok(value)))

		test.each(['', 'maybe', '2', 'truee'])('rejects %j', text =>
			expect(parse('boolean', text)).toEqual(bad)
		)
	})

	describe('time', () => {
		test.each([
			['14:00', 14 * 3600],
			['14:00:30', 14 * 3600 + 30],
			['00:00:00', 0],
			['23:59:59.5', 86399.5],
		])('%s', (text, value) => expect(parse('time', text)).toEqual(ok(value)))

		test.each(['', '24:00', '12:60', '12', '1:2:3:4', 'ab:cd', '12:00Z'])('rejects %j', text =>
			expect(parse('time', text)).toEqual(bad)
		)

		test('timetz needs an offset and returns seconds in UTC', () => {
			expect(parse('timetz', '14:00Z')).toEqual(ok(14 * 3600))
			expect(parse('timetz', '14:00:00+02:00')).toEqual(ok(12 * 3600))
			expect(parse('timetz', '01:00-05:30')).toEqual(ok(6.5 * 3600))
			expect(parse('timetz', '14:00')).toEqual(bad)
			expect(parse('timetz', '14:00+25:00')).toEqual(bad)
		})
	})

	describe('date', () => {
		test('returns milliseconds at UTC midnight', () => {
			expect(parse('date', '2020-01-05')).toEqual(ok(Date.UTC(2020, 0, 5)))
			expect(parse('date', ' 2020-02-29 ')).toEqual(ok(Date.UTC(2020, 1, 29)))
		})

		test.each([
			'2021-02-29',
			'2020-13-01',
			'2020-00-10',
			'2020-01-32',
			'2020-1-5',
			'01/05/2020',
			'2020-01-05T10:00:00',
			'',
			'yesterday',
		])('rejects %j', text => expect(parse('date', text)).toEqual(bad))
	})

	describe('timestamp', () => {
		test('reads a time on the date, with T or a space, as UTC', () => {
			const expected = Date.UTC(2020, 0, 5, 15, 4, 9)
			expect(parse('timestamp', '2020-01-05T15:04:09')).toEqual(ok(expected))
			expect(parse('timestamp', '2020-01-05 15:04:09')).toEqual(ok(expected))
			expect(parse('timestamp', '2020-01-05 15:04')).toEqual(ok(Date.UTC(2020, 0, 5, 15, 4)))
			expect(parse('timestamp', '2020-01-05T15:04:09.250')).toEqual(ok(expected + 250))
		})

		test.each([
			'2020-01-05',
			'2020-01-05T25:00:00',
			'2020-02-30 10:00',
			'2020-01-05T15:04:09Z',
			'',
		])('rejects %j', text => expect(parse('timestamp', text)).toEqual(bad))

		test('timestamptz needs an offset and returns the instant', () => {
			expect(parse('timestamptz', '2020-01-05T15:04:09Z')).toEqual(
				ok(Date.UTC(2020, 0, 5, 15, 4, 9))
			)
			expect(parse('timestamptz', '2020-01-05 15:04:09+02:00')).toEqual(
				ok(Date.UTC(2020, 0, 5, 13, 4, 9))
			)
			expect(parse('timestamptz', '2020-01-05T15:04:09')).toEqual(bad)
			expect(parse('timestamptz', '2020-01-05T15:04:09+99:00')).toEqual(bad)
		})
	})

	describe('json', () => {
		test('accepts objects and arrays only', () => {
			expect(parse('json', '{"a":[1,2]}')).toEqual(ok({ a: [1, 2] }))
			expect(parse('json', ' [1] ')).toEqual(ok([1]))
			for (const text of ['', '1', '"x"', 'null', 'true', '{a:1}', '[1,', '{']) {
				expect(parse('json', text)).toEqual(bad)
			}
		})
	})

	describe('url and image', () => {
		test('accepts http and https, and bare domains as https', () => {
			expect(parse('url', 'https://example.com/a?b=1')).toEqual(ok('https://example.com/a?b=1'))
			expect(parse('url', 'http://example.com')).toEqual(ok('http://example.com/'))
			expect(parse('url', 'example.com/x')).toEqual(ok('https://example.com/x'))
			expect(parse('image', 'https://example.com/a.png')).toEqual(
				ok('https://example.com/a.png')
			)
		})

		test.each([
			'javascript:alert(1)',
			' JavaScript:alert(1)',
			'data:text/html,<b>x</b>',
			'ftp://example.com',
			'file:///etc/passwd',
			'vbscript:x',
			'https://',
			'not a url',
			'',
			'localhost',
		])('rejects %j', text => {
			expect(parse('url', text)).toEqual(bad)
			expect(parse('image', text)).toEqual(bad)
		})
	})

	describe('tag', () => {
		test('reads a list, or takes the whole text as one tag', () => {
			expect(parse('tag', '["a","b"]')).toEqual(ok(['a', 'b']))
			expect(parse('tag', "['a', 'b']")).toEqual(ok(['a', 'b']))
			expect(parse('tag', '[1, null, {"x":1}]')).toEqual(ok(['1', 'null', '{"x":1}']))
			expect(parse('tag', 'solo')).toEqual(ok(['solo']))
		})

		test('empty is not a tag', () => {
			expect(parse('tag', '')).toEqual(bad)
			expect(parse('tag', '  ')).toEqual(bad)
			expect(parse('tag', '[]')).toEqual(ok([]))
		})
	})

	describe('regressions', () => {
		test.each(['constructor', '__proto__', 'toString'])('%s is not a boolean', text =>
			expect(parse('boolean', text)).toEqual(bad)
		)

		test('an integer a double cannot hold is malformed, not rounded', () => {
			expect(parse('number', '12345678901234567890')).toEqual(bad)
			expect(parse('number', '9007199254740993')).toEqual(bad)
			expect(parse('number', '9007199254740991')).toEqual(ok(9007199254740991))
			expect(parse('number', '1e20')).toEqual(ok(1e20))
		})

		test('the first century is not the twentieth', () => {
			const year1 = new Date(0)
			year1.setUTCFullYear(1, 0, 1)
			expect(parse('date', '0001-01-01')).toEqual(ok(year1.getTime()))
			expect(parse('date', '0004-02-29').ok).toBe(true)
			expect(parse('timestamp', '0001-01-01 00:00')).toEqual(ok(year1.getTime()))
		})

		test('a link with a scheme may have a one-word host', () => {
			expect(parse('url', 'http://localhost:3000/a')).toEqual(ok('http://localhost:3000/a'))
		})

		test('a quoted list is still a list when an apostrophe is inside double quotes', () => {
			expect(parse('tag', '["it\'s"]')).toEqual(ok(["it's"]))
		})
	})
})
