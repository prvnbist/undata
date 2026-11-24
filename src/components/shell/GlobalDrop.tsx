import { useEffect, useState } from 'react'

import { workspace } from '@/store/workspace'
import { useOpenDataset } from './useOpenDataset'

const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false

// Opens a file dropped anywhere, on any screen.
export function GlobalDrop() {
	const open = useOpenDataset()
	const [over, setOver] = useState(false)

	useEffect(() => {
		const onDragOver = (event: DragEvent) => {
			if (!hasFiles(event) || event.defaultPrevented) return
			event.preventDefault()
			setOver(true)
		}

		const onDragLeave = (event: DragEvent) => {
			// Leaving the window goes to nothing. Moving between elements goes to another one.
			if (event.relatedTarget === null) setOver(false)
		}

		const onDrop = (event: DragEvent) => {
			setOver(false)
			const files = event.dataTransfer?.files
			const file = files?.[0]
			if (!file || event.defaultPrevented) return
			event.preventDefault()
			open({ blob: file, name: file.name })
			if (files.length > 1) {
				workspace.set({
					notice: `You dropped ${files.length} files, and only ${file.name} was opened.`,
				})
			}
		}

		window.addEventListener('dragover', onDragOver)
		window.addEventListener('dragleave', onDragLeave)
		window.addEventListener('drop', onDrop)
		return () => {
			window.removeEventListener('dragover', onDragOver)
			window.removeEventListener('dragleave', onDragLeave)
			window.removeEventListener('drop', onDrop)
		}
	}, [open])

	if (!over) return null

	return (
		<div className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center border-4 border-dashed border-primary bg-background/90">
			<p className="text-3xl">Drop to open</p>
		</div>
	)
}
