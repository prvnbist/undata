// Titles are what the user sees and picks between, so they must be unique within a table even when
// the file's own headers are blank or repeat. Shared by every importer so the naming never differs.

export const isBlankHeader = (header: string) => header.trim() === ''

export const placeholderTitle = (position: number) => `Column ${position + 1}`

// Returns a function that hands back the name as it is the first time, then "name (2)", "name (3)".
// A number already taken by a real name is skipped.
export const createTitles = () => {
	const used = new Set<string>()

	return (base: string) => {
		let title = base
		for (let n = 2; used.has(title); n++) title = `${base} (${n})`
		used.add(title)
		return title
	}
}
