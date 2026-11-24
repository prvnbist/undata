import { Link, useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/bytes'
import { describeFailure } from '@/lib/import/messages'
import { closeDataset, openAnyway } from '@/store/session'
import { useWorkspace } from '@/store/workspace'
import type { Phase } from '@/store/workspace'
import type { Progress } from '@/workers/protocol'
import { Notice } from './Notice'
import { OpenFileButton } from './OpenFileButton'
import { SheetPicker } from './SheetPicker'

const STEPS: Record<Progress['phase'], string> = {
	reading: 'Reading the file',
	parsing: 'Making sense of it',
	checking: 'Checking every value',
}

function Importing({ name, progress }: { name: string; progress: Progress | null }) {
	const cancel = useCancel()
	const step = STEPS[progress?.phase ?? 'reading']
	// Only reading can be measured.
	const percent = progress?.phase === 'reading' ? Math.round(progress.ratio * 100) : null

	return (
		<Notice
			title={`Opening ${name}`}
			actions={
				<Button variant="outline" onClick={cancel}>
					Cancel
				</Button>
			}
		>
			<p aria-live="polite">{step}</p>
			<div
				role="progressbar"
				aria-label={step}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent ?? undefined}
				className="h-2 overflow-hidden rounded-full bg-accent"
			>
				<div
					className={
						percent === null ? 'h-full animate-pulse bg-primary' : 'h-full bg-primary'
					}
					style={{ width: `${percent ?? 100}%` }}
				/>
			</div>
		</Notice>
	)
}

const useCancel = () => {
	const navigate = useNavigate()
	return () => {
		closeDataset()
		void navigate({ to: '/' })
	}
}

function Confirming({ name, size }: { name: string; size: number }) {
	const cancel = useCancel()

	return (
		<Notice
			title={`Open ${name}?`}
			actions={
				<>
					<Button onClick={() => void openAnyway()}>Open anyway</Button>
					<Button variant="outline" onClick={cancel}>
						Cancel
					</Button>
				</>
			}
		>
			<p>
				This file is {formatBytes(size)}. Files this large can take a while to read and need a
				few gigabytes of memory. The tab may run out.
			</p>
		</Notice>
	)
}

function Failed({ name, error }: Extract<Phase, { kind: 'failed' }>) {
	const { title, hint } = describeFailure(error.code)

	return (
		<Notice
			alert
			title={title}
			actions={
				<>
					<OpenFileButton>Choose another file</OpenFileButton>
					<Button variant="outline" asChild>
						<Link to="/">Back to start</Link>
					</Button>
				</>
			}
		>
			<p className="font-mono break-all text-foreground/70">{name}</p>
			{error.message && <p>{error.message}</p>}
			<p>{hint}</p>
		</Notice>
	)
}

// Every import that has not become a grid.
export function ImportStatus() {
	const phase = useWorkspace(state => state.phase)

	if (phase.kind === 'importing') {
		return <Importing name={phase.name} progress={phase.progress} />
	}
	if (phase.kind === 'confirming') return <Confirming name={phase.name} size={phase.size} />
	if (phase.kind === 'choosing') return <SheetPicker name={phase.name} sheets={phase.sheets} />
	if (phase.kind === 'failed') return <Failed {...phase} />
	return null
}
