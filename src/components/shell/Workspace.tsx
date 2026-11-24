import { Link } from '@tanstack/react-router'
import { IconChevronRight } from '@tabler/icons-react'

import { ExportDialog } from '@/components/export/ExportDialog'
import { ColumnsPopover } from '@/components/grid/ColumnsPopover'
import { DataGrid } from '@/components/grid/DataGrid'
import { GroupBar, GroupButton } from '@/components/grouping/GroupBar'
import { SummaryGrid } from '@/components/grouping/SummaryGrid'
import { Inspector } from '@/components/inspector/Inspector'
import { ViewSwitcher } from '@/components/views/ViewSwitcher'
import { AddFilter, FilterBar } from '@/components/filtering/FilterBar'
import { NoMatches } from '@/components/filtering/NoMatches'
import { QuerySlot, QueryToggle } from '@/components/query/QueryToggle'
import { SearchBox } from '@/components/filtering/SearchBox'
import { useWorkspace } from '@/store/workspace'
import { ImportStatus } from './ImportStatus'
import { Logo } from './Logo'
import { StatusBar } from './StatusBar'

export function Workspace() {
	const name = useWorkspace(state => state.dataset?.name)
	const ready = useWorkspace(state => state.phase.kind === 'ready')
	const grouped = useWorkspace(state => (state.view.grouping?.by.length ?? 0) > 0)

	if (!ready) return <ImportStatus />

	return (
		<main className="flex h-dvh flex-col">
			<header className="flex h-11 shrink-0 items-center gap-1 border-b pr-2 pl-3">
				<div className="flex min-w-20 flex-1 items-center gap-1">
					<Link
						to="/"
						className="flex h-7 shrink-0 items-center gap-2 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
					>
						<Logo />
						<span className="max-sm:sr-only">Undata</span>
					</Link>
					<IconChevronRight className="size-3.5 shrink-0 text-subtle-foreground" aria-hidden />
					<h1 className="min-w-0 truncate px-1 text-sm">{name}</h1>
					<ViewSwitcher />
				</div>
				<SearchBox />
				<div aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
				<QueryToggle />
				<AddFilter />
				<GroupButton />
				<ColumnsPopover />
				<ExportDialog />
			</header>
			<QuerySlot />
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
