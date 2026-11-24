import { describe, expect, test } from 'vite-plus/test'

import { findJsonSyntaxError } from './json-syntax'

const accepted = (text: string) => {
	try {
		JSON.parse(text)
		return true
	} catch {
		return false
	}
}

describe('findJsonSyntaxError: valid JSON', () => {
	test.each([
		'[]',
		'{}',
		'0',
		'-0.5e+10',
		'"x"',
		'true',
		'null',
		' \t\r\n[ 1 , 2.5e-3 , -0 , "a\\u00e9\\n\\"" , { "k" : [ null , false ] } ] \n',
		'"\\ud800"',
		'{"":1,"a b":{"c":[[],[{}]]}}',
	])('%j', text => {
		expect(findJsonSyntaxError(text)).toBeNull()
	})

	test('very deep nesting does not overflow the stack', () => {
		const text = '['.repeat(5000) + ']'.repeat(5000)

		expect(accepted(text)).toBe(true)
		expect(findJsonSyntaxError(text)).toBeNull()
	})
})

describe('findJsonSyntaxError: where and why', () => {
	test.each([
		['', 0, 'Unexpected end of JSON input'],
		['[1,2', 4, 'Unexpected end of JSON input'],
		['{"a":1}}', 7, 'Unexpected non-whitespace character after JSON'],
		['{a:1}', 1, 'Expected a double-quoted property name'],
		["{'a':1}", 1, 'Expected a double-quoted property name'],
		['{"a":1,}', 7, 'Expected a double-quoted property name'],
		['[1,]', 3, "Unexpected token ']'"],
		['[1 2]', 3, "Expected ',' or ']' after array element"],
		['{"a" 1}', 5, "Expected ':' after property name"],
		['{"a":1 "b":2}', 7, "Expected ',' or '}' after property value"],
		['"abc', 4, 'Unterminated string'],
		['"a\nb"', 2, 'Bad control character in string literal'],
		['"\\x"', 2, 'Bad escaped character'],
		['"\\u12g4"', 5, 'Bad Unicode escape'],
		['01', 1, 'Unexpected non-whitespace character after JSON'],
		['1.', 2, 'Unterminated fractional number'],
		['-', 1, 'No number after minus sign'],
		['1e', 2, 'Exponent part is missing a number'],
		['1e+', 3, 'Exponent part is missing a number'],
		['.5', 0, "Unexpected token '.'"],
		['+1', 0, "Unexpected token '+'"],
		['NaN', 0, "Unexpected token 'N'"],
		['tru', 3, 'Unexpected end of JSON input'],
		['trux', 3, "Unexpected token 'x'"],
		['[nul]', 4, "Unexpected token ']'"],
		[' []', 0, "Unexpected token ' '"],
	])('%j fails at offset %i: %s', (text, offset, message) => {
		expect(accepted(text)).toBe(false)
		expect(findJsonSyntaxError(text)).toMatchObject({ offset, message })
	})

	test('a BOM is not valid JSON, so it is reported', () => {
		const text = String.fromCharCode(0xfeff) + '[]'

		expect(accepted(text)).toBe(false)
		expect(findJsonSyntaxError(text)?.offset).toBe(0)
	})

	test('gives a 1-based line and column', () => {
		expect(findJsonSyntaxError('[{"a":1},\n{"a":}]')).toMatchObject({
			offset: 15,
			line: 2,
			column: 6,
			message: "Unexpected token '}'",
		})
		expect(findJsonSyntaxError('{"a":1}}')).toMatchObject({ line: 1, column: 8 })
	})

	test('counts lines on LF only, so CRLF does not double them', () => {
		expect(findJsonSyntaxError('[1,\r\n2,\r\n]')).toMatchObject({ line: 3, column: 1 })
	})
})

describe('findJsonSyntaxError agrees with JSON.parse', () => {
	const corpus = [
		'[{"id":1,"name":"Ada","tags":["a","b"],"meta":{"x":1.5e3,"ok":true,"n":null}},{"id":2}]',
		'{"a":[1,2,{"b":"c\\n\\u00e9"}],"d":-0.25}',
		'[[],{},"",0,-1,true,false,null]',
	]
	const alphabet = '{}[]",:\\ \n\t0123456789.eE+-tfnulrsa  \'/*'

	// A fixed seed, so a failure is the same failure next time.
	const random = (() => {
		let state = 0x2545f491
		return () => {
			state = (Math.imul(state, 1664525) + 1013904223) >>> 0
			return state / 2 ** 32
		}
	})()
	const pick = (limit: number) => Math.floor(random() * limit)

	test('every prefix of a valid document', () => {
		for (const doc of corpus) {
			for (let end = 0; end <= doc.length; end++) {
				const text = doc.slice(0, end)
				expect(findJsonSyntaxError(text) === null, JSON.stringify(text)).toBe(accepted(text))
			}
		}
	})

	test('thousands of random edits of valid documents', () => {
		for (let round = 0; round < 6000; round++) {
			const doc = corpus[pick(corpus.length)]!
			const at = pick(doc.length)
			const char = alphabet[pick(alphabet.length)]!
			const edit = pick(3)
			const text =
				edit === 0
					? doc.slice(0, at) + doc.slice(at + 1)
					: edit === 1
						? doc.slice(0, at) + char + doc.slice(at)
						: doc.slice(0, at) + char + doc.slice(at + 1)

			expect(findJsonSyntaxError(text) === null, JSON.stringify(text)).toBe(accepted(text))
		}
	})
})
