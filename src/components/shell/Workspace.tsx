import { DataGrid } from '@/components/grid/DataGrid'
import { useWorkspace } from '@/store/workspace'
import { ImportStatus } from './ImportStatus'
import { StatusBar } from './StatusBar'

export function Workspace() {
	const name = useWorkspace(state => state.dataset?.name)
	const ready = useWorkspace(state => state.phase.kind === 'ready')

	if (!ready) return <ImportStatus />

	return (
		<main className="flex h-dvh flex-col">
			<header className="flex h-12 shrink-0 items-center border-b px-4">
				<h1 className="truncate text-lg">{name}</h1>
			</header>
			<DataGrid />
			<StatusBar />
		</main>
	)
}
