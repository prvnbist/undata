import { Button } from '@/components/ui/button'
import { HEADER_HEIGHT } from '@/components/grid/layout'
import { applyView } from '@/store/session'
import { useWorkspace, workspace } from '@/store/workspace'

// When the search and filters leave nothing, a way back to every row.
export function NoMatches() {
	const empty = useWorkspace(
		state =>
			!state.querying &&
			state.query?.rowCount === 0 &&
			(state.dataset?.rowCount ?? 0) > 0 &&
			(state.view.search !== '' || state.view.filters.length > 0)
	)
	const searching = useWorkspace(state => state.view.search !== '')
	const filtering = useWorkspace(state => state.view.filters.length > 0)
	if (!empty) return null

	const label =
		searching && filtering
			? 'Clear search and filters'
			: searching
				? 'Clear search'
				: 'Clear filters'

	return (
		<div
			className="absolute inset-x-0 flex flex-col items-center gap-3 p-8 text-sm"
			style={{ top: HEADER_HEIGHT }}
		>
			<p>No rows match</p>
			<Button
				variant="outline"
				size="sm"
				onClick={() => void applyView({ ...workspace.get().view, search: '', filters: [] })}
			>
				{label}
			</Button>
		</div>
	)
}
