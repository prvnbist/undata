import { useRef } from 'react'
import { IconFileUpload } from '@tabler/icons-react'

import { useOpenDataset } from './useOpenDataset'
import { Button } from '@/components/ui/button'

export function StartScreen() {
	const input = useRef<HTMLInputElement>(null)
	const open = useOpenDataset()

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-4 py-16">
			<header className="space-y-2">
				<h1 className="text-4xl">Undata</h1>
				<p className="text-muted-foreground">
					Open a data file and understand it. Nothing leaves your browser, and nothing in the
					file is changed.
				</p>
			</header>
			<section
				aria-label="Open a file"
				className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-md border border-dashed p-8 text-center"
			>
				<IconFileUpload className="size-12 text-muted-foreground" stroke={1.5} />
				<p className="text-xl">CSV, TSV, JSON or NDJSON</p>
				<Button onClick={() => input.current?.click()}>Choose a file</Button>
				<input
					ref={input}
					type="file"
					aria-label="Data file"
					className="sr-only"
					tabIndex={-1}
					onChange={event => {
						const file = event.target.files?.[0]
						// Cleared so that choosing the same file again is a change.
						event.target.value = ''
						if (file) open({ blob: file, name: file.name })
					}}
				/>
			</section>
		</main>
	)
}
