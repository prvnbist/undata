// A JSON value as a tree to show. Numbers keep the text they were written with, so a big id or
// `1.10` reads exactly as in the file.
export type JsonNode =
	| { kind: 'object'; entries: [string, JsonNode][] }
	| { kind: 'array'; items: JsonNode[] }
	| { kind: 'number'; text: string }
	| { kind: 'string'; value: string }
	| { kind: 'boolean'; value: boolean }
	| { kind: 'null' }

class NumberText {
	constructor(readonly text: string) {}
}

const toNode = (value: unknown): JsonNode => {
	if (value instanceof NumberText) return { kind: 'number', text: value.text }
	if (typeof value === 'number') return { kind: 'number', text: String(value) }
	if (typeof value === 'string') return { kind: 'string', value }
	if (typeof value === 'boolean') return { kind: 'boolean', value }
	if (value === null || value === undefined) return { kind: 'null' }
	if (Array.isArray(value)) return { kind: 'array', items: value.map(toNode) }
	return {
		kind: 'object',
		entries: Object.entries(value as Record<string, unknown>).map(([key, item]) => [
			key,
			toNode(item),
		]),
	}
}

// Null when the text is not JSON. Never throws.
export const parseJsonTree = (text: string): JsonNode | null => {
	try {
		return toNode(
			JSON.parse(text, (_key, value: unknown, context) =>
				typeof value === 'number' ? new NumberText(context?.source ?? String(value)) : value
			)
		)
	} catch {
		return null
	}
}

// One line of a value, for a cell or a collapsed branch.
export const summarise = (node: JsonNode): string => {
	switch (node.kind) {
		case 'object':
			return node.entries.length === 0
				? '{}'
				: `{ ${node.entries.length} ${node.entries.length === 1 ? 'key' : 'keys'} }`
		case 'array':
			return node.items.length === 0
				? '[]'
				: `[ ${node.items.length} ${node.items.length === 1 ? 'item' : 'items'} ]`
		case 'number':
			return node.text
		case 'string':
			return JSON.stringify(node.value)
		case 'boolean':
			return String(node.value)
		case 'null':
			return 'null'
	}
}
