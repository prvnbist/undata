import { RowsPreview } from '@/components/grid/RowsPreview'
import { useWorkspace } from '@/store/workspace'

export function Workspace() {
	const phase = useWorkspace(state => state.phase)
	const dataset = useWorkspace(state => state.dataset)

	if (phase.kind === 'importing') return <p className="p-4">Reading {phase.name}…</p>
	if (phase.kind === 'failed') return <p className="p-4">{phase.error.message}</p>
	if (!dataset) return null

	return (
		<main className="flex h-dvh flex-col">
			<header className="border-b px-4 py-2">
				<h1 className="text-lg">{dataset.name}</h1>
			</header>
			<RowsPreview />
		</main>
	)
}
