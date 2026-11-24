import { useEffect } from 'react'

import { workspace } from '@/store/workspace'
import { useOpenDataset } from './useOpenDataset'

const FIELDS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

export const isField = (target: EventTarget | null) =>
	target instanceof Element && target.closest(FIELDS) !== null

// A few words on one line are more likely a slip than a table.
const looksLikeData = (text: string) =>
	/\S[^\S\n]*\r?[\n\r]+\s*\S/.test(text) || /^\s*[[{]/.test(text)

// Opens data pasted anywhere that is not a place to type.
export const usePasteImport = () => {
	const open = useOpenDataset()

	useEffect(() => {
		const onPaste = (event: ClipboardEvent) => {
			if (event.defaultPrevented || isField(event.target)) return

			// Spreadsheets put a picture of the cells beside their text, so the text goes first.
			const text = event.clipboardData?.getData('text/plain') ?? ''
			const file = event.clipboardData?.files[0]
			if (!text.trim() && file) {
				event.preventDefault()
				open({ blob: file, name: file.name })
			} else if (looksLikeData(text)) {
				event.preventDefault()
				open({ blob: new Blob([text]), name: 'Pasted data' })
			} else if (text.trim()) {
				workspace.set({
					notice:
						'What you pasted is not a table. Paste CSV, JSON, or cells from a spreadsheet.',
				})
			}
		}

		window.addEventListener('paste', onPaste)
		return () => window.removeEventListener('paste', onPaste)
	}, [open])
}
