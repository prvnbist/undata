// Part of current engines but not yet of TypeScript's own lib: `JSON.rawJSON`, `JSON.isRawJSON`,
// and the `context` argument a reviver gets, whose `source` is the exact text of a primitive.
//
// The `parse` overload requires the reviver, so a plain `JSON.parse(text)` still resolves to the
// built-in signature and keeps returning `any`.
interface JSON {
	rawJSON(text: string): { rawJSON: string }
	isRawJSON(value: unknown): value is { rawJSON: string }
	parse(
		text: string,
		// oxlint-disable-next-line typescript/no-explicit-any
		reviver: (this: any, key: string, value: any, context: { source?: string }) => any
	): any
}
