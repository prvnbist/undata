import { IconFileUpload } from '@tabler/icons-react'

import { OpenFileButton } from './OpenFileButton'

export function StartScreen() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-4 py-16">
			<header className="space-y-2">
				<h1 className="text-4xl">Undata</h1>
				<p className="text-foreground/70">
					Open a data file and understand it. Nothing leaves your browser, and nothing in the
					file is changed.
				</p>
			</header>
			<section
				aria-label="Open a file"
				className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-md border border-dashed p-8 text-center"
			>
				<IconFileUpload className="size-12 text-foreground/70" stroke={1.5} />
				<p className="text-xl">CSV, TSV, JSON or NDJSON</p>
				<OpenFileButton>Choose a file</OpenFileButton>
			</section>
		</main>
	)
}
