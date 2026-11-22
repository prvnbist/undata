import { IconFileUpload } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { SAMPLE_NAME, makeSample } from '@/lib/import/sample'
import { OpenFileButton } from './OpenFileButton'
import { useOpenDataset } from './useOpenDataset'

export function StartScreen() {
	const open = useOpenDataset()

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
				<p className="text-xl">Drop a CSV, TSV, JSON or NDJSON file anywhere</p>
				<p className="text-foreground/70">
					or paste data, or cells copied from a spreadsheet, with Ctrl+V or ⌘V
				</p>
				<div className="flex flex-wrap justify-center gap-2">
					<OpenFileButton>Choose a file</OpenFileButton>
					<Button
						variant="outline"
						onClick={() => open({ blob: new Blob([makeSample()]), name: SAMPLE_NAME })}
					>
						Try sample data
					</Button>
				</div>
			</section>
		</main>
	)
}
