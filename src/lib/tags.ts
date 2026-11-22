export const generateTags = (input: unknown): unknown[] => {
	if (Array.isArray(input)) return input
	if (typeof input !== 'string') return [input]

	try {
		const output: unknown = JSON.parse(input.replace(/'/g, '"'))
		if (Array.isArray(output)) return output
	} catch {
		// Not a list, so the whole input is a single tag.
	}

	return [input]
}
