import { ColumnsPopover } from '@/components/grid/ColumnsPopover'
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
			<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
				<h1 className="min-w-0 flex-1 truncate text-lg">{name}</h1>
				<ColumnsPopover />
			</header>
			<DataGrid />
			<StatusBar />
		</main>
	)
}
