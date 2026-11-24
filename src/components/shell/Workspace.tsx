import { ExportDialog } from '@/components/export/ExportDialog'
import { ColumnsPopover } from '@/components/grid/ColumnsPopover'
import { DataGrid } from '@/components/grid/DataGrid'
import { GroupBar, GroupButton } from '@/components/grouping/GroupBar'
import { SummaryGrid } from '@/components/grouping/SummaryGrid'
import { Inspector } from '@/components/inspector/Inspector'
import { ViewSwitcher } from '@/components/views/ViewSwitcher'
import { AddFilter, FilterBar } from '@/components/filtering/FilterBar'
import { NoMatches } from '@/components/filtering/NoMatches'
import { SearchBox } from '@/components/filtering/SearchBox'
import { useWorkspace } from '@/store/workspace'
import { ImportStatus } from './ImportStatus'
import { StatusBar } from './StatusBar'

export function Workspace() {
	const name = useWorkspace(state => state.dataset?.name)
	const ready = useWorkspace(state => state.phase.kind === 'ready')
	const grouped = useWorkspace(state => (state.view.grouping?.by.length ?? 0) > 0)

	if (!ready) return <ImportStatus />

	return (
		<main className="flex h-dvh flex-col">
			<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
				<h1 className="min-w-20 flex-1 truncate text-lg">{name}</h1>
				<ViewSwitcher />
				<SearchBox />
				<AddFilter />
				<GroupButton />
				<ColumnsPopover />
				<ExportDialog />
			</header>
			<FilterBar />
			<GroupBar />
			<div className="flex min-h-0 flex-1">
				<div className="relative flex min-w-0 flex-1 flex-col">
					{grouped ? (
						<SummaryGrid />
					) : (
						<>
							<DataGrid />
							<NoMatches />
						</>
					)}
				</div>
				<Inspector />
			</div>
			<StatusBar />
		</main>
	)
}
