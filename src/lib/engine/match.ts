export type TextMatcher = (text: string) => boolean

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`)

// Case-insensitive substring. A regular expression does it without allocating a lower-cased copy of
// every cell, which is what makes searching a million rows quick.
export const caseInsensitive = (needle: string, flags = '') =>
	new RegExp(escapeRegExp(needle), `i${flags}`)

export const textMatcher = (needle: string): TextMatcher => {
	if (needle === '') return () => true
	// With no letters in it there is no case to ignore.
	if (needle.toLowerCase() === needle.toUpperCase()) return text => text.includes(needle)

	const pattern = caseInsensitive(needle)
	return text => pattern.test(text)
}

// `pattern` or `/pattern/flags`. Null when it is not a regular expression.
export const parseRegex = (input: string): RegExp | null => {
	const [, body, flags] = /^\/(.+)\/([a-z]*)$/s.exec(input) ?? []

	try {
		// With `g` or `y`, `test` would remember where the last cell matched.
		return body === undefined
			? new RegExp(input)
			: new RegExp(body, (flags ?? '').replace(/[gy]/g, ''))
	} catch {
		return null
	}
}
