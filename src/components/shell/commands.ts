export type Command = {
	id: string
	label: string
	group: 'File' | 'View' | 'Columns' | 'Sort' | 'Go to'
	// More words it can be found by.
	keywords?: string
	run: () => void
	// True when the command puts focus somewhere itself, so the palette does not put it back.
	movesFocus?: boolean
}

export type CommandActions = {
	open: () => void
	sample: () => void
	exportView: () => void
	goToColumn: (id: string) => void
	sort: (id: string, desc: boolean) => void
	setHidden: (id: string, hidden: boolean) => void
	inspectColumn: (id: string) => void
	editQuery: () => void
}

export type CommandColumn = { id: string; title: string; hidden: boolean }

// What can be done from here. Without a dataset, only ways to open one.
export const buildCommands = (
	actions: CommandActions,
	columns: CommandColumn[] | null
): Command[] => {
	const file: Command[] = [
		{
			id: 'open',
			label: 'Open a file…',
			group: 'File',
			keywords: 'load import',
			run: actions.open,
		},
	]
	if (!columns) {
		return [
			...file,
			{ id: 'sample', label: 'Try sample data', group: 'File', run: actions.sample },
		]
	}

	return [
		...file,
		{
			id: 'export',
			label: 'Export…',
			group: 'File',
			keywords: 'download save csv json',
			run: actions.exportView,
		},
		{
			id: 'query',
			label: 'Edit view as SQL',
			group: 'View',
			keywords: 'query select where filter sort group',
			run: actions.editQuery,
			movesFocus: true,
		},
		...columns.flatMap(({ id, title, hidden }): Command[] => [
			{
				id: `go:${id}`,
				label: `Go to ${title}`,
				group: 'Go to',
				keywords: 'column find jump',
				run: () => actions.goToColumn(id),
				movesFocus: true,
			},
			{
				id: `details:${id}`,
				label: `Details of ${title}`,
				group: 'Columns',
				keywords: 'column stats statistics profile distribution values',
				run: () => actions.inspectColumn(id),
				movesFocus: true,
			},
			{
				id: `asc:${id}`,
				label: `Sort by ${title}, ascending`,
				group: 'Sort',
				run: () => actions.sort(id, false),
			},
			{
				id: `desc:${id}`,
				label: `Sort by ${title}, descending`,
				group: 'Sort',
				run: () => actions.sort(id, true),
			},
			hidden
				? {
						id: `show:${id}`,
						label: `Show ${title}`,
						group: 'Columns',
						keywords: 'column unhide',
						run: () => actions.setHidden(id, false),
					}
				: {
						id: `hide:${id}`,
						label: `Hide ${title}`,
						group: 'Columns',
						keywords: 'column',
						run: () => actions.setHidden(id, true),
					},
		]),
	]
}

// Every word typed must be found in the label or keywords. Labels that start with what was typed
// come first, otherwise the order is kept.
export const matchCommands = (commands: Command[], query: string, limit = 50) => {
	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
	if (words.length === 0) return commands.slice(0, limit)

	const scored: { command: Command; score: number; at: number }[] = []
	commands.forEach((command, at) => {
		const label = command.label.toLowerCase()
		const haystack = `${label} ${command.keywords ?? ''}`.toLowerCase()
		if (!words.every(word => haystack.includes(word))) return
		const score = words.every(word => label.includes(word))
			? label.startsWith(words[0]!)
				? 0
				: 1
			: 2
		scored.push({ command, score, at })
	})
	return scored
		.sort((a, b) => a.score - b.score || a.at - b.at)
		.slice(0, limit)
		.map(entry => entry.command)
}
