// Finds where a JSON document first goes wrong. `JSON.parse` only sometimes says where: some
// errors include a position, most do not, and every browser words them differently. This runs only
// after `JSON.parse` has already failed, so it is written for being right and small, not fast.

export type JsonSyntaxError = {
	// UTF-16 offset of the first bad character, or the length of the text if it ended too early.
	offset: number
	// 1-based. Lines are counted on LF, so a CRLF is one break.
	line: number
	column: number
	message: string
}

const END = 'Unexpected end of JSON input'

const isDigit = (code: number) => code >= 0x30 && code <= 0x39
const isHex = (code: number) =>
	isDigit(code) || (code >= 0x41 && code <= 0x46) || (code >= 0x61 && code <= 0x66)

// JSON allows exactly these four, not everything `\s` matches.
const isSpace = (code: number) => code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d

// Whether `text` is valid JSON is decided the same way `JSON.parse` decides it. Returns `null` when
// it is valid.
export const findJsonSyntaxError = (text: string): JsonSyntaxError | null => {
	const length = text.length
	let i = 0

	const fail = (offset: number, message: string): JsonSyntaxError => {
		let line = 1
		let lastBreak = -1
		for (let k = 0; k < offset; k++) {
			if (text.charCodeAt(k) === 0x0a) {
				line++
				lastBreak = k
			}
		}
		return { offset, line, column: offset - lastBreak, message }
	}

	const unexpected = (at: number) =>
		fail(at, `Unexpected token '${String.fromCodePoint(text.codePointAt(at)!)}'`)

	const skip = () => {
		while (i < length && isSpace(text.charCodeAt(i))) i++
	}

	const scanString = (): JsonSyntaxError | null => {
		i++
		while (true) {
			if (i >= length) return fail(length, 'Unterminated string')

			const code = text.charCodeAt(i)
			if (code === 0x22) {
				i++
				return null
			}
			if (code < 0x20) return fail(i, 'Bad control character in string literal')

			if (code === 0x5c) {
				i++
				if (i >= length) return fail(length, 'Unterminated string')

				const escape = text[i]!
				if (escape === 'u') {
					for (let k = 0; k < 4; k++) {
						i++
						if (i >= length) return fail(length, 'Unterminated string')
						if (!isHex(text.charCodeAt(i))) return fail(i, 'Bad Unicode escape')
					}
				} else if (!'"\\/bfnrt'.includes(escape)) {
					return fail(i, 'Bad escaped character')
				}
			}
			i++
		}
	}

	const scanNumber = (): JsonSyntaxError | null => {
		if (text[i] === '-') {
			i++
			if (i >= length || !isDigit(text.charCodeAt(i)))
				return fail(i, 'No number after minus sign')
		}

		// A leading zero ends the integer part, so `01` is a number followed by a stray digit.
		if (text[i] === '0') i++
		else while (i < length && isDigit(text.charCodeAt(i))) i++

		if (text[i] === '.') {
			i++
			if (i >= length || !isDigit(text.charCodeAt(i)))
				return fail(i, 'Unterminated fractional number')
			while (i < length && isDigit(text.charCodeAt(i))) i++
		}

		if (text[i] === 'e' || text[i] === 'E') {
			i++
			if (text[i] === '+' || text[i] === '-') i++
			if (i >= length || !isDigit(text.charCodeAt(i))) {
				return fail(i, 'Exponent part is missing a number')
			}
			while (i < length && isDigit(text.charCodeAt(i))) i++
		}

		return null
	}

	const scanWord = (word: string): JsonSyntaxError | null => {
		for (let k = 0; k < word.length; k++) {
			if (i + k >= length) return fail(length, END)
			if (text[i + k] !== word[k]) return unexpected(i + k)
		}
		i += word.length
		return null
	}

	// Containers are tracked in a list, not by recursion, so depth is not limited by the stack.
	const open: string[] = []
	let expect: 'value' | 'key' | 'after' = 'value'

	while (true) {
		skip()

		if (expect === 'after') {
			if (open.length === 0) {
				return i < length ? fail(i, 'Unexpected non-whitespace character after JSON') : null
			}
			if (i >= length) return fail(length, END)

			const char = text[i]
			if (open[open.length - 1] === '[') {
				if (char === ',') {
					i++
					expect = 'value'
				} else if (char === ']') {
					i++
					open.pop()
				} else {
					return fail(i, "Expected ',' or ']' after array element")
				}
			} else if (char === ',') {
				i++
				expect = 'key'
			} else if (char === '}') {
				i++
				open.pop()
			} else {
				return fail(i, "Expected ',' or '}' after property value")
			}
			continue
		}

		if (i >= length) return fail(length, END)

		if (expect === 'key') {
			if (text[i] !== '"') return fail(i, 'Expected a double-quoted property name')

			const error = scanString()
			if (error) return error

			skip()
			if (i >= length) return fail(length, END)
			if (text[i] !== ':') return fail(i, "Expected ':' after property name")

			i++
			expect = 'value'
			continue
		}

		const char = text[i]!
		let error: JsonSyntaxError | null = null

		if (char === '{' || char === '[') {
			i++
			open.push(char)
			skip()

			const closer = char === '{' ? '}' : ']'
			if (text[i] === closer) {
				i++
				open.pop()
				expect = 'after'
			} else {
				expect = char === '{' ? 'key' : 'value'
			}
			continue
		}

		if (char === '"') error = scanString()
		else if (char === '-' || isDigit(char.charCodeAt(0))) error = scanNumber()
		else if (char === 't') error = scanWord('true')
		else if (char === 'f') error = scanWord('false')
		else if (char === 'n') error = scanWord('null')
		else return unexpected(i)

		if (error) return error
		expect = 'after'
	}
}
