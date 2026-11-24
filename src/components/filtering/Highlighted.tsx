import { createContext, useContext } from 'react'

import { highlightParts } from './highlight'

// What the rows were searched for. Cells mark where it is in their text.
export const SearchContext = createContext('')

export function Highlighted({ text }: { text: string }) {
	const needle = useContext(SearchContext)
	if (needle === '') return text
	return highlightParts(text, needle).map((part, i) =>
		part.match ? (
			<mark key={i} className="rounded-xs bg-primary/30 text-inherit">
				{part.text}
			</mark>
		) : (
			part.text
		)
	)
}
