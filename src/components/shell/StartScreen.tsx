import { IconFileUpload } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { SAMPLE_NAME, makeSample } from '@/lib/import/sample'
import { Logo } from './Logo'
import { OpenFileButton } from './OpenFileButton'
import { modKey } from './platform'
import { Recents } from './Recents'
import { useOpenDataset } from './useOpenDataset'

export function StartScreen() {
	const open = useOpenDataset()

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-4 pt-[12dvh] pb-16">
			<header className="space-y-3">
				<div className="flex items-center gap-2.5">
					<Logo className="size-5" />
					<h1 className="text-xl font-semibold">Undata</h1>
				</div>
				<p className="max-w-md text-muted-foreground">
					Open a data file and understand it. Nothing leaves your browser, and nothing in the
					file is changed.
				</p>
			</header>
			<section
				aria-label="Open a file"
				className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]"
			>
				<div className="flex items-start gap-4">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary">
						<IconFileUpload className="size-4.5 text-muted-foreground" stroke={1.75} />
					</div>
					<div className="space-y-1">
						<p className="text-base font-medium">
							Drop a CSV, TSV, JSON, NDJSON or Excel file anywhere
						</p>
						<p className="text-muted-foreground">
							or paste data, or cells copied from a spreadsheet, with <Kbd>{modKey()}</Kbd>{' '}
							<Kbd>V</Kbd>
						</p>
					</div>
				</div>
				<div className="flex flex-wrap gap-2 pl-13 max-sm:pl-0">
					<OpenFileButton>Choose a file</OpenFileButton>
					<Button
						variant="outline"
						onClick={() => open({ blob: new Blob([makeSample()]), name: SAMPLE_NAME })}
					>
						Try sample data
					</Button>
				</div>
			</section>
			<Recents />
		</main>
	)
}
