// The items of a list written as JSON or with single quotes, or null when it is not a list.
export const parseList = (input: string): unknown[] | null => {
	if (!/^\s*\[[\s\S]*\]\s*$/.test(input)) return null

	for (const text of [input, input.replace(/'/g, '"')]) {
		try {
			const output: unknown = JSON.parse(text)
			if (Array.isArray(output)) return output
		} catch {
			// Not this spelling.
		}
	}

	return null
}

export const generateTags = (input: unknown): unknown[] => {
	if (Array.isArray(input)) return input
	if (typeof input !== 'string') return [input]
	return parseList(input) ?? [input]
}
