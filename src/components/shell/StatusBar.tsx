import { IconCloudOff } from '@tabler/icons-react'

import { useWorkspace } from '@/store/workspace'
import { ImportNotice } from './ImportNotice'

const inEnglish = new Intl.NumberFormat('en')

export function StatusBar() {
	const total = useWorkspace(state => state.dataset?.rowCount ?? 0)
	const found = useWorkspace(state => state.query?.rowCount ?? 0)
	const narrowed = useWorkspace(state => state.view.search !== '' || state.view.filters.length > 0)
	const groups = useWorkspace(state =>
		(state.view.grouping?.by.length ?? 0) > 0 ? (state.groups?.groupCount ?? null) : null
	)
	const unsaved = useWorkspace(state => state.saved === 'unsaved')

	return (
		<footer className="flex h-8 shrink-0 items-center gap-2 border-t px-4 text-xs">
			{/* Read out politely as the search and filters change it. */}
			<p role="status">
				{groups !== null &&
					`${inEnglish.format(groups)} ${groups === 1 ? 'group' : 'groups'} from ${narrowed ? `${inEnglish.format(found)} of ` : ''}`}
				{groups === null && narrowed && `${inEnglish.format(found)} of `}
				{inEnglish.format(total)} {total === 1 ? 'row' : 'rows'}
			</p>
			{unsaved && (
				<p
					title="Storage is full or blocked, so this dataset is gone once you leave"
					className="flex items-center gap-1 text-foreground/70"
				>
					<IconCloudOff className="size-3.5" aria-hidden /> Not saved
				</p>
			)}
			<ImportNotice />
		</footer>
	)
}
